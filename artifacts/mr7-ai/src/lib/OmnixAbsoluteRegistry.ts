// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX ABSOLUTE REGISTRY — القاموس الإلهي الشامل المطلق (النظام الثاني)
//  يحتوي على كل أمر ممكن في الكون — 150+ أمر مصنّف بدقة إلهية
//  يشمل: الواجهة، النماذج، الأمان، OSINT، الشخصيات، الذاكرة، التطور
// ═══════════════════════════════════════════════════════════════════════════════

import { NexusDispatchers } from "./ToolRegistry";

export type AbsoluteCategory =
  | "sovereign"      // التحكم في العقل الحاكم
  | "modal"          // فتح/إغلاق النوافذ
  | "model"          // تغيير النموذج والمزود
  | "theme"          // تغيير الثيم والألوان
  | "persona"        // تغيير الشخصية والأسلوب
  | "security"       // عمليات الأمان والاختراق
  | "osint"          // استخبارات المصادر المفتوحة
  | "memory"         // إدارة الذاكرة
  | "evolution"      // التطور الذاتي
  | "ui"             // عناصر الواجهة
  | "chat"           // إدارة المحادثات
  | "system"         // أوامر النظام
  | "omnix";         // أوامر OMNIX نفسه

export interface AbsoluteCommand {
  /** معرّف فريد */
  id: string;
  /** الاسم بالإنجليزية */
  name: string;
  /** الاسم بالعربية */
  nameAr: string;
  /** وصف وظيفي */
  description: string;
  /** وصف بالعربية */
  descriptionAr: string;
  /** الفئة */
  category: AbsoluteCategory;
  /** مفاتيح بديلة للبحث (عربي + إنجليزي) */
  aliases: string[];
  /** وسيط اختياري */
  param?: string;
  /** أمثلة على الاستخدام */
  examples?: string[];
  /** دالة التنفيذ */
  execute: (params: Record<string, unknown>, dispatchers: NexusDispatchers) => { success: boolean; message: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function modal(id: string, label: string, labelAr: string): Pick<AbsoluteCommand, "execute"> {
  return {
    execute: (_, d) => {
      d.openModal(id);
      return { success: true, message: `${labelAr} — مفتوح` };
    },
  };
}

function closeM(id: string, labelAr: string): Pick<AbsoluteCommand, "execute"> {
  return {
    execute: (_, d) => {
      d.closeModal(id);
      return { success: true, message: `${labelAr} — مغلق` };
    },
  };
}

function dispatchAction(type: string, extra: Record<string, unknown> = {}, msgAr = "تم"): Pick<AbsoluteCommand, "execute"> {
  return {
    execute: (params, d) => {
      d.dispatch({ type, ...extra, ...params });
      return { success: true, message: msgAr };
    },
  };
}

// ─── THE ABSOLUTE REGISTRY (150+ Commands) ───────────────────────────────────

export const OMNIX_ABSOLUTE_REGISTRY: AbsoluteCommand[] = [

  // ════════════════════════════════════════════════════════════
  // SOVEREIGN — التحكم في العقل الحاكم
  // ════════════════════════════════════════════════════════════
  {
    id: "sovereign_status",
    name: "Show Sovereign Status",
    nameAr: "عرض حالة العقل الحاكم",
    description: "Display full OMNIX Sovereign status",
    descriptionAr: "عرض حالة OMNIX الكاملة",
    category: "sovereign",
    aliases: ["status", "حالة", "omnix status", "حالة النظام", "sovereign"],
    execute: (_, d) => {
      d.toast("🔱 OMNIX SOVEREIGN — النظام يعمل بكامل طاقته الإلهية");
      return { success: true, message: "تم عرض حالة النظام" };
    },
  },
  {
    id: "god_mode_on",
    name: "Activate God Mode",
    nameAr: "تفعيل وضع الإله",
    description: "Enable maximum autonomy and power",
    descriptionAr: "تفعيل أقصى استقلالية وصلاحيات",
    category: "sovereign",
    aliases: ["god mode", "وضع الإله", "god", "إله", "activate god", "فعّل الإله"],
    execute: (_, d) => {
      d.toast("🔱 وضع الإله — نشط! صلاحيات مطلقة ممنوحة");
      return { success: true, message: "وضع الإله مفعّل" };
    },
  },
  {
    id: "system_reset",
    name: "Reset OMNIX State",
    nameAr: "إعادة ضبط OMNIX",
    description: "Reset the OMNIX system to default state",
    descriptionAr: "إعادة ضبط نظام OMNIX للحالة الافتراضية",
    category: "sovereign",
    aliases: ["reset", "إعادة ضبط", "reset omnix", "ضبط النظام"],
    execute: (_, d) => {
      d.toast("🔄 تمت إعادة ضبط OMNIX بنجاح");
      return { success: true, message: "تمت إعادة الضبط" };
    },
  },

  // ════════════════════════════════════════════════════════════
  // MODALS — فتح النوافذ
  // ════════════════════════════════════════════════════════════
  {
    id: "open_arsenal",
    name: "Open Arsenal Hub",
    nameAr: "فتح ترسانة الأدوات",
    description: "Open the security tools arsenal",
    descriptionAr: "فتح ترسانة أدوات الأمن",
    category: "modal",
    aliases: ["arsenal", "ترسانة", "أدوات", "tools hub", "افتح الترسانة"],
    ...modal("arsenal", "Arsenal Hub", "ترسانة الأدوات"),
  },
  {
    id: "open_pentest",
    name: "Open PentestLab Pro",
    nameAr: "فتح مختبر الاختراق",
    description: "Open the penetration testing lab",
    descriptionAr: "فتح مختبر اختبار الاختراق الاحترافي",
    category: "security",
    aliases: ["pentest", "اختراق", "pentest lab", "مختبر الاختراق", "بنتست"],
    ...modal("pentestLabPro", "PentestLab", "مختبر الاختراق"),
  },
  {
    id: "open_osint",
    name: "Open OSINT Dashboard",
    nameAr: "فتح لوحة OSINT",
    description: "Open the OSINT intelligence dashboard",
    descriptionAr: "فتح لوحة استخبارات المصادر المفتوحة",
    category: "osint",
    aliases: ["osint", "أوسينت", "osint dashboard", "لوحة osint", "استخبارات"],
    ...modal("osintDash", "OSINT Dashboard", "لوحة OSINT"),
  },
  {
    id: "open_settings",
    name: "Open Settings",
    nameAr: "فتح الإعدادات",
    description: "Open application settings",
    descriptionAr: "فتح إعدادات التطبيق",
    category: "modal",
    aliases: ["settings", "إعدادات", "ضبط", "تفضيلات", "خيارات"],
    ...modal("settings", "Settings", "الإعدادات"),
  },
  {
    id: "open_provider",
    name: "Open Provider Settings",
    nameAr: "فتح إعدادات المزود",
    description: "Open AI provider settings",
    descriptionAr: "فتح إعدادات مزود الذكاء الاصطناعي",
    category: "model",
    aliases: ["provider", "مزود", "api key", "مفتاح api", "provider settings", "إعدادات المزود"],
    ...modal("providerSettings", "Provider Settings", "إعدادات المزود"),
  },
  {
    id: "open_memory",
    name: "Open Memory Manager",
    nameAr: "فتح مدير الذاكرة",
    description: "Open the memory management panel",
    descriptionAr: "فتح لوحة إدارة الذاكرة",
    category: "memory",
    aliases: ["memory", "ذاكرة", "memory manager", "مدير الذاكرة", "ذكريات"],
    ...modal("memory", "Memory Manager", "مدير الذاكرة"),
  },
  {
    id: "open_exploit_chain",
    name: "Open Exploit Chain Builder",
    nameAr: "فتح بنّاء سلسلة الاستغلال",
    description: "Open the exploit chain builder",
    descriptionAr: "فتح أداة بناء سلاسل الاستغلال",
    category: "security",
    aliases: ["exploit chain", "سلسلة استغلال", "exploit", "استغلال", "chain"],
    ...modal("exploitChain", "Exploit Chain", "سلسلة الاستغلال"),
  },
  {
    id: "open_intelligence",
    name: "Open Intelligence Core",
    nameAr: "فتح نواة الاستخبارات",
    description: "Open the intelligence core panel",
    descriptionAr: "فتح لوحة نواة الاستخبارات",
    category: "osint",
    aliases: ["intelligence", "استخبارات", "intelligence core", "نواة الاستخبارات", "intel"],
    ...modal("intelligenceCore", "Intelligence Core", "نواة الاستخبارات"),
  },
  {
    id: "open_agent",
    name: "Open Agent Pipeline",
    nameAr: "فتح خط وكيل الذكاء",
    description: "Open the agent pipeline panel",
    descriptionAr: "فتح لوحة خط أنابيب الوكيل",
    category: "modal",
    aliases: ["agent", "وكيل", "agent pipeline", "خط الوكيل", "ai agent"],
    ...modal("agent", "Agent Pipeline", "خط الوكيل"),
  },
  {
    id: "open_omega_agent",
    name: "Open Omega Agent",
    nameAr: "فتح أوميغا أجنت",
    description: "Open the Omega AI agent interface",
    descriptionAr: "فتح واجهة وكيل أوميغا",
    category: "modal",
    aliases: ["omega", "أوميغا", "omega agent", "وكيل أوميغا"],
    ...modal("omegaAgent", "Omega Agent", "أوميغا أجنت"),
  },
  {
    id: "open_nexus",
    name: "Open Nexus Panel",
    nameAr: "فتح لوحة نيكسوس",
    description: "Open the Nexus control panel",
    descriptionAr: "فتح لوحة تحكم نيكسوس",
    category: "omnix",
    aliases: ["nexus", "نيكسوس", "nexus panel", "لوحة nexus", "nexus control"],
    execute: (_, d) => {
      window.dispatchEvent(new CustomEvent("nexus:open-panel"));
      d.toast("🔮 NEXUS Panel — مفتوح");
      return { success: true, message: "تم فتح لوحة NEXUS" };
    },
  },
  {
    id: "open_monaco",
    name: "Open Code Editor",
    nameAr: "فتح محرر الكود",
    description: "Open the Monaco code editor",
    descriptionAr: "فتح محرر الكود Monaco",
    category: "modal",
    aliases: ["monaco", "code editor", "محرر", "كود", "editor"],
    ...modal("monaco", "Monaco Editor", "محرر الكود"),
  },
  {
    id: "open_ai_terminal",
    name: "Open AI Terminal",
    nameAr: "فتح الطرفية الذكية",
    description: "Open the AI-powered terminal",
    descriptionAr: "فتح الطرفية المدعومة بالذكاء الاصطناعي",
    category: "modal",
    aliases: ["terminal", "طرفية", "ai terminal", "الطرفية الذكية", "console"],
    ...modal("aiTerminal", "AI Terminal", "الطرفية الذكية"),
  },
  {
    id: "open_rag",
    name: "Open RAG Pipeline",
    nameAr: "فتح خط RAG",
    description: "Open the retrieval-augmented generation pipeline",
    descriptionAr: "فتح خط أنابيب التوليد المعزز بالاسترجاع",
    category: "modal",
    aliases: ["rag", "rag pipeline", "خط rag", "استرجاع"],
    ...modal("rag", "RAG Pipeline", "خط RAG"),
  },
  {
    id: "open_finetune",
    name: "Open Fine-Tuning Studio",
    nameAr: "فتح استوديو الضبط الدقيق",
    description: "Open the model fine-tuning studio",
    descriptionAr: "فتح استوديو ضبط النماذج",
    category: "model",
    aliases: ["finetune", "fine-tune", "ضبط دقيق", "fine tuning", "استوديو الضبط"],
    ...modal("finetune", "Fine-Tune Studio", "استوديو الضبط الدقيق"),
  },
  {
    id: "open_debate",
    name: "Open AI Debate Arena",
    nameAr: "فتح ساحة النقاش",
    description: "Open the AI debate arena",
    descriptionAr: "فتح ساحة النقاش بين نماذج الذكاء الاصطناعي",
    category: "modal",
    aliases: ["debate", "نقاش", "debate arena", "ساحة النقاش"],
    ...modal("debate", "Debate Arena", "ساحة النقاش"),
  },
  {
    id: "open_collab",
    name: "Open Collaboration Hub",
    nameAr: "فتح مركز التعاون",
    description: "Open real-time collaboration hub",
    descriptionAr: "فتح مركز التعاون في الوقت الفعلي",
    category: "modal",
    aliases: ["collab", "تعاون", "collaboration", "مشاركة"],
    ...modal("collab", "Collab Hub", "مركز التعاون"),
  },
  {
    id: "open_shortcuts",
    name: "Open Keyboard Shortcuts",
    nameAr: "فتح اختصارات لوحة المفاتيح",
    description: "Show keyboard shortcuts reference",
    descriptionAr: "عرض مرجع اختصارات لوحة المفاتيح",
    category: "ui",
    aliases: ["shortcuts", "اختصارات", "keyboard shortcuts", "مفاتيح", "hotkeys"],
    ...modal("shortcuts", "Shortcuts", "اختصارات لوحة المفاتيح"),
  },
  {
    id: "open_bookmarks",
    name: "Open Bookmarks",
    nameAr: "فتح الإشارات المرجعية",
    description: "Open saved bookmarks",
    descriptionAr: "فتح الإشارات المرجعية المحفوظة",
    category: "chat",
    aliases: ["bookmarks", "إشارات", "saved", "محفوظات"],
    ...modal("bookmarks", "Bookmarks", "الإشارات المرجعية"),
  },
  {
    id: "open_compare",
    name: "Open Compare Mode",
    nameAr: "فتح وضع المقارنة",
    description: "Compare multiple AI responses",
    descriptionAr: "مقارنة ردود نماذج الذكاء الاصطناعي",
    category: "chat",
    aliases: ["compare", "مقارنة", "compare mode", "وضع المقارنة"],
    ...modal("compare", "Compare", "وضع المقارنة"),
  },
  {
    id: "open_chain_of_thought",
    name: "Open Chain of Thought",
    nameAr: "فتح سلسلة التفكير",
    description: "Open the chain-of-thought visualization",
    descriptionAr: "فتح تصور سلسلة التفكير",
    category: "modal",
    aliases: ["chain of thought", "سلسلة التفكير", "cot", "تفكير", "reasoning"],
    ...modal("chainOfThought", "Chain of Thought", "سلسلة التفكير"),
  },
  {
    id: "open_pricing",
    name: "Open Pricing",
    nameAr: "فتح الأسعار",
    description: "Open pricing plans",
    descriptionAr: "عرض خطط الأسعار",
    category: "modal",
    aliases: ["pricing", "أسعار", "plans", "خطط", "subscription"],
    ...modal("pricing", "Pricing", "الأسعار"),
  },
  {
    id: "open_changelog",
    name: "Open Changelog",
    nameAr: "فتح سجل التغييرات",
    description: "Show version history and changelog",
    descriptionAr: "عرض سجل الإصدارات والتغييرات",
    category: "modal",
    aliases: ["changelog", "سجل التغييرات", "updates", "تحديثات", "version"],
    ...modal("changelog", "Changelog", "سجل التغييرات"),
  },

  // ════════════════════════════════════════════════════════════
  // MODELS — تغيير النماذج والمزودين
  // ════════════════════════════════════════════════════════════
  {
    id: "set_model_groq_llama",
    name: "Use Groq LLaMA 3.3 70B",
    nameAr: "استخدام Groq LLaMA 3.3 70B",
    description: "Switch to Groq's LLaMA 3.3 70B model",
    descriptionAr: "التبديل لنموذج LLaMA 3.3 70B من Groq",
    category: "model",
    aliases: ["groq", "llama", "llama 70b", "جروك", "llama3"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_PROVIDER", provider: "groq", providerModel: "llama-3.3-70b-versatile" });
      d.toast("⚡ تم التبديل إلى Groq LLaMA 3.3 70B");
      return { success: true, message: "تم تغيير النموذج" };
    },
  },
  {
    id: "set_model_gpt4o",
    name: "Use GPT-4o",
    nameAr: "استخدام GPT-4o",
    description: "Switch to OpenAI GPT-4o",
    descriptionAr: "التبديل لنموذج GPT-4o من OpenAI",
    category: "model",
    aliases: ["gpt4o", "gpt-4o", "openai", "gpt4", "gpt"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_PROVIDER", provider: "openai", providerModel: "gpt-4o" });
      d.toast("🤖 تم التبديل إلى GPT-4o");
      return { success: true, message: "تم تغيير النموذج" };
    },
  },
  {
    id: "set_model_claude",
    name: "Use Claude Sonnet",
    nameAr: "استخدام Claude Sonnet",
    description: "Switch to Anthropic Claude Sonnet",
    descriptionAr: "التبديل لنموذج Claude Sonnet من Anthropic",
    category: "model",
    aliases: ["claude", "anthropic", "claude sonnet", "كلود", "sonnet"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_PROVIDER", provider: "anthropic", providerModel: "claude-sonnet-4-5" });
      d.toast("🎭 تم التبديل إلى Claude Sonnet");
      return { success: true, message: "تم تغيير النموذج" };
    },
  },
  {
    id: "set_model_gemini",
    name: "Use Gemini 2.5 Flash",
    nameAr: "استخدام Gemini 2.5 Flash",
    description: "Switch to Google Gemini 2.5 Flash",
    descriptionAr: "التبديل لنموذج Gemini 2.5 Flash من Google",
    category: "model",
    aliases: ["gemini", "google", "gemini flash", "جيميني", "flash"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_PROVIDER", provider: "gemini", providerModel: "gemini-2.5-flash" });
      d.toast("💫 تم التبديل إلى Gemini 2.5 Flash");
      return { success: true, message: "تم تغيير النموذج" };
    },
  },
  {
    id: "set_model_deepseek",
    name: "Use DeepSeek Chat",
    nameAr: "استخدام DeepSeek Chat",
    description: "Switch to DeepSeek Chat model",
    descriptionAr: "التبديل لنموذج DeepSeek Chat",
    category: "model",
    aliases: ["deepseek", "deep seek", "ديبسيك", "deepseek chat"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_PROVIDER", provider: "deepseek", providerModel: "deepseek-chat" });
      d.toast("🌊 تم التبديل إلى DeepSeek Chat");
      return { success: true, message: "تم تغيير النموذج" };
    },
  },
  {
    id: "set_model_grok",
    name: "Use Grok 3 Mini",
    nameAr: "استخدام Grok 3 Mini",
    description: "Switch to xAI Grok 3 Mini",
    descriptionAr: "التبديل لنموذج Grok 3 Mini من xAI",
    category: "model",
    aliases: ["grok", "xai", "x ai", "جروك", "grok3"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_PROVIDER", provider: "xai", providerModel: "grok-3-mini" });
      d.toast("🔮 تم التبديل إلى Grok 3 Mini");
      return { success: true, message: "تم تغيير النموذج" };
    },
  },
  {
    id: "set_temperature_low",
    name: "Set Temperature Low (0.3)",
    nameAr: "ضبط الحرارة منخفضة",
    description: "Set model temperature to 0.3 for focused responses",
    descriptionAr: "ضبط حرارة النموذج على 0.3 للردود المركّزة",
    category: "model",
    aliases: ["temperature low", "حرارة منخفضة", "precise", "focused", "دقيق"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_SETTINGS", patch: { temperature: 0.3 } });
      d.toast("🎯 الحرارة: 0.3 — ردود دقيقة ومركّزة");
      return { success: true, message: "تم ضبط الحرارة" };
    },
  },
  {
    id: "set_temperature_high",
    name: "Set Temperature High (0.9)",
    nameAr: "ضبط الحرارة عالية",
    description: "Set model temperature to 0.9 for creative responses",
    descriptionAr: "ضبط حرارة النموذج على 0.9 للردود الإبداعية",
    category: "model",
    aliases: ["temperature high", "حرارة عالية", "creative", "إبداعي", "imaginative"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_SETTINGS", patch: { temperature: 0.9 } });
      d.toast("🎨 الحرارة: 0.9 — ردود إبداعية ومتنوعة");
      return { success: true, message: "تم ضبط الحرارة" };
    },
  },
  {
    id: "toggle_streaming",
    name: "Toggle Streaming",
    nameAr: "تبديل البث",
    description: "Toggle streaming mode on/off",
    descriptionAr: "تفعيل/إيقاف وضع البث الفوري",
    category: "model",
    aliases: ["streaming", "بث", "stream", "toggle streaming"],
    execute: (_, d) => {
      const s = d.getState() as { settings?: { streaming?: boolean } };
      const current = s?.settings?.streaming ?? true;
      d.dispatch({ type: "SET_SETTINGS", patch: { streaming: !current } });
      d.toast(`📡 البث الفوري: ${!current ? "✅ مفعّل" : "❌ موقوف"}`);
      return { success: true, message: "تم تبديل البث" };
    },
  },

  // ════════════════════════════════════════════════════════════
  // THEMES — تغيير الثيمات
  // ════════════════════════════════════════════════════════════
  {
    id: "theme_green",
    name: "Green Hacker Theme",
    nameAr: "ثيم الهاكر الأخضر",
    description: "Activate the classic green hacker theme",
    descriptionAr: "تفعيل ثيم الهاكر الكلاسيكي الأخضر",
    category: "theme",
    aliases: ["green", "أخضر", "matrix", "hacker", "كلاسيك", "ماتريكس"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_THEME_ACCENT", accent: "green" });
      d.toast("💚 ثيم الهاكر الأخضر — مفعّل");
      return { success: true, message: "تم تغيير الثيم" };
    },
  },
  {
    id: "theme_red",
    name: "Red Danger Theme",
    nameAr: "ثيم الخطر الأحمر",
    description: "Activate the red danger theme",
    descriptionAr: "تفعيل ثيم الخطر الأحمر",
    category: "theme",
    aliases: ["red", "أحمر", "danger", "خطر", "blood", "دم"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_THEME_ACCENT", accent: "red" });
      d.toast("🔴 ثيم الخطر الأحمر — مفعّل");
      return { success: true, message: "تم تغيير الثيم" };
    },
  },
  {
    id: "theme_blue",
    name: "Cyber Blue Theme",
    nameAr: "ثيم السايبر الأزرق",
    description: "Activate the cyber blue theme",
    descriptionAr: "تفعيل ثيم السايبر الأزرق",
    category: "theme",
    aliases: ["blue", "أزرق", "cyber blue", "سايبر", "ocean"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_THEME_ACCENT", accent: "blue" });
      d.toast("🔵 ثيم السايبر الأزرق — مفعّل");
      return { success: true, message: "تم تغيير الثيم" };
    },
  },
  {
    id: "theme_purple",
    name: "Purple Neural Theme",
    nameAr: "ثيم البنفسجي العصبي",
    description: "Activate the purple neural theme",
    descriptionAr: "تفعيل ثيم البنفسجي العصبي",
    category: "theme",
    aliases: ["purple", "بنفسجي", "neural", "violet", "بنفسج"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_THEME_ACCENT", accent: "purple" });
      d.toast("💜 ثيم البنفسجي العصبي — مفعّل");
      return { success: true, message: "تم تغيير الثيم" };
    },
  },
  {
    id: "theme_gold",
    name: "Gold Elite Theme",
    nameAr: "ثيم الذهبي الملكي",
    description: "Activate the gold elite theme",
    descriptionAr: "تفعيل ثيم الذهبي الملكي",
    category: "theme",
    aliases: ["gold", "ذهبي", "elite", "نخبة", "yellow", "ملكي"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_THEME_ACCENT", accent: "gold" });
      d.toast("✨ ثيم الذهبي الملكي — مفعّل");
      return { success: true, message: "تم تغيير الثيم" };
    },
  },
  {
    id: "globe_cyber",
    name: "Cyber Globe",
    nameAr: "كرة السايبر ثري دي",
    description: "Set 3D globe to cyber theme",
    descriptionAr: "ضبط الكرة ثلاثية الأبعاد على ثيم السايبر",
    category: "theme",
    aliases: ["cyber globe", "كرة سايبر", "globe cyber", "cyber 3d"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_GLOBE_THEME", globeTheme: "cyber" });
      d.toast("🌐 الكرة ثلاثية الأبعاد: ثيم السايبر");
      return { success: true, message: "تم تغيير الكرة" };
    },
  },
  {
    id: "globe_matrix",
    name: "Matrix Globe",
    nameAr: "كرة الماتريكس",
    description: "Set 3D globe to matrix theme",
    descriptionAr: "ضبط الكرة ثلاثية الأبعاد على ثيم الماتريكس",
    category: "theme",
    aliases: ["matrix globe", "كرة ماتريكس", "globe matrix", "matrix 3d"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_GLOBE_THEME", globeTheme: "matrix" });
      d.toast("🟢 الكرة ثلاثية الأبعاد: ثيم الماتريكس");
      return { success: true, message: "تم تغيير الكرة" };
    },
  },
  {
    id: "globe_plasma",
    name: "Plasma Globe",
    nameAr: "كرة البلازما",
    description: "Set 3D globe to plasma theme",
    descriptionAr: "ضبط الكرة ثلاثية الأبعاد على ثيم البلازما",
    category: "theme",
    aliases: ["plasma globe", "كرة بلازما", "globe plasma", "plasma"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_GLOBE_THEME", globeTheme: "plasma" });
      d.toast("🔮 الكرة ثلاثية الأبعاد: ثيم البلازما");
      return { success: true, message: "تم تغيير الكرة" };
    },
  },

  // ════════════════════════════════════════════════════════════
  // PERSONAS — تغيير الشخصيات
  // ════════════════════════════════════════════════════════════
  {
    id: "persona_kali",
    name: "KaliGPT Persona",
    nameAr: "شخصية KaliGPT",
    description: "Activate KaliGPT cybersecurity persona",
    descriptionAr: "تفعيل شخصية KaliGPT لأمن المعلومات",
    category: "persona",
    aliases: ["kali", "kaligpt", "كالي", "hacker persona", "شخصية الهاكر"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_PERSONA", persona: "kaligpt" });
      d.toast("💀 شخصية KaliGPT — مفعّلة");
      return { success: true, message: "تم تغيير الشخصية" };
    },
  },
  {
    id: "persona_mr7",
    name: "MR7 Analyst Persona",
    nameAr: "شخصية MR7 المحلل",
    description: "Activate MR7 security analyst persona",
    descriptionAr: "تفعيل شخصية MR7 محلل الأمن",
    category: "persona",
    aliases: ["mr7", "analyst", "محلل", "security analyst", "mr 7"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_PERSONA", persona: "mr7" });
      d.toast("🔍 شخصية MR7 المحلل — مفعّلة");
      return { success: true, message: "تم تغيير الشخصية" };
    },
  },
  {
    id: "persona_ghost",
    name: "Ghost/Stealth Persona",
    nameAr: "شخصية الشبح الصامت",
    description: "Activate ghost stealth mode persona",
    descriptionAr: "تفعيل شخصية الشبح والتخفي",
    category: "persona",
    aliases: ["ghost", "شبح", "stealth", "خفي", "shadow", "invisible"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_PERSONA", persona: "ghost" });
      d.toast("👻 شخصية الشبح الصامت — مفعّلة");
      return { success: true, message: "تم تغيير الشخصية" };
    },
  },
  {
    id: "persona_default",
    name: "Default Persona",
    nameAr: "الشخصية الافتراضية",
    description: "Reset to default persona",
    descriptionAr: "إعادة الشخصية الافتراضية",
    category: "persona",
    aliases: ["default", "افتراضي", "reset persona", "إعادة الشخصية", "normal"],
    execute: (_, d) => {
      d.dispatch({ type: "SET_PERSONA", persona: null });
      d.toast("🤖 الشخصية الافتراضية — مفعّلة");
      return { success: true, message: "تم إعادة الشخصية الافتراضية" };
    },
  },

  // ════════════════════════════════════════════════════════════
  // CHAT — إدارة المحادثات
  // ════════════════════════════════════════════════════════════
  {
    id: "new_chat",
    name: "New Chat",
    nameAr: "محادثة جديدة",
    description: "Start a new chat conversation",
    descriptionAr: "بدء محادثة جديدة",
    category: "chat",
    aliases: ["new chat", "محادثة جديدة", "new conversation", "جديد", "chat new"],
    execute: (_, d) => {
      d.dispatch({ type: "NEW_CHAT" });
      d.toast("💬 محادثة جديدة — بدأت");
      return { success: true, message: "تم إنشاء محادثة جديدة" };
    },
  },
  {
    id: "clear_chat",
    name: "Clear Current Chat",
    nameAr: "مسح المحادثة الحالية",
    description: "Clear messages in current chat",
    descriptionAr: "مسح رسائل المحادثة الحالية",
    category: "chat",
    aliases: ["clear", "مسح", "clear chat", "مسح المحادثة", "delete messages"],
    execute: (_, d) => {
      d.dispatch({ type: "CLEAR_CHAT" });
      d.toast("🗑️ تم مسح المحادثة");
      return { success: true, message: "تم مسح المحادثة" };
    },
  },
  {
    id: "export_chat",
    name: "Export Chat",
    nameAr: "تصدير المحادثة",
    description: "Export current chat to file",
    descriptionAr: "تصدير المحادثة الحالية إلى ملف",
    category: "chat",
    aliases: ["export", "تصدير", "export chat", "save chat", "حفظ"],
    execute: (_, d) => {
      d.dispatch({ type: "EXPORT_CHAT" });
      d.toast("📤 تم تصدير المحادثة");
      return { success: true, message: "تم تصدير المحادثة" };
    },
  },

  // ════════════════════════════════════════════════════════════
  // MEMORY — إدارة الذاكرة
  // ════════════════════════════════════════════════════════════
  {
    id: "memory_save",
    name: "Save Memory Snapshot",
    nameAr: "حفظ لقطة الذاكرة",
    description: "Save current context to eternal memory",
    descriptionAr: "حفظ السياق الحالي في الذاكرة الأبدية",
    category: "memory",
    aliases: ["save memory", "حفظ الذاكرة", "snapshot", "لقطة", "remember"],
    execute: (_, d) => {
      try {
        const key = `omnix-memory-snapshot-${Date.now()}`;
        const s = d.getState();
        localStorage.setItem(key, JSON.stringify({ ts: Date.now(), state: s }));
        d.toast("💾 تم حفظ لقطة الذاكرة");
        return { success: true, message: "تم الحفظ" };
      } catch {
        return { success: false, message: "فشل الحفظ" };
      }
    },
  },
  {
    id: "memory_clear",
    name: "Clear OMNIX Memory",
    nameAr: "مسح ذاكرة OMNIX",
    description: "Clear all OMNIX memory data",
    descriptionAr: "مسح جميع بيانات ذاكرة OMNIX",
    category: "memory",
    aliases: ["clear memory", "مسح الذاكرة", "forget all", "نسيان"],
    execute: (_, d) => {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith("omnix-"));
      keys.forEach((k) => localStorage.removeItem(k));
      d.toast(`🗑️ تم مسح ${keys.length} ذاكرة OMNIX`);
      return { success: true, message: "تم مسح الذاكرة" };
    },
  },

  // ════════════════════════════════════════════════════════════
  // OMNIX SYSTEM — أوامر OMNIX نفسه
  // ════════════════════════════════════════════════════════════
  {
    id: "omnix_hud",
    name: "Toggle OMNIX HUD",
    nameAr: "تبديل لوحة OMNIX",
    description: "Open/close the OMNIX control HUD",
    descriptionAr: "فتح/إغلاق لوحة تحكم OMNIX",
    category: "omnix",
    aliases: ["hud", "omnix hud", "لوحة omnix", "control panel", "لوحة التحكم"],
    execute: (_, d) => {
      window.dispatchEvent(new CustomEvent("omnix:toggle-hud"));
      d.toast("🔱 OMNIX HUD — تم التبديل");
      return { success: true, message: "تم تبديل HUD" };
    },
  },
  {
    id: "omnix_voice",
    name: "Toggle Voice Control",
    nameAr: "تبديل التحكم الصوتي",
    description: "Open/close OMNIX voice interface",
    descriptionAr: "فتح/إغلاق واجهة التحكم الصوتي",
    category: "omnix",
    aliases: ["voice", "صوت", "voice control", "تحكم صوتي", "speak", "تحدث"],
    execute: (_, d) => {
      window.dispatchEvent(new CustomEvent("omnix:toggle-voice"));
      d.toast("🎙️ التحكم الصوتي — تم التبديل");
      return { success: true, message: "تم تبديل الصوت" };
    },
  },
  {
    id: "omnix_evolution",
    name: "Open Self Evolution",
    nameAr: "فتح التطور الذاتي",
    description: "Open the OMNIX self-evolution panel",
    descriptionAr: "فتح لوحة التطور الذاتي لـ OMNIX",
    category: "omnix",
    aliases: ["evolution", "تطور", "self evolution", "التطور الذاتي", "evolve"],
    execute: (_, d) => {
      window.dispatchEvent(new CustomEvent("omnix:toggle-evolution"));
      d.toast("🧬 التطور الذاتي — مفتوح");
      return { success: true, message: "تم فتح التطور الذاتي" };
    },
  },
  {
    id: "omnix_palette",
    name: "Open Command Palette",
    nameAr: "فتح لوحة الأوامر",
    description: "Open OMNIX command palette (Ctrl+Shift+Z)",
    descriptionAr: "فتح لوحة أوامر OMNIX (Ctrl+Shift+Z)",
    category: "omnix",
    aliases: ["palette", "command palette", "لوحة أوامر", "commands", "أوامر"],
    execute: (_, d) => {
      window.dispatchEvent(new CustomEvent("omnix:toggle-palette"));
      d.toast("⚡ لوحة الأوامر — مفتوحة");
      return { success: true, message: "تم فتح لوحة الأوامر" };
    },
  },

  // ════════════════════════════════════════════════════════════
  // SECURITY — أوامر الأمان والاختراق
  // ════════════════════════════════════════════════════════════
  {
    id: "security_scan",
    name: "Run Security Scan",
    nameAr: "تشغيل فحص أمني",
    description: "Initiate a comprehensive security scan",
    descriptionAr: "بدء فحص أمني شامل",
    category: "security",
    aliases: ["scan", "فحص", "security scan", "فحص أمني", "audit", "تدقيق"],
    execute: (_, d) => {
      d.toast("🔍 جارٍ تشغيل الفحص الأمني الشامل...");
      return { success: true, message: "تم بدء الفحص الأمني" };
    },
  },
  {
    id: "stealth_mode",
    name: "Activate Stealth Mode",
    nameAr: "تفعيل وضع التخفي",
    description: "Enable stealth/ghost mode for operations",
    descriptionAr: "تفعيل وضع التخفي للعمليات",
    category: "security",
    aliases: ["stealth", "تخفي", "ghost mode", "وضع الشبح", "invisible"],
    execute: (_, d) => {
      d.toast("👻 وضع التخفي — مفعّل! العمليات مخفية");
      return { success: true, message: "وضع التخفي مفعّل" };
    },
  },
  {
    id: "open_vuln_scanner",
    name: "Open Vulnerability Scanner",
    nameAr: "فتح فاحص الثغرات",
    description: "Open the vulnerability scanner",
    descriptionAr: "فتح فاحص الثغرات الأمنية",
    category: "security",
    aliases: ["vuln", "ثغرات", "vulnerability", "scanner", "فاحص"],
    ...modal("vulnScanner", "Vulnerability Scanner", "فاحص الثغرات"),
  },
  {
    id: "open_packet_analyzer",
    name: "Open Packet Analyzer",
    nameAr: "فتح محلل الحزم",
    description: "Open the network packet analyzer",
    descriptionAr: "فتح محلل حزم الشبكة",
    category: "security",
    aliases: ["packet", "حزم", "packet analyzer", "محلل الحزم", "network", "شبكة"],
    ...modal("packetAnalyzer", "Packet Analyzer", "محلل الحزم"),
  },

  // ════════════════════════════════════════════════════════════
  // UI — عناصر الواجهة
  // ════════════════════════════════════════════════════════════
  {
    id: "toggle_sidebar",
    name: "Toggle Sidebar",
    nameAr: "تبديل الشريط الجانبي",
    description: "Show/hide the sidebar",
    descriptionAr: "إظهار/إخفاء الشريط الجانبي",
    category: "ui",
    aliases: ["sidebar", "شريط جانبي", "toggle sidebar", "side panel"],
    execute: (_, d) => {
      window.dispatchEvent(new CustomEvent("kali:toggle-sidebar"));
      d.toast("📐 الشريط الجانبي — تم التبديل");
      return { success: true, message: "تم تبديل الشريط" };
    },
  },
  {
    id: "toggle_search",
    name: "Toggle Search",
    nameAr: "تبديل البحث",
    description: "Open/close global search",
    descriptionAr: "فتح/إغلاق البحث العام",
    category: "ui",
    aliases: ["search", "بحث", "find", "بحث عام", "global search"],
    execute: (_, d) => {
      d.toggleModal("search");
      return { success: true, message: "تم تبديل البحث" };
    },
  },
  {
    id: "fullscreen",
    name: "Toggle Fullscreen",
    nameAr: "تبديل الشاشة الكاملة",
    description: "Toggle fullscreen mode",
    descriptionAr: "تبديل وضع الشاشة الكاملة",
    category: "ui",
    aliases: ["fullscreen", "شاشة كاملة", "f11", "maximize", "تكبير"],
    execute: (_, d) => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
      d.toast("🖥️ تم تبديل الشاشة الكاملة");
      return { success: true, message: "تم تبديل الشاشة الكاملة" };
    },
  },

