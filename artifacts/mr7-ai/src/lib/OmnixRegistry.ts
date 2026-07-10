// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX ABSOLUTE REGISTRY — قاموس شامل لكل أمر ممكن في الكون الرقمي للمشروع
//  كل عنصر مسجل بمعرف فريد ونوعه وأوامر التحكم الكاملة
// ═══════════════════════════════════════════════════════════════════════════════

import { NEXUS_TOOL_REGISTRY, type NexusTool, type NexusDispatchers } from "./ToolRegistry";
import { OmnixMemory } from "./OmnixMemory";
import { OmnixBrain } from "./OmnixBrain";

export type OmnixCommandCategory =
  | "modal" | "persona" | "theme" | "model" | "security" | "osint"
  | "ui" | "system" | "chat" | "arsenal" | "window" | "voice"
  | "memory" | "evolution" | "layout" | "font" | "color";

export interface OmnixCommand {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: OmnixCommandCategory;
  aliases?: string[];
  params?: Record<string, { type: string; description: string; required?: boolean; enum?: string[] }>;
  execute: (params: Record<string, unknown>, dispatchers: NexusDispatchers) => OmnixCommandResult;
  fallbacks?: Array<(params: Record<string, unknown>, dispatchers: NexusDispatchers) => OmnixCommandResult>;
  learned?: boolean;
}

export interface OmnixCommandResult {
  actionId: string;
  success: boolean;
  message: string;
  messageAr: string;
  data?: Record<string, unknown>;
}

// ── OMNIX-SPECIFIC COMMANDS (beyond Nexus) ───────────────────────────────────

