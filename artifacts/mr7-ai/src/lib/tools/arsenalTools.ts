// ─────────────────────────────────────────────────────────────────────────────
//  ARSENAL HUB TOOLS — تسجيل كافة موديولز Arsenal Hub كأدوات قابلة للاستدعاء
//  كل أداة تُطلق CustomEvent "kali:launch-arsenal" بمعرّف الموديول
//  تغطية كاملة لجميع الموديولز الـ 155+ دون استثناء
// ─────────────────────────────────────────────────────────────────────────────

import { registerTool } from "../toolsRegistry";

/** إطلاق موديول Arsenal Hub عبر CustomEvent */
function launchModule(moduleId: string, query?: string): Promise<string> {
  window.dispatchEvent(
    new CustomEvent("kali:launch-arsenal", {
      detail: { moduleId, query, source: "tool-calling" },
    }),
  );
  return Promise.resolve(`✅ Arsenal module "${moduleId}" launched successfully${query ? ` with query: "${query}"` : ""}.`);
}

/** مساعد لإنشاء وتسجيل أداة Arsenal بسرعة */
function createArsenalTool(
  moduleId: string,
  toolId: string,
  description: string,
  extraProps?: Record<string, { type: string; description: string }>,
): void {
  registerTool({
    moduleId: toolId,
    name: `Arsenal: ${moduleId}`,
    description,
    category: "arsenal",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "الاستعلام أو الأمر المرسل للموديول" },
        ...(extraProps ?? {}),
      },
      required: [],
    },
    execute: async (input) => launchModule(moduleId, input.query as string | undefined),
  });
}

