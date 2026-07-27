export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type AgentMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type ModelRequest = {
  messages: AgentMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseSchema?: JsonSchema;
  metadata?: Record<string, string>;
};

export type ModelResponse = {
  text: string;
  model: string;
  provider: string;
  usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  finishReason?: string;
};

export type JsonSchema = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JsonSchema;
  enum?: JsonValue[];
  minItems?: number;
  maxItems?: number;
};

export type InfrastructureErrorCode =
  | "GUARDRAIL_BLOCKED"
  | "BUDGET_EXCEEDED"
  | "TIMEOUT"
  | "PROVIDER_UNAVAILABLE"
  | "INVALID_OUTPUT"
  | "EVAL_FAILED";

export class InfrastructureError extends Error {
  constructor(
    message: string,
    public readonly code: InfrastructureErrorCode,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "InfrastructureError";
  }
}