const OMNIX_EXTRA_COMMANDS: OmnixCommand[] = [
  // ── WINDOW CONTROL ──────────────────────────────────────────────────────────
  {
    id: "close_all_windows",
    name: "Close All Windows",
    nameAr: "إغلاق كل النوافذ",
    description: "Closes all open modal windows",
    descriptionAr: "يغلق جميع النوافذ المفتوحة دفعة واحدة",
    category: "window",
    execute: (_, d) => {
      OmnixBrain.closeAllWindows();
      const modals = d.getModals();
      for (const id of Object.keys(modals)) {
        if (modals[id]) d.closeModal(id);
      }
      return { actionId: "close_all_windows", success: true, message: "All windows closed", messageAr: "تم إغلاق جميع النوافذ" };
    },
  },
  {
    id: "minimize_window",
    name: "Minimize Window",
    nameAr: "تصغير نافذة",
    description: "Minimizes a specific window",
    descriptionAr: "يصغّر نافذة محددة",
    category: "window",
    params: { id: { type: "string", description: "Window ID", required: true } },
    execute: (p, _) => {
      OmnixBrain.minimizeWindow(String(p.id ?? ""));
      return { actionId: "minimize_window", success: true, message: `Window minimized: ${p.id}`, messageAr: `تم تصغير النافذة: ${p.id}` };
    },
  },

  // ── THEME & COLORS ──────────────────────────────────────────────────────────
  {
    id: "set_theme",
    name: "Set Theme",
    nameAr: "تغيير الثيم",
    description: "Changes the application theme",
    descriptionAr: "يغيّر ثيم التطبيق الكامل",
    category: "theme",
    params: {
      themeId: {
        type: "string", description: "Theme ID",
        enum: ["space", "cyberpunk", "hacker", "earth", "dark", "light", "threatAlert", "aurora"],
        required: true,
      },
    },
    execute: (p, d) => {
      d.dispatch({ type: "SET_THEME", themeId: p.themeId });
      OmnixBrain.setTheme({ themeId: String(p.themeId) });
      OmnixMemory.setPreference("lastTheme", p.themeId);
      return { actionId: "set_theme", success: true, message: `Theme set to ${p.themeId}`, messageAr: `تم تغيير الثيم إلى ${p.themeId}` };
    },
  },
  {
    id: "set_accent_color",
    name: "Set Accent Color",
    nameAr: "تغيير لون الإبراز",
    description: "Changes the accent color",
    descriptionAr: "يغيّر لون الإبراز الرئيسي",
    category: "color",
    params: { color: { type: "string", description: "Accent color (hex or name)", required: true } },
    execute: (p, d) => {
      d.dispatch({ type: "SET_ACCENT", color: p.color });
      OmnixBrain.setTheme({ accent: String(p.color) });
      OmnixMemory.setPreference("lastAccent", p.color);
      return { actionId: "set_accent_color", success: true, message: `Accent color: ${p.color}`, messageAr: `لون الإبراز: ${p.color}` };
    },
  },

  // ── MODEL CONTROL ────────────────────────────────────────────────────────────
  {
    id: "set_temperature",
    name: "Set Temperature",
    nameAr: "تعديل درجة الحرارة",
    description: "Sets the AI temperature (0-2)",
    descriptionAr: "يضبط درجة الحرارة للذكاء الاصطناعي",
    category: "model",
    params: { value: { type: "number", description: "Temperature 0.0-2.0", required: true } },
    execute: (p, d) => {
      const val = Number(p.value ?? 0.7);
      d.dispatch({ type: "SET_TEMPERATURE", value: val });
      OmnixBrain.setModelConfig({ temperature: val });
      OmnixMemory.setPreference("temperature", val);
      return { actionId: "set_temperature", success: true, message: `Temperature: ${val}`, messageAr: `درجة الحرارة: ${val}` };
    },
  },
  {
    id: "set_max_tokens",
    name: "Set Max Tokens",
    nameAr: "تعديل حد الرموز",
    description: "Sets the maximum token limit",
    descriptionAr: "يضبط الحد الأقصى لعدد الرموز",
    category: "model",
    params: { value: { type: "number", description: "Max tokens", required: true } },
    execute: (p, d) => {
      const val = Number(p.value ?? 2048);
      d.dispatch({ type: "SET_MAX_TOKENS", value: val });
      OmnixBrain.setModelConfig({ maxTokens: val });
      OmnixMemory.setPreference("maxTokens", val);
      return { actionId: "set_max_tokens", success: true, message: `Max tokens: ${val}`, messageAr: `حد الرموز: ${val}` };
    },
  },
  {
    id: "set_provider",
    name: "Set Provider",
    nameAr: "تغيير مزود الذكاء",
    description: "Switches AI provider",
    descriptionAr: "يغيّر مزود الذكاء الاصطناعي",
    category: "model",
    params: {
      provider: {
        type: "string", description: "Provider ID",
        enum: ["openai", "anthropic", "groq", "openrouter", "gemini", "mistral", "local"],
        required: true,
      },
    },
    execute: (p, d) => {
      d.dispatch({ type: "SET_PROVIDER", provider: p.provider });
      OmnixBrain.setModelConfig({ provider: String(p.provider) });
      OmnixMemory.setPreference("lastProvider", p.provider);
      return { actionId: "set_provider", success: true, message: `Provider: ${p.provider}`, messageAr: `المزود: ${p.provider}` };
    },
  },
  {
    id: "set_model",
    name: "Set Model",
    nameAr: "تغيير النموذج",
    description: "Sets the AI model",
    descriptionAr: "يغيّر نموذج الذكاء الاصطناعي",
    category: "model",
    params: { model: { type: "string", description: "Model name", required: true } },
    execute: (p, d) => {
      d.dispatch({ type: "SET_MODEL", model: p.model });
      OmnixBrain.setModelConfig({ model: String(p.model) });
      OmnixMemory.setPreference("lastModel", p.model);
      return { actionId: "set_model", success: true, message: `Model: ${p.model}`, messageAr: `النموذج: ${p.model}` };
    },
  },
  {
    id: "toggle_streaming",
    name: "Toggle Streaming",
    nameAr: "تبديل البث المباشر",
    description: "Toggles streaming on/off",
    descriptionAr: "يفعّل أو يعطّل البث المباشر",
    category: "model",
    execute: (_, d) => {
      d.dispatch({ type: "TOGGLE_STREAMING" });
      const cur = OmnixBrain.getSnapshot().modelConfig.streaming;
      OmnixBrain.setModelConfig({ streaming: !cur });
      return { actionId: "toggle_streaming", success: true, message: `Streaming: ${!cur}`, messageAr: `البث المباشر: ${!cur ? "مفعّل" : "معطّل"}` };
    },
  },

  // ── UI / LAYOUT ───────────────────────────────────────────────────────────────
  {
    id: "toggle_sidebar",
    name: "Toggle Sidebar",
    nameAr: "إخفاء/إظهار الشريط الجانبي",
    description: "Toggles the sidebar",
    descriptionAr: "يُظهر أو يُخفي الشريط الجانبي",
    category: "ui",
    execute: (_, d) => {
      d.dispatch({ type: "TOGGLE_SIDEBAR" });
      return { actionId: "toggle_sidebar", success: true, message: "Sidebar toggled", messageAr: "تم تبديل الشريط الجانبي" };
    },
  },
  {
    id: "set_language",
    name: "Set Language",
    nameAr: "تغيير اللغة",
    description: "Changes interface language",
    descriptionAr: "يغيّر لغة الواجهة",
    category: "ui",
    params: { lang: { type: "string", description: "Language code", enum: ["ar", "en"], required: true } },
    execute: (p, d) => {
      d.dispatch({ type: "SET_LANGUAGE", lang: p.lang });
      OmnixBrain.patch({ language: String(p.lang) });
      OmnixMemory.setPreference("language", p.lang);
      return { actionId: "set_language", success: true, message: `Language: ${p.lang}`, messageAr: `اللغة: ${p.lang}` };
    },
  },
  {
    id: "new_chat",
    name: "New Chat",
    nameAr: "محادثة جديدة",
    description: "Creates a new chat session",
    descriptionAr: "يفتح محادثة جديدة",
    category: "chat",
    execute: (_, d) => {
      d.dispatch({ type: "NEW_CHAT" });
      return { actionId: "new_chat", success: true, message: "New chat created", messageAr: "تم إنشاء محادثة جديدة" };
    },
  },
  {
    id: "clear_chat",
    name: "Clear Chat",
    nameAr: "مسح المحادثة",
    description: "Clears the current chat",
    descriptionAr: "يمسح المحادثة الحالية",
    category: "chat",
    execute: (_, d) => {
      d.dispatch({ type: "CLEAR_CHAT" });
      return { actionId: "clear_chat", success: true, message: "Chat cleared", messageAr: "تم مسح المحادثة" };
    },
  },

  // ── MEMORY CONTROL ──────────────────────────────────────────────────────────
  {
    id: "clear_omnix_memory",
    name: "Clear OMNIX Memory",
    nameAr: "مسح ذاكرة OMNIX",
    description: "Clears OMNIX action history",
    descriptionAr: "يمسح تاريخ أوامر OMNIX",
    category: "memory",
    execute: (_, d) => {
      OmnixMemory.clearHistory();
      d.toast("تم مسح ذاكرة OMNIX");
      return { actionId: "clear_omnix_memory", success: true, message: "Memory cleared", messageAr: "تم مسح الذاكرة" };
    },
  },

  // ── SYSTEM ──────────────────────────────────────────────────────────────────
  {
    id: "open_omnix_panel",
    name: "Open OMNIX Panel",
    nameAr: "فتح لوحة OMNIX",
    description: "Opens the OMNIX control panel",
    descriptionAr: "يفتح لوحة تحكم OMNIX الكاملة",
    category: "system",
    execute: (_, d) => {
      window.dispatchEvent(new CustomEvent("omnix:open-panel"));
      d.toast("لوحة OMNIX مفتوحة");
      return { actionId: "open_omnix_panel", success: true, message: "OMNIX panel opened", messageAr: "تم فتح لوحة OMNIX" };
    },
  },
  {
    id: "open_omnix_voice",
    name: "Open Voice Control",
    nameAr: "فتح التحكم الصوتي",
    description: "Opens the OMNIX voice interface",
    descriptionAr: "يفتح واجهة الأوامر الصوتية",
    category: "voice",
    execute: (_, d) => {
      window.dispatchEvent(new CustomEvent("omnix:open-voice"));
      d.toast("واجهة الأوامر الصوتية مفتوحة");
      return { actionId: "open_omnix_voice", success: true, message: "Voice interface opened", messageAr: "تم فتح الأوامر الصوتية" };
    },
  },
  {
    id: "fullscreen",
    name: "Toggle Fullscreen",
    nameAr: "تبديل ملء الشاشة",
    description: "Toggles fullscreen mode",
    descriptionAr: "يفعّل أو يعطّل وضع ملء الشاشة",
    category: "ui",
    execute: (_, d) => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => null);
        d.toast("وضع ملء الشاشة مفعّل");
      } else {
        document.exitFullscreen().catch(() => null);
        d.toast("تم الخروج من ملء الشاشة");
      }
      return { actionId: "fullscreen", success: true, message: "Fullscreen toggled", messageAr: "تم تبديل ملء الشاشة" };
    },
  },
];