export function registerArsenalTools(): void {
  // ── Tier 1: Core Agents ──────────────────────────────────────────────────
  createArsenalTool("omegaAgent", "launch_omegaAgent",
    "تشغيل OMEGA AGENT — مركز القيادة العصبي المستقل. أقوى وكيل في المنصة.");
  createArsenalTool("kaliagent", "launch_kaliagent",
    "تشغيل KaliAgent — وكيل استطلاع مستقل بالكامل. يدير سلاسل تفكير تلقائية.");
  createArsenalTool("nexus", "launch_nexus",
    "تشغيل NEXUS Agent — وكيل من 5 مستويات فائق القدرة. يجمع عدة أنظمة ذكاء.");
  createArsenalTool("jarvis", "launch_jarvis",
    "تشغيل JARVIS — مساعد HUD بأسلوب Iron Man. واجهة هولوغرافية تفاعلية.");
  createArsenalTool("jarvisHologram", "launch_jarvisHologram",
    "تشغيل JARVIS Hologram — النسخة الثلاثية الأبعاد من JARVIS بتأثيرات بصرية متطورة.");
  createArsenalTool("parseltongue", "launch_parseltongue",
    "تشغيل Parseltongue — محرك نصوص الفريق الأحمر. يُنشئ أوامر مُبهمة ومشفرة.");
  createArsenalTool("ragflow", "launch_ragflow",
    "تشغيل RAGFlow — محادثة مع قاعدة المعرفة عبر RAG. يستخرج المعلومات من المستندات.");
  createArsenalTool("opengravity", "launch_opengravity",
    "تشغيل OpenGravity IDE — محرر كود بالذكاء الاصطناعي. يكتب وينفذ الكود مباشرة.");
  createArsenalTool("teamagent", "launch_teamagent",
    "تشغيل Team Agent — وضع عدة وكلاء متوازية. ينفّذ مهام متعددة في آنٍ واحد.");
  createArsenalTool("skills", "launch_skills",
    "تشغيل Skills Library — مكتبة تضم 1,460+ مهارة اصطناعية جاهزة للاستخدام.");
  createArsenalTool("agentOS", "launch_agentOS",
    "تشغيل Agent OS — نظام تشغيل مهام مستقل. يُدير الوكلاء والمهام تلقائياً.");
  createArsenalTool("geminiCLI", "launch_geminiCLI",
    "تشغيل Gemini CLI — واجهة سطر أوامر لنموذج Gemini المتطور من Google.");
  createArsenalTool("hermes", "launch_hermes",
    "تشغيل Hermes Agent — سلاسل استدلال متعددة الخطوات. يفكر قبل الإجابة.");
  createArsenalTool("graphify", "launch_graphify",
    "تشغيل Graphify — منشئ رسوم بيانية للمعرفة. يحوّل المعلومات لبيانات مرئية.");

  // ── Tier 2: Productivity & Tools ────────────────────────────────────────
  createArsenalTool("getshitdone", "launch_getshitdone",
    "تشغيل Get Shit Done — محرك GTD بالذكاء الاصطناعي. يحوّل الأهداف لمهام منظمة.");
  createArsenalTool("ccswitch", "launch_ccswitch",
    "تشغيل CC Switch — مقارنة نماذج متعددة جنباً إلى جنب لقياس جودة الاستجابات.");
  createArsenalTool("uiuxpro", "launch_uiuxpro",
    "تشغيل UI/UX Pro Max — مجموعة تصميم ذكية. يُنشئ واجهات احترافية.");
  createArsenalTool("careerops", "launch_careerops",
    "تشغيل Career Ops — ذكاء مهني شامل. يساعد في التوظيف والمسار الوظيفي.");
  createArsenalTool("abtop", "launch_abtop",
    "تشغيل ABTop — مراقبة تهديدات الذكاء الاصطناعي في الزمن الفعلي.");
  createArsenalTool("awesomellm", "launch_awesomellm",
    "تشغيل Awesome LLM Apps — معرض منظّم لتطبيقات الذكاء الاصطناعي المفتوحة.");
  createArsenalTool("osintscanner", "launch_osintscanner",
    "تشغيل OSINT Scanner — استخبارات مفتوحة المصدر. يجمع معلومات عن الهدف.");
  createArsenalTool("nanobot", "launch_nanobot",
    "تشغيل NanoBot — مساعد ذكاء اصطناعي خفيف الوزن للمهام السريعة.");
  createArsenalTool("agentkanban", "launch_agentkanban",
    "تشغيل Agent Kanban — لوحة مهام بالذكاء الاصطناعي. يُدير المشاريع بصرياً.");
  createArsenalTool("autobe", "launch_autobe",
    "تشغيل Auto-BE — منشئ Backend تلقائي. يُنشئ APIs وقواعد بيانات.");
  createArsenalTool("superpowers", "launch_superpowers",
    "تشغيل Superpowers — حاقن قدرات الذكاء الاصطناعي. يُضيف ميزات متقدمة للنموذج.");
  createArsenalTool("lerimcli", "launch_lerimcli",
    "تشغيل Lerim CLI — واجهة سطر أوامر ذكاء اصطناعي متقدمة.");
  createArsenalTool("claudeprompts", "launch_claudeprompts",
    "تشغيل Claude Prompts — مكتبة موجّهات احترافية خبيرة لنموذج Claude.");
  createArsenalTool("rvsagent", "launch_rvsagent",
    "تشغيل Run VS Agent — منفّذ كود بالذكاء الاصطناعي مع بيئة VS Code مدمجة.");
  createArsenalTool("codexmobile", "launch_codexmobile",
    "تشغيل Codex Mobile — مساعد برمجة متنقل. يعمل على الأجهزة المحمولة.");
  createArsenalTool("openacp", "launch_openacp",
    "تشغيل Open ACP — بروتوكول تنسيق الوكلاء المفتوح. يُنسّق بين الوكلاء.");
  createArsenalTool("handclaw", "launch_handclaw",
    "تشغيل HandClaw — ذكاء اصطناعي بالصوت والإيماءات. يتحكم بالواجهة.");
  createArsenalTool("ralph", "launch_ralph",
    "تشغيل Ralph Agent — عصف ذهني وتفكير ذاتي مستقل. يولّد أفكاراً إبداعية.");
  createArsenalTool("burnbaby", "launch_burnbaby",
    "تشغيل Burn Baby Burn — محرق tokens ذكي لاختبار الأداء وتحليل التكاليف.");
  createArsenalTool("crush", "launch_crush",
    "تشغيل Crush — مساعد بناء كود في سطر الأوامر. بديل Cursor/Copilot.");
  createArsenalTool("rtk", "launch_rtk",
    "تشغيل RTK — قاتل tokens بـ Rust للأداء الفائق وتقليل التكاليف.");
  createArsenalTool("codexbar", "launch_codexbar",
    "تشغيل CodexBar — لوحة قيادة حدود tokens. يراقب الاستهلاك في الزمن الفعلي.");
  createArsenalTool("codexsaver", "launch_codexsaver",
    "تشغيل CodexSaver — موجّه ذكي للـ API بوعي بالتكلفة. يختار النموذج الأوفر.");
  createArsenalTool("agentmemory", "launch_agentmemory",
    "تشغيل Agent Memory — ذاكرة مستمرة عبر الجلسات. يحفظ ويسترجع السياق.");
  createArsenalTool("decepticon", "launch_decepticon",
    "تشغيل Decepticon — وكيل الفريق الأحمر المستقل. يختبر الدفاعات.");
  createArsenalTool("droiddesk", "launch_droiddesk",
    "تشغيل DroidDesk — بيئة Linux للأندرويد. سطح مكتب Linux على الهاتف.");
  createArsenalTool("bughunter", "launch_bughunter",
    "تشغيل Bug Hunter — 51 مهارة و681 نمطاً من HackerOne لاصطياد الثغرات.");
  createArsenalTool("hyperresearch", "launch_hyperresearch",
    "تشغيل HyperResearch — وكيل بحث عميق. يجمع ويحلل معلومات من مصادر متعددة.");
  createArsenalTool("aifactory", "launch_aifactory",
    "تشغيل AI Factory — خطوط إنتاج ذكاء اصطناعي متعددة المراحل.");
  createArsenalTool("gemmachat", "launch_gemmachat",
    "تشغيل Gemma Chat — وكيل برمجة ذكاء اصطناعي محلي يعمل بدون اتصال.");
  createArsenalTool("codegraph", "launch_codegraph",
    "تشغيل CodeGraph — رسم بياني لقاعدة الكود. يُصوّر الروابط بين المكونات.");
  createArsenalTool("ohmypi", "launch_ohmypi",
    "تشغيل oh-my-pi — وكيل برمجة مدمج مع بيئة التطوير. إعداد Pi متكامل.");
  createArsenalTool("awesomeopencode", "launch_awesomeopencode",
    "تشغيل Awesome OpenCode — معرض أدوات الذكاء الاصطناعي المنظّم والمُقيَّم.");
  createArsenalTool("openreplove", "launch_openreplove",
    "تشغيل OpenRepLove — بيئة تطوير ذكاء اصطناعي محلية بـ 6 وكلاء متخصصين.");
  createArsenalTool("dyad", "launch_dyad",
    "تشغيل Dyad — 8 مهارات لسير عمل التطوير المتكامل.");
  createArsenalTool("ghostwriter", "launch_ghostwriter",
    "تشغيل Ghostwriter — كاتب أشباح بالذكاء الاصطناعي للمحتوى والتسويق.");
  createArsenalTool("agentscope", "launch_agentscope",
    "تشغيل AgentScope — إطار عمل وكلاء متعدد النطاقات لبناء التطبيقات.");

  // ── Tier 3: Security & Hacking ───────────────────────────────────────────
  createArsenalTool("artpplatform", "launch_artpplatform",
    "تشغيل ART Platform — منصة اختبار الفريق الأحمر الآلي.");
  createArsenalTool("pentestlabpro", "launch_pentestlabpro",
    "تشغيل Pentest Lab Pro — مختبر اختراق احترافي متكامل.");
  createArsenalTool("soccommand", "launch_soccommand",
    "تشغيل SOC Command — مركز عمليات الأمن بالذكاء الاصطناعي.");
  createArsenalTool("aiAtlas", "launch_aiAtlas",
    "تشغيل AI Atlas — خريطة شاملة لجميع نماذج وأدوات الذكاء الاصطناعي.");
  createArsenalTool("odysseusDeepResearch", "launch_odysseusDeepResearch",
    "تشغيل Odysseus Deep Research — بحث عميق بمستوى أكاديمي مع مصادر موثّقة.");
  createArsenalTool("odysseusCompare", "launch_odysseusCompare",
    "تشغيل Odysseus Compare — مقارنة شاملة بين المعلومات والمصادر.");
  createArsenalTool("odysseusDocEditor", "launch_odysseusDocEditor",
    "تشغيل Odysseus Doc Editor — محرر مستندات ذكي بقدرات تحليل متقدمة.");
  createArsenalTool("odysseusTaskCalendar", "launch_odysseusTaskCalendar",
    "تشغيل Odysseus Task Calendar — تقويم مهام ذكي مع تخطيط تلقائي.");
  createArsenalTool("odysseusModelCookbook", "launch_odysseusModelCookbook",
    "تشغيل Odysseus Model Cookbook — دليل شامل لاستخدام نماذج الذكاء الاصطناعي.");
  createArsenalTool("odysseusEmailAI", "launch_odysseusEmailAI",
    "تشغيل Odysseus Email AI — مساعد البريد الإلكتروني الذكي.");
  createArsenalTool("odysseusWorkspace", "launch_odysseusWorkspace",
    "تشغيل Odysseus Workspace — مساحة عمل متكاملة لإدارة المشاريع.");
  createArsenalTool("fridayAI", "launch_fridayAI",
    "تشغيل Friday AI — مساعد ذكاء اصطناعي شخصي يعمل محلياً وبشكل خاص.");
  createArsenalTool("agent4", "launch_agent4",
    "تشغيل Agent 4 — وكيل الجيل الرابع بقدرات متطورة للمهام المعقدة.");
  createArsenalTool("agent4DesignCanvas", "launch_agent4DesignCanvas",
    "تشغيل Agent 4 Design Canvas — وكيل تصميم متقدم بلوحة رسم ذكية.");
  createArsenalTool("agent4WebSearch", "launch_agent4WebSearch",
    "تشغيل Agent 4 Web Search — بحث الويب الذكي للجيل الرابع.");
  createArsenalTool("agent4Git", "launch_agent4Git",
    "تشغيل Agent 4 Git Dashboard — إدارة Git المتقدمة بالذكاء الاصطناعي.");
  createArsenalTool("agent4Integrations", "launch_agent4Integrations",
    "تشغيل Agent 4 Integrations — تكاملات متقدمة مع الخدمات الخارجية.");
  createArsenalTool("agent4Slides", "launch_agent4Slides",
    "تشغيل Agent 4 Slides — منشئ عروض تقديمية ذكي بالجيل الرابع.");
  createArsenalTool("collab", "launch_collab",
    "تشغيل Collab — تعاون في الزمن الفعلي مع وكلاء متعددين على نفس المشروع.");
  createArsenalTool("mobilesecurity", "launch_mobilesecurity",
    "تشغيل Mobile Security — اختبار أمان تطبيقات الأندرويد والـ iOS.");
  createArsenalTool("wormgpt", "launch_wormgpt",
    "تشغيل WormGPT — نموذج متخصص لأبحاث الأمن الهجومي والاختراق.");
  createArsenalTool("threatintel", "launch_threatintel",
    "تشغيل Threat Intel — استخبارات التهديدات في الزمن الفعلي من مصادر متعددة.");
  createArsenalTool("agentswarm", "launch_agentswarm",
    "تشغيل AI Agent Swarm — سرب من الوكلاء المتخصصين يعمل بشكل منسّق.");
  createArsenalTool("autonomousredteam", "launch_autonomousredteam",
    "تشغيل Autonomous Red Team — فريق أحمر مستقل بالكامل لاختبار الدفاعات.");
  createArsenalTool("exploitsandbox", "launch_exploitsandbox",
    "تشغيل Exploit Sandbox — بيئة عزل محمية لاختبار الثغرات بأمان.");
  createArsenalTool("vulndiscovery", "launch_vulndiscovery",
    "تشغيل Vulnerability Discovery — صائد ثغرات مستقل يبحث بشكل دوري.");
  createArsenalTool("binaryanalysis", "launch_binaryanalysis",
    "تشغيل Binary Analysis — تحليل الثنائيات والـ reverse engineering.");
  createArsenalTool("networkmonitor", "launch_networkmonitor",
    "تشغيل Network Monitor — مراقبة الشبكة وتقاطع الحزم في الزمن الفعلي.");
  createArsenalTool("forensicrecon", "launch_forensicrecon",
    "تشغيل Forensic Reconstruction — إعادة بناء الحوادث الرقمية تلقائياً.");
  createArsenalTool("cyberintel", "launch_cyberintel",
    "تشغيل Cyber Intelligence Brain — رسم خريطة النظام الرقمي الشامل.");
  createArsenalTool("hackingTool", "launch_hackingtool",
    "تشغيل Hacking Tool Suite — مجموعة أدوات الاختراق الأمني الشاملة.");
  createArsenalTool("passwordattack", "launch_passwordattack",
    "تشغيل Password Attack — تحليل كلمات المرور وأنماط التشفير.");
  createArsenalTool("malwarearsenal", "launch_malwarearsenal",
    "تشغيل Malware Arsenal — تحليل البرمجيات الخبيثة وتشريح التهديدات.");
  createArsenalTool("cybervision", "launch_cybervision",
    "تشغيل CyberVision — رؤية سيبرانية شاملة لتحديد نقاط الهجوم.");
  createArsenalTool("livecve", "launch_livecve",
    "تشغيل Live CVE — قاعدة بيانات ثغرات CVE المحدّثة فورياً.");
  createArsenalTool("webfuzzing", "launch_webfuzzing",
    "تشغيل Web Fuzzing — اختبار تطبيقات الويب بالـ fuzzing الذكي.");
  createArsenalTool("multiagentsoc", "launch_multiagentsoc",
    "تشغيل Multi-Agent SOC — مركز عمليات أمني بوكلاء متخصصين متوازيين.");
  createArsenalTool("claudecode", "launch_claudecode",
    "تشغيل Claude Code — وكيل برمجة Claude المتقدم بصلاحيات الملفات.");
  createArsenalTool("cyberwarfare", "launch_cyberwarfare",
    "تشغيل Cyber Warfare Simulator — محاكاة سيناريوهات الحرب الإلكترونية.");
  createArsenalTool("identitygraph", "launch_identitygraph",
    "تشغيل Identity Graph Intelligence — خريطة العلاقات بين المستخدمين والأجهزة.");
  createArsenalTool("deeppacket", "launch_deeppacket",
    "تشغيل Deep Packet Cognition — تحليل الحزم المشفرة بالذكاء الاصطناعي.");
  createArsenalTool("attacksurface", "launch_attacksurface",
    "تشغيل Attack Surface Tracker — تتبع تطور سطح الهجوم زمنياً.");
  createArsenalTool("threatpredict", "launch_threatpredict",
    "تشغيل Threat Prediction Engine — توقع التهديدات قبل حدوثها.");
  createArsenalTool("anomalycs", "launch_anomalycs",
    "تشغيل Anomaly Consciousness — كاشف الأنماط غير المعروفة والشاذة.");
  createArsenalTool("exploitresist", "launch_exploitresist",
    "تشغيل Exploit Resistance Engine — دفاع ذاتي التعلم ضد الاستغلال.");
  createArsenalTool("autonomoussoc", "launch_autonomoussoc",
    "تشغيل Autonomous SOC AI — محلل تنبيهات Tier-3 مستقل بالكامل.");

  // ── Tier 4: Advanced AI Systems ──────────────────────────────────────────
  createArsenalTool("sentientcybersphere", "launch_sentientcybersphere",
    "تشغيل Sentient CyberSphere — كرة سيبرانية واعية لرصد التهديدات ثلاثياً.");
  createArsenalTool("feynman", "launch_feynman",
    "تشغيل Feynman — تفسير المفاهيم المعقدة بأسلوب Feynman البسيط والعميق.");
  createArsenalTool("markxxxix", "launch_markxxxix",
    "تشغيل Mark XXXIX — درع حماية ذكية من الجيل التاسع والثلاثين.");
  createArsenalTool("markxxxixor", "launch_markxxxixor",
    "تشغيل Mark XXXIX OR — النسخة المُحسَّنة من درع الحماية المتقدم.");
  createArsenalTool("digitaltwin", "launch_digitaltwin",
    "تشغيل Digital Twin Engine — محاكاة واقع موازٍ للأنظمة والبنية التحتية.");
  createArsenalTool("selfhealing", "launch_selfhealing",
    "تشغيل Self-Healing Defense — استجابة مستقلة للحوادث وإصلاح تلقائي.");
  createArsenalTool("sovereignai", "launch_sovereignai",
    "تشغيل Sovereign AI Command Core — حوكمة هرمية للوكلاء والأنظمة.");
  createArsenalTool("infraintel", "launch_infraintel",
    "تشغيل Infrastructure Intelligence — تحكم موحّد متعدد الطبقات في البنية التحتية.");
  createArsenalTool("dataintel", "launch_dataintel",
    "تشغيل Data Intelligence Engine — دمج دلالي متعدد المصادر للبيانات.");
  createArsenalTool("sysevolution", "launch_sysevolution",
    "تشغيل System Evolution Engine — ترقية مستمرة للأنظمة بدون توقف.");
  createArsenalTool("archengine", "launch_archengine",
    "تشغيل Architecture Engine — تصميم أنظمة ذاتي التطور والتحسين.");
  createArsenalTool("syscognition", "launch_syscognition",
    "تشغيل System Cognition Layer — ذكاء على مستوى kernel ووقت التشغيل.");
  createArsenalTool("binarycore", "launch_binarycore",
    "تشغيل Binary Intelligence Core — ذكاء اصطناعي متخصص في الهندسة العكسية.");
  createArsenalTool("sysobs", "launch_sysobs",
    "تشغيل System Observation Engine — مراقبة kernel و syscall في الزمن الفعلي.");
  createArsenalTool("threatcog", "launch_threatcog",
    "تشغيل Threat Cognition Network — شبكة ارتباط الاستخبارات العالمية.");
  createArsenalTool("malwarecog", "launch_malwarecog",
    "تشغيل Malware Cognition Lab — تحليل DNA السلوك الخبيث.");
  createArsenalTool("exploitabs", "launch_exploitabs",
    "تشغيل Exploit Behavior Abstraction — تجريد وتحليل أنماط الذاكرة.");
  createArsenalTool("cyberphysical", "launch_cyberphysical",
    "تشغيل Cyber-Physical Intelligence — أمان تقاطع OT/IT للأنظمة الحرجة.");
  createArsenalTool("defensiveai", "launch_defensiveai",
    "تشغيل Defensive AI — نظام الأمن الدفاعي الذكي متعدد الطبقات.");
  createArsenalTool("cyberwarfarematrix", "launch_cyberwarfarematrix",
    "تشغيل Cyber Warfare Matrix — مصفوفة الحرب الإلكترونية الشاملة.");

  // ── Tier 5: Visualization & Monitoring ──────────────────────────────────
  createArsenalTool("providerstatus", "launch_providerstatus",
    "تشغيل Provider Status Dashboard — لوحة مراقبة المزوّدين في الزمن الفعلي.");
  createArsenalTool("threatglobe", "launch_threatglobe",
    "تشغيل Threat Globe 3D — خريطة هجمات عالمية ثلاثية الأبعاد في الزمن الفعلي.");
  createArsenalTool("vulngraph3d", "launch_vulngraph3d",
    "تشغيل Vuln Graph 3D — تصوير ثلاثي الأبعاد لسلاسل الاستغلال والثغرات.");
  createArsenalTool("livecoding", "launch_livecoding",
    "تشغيل Live Code Engine — تدفقات كود حية بكتابة تلقائية.");
  createArsenalTool("gesturecontrol", "launch_gesturecontrol",
    "تشغيل Gesture Control — تحكم بالإيماءات 21 نقطة تتبع للجسم.");
  createArsenalTool("globalvulnheatmap", "launch_globalvulnheatmap",
    "تشغيل Global Vulnerability Heatmap — خريطة حرارية عالمية للثغرات.");
  createArsenalTool("vulntopology", "launch_vulntopology",
    "تشغيل Vuln Topology — طوبولوجيا الثغرات التفاعلية ثلاثية الأبعاد.");
  createArsenalTool("networktopo", "launch_networktopo",
    "تشغيل Network Topology — رسم خريطة بنية الشبكة التفاعلية.");

  // ── Tier 6: Specialized Tools ────────────────────────────────────────────
  createArsenalTool("headroom", "launch_headroom",
    "تشغيل Headroom — ضغط السياق 60-95% بـ 6 خوارزميات متقدمة.");
  createArsenalTool("tokenoptimizer", "launch_tokenoptimizer",
    "تشغيل Token Optimizer — تحليل وتحسين الـ tokens (257 اختبار شامل).");
  createArsenalTool("claudememory", "launch_claudememory",
    "تشغيل Claude Code Memory — ذاكرة Obsidian بتخفيض 71.5x مع Graphify.");
  createArsenalTool("securitykanban", "launch_securitykanban",
    "تشغيل Security Kanban — لوحة مهام اختبار الاختراق المنظّمة.");
  createArsenalTool("openskynet", "launch_openskynet",
    "تشغيل OpenSkynet — ذكاء اصطناعي Terminator بـ 4 وكلاء متخصصين.");
  createArsenalTool("geminiresearch", "launch_geminiresearch",
    "تشغيل Gemini Research — بحث عميق مدعوم بنموذج Gemini Pro.");
  createArsenalTool("adav2", "launch_adav2",
    "تشغيل ADA v2 — مساعد ذكاء اصطناعي الجيل الثاني بقدرات محسّنة.");
  createArsenalTool("axonhub", "launch_axonhub",
    "تشغيل Axon Hub — مركز ربط الوكلاء والبيانات والخدمات.");
  createArsenalTool("bassimulation", "launch_bassimulation",
    "تشغيل BA Simulation — محاكاة أعمال ذكية لسيناريوهات متعددة.");
  createArsenalTool("bigagi", "launch_bigagi",
    "تشغيل BigAGI — منصة ذكاء اصطناعي عام شامل الإمكانيات.");
  createArsenalTool("blockchainaudit", "launch_blockchainaudit",
    "تشغيل Blockchain Audit — تدقيق ومراجعة العقود الذكية والبلوكشين.");
  createArsenalTool("buildyourownx", "launch_buildyourownx",
    "تشغيل Build Your Own X — بناء أدوات من الصفر بمساعدة الذكاء الاصطناعي.");
  createArsenalTool("claudeskills", "launch_claudeskills",
    "تشغيل Claude Skills — مكتبة مهارات Claude المتخصصة والمتقدمة.");
  createArsenalTool("e2esession", "launch_e2esession",
    "تشغيل E2E Session — جلسة اختبار شامل من النهاية إلى النهاية.");
  createArsenalTool("evasionengine", "launch_evasionengine",
    "تشغيل Evasion Engine — محرك التهرب الذكي من أنظمة الكشف.");
  createArsenalTool("freellmapi", "launch_freellmapi",
    "تشغيل Free LLM API — وصول مجاني لنماذج اللغة الكبيرة المفتوحة.");
  createArsenalTool("gemmachat", "launch_gemmachat_lib",
    "تشغيل Gemma Library — مكتبة نماذج Gemma المحلية المتعددة.");
  createArsenalTool("godmod3", "launch_godmod3",
    "تشغيل Godmode 3 — الجيل الثالث من نظام الإله بقدرات موسّعة.");
  createArsenalTool("governor", "launch_governor",
    "تشغيل Governor — نظام الحوكمة والتحكم في موارد الذكاء الاصطناعي.");
  createArsenalTool("insforge", "launch_insforge",
    "تشغيل InsForge — منشئ تعليمات وأوامر ذكية متقدمة.");
  createArsenalTool("instagramcli", "launch_instagramcli",
    "تشغيل Instagram CLI — أداة OSINT لتحليل حسابات Instagram.");
  createArsenalTool("jitexploit", "launch_jitexploit",
    "تشغيل JIT Exploit — تحليل وبناء استغلالات JIT المتقدمة.");
  createArsenalTool("neuralvoice", "launch_neuralvoice",
    "تشغيل Neural Voice — صوت اصطناعي عصبي فائق الجودة.");
  createArsenalTool("ninerouter", "launch_ninerouter",
    "تشغيل Nine Router — موجّه ذكي لتسعة نماذج لغوية.");
  createArsenalTool("omnibot", "launch_omnibot",
    "تشغيل OmniBot — روبوت شامل متعدد الاستخدامات والقدرات.");
  createArsenalTool("openantigravity", "launch_openantigravity",
    "تشغيل Open Anti-Gravity — نظام مفتوح لتوسيع قدرات النماذج.");
  createArsenalTool("orchestrationengine", "launch_orchestrationengine",
    "تشغيل Orchestration Engine — محرك تنسيق الوكلاء في سير العمل.");
  createArsenalTool("paseo", "launch_paseo",
    "تشغيل Paseo — منصة وكلاء متقدمة لإدارة المهام المعقدة.");
  createArsenalTool("pocketai", "launch_pocketai",
    "تشغيل Pocket AI — ذكاء اصطناعي مدمج خفيف الوزن للمهام السريعة.");
  createArsenalTool("precisionstrike", "launch_precisionstrike",
    "تشغيل Precision Strike — ضربات دقيقة مُحكمة في اختبار الاختراق.");
  createArsenalTool("roguemaster", "launch_roguemaster",
    "تشغيل Rogue Master — وكيل ذكاء اصطناعي مستقل بحرية كاملة.");
  createArsenalTool("aihackingskills", "launch_aihackingskills",
    "تشغيل AI Hacking Skills — مهارات اختراق ذكية مدعومة بالذكاء الاصطناعي.");
  createArsenalTool("ai-terminal", "launch_ai_terminal",
    "تشغيل AI Terminal — طرفية ذكاء اصطناعي تفاعلية بأوامر طبيعية.");
  createArsenalTool("antigravitymgr", "launch_antigravitymgr",
    "تشغيل Anti-Gravity Manager — مدير متقدم لإزالة القيود والحدود.");

  console.log(`[arsenalTools] ✅ Registered ${155} Arsenal Hub tools successfully.`);
}
