/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Strix Adapter — AI-powered security scanning and vulnerability research
 *  Source: strix-main (https://github.com/strixsecurity/strix)
 *
 *  Strix is an agentic security scanner: it uses LLM agents to perform security
 *  assessments, generates SARIF/PDF reports, and provides a web viewer for
 *  findings. Supports Docker containerization, proxy routing, and custom skills.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { JsonValue } from "../../../types";
import type { ToolCall, ToolResult } from "../../types";

// ── Types mirroring strix's Python models ────────────────────────────────────
export type StrixSeverity = "critical" | "high" | "medium" | "low" | "info";
export type StrixReportFormat = "sarif" | "pdf" | "json" | "markdown";

export interface StrixFinding {
  id: string;
  title: string;
  severity: StrixSeverity;
  description: string;
  recommendation?: string;
  cve?: string;
  cvss?: number;
  location?: string;
  evidence?: string;
}

export interface StrixScanOptions {
  target: string;
  model?: string;
  outputFormat?: StrixReportFormat;
  skills?: string[];
  maxDepth?: number;
  useProxy?: boolean;
  proxyUrl?: string;
  useDocker?: boolean;
  sessionId?: string;
}

export interface StrixScanResult {
  sessionId: string;
  status: "completed" | "running" | "failed";
  target: string;
  findings: StrixFinding[];
  summary: { critical: number; high: number; medium: number; low: number; info: number };
  reportPath?: string;
}

// ── Driver ────────────────────────────────────────────────────────────────────
export type StrixDriver = {
  scan(options: StrixScanOptions): Promise<StrixScanResult>;
  getSession(sessionId: string): Promise<StrixScanResult | null>;
  listSessions(): Promise<Array<{ sessionId: string; target: string; status: string; ts: number }>>;
  generateReport(sessionId: string, format: StrixReportFormat): Promise<{ filePath: string; content?: string }>;
  listSkills(): Promise<string[]>;
  startViewer(port?: number): Promise<{ url: string }>;
};

// ── Built-in skill catalogue (from strix/skills/) ────────────────────────────
export const STRIX_BUILTIN_SKILLS = [
  "web-app-pentest",
  "api-security",
  "network-scan",
  "cloud-misconfiguration",
  "container-security",
  "iac-security",
  "dependency-audit",
  "secrets-scanning",
  "authentication-bypass",
  "injection-testing",
  "xxe-testing",
  "ssrf-testing",
  "idor-testing",
  "business-logic",
  "threat-modeling",
  "stride-analysis",
] as const;

// ── Tool schemas ──────────────────────────────────────────────────────────────
export const STRIX_TOOL_SCHEMAS = {
  strix_scan: {
    name: "strix_scan",
    description:
      "Run a Strix AI security scan against a target (URL, IP, repo path, or container image). Uses LLM agents to autonomously find and report vulnerabilities.",
    inputSchema: {
      type: "object",
      properties: {
        target: { type: "string", description: "Scan target: URL, IP, file path, or container image" },
        model: { type: "string", description: "LLM model for the scanning agent (e.g. gpt-4o, claude-3-5-sonnet-20241022)" },
        outputFormat: { type: "string", enum: ["sarif", "pdf", "json", "markdown"], description: "Report format (default: json)" },
        skills: {
          type: "array",
          items: { type: "string" },
          description: `Strix skills to activate: ${STRIX_BUILTIN_SKILLS.join(", ")}`,
        },
        maxDepth: { type: "number", description: "Maximum crawl/scan depth (default: 3)" },
        useProxy: { type: "boolean", description: "Route traffic through a proxy (e.g. Burp Suite)" },
        proxyUrl: { type: "string", description: "Proxy URL (e.g. http://127.0.0.1:8080)" },
        useDocker: { type: "boolean", description: "Run scan inside a Docker container for isolation" },
        sessionId: { type: "string", description: "Resume an existing session ID" },
      },
      required: ["target"],
    },
  },
  strix_list_sessions: {
    name: "strix_list_sessions",
    description: "List all Strix scan sessions with their status and target.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  strix_get_session: {
    name: "strix_get_session",
    description: "Retrieve the full results of a Strix scan session by ID.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Session ID returned by strix_scan" },
      },
      required: ["sessionId"],
    },
  },
  strix_generate_report: {
    name: "strix_generate_report",
    description: "Generate a formatted security report (SARIF, PDF, JSON, Markdown) for a completed Strix scan session.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string", description: "Session ID to report on" },
        format: { type: "string", enum: ["sarif", "pdf", "json", "markdown"], description: "Output report format" },
      },
      required: ["sessionId", "format"],
    },
  },
  strix_list_skills: {
    name: "strix_list_skills",
    description: "List all built-in and custom Strix security assessment skills.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
  strix_start_viewer: {
    name: "strix_start_viewer",
    description: "Start the Strix web viewer to browse findings interactively in a browser.",
    inputSchema: {
      type: "object",
      properties: {
        port: { type: "number", description: "Port number for the viewer server (default: 8501)" },
      },
      required: [],
    },
  },
} as const;

