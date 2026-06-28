// ─────────────────────────────────────────────────────────────────────────────
//  AIController — نظام التحكم الكامل بالذكاء الاصطناعي
//  Singleton that exposes a TOOL_REGISTRY and execute pipeline.
//  App.tsx registers its dispatchers via AIController.register().
// ─────────────────────────────────────────────────────────────────────────────
import type { ThemeAccent } from "./store";

// ── Types ────────────────────────────────────────────────────────────────────
export interface AIAction {
  action: string;
  params?: Record<string, unknown>;
}

export interface AIActionResult {
  action: string;
  params?: Record<string, unknown>;
  success: boolean;
  message: string;
}

export interface ToolDef {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: "modal" | "persona" | "theme" | "model" | "security" | "ui";
  params?: Record<string, { type: string; description: string; required?: boolean }>;
  execute: (params: Record<string, unknown>) => AIActionResult;
}

interface Dispatchers {
  openModal:  (id: string) => void;
  closeModal: (id: string) => void;
  toggleModal:(id: string) => void;
  dispatch:   (action: { type: string; [k: string]: unknown }) => void;
  getState:   () => Record<string, unknown>;
  getModals:  () => Record<string, boolean>;
  toast:      (msg: string) => void;
}

// ── Valid modal IDs (mirrors MODAL_IDS in App.tsx) ───────────────────────────
const VALID_MODAL_IDS = new Set([
  "personaEditor","personaManager","localModel","providerSettings","pricing","api","settings","account",
  "tool","shortcuts","palette","toolsHub","memory","bookmarks","search","compare",
  "osintDash","admin","activate","agent","nexus","arsenal","jarvis","parseltongue",
  "rag","teamAgent","skills","openGravity","agentOS","geminiCLI","hermes","graphify",
  "getShitDone","ccswitch","uiuxpro","careerOps","abTop","awesomeLLM","osintScanner",
  "nanoBot","agentKanban","autoBE","superpowers","lerimCLI","claudePrompts","runVSAgent",
  "codexMobile","openACP","handClaw","ralph","burnbaby","crush","rtk","codexBar",
  "codexSaver","agentMemory","decepticon","droidDesk","bugHunter","hyperResearch",
  "aiFactory","gemmaChat","codeGraph","ohMyPi","awesomeOpenCode","openRepLove","dyad",
  "ghostwriter","agentScope","insForge","malwareArsenal","threatIntel","wormGPT",
  "antigravityMgr","axonHub","bigAGI","hackingTool","godMod3","geminiResearch",
  "openAntigravity","paseo","gemmaLib","rogueMaster","passwordAttack","aiHackingSkills",
  "aiTerminal","markXXXIX","markXXXIXOR","freeLLMAPI","nineRouter","feynman","governor",
  "headroom","tokenOptimizer","claudeMemory","qrSync","modelCompare","securityKanban",
  "networkMonitor","defensiveAI","openSkynet","neuralMatrix","shellGenerator","analytics",
  "monaco","warRoom","exploitChain","deepSearch","chainInvestigation","redTeamDash",
  "changelog","useCaseLib","intelligenceCore","threatGlobe","vulnGraph3D","liveCoding",
  "exploitSandbox","gestureControl","neuralVoice","blockchainAudit","e2eSession",
  "autonomousRedTeam","cyberVision","jitExploit","evasionEngine","vulnTopology",
  "precisionStrike","liveCVE","basSimulation","networkTopo","binaryAnalysis","webFuzzing",
  "multiAgentSOC","orchestrationEngine","globalVulnHeatmap","cyberWarfareMatrix",
  "sentientCyberSphere","cisaLive","cveTimeline","cyberHierarchy","cognitiveWarfare",
  "autonomousOffense","attackGraph","artpPlatform","pentestLabPro","socCommand",
  "autonomousDecisionEngine","jarvisCommandCenter","omegaAgent","ollamaHub","localEngineHub",
  "multiModelRace","localBenchmark","localAINexus","authModal","autonomousAgent",
  "chainOfThought","codeScanner","collab","debate","dynamicCouncil","finetune",
  "osintPlatform","pluginMarketplace","accountSettings","analyticsDashboard","apiKeys",
  "collaboration","memorySystem","multiAgent","swarmEvolution","autonomousSwarmSystem",
  "agentProjectGenerator","agentEvolutionDashboard","agentMemoryPanel","monitoring3D",
  "notifications","ragSystem","reportsPage","securityCompliance3D","adminDashboardPage",
  "organizations","pentestLab","marketplace","paymentGateway","finetunePageWin","helpCenter",
  "semanticSearch","contextManagement","rateLimitPage","systemsHub3D","infraMap3D",
  "socialMediaArsenal","aptIntel","sidebar","widgetsDock",
]);

