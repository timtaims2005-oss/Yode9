import type { JsonValue } from "../../types";
import type { ToolCall, ToolResult } from "../types";

export type SandboxExecutor = { execute(code: string, timeoutMs?: number): Promise<{ stdout: string; stderr: string; exitCode: number }> };
export class CodeInterpreterSandbox {
  constructor(private readonly executor?: SandboxExecutor) {}
  async run(code: string): Promise<ToolResult> {
    if (!this.executor) return { callId: "code", ok: false, output: null, error: "No isolated code executor configured." };
    const result = await this.executor.execute(code, 10_000);
    return { callId: "code", ok: result.exitCode === 0, output: result.stdout, error: result.stderr || undefined };
  }
}

export type BrowserDriver = { navigate(url: string): Promise<string>; extract(selector?: string): Promise<JsonValue> };
export class BrowserAutomationAgent {
  constructor(private readonly driver?: BrowserDriver) {}
  async scrape(url: string, selector?: string): Promise<ToolResult> {
    if (!this.driver) return { callId: "browser", ok: false, output: null, error: "No browser driver configured." };
    await this.driver.navigate(url);
    return { callId: "browser", ok: true, output: await this.driver.extract(selector) };
  }
}

export type GUIController = { click(x: number, y: number): Promise<void>; type(text: string): Promise<void>; press(key: string): Promise<void> };
export class ComputerGUIControl {
  constructor(private readonly controller?: GUIController) {}
  async execute(action: { type: "click" | "type" | "press"; x?: number; y?: number; text?: string; key?: string }): Promise<ToolResult> {
    if (!this.controller) return { callId: "gui", ok: false, output: null, error: "No GUI controller configured." };
    if (action.type === "click") await this.controller.click(action.x ?? 0, action.y ?? 0);
    if (action.type === "type") await this.controller.type(action.text ?? "");
    if (action.type === "press") await this.controller.press(action.key ?? "ENTER");
    return { callId: "gui", ok: true, output: true };
  }
}

export type MCPTransport = { request(method: string, params?: JsonValue): Promise<JsonValue> };
export class ModelContextProtocolConnector {
  constructor(private readonly transport?: MCPTransport) {}
  async listTools(): Promise<JsonValue> { return this.transport ? this.transport.request("tools/list") : []; }
  async call(call: ToolCall): Promise<ToolResult> {
    if (!this.transport) return { callId: call.id, ok: false, output: null, error: "No MCP transport configured." };
    try { return { callId: call.id, ok: true, output: await this.transport.request("tools/call", { name: call.name, arguments: call.input }) }; }
    catch (error) { return { callId: call.id, ok: false, output: null, error: error instanceof Error ? error.message : String(error) }; }
  }
}

export type APIConnector = { request(input: { method: string; url: string; body?: JsonValue }): Promise<JsonValue> };
export type DatabaseConnector = { query(sql: string, params?: JsonValue[]): Promise<JsonValue[]> };
export class APIAndDatabaseConnectors {
  constructor(private readonly api?: APIConnector, private readonly database?: DatabaseConnector) {}
  request(input: { method: string; url: string; body?: JsonValue }): Promise<JsonValue> {
    if (!this.api) return Promise.reject(new Error("No API connector configured."));
    return this.api.request(input);
  }
  query(sql: string, params?: JsonValue[]): Promise<JsonValue[]> {
    if (!this.database) return Promise.reject(new Error("No database connector configured."));
    return this.database.query(sql, params);
  }
}

// ── Arsenal Tool Hub ──────────────────────────────────────────────────────────
// External tool adapters: Aider, Open Design, Open CoDesign, Website Cloner,
// HackingTool, Strix, Awesome Hacking — all registered in ArsenalToolRegistry.
export * from "./arsenal";