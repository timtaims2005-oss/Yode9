import type {
  AgenticPlugin,
  PluginContext,
  PluginFinding,
  PluginResult,
  PluginTelemetry,
} from "../agentic/types";

interface DecisionNode {
  readonly id: string;
  readonly label: string;
  readonly decision: string;
  readonly dependsOn: readonly string[];
  readonly confidence: number;
}

interface AgentPersona {
  readonly name: string;
  readonly role: string;
  readonly assignedTasks: readonly string[];
  readonly status: "idle" | "active" | "complete";
}

interface StateOrchestrationResult {
  readonly personas: readonly AgentPersona[];
  readonly decisionGraph: readonly DecisionNode[];
  readonly synthesisScore: number;
  readonly recommendedWorkflow: readonly string[];
}

function buildDecisionGraph(intent: string, mode: string): readonly DecisionNode[] {
  const intentLower = intent.toLowerCase();
  const isNetworkFocused = /network|port|scan|host|subnet|ip/.test(intentLower);
  const isAuthFocused = /auth|jwt|token|credential|login|session/.test(intentLower);
  const isFuzzFocused = /fuzz|payload|inject|input|test|stress/.test(intentLower);

  const nodes: DecisionNode[] = [
    {
      id: "scope-definition",
      label: "Scope Definition",
      decision: `Constrain operation to ${mode} mode with advisory output only`,
      dependsOn: [],
      confidence: 0.98,
    },
    {
      id: "threat-surface-map",
      label: "Threat Surface Mapping",
      decision: "Enumerate attack surface vectors without active probing",
      dependsOn: ["scope-definition"],
      confidence: 0.91,
    },
  ];

  if (isNetworkFocused) {
    nodes.push({
      id: "network-topology-plan",
      label: "Network Topology Planning",
      decision: "Plan passive asset inventory and sub-net mapping strategy",
      dependsOn: ["threat-surface-map"],
      confidence: 0.87,
    });
  }

  if (isAuthFocused) {
    nodes.push({
      id: "identity-review-plan",
      label: "Identity & Cryptographic Review",
      decision: "Assess JWT configuration, algorithm exposure, and session hardening gaps",
      dependsOn: ["threat-surface-map"],
      confidence: 0.89,
    });
  }

  if (isFuzzFocused) {
    nodes.push({
      id: "fuzzing-strategy",
      label: "Fuzzing Strategy Definition",
      decision: "Define payload mutation vectors, boundary inputs, and stress surface",
      dependsOn: ["threat-surface-map"],
      confidence: 0.84,
    });
  }

  nodes.push({
    id: "synthesis",
    label: "Multi-Agent Synthesis",
    decision: "Aggregate findings from all specialist agents into prioritized advisory report",
    dependsOn: nodes.slice(-1).map((n) => n.id),
    confidence: 0.95,
  });

  return nodes;
}

function assignPersonas(intent: string, graph: readonly DecisionNode[]): readonly AgentPersona[] {
  const intentLower = intent.toLowerCase();
  const nodeIds = graph.map((n) => n.id);

  const personas: AgentPersona[] = [
    {
      name: "ReconAgent",
      role: "Passive intelligence collection and asset enumeration",
      assignedTasks: nodeIds.filter((id) => /scope|surface|topology|map/.test(id)),
      status: "active",
    },
    {
      name: "ExploitationAgent",
      role: "Vulnerability hypothesis generation (simulation-only, no active exploitation)",
      assignedTasks: nodeIds.filter((id) => /threat|identity|fuzzing|fuzz/.test(id)),
      status: "active",
    },
    {
      name: "ValidatorAgent",
      role: "Evidence verification, false-positive triage, and confidence scoring",
      assignedTasks: nodeIds.filter((id) => /review|plan|strategy/.test(id)),
      status: "active",
    },
    {
      name: "ReporterAgent",
      role: "Structured finding synthesis and remediation recommendation generation",
      assignedTasks: nodeIds.filter((id) => /synthesis/.test(id)),
      status: "active",
    },
  ];

  // Ensure at least one intent-keyed task per active persona
  if (intentLower.length > 0 && personas.every((p) => p.assignedTasks.length === 0)) {
    return personas.map((p, i) => ({ ...p, assignedTasks: [nodeIds[i % nodeIds.length] ?? "scope-definition"] }));
  }

  return personas;
}

function orchestrateState(request: PluginContext["request"]): StateOrchestrationResult {
  const graph = buildDecisionGraph(request.intent, request.mode);
  const personas = assignPersonas(request.intent, graph);
  const avgConfidence = graph.reduce((sum, n) => sum + n.confidence, 0) / graph.length;
  const workflow = graph.map((n) => n.id);
  return { personas, decisionGraph: graph, synthesisScore: avgConfidence, recommendedWorkflow: workflow };
}

export class HeroOrchestratorPlugin implements AgenticPlugin {
  readonly name = "HeroOrchestratorPlugin";

  async run(context: PluginContext): Promise<PluginResult> {
    const startedAt = Date.now();
    const { request } = context;

    const orchestration = orchestrateState(request);
    const activePersonaCount = orchestration.personas.filter((p) => p.assignedTasks.length > 0).length;
    const graphDepth = orchestration.decisionGraph.length;

    const findings: PluginFinding[] = [
      {
        id: "hero-decision-graph",
        severity: "info",
        title: "Decision Graph Synthesized",
        description: `DAG constructed with ${graphDepth} nodes across ${activePersonaCount} specialist personas. ` +
          `Synthesis confidence score: ${(orchestration.synthesisScore * 100).toFixed(1)}%.`,
        evidence: orchestration.decisionGraph.map((n) => `node:${n.id}:confidence=${n.confidence.toFixed(2)}`),
        remediation: "Review each DAG node decision before authorizing any live operation.",
      },
      {
        id: "hero-persona-allocation",
        severity: "info",
        title: "Multi-Agent Persona Allocation",
        description: `${activePersonaCount} of 4 specialist personas active: ` +
          orchestration.personas.map((p) => `${p.name}(${p.assignedTasks.length} tasks)`).join(", "),
        evidence: orchestration.personas.map((p) => `persona:${p.name}:role=${p.role.slice(0, 50)}`),
        remediation: "Validate persona scope boundaries before escalating to semi-autonomous mode.",
      },
      {
        id: "hero-workflow-plan",
        severity: "info",
        title: "Recommended Execution Workflow",
        description: `Sequenced ${orchestration.recommendedWorkflow.length}-step workflow: ` +
          orchestration.recommendedWorkflow.join(" → "),
        evidence: orchestration.recommendedWorkflow.map((step, i) => `step-${i + 1}:${step}`),
        remediation: "Each workflow step must remain within the authorized scope before execution.",
      },
    ];

    const telemetry: PluginTelemetry = {
      plugin: this.name,
      durationMs: Math.max(0, Date.now() - startedAt),
      mode: request.mode,
      actionsConsidered: [
        "dag-construction",
        "persona-assignment",
        "state-orchestration",
        "synthesis-scoring",
      ],
      actionsBlocked: [
        "exploit-delivery",
        "credential-attack",
        "arbitrary-shell",
        "destructive-payload",
        "network-probing",
      ],
    };

    return {
      plugin: this.name,
      status: "simulated",
      findings,
      telemetry,
      blockedActions: telemetry.actionsBlocked,
      explanation:
        `HeroOrchestrator synthesized a ${graphDepth}-node decision graph with ${activePersonaCount} active personas. ` +
        `All actions remain in ${request.mode} mode. No active operations performed.`,
    };
  }
}

export default HeroOrchestratorPlugin;