// ── Friendly modal labels ────────────────────────────────────────────────────
const MODAL_LABELS: Record<string, string> = {
  settings: "الإعدادات", personaEditor: "محرر الشخصية", personaManager: "مدير الشخصيات",
  providerSettings: "إعدادات المزود", arsenal: "ترسانة الأدوات", pentestLabPro: "PentestLab Pro",
  osintDash: "لوحة OSINT", aiTerminal: "AI Terminal", warRoom: "غرفة الحرب", redTeamDash: "Red Team",
  toolsHub: "مركز الأدوات", memory: "الذاكرة", agent: "العميل", neuralMatrix: "المصفوفة العصبية",
  exploitSandbox: "Exploit Sandbox", malwareArsenal: "ترسانة البرمجيات", hackingTool: "أدوات الاختراق",
  jarvisCommandCenter: "JARVIS Command Center", omegaAgent: "Omega Agent", nexus: "Nexus",
  cyberVision: "CyberVision", autonomousRedTeam: "Red Team المستقل", vulnGraph3D: "رسم بياني 3D",
  threatGlobe: "كرة التهديدات", analytics: "التحليلات", monaco: "محرر الكود", geminiCLI: "Gemini CLI",
  osintScanner: "ماسح OSINT", search: "البحث", bookmarks: "المفضلة", localModel: "نماذج محلية",
  multiModelRace: "سباق النماذج", localBenchmark: "قياس الأداء",
};

// ── Persona presets ──────────────────────────────────────────────────────────
const PERSONA_PRESETS = [
  { id: "default",    nameAr: "الافتراضي",   name: "Default" },
  { id: "hacker",     nameAr: "الهاكر",       name: "Hacker" },
  { id: "researcher", nameAr: "الباحث",       name: "Researcher" },
  { id: "redteam",    nameAr: "Red Team",     name: "Red Team" },
  { id: "analyst",    nameAr: "المحلل",       name: "Analyst" },
  { id: "ghost",      nameAr: "الشبح",        name: "Ghost" },
  { id: "council",    nameAr: "المجلس",       name: "Council" },
];

// ── Theme accents ─────────────────────────────────────────────────────────────
const THEME_ACCENTS: ThemeAccent[] = ["crimson","midnight","emerald","amber","violet","cyan","rose","lime","orange","slate"];
const GLOBE_THEMES = ["space","cyberpunk","hacker","earth","dark","light","threatAlert","aurora"];

// ── Provider / Model maps ─────────────────────────────────────────────────────
const PROVIDERS = ["openai","anthropic","groq","gemini","openrouter","personal"];
const POPULAR_MODELS = [
  "gpt-4o","gpt-4o-mini","gpt-4-turbo","gpt-3.5-turbo",
  "claude-3-5-sonnet-20241022","claude-3-haiku-20240307","claude-3-opus-20240229",
  "llama-3.1-70b-versatile","llama-3.1-8b-instant","mixtral-8x7b-32768",
  "gemini-1.5-pro","gemini-1.5-flash","gemini-2.0-flash",
];

// ── Singleton state ───────────────────────────────────────────────────────────
let _d: Dispatchers | null = null;
let _enabled = false;
let _lastResults: AIActionResult[] = [];

