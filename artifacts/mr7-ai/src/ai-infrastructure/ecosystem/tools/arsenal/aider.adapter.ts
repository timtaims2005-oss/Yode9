/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Aider Adapter — AI Pair Programming via aider-chat CLI
 *  Source: aider-main (https://github.com/Aider-AI/aider)
 *
 *  Aider lets an LLM edit files in a local git repo. This adapter wraps the
 *  aider CLI so the orchestrator can invoke it as an agentic tool call.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { JsonValue } from "../../../types";
import type { ToolCall, ToolResult } from "../../types";

// ── Execution driver (injected — keeps adapter browser-safe) ─────────────────
export type SubprocessDriver = {
  exec(cmd: string, args: string[], opts?: { cwd?: string; env?: Record<string, string> }): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }>;
};

// ── Input schemas ─────────────────────────────────────────────────────────────
export interface AiderEditInput {
  message: string;
  files: string[];
  model?: string;
  autoCommit?: boolean;
  cwd?: string;
}

export interface AiderChatInput {
  message: string;
  readonlyFiles?: string[];
  model?: string;
  cwd?: string;
}

export interface AiderRunCommandInput {
  command: string;
  cwd?: string;
}

export type AiderInput = AiderEditInput | AiderChatInput | AiderRunCommandInput;

// ── Tool JSON Schemas (MCP / OpenAPI compatible) ──────────────────────────────
export const AIDER_TOOL_SCHEMAS = {
  aider_edit_files: {
    name: "aider_edit_files",
    description:
      "Use Aider (AI pair programmer) to edit one or more source files based on a natural-language instruction. Aider applies the changes directly and optionally commits them.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Natural-language instruction describing the code change" },
        files: { type: "array", items: { type: "string" }, description: "File paths to edit (relative to cwd)" },
        model: { type: "string", description: "LLM model to use (e.g. gpt-4o, claude-3-5-sonnet-20241022). Defaults to repo config." },
        autoCommit: { type: "boolean", description: "Auto-commit changes after edit (default: true)" },
        cwd: { type: "string", description: "Working directory — the git repo root" },
      },
      required: ["message", "files"],
    },
  },
  aider_chat: {
    name: "aider_chat",
    description:
      "Open an Aider chat session to ask architectural questions or plan changes without directly editing files. Returns the model's response.",
    inputSchema: {
      type: "object",
      properties: {
        message: { type: "string", description: "Question or instruction for the AI" },
        readonlyFiles: { type: "array", items: { type: "string" }, description: "Files to include as read-only context" },
        model: { type: "string", description: "LLM model to use" },
        cwd: { type: "string", description: "Working directory" },
      },
      required: ["message"],
    },
  },
  aider_run_command: {
    name: "aider_run_command",
    description: "Run a shell /command inside an Aider session (e.g. /add, /diff, /git).",
    inputSchema: {
      type: "object",
      properties: {
        command: { type: "string", description: "Aider slash-command string (e.g. '/diff', '/git log -1')" },
        cwd: { type: "string", description: "Working directory" },
      },
      required: ["command"],
    },
  },
} as const;

// ── Adapter class ─────────────────────────────────────────────────────────────
export class AiderAdapter {
  constructor(private readonly subprocess?: SubprocessDriver) {}

  private unavailable(callId: string): ToolResult {
    return { callId, ok: false, output: null, error: "AiderAdapter: no subprocess driver configured (server-side only)." };
  }

  /** Edit files with a natural-language instruction */
  async editFiles(call: ToolCall): Promise<ToolResult> {
    if (!this.subprocess) return this.unavailable(call.id);
    const input = call.input as unknown as AiderEditInput;
    const args: string[] = [
      "--no-check-update",
      "--message", input.message,
      ...(input.model ? ["--model", input.model] : []),
      ...(input.autoCommit === false ? ["--no-auto-commits"] : []),
      "--yes",
      ...input.files,
    ];
    const result = await this.subprocess.exec("aider", args, { cwd: input.cwd });
    return {
      callId: call.id,
      ok: result.exitCode === 0,
      output: { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode },
      error: result.exitCode !== 0 ? result.stderr || "Aider exited with non-zero code" : undefined,
    };
  }

  /** Chat with Aider without editing files */
  async chat(call: ToolCall): Promise<ToolResult> {
    if (!this.subprocess) return this.unavailable(call.id);
    const input = call.input as unknown as AiderChatInput;
    const args: string[] = [
      "--no-check-update",
      "--message", input.message,
      "--no-auto-commits",
      "--dry-run",
      ...(input.model ? ["--model", input.model] : []),
      ...(input.readonlyFiles?.flatMap(f => ["--read", f]) ?? []),
      "--yes",
    ];
    const result = await this.subprocess.exec("aider", args, { cwd: input.cwd });
    return {
      callId: call.id,
      ok: result.exitCode === 0,
      output: { response: result.stdout },
      error: result.exitCode !== 0 ? result.stderr : undefined,
    };
  }

  /** Execute an Aider slash-command */
  async runCommand(call: ToolCall): Promise<ToolResult> {
    if (!this.subprocess) return this.unavailable(call.id);
    const input = call.input as unknown as AiderRunCommandInput;
    const result = await this.subprocess.exec("aider", ["--no-check-update", "--yes", "--message", input.command], {
      cwd: input.cwd,
    });
    return {
      callId: call.id,
      ok: result.exitCode === 0,
      output: { stdout: result.stdout },
      error: result.exitCode !== 0 ? result.stderr : undefined,
    };
  }

  /** Dispatch to the correct operation based on tool name */
  async invoke(call: ToolCall): Promise<ToolResult> {
    switch (call.name) {
      case "aider_edit_files": return this.editFiles(call);
      case "aider_chat": return this.chat(call);
      case "aider_run_command": return this.runCommand(call);
      default:
        return { callId: call.id, ok: false, output: null, error: `AiderAdapter: unknown tool "${call.name}"` };
    }
  }

  /** Return all tool schemas for registry registration */
  static schemas(): JsonValue {
    return Object.values(AIDER_TOOL_SCHEMAS) as unknown as JsonValue;
  }
}
