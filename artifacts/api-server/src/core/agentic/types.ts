/**
 * Shared types for the defensive agentic control plane.
 *
 * The control plane deliberately has no capability for invoking operating
 * system commands, making network requests, or delivering payloads. Plugins
 * produce plans and telemetry only.
 */

export type AgenticMode = "dry-run" | "simulation";

export interface AuthorizedScope {
  readonly id: string;
  readonly actions: readonly string[];
  readonly expiresAt?: number;
}

export interface AgenticRequest {
  readonly intent: string;
  readonly authorizedScope: AuthorizedScope;
  readonly mode: AgenticMode;
  readonly input: Readonly<Record<string, unknown>>;
  readonly requestedPlugins?: readonly string[];
}

export interface SafetyDecision {
  readonly allowed: boolean;
  readonly reason: string;
}

export interface PluginFinding {
  readonly id: string;
  readonly severity: "info" | "low" | "medium" | "high";
  readonly title: string;
  readonly description: string;
  readonly evidence: readonly string[];
  readonly remediation?: string;
}

export interface PluginTelemetry {
  readonly plugin: string;
  readonly durationMs: number;
  readonly mode: AgenticMode;
  readonly actionsConsidered: readonly string[];
  readonly actionsBlocked: readonly string[];
}

export interface PluginResult {
  readonly plugin: string;
  readonly status: "simulated" | "blocked";
  readonly findings: readonly PluginFinding[];
  readonly telemetry: PluginTelemetry;
  readonly blockedActions: readonly string[];
  readonly explanation: string;
}

export interface PluginContext {
  readonly request: AgenticRequest;
  readonly signal?: AbortSignal;
}

export interface AgenticPlugin {
  readonly name: string;
  run(context: PluginContext): Promise<PluginResult>;
}

export interface WorkflowContext {
  readonly request: AgenticRequest;
  readonly bus: ContextBusLike;
  readonly values: Map<string, unknown>;
}

export interface WorkflowNodeResult {
  readonly nodeId: string;
  readonly status: "completed" | "blocked" | "failed";
  readonly output: unknown;
  readonly reason?: string;
}

export interface WorkflowNode {
  readonly id: string;
  readonly dependsOn: readonly string[];
  execute(context: WorkflowContext): Promise<WorkflowNodeResult>;
}

export interface WorkflowDefinition {
  readonly id: string;
  readonly nodes: readonly WorkflowNode[];
}

export interface ContextBusLike {
  publish<T>(topic: string, payload: T): void;
  subscribe<T>(topic: string, listener: (payload: T) => void): () => void;
}

export interface SwarmResult {
  readonly mode: AgenticMode;
  readonly plugins: readonly PluginResult[];
  readonly blockedActions: readonly string[];
  readonly telemetry: Readonly<Record<string, unknown>>;
}
