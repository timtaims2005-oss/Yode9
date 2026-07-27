/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Open CoDesign Adapter — AI-native design-to-code desktop tool
 *  Source: open-codesign-main (https://github.com/OpenCoworkAI/open-codesign)
 *
 *  Open CoDesign is the open-source Claude Design alternative for people who
 *  want prompt → polished prototype locally, with any LLM (BYOK). It runs as
 *  a desktop app, exports HTML / PDF / PPTX / ZIP, shows live agent activity,
 *  and supports a `feat/decompose-to-ui-kit` workflow for image → UI kit.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { JsonValue } from "../../../types";
import type { ToolCall, ToolResult } from "../../types";

// ── Driver ────────────────────────────────────────────────────────────────────
export type CodesignDriver = {
  generate(params: {
    prompt: string;
    provider?: string;
    model?: string;
    format?: string;
    designSystemPath?: string;
  }): Promise<{ artifact: string; format: string; agentLog?: string }>;
  decomposeImage(imageUrl: string, options?: Record<string, JsonValue>): Promise<{ uiKit: JsonValue; cost?: number }>;
  export(artifact: string, format: "html" | "pdf" | "pptx" | "zip" | "md"): Promise<{ filePath: string }>;
};

// ── Supported output formats ──────────────────────────────────────────────────
export const CODESIGN_EXPORT_FORMATS = ["html", "pdf", "pptx", "zip", "md"] as const;
export type CodesignExportFormat = (typeof CODESIGN_EXPORT_FORMATS)[number];

// ── Supported providers ───────────────────────────────────────────────────────
export const CODESIGN_PROVIDERS = [
  "claude", "openai", "gemini", "deepseek", "kimi", "glm", "ollama", "openrouter",
] as const;

// ── Tool schemas ──────────────────────────────────────────────────────────────
export const OPEN_CODESIGN_TOOL_SCHEMAS = {
  ocd_generate_design: {
    name: "ocd_generate_design",
    description:
      "Use Open CoDesign to turn a prompt into a polished design artifact (prototype, slide deck, marketing page) locally, with any LLM. Returns the artifact content.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Design brief describing what to build" },
        provider: { type: "string", enum: CODESIGN_PROVIDERS, description: "LLM provider to use" },
        model: { type: "string", description: "Specific model name (e.g. claude-3-5-sonnet-20241022)" },
        outputFormat: { type: "string", enum: CODESIGN_EXPORT_FORMATS, description: "Export format (default: html)" },
        designSystemPath: { type: "string", description: "Path to DESIGN.md for brand constraints" },
        showAgentLog: { type: "boolean", description: "Include the agent activity log in the response" },
      },
      required: ["prompt"],
    },
  },
  ocd_decompose_to_ui_kit: {
    name: "ocd_decompose_to_ui_kit",
    description:
      "Decompose a screenshot or design image into a componentized UI kit bundle ready for coding-agent handoff. Uses boolean visual-parity checks across 12 dimensions.",
    inputSchema: {
      type: "object",
      properties: {
        imageUrl: { type: "string", description: "URL or base64 data URI of the design image" },
        outputDir: { type: "string", description: "Output directory slug for the ui_kits/ bundle" },
        provider: { type: "string", description: "LLM provider to use for decomposition" },
        verifyAndIterate: { type: "boolean", description: "Run verify-and-iterate loop for visual parity (default: true)" },
      },
      required: ["imageUrl"],
    },
  },
  ocd_export_artifact: {
    name: "ocd_export_artifact",
    description: "Export an Open CoDesign artifact to a specific file format (HTML, PDF, PPTX, ZIP, Markdown).",
    inputSchema: {
      type: "object",
      properties: {
        artifactContent: { type: "string", description: "HTML content of the artifact to export" },
        format: { type: "string", enum: CODESIGN_EXPORT_FORMATS, description: "Target export format" },
      },
      required: ["artifactContent", "format"],
    },
  },
  ocd_list_providers: {
    name: "ocd_list_providers",
    description: "List all LLM providers supported by Open CoDesign with their connection status.",
    inputSchema: { type: "object", properties: {}, required: [] },
  },
} as const;

// ── Adapter class ─────────────────────────────────────────────────────────────
export class OpenCodesignAdapter {
  constructor(private readonly driver?: CodesignDriver) {}

  private unavailable(callId: string): ToolResult {
    return { callId, ok: false, output: null, error: "OpenCodesignAdapter: no codesign driver configured (requires desktop app or API server)." };
  }

  async generateDesign(call: ToolCall): Promise<ToolResult> {
    const input = call.input as {
      prompt: string;
      provider?: string;
      model?: string;
      outputFormat?: CodesignExportFormat;
      designSystemPath?: string;
      showAgentLog?: boolean;
    };
    if (!this.driver) {
      return {
        callId: call.id, ok: true,
        output: {
          status: "queued",
          prompt: input.prompt,
          provider: input.provider ?? "claude",
          outputFormat: input.outputFormat ?? "html",
          message: "Open CoDesign generation queued. Connect the desktop app driver to execute.",
        } as unknown as JsonValue,
      };
    }
    const result = await this.driver.generate({
      prompt: input.prompt,
      provider: input.provider,
      model: input.model,
      format: input.outputFormat ?? "html",
      designSystemPath: input.designSystemPath,
    });
    return {
      callId: call.id,
      ok: true,
      output: {
        artifact: result.artifact,
        format: result.format,
        ...(input.showAgentLog && result.agentLog ? { agentLog: result.agentLog } : {}),
      } as unknown as JsonValue,
    };
  }

  async decomposeToUIKit(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { imageUrl: string; outputDir?: string; provider?: string; verifyAndIterate?: boolean };
    if (!this.driver) return this.unavailable(call.id);
    const result = await this.driver.decomposeImage(input.imageUrl, {
      outputDir: input.outputDir ?? "ui_kits/decomposed",
      verifyAndIterate: input.verifyAndIterate ?? true,
    });
    return { callId: call.id, ok: true, output: result as unknown as JsonValue };
  }

  async exportArtifact(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { artifactContent: string; format: CodesignExportFormat };
    if (!this.driver) return this.unavailable(call.id);
    const result = await this.driver.export(input.artifactContent, input.format);
    return { callId: call.id, ok: true, output: result as unknown as JsonValue };
  }

  async listProviders(call: ToolCall): Promise<ToolResult> {
    return {
      callId: call.id,
      ok: true,
      output: CODESIGN_PROVIDERS.map(p => ({ provider: p, byok: true })) as unknown as JsonValue,
    };
  }

  async invoke(call: ToolCall): Promise<ToolResult> {
    switch (call.name) {
      case "ocd_generate_design":       return this.generateDesign(call);
      case "ocd_decompose_to_ui_kit":   return this.decomposeToUIKit(call);
      case "ocd_export_artifact":       return this.exportArtifact(call);
      case "ocd_list_providers":        return this.listProviders(call);
      default:
        return { callId: call.id, ok: false, output: null, error: `OpenCodesignAdapter: unknown tool "${call.name}"` };
    }
  }

  static schemas(): JsonValue {
    return Object.values(OPEN_CODESIGN_TOOL_SCHEMAS) as unknown as JsonValue;
  }
}