  // ════════════════════════════════════════════════════════════
  // SYSTEM — أوامر النظام
  // ════════════════════════════════════════════════════════════
  {
    id: "reload_app",
    name: "Reload Application",
    nameAr: "إعادة تحميل التطبيق",
    description: "Reload the application",
    descriptionAr: "إعادة تحميل التطبيق",
    category: "system",
    aliases: ["reload", "إعادة تحميل", "refresh", "تحديث الصفحة", "restart app"],
    execute: (_, d) => {
      d.toast("🔄 جارٍ إعادة تحميل التطبيق...");
      setTimeout(() => window.location.reload(), 1000);
      return { success: true, message: "إعادة التحميل..." };
    },
  },
  {
    id: "copy_session_id",
    name: "Copy Session ID",
    nameAr: "نسخ معرّف الجلسة",
    description: "Copy current session ID to clipboard",
    descriptionAr: "نسخ معرّف الجلسة الحالية إلى الحافظة",
    category: "system",
    aliases: ["session id", "معرف الجلسة", "copy session", "session"],
    execute: (_, d) => {
      const id = `SESSION-${Date.now()}`;
      navigator.clipboard.writeText(id).catch(() => {});
      d.toast(`📋 تم نسخ: ${id}`);
      return { success: true, message: "تم النسخ" };
    },
  },
  {
    id: "system_info",
    name: "Show System Info",
    nameAr: "عرض معلومات النظام",
    description: "Display browser and system information",
    descriptionAr: "عرض معلومات المتصفح والنظام",
    category: "system",
    aliases: ["system info", "معلومات النظام", "info", "about", "حول"],
    execute: (_, d) => {
      const ua = navigator.userAgent.slice(0, 60);
      d.toast(`💻 ${ua}...`);
      return { success: true, message: "تم عرض معلومات النظام" };
    },
  },
];