// ── Merge Nexus + OMNIX commands ──────────────────────────────────────────────

function nexusToOmnix(t: NexusTool): OmnixCommand {
  return {
    id: t.id,
    name: t.name,
    nameAr: t.nameAr,
    description: t.description,
    descriptionAr: t.descriptionAr,
    category: t.category as OmnixCommandCategory,
    params: t.params as OmnixCommand["params"],
    execute: (p, d) => {
      const r = t.execute(p, d);
      return { ...r, messageAr: r.messageAr };
    },
  };
}

export const OMNIX_COMMAND_REGISTRY: OmnixCommand[] = [
  ...NEXUS_TOOL_REGISTRY.map(nexusToOmnix),
  ...OMNIX_EXTRA_COMMANDS,
];

export const OMNIX_REGISTRY_MAP = new Map<string, OmnixCommand>(
  OMNIX_COMMAND_REGISTRY.map((c) => [c.id, c])
);

// ── Register learned commands at runtime ─────────────────────────────────────

export function registerLearnedCommand(cmd: OmnixCommand) {
  if (!OMNIX_REGISTRY_MAP.has(cmd.id)) {
    OMNIX_COMMAND_REGISTRY.push({ ...cmd, learned: true });
    OMNIX_REGISTRY_MAP.set(cmd.id, { ...cmd, learned: true });
    window.dispatchEvent(new CustomEvent("omnix:command-registered", { detail: cmd }));
  }
}

