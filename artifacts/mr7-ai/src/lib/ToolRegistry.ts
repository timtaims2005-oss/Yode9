// ─────────────────────────────────────────────────────────────────────────────
//  TOOL REGISTRY — سجل شامل لجميع الأوامر الممكنة في المشروع
//  يمتد على AIController.ts ويضيف أوامر متقدمة لنظام NEXUS
// ─────────────────────────────────────────────────────────────────────────────

export interface ToolParam {
  type: "string" | "number" | "boolean";
  description: string;
  required?: boolean;
  enum?: string[];
}

export interface NexusTool {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category:
    | "modal"
    | "persona"
    | "theme"
    | "model"
    | "security"
    | "osint"
    | "ui"
    | "system"
    | "chat"
    | "arsenal";
  params?: Record<string, ToolParam>;
  examples?: string[];
  execute: (params: Record<string, unknown>, dispatchers: NexusDispatchers) => NexusToolResult;
}

export interface NexusToolResult {
  actionId: string;
  success: boolean;
  message: string;
  messageAr: string;
  data?: Record<string, unknown>;
}

export interface NexusDispatchers {
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
  toggleModal: (id: string) => void;
  dispatch: (action: { type: string; [k: string]: unknown }) => void;
  getState: () => Record<string, unknown>;
  getModals: () => Record<string, boolean>;
  toast: (msg: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPLETE TOOL LIST
// ─────────────────────────────────────────────────────────────────────────────
export const NEXUS_TOOL_REGISTRY: NexusTool[] = [
  // ── MODALS: Security & Hacking Tools ───────────────────────────────────────
  {
    id: "open_arsenal",
    name: "Open Arsenal Hub",
    nameAr: "فتح ترسانة الأدوات",
    description: "Opens the Arsenal security tools hub",
    descriptionAr: "يفتح مركز أدوات الأمن الترسانة",
    category: "modal",
    execute: (_, d) => { d.openModal("arsenal"); return { actionId: "open_arsenal", success: true, message: "Arsenal Hub opened", messageAr: "تم فتح ترسانة الأدوات" }; },
  },
  {
    id: "open_pentest_lab",
    name: "Open PentestLab Pro",
    nameAr: "فتح PentestLab Pro",
    description: "Opens the professional penetration testing lab",
    descriptionAr: "يفتح مختبر اختبار الاختراق الاحترافي",
    category: "modal",
    execute: (_, d) => { d.openModal("pentestLabPro"); return { actionId: "open_pentest_lab", success: true, message: "PentestLab Pro opened", messageAr: "تم فتح PentestLab Pro" }; },
  },
  {
    id: "open_osint_dash",
    name: "Open OSINT Dashboard",
    nameAr: "فتح لوحة OSINT",
    description: "Opens the OSINT intelligence dashboard",
    descriptionAr: "يفتح لوحة معلومات OSINT",
    category: "osint",
    execute: (_, d) => { d.openModal("osintDash"); return { actionId: "open_osint_dash", success: true, message: "OSINT Dashboard opened", messageAr: "تم فتح لوحة OSINT" }; },
  },
  {
    id: "open_osint_scanner",
    name: "Open OSINT Scanner",
    nameAr: "فتح ماسح OSINT",
    description: "Opens the OSINT scanning tool",
    descriptionAr: "يفتح أداة مسح OSINT",
    category: "osint",
    execute: (_, d) => { d.openModal("osintScanner"); return { actionId: "open_osint_scanner", success: true, message: "OSINT Scanner opened", messageAr: "تم فتح ماسح OSINT" }; },
  },
  {
    id: "open_threat_intel",
    name: "Open Threat Intelligence",
    nameAr: "فتح استخبارات التهديدات",
    description: "Opens the threat intelligence panel",
    descriptionAr: "يفتح لوحة استخبارات التهديدات",
    category: "security",
    execute: (_, d) => { d.openModal("threatIntel"); return { actionId: "open_threat_intel", success: true, message: "Threat Intel opened", messageAr: "تم فتح استخبارات التهديدات" }; },
  },
  {
    id: "open_malware_arsenal",
    name: "Open Malware Arsenal",
    nameAr: "فتح ترسانة البرمجيات الخبيثة",
    description: "Opens the malware analysis and research tool",
    descriptionAr: "يفتح أداة تحليل البرمجيات الخبيثة",
    category: "security",
    execute: (_, d) => { d.openModal("malwareArsenal"); return { actionId: "open_malware_arsenal", success: true, message: "Malware Arsenal opened", messageAr: "تم فتح ترسانة البرمجيات الخبيثة" }; },
  },
  {
    id: "open_exploit_sandbox",
    name: "Open Exploit Sandbox",
    nameAr: "فتح بيئة اختبار الثغرات",
    description: "Opens the exploit development sandbox",
    descriptionAr: "يفتح بيئة تطوير الثغرات",
    category: "security",
    execute: (_, d) => { d.openModal("exploitSandbox"); return { actionId: "open_exploit_sandbox", success: true, message: "Exploit Sandbox opened", messageAr: "تم فتح بيئة اختبار الثغرات" }; },
  },
  {
    id: "open_war_room",
    name: "Open War Room",
    nameAr: "فتح غرفة الحرب",
    description: "Opens the cyber war room command center",
    descriptionAr: "يفتح مركز قيادة غرفة الحرب الإلكترونية",
    category: "security",
    execute: (_, d) => { d.openModal("warRoom"); return { actionId: "open_war_room", success: true, message: "War Room opened", messageAr: "تم فتح غرفة الحرب" }; },
  },
  {
    id: "open_red_team",
    name: "Open Red Team Dashboard",
    nameAr: "فتح لوحة Red Team",
    description: "Opens the red team operations dashboard",
    descriptionAr: "يفتح لوحة عمليات الفريق الأحمر",
    category: "security",
    execute: (_, d) => { d.openModal("redTeamDash"); return { actionId: "open_red_team", success: true, message: "Red Team Dashboard opened", messageAr: "تم فتح لوحة Red Team" }; },
  },
  {
    id: "open_ai_terminal",
    name: "Open AI Terminal",
    nameAr: "فتح AI Terminal",
    description: "Opens the AI-powered terminal",
    descriptionAr: "يفتح الطرفية المدعومة بالذكاء الاصطناعي",
    category: "security",
    execute: (_, d) => { d.openModal("aiTerminal"); return { actionId: "open_ai_terminal", success: true, message: "AI Terminal opened", messageAr: "تم فتح AI Terminal" }; },
  },
  {
    id: "open_neural_matrix",
    name: "Open Neural Matrix",
    nameAr: "فتح المصفوفة العصبية",
    description: "Opens the neural matrix visualization",
    descriptionAr: "يفتح تصور المصفوفة العصبية",
    category: "security",
    execute: (_, d) => { d.openModal("neuralMatrix"); return { actionId: "open_neural_matrix", success: true, message: "Neural Matrix opened", messageAr: "تم فتح المصفوفة العصبية" }; },
  },
  {
    id: "open_hacking_tool",
    name: "Open Hacking Tool",
    nameAr: "فتح أدوات الاختراق",
    description: "Opens the hacking tools panel",
    descriptionAr: "يفتح لوحة أدوات الاختراق",
    category: "security",
    execute: (_, d) => { d.openModal("hackingTool"); return { actionId: "open_hacking_tool", success: true, message: "Hacking Tool opened", messageAr: "تم فتح أدوات الاختراق" }; },
  },
  {
    id: "open_jarvis",
    name: "Open JARVIS Command Center",
    nameAr: "فتح مركز قيادة JARVIS",
    description: "Opens the JARVIS AI command center",
    descriptionAr: "يفتح مركز قيادة JARVIS",
    category: "security",
    execute: (_, d) => { d.openModal("jarvisCommandCenter"); return { actionId: "open_jarvis", success: true, message: "JARVIS opened", messageAr: "تم فتح JARVIS" }; },
  },
  {
    id: "open_omega_agent",
    name: "Open Omega Agent",
    nameAr: "فتح Omega Agent",
    description: "Opens the Omega autonomous agent",
    descriptionAr: "يفتح العميل المستقل Omega",
    category: "security",
    execute: (_, d) => { d.openModal("omegaAgent"); return { actionId: "open_omega_agent", success: true, message: "Omega Agent opened", messageAr: "تم فتح Omega Agent" }; },
  },
  {
    id: "open_cyber_vision",
    name: "Open CyberVision",
    nameAr: "فتح CyberVision",
    description: "Opens the cyber vision analysis tool",
    descriptionAr: "يفتح أداة CyberVision",
    category: "security",
    execute: (_, d) => { d.openModal("cyberVision"); return { actionId: "open_cyber_vision", success: true, message: "CyberVision opened", messageAr: "تم فتح CyberVision" }; },
  },
  {
    id: "open_autonomous_red_team",
    name: "Open Autonomous Red Team",
    nameAr: "فتح Red Team المستقل",
    description: "Opens the autonomous red team system",
    descriptionAr: "يفتح نظام الفريق الأحمر المستقل",
    category: "security",
    execute: (_, d) => { d.openModal("autonomousRedTeam"); return { actionId: "open_autonomous_red_team", success: true, message: "Autonomous Red Team opened", messageAr: "تم فتح Red Team المستقل" }; },
  },
  {
    id: "open_vuln_graph",
    name: "Open Vulnerability Graph 3D",
    nameAr: "فتح رسم بياني الثغرات 3D",
    description: "Opens the 3D vulnerability graph visualization",
    descriptionAr: "يفتح تصور رسم بياني الثغرات ثلاثي الأبعاد",
    category: "security",
    execute: (_, d) => { d.openModal("vulnGraph3D"); return { actionId: "open_vuln_graph", success: true, message: "Vuln Graph 3D opened", messageAr: "تم فتح رسم بياني الثغرات 3D" }; },
  },
  {
    id: "open_threat_globe",
    name: "Open Threat Globe",
    nameAr: "فتح كرة التهديدات",
    description: "Opens the global threat visualization globe",
    descriptionAr: "يفتح كرة التهديدات العالمية",
    category: "security",
    execute: (_, d) => { d.openModal("threatGlobe"); return { actionId: "open_threat_globe", success: true, message: "Threat Globe opened", messageAr: "تم فتح كرة التهديدات" }; },
  },
  {
    id: "open_network_monitor",
    name: "Open Network Monitor",
    nameAr: "فتح مراقب الشبكة",
    description: "Opens the network monitoring dashboard",
    descriptionAr: "يفتح لوحة مراقبة الشبكة",
    category: "security",
    execute: (_, d) => { d.openModal("networkMonitor"); return { actionId: "open_network_monitor", success: true, message: "Network Monitor opened", messageAr: "تم فتح مراقب الشبكة" }; },
  },
  {
    id: "open_cisa_live",
    name: "Open CISA Live Feed",
    nameAr: "فتح بث CISA المباشر",
    description: "Opens the CISA live threat feed",
    descriptionAr: "يفتح بث تهديدات CISA المباشر",
    category: "security",
    execute: (_, d) => { d.openModal("cisaLive"); return { actionId: "open_cisa_live", success: true, message: "CISA Live opened", messageAr: "تم فتح بث CISA المباشر" }; },
  },
  {
    id: "open_exploit_chain",
    name: "Open Exploit Chain",
    nameAr: "فتح سلسلة الثغرات",
    description: "Opens the exploit chain builder",
    descriptionAr: "يفتح منشئ سلسلة الثغرات",
    category: "security",
    execute: (_, d) => { d.openModal("exploitChain"); return { actionId: "open_exploit_chain", success: true, message: "Exploit Chain opened", messageAr: "تم فتح سلسلة الثغرات" }; },
  },
  {
    id: "open_soc_command",
    name: "Open SOC Command",
    nameAr: "فتح قيادة SOC",
    description: "Opens the Security Operations Center command panel",
    descriptionAr: "يفتح لوحة قيادة مركز عمليات الأمن",
    category: "security",
    execute: (_, d) => { d.openModal("socCommand"); return { actionId: "open_soc_command", success: true, message: "SOC Command opened", messageAr: "تم فتح قيادة SOC" }; },
  },
  // ── MODALS: AI Tools ────────────────────────────────────────────────────────
  {
    id: "open_settings",
    name: "Open Settings",
    nameAr: "فتح الإعدادات",
    description: "Opens the main settings panel",
    descriptionAr: "يفتح لوحة الإعدادات الرئيسية",
    category: "ui",
    execute: (_, d) => { d.openModal("settings"); return { actionId: "open_settings", success: true, message: "Settings opened", messageAr: "تم فتح الإعدادات" }; },
  },
  {
    id: "open_provider_settings",
    name: "Open Provider Settings",
    nameAr: "فتح إعدادات المزود",
    description: "Opens AI provider and API key settings",
    descriptionAr: "يفتح إعدادات مزود الذكاء الاصطناعي ومفاتيح API",
    category: "model",
    execute: (_, d) => { d.openModal("providerSettings"); return { actionId: "open_provider_settings", success: true, message: "Provider Settings opened", messageAr: "تم فتح إعدادات المزود" }; },
  },
  {
    id: "open_persona_editor",
    name: "Open Persona Editor",
    nameAr: "فتح محرر الشخصية",
    description: "Opens the AI persona editor",
    descriptionAr: "يفتح محرر شخصية الذكاء الاصطناعي",
    category: "persona",
    execute: (_, d) => { d.openModal("personaEditor"); return { actionId: "open_persona_editor", success: true, message: "Persona Editor opened", messageAr: "تم فتح محرر الشخصية" }; },
  },
  {
    id: "open_persona_manager",
    name: "Open Persona Manager",
    nameAr: "فتح مدير الشخصيات",
    description: "Opens the persona management panel",
    descriptionAr: "يفتح لوحة إدارة الشخصيات",
    category: "persona",
    execute: (_, d) => { d.openModal("personaManager"); return { actionId: "open_persona_manager", success: true, message: "Persona Manager opened", messageAr: "تم فتح مدير الشخصيات" }; },
  },
  {
    id: "open_memory",
    name: "Open Memory Panel",
    nameAr: "فتح لوحة الذاكرة",
    description: "Opens the AI memory management panel",
    descriptionAr: "يفتح لوحة إدارة ذاكرة الذكاء الاصطناعي",
    category: "ui",
    execute: (_, d) => { d.openModal("memory"); return { actionId: "open_memory", success: true, message: "Memory Panel opened", messageAr: "تم فتح لوحة الذاكرة" }; },
  },
  {
    id: "open_agent",
    name: "Open Agent Panel",
    nameAr: "فتح لوحة العميل",
    description: "Opens the AI agent control panel",
    descriptionAr: "يفتح لوحة تحكم العميل الذكي",
    category: "ui",
    execute: (_, d) => { d.openModal("agent"); return { actionId: "open_agent", success: true, message: "Agent Panel opened", messageAr: "تم فتح لوحة العميل" }; },
  },
  {
    id: "open_nexus",
    name: "Open Nexus Agent",
    nameAr: "فتح Nexus Agent",
    description: "Opens the Nexus agent panel",
    descriptionAr: "يفتح لوحة عميل Nexus",
    category: "ui",
    execute: (_, d) => { d.openModal("nexus"); return { actionId: "open_nexus", success: true, message: "Nexus opened", messageAr: "تم فتح Nexus" }; },
  },
  {
    id: "open_analytics",
    name: "Open Analytics",
    nameAr: "فتح التحليلات",
    description: "Opens the analytics dashboard",
    descriptionAr: "يفتح لوحة التحليلات",
    category: "ui",
    execute: (_, d) => { d.openModal("analytics"); return { actionId: "open_analytics", success: true, message: "Analytics opened", messageAr: "تم فتح التحليلات" }; },
  },
  {
    id: "open_local_models",
    name: "Open Local Models",
    nameAr: "فتح النماذج المحلية",
    description: "Opens the local AI model management (Ollama)",
    descriptionAr: "يفتح إدارة النماذج المحلية (Ollama)",
    category: "model",
    execute: (_, d) => { d.openModal("localModel"); return { actionId: "open_local_models", success: true, message: "Local Models opened", messageAr: "تم فتح النماذج المحلية" }; },
  },
  {
    id: "open_tools_hub",
    name: "Open Tools Hub",
    nameAr: "فتح مركز الأدوات",
    description: "Opens the main tools hub",
    descriptionAr: "يفتح مركز الأدوات الرئيسي",
    category: "ui",
    execute: (_, d) => { d.openModal("toolsHub"); return { actionId: "open_tools_hub", success: true, message: "Tools Hub opened", messageAr: "تم فتح مركز الأدوات" }; },
  },
  {
    id: "open_monaco",
    name: "Open Code Editor",
    nameAr: "فتح محرر الكود",
    description: "Opens the Monaco code editor",
    descriptionAr: "يفتح محرر الكود Monaco",
    category: "ui",
    execute: (_, d) => { d.openModal("monaco"); return { actionId: "open_monaco", success: true, message: "Code Editor opened", messageAr: "تم فتح محرر الكود" }; },
  },
  {
    id: "open_deep_search",
    name: "Open Deep Search",
    nameAr: "فتح البحث العميق",
    description: "Opens the deep search panel",
    descriptionAr: "يفتح لوحة البحث العميق",
    category: "ui",
    execute: (_, d) => { d.openModal("deepSearch"); return { actionId: "open_deep_search", success: true, message: "Deep Search opened", messageAr: "تم فتح البحث العميق" }; },
  },
  {
    id: "open_multi_model_race",
    name: "Open Multi-Model Race",
    nameAr: "فتح سباق النماذج",
    description: "Opens the multi-model racing comparison",
    descriptionAr: "يفتح مقارنة سباق النماذج المتعددة",
    category: "model",
    execute: (_, d) => { d.openModal("multiModelRace"); return { actionId: "open_multi_model_race", success: true, message: "Multi-Model Race opened", messageAr: "تم فتح سباق النماذج" }; },
  },
  // ── CLOSE MODALS ────────────────────────────────────────────────────────────
  {
    id: "close_modal",
    name: "Close Window",
    nameAr: "إغلاق نافذة",
    description: "Closes a specific window by ID",
    descriptionAr: "يغلق نافذة محددة بالمعرف",
    category: "modal",
    params: {
      modalId: { type: "string", description: "The modal ID to close", required: true },
    },
    execute: (p, d) => {
      const id = String(p.modalId ?? "");
      d.closeModal(id);
      return { actionId: "close_modal", success: true, message: `Closed ${id}`, messageAr: `تم إغلاق ${id}` };
    },
  },
  {
    id: "toggle_modal",
    name: "Toggle Window",
    nameAr: "تبديل نافذة",
    description: "Toggles a specific window open/closed",
    descriptionAr: "يفتح أو يغلق نافذة محددة",
    category: "modal",
    params: {
      modalId: { type: "string", description: "The modal ID to toggle", required: true },
    },
    execute: (p, d) => {
      const id = String(p.modalId ?? "");
      d.toggleModal(id);
      return { actionId: "toggle_modal", success: true, message: `Toggled ${id}`, messageAr: `تم تبديل ${id}` };
    },
  },
  // ── PERSONA CONTROL ─────────────────────────────────────────────────────────
  {
    id: "set_persona",
    name: "Set Active Persona",
    nameAr: "تعيين الشخصية النشطة",
    description: "Changes the active AI persona preset",
    descriptionAr: "يغير الشخصية النشطة للذكاء الاصطناعي",
    category: "persona",
    params: {
      persona: {
        type: "string",
        description: "Persona ID: default, hacker, researcher, redteam, analyst, ghost, phantom, oracle, nemesis, specter",
        required: true,
        enum: ["default", "hacker", "researcher", "redteam", "analyst", "ghost", "phantom", "oracle", "nemesis", "specter"],
      },
    },
    examples: ["set_persona with persona=hacker", "set_persona with persona=redteam"],
    execute: (p, d) => {
      const persona = String(p.persona ?? "default");
      d.dispatch({ type: "SET_SETTINGS", patch: { activePersonaPreset: persona } });
      d.dispatch({ type: "SET_PERSONA", persona });
      window.dispatchEvent(new CustomEvent("kali:set-persona", { detail: { persona } }));
      return { actionId: "set_persona", success: true, message: `Persona set to ${persona}`, messageAr: `تم تعيين الشخصية إلى ${persona}` };
    },
  },
  {
    id: "set_persona_temperature",
    name: "Set Persona Temperature",
    nameAr: "ضبط حرارة الشخصية",
    description: "Sets the AI response temperature (creativity level)",
    descriptionAr: "يضبط درجة حرارة الاستجابة (مستوى الإبداع)",
    category: "persona",
    params: {
      temperature: { type: "number", description: "Temperature value between 0.0 (precise) and 2.0 (creative)", required: true },
    },
    execute: (p, d) => {
      const temp = Math.min(2.0, Math.max(0.0, Number(p.temperature ?? 0.7)));
      d.dispatch({ type: "SET_SETTINGS", patch: { temperature: temp } });
      return { actionId: "set_persona_temperature", success: true, message: `Temperature set to ${temp}`, messageAr: `تم ضبط درجة الحرارة إلى ${temp}` };
    },
  },
  {
    id: "set_max_tokens",
    name: "Set Max Tokens",
    nameAr: "ضبط الحد الأقصى للرموز",
    description: "Sets the maximum token length for responses",
    descriptionAr: "يضبط الحد الأقصى لطول الاستجابة",
    category: "model",
    params: {
      maxTokens: { type: "number", description: "Max tokens (256–32768)", required: true },
    },
    execute: (p, d) => {
      const mt = Math.min(32768, Math.max(256, Number(p.maxTokens ?? 2048)));
      d.dispatch({ type: "SET_SETTINGS", patch: { maxTokens: mt } });
      return { actionId: "set_max_tokens", success: true, message: `Max tokens set to ${mt}`, messageAr: `تم ضبط الحد الأقصى للرموز إلى ${mt}` };
    },
  },
  // ── MODEL & PROVIDER CONTROL ────────────────────────────────────────────────
  {
    id: "set_provider",
    name: "Set AI Provider",
    nameAr: "تعيين مزود الذكاء الاصطناعي",
    description: "Switches the active AI provider",
    descriptionAr: "يبدل مزود الذكاء الاصطناعي النشط",
    category: "model",
    params: {
      provider: {
        type: "string",
        description: "Provider name: openai, anthropic, groq, openrouter, google, deepseek, personal",
        required: true,
        enum: ["openai", "anthropic", "groq", "openrouter", "google", "deepseek", "personal"],
      },
    },
    execute: (p, d) => {
      const provider = String(p.provider ?? "openai");
      d.dispatch({ type: "SET_PROVIDER", provider });
      window.dispatchEvent(new CustomEvent("kali:set-provider", { detail: { provider } }));
      return { actionId: "set_provider", success: true, message: `Provider switched to ${provider}`, messageAr: `تم التبديل إلى مزود ${provider}` };
    },
  },
  {
    id: "set_model",
    name: "Set AI Model",
    nameAr: "تعيين نموذج الذكاء الاصطناعي",
    description: "Switches the active AI model",
    descriptionAr: "يبدل النموذج النشط للذكاء الاصطناعي",
    category: "model",
    params: {
      model: { type: "string", description: "Model name (e.g. gpt-4o, claude-3-5-sonnet, llama-3.1-70b)", required: true },
    },
    execute: (p, d) => {
      const model = String(p.model ?? "gpt-4o");
      d.dispatch({ type: "SET_MODEL", model });
      window.dispatchEvent(new CustomEvent("kali:set-model", { detail: { model } }));
      return { actionId: "set_model", success: true, message: `Model set to ${model}`, messageAr: `تم تعيين النموذج إلى ${model}` };
    },
  },
  {
    id: "toggle_streaming",
    name: "Toggle Streaming",
    nameAr: "تبديل البث المباشر",
    description: "Enables or disables response streaming",
    descriptionAr: "يفعل أو يعطل البث المباشر للاستجابات",
    category: "model",
    params: {
      enabled: { type: "boolean", description: "true to enable streaming, false to disable" },
    },
    execute: (p, d) => {
      const s = p.enabled !== undefined ? Boolean(p.enabled) : undefined;
      const state = d.getState() as Record<string, unknown>;
      const settings = (state.settings ?? {}) as Record<string, unknown>;
      const next = s ?? !settings.streaming;
      d.dispatch({ type: "SET_SETTINGS", patch: { streaming: next } });
      return { actionId: "toggle_streaming", success: true, message: `Streaming ${next ? "enabled" : "disabled"}`, messageAr: `تم ${next ? "تفعيل" : "تعطيل"} البث المباشر` };
    },
  },
  // ── THEME CONTROL ───────────────────────────────────────────────────────────
  {
    id: "set_theme",
    name: "Set Theme Color",
    nameAr: "تعيين لون الثيم",
    description: "Changes the application accent color theme",
    descriptionAr: "يغير لون الثيم الرئيسي للتطبيق",
    category: "theme",
    params: {
      accent: {
        type: "string",
        description: "Theme accent: green, cyan, purple, red, orange, blue, yellow, pink, white",
        required: true,
        enum: ["green", "cyan", "purple", "red", "orange", "blue", "yellow", "pink", "white"],
      },
    },
    examples: ["set_theme with accent=purple", "set_theme with accent=red"],
    execute: (p, d) => {
      const accent = String(p.accent ?? "green");
      d.dispatch({ type: "SET_THEME_ACCENT", accent });
      window.dispatchEvent(new CustomEvent("kali:set-theme", { detail: { accent } }));
      return { actionId: "set_theme", success: true, message: `Theme set to ${accent}`, messageAr: `تم تعيين الثيم إلى ${accent}` };
    },
  },
  {
    id: "set_globe_theme",
    name: "Set Globe Theme",
    nameAr: "تعيين ثيم الكرة",
    description: "Changes the 3D globe visualization theme",
    descriptionAr: "يغير ثيم التصور ثلاثي الأبعاد للكرة",
    category: "theme",
    params: {
      theme: {
        type: "string",
        description: "Globe theme: cyber, neon, matrix, quantum, stealth, inferno, arctic, solar",
        required: true,
        enum: ["cyber", "neon", "matrix", "quantum", "stealth", "inferno", "arctic", "solar"],
      },
    },
    execute: (p, d) => {
      const theme = String(p.theme ?? "cyber");
      d.dispatch({ type: "SET_GLOBE_THEME", theme });
      window.dispatchEvent(new CustomEvent("kali:set-globe-theme", { detail: { theme } }));
      return { actionId: "set_globe_theme", success: true, message: `Globe theme set to ${theme}`, messageAr: `تم تعيين ثيم الكرة إلى ${theme}` };
    },
  },
  // ── CHAT CONTROL ────────────────────────────────────────────────────────────
  {
    id: "new_chat",
    name: "Start New Chat",
    nameAr: "بدء محادثة جديدة",
    description: "Creates a new empty chat session",
    descriptionAr: "ينشئ جلسة محادثة جديدة فارغة",
    category: "chat",
    execute: (_, d) => {
      d.dispatch({ type: "NEW_CHAT" });
      return { actionId: "new_chat", success: true, message: "New chat started", messageAr: "تم بدء محادثة جديدة" };
    },
  },
  {
    id: "set_chat_mode",
    name: "Set Chat Mode",
    nameAr: "تعيين وضع الدردشة",
    description: "Switches the chat mode",
    descriptionAr: "يبدل وضع الدردشة",
    category: "chat",
    params: {
      mode: {
        type: "string",
        description: "Mode: chat, code, web, reason, council, redteam, agentic, orchestrator",
        required: true,
        enum: ["chat", "code", "web", "reason", "council", "redteam", "agentic", "orchestrator", "polymorphic"],
      },
    },
    execute: (p, _) => {
      const mode = String(p.mode ?? "chat");
      window.dispatchEvent(new CustomEvent("kali:set-mode", { detail: { mode } }));
      return { actionId: "set_chat_mode", success: true, message: `Chat mode set to ${mode}`, messageAr: `تم تعيين وضع الدردشة إلى ${mode}` };
    },
  },
  {
    id: "inject_prompt",
    name: "Inject Prompt",
    nameAr: "حقن موجه",
    description: "Injects a text prompt into the chat input",
    descriptionAr: "يحقن نصاً في مدخل الدردشة",
    category: "chat",
    params: {
      prompt: { type: "string", description: "The text to inject into the input", required: true },
    },
    execute: (p, _) => {
      const prompt = String(p.prompt ?? "");
      window.dispatchEvent(new CustomEvent("kali:inject-prompt", { detail: { prompt } }));
      return { actionId: "inject_prompt", success: true, message: `Prompt injected`, messageAr: `تم حقن الموجه` };
    },
  },
  // ── UI CONTROL ──────────────────────────────────────────────────────────────
  {
    id: "toggle_sidebar",
    name: "Toggle Sidebar",
    nameAr: "تبديل الشريط الجانبي",
    description: "Opens or closes the sidebar",
    descriptionAr: "يفتح أو يغلق الشريط الجانبي",
    category: "ui",
    execute: (_, d) => {
      d.toggleModal("sidebar");
      return { actionId: "toggle_sidebar", success: true, message: "Sidebar toggled", messageAr: "تم تبديل الشريط الجانبي" };
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
    execute: (p, d) => {
      d.toast(String(p.message ?? ""));
      return { actionId: "show_notification", success: true, message: `Notification shown`, messageAr: `تم عرض إشعار` };
    },
  },
  {
    id: "set_custom_instructions",
    name: "Set Custom Instructions",
    nameAr: "تعيين تعليمات مخصصة",
    description: "Sets the AI custom instructions / system prompt",
    descriptionAr: "يعيّن التعليمات المخصصة / موجه النظام للذكاء الاصطناعي",
    category: "system",
    params: {
      instructions: { type: "string", description: "The custom system instructions text", required: true },
    },
    execute: (p, d) => {
      const text = String(p.instructions ?? "");
      d.dispatch({ type: "SET_CUSTOM_INSTRUCTIONS", text });
      return { actionId: "set_custom_instructions", success: true, message: "Custom instructions updated", messageAr: "تم تحديث التعليمات المخصصة" };
    },
  },
  {
    id: "clear_memory",
    name: "Clear Memory",
    nameAr: "مسح الذاكرة",
    description: "Clears the AI conversation memory",
    descriptionAr: "يمسح ذاكرة محادثة الذكاء الاصطناعي",
    category: "system",
    execute: (_, d) => {
      d.dispatch({ type: "CLEAR_MEMORY" });
      return { actionId: "clear_memory", success: true, message: "Memory cleared", messageAr: "تم مسح الذاكرة" };
    },
  },
];

// ── Registry Map for O(1) lookup ─────────────────────────────────────────────
export const NEXUS_REGISTRY_MAP = new Map<string, NexusTool>(
  NEXUS_TOOL_REGISTRY.map((t) => [t.id, t])
);

// ── Category labels ──────────────────────────────────────────────────────────
export const CATEGORY_LABELS: Record<string, string> = {
  modal: "النوافذ",
  persona: "الشخصيات",
  theme: "الثيم",
  model: "النماذج",
  security: "الأمن",
  osint: "OSINT",
  ui: "الواجهة",
  system: "النظام",
  chat: "الدردشة",
  arsenal: "الترسانة",
};
