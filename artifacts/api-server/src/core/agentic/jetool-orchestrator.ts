import { assessRequestSafety } from "./safety";
import type { AgenticPlugin, AgenticRequest, PluginResult } from "./types";

export interface JetoolResult {
  readonly status: "simulated" | "blocked";
  readonly plan: readonly string[];
  readonly outputs: readonly PluginResult[];
  readonly blockedActions: readonly string[];
}

/**
 * Jetool is a plan-oriented adapter. It does not invoke tools; each proposed
 * tool call is represented as a blocked/simulated output for human review.
 */
export class JetoolOrchestrator {
  constructor(private readonly plugins: readonly AgenticPlugin[] = []) {}

  async plan(request: AgenticRequest): Promise<JetoolResult> {
    const safety = assessRequestSafety(request);
    if (!safety.allowed) {
      return { status: "blocked", plan: [], outputs: [], blockedActions: [safety.reason] };
    }
    const selected = request.requestedPlugins === undefined
      ? this.plugins
      : this.plugins.filter((plugin) => request.requestedPlugins?.includes(plugin.name));
    const outputs = await Promise.all(selected.map((plugin) => plugin.run({ request })));
    return {
      status: "simulated",
      plan: selected.map((plugin) => `simulate:${plugin.name}`),
      outputs,
      blockedActions: outputs.flatMap((output) => output.blockedActions),
    };
  }

  async execute(request: AgenticRequest): Promise<JetoolResult> {
    return this.plan(request);
  }
}

export default JetoolOrchestrator;
