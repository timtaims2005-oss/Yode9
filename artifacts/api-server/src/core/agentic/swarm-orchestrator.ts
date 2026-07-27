import { ContextBus } from "./context-bus";
import { DagWorkflowEngine } from "./dag-workflow";
import { assessRequestSafety } from "./safety";
import type {
  AgenticPlugin,
  AgenticRequest,
  ContextBusLike,
  PluginResult,
  SwarmResult,
  WorkflowNodeResult,
} from "./types";

export interface SwarmCallbacks {
  readonly onDelegation?: (plugin: string, persona: string) => void;
  readonly onPlugin?: (result: PluginResult) => void;
  readonly onPersonaActivated?: (persona: AgentPersona) => void;
}

export interface AgentPersona {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly specialization: string;
  readonly assignedPlugins: readonly string[];
}

/**
 * Four specialist personas that share the global ContextBus.
 * Each persona is a logical role — not a separate process or network actor.
 * All operations remain in-memory and in the same simulation boundary.
 */
const DEFAULT_PERSONAS: readonly AgentPersona[] = [
  {
    id: "recon",
    name: "ReconAgent",
    role: "Passive Intelligence Collector",
    specialization:
      "Gathers passive telemetry, enumerates assets, and maps attack surface without active probing.",
    assignedPlugins: ["NetworkScannerPlugin", "OmniAuditPlugin"],
  },
  {
    id: "exploitation",
    name: "ExploitationAgent",
    role: "Vulnerability Hypothesis Generator (Simulation Only)",
    specialization:
      "Generates adversarial hypotheses for crypto/identity vulnerabilities and fuzzing vectors. " +
      "All exploitation is advisory — no active exploit delivery.",
    assignedPlugins: ["JWTSecurityPlugin", "MonstakFuzzingPlugin"],
  },
  {
    id: "validator",
    name: "ValidatorAgent",
    role: "Evidence Verifier & Confidence Scorer",
    specialization:
      "Cross-validates findings from Recon and Exploitation agents. Applies false-positive triage " +
      "and confidence scoring using inter-agent ContextBus consensus.",
    assignedPlugins: [],
  },
  {
    id: "reporter",
    name: "ReporterAgent",
    role: "Structured Finding Synthesizer",
    specialization:
      "Aggregates validated findings from all personas into a prioritized advisory report. " +
      "Produces remediation recommendations ranked by exploitability × impact.",
    assignedPlugins: ["HeroOrchestratorPlugin"],
  },
];

interface PersonaExecutionResult {
  readonly persona: AgentPersona;
  readonly pluginResults: readonly PluginResult[];
  readonly consensusScore: number;
}

function scoreConsensus(results: readonly PluginResult[], bus: ContextBusLike): number {
  if (results.length === 0) return 0.5;
  // Consensus is higher when findings align and no conflicting blocks exist
  const blocked = results.filter((r) => r.status === "blocked").length;
  const simulated = results.filter((r) => r.status === "simulated").length;
  const base = simulated / results.length;
  const penaltyForBlocked = blocked * 0.1;
  const busEvents = (bus as ContextBus).latest<readonly PluginResult[]>("plugin") !== undefined ? 0.05 : 0;
  return Math.max(0.5, Math.min(0.98, base - penaltyForBlocked + busEvents));
}

function selectPersonaPlugins(
  persona: AgentPersona,
  plugins: readonly AgenticPlugin[],
  request: AgenticRequest,
): readonly AgenticPlugin[] {
  const { requestedPlugins } = request;

  // If explicit plugins requested, filter persona's plugins against the requested list
  const pluginPool = requestedPlugins !== undefined
    ? plugins.filter((p) => requestedPlugins.includes(p.name))
    : plugins;

  if (persona.assignedPlugins.length === 0) {
    // Validator persona — cross-validates; no plugins to run directly
    return [];
  }

  return pluginPool.filter((p) => persona.assignedPlugins.includes(p.name));
}

export class SwarmOrchestrator {
  readonly plugins: readonly AgenticPlugin[];
  readonly personas: readonly AgentPersona[];
  private readonly workflow = new DagWorkflowEngine();

  constructor(
    plugins: readonly AgenticPlugin[],
    personas: readonly AgentPersona[] = DEFAULT_PERSONAS,
  ) {
    this.plugins = [...plugins];
    this.personas = [...personas];
  }

