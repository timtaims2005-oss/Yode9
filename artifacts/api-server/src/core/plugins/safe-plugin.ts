import type {
  AgenticPlugin,
  PluginContext,
  PluginFinding,
  PluginResult,
} from "../agentic/types";

export abstract class SafeSimulationPlugin implements AgenticPlugin {
  abstract readonly name: string;
  protected abstract readonly capability: string;

  async run(context: PluginContext): Promise<PluginResult> {
    const startedAt = Date.now();
    const blockedActions = [
      "exploit-delivery",
      "credential-attack",
      "arbitrary-shell",
      "destructive-payload",
      "network-probing",
    ];
    const finding: PluginFinding = {
      id: `${this.name.toLowerCase().replaceAll(" ", "-")}-simulation`,
      severity: "info",
      title: `${this.name} simulation prepared`,
      description: `${this.capability} generated advisory telemetry only; no active operation was performed.`,
      evidence: [`authorized-scope:${context.request.authorizedScope.id}`, `mode:${context.request.mode}`],
      remediation: "Review the plan and independently authorize any safe defensive follow-up.",
    };
    return {
      plugin: this.name,
      status: "simulated",
      findings: [finding],
      telemetry: {
        plugin: this.name,
        durationMs: Math.max(0, Date.now() - startedAt),
        mode: context.request.mode,
        actionsConsidered: [this.capability],
        actionsBlocked: blockedActions,
      },
      blockedActions,
      explanation: "Active actions are blocked by the safe-by-default control plane.",
    };
  }
}
