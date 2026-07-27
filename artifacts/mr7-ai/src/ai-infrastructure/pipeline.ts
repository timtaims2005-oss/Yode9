import { assertInputAllowed, checkInputGuardrails, checkOutputGuardrails, type GuardrailPolicy } from "./safety/guardrails";
import { TraceRecorder, withTimeout, type ObservabilityConfig, type Trace } from "./observability/tracer";
import { AIGateway, type GatewayPolicy } from "./gateway/gateway";
import { createSchemaValidator } from "./prompts/schema";
import { InfrastructureError, type JsonSchema, type ModelRequest, type ModelResponse } from "./types";

export type InfrastructurePipelineOptions = {
  safety?: GuardrailPolicy;
  observability?: ObservabilityConfig;
  gateway?: GatewayPolicy;
  outputSchema?: JsonSchema;
  timeoutMs?: number;
};

export type InfrastructureResult = { response: ModelResponse; trace: Trace; parsed?: unknown };

export async function executeInfrastructurePipeline(
  request: ModelRequest,
  gateway: AIGateway,
  options: InfrastructurePipelineOptions = {},
): Promise<InfrastructureResult> {
  const userText = request.messages.filter((message) => message.role === "user").map((message) => message.content).join("\n");
  const inputCheck = checkInputGuardrails(userText, options.safety);
  assertInputAllowed(userText, options.safety);
  const sanitizedMessages = request.messages.map((message) =>
    message.role === "user" && inputCheck.text !== userText
      ? { ...message, content: message.content.replace(userText, inputCheck.text) }
      : message,
  );
  const sanitizedRequest = { ...request, messages: sanitizedMessages };
  const trace = new TraceRecorder({ ...options.observability, timeoutMs: options.timeoutMs });
  const modelSpan = trace.startSpan("model.execution", "model");
  try {
    const response = await withTimeout(gateway.complete(sanitizedRequest), options.timeoutMs ?? options.observability?.timeoutMs ?? 60_000);
    trace.recordUsage(response.usage?.inputTokens, response.usage?.outputTokens);
    trace.endSpan(modelSpan);
    const outputCheck = checkOutputGuardrails(response.text, options.safety, options.outputSchema ? createSchemaValidator(options.outputSchema) : undefined);
    if (!outputCheck.allowed) throw new InfrastructureError("Model output failed output guardrails.", "GUARDRAIL_BLOCKED", { findings: outputCheck.findings });
    let parsed: unknown;
    if (options.outputSchema) {
      parsed = JSON.parse(response.text);
      const validation = createSchemaValidator(options.outputSchema).validate(parsed as never);
      if (!validation.valid) throw new InfrastructureError("Model output failed schema validation.", "INVALID_OUTPUT", { errors: validation.errors });
    }
    return { response, parsed, trace: trace.finish("success") };
  } catch (error) {
    trace.endSpan(modelSpan, "error", error);
    trace.finish("error");
    throw error;
  }
}
