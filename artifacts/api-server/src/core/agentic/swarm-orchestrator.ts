import { ContextBus } from "./context-bus";
import { DagWorkflowEngine } from "./dag-workflow";
import { assessRequestSafety } from "./safety";
import type {
  AgenticPlugin,
  AgenticRequest,
  PluginResult,
  SwarmResult,
  WorkflowNodeResult,
} from "./types";

export interface SwarmCallbacks {
  readonly onDelegation?: (plugin: string) => void;
  readonly onPlugin?: (result: PluginResult) => void;
}

export class SwarmOrchestrator {
  readonly plugins: readonly AgenticPlugin[];
  private readonly workflow = new DagWorkflowEngine();

  constructor(plugins: readonly AgenticPlugin[]) {
    this.plugins = [...plugins];
  }

  async run(request: AgenticRequest, callbacks: SwarmCallbacks = {}): Promise<SwarmResult> {
    const safety = assessRequestSafety(request);
    if (!safety.allowed) {
      return {
        mode: request.mode,
        plugins: [],
        blockedActions: request.authorizedScope?.actions ?? [],
        telemetry: { status: "blocked", reason: safety.reason },
      };
    }
    const selected = request.requestedPlugins === undefined
      ? this.plugins
      : this.plugins.filter((plugin) => request.requestedPlugins?.includes(plugin.name));
    const bus = new ContextBus();
    const context = { request, bus, values: new Map<string, unknown>() };
    const nodes = selected.map((plugin) => ({
      id: plugin.name,
      dependsOn: [] as readonly string[],
      execute: async (): Promise<WorkflowNodeResult> => {
        callbacks.onDelegation?.(plugin.name);
        const result = await plugin.run({ request });
        bus.publish("plugin", result);
        callbacks.onPlugin?.(result);
        return { nodeId: plugin.name, status: result.status === "blocked" ? "blocked" : "completed", output: result };
      },
    }));
    const workflow = await this.workflow.run({ id: "defensive-swarm", nodes }, context);
    const results = workflow.nodes
      .map((node) => node.output)
      .filter((output): output is PluginResult => this.isPluginResult(output));
    return {
      mode: request.mode,
      plugins: results,
      blockedActions: results.flatMap((result) => result.blockedActions),
      telemetry: { workflowId: workflow.workflowId, status: workflow.status, pluginCount: results.length },
    };
  }

  private isPluginResult(value: unknown): value is PluginResult {
    return typeof value === "object" && value !== null && "plugin" in value && "findings" in value;
  }
}

export default SwarmOrchestrator;
