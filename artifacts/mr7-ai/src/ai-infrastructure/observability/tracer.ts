import { InfrastructureError } from "../types";

export type TraceStatus = "running" | "success" | "error" | "cancelled";
export type TraceSpan = {
  id: string;
  parentId?: string;
  name: string;
  kind: "agent" | "model" | "tool" | "retry" | "memory" | "guardrail" | "eval";
  startedAt: number;
  endedAt?: number;
  status: TraceStatus;
  attributes: Record<string, string | number | boolean>;
  error?: string;
};

export type Trace = {
  id: string;
  startedAt: number;
  endedAt?: number;
  status: TraceStatus;
  spans: TraceSpan[];
  usage: { inputTokens: number; outputTokens: number; estimatedCostUsd: number };
};

export type ObservabilityConfig = {
  maxCostUsd?: number;
  timeoutMs?: number;
  tokenCostUsd?: number;
  onTrace?: (trace: Trace) => void;
};

const traces = new Map<string, Trace>();
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export class TraceRecorder {
  readonly trace: Trace;
  private readonly config: ObservabilityConfig;

  constructor(config: ObservabilityConfig = {}) {
    this.config = config;
    this.trace = {
      id: makeId("trace"),
      startedAt: Date.now(),
      status: "running",
      spans: [],
      usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 },
    };
    traces.set(this.trace.id, this.trace);
  }

  startSpan(name: string, kind: TraceSpan["kind"], parentId?: string, attributes: TraceSpan["attributes"] = {}): TraceSpan {
    const span = { id: makeId("span"), parentId, name, kind, startedAt: Date.now(), status: "running" as const, attributes };
    this.trace.spans.push(span);
    return span;
  }

  endSpan(span: TraceSpan, status: Exclude<TraceStatus, "running"> = "success", error?: unknown): void {
    span.endedAt = Date.now();
    span.status = status;
    if (error) span.error = error instanceof Error ? error.message : String(error);
  }

  recordUsage(inputTokens = 0, outputTokens = 0, costUsd?: number): void {
    this.trace.usage.inputTokens += inputTokens;
    this.trace.usage.outputTokens += outputTokens;
    this.trace.usage.estimatedCostUsd += costUsd ?? ((inputTokens + outputTokens) / 1_000_000) * (this.config.tokenCostUsd ?? 2);
    if (this.config.maxCostUsd !== undefined && this.trace.usage.estimatedCostUsd > this.config.maxCostUsd) {
      throw new InfrastructureError("Execution cost cap exceeded.", "BUDGET_EXCEEDED", { costUsd: this.trace.usage.estimatedCostUsd });
    }
  }

  finish(status: Exclude<TraceStatus, "running"> = "success"): Trace {
    this.trace.endedAt = Date.now();
    this.trace.status = status;
    this.config.onTrace?.(this.trace);
    return this.trace;
  }
}

export function getTrace(traceId: string): Trace | undefined { return traces.get(traceId); }
export function listTraces(): Trace[] { return [...traces.values()]; }

export async function withTimeout<T>(task: Promise<T>, timeoutMs = 60_000): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new InfrastructureError("Execution timed out.", "TIMEOUT")), timeoutMs);
  });
  try { return await Promise.race([task, timer]); } finally { if (timeout) clearTimeout(timeout); }
}
