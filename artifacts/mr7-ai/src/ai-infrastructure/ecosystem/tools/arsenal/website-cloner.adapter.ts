/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AI Website Cloner Adapter — Agentic website cloning pipeline
 *  Source: ai-website-cloner-template-master
 *
 *  A multi-step cloning agent: recon → extract design DNA → scaffold → mirror
 *  → audit. Supports asset harvesting, network capture, interaction probing,
 *  route crawling, and OD-preview rewriting.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { JsonValue } from "../../../types";
import type { ToolCall, ToolResult } from "../../types";

// ── Driver ────────────────────────────────────────────────────────────────────
export type WebClonerDriver = {
  recon(url: string): Promise<{ structure: JsonValue; assets: string[]; routes: string[] }>;
  extractDNA(url: string): Promise<{ colors: string[]; fonts: string[]; spacing: JsonValue; layout: JsonValue }>;
  scaffold(dna: JsonValue, outputDir: string): Promise<{ files: string[] }>;
  mirror(url: string, outputDir: string, depth?: number): Promise<{ files: string[]; assetMap: JsonValue }>;
  audit(original: string, cloned: string): Promise<{ score: number; issues: string[]; passed: string[] }>;
  harvestAssets(url: string): Promise<{ assets: Array<{ url: string; type: string; localPath: string }> }>;
};

// ── Clone pipeline step definitions ──────────────────────────────────────────
export const CLONE_PIPELINE_STEPS = [
  { id: "recon",         label: "Recon",          description: "Crawl routes, analyse DOM structure, fingerprint tech stack" },
  { id: "dna-extract",  label: "Design DNA",      description: "Extract colour palette, typography, spacing system, layout grid" },
  { id: "scaffold",     label: "Scaffold",         description: "Generate project structure from DNA" },
  { id: "mirror",       label: "Mirror",           description: "Deep-copy all pages, assets, and interactions" },
  { id: "interaction",  label: "Interaction Probe", description: "Record hover, click, scroll, and animation behaviours" },
  { id: "audit",        label: "Audit",            description: "Visual diff score against original — boolean checks × 12 dimensions" },
] as const;

// ── Tool schemas ──────────────────────────────────────────────────────────────
export const WEBSITE_CLONER_TOOL_SCHEMAS = {
  wc_clone_website: {
    name: "wc_clone_website",
    description:
      "Run the full AI website cloning pipeline on a URL: recon → design DNA extraction → scaffold → mirror → audit. Returns a scored clone bundle.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target website URL to clone" },
        outputDir: { type: "string", description: "Output directory for the clone (default: ./clone-output)" },
        depth: { type: "number", description: "Crawl depth — 1 = homepage only (default: 1)" },
        steps: {
          type: "array",
          items: { type: "string" },
          description: "Pipeline steps to run: recon, dna-extract, scaffold, mirror, interaction, audit (default: all)",
        },
        extractDNA: { type: "boolean", description: "Return structured design DNA in the response" },
      },
      required: ["url"],
    },
  },
  wc_recon_site: {
    name: "wc_recon_site",
    description: "Recon a website: crawl its routes, analyse DOM, fingerprint technologies, and map the information architecture.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target URL" },
      },
      required: ["url"],
    },
  },
  wc_extract_design_dna: {
    name: "wc_extract_design_dna",
    description: "Extract the design DNA from a website — colour palette, typography, spacing system, layout grid — as structured JSON.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target URL" },
      },
      required: ["url"],
    },
  },
  wc_harvest_assets: {
    name: "wc_harvest_assets",
    description: "Harvest all static assets (images, fonts, CSS, JS, video) from a website and return a localised asset map.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target URL" },
        assetTypes: {
          type: "array",
          items: { type: "string" },
          description: "Asset types to harvest: images, fonts, css, js, video (default: all)",
        },
      },
      required: ["url"],
    },
  },
  wc_audit_clone: {
    name: "wc_audit_clone",
    description: "Audit the visual fidelity of a clone against the original. Returns a parity score (0–100) and a list of issues.",
    inputSchema: {
      type: "object",
      properties: {
        originalUrl: { type: "string", description: "URL of the original website" },
        clonedPath: { type: "string", description: "Local path or URL of the cloned version" },
      },
      required: ["originalUrl", "clonedPath"],
    },
  },
} as const;