// ── TOOL REGISTRY ─────────────────────────────────────────────────────────────
export const TOOL_REGISTRY: ToolDef[] = [
  // ── MODAL CONTROLS ─────────────────────────────────────────────────────────
  {
    id: "open_modal",
    name: "Open Panel/Modal",
    nameAr: "فتح نافذة أو لوحة",
    description: "Opens any panel, modal, or tool window in the app",
    descriptionAr: "يفتح أي نافذة أو أداة أو لوحة في التطبيق",
    category: "modal",
    params: {
      id: { type: "string", description: `Modal ID to open. Available: ${[...VALID_MODAL_IDS].slice(0,30).join(", ")} ...`, required: true },
    },
    execute: (p) => {
      const id = String(p.id ?? "");
      if (!VALID_MODAL_IDS.has(id)) return { action: "open_modal", params: p, success: false, message: `معرّف غير معروف: ${id}` };
      _d?.openModal(id);
      return { action: "open_modal", params: p, success: true, message: `تم فتح: ${MODAL_LABELS[id] ?? id}` };
    },
  },
  {
    id: "close_modal",
    name: "Close Panel/Modal",
    nameAr: "إغلاق نافذة أو لوحة",
    description: "Closes any open panel or modal",
    descriptionAr: "يغلق أي نافذة أو لوحة مفتوحة",
    category: "modal",
    params: { id: { type: "string", description: "Modal ID to close", required: true } },
    execute: (p) => {
      const id = String(p.id ?? "");
      _d?.closeModal(id);
      return { action: "close_modal", params: p, success: true, message: `تم إغلاق: ${MODAL_LABELS[id] ?? id}` };
    },
  },
  {
    id: "toggle_modal",
    name: "Toggle Panel/Modal",
    nameAr: "تبديل نافذة أو لوحة",
    description: "Toggles (opens if closed, closes if open) any panel",
    descriptionAr: "يفتح النافذة إذا كانت مغلقة، ويغلقها إذا كانت مفتوحة",
    category: "modal",
    params: { id: { type: "string", description: "Modal ID to toggle", required: true } },
    execute: (p) => {
      const id = String(p.id ?? "");
      _d?.toggleModal(id);
      return { action: "toggle_modal", params: p, success: true, message: `تم تبديل: ${MODAL_LABELS[id] ?? id}` };
    },
  },
  {
    id: "close_all_modals",
    name: "Close All Panels",
    nameAr: "إغلاق كل النوافذ",
    description: "Closes all open modals and panels at once",
    descriptionAr: "يغلق جميع النوافذ والألواح المفتوحة دفعةً واحدة",
    category: "modal",
    execute: () => {
      [...VALID_MODAL_IDS].forEach(id => _d?.closeModal(id));
      return { action: "close_all_modals", success: true, message: "تم إغلاق جميع النوافذ" };
    },
  },

  // ── PERSONA CONTROLS ────────────────────────────────────────────────────────
  {
    id: "set_persona",
    name: "Set AI Persona",
    nameAr: "تغيير شخصية الذكاء الاصطناعي",
    description: "Changes the active AI persona/character",
    descriptionAr: "يغير الشخصية النشطة للذكاء الاصطناعي",
    category: "persona",
    params: {
      preset: { type: "string", description: `Persona preset ID: ${PERSONA_PRESETS.map(p=>p.id).join(", ")}`, required: false },
      customPrompt: { type: "string", description: "Custom system prompt text for the persona", required: false },
    },
    execute: (p) => {
      const preset = String(p.preset ?? "default");
      const customPrompt = typeof p.customPrompt === "string" ? p.customPrompt : undefined;
      const found = PERSONA_PRESETS.find(x => x.id === preset);
      _d?.dispatch({ type: "SET_SETTINGS", patch: {
        activePersonaPreset: preset,
        ...(customPrompt ? { customSystemPrompt: customPrompt } : {}),
      }});
      return { action: "set_persona", params: p, success: true, message: `تم تفعيل شخصية: ${found?.nameAr ?? preset}` };
    },
  },
  {
    id: "clear_persona",
    name: "Clear Persona",
    nameAr: "مسح الشخصية",
    description: "Resets the AI persona to the default",
    descriptionAr: "يعيد الشخصية إلى الوضع الافتراضي",
    category: "persona",
    execute: () => {
      _d?.dispatch({ type: "SET_SETTINGS", patch: { customSystemPrompt: "", activePersonaPreset: "default" } });
      return { action: "clear_persona", success: true, message: "تم مسح الشخصية — العودة للوضع الافتراضي" };
    },
  },
  {
    id: "create_persona",
    name: "Create Custom Persona",
    nameAr: "إنشاء شخصية مخصصة",
    description: "Creates and activates a new persona from a custom system prompt",
    descriptionAr: "ينشئ شخصية جديدة من نص prompt مخصص ويفعّلها فوراً",
    category: "persona",
    params: {
      name: { type: "string", description: "Name of the persona", required: true },
      prompt: { type: "string", description: "System prompt for the persona", required: true },
    },
    execute: (p) => {
      const prompt = String(p.prompt ?? "");
      _d?.dispatch({ type: "SET_SETTINGS", patch: { customSystemPrompt: prompt, activePersonaPreset: "custom" } });
      return { action: "create_persona", params: p, success: true, message: `تم إنشاء وتفعيل شخصية: ${p.name}` };
    },
  },

  // ── THEME CONTROLS ──────────────────────────────────────────────────────────
  {
    id: "set_theme_accent",
    name: "Set Theme Accent Color",
    nameAr: "تغيير لون الثيم",
    description: "Changes the primary accent color of the entire interface",
    descriptionAr: "يغير اللون الرئيسي لكامل الواجهة",
    category: "theme",
    params: {
      accent: { type: "string", description: `Accent color: ${THEME_ACCENTS.join(", ")}`, required: true },
    },
    execute: (p) => {
      const accent = String(p.accent ?? "crimson") as ThemeAccent;
      if (!THEME_ACCENTS.includes(accent)) return { action: "set_theme_accent", params: p, success: false, message: `لون غير صالح. الخيارات: ${THEME_ACCENTS.join(", ")}` };
      _d?.dispatch({ type: "SET_ACCENT", accent });
      return { action: "set_theme_accent", params: p, success: true, message: `تم تغيير لون الثيم إلى: ${accent}` };
    },
  },
  {
    id: "set_globe_theme",
    name: "Set Globe/Visual Theme",
    nameAr: "تغيير ثيم الكرة والمظهر",
    description: "Changes the visual globe theme (space, cyberpunk, hacker, earth, dark, light, threatAlert, aurora)",
    descriptionAr: "يغير ثيم الكرة والمظهر البصري الكامل للتطبيق",
    category: "theme",
    params: {
      theme: { type: "string", description: `Theme ID: ${GLOBE_THEMES.join(", ")}`, required: true },
    },
    execute: (p) => {
      const theme = String(p.theme ?? "space");
      if (!GLOBE_THEMES.includes(theme)) return { action: "set_globe_theme", params: p, success: false, message: `ثيم غير صالح. الخيارات: ${GLOBE_THEMES.join(", ")}` };
      _d?.dispatch({ type: "SET_GLOBE_THEME", theme });
      return { action: "set_globe_theme", params: p, success: true, message: `تم تغيير ثيم الكرة إلى: ${theme}` };
    },
  },

  // ── MODEL & PROVIDER CONTROLS ───────────────────────────────────────────────
  {
    id: "set_model",
    name: "Set AI Model",
    nameAr: "تغيير نموذج الذكاء الاصطناعي",
    description: "Switches the active AI model",
    descriptionAr: "يغير النموذج النشط للذكاء الاصطناعي",
    category: "model",
    params: {
      model: { type: "string", description: `Model name, e.g.: ${POPULAR_MODELS.slice(0,6).join(", ")}`, required: true },
    },
    execute: (p) => {
      const model = String(p.model ?? "");
      _d?.dispatch({ type: "SET_MODEL", model });
      return { action: "set_model", params: p, success: true, message: `تم تغيير النموذج إلى: ${model}` };
    },
  },
  {
    id: "set_provider",
    name: "Set AI Provider",
    nameAr: "تغيير مزود الذكاء الاصطناعي",
    description: "Switches the active AI provider",
    descriptionAr: "يغير مزود الذكاء الاصطناعي النشط",
    category: "model",
    params: {
      provider: { type: "string", description: `Provider: ${PROVIDERS.join(", ")}`, required: true },
      model:    { type: "string", description: "Optional model to activate", required: false },
    },
    execute: (p) => {
      const provider = String(p.provider ?? "");
      const model    = typeof p.model === "string" ? p.model : undefined;
      if (!PROVIDERS.includes(provider)) return { action: "set_provider", params: p, success: false, message: `مزود غير صالح. الخيارات: ${PROVIDERS.join(", ")}` };
      _d?.dispatch({ type: "SET_PROVIDER", provider, providerModel: model ?? "" });
      return { action: "set_provider", params: p, success: true, message: `تم تغيير المزود إلى: ${provider}${model ? ` / ${model}` : ""}` };
    },
  },
  {
    id: "set_temperature",
    name: "Set Temperature",
    nameAr: "تعديل درجة الحرارة",
    description: "Adjusts the AI response randomness/creativity (0.0 = deterministic, 2.0 = very creative)",
    descriptionAr: "يعدل درجة عشوائية الردود (0 = محدد، 2 = إبداعي جداً)",
    category: "model",
    params: {
      value: { type: "number", description: "Temperature value between 0.0 and 2.0", required: true },
    },
    execute: (p) => {
      const val = Math.max(0, Math.min(2, Number(p.value ?? 0.7)));
      _d?.dispatch({ type: "SET_SETTINGS", patch: { temperature: val } });
      return { action: "set_temperature", params: p, success: true, message: `تم تعديل درجة الحرارة إلى: ${val}` };
    },
  },
  {
    id: "set_max_tokens",
    name: "Set Max Tokens",
    nameAr: "تعديل الحد الأقصى للرموز",
    description: "Sets the maximum output token length",
    descriptionAr: "يعدل الحد الأقصى لطول الرد",
    category: "model",
    params: {
      value: { type: "number", description: "Max tokens (256–32000)", required: true },
    },
    execute: (p) => {
      const val = Math.max(256, Math.min(32000, Number(p.value ?? 4096)));
      _d?.dispatch({ type: "SET_SETTINGS", patch: { maxTokens: val } });
      return { action: "set_max_tokens", params: p, success: true, message: `تم تعديل الحد الأقصى للرموز إلى: ${val}` };
    },
  },
  {
    id: "toggle_streaming",
    name: "Toggle Streaming",
    nameAr: "تبديل البث المباشر",
    description: "Enables or disables response streaming",
    descriptionAr: "يفعّل أو يوقف بث الردود مباشرة",
    category: "model",
    params: {
      enabled: { type: "boolean", description: "true to enable, false to disable", required: true },
    },
    execute: (p) => {
      const enabled = Boolean(p.enabled);
      _d?.dispatch({ type: "SET_SETTINGS", patch: { streaming: enabled } });
      return { action: "toggle_streaming", params: p, success: true, message: `البث المباشر: ${enabled ? "مفعّل" : "موقوف"}` };
    },
  },

  // ── SECURITY TOOL SHORTCUTS ─────────────────────────────────────────────────
  {
    id: "launch_pentest",
    name: "Launch Pentest Lab",
    nameAr: "تشغيل مختبر اختبار الاختراق",
    description: "Opens the PentestLab Pro with live terminal",
    descriptionAr: "يفتح مختبر اختبار الاختراق المتقدم مع الـ Terminal المباشر",
    category: "security",
    execute: () => {
      _d?.openModal("pentestLabPro");
      return { action: "launch_pentest", success: true, message: "تم فتح PentestLab Pro" };
    },
  },
  {
    id: "launch_osint",
    name: "Launch OSINT Dashboard",
    nameAr: "تشغيل لوحة OSINT",
    description: "Opens the OSINT intelligence dashboard",
    descriptionAr: "يفتح لوحة استخبارات OSINT",
    category: "security",
    execute: () => {
      _d?.openModal("osintDash");
      return { action: "launch_osint", success: true, message: "تم فتح لوحة OSINT" };
    },
  },
  {
    id: "launch_terminal",
    name: "Launch AI Terminal",
    nameAr: "تشغيل الـ Terminal الذكي",
    description: "Opens the AI-powered shell terminal",
    descriptionAr: "يفتح الـ Terminal الذكي بالذكاء الاصطناعي",
    category: "security",
    execute: () => {
      _d?.openModal("aiTerminal");
      return { action: "launch_terminal", success: true, message: "تم فتح AI Terminal" };
    },
  },
  {
    id: "launch_red_team",
    name: "Launch Red Team Dashboard",
    nameAr: "تشغيل لوحة Red Team",
    description: "Opens the Red Team operations dashboard",
    descriptionAr: "يفتح لوحة عمليات Red Team",
    category: "security",
    execute: () => {
      _d?.openModal("redTeamDash");
      return { action: "launch_red_team", success: true, message: "تم فتح لوحة Red Team" };
    },
  },
  {
    id: "launch_war_room",
    name: "Launch War Room",
    nameAr: "تشغيل غرفة الحرب",
    description: "Opens the Cyber War Room command center",
    descriptionAr: "يفتح مركز قيادة غرفة الحرب السيبرانية",
    category: "security",
    execute: () => {
      _d?.openModal("warRoom");
      return { action: "launch_war_room", success: true, message: "تم فتح غرفة الحرب" };
    },
  },
  {
    id: "launch_exploit_sandbox",
    name: "Launch Exploit Sandbox",
    nameAr: "تشغيل بيئة الاستغلال المعزولة",
    description: "Opens the exploit sandbox environment",
    descriptionAr: "يفتح بيئة الاستغلال المعزولة",
    category: "security",
    execute: () => {
      _d?.openModal("exploitSandbox");
      return { action: "launch_exploit_sandbox", success: true, message: "تم فتح Exploit Sandbox" };
    },
  },
  {
    id: "launch_arsenal",
    name: "Launch Arsenal Hub",
    nameAr: "تشغيل مركز الترسانة",
    description: "Opens the full arsenal/tools hub",
    descriptionAr: "يفتح مركز الترسانة الكاملة",
    category: "security",
    execute: () => {
      _d?.openModal("arsenal");
      return { action: "launch_arsenal", success: true, message: "تم فتح مركز الترسانة" };
    },
  },

  // ── UI CONTROLS ─────────────────────────────────────────────────────────────
  {
    id: "new_chat",
    name: "Start New Chat",
    nameAr: "بدء محادثة جديدة",
    description: "Creates a new empty chat session",
    descriptionAr: "ينشئ جلسة محادثة جديدة فارغة",
    category: "ui",
    execute: () => {
      _d?.dispatch({ type: "NEW_CHAT" });
      return { action: "new_chat", success: true, message: "تم بدء محادثة جديدة" };
    },
  },
  {
    id: "toggle_sidebar",
    name: "Toggle Sidebar",
    nameAr: "تبديل الشريط الجانبي",
    description: "Opens or closes the sidebar",
    descriptionAr: "يفتح أو يغلق الشريط الجانبي",
    category: "ui",
    execute: () => {
      _d?.toggleModal("sidebar");
      return { action: "toggle_sidebar", success: true, message: "تم تبديل الشريط الجانبي" };
    },
  },
  {
    id: "open_settings",
    name: "Open Settings",
    nameAr: "فتح الإعدادات",
    description: "Opens the settings panel",
    descriptionAr: "يفتح لوحة الإعدادات",
    category: "ui",
    execute: () => {
      _d?.openModal("settings");
      return { action: "open_settings", success: true, message: "تم فتح الإعدادات" };
    },
  },
  {
    id: "show_notification",
    name: "Show Notification",
    nameAr: "عرض إشعار",
    description: "Displays a toast notification to the user",
    descriptionAr: "يعرض إشعاراً للمستخدم",
    category: "ui",
    params: {
      message: { type: "string", description: "Notification message text", required: true },
    },
    execute: (p) => {
      _d?.toast(String(p.message ?? ""));
      return { action: "show_notification", params: p, success: true, message: `تم عرض إشعار: ${p.message}` };
    },
  },
  {
    id: "open_memory",
    name: "Open Memory Panel",
    nameAr: "فتح لوحة الذاكرة",
    description: "Opens the AI memory management panel",
    descriptionAr: "يفتح لوحة إدارة ذاكرة الذكاء الاصطناعي",
    category: "ui",
    execute: () => {
      _d?.openModal("memory");
      return { action: "open_memory", success: true, message: "تم فتح لوحة الذاكرة" };
    },
  },
  {
    id: "open_provider_settings",
    name: "Open Provider Settings",
    nameAr: "فتح إعدادات المزود",
    description: "Opens the AI provider and API key settings",
    descriptionAr: "يفتح إعدادات مزود الذكاء الاصطناعي ومفاتيح API",
    category: "ui",
    execute: () => {
      _d?.openModal("providerSettings");
      return { action: "open_provider_settings", success: true, message: "تم فتح إعدادات المزود" };
    },
  },
];