  async run(request: AgenticRequest, callbacks: SwarmCallbacks = {}): Promise<SwarmResult> {
    const safety = assessRequestSafety(request);
    if (!safety.allowed) {
      return {
        mode: request.mode,
        plugins: [],
        blockedActions: request.authorizedScope?.actions ?? [],
        telemetry: {
          status: "blocked",
          reason: safety.reason,
          personas: [],
          consensusScore: 0,
        },
      };
    }

    const bus = new ContextBus();
    const context = { request, bus, values: new Map<string, unknown>() };

    // Phase 1: Activate personas and assign plugins
    const personaAssignments = this.personas.map((persona) => ({
      persona,
      plugins: selectPersonaPlugins(persona, this.plugins, request),
    }));

    // Notify persona activation
    for (const { persona } of personaAssignments) {
      callbacks.onPersonaActivated?.(persona);
      bus.publish("persona-activated", { personaId: persona.id, name: persona.name });
    }

    // Phase 2: Build DAG nodes — each persona runs its plugins in parallel within waves
    const allResults: PluginResult[] = [];
    const personaResults: PersonaExecutionResult[] = [];

    // Recon and Exploitation run in parallel (wave 1), then Validator, then Reporter
    const wave1Personas = personaAssignments.filter(
      (pa) => pa.persona.id === "recon" || pa.persona.id === "exploitation",
    );
    const validatorAssignment = personaAssignments.find((pa) => pa.persona.id === "validator");
    const reporterAssignment = personaAssignments.find((pa) => pa.persona.id === "reporter");

    // Execute wave 1 (Recon + Exploitation in parallel)
    const wave1Definitions = wave1Personas.flatMap(({ persona, plugins: personaPlugins }) =>
      personaPlugins.map((plugin) => ({
        id: `${persona.id}:${plugin.name}`,
        dependsOn: [] as readonly string[],
        personaId: persona.id,
        plugin,
        persona,
        execute: async (): Promise<WorkflowNodeResult> => {
          callbacks.onDelegation?.(plugin.name, persona.name);
          const result = await plugin.run({ request });
          bus.publish("plugin", result);
          bus.publish(`persona:${persona.id}:result`, result);
          callbacks.onPlugin?.(result);
          allResults.push(result);
          return {
            nodeId: `${persona.id}:${plugin.name}`,
            status: result.status === "blocked" ? "blocked" : "completed",
            output: result,
          };
        },
      })),
    );

    if (wave1Definitions.length > 0) {
      await this.workflow.run(
        { id: "wave1-recon-exploit", nodes: wave1Definitions },
        context,
      );
    }

    // Consolidate wave 1 persona results
    for (const { persona, plugins: personaPlugins } of wave1Personas) {
      const pResults = allResults.filter((r) =>
        personaPlugins.some((p) => p.name === r.plugin),
      );
      personaResults.push({
        persona,
        pluginResults: pResults,
        consensusScore: scoreConsensus(pResults, bus),
      });
    }

    // ValidatorAgent cross-validates (wave 2) — no plugins, reads from ContextBus
    if (validatorAssignment !== undefined) {
      const validationSummary = {
        reviewedFindings: allResults.flatMap((r) => r.findings).length,
        blockedActions: allResults.flatMap((r) => r.blockedActions),
        consensusScore: scoreConsensus(allResults, bus),
        personaCount: wave1Personas.length,
      };
      bus.publish("validation-complete", validationSummary);
      personaResults.push({
        persona: validatorAssignment.persona,
        pluginResults: [],
        consensusScore: validationSummary.consensusScore,
      });
    }

    // Reporter (wave 3) — runs HeroOrchestratorPlugin as synthesis engine
    if (reporterAssignment !== undefined && reporterAssignment.plugins.length > 0) {
      const reporterPluginResults: PluginResult[] = [];
      for (const plugin of reporterAssignment.plugins) {
        callbacks.onDelegation?.(plugin.name, reporterAssignment.persona.name);
        const result = await plugin.run({ request });
        bus.publish("plugin", result);
        callbacks.onPlugin?.(result);
        allResults.push(result);
        reporterPluginResults.push(result);
      }
      personaResults.push({
        persona: reporterAssignment.persona,
        pluginResults: reporterPluginResults,
        consensusScore: scoreConsensus(reporterPluginResults, bus),
      });
    }

    const overallConsensus = personaResults.length > 0
      ? personaResults.reduce((sum, pr) => sum + pr.consensusScore, 0) / personaResults.length
      : 0.5;

    return {
      mode: request.mode,
      plugins: allResults,
      blockedActions: allResults.flatMap((r) => r.blockedActions),
      telemetry: {
        workflowId: "multi-persona-defensive-swarm",
        status: "completed",
        pluginCount: allResults.length,
        personaCount: this.personas.length,
        consensusScore: parseFloat(overallConsensus.toFixed(3)),
        personas: personaResults.map((pr) => ({
          id: pr.persona.id,
          name: pr.persona.name,
          role: pr.persona.role,
          pluginsRun: pr.pluginResults.length,
          consensusScore: parseFloat(pr.consensusScore.toFixed(3)),
        })),
        contextBusTopics: ["plugin", "validation-complete", "persona-activated",
          ...this.personas.map((p) => `persona:${p.id}:result`)],
      },
    };
  }
}

export default SwarmOrchestrator;
