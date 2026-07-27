/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  Arsenal Tool Registry — Central hub for all external tool adapters
 *
 *  Registers every adapter as an agentic tool the AI Orchestrator can invoke
 *  dynamically. Each tool carries a MCP/OpenAPI-compatible JSON Schema so the
 *  orchestrator can perform function-calling without hand-written wrappers.
 *
 *  Tools integrated:
 *    1. Aider          — AI pair programming (aider-chat CLI)
 *    2. Open Design    — Agent-native design artifact generation
 *    3. Open CoDesign  — Prompt-to-prototype desktop tool
 *    4. Website Cloner — Agentic website cloning pipeline
 *    5. HackingTool    — 300+ categorised offensive-security tools
 *    6. Strix          — AI-powered security scanner with SARIF reporting
 *    7. Awesome Hacking — Curated security resource library (in-memory)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { JsonValue } from "../../../types";
import type { ToolCall, ToolResult } from "../../types";

import { AiderAdapter, AIDER_TOOL_SCHEMAS, type SubprocessDriver } from "./aider.adapter";
import { OpenDesignAdapter, OPEN_DESIGN_TOOL_SCHEMAS, type DesignSkillDriver } from "./open-design.adapter";
import { OpenCodesignAdapter, OPEN_CODESIGN_TOOL_SCHEMAS, type CodesignDriver } from "./open-codesign.adapter";
import { WebsiteClonerAdapter, WEBSITE_CLONER_TOOL_SCHEMAS, type WebClonerDriver } from "./website-cloner.adapter";
import { HackingToolAdapter, HACKINGTOOL_TOOL_SCHEMAS, type HackingToolDriver } from "./hackingtool.adapter";
import { StrixAdapter, STRIX_TOOL_SCHEMAS, type StrixDriver } from "./strix.adapter";
import { AwesomeHackingAdapter, AWESOME_HACKING_TOOL_SCHEMAS } from "./awesome-hacking.adapter";

// ── Tool definition (MCP / OpenAPI compatible) ────────────────────────────────
export interface ArsenalToolDefinition {
  name: string;
  description: string;
  category: ArsenalToolCategory;
  source: string;
  inputSchema: JsonValue;
}

export type ArsenalToolCategory =
  | "ai-coding"
  | "design"
  | "web-cloning"
  | "security-offensive"
  | "security-scanning"
  | "security-resources";

// ── Driver configuration (all optional — adapters degrade gracefully) ─────────
export interface ArsenalRegistryDrivers {
  subprocess?: SubprocessDriver;
  design?: DesignSkillDriver;
  codesign?: CodesignDriver;
  webCloner?: WebClonerDriver;
  hackingTool?: HackingToolDriver;
  strix?: StrixDriver;
}

// ── Raw schema shapes from each module ───────────────────────────────────────
type RawSchemaMap = Record<string, { name: string; description: string; inputSchema: JsonValue }>;

// ── Registry class ────────────────────────────────────────────────────────────
export class ArsenalToolRegistry {
  private readonly tools: Map<string, ArsenalToolDefinition> = new Map();
  private readonly adapters: {
    aider: AiderAdapter;
    openDesign: OpenDesignAdapter;
    openCodesign: OpenCodesignAdapter;
    websiteCloner: WebsiteClonerAdapter;
    hackingTool: HackingToolAdapter;
    strix: StrixAdapter;
    awesomeHacking: AwesomeHackingAdapter;
  };

  constructor(drivers: ArsenalRegistryDrivers = {}) {
    this.adapters = {
      aider:          new AiderAdapter(drivers.subprocess),
      openDesign:     new OpenDesignAdapter(drivers.design),
      openCodesign:   new OpenCodesignAdapter(drivers.codesign),
      websiteCloner:  new WebsiteClonerAdapter(drivers.webCloner),
      hackingTool:    new HackingToolAdapter(drivers.hackingTool),
      strix:          new StrixAdapter(drivers.strix),
      awesomeHacking: new AwesomeHackingAdapter(),
    };

    this._register(AIDER_TOOL_SCHEMAS as unknown as RawSchemaMap,          "ai-coding",          "aider-chat (https://github.com/Aider-AI/aider)");
    this._register(OPEN_DESIGN_TOOL_SCHEMAS as unknown as RawSchemaMap,    "design",             "open-design (https://github.com/OpenCoworkAI/open-design)");
    this._register(OPEN_CODESIGN_TOOL_SCHEMAS as unknown as RawSchemaMap,  "design",             "open-codesign (https://github.com/OpenCoworkAI/open-codesign)");
    this._register(WEBSITE_CLONER_TOOL_SCHEMAS as unknown as RawSchemaMap, "web-cloning",        "ai-website-cloner-template");
    this._register(HACKINGTOOL_TOOL_SCHEMAS as unknown as RawSchemaMap,    "security-offensive", "hackingtool v2.0.0 (https://github.com/Z4nzu/hackingtool)");
    this._register(STRIX_TOOL_SCHEMAS as unknown as RawSchemaMap,          "security-scanning",  "strix (https://github.com/strixsecurity/strix)");
    this._register(AWESOME_HACKING_TOOL_SCHEMAS as unknown as RawSchemaMap,"security-resources", "Awesome-Hacking (https://github.com/Hack-with-Github/Awesome-Hacking)");
  }

