export type ProtocolTool = {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  execute(input: Record<string, unknown>): Promise<unknown>;
};
export type OpenApiDocument = {
  paths?: Record<string, Record<string, { description?: string; operationId?: string }>>;
};
export type HumanApprovalRequest = {
  id: string;
  action: string;
  reason: string;
  sensitive: boolean;
};
export type HumanApprovalResolver = (request: HumanApprovalRequest) => Promise<boolean>;

export class UniversalProtocolAdapter {
  parseMcpTools(value: { tools?: Array<{ name: string; description?: string; inputSchema?: Record<string, unknown> }> }): ProtocolTool[] {
    return (value.tools ?? []).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      execute: async () => { throw new Error(`MCP transport not attached for ${tool.name}.`); },
    }));
  }

  parseOpenApi(document: OpenApiDocument): ProtocolTool[] {
    return Object.entries(document.paths ?? {}).flatMap(([path, methods]) =>
      Object.entries(methods).map(([method, operation]) => ({
        name: operation.operationId ?? `${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`,
        description: operation.description ?? `${method.toUpperCase()} ${path}`,
        execute: async (input) => ({ protocol: "openapi", method: method.toUpperCase(), path, input }),
      })),
    );
  }
}

export class ExecutionSandbox {
  constructor(private readonly maxAttempts = 3) {}

  async run<T>(operation: (attempt: number) => Promise<T>, correct?: (error: unknown, attempt: number) => Promise<void>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try { return await operation(attempt); } catch (error) {
        lastError = error;
        if (correct) await correct(error, attempt);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

export class HumanAgentInterface {
  constructor(private readonly resolve: HumanApprovalResolver) {}
  async request(action: string, reason: string, sensitive = true): Promise<void> {
    const approved = await this.resolve({ id: `approval-${Date.now()}`, action, reason, sensitive });
    if (!approved) throw new Error("Human approval was denied.");
  }
}
