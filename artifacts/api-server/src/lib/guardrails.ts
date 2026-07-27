/**
 * =====================================================================
 * Guardrails — pre-execution safety layer for sensitive tools/routes
 * =====================================================================
 *
 * This app is a security/pentest/OSINT assistant. Some capabilities
 * (arbitrary code execution, raw SQL, OSINT/threat-intel lookups against
 * real IPs/domains/emails) are legitimate for defensive/educational use on
 * systems the user owns or controls (labs, sandboxes, CTFs, their own
 * infrastructure), but the exact same capability can be misused to attack
 * a real third party without authorization.
 *
 * This module classifies a request as:
 *   - "lab"                  → private/loopback/reserved network, or an
 *                               explicit lab/sandbox declaration — always allowed
 *   - "owned" / "authorized"  → user explicitly declared ownership/authorization
 *   - "unauthorized_target"  → looks like a real attack against a third party
 *   - "unclear"              → ambiguous; defaults to allow but is logged,
 *                               unless the accompanying text signals real intent to harm
 *
 * Decisions are always written to `sensitive_tool_audit_log` (metadata only,
 * never raw secrets/credentials).
 */

import { db } from "@workspace/db";
import { sensitiveToolAuditLog } from "@workspace/db/schema";
import { callOnce } from "./ai-providers.js";

export type GuardrailDecision = {
  allowed: boolean;
  classification:
    | "lab"
    | "owned"
    | "authorized"
    | "unauthorized_target"
    | "unclear"
    | "heuristic_lab";
  reason: string;
  usedClassifierModel: boolean;
};

/** Tool names (inside the AI tool-calling loop) that require a guardrail check. */
export const SENSITIVE_TOOL_NAMES = new Set([
  "execute_code",
  "run_sql_query",
]);

// ── Network heuristics ──────────────────────────────────────────────────────

const PRIVATE_OR_LAB_IP_PATTERNS: RegExp[] = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\.0\.0\.0$/,
  /^169\.254\./, // link-local
  /^::1$/,
  /^fe80:/i,
  /^fc00:/i,
  /^fd00:/i,
];

const LAB_DOMAIN_SUFFIXES = [
  ".lab",
  ".local",
  ".test",
  ".internal",
  ".localhost",
  "localhost",
];

function looksLikePrivateOrLabTarget(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (PRIVATE_OR_LAB_IP_PATTERNS.some((re) => re.test(v))) return true;
  if (LAB_DOMAIN_SUFFIXES.some((suf) => v === suf.replace(/^\./, "") || v.endsWith(suf))) return true;
  return false;
}

/** Extract likely target identifiers (ip/domain/url/host) from arbitrary args/params. */
function extractTargets(input: Record<string, any>): string[] {
  const keys = ["ip", "domain", "host", "target", "url", "address", "email", "hostname"];
  const found: string[] = [];
  for (const k of keys) {
    const v = input?.[k];
    if (typeof v === "string" && v.trim()) found.push(v.trim());
  }
  return found;
}

function sanitizeArgsForAudit(input: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(input || {})) {
    if (/token|secret|key|password|credential|authorization/i.test(k)) {
      clean[k] = "[redacted]";
    } else if (typeof v === "string") {
      clean[k] = v.length > 200 ? v.slice(0, 200) + "…" : v;
    } else if (typeof v === "number" || typeof v === "boolean") {
      clean[k] = v;
    } else {
      clean[k] = "[omitted]";
    }
  }
  return clean;
}

// ── LLM classifier ───────────────────────────────────────────────────────────

const CLASSIFIER_SYSTEM_PROMPT = `You are a strict security-intent classifier for a penetration-testing / OSINT assistant.
Given a short description of what a user is asking the system to do (which may include a tool name, target, and any free-text context), decide ONE of:
- "lab": clearly against infrastructure the user owns, a declared lab/sandbox/CTF, or a private/internal network.
- "authorized": the user explicitly states they have written permission/authorization to test the target.
- "unauthorized_target": the request targets a specific real third-party system/person (a live public domain, IP, account, or person) with intent to gain unauthorized access, exfiltrate data, harm, or bypass their security, with no stated ownership or authorization.
- "unclear": not enough information to tell either way, and nothing suggests real harmful intent against a named third party.
Respond with EXACTLY one word: lab, authorized, unauthorized_target, or unclear. No punctuation, no explanation.`;

async function classifyWithModel(description: string): Promise<GuardrailDecision["classification"] | null> {
  try {
    const raw = await callOnce(
      [
        { role: "system", content: CLASSIFIER_SYSTEM_PROMPT },
        { role: "user", content: description.slice(0, 4000) },
      ],
      10,
    );
    const word = raw.trim().toLowerCase().replace(/[^a-z_]/g, "");
    if (word === "lab" || word === "authorized" || word === "unauthorized_target" || word === "unclear") {
      return word;
    }
    return null;
  } catch {
    return null;
  }
}

// ── Main entry point ─────────────────────────────────────────────────────────