// ── Adapter class ─────────────────────────────────────────────────────────────
export class WebsiteClonerAdapter {
  constructor(private readonly driver?: WebClonerDriver) {}

  private queued(callId: string, step: string, params: JsonValue): ToolResult {
    return {
      callId, ok: true,
      output: { status: "queued", step, params, message: `Website Cloner: "${step}" queued. Connect a browser driver to execute.` } as unknown as JsonValue,
    };
  }

  async cloneWebsite(call: ToolCall): Promise<ToolResult> {
    const input = call.input as {
      url: string;
      outputDir?: string;
      depth?: number;
      steps?: string[];
      extractDNA?: boolean;
    };
    if (!this.driver) return this.queued(call.id, "clone", input as unknown as JsonValue);

    const results: JsonValue[] = [];
    const steps = input.steps ?? ["recon", "dna-extract", "scaffold", "mirror", "audit"];

    if (steps.includes("recon")) {
      results.push({ step: "recon", ...(await this.driver.recon(input.url)) } as unknown as JsonValue);
    }
    let dna: JsonValue | null = null;
    if (steps.includes("dna-extract")) {
      dna = await this.driver.extractDNA(input.url) as unknown as JsonValue;
      results.push({ step: "dna-extract", dna });
    }
    if (steps.includes("scaffold") && dna) {
      results.push({ step: "scaffold", ...(await this.driver.scaffold(dna, input.outputDir ?? "./clone-output")) } as unknown as JsonValue);
    }
    if (steps.includes("mirror")) {
      results.push({ step: "mirror", ...(await this.driver.mirror(input.url, input.outputDir ?? "./clone-output", input.depth ?? 1)) } as unknown as JsonValue);
    }
    if (steps.includes("audit")) {
      results.push({ step: "audit", ...(await this.driver.audit(input.url, input.outputDir ?? "./clone-output")) } as unknown as JsonValue);
    }
    return { callId: call.id, ok: true, output: results as unknown as JsonValue };
  }

  async reconSite(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { url: string };
    if (!this.driver) return this.queued(call.id, "recon", input as unknown as JsonValue);
    const result = await this.driver.recon(input.url);
    return { callId: call.id, ok: true, output: result as unknown as JsonValue };
  }

  async extractDesignDNA(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { url: string };
    if (!this.driver) return this.queued(call.id, "dna-extract", input as unknown as JsonValue);
    const result = await this.driver.extractDNA(input.url);
    return { callId: call.id, ok: true, output: result as unknown as JsonValue };
  }

  async harvestAssets(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { url: string; assetTypes?: string[] };
    if (!this.driver) return this.queued(call.id, "harvest-assets", input as unknown as JsonValue);
    const result = await this.driver.harvestAssets(input.url);
    return { callId: call.id, ok: true, output: result as unknown as JsonValue };
  }

  async auditClone(call: ToolCall): Promise<ToolResult> {
    const input = call.input as { originalUrl: string; clonedPath: string };
    if (!this.driver) return this.queued(call.id, "audit", input as unknown as JsonValue);
    const result = await this.driver.audit(input.originalUrl, input.clonedPath);
    return { callId: call.id, ok: true, output: result as unknown as JsonValue };
  }

  async invoke(call: ToolCall): Promise<ToolResult> {
    switch (call.name) {
      case "wc_clone_website":       return this.cloneWebsite(call);
      case "wc_recon_site":          return this.reconSite(call);
      case "wc_extract_design_dna":  return this.extractDesignDNA(call);
      case "wc_harvest_assets":      return this.harvestAssets(call);
      case "wc_audit_clone":         return this.auditClone(call);
      default:
        return { callId: call.id, ok: false, output: null, error: `WebsiteClonerAdapter: unknown tool "${call.name}"` };
    }
  }

  static schemas(): JsonValue {
    return Object.values(WEBSITE_CLONER_TOOL_SCHEMAS) as unknown as JsonValue;
  }

  static pipelineSteps(): typeof CLONE_PIPELINE_STEPS {
    return CLONE_PIPELINE_STEPS;
  }
}