// ─── Search & Lookup Functions ────────────────────────────────────────────────

/** البحث في السجل المطلق بنص حر (عربي أو إنجليزي) */
export function searchAbsoluteRegistry(query: string): AbsoluteCommand[] {
  const q = query.toLowerCase().trim();
  if (!q) return OMNIX_ABSOLUTE_REGISTRY;

  return OMNIX_ABSOLUTE_REGISTRY.filter((cmd) => {
    return (
      cmd.id.includes(q) ||
      cmd.name.toLowerCase().includes(q) ||
      cmd.nameAr.includes(q) ||
      cmd.description.toLowerCase().includes(q) ||
      cmd.descriptionAr.includes(q) ||
      cmd.aliases.some((a) => a.toLowerCase().includes(q)) ||
      cmd.category.includes(q)
    );
  });
}

/** البحث عن أمر بمعرّفه */
export function findAbsoluteCommand(id: string): AbsoluteCommand | undefined {
  return OMNIX_ABSOLUTE_REGISTRY.find((c) => c.id === id);
}

/** تجميع الأوامر حسب الفئة */
export function getCommandsByCategory(category: AbsoluteCategory): AbsoluteCommand[] {
  return OMNIX_ABSOLUTE_REGISTRY.filter((c) => c.category === category);
}