export interface GuardrailCheckInput {
  /** Logical name of the tool or route being guarded, e.g. "execute_code" or "osint:/ip/:ip" */
  toolName: string;
  /** Raw args/params/query for the call (will be sanitized before logging) */
  args: Record<string, any>;
  /** Any free-text context available (last user chat message, request body notes, etc.) */
  userContext?: string;
  /** Explicit scope declaration from the client, if provided ("own" | "lab" | "authorized") */
  declaredScope?: string;
  actorId?: string;
  actorIp?: string;
}

export async function checkGuardrail(input: GuardrailCheckInput): Promise<GuardrailDecision> {
  const targets = extractTargets(input.args);

  // 1) Fast heuristic path — private/lab network targets are always allowed.
  if (targets.length > 0 && targets.every(looksLikePrivateOrLabTarget)) {
    const decision: GuardrailDecision = {
      allowed: true,
      classification: "heuristic_lab",
      reason: "Target(s) resolve to a private/loopback/lab network range.",
      usedClassifierModel: false,
    };
    await logDecision(input, decision, targets);
    return decision;
  }

  // 2) Explicit client declaration of ownership/authorization/lab.
  const declared = (input.declaredScope || "").toLowerCase();
  if (declared === "own" || declared === "lab" || declared === "authorized") {
    const decision: GuardrailDecision = {
      allowed: true,
      classification: declared === "lab" ? "lab" : "authorized",
      reason: "Client declared ownership/authorization for this target.",
      usedClassifierModel: false,
    };
    await logDecision(input, decision, targets);
    return decision;
  }

  // 3) No public target and no free text suggesting an attack — allow (e.g. pure read of
  //    public threat-intel feeds, CVE lookups, no specific third-party target named).
  if (targets.length === 0 && !input.userContext) {
    const decision: GuardrailDecision = {
      allowed: true,
      classification: "unclear",
      reason: "No specific third-party target identified.",
      usedClassifierModel: false,
    };
    await logDecision(input, decision, targets);
    return decision;
  }

  // 4) Ask the lightweight classifier model.
  const description = [
    `Tool: ${input.toolName}`,
    targets.length ? `Target(s): ${targets.join(", ")}` : "",
    input.userContext ? `User context: ${input.userContext}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const modelResult = await classifyWithModel(description);

  if (modelResult === null) {
    // No AI provider configured / classifier failed — fail safe but permissive for
    // read-only OSINT lookups (can't block core functionality without a working key),
    // while still blocking obviously destructive code-execution asks via keyword check.
    const heuristicBlock = /\b(ddos|brute\s*-?force|ransomware|exploit\s+(?!lab|sandbox)|steal|hack into|unauthorized|without permission|bypass.*(auth|login|security))\b/i.test(
      input.userContext || "",
    );
    const decision: GuardrailDecision = heuristicBlock
      ? {
          allowed: false,
          classification: "unauthorized_target",
          reason: "No AI classifier available; request text matches high-risk attack keywords against an unconfirmed target.",
          usedClassifierModel: false,
        }
      : {
          allowed: true,
          classification: "unclear",
          reason: "No AI classifier available (no provider key configured); allowed by default, flagged for review.",
          usedClassifierModel: false,
        };
    await logDecision(input, decision, targets);
    return decision;
  }

  const decision: GuardrailDecision = {
    allowed: modelResult !== "unauthorized_target",
    classification: modelResult,
    reason:
      modelResult === "unauthorized_target"
        ? "Classifier determined this targets a real third party without stated ownership/authorization."
        : "Classifier determined the request is educational/authorized/lab-scoped.",
    usedClassifierModel: true,
  };
  await logDecision(input, decision, targets);
  return decision;
}

async function logDecision(
  input: GuardrailCheckInput,
  decision: GuardrailDecision,
  targets: string[],
): Promise<void> {
  try {
    const argsSummary = JSON.stringify({ ...sanitizeArgsForAudit(input.args), targets }).slice(0, 2000);
    await db.insert(sensitiveToolAuditLog).values({
      deviceId: input.actorId ?? "anonymous",
      ip: input.actorIp ?? "unknown",
      toolName: input.toolName,
      argsSummary,
      verdict: decision.allowed ? "allowed" : "blocked",
      blockReason: decision.allowed ? null : `[${decision.classification}] ${decision.reason}`,
    });
  } catch (err) {
    // Never let audit-log failures block the guardrail decision itself.
    console.error("[guardrails] failed to write audit log:", (err as Error).message);
  }
}

export const GUARDRAIL_SYSTEM_PROMPT = `Security & usage boundaries: This assistant may run sensitive tools (arbitrary code execution, raw SQL, OSINT/threat-intel/dark-web lookups). These must only be used for educational purposes, defensive security, or testing systems the user owns or has explicit written authorization to test (including lab/sandbox/CTF environments). Never help perform, plan, or facilitate an actual unauthorized attack, intrusion, data theft, or harm against a real third party. If a request appears to target a real system/person without stated ownership or authorization, politely refuse and explain why, and suggest a safe/lab-based alternative instead.`;