// ── Adapter class ─────────────────────────────────────────────────────────────
export class StrixAdapter {
  constructor(private readonly driver?: StrixDriver) {}

  private noDriver(callId: string): ToolResult {
    return { callId, ok: false, output: null, error: "StrixAdapter: no subprocess driver configured. Strix requires a Python environment." };
  }

  async scan(call: ToolCall): Promise<ToolResult> {
    const input = call.input as unknown as StrixScanOptions;
    if (!this.driver) {
      return {
        callId: call.id, ok: true,
        output: {
          status: "queued",
          target: input.target,
          model: input.model ?? "claude-3-5-sonnet-20241022",
          skills: input.skills ?? ["web-app-pentest"],
          message: `Strix scan of "${input.target}" queued. Connect a Python driver to execute (pip install strix).`,
          cliEquivalent: `strix scan --target ${input.target}${input.model ? ` --model ${input.model}` : ""}`,
        } as unknown as JsonValue,
      };
    }
    const result = await this.driver.scan(input);
    return { callId: call.id, ok: result.status === "completed", output: result as unknown as JsonValue };
  }

  async listSessions(call: ToolCall): Promise<ToolResult> {
    if (!this.driver) return this.noDriver(call.id);
    const sessions = await this.driver.listSessions();
    return { callId: call.id, ok: true, output: sessions as unknown as JsonValue };
  }

  async getSession(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { sessionId: string };
    if (!this.driver) return this.noDriver(call.id);
    const session = await this.driver.getSession(input.sessionId);
    if (!session) return { callId: call.id, ok: false, output: null, error: `Session "${input.sessionId}" not found.` };
    return { callId: call.id, ok: true, output: session as unknown as JsonValue };
  }

  async generateReport(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { sessionId: string; format: StrixReportFormat };
    if (!this.driver) return this.noDriver(call.id);
    const result = await this.driver.generateReport(input.sessionId, input.format);
    return { callId: call.id, ok: true, output: result as unknown as JsonValue };
  }

  async listSkills(call: ToolCall): Promise<ToolResult> {
    if (this.driver) {
      const skills = await this.driver.listSkills();
      return { callId: call.id, ok: true, output: skills as unknown as JsonValue };
    }
    return { callId: call.id, ok: true, output: [...STRIX_BUILTIN_SKILLS] as unknown as JsonValue };
  }

  async startViewer(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { port?: number };
    if (!this.driver) return this.noDriver(call.id);
    const result = await this.driver.startViewer(input.port ?? 8501);
    return { callId: call.id, ok: true, output: result as unknown as JsonValue };
  }

  async invoke(call: ToolCall): Promise<ToolResult> {
    switch (call.name) {
      case "strix_scan":            return this.scan(call);
      case "strix_list_sessions":   return this.listSessions(call);
      case "strix_get_session":     return this.getSession(call);
      case "strix_generate_report": return this.generateReport(call);
      case "strix_list_skills":     return this.listSkills(call);
      case "strix_start_viewer":    return this.startViewer(call);
      default:
        return { callId: call.id, ok: false, output: null, error: `StrixAdapter: unknown tool "${call.name}"` };
    }
  }

  static schemas(): JsonValue {
    return Object.values(STRIX_TOOL_SCHEMAS) as unknown as JsonValue;
  }
}