export function buildRegistryContextString(): string {
  const byCategory: Record<string, OmnixCommand[]> = {};
  for (const cmd of OMNIX_COMMAND_REGISTRY) {
    (byCategory[cmd.category] ??= []).push(cmd);
  }

  const lines: string[] = [`⚡ OMNIX REGISTRY — ${OMNIX_COMMAND_REGISTRY.length} أمر متاح:`];
  for (const [cat, cmds] of Object.entries(byCategory)) {
    lines.push(`  [${cat}]: ${cmds.map((c) => c.id).join(", ")}`);
  }
  return lines.join("\n");
}

// ── Natural language command matching ────────────────────────────────────────

const NL_MAP: Record<string, string> = {
  "افتح الترسانة": "open_arsenal",
  "افتح الأدوات": "open_tools_hub",
  "غيّر الثيم": "set_theme",
  "فضائي": "set_theme",
  "هاكر": "set_theme",
  "سايبر بانك": "set_theme",
  "تبديل الشريط": "toggle_sidebar",
  "محادثة جديدة": "new_chat",
  "مسح المحادثة": "clear_chat",
  "ملء الشاشة": "fullscreen",
  "افتح الأوامر الصوتية": "open_omnix_voice",
  "افتح لوحة omnix": "open_omnix_panel",
  "open arsenal": "open_arsenal",
  "open osint": "open_osint_dash",
  "change theme": "set_theme",
  "toggle sidebar": "toggle_sidebar",
  "new chat": "new_chat",
  "clear chat": "clear_chat",
  "fullscreen": "fullscreen",
};

export function matchNaturalLanguage(text: string): OmnixCommand | null {
  const lower = text.toLowerCase().trim();
  for (const [trigger, id] of Object.entries(NL_MAP)) {
    if (lower.includes(trigger.toLowerCase())) {
      return OMNIX_REGISTRY_MAP.get(id) ?? null;
    }
  }
  // Fuzzy: check if the text contains a command id
  for (const cmd of OMNIX_COMMAND_REGISTRY) {
    if (lower.includes(cmd.id.replace(/_/g, " "))) return cmd;
    if (cmd.aliases?.some((a) => lower.includes(a.toLowerCase()))) return cmd;
  }
  return null;
}
