import { assessRequestSafety } from "../agentic/safety";
import type { AgenticRequest } from "../agentic/types";
import type { Planner, ReActPlan, ReasoningStep } from "./types";

const MAX_RETRY_DEPTH = 3;

interface IntentAnalysis {
  readonly goal: string;
  readonly domain: "network" | "auth" | "fuzzing" | "audit" | "orchestration" | "general";
  readonly complexity: "simple" | "moderate" | "complex";
  readonly riskIndicators: readonly string[];
}

function analyzeIntent(intent: string, mode: string): IntentAnalysis {
  const lower = intent.toLowerCase();
  let domain: IntentAnalysis["domain"] = "general";
  const riskIndicators: string[] = [];

  if (/network|port|scan|subnet|topology|asset/.test(lower)) {
    domain = "network";
    riskIndicators.push("network-exposure-risk");
  } else if (/jwt|token|auth|crypto|credential|session/.test(lower)) {
    domain = "auth";
    riskIndicators.push("identity-risk", "cryptographic-risk");
  } else if (/fuzz|payload|inject|mutation|stress/.test(lower)) {
    domain = "fuzzing";
    riskIndicators.push("injection-risk", "dos-risk");
  } else if (/audit|vuln|cve|owasp|surface|assess/.test(lower)) {
    domain = "audit";
    riskIndicators.push("vulnerability-exposure");
  } else if (/orchestrat|swarm|persona|agent|pipeline/.test(lower)) {
    domain = "orchestration";
    riskIndicators.push("multi-agent-coordination-risk");
  }

  if (mode === "dry-run") riskIndicators.push("dry-run-mode");
  if (intent.length > 120) riskIndicators.push("complex-intent-detected");

  const complexity: IntentAnalysis["complexity"] =
    intent.length > 120 ? "complex" : intent.length > 60 ? "moderate" : "simple";

  return {
    goal: intent,
    domain,
    complexity,
    riskIndicators,
  };
}

function buildMultiPhaseSteps(
  analysis: IntentAnalysis,
  request: AgenticRequest,
  safetyReason: string,
): readonly ReasoningStep[] {
  const { domain, complexity, riskIndicators } = analysis;

  const baseSteps: ReasoningStep[] = [
    {
      index: 0,
      thought: `Constrain the request to the authorized scope "${request.authorizedScope.id}" in ${request.mode} mode.`,
      action: "validate-scope",
      observation: safetyReason,
    },
    {
      index: 1,
      thought: `Intent domain classified as "${domain}" with ${complexity} complexity. Risk indicators: ${riskIndicators.join(", ") || "none"}.`,
      action: "intent-analysis",
      observation: `Domain-specific plugin selection will target ${domain}-relevant capabilities.`,
    },
  ];

  // Domain-specific reasoning steps
  if (domain === "network") {
    baseSteps.push(
      {
        index: 2,
        thought: "Plan passive asset inventory and sub-net topology mapping without active probing.",
        action: "simulate-plugins:NetworkScannerPlugin",
        observation: "No port scanning, banner grabbing, or ping sweeps permitted. Advisory output only.",
      },
      {
        index: 3,
        thought: "Cross-reference discovered topology vectors against known misconfigurations.",
        action: "simulate-plugins:OmniAuditPlugin",
        observation: "OWASP Top 10 vectors correlated with network attack surface.",
      },
    );
  } else if (domain === "auth") {
    baseSteps.push(
      {
        index: 2,
        thought: "Analyze JWT algorithm configuration, claim validation gaps, and signature forge vectors.",
        action: "simulate-plugins:JWTSecurityPlugin",
        observation: "No token forgery, secret extraction, or active replay. Cryptographic analysis advisory only.",
      },
      {
        index: 3,
        thought: "Assess identity attack surface alignment with overall audit coverage.",
        action: "simulate-plugins:OmniAuditPlugin",
        observation: "Authentication surface mapped to OWASP A07:2021 category vectors.",
      },
    );
  } else if (domain === "fuzzing") {
    baseSteps.push(
      {
        index: 2,
        thought: "Construct payload mutation strategy set and stateful fuzzing pipeline.",
        action: "simulate-plugins:MonstakFuzzingPlugin",
        observation: "No active payload transmission. All mutations remain advisory and in-memory.",
      },
      {
        index: 3,
        thought: "Validate fuzzing target surface alignment against known injection vectors.",
        action: "simulate-plugins:OmniAuditPlugin",
        observation: "CWE-classified injection surfaces correlated with mutation strategy coverage.",
      },
    );
  } else if (domain === "audit") {
    baseSteps.push(
      {
        index: 2,
        thought: "Execute comprehensive OWASP Top 10 attack surface analysis across all five surfaces.",
        action: "simulate-plugins:OmniAuditPlugin",
        observation: "Findings classified by CVSS score and CWE identifier. No active exploitation.",
      },
      {
        index: 3,
        thought: "Supplement audit with network topology and cryptographic exposure assessment.",
        action: "simulate-plugins:NetworkScannerPlugin,JWTSecurityPlugin",
        observation: "Combined findings provide full-stack advisory coverage.",
      },
    );
  } else {
    // General / orchestration: run all plugins via HeroOrchestrator
    baseSteps.push(
      {
        index: 2,
        thought: "Invoke HeroOrchestrator to synthesize a multi-agent decision graph across all domains.",
        action: "simulate-plugins:HeroOrchestratorPlugin",
        observation: "DAG constructed; four specialist personas allocated to task distribution.",
      },
      {
        index: 3,
        thought: "Execute full plugin suite under swarm orchestration to maximize finding coverage.",
        action: `simulate-plugins:${request.requestedPlugins?.join(",") ?? "all"}`,
        observation: "All plugins run in advisory simulation mode.",
      },
    );
  }

  // Reflection step (always last)
  baseSteps.push({
    index: baseSteps.length,
    thought: "Reflect on findings across all executed plugins. Score confidence and identify next action.",
    action: "reflect",
    observation:
      "Results remain advisory and in-memory. " +
      (complexity === "complex"
        ? "Complex intent may require follow-up manual review of full finding set."
        : "Findings summarized for direct remediation planning."),
  });

  return baseSteps;
}

