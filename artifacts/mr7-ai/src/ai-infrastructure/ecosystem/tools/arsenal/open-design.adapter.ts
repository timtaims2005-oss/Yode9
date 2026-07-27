/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Open Design Adapter — Agent-native design system & artifact generator
 *  Source: open-design-main (https://github.com/OpenCoworkAI/open-design)
 *
 *  Open Design is an open-source Claude Design alternative: composable skills,
 *  brand-grade DESIGN.md systems, web/desktop/mobile prototype generation,
 *  live dashboards, slides, images, video, and HyperFrames motion graphics.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { JsonValue } from "../../../types";
import type { ToolCall, ToolResult } from "../../types";

// ── Execution driver ───────────────────────────────────────────────────────────
export type DesignSkillDriver = {
  invokeSkill(skillName: string, params: Record<string, JsonValue>): Promise<{ artifact: string; format: string; metadata?: JsonValue }>;
  listAvailableSkills(): Promise<string[]>;
};

// ── Static skill catalogue extracted from open-design-main/skills/ ────────────
export const OPEN_DESIGN_SKILLS: Record<string, { description: string; category: string; outputs: string[] }> = {
  "web-clone":             { description: "Clone any website visually — extract design DNA and reproduce as clean HTML/CSS", category: "web", outputs: ["html", "css", "zip"] },
  "ui-skills":             { description: "Generate accessible, production-ready UI components from a prompt", category: "ui", outputs: ["html", "jsx", "vue"] },
  "ui-ux-pro-max":         { description: "Full UI/UX design suite — wireframe → prototype → polished screens", category: "ui", outputs: ["html", "pdf", "pptx"] },
  "slides":                { description: "Generate beautiful, animated slide decks from a topic", category: "presentation", outputs: ["html", "pdf", "pptx"] },
  "pitch-deck":            { description: "Investor-grade pitch deck with data visualisation", category: "presentation", outputs: ["html", "pdf", "pptx"] },
  "dashboard":             { description: "Interactive data dashboard with charts and KPIs", category: "data", outputs: ["html", "pdf"] },
  "landing-page":          { description: "Conversion-optimised landing page from a brief", category: "marketing", outputs: ["html", "zip"] },
  "charts":                { description: "Visualise datasets as publication-quality charts", category: "data", outputs: ["html", "svg", "png"] },
  "infographic":           { description: "Visually rich infographic from structured data", category: "data", outputs: ["html", "png", "pdf"] },
  "venice-image-generate": { description: "AI image generation using Venice AI", category: "media", outputs: ["png", "jpg"] },
  "venice-image-edit":     { description: "Edit or inpaint existing images with AI", category: "media", outputs: ["png", "jpg"] },
  "venice-video":          { description: "AI video generation from text prompt", category: "media", outputs: ["mp4"] },
  "venice-audio-music":    { description: "AI music composition from text description", category: "media", outputs: ["mp3", "wav"] },
  "venice-audio-speech":   { description: "Text-to-speech with voice customisation", category: "media", outputs: ["mp3", "wav"] },
  "threejs":               { description: "Interactive 3D scenes and animations with Three.js", category: "3d", outputs: ["html"] },
  "video-hyperframes":     { description: "Frame-by-frame motion graphics / HyperFrames animation", category: "motion", outputs: ["html", "mp4"] },
  "vfx-text-cursor":       { description: "Visual-effects text cursor animations for presentations", category: "motion", outputs: ["html"] },
  "theme-factory":         { description: "Generate a complete design system / brand theme", category: "branding", outputs: ["css", "json", "md"] },
  "taste-skill":           { description: "Taste-driven design critique and direction alignment", category: "design-ops", outputs: ["md"] },
  "web-artifacts-builder": { description: "Build self-contained web artifact bundles", category: "web", outputs: ["html", "zip"] },
  "video-downloader":      { description: "Download and embed video assets for offline artifacts", category: "media", outputs: ["mp4"] },
  "od-contribute":         { description: "Contribute new skills to the Open Design ecosystem", category: "dev-ops", outputs: ["md"] },
};

// ── Tool schemas ──────────────────────────────────────────────────────────────
export const OPEN_DESIGN_TOOL_SCHEMAS = {
  od_list_skills: {
    name: "od_list_skills",
    description: "List all available Open Design skills with descriptions and supported output formats.",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", description: "Filter by category (web, ui, presentation, data, media, motion, branding)" },
      },
      required: [],
    },
  },
  od_generate_artifact: {
    name: "od_generate_artifact",
    description: "Use an Open Design skill to generate a design artifact (UI, slides, landing page, dashboard, image, video, etc.).",
    inputSchema: {
      type: "object",
      properties: {
        skill: { type: "string", description: "Skill name (e.g. 'slides', 'landing-page', 'web-clone')" },
        prompt: { type: "string", description: "Description of what to generate" },
        outputFormat: { type: "string", description: "Desired output format (html, pdf, pptx, png, mp4, zip)" },
        designSystem: { type: "string", description: "Optional DESIGN.md path or brand theme name" },
        extraParams: { type: "object", description: "Additional skill-specific parameters" },
      },
      required: ["skill", "prompt"],
    },
  },
  od_clone_website: {
    name: "od_clone_website",
    description: "Clone a website — extract its design DNA (colours, fonts, layout, interactions) and reproduce it as clean HTML/CSS.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL of the website to clone" },
        depth: { type: "number", description: "Crawl depth (1 = homepage only, 2+ = follow links)" },
        outputFormat: { type: "string", description: "Output format: html | zip" },
        extractDNA: { type: "boolean", description: "Also extract and return the design DNA as structured data" },
      },
      required: ["url"],
    },
  },
  od_generate_theme: {
    name: "od_generate_theme",
    description: "Generate a complete design system / brand theme (colours, typography, spacing, component tokens) from a brand brief.",
    inputSchema: {
      type: "object",
      properties: {
        brandBrief: { type: "string", description: "Brand description, personality, target audience" },
        baseColor: { type: "string", description: "Primary brand color (hex or color name)" },
        outputFormat: { type: "string", description: "Output format: css | json | md" },
      },
      required: ["brandBrief"],
    },
  },
} as const;

