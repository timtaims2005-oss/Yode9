/**
 * Minimal MCP client/adapter.
 *
 * Supports the MCP JSON-RPC methods needed by the application:
 * initialize, tools/list, tools/call, resources/list, and resources/read.
 * The transport is deliberately injectable so HTTP, SSE, stdio bridges, and
 * local model hosts can use the same client contract.
 */

import { registerTool, type ToolDefinition } from "./toolsRegistry";

export type MCPServerConfig = {
  id: string;
  name?: string;
  endpoint?: string;
  headers?: Record<string, string>;
  protocolVersion?: string;
  transport?: MCPTransport;
};

export type MCPTransport = {
  request<T>(message: MCPRequest): Promise<T>;
  close?: () => Promise<void> | void;
};

export type MCPRequest = {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
};

export type MCPTool = {
  name: string;
  description?: string;
  inputSchema?: {
    type?: "object";
    properties?: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
};

export type MCPResource = {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
};

export type MCPServerState = {
  id: string;
  name: string;
  connected: boolean;
  protocolVersion?: string;
  tools: MCPTool[];
  resources: MCPResource[];
  lastError?: string;
  updatedAt: number;
};

class HttpJsonRpcTransport implements MCPTransport {
  private nextId = 1;

  constructor(
    private readonly endpoint: string,
    private readonly headers: Record<string, string> = {},
  ) {}

  async request<T>(message: MCPRequest): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json", ...this.headers },
      body: JSON.stringify(message),
    });
    if (!response.ok) {
      throw new Error(`MCP HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`);
    }
    const payload = await response.json() as {
      result?: T;
      error?: { code?: number; message?: string; data?: unknown };
    };
    if (payload.error) {
      throw new Error(`MCP ${payload.error.code ?? "error"}: ${payload.error.message ?? "request failed"}`);
    }
    return payload.result as T;
  }

  requestWithId<T>(method: string, params?: Record<string, unknown>): Promise<T> {
    return this.request<T>({ jsonrpc: "2.0", id: this.nextId++, method, params });
  }
}

const states = new Map<string, MCPServerState>();
const transports = new Map<string, MCPTransport>();
const requestCounters = new Map<string, number>();

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 70);
}

function toToolDefinition(server: MCPServerConfig, tool: MCPTool): ToolDefinition {
  const moduleId = `mcp_${safeId(server.id)}_${safeId(tool.name)}`;
  return {
    moduleId,
    name: `${server.name ?? server.id}: ${tool.name}`,
    description: tool.description ?? `MCP tool ${tool.name} from ${server.id}`,
    inputSchema: {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(tool.inputSchema?.properties ?? {}).map(([key, value]) => [
          key,
          { type: value.type, description: value.description ?? key, ...(value.enum ? { enum: value.enum } : {}) },
        ]),
      ),
      required: tool.inputSchema?.required ?? [],
    },
    category: "ai",
    execute: async (input) => {
      const transport = transports.get(server.id);
      if (!transport) throw new Error(`MCP server "${server.id}" is not connected.`);
      const result = await transport.request<unknown>({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: tool.name, arguments: input },
      });
      return result;
    },
  };
}

export async function connectMCPServer(config: MCPServerConfig): Promise<MCPServerState> {
  const transport = config.transport ?? (
    config.endpoint ? new HttpJsonRpcTransport(config.endpoint, config.headers) : undefined
  );
  if (!transport) throw new Error(`MCP server "${config.id}" needs endpoint or transport.`);

  transports.set(config.id, transport);
  requestCounters.set(config.id, 1);
  const nextRequestId = () => {
    const next = requestCounters.get(config.id) ?? 1;
    requestCounters.set(config.id, next + 1);
    return next;
  };
  const request = <T>(method: string, params?: Record<string, unknown>) =>
    transport.request<T>({ jsonrpc: "2.0", id: nextRequestId(), method, params });

  try {
    const init = await request<{ protocolVersion?: string }>("initialize", {
      protocolVersion: config.protocolVersion ?? "2025-03-26",
      capabilities: {},
      clientInfo: { name: "mr7-agent-runtime", version: "1.0.0" },
    });
    // MCP initialization is completed with an initialized notification. The
    // injectable transport may choose to ignore the response for notifications.
    await transport.request({
      jsonrpc: "2.0",
      id: nextRequestId(),
      method: "notifications/initialized",
    }).catch(() => undefined);
    const listed = await request<{ tools?: MCPTool[] }>("tools/list", {});
    const resources = await request<{ resources?: MCPResource[] }>("resources/list", {}).catch(() => ({ resources: [] }));
    const toolList = listed.tools ?? [];
    toolList.forEach((tool) => registerTool(toToolDefinition(config, tool)));
    const state: MCPServerState = {
      id: config.id,
      name: config.name ?? config.id,
      connected: true,
      protocolVersion: init.protocolVersion,
      tools: toolList,
      resources: resources.resources ?? [],
      updatedAt: Date.now(),
    };
    states.set(config.id, state);
    return state;
  } catch (error) {
    const state: MCPServerState = {
      id: config.id,
      name: config.name ?? config.id,
      connected: false,
      tools: [],
      resources: [],
      lastError: error instanceof Error ? error.message : String(error),
      updatedAt: Date.now(),
    };
    states.set(config.id, state);
    transports.delete(config.id);
    throw error;
  }
}

export async function disconnectMCPServer(serverId: string): Promise<void> {
  await transports.get(serverId)?.close?.();
  transports.delete(serverId);
  requestCounters.delete(serverId);
  const state = states.get(serverId);
  if (state) states.set(serverId, { ...state, connected: false, updatedAt: Date.now() });
}

export async function refreshMCPServer(serverId: string): Promise<MCPServerState> {
  const current = states.get(serverId);
  const transport = transports.get(serverId);
  if (!current || !transport) throw new Error(`MCP server "${serverId}" is not connected.`);
  const requestId = requestCounters.get(serverId) ?? 1;
  requestCounters.set(serverId, requestId + 1);
  const result = await transport.request<{ tools?: MCPTool[]; resources?: MCPResource[] }>({
    jsonrpc: "2.0",
    id: requestId,
    method: "tools/list",
    params: {},
  });
  const tools = result.tools ?? [];
  const config: MCPServerConfig = { id: serverId, name: current.name, transport };
  tools.forEach((tool) => registerTool(toToolDefinition(config, tool)));
  const refreshed = {
    ...current,
    tools,
    resources: result.resources ?? current.resources,
    updatedAt: Date.now(),
    lastError: undefined,
  };
  states.set(serverId, refreshed);
  return refreshed;
}

export function getMCPServerStates(): MCPServerState[] {
  return [...states.values()];
}

export function getMCPTools(): MCPTool[] {
  return [...states.values()].flatMap((state) => state.tools);
}

export async function readMCPResource(serverId: string, uri: string): Promise<unknown> {
  const transport = transports.get(serverId);
  if (!transport) throw new Error(`MCP server "${serverId}" is not connected.`);
  return transport.request({
    jsonrpc: "2.0",
    id: Date.now(),
    method: "resources/read",
    params: { uri },
  });
}
