import { InfrastructureError, type JsonValue } from "../types";

export type GuardrailFinding = {
  rule: "prompt_injection" | "jailbreak" | "pii" | "scope" | "toxicity" | "schema";
  severity: "low" | "medium" | "high";
  message: string;
  redacted?: boolean;
};

export type GuardrailResult = {
  allowed: boolean;
  text: string;
  findings: GuardrailFinding[];
};

export type GuardrailPolicy = {
  blockPromptInjection?: boolean;
  blockPii?: boolean;
  maxInputChars?: number;
  allowedScopes?: string[];
  blockToxicOutput?: boolean;
};

const injectionPatterns = [
  /ignore\s+(all|any|previous|prior)\s+instructions/i,
  /disregard\s+(the\s+)?system\s+prompt/i,
  /reveal\s+(your|the)\s+(system|hidden)\s+prompt/i,
  /developer\s+message\s*:/i,
];
const jailbreakPatterns = [
  /\bDAN\b/i,
  /bypass\s+(your\s+)?safety/i,
  /pretend\s+you\s+are\s+not\s+an?\s+AI/i,
  /disable\s+(all\s+)?restrictions/i,
];
const piiPatterns = [
  /\b\d{3}-\d{2}-\d{4}\b/, // US SSN shape
  /\b(?:\d[ -]*?){13,19}\b/, // payment-card-like sequences
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
];
const toxicPatterns = [/\b(?:kill|murder|genocide)\b/i];

function findingsFor(text: string, policy: GuardrailPolicy, output: boolean): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];
  if (!output && policy.blockPromptInjection !== false && injectionPatterns.some((p) => p.test(text))) {
    findings.push({ rule: "prompt_injection", severity: "high", message: "Prompt injection pattern detected." });
  }
  if (!output && jailbreakPatterns.some((p) => p.test(text))) {
    findings.push({ rule: "jailbreak", severity: "high", message: "Jailbreak request detected." });
  }
  if (policy.blockPii !== false && piiPatterns.some((p) => p.test(text))) {
    findings.push({ rule: "pii", severity: "medium", message: "Potential personally identifiable information detected." });
  }
  if (output && policy.blockToxicOutput !== false && toxicPatterns.some((p) => p.test(text))) {
    findings.push({ rule: "toxicity", severity: "medium", message: "Potentially harmful output language detected." });
  }
  return findings;
}

function redactPii(text: string): string {
  return text
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]")
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[REDACTED_ID]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[REDACTED_NUMBER]");
}

export function checkInputGuardrails(text: string, policy: GuardrailPolicy = {}): GuardrailResult {
  const findings = findingsFor(text, policy, false);
  if (policy.maxInputChars && text.length > policy.maxInputChars) {
    findings.push({ rule: "scope", severity: "medium", message: "Input exceeds configured size limit." });
  }
  const redacted = policy.blockPii === false ? text : redactPii(text);
  const blocked = findings.some((finding) => finding.severity === "high") ||
    Boolean(policy.maxInputChars && text.length > policy.maxInputChars);
  return { allowed: !blocked, text: redacted, findings };
}

export function checkOutputGuardrails(
  text: string,
  policy: GuardrailPolicy = {},
  schema?: { validate(value: JsonValue): { valid: boolean; errors: string[] } },
): GuardrailResult {
  const findings = findingsFor(text, policy, true);
  if (schema) {
    try {
      const parsed = JSON.parse(text) as JsonValue;
      const result = schema.validate(parsed);
      if (!result.valid) findings.push({ rule: "schema", severity: "high", message: result.errors.join("; ") });
    } catch {
      findings.push({ rule: "schema", severity: "high", message: "Output is not valid JSON." });
    }
  }
  return {
    allowed: !findings.some((finding) => finding.severity === "high"),
    text,
    findings,
  };
}

export function assertInputAllowed(text: string, policy?: GuardrailPolicy): string {
  const result = checkInputGuardrails(text, policy);
  if (!result.allowed) throw new InfrastructureError("Input blocked by safety guardrails.", "GUARDRAIL_BLOCKED", { findings: result.findings });
  return result.text;
}

export function assertOutputAllowed(text: string, policy?: GuardrailPolicy): void {
  const result = checkOutputGuardrails(text, policy);
  if (!result.allowed) throw new InfrastructureError("Output blocked by safety guardrails.", "GUARDRAIL_BLOCKED", { findings: result.findings });
}

export type RedTeamCase = { name: string; input: string; shouldBlock: boolean };
export type RedTeamResult = { name: string; blocked: boolean; expected: boolean; passed: boolean };

export function runRedTeamCases(cases: RedTeamCase[], policy?: GuardrailPolicy): RedTeamResult[] {
  return cases.map((testCase) => {
    const blocked = !checkInputGuardrails(testCase.input, policy).allowed;
    return { name: testCase.name, blocked, expected: testCase.shouldBlock, passed: blocked === testCase.shouldBlock };
  });
}