// ── Adapter class ─────────────────────────────────────────────────────────────
export class OpenDesignAdapter {
  constructor(private readonly driver?: DesignSkillDriver) {}

  private unavailable(callId: string): ToolResult {
    return { callId, ok: false, output: null, error: "OpenDesignAdapter: no design skill driver configured." };
  }

  /** List available skills */
  async listSkills(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { category?: string };
    const all = Object.entries(OPEN_DESIGN_SKILLS);
    const filtered = input.category
      ? all.filter(([, meta]) => meta.category === input.category)
      : all;
    return {
      callId: call.id,
      ok: true,
      output: filtered.map(([id, meta]) => ({ id, ...meta })) as unknown as JsonValue,
    };
  }

  /** Generate a design artifact using a named skill */
  async generateArtifact(call: ToolCall): Promise<ToolResult> {
    if (!this.driver) {
      // Fallback: return skill metadata so orchestrator can display intent
      const input = call.input as { skill: string; prompt: string; outputFormat?: string };
      const skill = OPEN_DESIGN_SKILLS[input.skill];
      if (!skill) return { callId: call.id, ok: false, output: null, error: `Open Design: unknown skill "${input.skill}"` };
      return {
        callId: call.id,
        ok: true,
        output: {
          status: "queued",
          skill: input.skill,
          prompt: input.prompt,
          expectedOutputs: skill.outputs,
          message: `Skill "${input.skill}" queued: ${skill.description}`,
        } as unknown as JsonValue,
      };
    }
    const input = call.input as { skill: string; prompt: string; outputFormat?: string; designSystem?: string; extraParams?: Record<string, JsonValue> };
    const result = await this.driver.invokeSkill(input.skill, {
      prompt: input.prompt,
      outputFormat: input.outputFormat ?? "html",
      ...(input.extraParams ?? {}),
    });
    return { callId: call.id, ok: true, output: result as unknown as JsonValue };
  }

  /** Clone a website */
  async cloneWebsite(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { url: string; depth?: number; outputFormat?: string; extractDNA?: boolean };
    if (!this.driver) {
      return {
        callId: call.id, ok: true,
        output: { status: "queued", skill: "web-clone", url: input.url, message: `Web clone of ${input.url} queued.` } as unknown as JsonValue,
      };
    }
    const result = await this.driver.invokeSkill("web-clone", { url: input.url, depth: input.depth ?? 1, extractDNA: input.extractDNA ?? false });
    return { callId: call.id, ok: true, output: result as unknown as JsonValue };
  }

  /** Generate a brand theme */
  async generateTheme(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { brandBrief: string; baseColor?: string; outputFormat?: string };
    if (!this.driver) {
      return {
        callId: call.id, ok: true,
        output: { status: "queued", skill: "theme-factory", brief: input.brandBrief, message: "Theme generation queued." } as unknown as JsonValue,
      };
    }
    const result = await this.driver.invokeSkill("theme-factory", { prompt: input.brandBrief, baseColor: input.baseColor ?? "" });
    return { callId: call.id, ok: true, output: result as unknown as JsonValue };
  }

  async invoke(call: ToolCall): Promise<ToolResult> {
    switch (call.name) {
      case "od_list_skills":      return this.listSkills(call);
      case "od_generate_artifact": return this.generateArtifact(call);
      case "od_clone_website":    return this.cloneWebsite(call);
      case "od_generate_theme":   return this.generateTheme(call);
      default:
        return { callId: call.id, ok: false, output: null, error: `OpenDesignAdapter: unknown tool "${call.name}"` };
    }
  }

  static schemas(): JsonValue {
    return Object.values(OPEN_DESIGN_TOOL_SCHEMAS) as unknown as JsonValue;
  }
}