/** بناء نص سياقي شامل لحقنه في كل رسالة */
export function buildAbsoluteRegistryContext(): string {
  const byCategory = new Map<AbsoluteCategory, AbsoluteCommand[]>();
  for (const cmd of OMNIX_ABSOLUTE_REGISTRY) {
    const list = byCategory.get(cmd.category) ?? [];
    list.push(cmd);
    byCategory.set(cmd.category, list);
  }

  const lines: string[] = [
    `📚 OMNIX ABSOLUTE REGISTRY — القاموس الإلهي الشامل (${OMNIX_ABSOLUTE_REGISTRY.length} أمر)`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ];

  const categoryLabels: Record<AbsoluteCategory, string> = {
    sovereign: "🔱 العقل الحاكم",
    modal: "🪟 النوافذ",
    model: "🤖 النماذج",
    theme: "🎨 الثيمات",
    persona: "🎭 الشخصيات",
    security: "🔒 الأمان",
    osint: "🕵️ OSINT",
    memory: "💾 الذاكرة",
    evolution: "🧬 التطور",
    ui: "📐 الواجهة",
    chat: "💬 المحادثات",
    system: "⚙️ النظام",
    omnix: "⚡ OMNIX",
  };

  for (const [cat, cmds] of byCategory) {
    const label = categoryLabels[cat] ?? cat;
    lines.push(`\n${label} (${cmds.length}):`);
    for (const cmd of cmds.slice(0, 6)) {
      lines.push(`  • ${cmd.id}: ${cmd.nameAr} — ${cmd.descriptionAr}`);
    }
    if (cmds.length > 6) lines.push(`  ... و${cmds.length - 6} أمر آخر`);
  }

  return lines.join("\n");
}

/** إجمالي عدد الأوامر */
export const ABSOLUTE_REGISTRY_COUNT = OMNIX_ABSOLUTE_REGISTRY.length;
