// ─────────────────────────────────────────────────────────────────────────────
//  NAVIGATION TOOLS — أدوات التحكم في الـ Sidebar والـ TopBar وعناصر الـ UI
//  تُمكّن النموذج من التحكم الكامل في واجهة المستخدم عبر أحداث مخصصة
// ─────────────────────────────────────────────────────────────────────────────

import { registerTool } from "../toolsRegistry";

export function registerNavigationTools(): void {

  // ── وضع المحادثة ──────────────────────────────────────────────────────────
  registerTool({
    moduleId: "set_chat_mode",
    name: "Set Chat Mode",
    description: "تغيير وضع المحادثة الحالي (chat/code/web/reason/council/godmode/debate/hydra/polymorphic/...)",
    category: "navigation",
    inputSchema: {
      type: "object",
      properties: {
        mode: {
          type: "string",
          description: "الوضع المطلوب",
          enum: ["chat","code","web","reason","council","fusion","godmode","debate","hydra","redteam","polymorphic","soceng","vulnrecon","antiforensics","agentic","localllm","orchestrator"],
        },
      },
      required: ["mode"],
    },
    execute: async (input) => {
      const mode = input.mode as string;
      window.dispatchEvent(new CustomEvent("kali:set-mode", { detail: { mode } }));
      return `✅ Chat mode switched to "${mode}".`;
    },
  });

  // ── فتح Arsenal Hub ──────────────────────────────────────────────────────
  registerTool({
    moduleId: "open_arsenal_hub",
    name: "Open Arsenal Hub",
    description: "فتح قائمة Arsenal Hub لاستعراض وتشغيل جميع الموديولز المتاحة",
    category: "navigation",
    inputSchema: {
      type: "object",
      properties: {
        moduleId: { type: "string", description: "معرّف موديول محدد لفتحه مباشرة (اختياري)" },
      },
    },
    execute: async (input) => {
      window.dispatchEvent(new CustomEvent("kali:open-arsenal", { detail: { moduleId: input.moduleId } }));
      return `✅ Arsenal Hub opened${input.moduleId ? ` on module "${input.moduleId}"` : ""}.`;
    },
  });

  // ── حقن نص في حقل الإدخال ────────────────────────────────────────────────
  registerTool({
    moduleId: "inject_prompt",
    name: "Inject Prompt",
    description: "حقن نص أو سؤال في حقل إدخال المحادثة مباشرة (يضع النص لكن لا يرسله)",
    category: "navigation",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "النص المراد حقنه في حقل الإدخال" },
        autoSend: { type: "string", description: "إرسال تلقائي بعد الحقن (true/false)" },
      },
      required: ["prompt"],
    },
    execute: async (input) => {
      window.dispatchEvent(new CustomEvent("kali:inject-prompt", {
        detail: { prompt: input.prompt, autoSend: input.autoSend === "true" },
      }));
      return `✅ Prompt injected: "${String(input.prompt).slice(0, 80)}..."`;
    },
  });

  // ── إيقاف البث ──────────────────────────────────────────────────────────
  registerTool({
    moduleId: "stop_streaming",
    name: "Stop Streaming",
    description: "إيقاف بث الرد الحالي فوراً",
    category: "navigation",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      window.dispatchEvent(new CustomEvent("kali:stop-streaming"));
      return "✅ Streaming stopped.";
    },
  });

  // ── تغيير إعداد ──────────────────────────────────────────────────────────
  registerTool({
    moduleId: "toggle_setting",
    name: "Toggle Setting",
    description: "تفعيل أو تعطيل أي إعداد في النظام (enableTools/webSearch/agentMode/autoTune/...)",
    category: "navigation",
    inputSchema: {
      type: "object",
      properties: {
        setting: {
          type: "string",
          description: "اسم الإعداد",
          enum: ["enableTools", "webSearch", "agentMode", "autoTune", "infiniteContext", "parseltongueCombo", "autoTitle", "showTokenMeter"],
        },
        value: { type: "string", description: "القيمة الجديدة: true/false/toggle" },
      },
      required: ["setting"],
    },
    execute: async (input) => {
      window.dispatchEvent(new CustomEvent("kali:toggle-setting", {
        detail: { setting: input.setting, value: input.value ?? "toggle" },
      }));
      return `✅ Setting "${input.setting}" ${input.value ? `set to ${input.value}` : "toggled"}.`;
    },
  });

  // ── تبديل النموذج ────────────────────────────────────────────────────────
  registerTool({
    moduleId: "switch_model",
    name: "Switch AI Model",
    description: "تغيير نموذج الذكاء الاصطناعي المستخدم حالياً",
    category: "navigation",
    inputSchema: {
      type: "object",
      properties: {
        model: { type: "string", description: "اسم النموذج المطلوب (مثال: claude-3-5-sonnet, gpt-4o)" },
        provider: { type: "string", description: "المزوّد (anthropic/openai/gemini/groq/openrouter/personal)" },
      },
      required: ["model"],
    },
    execute: async (input) => {
      window.dispatchEvent(new CustomEvent("kali:switch-model", {
        detail: { model: input.model, provider: input.provider },
      }));
      return `✅ Switched to model "${input.model}"${input.provider ? ` via ${input.provider}` : ""}.`;
    },
  });

  // ── محادثة جديدة ────────────────────────────────────────────────────────
  registerTool({
    moduleId: "new_chat",
    name: "New Chat",
    description: "بدء محادثة جديدة فارغة",
    category: "navigation",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "عنوان المحادثة الجديدة (اختياري)" },
      },
    },
    execute: async (input) => {
      window.dispatchEvent(new CustomEvent("kali:new-chat", { detail: { title: input.title } }));
      return `✅ New chat started${input.title ? ` titled "${input.title}"` : ""}.`;
    },
  });

  // ── مسح المحادثة ────────────────────────────────────────────────────────
  registerTool({
    moduleId: "clear_chat",
    name: "Clear Chat",
    description: "مسح جميع رسائل المحادثة الحالية",
    category: "navigation",
    confirmRequired: true,
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      window.dispatchEvent(new CustomEvent("kali:clear-chat"));
      return "✅ Chat cleared.";
    },
  });

  // ── تفعيل Council Mode ───────────────────────────────────────────────────
  registerTool({
    moduleId: "activate_council",
    name: "Activate Council Mode",
    description: "تفعيل وضع Council بعدة نماذج تتعاون على إجابة واحدة",
    category: "navigation",
    inputSchema: {
      type: "object",
      properties: {
        mode: { type: "string", description: "نوع Council: auto/manual/all", enum: ["auto", "manual", "all"] },
      },
    },
    execute: async (input) => {
      window.dispatchEvent(new CustomEvent("kali:set-mode", { detail: { mode: "council" } }));
      if (input.mode) {
        window.dispatchEvent(new CustomEvent("kali:council-config", { detail: { mode: input.mode } }));
      }
      return `✅ Council mode activated${input.mode ? ` (${input.mode})` : ""}.`;
    },
  });

  // ── تفعيل Godmode ────────────────────────────────────────────────────────
  registerTool({
    moduleId: "activate_godmode",
    name: "Activate Godmode",
    description: "تفعيل وضع Godmode بعدة نماذج في منافسة لإنتاج أفضل إجابة",
    category: "navigation",
    inputSchema: {
      type: "object",
      properties: {
        champCount: { type: "string", description: "عدد النماذج المتنافسة (2-6)" },
      },
    },
    execute: async () => {
      window.dispatchEvent(new CustomEvent("kali:set-mode", { detail: { mode: "godmode" } }));
      return "✅ Godmode activated.";
    },
  });

  // ── الحصول على حالة الـ UI ────────────────────────────────────────────────
  registerTool({
    moduleId: "get_ui_state",
    name: "Get UI State",
    description: "الحصول على حالة واجهة المستخدم الحالية (الوضع، النموذج، الإعدادات الفعّالة)",
    category: "navigation",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      const state = {
        url: window.location.href,
        title: document.title,
        theme: document.documentElement.className,
        timestamp: new Date().toISOString(),
        settings: {
          enableTools: localStorage.getItem("mr7-enable-tools") === "true",
          language: localStorage.getItem("mr7-language") ?? "ar",
        },
      };
      return JSON.stringify(state, null, 2);
    },
  });

  // ── فتح نافذة منبثقة ───────────────────────────────────────────────────
  registerTool({
    moduleId: "open_modal",
    name: "Open Modal",
    description: "فتح نافذة منبثقة محددة في الواجهة",
    category: "navigation",
    inputSchema: {
      type: "object",
      properties: {
        modalId: {
          type: "string",
          description: "معرّف النافذة",
          enum: ["arsenal", "settings", "share", "voice", "vision", "account", "themes", "council", "godmode", "osint", "malware", "shellgen", "darkweb", "skills"],
        },
      },
      required: ["modalId"],
    },
    execute: async (input) => {
      window.dispatchEvent(new CustomEvent("kali:open-modal", { detail: { modalId: input.modalId } }));
      return `✅ Modal "${input.modalId}" opened.`;
    },
  });

  // ── ضغط السياق ──────────────────────────────────────────────────────────
  registerTool({
    moduleId: "compress_context",
    name: "Compress Context",
    description: "ضغط سياق المحادثة لتوفير مساحة tokens مع الحفاظ على أهم المعلومات",
    category: "navigation",
    inputSchema: {
      type: "object",
      properties: {},
    },
    execute: async () => {
      window.dispatchEvent(new CustomEvent("kali:compress-context"));
      return "✅ Context compression initiated.";
    },
  });

  // ── تفعيل Agent Mode ────────────────────────────────────────────────────
  registerTool({
    moduleId: "toggle_agent_mode",
    name: "Toggle Agent Mode",
    description: "تفعيل أو تعطيل وضع الوكيل المستقل (ReAct loop)",
    category: "navigation",
    inputSchema: {
      type: "object",
      properties: {
        enable: { type: "string", description: "true/false/toggle" },
      },
    },
    execute: async (input) => {
      window.dispatchEvent(new CustomEvent("kali:toggle-setting", {
        detail: { setting: "agentMode", value: input.enable ?? "toggle" },
      }));
      return `✅ Agent mode ${input.enable === "true" ? "enabled" : input.enable === "false" ? "disabled" : "toggled"}.`;
    },
  });

  // ── تفعيل Web Search ────────────────────────────────────────────────────
  registerTool({
    moduleId: "toggle_web_search",
    name: "Toggle Web Search",
    description: "تفعيل أو تعطيل البحث على الويب في الاستجابات",
    category: "navigation",
    inputSchema: {
      type: "object",
      properties: {
        enable: { type: "string", description: "true/false/toggle" },
      },
    },
    execute: async (input) => {
      window.dispatchEvent(new CustomEvent("kali:toggle-setting", {
        detail: { setting: "webSearch", value: input.enable ?? "toggle" },
      }));
      return `✅ Web search ${input.enable === "true" ? "enabled" : "toggled"}.`;
    },
  });

  console.log("[navigationTools] ✅ Registered Navigation & UI tools.");
}