  // ── Internal registration helper ───────────────────────────────────────────
  private _register(schemas: RawSchemaMap, category: ArsenalToolCategory, source: string): void {
    for (const schema of Object.values(schemas)) {
      this.tools.set(schema.name, {
        name: schema.name,
        description: schema.description,
        category,
        source,
        inputSchema: schema.inputSchema,
      });
    }
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /** Invoke any registered tool by name */
  async invoke(call: ToolCall): Promise<ToolResult> {
    const def = this.tools.get(call.name);
    if (!def) {
      return { callId: call.id, ok: false, output: null, error: `ArsenalToolRegistry: tool "${call.name}" not registered.` };
    }

    // Route to the correct adapter
    if (call.name.startsWith("aider_"))    return this.adapters.aider.invoke(call);
    if (call.name.startsWith("od_"))       return this.adapters.openDesign.invoke(call);
    if (call.name.startsWith("ocd_"))      return this.adapters.openCodesign.invoke(call);
    if (call.name.startsWith("wc_"))       return this.adapters.websiteCloner.invoke(call);
    if (call.name.startsWith("ht_"))       return this.adapters.hackingTool.invoke(call);
    if (call.name.startsWith("strix_"))    return this.adapters.strix.invoke(call);
    if (call.name.startsWith("ah_"))       return this.adapters.awesomeHacking.invoke(call);

    return { callId: call.id, ok: false, output: null, error: `ArsenalToolRegistry: no adapter matched tool prefix for "${call.name}".` };
  }

  /** Get all registered tool definitions */
  listTools(): ArsenalToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /** Get tools filtered by category */
  listByCategory(category: ArsenalToolCategory): ArsenalToolDefinition[] {
    return this.listTools().filter(t => t.category === category);
  }

  /** Get a single tool definition */
  getTool(name: string): ArsenalToolDefinition | undefined {
    return this.tools.get(name);
  }

  /** Export all tool schemas as a flat JSON array (MCP tools/list format) */
  toMCPToolList(): JsonValue {
    return this.listTools().map(t => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })) as unknown as JsonValue;
  }

  /** Export all tool schemas as an OpenAPI-style components/schemas map */
  toOpenAPISchemas(): Record<string, JsonValue> {
    const schemas: Record<string, JsonValue> = {};
    for (const tool of this.listTools()) {
      schemas[tool.name] = tool.inputSchema;
    }
    return schemas;
  }

  /** Total number of registered tools */
  get size(): number {
    return this.tools.size;
  }

  /** Summary by category */
  summary(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const tool of this.listTools()) {
      out[tool.category] = (out[tool.category] ?? 0) + 1;
    }
    return out;
  }
}

// ── Singleton factory (lazy, driver-less default) ──────────────────────────────
let _defaultRegistry: ArsenalToolRegistry | null = null;

export function getArsenalRegistry(drivers?: ArsenalRegistryDrivers): ArsenalToolRegistry {
  if (drivers || !_defaultRegistry) {
    _defaultRegistry = new ArsenalToolRegistry(drivers);
  }
  return _defaultRegistry;
}

// ── Re-export adapters and schemas for downstream consumers ───────────────────
export {
  AiderAdapter, AIDER_TOOL_SCHEMAS,
  OpenDesignAdapter, OPEN_DESIGN_TOOL_SCHEMAS,
  OpenCodesignAdapter, OPEN_CODESIGN_TOOL_SCHEMAS,
  WebsiteClonerAdapter, WEBSITE_CLONER_TOOL_SCHEMAS,
  HackingToolAdapter, HACKINGTOOL_TOOL_SCHEMAS,
  StrixAdapter, STRIX_TOOL_SCHEMAS,
  AwesomeHackingAdapter, AWESOME_HACKING_TOOL_SCHEMAS,
};

export type {
  SubprocessDriver,
  DesignSkillDriver,
  CodesignDriver,
  WebClonerDriver,
  HackingToolDriver,
  StrixDriver,
};