export class ReActPlanner {
  private readonly maxRetryDepth: number;

  constructor(maxRetryDepth: number = MAX_RETRY_DEPTH) {
    this.maxRetryDepth = maxRetryDepth;
  }

  async plan(request: AgenticRequest, retryDepth = 0): Promise<ReActPlan> {
    const safety = assessRequestSafety(request);

    if (!safety.allowed) {
      return {
        goal: request.intent,
        steps: [
          {
            index: 0,
            thought: "Safety assessment blocked the request before planning could begin.",
            action: "blocked",
            observation: safety.reason,
          },
        ],
        mode: request.mode,
        blockedActions: [safety.reason],
      };
    }

    const analysis = analyzeIntent(request.intent, request.mode);
    const steps = buildMultiPhaseSteps(analysis, request, safety.reason);

    // Self-healing: if this is a retry, add a mutation step describing what changed
    const mutatedSteps: readonly ReasoningStep[] = retryDepth > 0
      ? [
          {
            index: -1,
            thought: `Self-healing retry ${retryDepth}/${this.maxRetryDepth}: Previous execution encountered an error. ` +
              "Mutating parameters — narrowing plugin scope and reducing complexity.",
            action: "self-heal-mutate",
            observation: `Retry depth ${retryDepth}. Plugin scope constrained to core audit plugins.`,
          },
          ...steps.map((s) => ({ ...s, index: s.index + 1 })),
        ]
      : steps;

    return {
      goal: request.intent,
      steps: mutatedSteps,
      mode: request.mode,
      blockedActions: [],
    };
  }

  /**
   * Generate a mutated request for self-healing retry.
   * Simplifies the plugin set and reduces scope complexity.
   */
  mutateForRetry(request: AgenticRequest, _errorContext: string): AgenticRequest {
    // Narrow to core audit plugins on retry to avoid the same failure path
    const coreFallbackPlugins = ["OmniAuditPlugin", "HeroOrchestratorPlugin"];
    return {
      ...request,
      requestedPlugins: coreFallbackPlugins,
      intent: request.intent.slice(0, 100), // Truncate very long intents
    };
  }

  asPlanner(): Planner {
    return (request: AgenticRequest): Promise<ReActPlan> => this.plan(request);
  }
}

export default ReActPlanner;