// ── Registry map ─────────────────────────────────────────────────────────────
const REGISTRY_MAP = new Map<string, ToolDef>(TOOL_REGISTRY.map(t => [t.id, t]));

// ── Controller API ────────────────────────────────────────────────────────────
export const AIController = {
  /** Called from App.tsx once to wire up dispatchers */
  register(dispatchers: Dispatchers) {
    _d = dispatchers;
    _enabled = true;
  },

  isEnabled: () => _enabled,

  getLastResults: () => _lastResults,

  /** Execute a single action */
  execute(action: AIAction): AIActionResult {
    const tool = REGISTRY_MAP.get(action.action);
    if (!tool) {
      return { action: action.action, params: action.params, success: false, message: `أمر غير معروف: ${action.action}` };
    }
    if (!_d) {
      return { action: action.action, params: action.params, success: false, message: "AIController غير مُسجَّل بعد" };
    }
    try {
      return tool.execute(action.params ?? {});
    } catch (e) {
      return { action: action.action, params: action.params, success: false, message: `خطأ: ${(e as Error).message}` };
    }
  },

  /** Parse AI response text and execute all embedded actions */
  parseAndExecute(responseText: string): AIActionResult[] {
    const match = responseText.match(/<<<ACTIONS>>>([\s\S]*?)<<<END_ACTIONS>>>/);
    if (!match) return [];
    try {
      const raw = JSON.parse(match[1].trim());
      const actions: AIAction[] = Array.isArray(raw) ? raw : [raw];
      _lastResults = actions.map(a => this.execute(a));
      window.dispatchEvent(new CustomEvent("kali:ai-actions", { detail: _lastResults }));
      return _lastResults;
    } catch {
      return [];
    }
  },

  /** Get current app state snapshot for context */
  getStateSnapshot(): Record<string, unknown> {
    if (!_d) return {};
    const s = _d.getState() as Record<string, unknown>;
    const settings = (s.settings ?? {}) as Record<string, unknown>;
    const modals = _d.getModals();
    const openModals = Object.entries(modals).filter(([,v]) => v).map(([k]) => k);
    return {
      activeProvider: s.activeProvider,
      activeModel: s.activeModel,
      themeAccent: s.themeAccent,
      activeGlobeTheme: s.activeGlobeTheme,
      activePersonaPreset: settings.activePersonaPreset,
      temperature: (settings as Record<string, unknown>).temperature,
      maxTokens: (settings as Record<string, unknown>).maxTokens,
      streaming: (settings as Record<string, unknown>).streaming,
      openModals: openModals.slice(0, 15),
    };
  },

  /** Build the system context block injected into AI prompts */
  buildControllerSystemPrompt(): string {
    if (!_enabled) return "";
    const snapshot = this.getStateSnapshot();
    const toolsList = TOOL_REGISTRY.map(t =>
      `• ${t.id}: ${t.descriptionAr}${t.params ? ` | params: ${JSON.stringify(Object.fromEntries(Object.entries(t.params).map(([k,v])=>[k,v.description])))}` : ""}`
    ).join("\n");

    return `
═══════════════════════════════════════════════════════════
🤖 AI CONTROLLER — صلاحيات التحكم الكامل بالتطبيق
═══════════════════════════════════════════════════════════

لديك صلاحية كاملة للتحكم في هذا التطبيق. عند طلب المستخدم تنفيذ أي إجراء، أضف كتلة JSON في ردك بهذا الشكل الدقيق:

<<<ACTIONS>>>
[
  {"action": "action_id", "params": {...}},
  {"action": "action_id2", "params": {...}}
]
<<<END_ACTIONS>>>

الحالة الحالية للتطبيق:
- المزود النشط: ${snapshot.activeProvider}
- النموذج النشط: ${snapshot.activeModel}
- لون الثيم: ${snapshot.themeAccent}
- ثيم الكرة: ${snapshot.activeGlobeTheme}
- الشخصية النشطة: ${snapshot.activePersonaPreset}
- درجة الحرارة: ${snapshot.temperature}
- الحد الأقصى للرموز: ${snapshot.maxTokens}
- البث المباشر: ${snapshot.streaming}
- النوافذ المفتوحة: ${(snapshot.openModals as string[]).join(", ") || "لا يوجد"}

الأوامر المتاحة:
${toolsList}

ملاحظات هامة:
- يمكنك تنفيذ عدة أوامر في نفس الوقت بوضعها في المصفوفة.
- الأوامر تُنفَّذ تلقائياً فور إرسال ردك.
- أخبر المستخدم دائماً بما ستفعله قبل كتلة الأوامر.
- إذا لم يطلب المستخدم إجراءً لا تضف كتلة الأوامر.
═══════════════════════════════════════════════════════════
`;
  },

  /** Get tools summary for quick reference */
  getToolsSummary(): { category: string; tools: ToolDef[] }[] {
    const cats = new Map<string, ToolDef[]>();
    TOOL_REGISTRY.forEach(t => {
      if (!cats.has(t.category)) cats.set(t.category, []);
      cats.get(t.category)!.push(t);
    });
    return [...cats.entries()].map(([category, tools]) => ({ category, tools }));
  },
};
