import { AIGateway, type ModelProvider } from "../../gateway/gateway";
import { TraceRecorder } from "../../observability/tracer";
import type { ModelRequest, ModelResponse } from "../../types";

export class AITracingTelemetry {
  constructor(readonly recorder = new TraceRecorder()) {}
  async record<T>(stage: string, operation: () => Promise<T>): Promise<T> {
    const span = this.recorder.startSpan(stage, "agent");
    try { const result = await operation(); this.recorder.endSpan(span); return result; }
    catch (error) { this.recorder.endSpan(span, "error", error); throw error; }
  }
}

export class LLMasAJudgeEvaluator {
  evaluate(output: string, criteria: string[] = []): { score: number; passed: boolean; criteria: string[] } {
    const score = criteria.length ? criteria.filter((criterion) => output.toLowerCase().includes(criterion.toLowerCase())).length / criteria.length : (output.trim() ? 1 : 0);
    return { score, passed: score >= 0.7, criteria };
  }
}

export class LLMGatewayRouter {
  private readonly gateway = new AIGateway();
  register(provider: ModelProvider): void { this.gateway.register(provider); }
  route(request: ModelRequest): ModelProvider[] { return this.gateway.route(request); }
  complete(request: ModelRequest): Promise<ModelResponse> { return this.gateway.complete(request); }
}

export type ApprovalRequest = { id: string; action: string; sensitive: boolean; amount?: number };
export class HumanInTheLoopProtocol {
  constructor(private readonly approve: (request: ApprovalRequest) => Promise<boolean> = async () => false) {}
  async requireApproval(request: ApprovalRequest): Promise<boolean> {
    return request.sensitive || (request.amount ?? 0) > 0 ? this.approve(request) : true;
  }
}