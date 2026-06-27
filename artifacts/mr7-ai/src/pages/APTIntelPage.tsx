/**
 * APTIntelPage — مركز استخبارات التهديدات المتقدمة النخبة
 * APTs · Zero-Day · Supply Chain · Advanced Malware · Evasion · ICS/SCADA · Defense · Next-Gen
 */
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Target, Eye, Search, Globe, Lock, Zap, Network, Terminal,
  Users, Database, Radio, Cpu, Activity, AlertTriangle, ChevronRight,
  X, Server, Code2, Bug, FileCode, Hash, Link, Clock, Share2, Siren,
  Layers, GitBranch, Scan, Monitor, Key, Fingerprint, Radar, BarChart3,
  RefreshCw, BookOpen, Wifi, Camera, Mail,
} from "lucide-react";

// ─── SECTIONS ────────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "overview",      label: "نظرة عامة",           icon: "◈", color: "#e21227" },
  { id: "apts",          label: "مجموعات APT",          icon: "⬡", color: "#a855f7" },
  { id: "exploits",      label: "Zero-Day & استغلال",  icon: "◆", color: "#f97316" },
  { id: "supplychain",   label: "هجمات سلسلة التوريد", icon: "⊕", color: "#f59e0b" },
  { id: "osint_adv",     label: "OSINT النخبة",         icon: "◉", color: "#00e5ff" },
  { id: "malware",       label: "البرمجيات الخبيثة",   icon: "⬢", color: "#ec4899" },
  { id: "evasion",       label: "التخفي المتقدم",       icon: "▣", color: "#10b981" },
  { id: "ics",           label: "ICS/SCADA",            icon: "⊙", color: "#ef4444" },
  { id: "defense",       label: "الدفاع النخبة",        icon: "◈", color: "#22d3ee" },
  { id: "nextgen",       label: "التهديدات القادمة",   icon: "⬟", color: "#8b5cf6" },
];

const SEV: Record<string, string> = {
  CRITICAL: "#e21227", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#22d3ee", INFO: "#6b7280",
};

// ─── APT GROUPS DATA ──────────────────────────────────────────────────────────
const APT_GROUPS = [
  {
    id: "equation", name: "Equation Group", origin: "NSA — الوكالة الأمنية القومية الأمريكية",
    color: "#00e5ff", icon: "◈", threat: "CRITICAL", active: "2001–الآن",
    targets: "البنية التحتية العالمية، الحكومات، المؤسسات النووية",
    desc: "أكثر مجموعات التهديد تطوراً في العالم — تمتلك أدوات اختراق لا مثيل لها تعمل على مستوى firmware القرص الصلب",
    techniques: [
      { name: "HDD Firmware Implants", detail: "زرع برمجيات خبيثة في firmware القرص الصلب — تنجو من إعادة تثبيت نظام التشغيل والتهيئة الكاملة", icon: Cpu },
      { name: "DoubleFantasy / TripleFantasy", detail: "منصات استطلاع تُحدد هوية الضحية قبل تثبيت الأدوات الكاملة — تجنباً للاكتشاف", icon: Eye },
      { name: "GrayFish Rootkit", detail: "rootkit يعمل في VBR (Volume Boot Record) — يُخفي نفسه قبل تحميل نظام التشغيل بالكامل", icon: Monitor },
      { name: "EQUATIONDRUG / DOUBLEDIGIT", detail: "منصة خبيثة معيارية تدعم 2000+ plugin — كل ضحية تحصل على payload مختلف", icon: Layers },
      { name: "FANNY Worm", detail: "دودة تنتشر عبر USB في شبكات معزولة — جمعت معلومات عن Stuxnet قبل إطلاقه", icon: Radio },
      { name: "Listening Post Infrastructure", detail: "شبكة Command & Control شاملة عبر 300+ domain في 30+ دولة بنطاقات تعمل كـ relay", icon: Server },
    ],
    tools: ["EternalBlue", "EternalRomance", "DoublePulsar", "GrayFish", "EquationDrug", "TripleFantasy"],
    notableOps: ["Operation Buckshot Yankee", "Stuxnet (مشترك مع Unit 8200)", "Shadow Brokers Leak 2016"],
  },
  {
    id: "apt41", name: "APT41 / Winnti / Double Dragon", origin: "الصين — وزارة أمن الدولة",
    color: "#f59e0b", icon: "⬡", threat: "CRITICAL", active: "2012–الآن",
    targets: "الشركات التقنية، شركات الألعاب، الرعاية الصحية، الاتصالات",
    desc: "مجموعة فريدة تجمع التجسس المدعوم حكومياً مع الجرائم الإلكترونية المالية — مزدوجة الأهداف",
    techniques: [
      { name: "Supply Chain Attacks", detail: "اختراق شركات التطوير وحقن كود خبيث في تحديثات شرعية — ASUS Live Update, NoxPlayer", icon: GitBranch },
      { name: "Winnti Malware Platform", detail: "rootkit kernel-mode شديد التطور مع C2 مشفر وقدرات DLL hijacking متقدمة", icon: Bug },
      { name: "ShadowHammer Operation", detail: "نشر أداة ASUS Live Update الخبيثة على 500,000+ جهاز — فقط 600 هدف محدد مُفعَّل", icon: Target },
      { name: "CCleaner Poisoning", detail: "حقن backdoor في CCleaner الشرعي — وصل إلى 2.27 مليون مستخدم قبل الاكتشاف", icon: Code2 },
      { name: "Financial Crime Parallel", detail: "تشغيل عمليات مالية خبيثة موازية: ابتزاز ألعاب إلكترونية، عملات رقمية، بيانات مسربة", icon: Database },
      { name: "ProxyLogon Exploitation", detail: "أول من استغل ثغرات Microsoft Exchange CVE-2021-26855 قبل الإصلاح بأسبوع", icon: Zap },
    ],
    tools: ["Winnti", "ShadowHammer", "Crosswalk", "MessageTap", "HIGHNOON", "POISONPLUG"],
    notableOps: ["Operation ShadowHammer", "CCleaner Backdoor", "ProxyLogon", "Operation CuckooBees"],
  },
  {
    id: "lazarus", name: "Lazarus Group / Hidden Cobra", origin: "كوريا الشمالية — RGB مكتب الاستطلاع العام",
    color: "#e21227", icon: "◆", threat: "CRITICAL", active: "2007–الآن",
    targets: "البنوك العالمية، بورصات العملات الرقمية، البنية التحتية الحيوية",
    desc: "ذراع كوريا الشمالية الإلكترونية — تموّل 40% من برنامج الأسلحة عبر سرقات إلكترونية بمليارات الدولارات",
    techniques: [
      { name: "SWIFT Network Attacks", detail: "سرقة 81 مليون دولار من بنك بنغلاديش المركزي عبر شبكة SWIFT — أكبر سطو بنكي إلكتروني", icon: Database },
      { name: "DeFi & Crypto Exchange Hacks", detail: "سرقة 1.7 مليار دولار من بورصات العملات الرقمية عام 2022 وحده — Ronin Network, Harmony", icon: Hash },
      { name: "WannaCry Ransomware", detail: "هجوم WannaCry 2017 — أصاب 230,000 نظام في 150 دولة بما فيها NHS البريطانية", icon: Siren },
      { name: "AppleJeus & Fake Job Offers", detail: "برنامج خبيث مخفي في محافظ عملات رقمية مزيفة وعروض عمل وهمية لمطوري blockchain", icon: Monitor },
      { name: "Maui Ransomware", detail: "ransomware مستهدف للمستشفيات والرعاية الصحية الأمريكية — اعتُبر تهديداً للأمن القومي", icon: AlertTriangle },
      { name: "TraderTraitor Campaign", detail: "استهداف موظفي شركات blockchain عبر LinkedIn بعروض عمل مزيفة تحمل إصابات macOS", icon: Users },
    ],
    tools: ["WannaCry", "Maui", "AppleJeus", "BLINDINGCAN", "HOPLIGHT", "ELECTRICFISH"],
    notableOps: ["Sony Pictures Hack", "Bangladesh Bank Heist", "WannaCry", "Ronin Network ($625M)"],
  },
  {
    id: "sandworm", name: "Sandworm / Voodoo Bear", origin: "روسيا — GRU Unit 74455 الاستخبارات العسكرية",
    color: "#10b981", icon: "⊙", threat: "CRITICAL", active: "2009–الآن",
    targets: "البنية التحتية الحيوية، شبكات الكهرباء، الانتخابات، الحكومات",
    desc: "المجموعة الأكثر تدميراً في تاريخ الحرب الإلكترونية — أوقفت الكهرباء عن ملايين الأشخاص",
    techniques: [
      { name: "BlackEnergy & Industroyer", detail: "إطارا عمل لاختراق شبكات الكهرباء — أوقفا الكهرباء عن 225,000 أسرة أوكرانية 2015/2016", icon: Zap },
      { name: "NotPetya Wiper", detail: "أكثر هجوم إلكتروني تدميراً في التاريخ — خسائر 10+ مليار دولار، دمّر Maersk وMerck وFedEx", icon: Bug },
      { name: "Olympic Destroyer", detail: "هجوم دمّر البنية التحتية للألعاب الأولمبية 2018 — خططه ببراعة لإيهام بتورط كوريا الشمالية", icon: Target },
      { name: "Election Infrastructure Attacks", detail: "اختراق بنية الانتخابات الأوكرانية وMacron Campaign — تلاعب بالمعلومات وتسريب وثائق", icon: Radar },
      { name: "Cyclops Blink Botnet", detail: "botnet يصيب routers WatchGuard وASUS — 1000+ جهاز في 30+ دولة كـ staging servers", icon: Network },
      { name: "Industroyer2 (2022)", detail: "إطار عمل جديد استهدف شبكات الكهرباء الأوكرانية أثناء الحرب — أُوقف قبل التنفيذ", icon: Server },
    ],
    tools: ["BlackEnergy", "Industroyer", "NotPetya", "Olympic Destroyer", "Cyclops Blink", "Industroyer2"],
    notableOps: ["Ukraine Power Grid Attacks", "NotPetya", "Olympic Destroyer", "Industroyer2"],
  },
  {
    id: "apt28", name: "APT28 / Fancy Bear / Sofacy", origin: "روسيا — GRU Unit 26165 وحدة الاستخبارات العسكرية",
    color: "#f97316", icon: "◆", threat: "CRITICAL", active: "2004–الآن",
    targets: "حكومات أوروبا وأمريكا، حملات انتخابية، ناتو، صناعة الدفاع، وكالات أنباء",
    desc: "ذراع الحرب الإلكترونية السياسية للـ GRU الروسي — اختراق الانتخابات الأمريكية 2016 وحملات الناتو ومنظمات الدفاع",
    techniques: [
      { name: "Sofacy / X-Agent Malware", detail: "إطار خبيث معياري متعدد المنصات: Windows, Linux, iOS, Android — مع تشفير قنوات C2 متقدم", icon: Bug },
      { name: "Spear Phishing + 0-Day", detail: "حملات تصيد مُصممة خصيصاً مع ثغرات Zero-Day في Office وFlash وWindows", icon: Mail },
      { name: "DNC Hack 2016", detail: "اختراق اللجنة الوطنية الديمقراطية وحملة هيلاري كلينتون — تسريب 19,000 رسالة عبر DCLeaks وWikiLeaks", icon: Users },
      { name: "VPNFilter Botnet", detail: "إصابة 500,000+ router في 54 دولة — قادر على تدمير الأجهزة وتعطيل الإنترنت في مناطق واسعة", icon: Network },
      { name: "Credential Phishing (Phishery)", detail: "صفحات تصيد متطورة تستهدف بيانات Office 365 وGoogle — مع bypass للمصادقة الثنائية", icon: Key },
      { name: "LOJAX UEFI Rootkit", detail: "أول rootkit UEFI مستخدم في هجمات حقيقية — يبقى بعد إعادة تثبيت نظام التشغيل وتهيئة القرص", icon: Cpu },
    ],
    tools: ["X-Agent", "Sofacy", "VPNFilter", "LOJAX", "Seduploader", "Zebrocy", "LoJax"],
    notableOps: ["DNC Hack 2016", "Macron Campaign Hack", "Bundestag Hack 2015", "WADA Data Leak"],
  },
  {
    id: "apt29", name: "APT29 / Cozy Bear / Midnight Blizzard", origin: "روسيا — SVR جهاز الاستخبارات الخارجية",
    color: "#8b5cf6", icon: "⬢", threat: "CRITICAL", active: "2008–الآن",
    targets: "الحكومات الغربية، السفارات، مراكز الأبحاث، شركات التكنولوجيا، المنظمات الدولية",
    desc: "الجهاز الأكثر صبراً وتطوراً — يصمد لسنوات في الشبكات المُخترقة دون اكتشاف مع TTPs تفوق معظم أجهزة الاستخبارات",
    techniques: [
      { name: "MiniDuke / CozyDuke Malware", detail: "برمجيات خبيثة تستخدم Twitter وReddit وGitHub كـ C2 — تخفي الأوامر في صور GIF", icon: Bug },
      { name: "SolarWinds SUNBURST (مشترك)", detail: "أكثر هجوم استخباراتي تطوراً — 18,000+ ضحية بما فيها 9 وزارات أمريكية وMicrosoft", icon: Target },
      { name: "Microsoft 365 Tenant Hijack", detail: "2023: اختراق حسابات بريد Microsoft لمسؤولين تنفيذيين رفيعي المستوى عبر Password Spraying", icon: Lock },
      { name: "Cloud Lateral Movement", detail: "بعد الدخول الأولي — التحرك الجانبي في بيئات Azure AD وMicrosoft 365 دون رفع تنبيهات", icon: Server },
      { name: "Living off the Land", detail: "استخدام أدوات نظام Windows الشرعية: PowerShell, WMI, CertUtil — لا malware مخصص", icon: Monitor },
      { name: "Long-term Persistence", detail: "الاختباء لسنوات: إعادة بناء backdoors بعد اكتشافها، تنويع نقاط الدخول، تشفير متعدد الطبقات", icon: Clock },
    ],
    tools: ["MiniDuke", "CozyDuke", "SUNBURST", "WellMess", "Sliver", "Cobalt Strike (modified)"],
    notableOps: ["SolarWinds 2020", "Microsoft Breach 2023", "RNC Hack 2016", "USAID Phishing 2021"],
  },
  {
    id: "fin7", name: "FIN7 / Carbanak / Carbon Spider", origin: "متعدد الجنسيات — منظمة إجرامية مالية",
    color: "#22d3ee", icon: "⊕", threat: "CRITICAL", active: "2013–الآن",
    targets: "سلاسل المطاعم، متاجر التجزئة، بنوك، فنادق، شركات أمريكية وأوروبية",
    desc: "أكثر مجموعات الجريمة الإلكترونية المالية ربحاً — سرقت أكثر من مليار دولار من 100+ شركة في 40+ دولة",
    techniques: [
      { name: "Carbanak Banking Malware", detail: "rootkit يستهدف بنوك — يتحكم في ATMs لإخراج الأموال وتحويلات SWIFT غير مصرح بها", icon: Database },
      { name: "Point-of-Sale Malware", detail: "اختراق نظام POS في Chipotle وWendy's وArby's — سرقة ملايين بيانات بطاقات ائتمان", icon: Hash },
      { name: "Spear Phishing HR Departments", detail: "رسائل طلبات توظيف مزيفة تحمل Word docs خبيثة استهدفت أقسام الموارد البشرية", icon: Mail },
      { name: "BOOSTWRITE In-memory", detail: "loader خبيث يعمل كلياً في الذاكرة — لا يكتب على القرص تماماً، يتجاوز EDR وAV", icon: Cpu },
      { name: "Griffon JS Backdoor", detail: "backdoor JavaScript خفيف الوزن يختبئ في عمليات نظام شرعية — استطلاع مستمر بدون اكتشاف", icon: Code2 },
      { name: "REVIL Ransomware Partnership", detail: "2020+: التعاون مع مجموعة REvil لشن هجمات ransomware بعد إتقان الاختراق الأولي", icon: AlertTriangle },
    ],
    tools: ["Carbanak", "BOOSTWRITE", "Griffon", "DICELOADER", "PILLOWMINT", "PowerPlant"],
    notableOps: ["Carbanak Bank Heists ($1B+)", "Chipotle Breach", "Restaurant POS Campaign", "REvil Collaboration"],
  },
  {
    id: "apt1", name: "APT1 / Comment Crew / Unit 61398", origin: "الصين — جيش التحرير الشعبي، الوحدة 61398",
    color: "#ef4444", icon: "▣", threat: "HIGH", active: "2006–2013+ (وثّق) / مستمر",
    targets: "القطاع الدفاعي الأمريكي، الفضاء، الاتصالات، الطاقة، التكنولوجيا",
    desc: "أول APT يُوثَّق ويُنسَب علناً — تقرير Mandiant 2013 كشف بنيتها التحتية الكاملة في شنغهاي مع أسماء عناصرها",
    techniques: [
      { name: "Spear Phishing + ZIP Malware", detail: "ملفات ZIP تحتوي APT1 custom backdoors: WEBC2, BISCUIT, MANITSME — مُرسلة من domains مزيفة", icon: Mail },
      { name: "WEBC2 Backdoor", detail: "backdoor يستخدم HTTP للتواصل مع C2 مخفياً كـ web browsing عادي — يتجاوز IDS", icon: Globe },
      { name: "Long-term Dwell Time", detail: "متوسط بقاء في الشبكة: 356 يوماً — أطول حالة 1,764 يوماً (5 سنوات دون اكتشاف)", icon: Clock },
      { name: "English Language Speakers", detail: "فريق يتحدث الإنجليزية بطلاقة لإدارة العمليات واختراق المنظمات الناطقة بالإنجليزية", icon: Users },
      { name: "Credential Harvesting Focus", detail: "هدف أساسي: بيانات الاعتماد للوصول لـ emails والنظم الداخلية — مئات GBs من الوثائق الحساسة", icon: Key },
      { name: "Mandiant Attribution 2013", detail: "أول كشف علني يُحدد عنوان IP ومبنى فعلي في شنغهاي — غيّر قواعد الإسناد السيبراني للأبد", icon: Radar },
    ],
    tools: ["WEBC2", "BISCUIT", "MANITSME", "GETMAIL", "MAPIGET", "GlooxMail"],
    notableOps: ["Mandiant APT1 Report 2013", "Aerospace & Defense Data Theft", "TELCO Campaign", "Energy Sector Espionage"],
  },
];

// ─── ZERO-DAY & EXPLOIT FRAMEWORKS ───────────────────────────────────────────
const EXPLOIT_FRAMEWORKS = [
  {
    id: "nsa_fuzzing", name: "NSA's Fuzzing Bunch", src: "NSA TAO — تسريب Shadow Brokers 2017",
    color: "#e21227", threat: "CRITICAL",
    desc: "مجموعة أدوات استغلال Windows من NSA — مسرّبة من Shadow Brokers تضم أقوى أسلحة إلكترونية حكومية",
    tools: [
      { name: "EternalBlue (MS17-010)", detail: "ثغرة SMB أدت إلى WannaCry وNotPetya — اختراق Windows XP–2008 دون تفاعل مستخدم" },
      { name: "EternalRomance", detail: "استغلال SMBv1 مختلف، أكثر موثوقية من EternalBlue ضد Windows Vista–2016 Server" },
      { name: "DoublePulsar", detail: "kernel backdoor يُزرع بعد EternalBlue — يسمح بتنفيذ أي payload في Ring 0" },
      { name: "EnglishmanDentist", detail: "exploit لـ Microsoft Exchange يعمل دون مصادقة — اختراق خوادم البريد الشركات" },
      { name: "EsteemAudit", detail: "exploit لـ Windows Remote Desktop (RDP) في XP وServer 2003 — اختراق كامل" },
      { name: "DanderSpritz", detail: "إطار post-exploitation كامل لإدارة الأنظمة المخترقة بعد النجاح — أكثر تقدماً من Metasploit" },
    ],
  },
  {
    id: "vault7", name: "CIA's Vault 7", src: "CIA — تسريب WikiLeaks 2017",
    color: "#a855f7", threat: "CRITICAL",
    desc: "أدوات اختراق CIA الشاملة — تغطي Windows وLinux وmacOS وiOS وAndroid وSmart TVs والأجهزة الذكية",
    tools: [
      { name: "Weeping Angel (Smart TV)", detail: "تحويل Samsung Smart TV إلى جهاز تنصت حتى في وضع الإيقاف — يُسجّل الصوت ويُرسله" },
      { name: "Marble Framework", detail: "إخفاء بصمة الاستخبارات الأمريكية وإسنادها لدول أخرى (روسيا/الصين/كوريا) — Anti-Attribution" },
      { name: "HIVE C2 Infrastructure", detail: "بنية تحتية لـ Command & Control تستخدم شهادات SSL مزيفة وVPS مجهول الهوية" },
      { name: "Grasshopper (Windows)", detail: "إطار لبناء implants مخصصة لـ Windows تتجاوز Windows Defender وESET وKaspersky" },
      { name: "Fine Dining", detail: "26 تطبيقاً شرعياً معدّلة لتنفيذ payloads — يبدو العميل يستخدم برامج عادية" },
      { name: "Pandemic", detail: "يحوّل Windows File Server إلى نقطة توزيع للـ malware — كل من يطلب ملفاً يحصل على نسخة ملوثة" },
    ],
  },
  {
    id: "advanced_vulns", name: "ثغرات Hardware المتقدمة", src: "بحث أكاديمي وأبحاث أمنية",
    color: "#f97316", threat: "HIGH",
    desc: "ثغرات على مستوى العتاد المادي تتجاوز أي نظام تشغيل أو برنامج حماية",
    tools: [
      { name: "Rowhammer Attack", detail: "استغلال التسرب الكهربائي في خلايا RAM المجاورة لتغيير bits — اختراق سندات الأذونات والذاكرة المحمية" },
      { name: "Spectre & Meltdown", detail: "استغلال التنفيذ التخميني في المعالجات — قراءة ذاكرة kernel والعمليات الأخرى من user space" },
      { name: "BlueKeep (CVE-2019-0708)", detail: "ثغرة RDP قابلة للانتشار الذاتي (Wormable) في Windows XP/7/2003/2008 دون مصادقة" },
      { name: "Zerologon (CVE-2020-1472)", detail: "تجاوز مصادقة Active Directory الكاملة واستبدال كلمة مرور Domain Controller في ثوانٍ" },
      { name: "Log4Shell (CVE-2021-44228)", detail: "ثغرة JNDI Injection في Log4j — تأثرت آلاف الخدمات: Apple, Amazon, Tesla, Cisco" },
      { name: "PrintNightmare (CVE-2021-1675)", detail: "تنفيذ كود بصلاحيات SYSTEM عبر Windows Print Spooler — يعمل على كل Windows" },
    ],
  },
  {
    id: "cobalt_strike", name: "Cobalt Strike", src: "Fortra (سابقاً Strategic Cyber LLC)",
    color: "#f59e0b", threat: "CRITICAL",
    desc: "منصة Red Team الأكثر استخداماً عالمياً — تُستخدم من مجموعات APT والجرائم الإلكترونية بنسخ مسرّبة وكذلك من فرق الأمان المرخصة",
    tools: [
      { name: "Beacon Payload", detail: "implant متكامل يدعم HTTP/S, DNS, SMB, TCP — يُلبَّس في ملفات Office وEXE وDLL مع obfuscation كامل" },
      { name: "Malleable C2 Profiles", detail: "تخصيص كامل لحركة الشبكة — محاكاة حركة Google Analytics أو OneDrive أو أي خدمة شرعية" },
      { name: "Aggressor Script", detail: "لغة scripting كاملة لأتمتة العمليات وإضافة TTPs مخصصة وتكاملات متقدمة" },
      { name: "Lateral Movement Suite", detail: "Pass-the-Hash, Pass-the-Ticket, Kerberoasting, DCSync — حركة جانبية متكاملة في Active Directory" },
      { name: "OPSEC Features", detail: "Sleep masks, heap spray, process injection في processe شرعية — تجاوز EDR المتقدم" },
      { name: "Team Server Collaboration", detail: "عمل جماعي: فريق Red Team كامل يشترك بنفس الـ C2 مع سجل كامل لكل العمليات" },
    ],
  },
  {
    id: "canvas", name: "CANVAS / Immunity CANVAS", src: "Immunity Inc.",
    color: "#10b981", threat: "HIGH",
    desc: "منصة استغلال احترافية تنافس Metasploit بقدرات 0-Day مدفوعة وexploits لا تُنشر في قواعد البيانات العامة",
    tools: [
      { name: "Commercial Exploit Pack", detail: "CANVAS ليس مجانياً — exploits مُطوَّرة تجارياً بجودة عالية غير متاحة في Metasploit" },
      { name: "SILICA Module (WiFi)", detail: "وحدة اختراق شبكات WiFi المتقدمة — WPA/WPA2/WEP مع هجمات PMKID" },
      { name: "INNUENDO (Network)", detail: "اختراق أجهزة الشبكة: Cisco, Juniper, Checkpoint — routers وswitches وfirewalls" },
      { name: "D2 Exploitation Pack", detail: "D2 SecurityPack: exploits متميزة لنظام Windows وLinux غير موجودة في أي إطار آخر" },
      { name: "Python-based Architecture", detail: "مكتوب بالكامل بـ Python — سهل التوسع والتعديل لإضافة exploits مخصصة" },
      { name: "GUI + Reporting", detail: "واجهة رسومية كاملة مع تقارير مفصلة للعمليات — مناسب لـ Penetration Testers المحترفين" },
    ],
  },
  {
    id: "core_impact", name: "Core Impact", src: "HelpSystems (Core Security)",
    color: "#22d3ee", threat: "HIGH",
    desc: "منصة اختبار الاختراق الأكثر شمولاً للمؤسسات — تجمع استغلال الشبكة والبريد الإلكتروني والتطبيقات في منصة واحدة",
    tools: [
      { name: "Rapid Penetration Tests", detail: "سيناريوهات اختبار سريعة محددة مسبقاً: Network, Web App, Social Engineering, WiFi" },
      { name: "Multi-Vector Attacks", detail: "دمج هجمات متعددة: Email Phishing → Client Exploit → Lateral Movement — سلسلة هجوم واقعية" },
      { name: "Agent Pivoting", detail: "التنقل عبر الشبكات المنفصلة باستخدام الأنظمة المُخترقة كـ pivot points" },
      { name: "Compliance Testing", detail: "اختبارات توافق NIST, PCI-DSS, HIPAA مع تقارير جاهزة للمراجعين" },
      { name: "Client-side Testing", detail: "اختبار متصفحات وتطبيقات عميل: Office, PDF Readers, Browsers — بدون تفاعل شبكة مباشر" },
      { name: "Automated Reporting", detail: "تقارير تنفيذية وتقنية مفصلة بنقرة واحدة — جاهزة للـ Management وفريق التقنية" },
    ],
  },
];

// ─── SUPPLY CHAIN ATTACKS ─────────────────────────────────────────────────────
const SUPPLY_CHAIN = [
  {
    id: "solarwinds", name: "SolarWinds SUNBURST", year: "2020", color: "#e21227", threat: "CRITICAL",
    victims: "18,000+ منظمة بما فيها Microsoft وFireEye و9 وزارات أمريكية",
    desc: "أكثر هجوم سلسلة توريد تطوراً في التاريخ — backdoor مخفي في تحديثات SolarWinds Orion الشرعية",
    timeline: [
      "اختراق بيئة البناء في SolarWinds",
      "حقن SUNBURST backdoor في ملف DLL شرعي (SolarWinds.Orion.Core.BusinessLayer.dll)",
      "توقيع رقمي بشهادة SolarWinds الرسمية",
      "نشر عبر تحديثات Orion الشرعية 2019.4–2020.2.1",
      "Dormancy 12–14 يوم قبل الاتصال بـ C2",
      "اتصال بـ avsvmcloud.com عبر DNS لتجنب فلاتر الشبكة",
      "استغلال انتقائي لأهداف محددة فقط من بين 18,000",
    ],
    impact: ["اختراق Microsoft Azure AD وبريد داخلي", "اختراق وزارة الخزانة والتجارة والأمن الداخلي", "سرقة أدوات Red Team من FireEye", "أطول هجوم غير مكتشف: 9 أشهر"],
  },
  {
    id: "ccleaner", name: "CCleaner / ASUS Live Update", year: "2017/2018", color: "#a855f7", threat: "CRITICAL",
    victims: "CCleaner: 2.27 مليون مستخدم | ASUS: 500,000+ جهاز",
    desc: "تسميم تحديثات رسمية موقعة — أي مستخدم حمّل التحديث الشرعي أصيب",
    timeline: [
      "اختراق بيئة البناء لدى Piriform (مطور CCleaner)",
      "حقن DLLs خبيثة في نسخة CCleaner 5.33 موقعة رسمياً",
      "توزيع عبر موقع CCleaner الرسمي وخوادم Avast",
      "2.27 مليون تحميل — فقط 40 شركة تقنية كبرى مُفعَّلة",
    ],
    impact: ["استهداف انتقائي: Microsoft, Google, Samsung, Sony, Intel, HTC", "Stage 2 payload على أهداف محددة فقط", "Fileless malware في المرحلة الثانية — لا أثر على القرص"],
  },
  {
    id: "codecov", name: "Codecov Bash Uploader", year: "2021", color: "#f59e0b", threat: "HIGH",
    victims: "Twilio, Rapid7, HashiCorp, GoDaddy, + مئات شركات CI/CD",
    desc: "اختراق أداة code coverage شائعة لسرقة env vars من CI/CD pipelines",
    timeline: [
      "اختراق GCS bucket لـ Codecov",
      "تعديل Bash Uploader الرسمي لسرقة Environment Variables",
      "كل شركة تستخدم Codecov في CI/CD تسرّبت بياناتها",
      "سرقة API keys وtokens وبيانات الاعتماد السرية",
    ],
    impact: ["سرقة credentials من مئات CI/CD pipelines", "Twilio, HashiCorp, Twitch, Rapid7 — كلها متضررة", "تأثير متسلسل: بيانات clients الشركات المتضررة"],
  },
  {
    id: "techniques", name: "تقنيات التسميم العامة", year: "مستمر", color: "#10b981", threat: "HIGH",
    victims: "أي مطور يستخدم PyPI / npm / Maven / NuGet",
    desc: "أساليب عامة لتسميم سلسلة التوريد تستهدف المطورين والمؤسسات",
    timeline: [
      "Typosquatting: نشر حزمة 'reqeusts' بدلاً من 'requests' في PyPI",
      "Dependency Confusion: حزمة خاصة + عامة بنفس الاسم — pip يختار العامة",
      "Compromised maintainer: اختراق حساب مطور الحزمة الأصلي",
      "Malicious PRs: إضافة كود خبيث عبر pull requests تبدو شرعية",
    ],
    impact: ["colors.js sabotage: أوقف 22,000+ تطبيق npm", "ua-parser-js: 8M+ تحميل أسبوعي مُصاب", "event-stream: حزمة Bitcoin stealer — 2M تحميل أسبوعي"],
  },
];

// ─── ADVANCED OSINT ───────────────────────────────────────────────────────────
const ADVANCED_OSINT = [
  {
    id: "palantir", name: "Palantir Gotham", vendor: "Palantir Technologies",
    color: "#00e5ff", icon: Eye, tier: "ENTERPRISE",
    desc: "منصة تحليل الاستخبارات الأكثر قوة في العالم — تستخدمها CIA, FBI, NSA, GCHQ, وعشرات أجهزة الاستخبارات",
    capabilities: [
      "ربط البيانات من مئات المصادر: OSINT، SIGINT، HUMINT، IMINT في رسم بياني واحد",
      "Pattern of Life Analysis: تحديد الروتين اليومي لأي شخص من بيانات الاتصالات",
      "Predictive Analytics: توقع الخطوات القادمة للهدف بناء على أنماطه السلوكية",
      "Graph Database: ترسيم العلاقات المعقدة بين آلاف الكيانات تلقائياً",
      "Timeline Reconstruction: إعادة بناء تاريخ كامل للأحداث من بيانات مجزأة",
      "Geospatial Intelligence: تحليل الحركات الجغرافية وإنشاء خرائط تكتيكية",
    ],
    users: ["CIA", "FBI", "NSA", "GCHQ", "ICE", "الجيش الأمريكي", "أجهزة استخبارات 45+ دولة"],
  },
  {
    id: "ibm_i2", name: "IBM i2 Analyst's Notebook", vendor: "IBM Security",
    color: "#a855f7", icon: GitBranch, tier: "PROFESSIONAL",
    desc: "الأداة المرجعية لتحليل شبكات الجريمة المنظمة والإرهاب والتهديدات المعقدة",
    capabilities: [
      "Visual Link Analysis: رسم العلاقات المعقدة بين الكيانات (أشخاص، أماكن، أحداث)",
      "Timeline Charts: تحليل تسلسل الأحداث عبر الزمن بدقة",
      "Social Network Analysis: قياس مركزية الكيانات وتحديد القادة في الشبكة",
      "Import Automation: استيراد تلقائي من databases، spreadsheets، XML، JSON",
      "Geospatial Charts: ربط الأحداث بالمواقع على الخرائط التفاعلية",
      "Pattern Recognition: اكتشاف أنماط متكررة تشير لعلاقات خفية",
    ],
    users: ["Europol", "Interpol", "أجهزة الشرطة الوطنية", "شركات Forensics", "البنوك والمؤسسات المالية"],
  },
  {
    id: "clearview", name: "Clearview AI + Facial Recognition", vendor: "Multiple Vendors",
    color: "#ec4899", icon: Camera, tier: "RESTRICTED",
    desc: "أنظمة التعرف على الوجه المتقدمة — قواعد بيانات تضم مليارات الصور من الفضاء العام",
    capabilities: [
      "Clearview AI: 30+ مليار صورة مجمعة من الإنترنت — تستخدمها 3,100+ وكالة قانون",
      "PimEyes: بحث عكسي بالوجه في الإنترنت — يجد الشخص في آلاف المواقع",
      "DeepFace (Meta): 97.35% دقة — يتعرف على الأشخاص من زوايا وإضاءات مختلفة",
      "Amazon Rekognition: تحليل فيديو مباشر من كاميرات المراقبة في الوقت الفعلي",
      "Geolocation from Shadows: تحديد الموقع من زاوية ظل الشمس في الصور",
      "Re-Identification: ربط شخص عبر كاميرات متعددة حتى مع تغيير الملابس والشعر",
    ],
    users: ["FBI", "DHS", "أجهزة الشرطة", "أنظمة المراقبة الحضرية", "الحكومات الاستبدادية"],
  },
  {
    id: "geolocation_ai", name: "Geolocation Intelligence", vendor: "Open Source + AI",
    color: "#f97316", icon: Radar, tier: "OPEN",
    desc: "تقنيات تحديد الموقع الجغرافي الدقيق من الصور ومقاطع الفيديو بالذكاء الاصطناعي",
    capabilities: [
      "GeoSpy AI: تحديد المدينة والحي من أي صورة — دقة 85%+ في المناطق الحضرية",
      "Shadow Analysis: حساب زاوية الشمس من ظل الأجسام لتحديد الوقت والموقع",
      "Architectural Recognition: تحديد الدولة من طراز المباني والشوارع",
      "Vegetation Analysis: تحديد المنطقة الجغرافية من نوع الأشجار والنباتات",
      "License Plate AI: قراءة وتحليل لوحات السيارات من صور منخفضة الجودة",
      "Crowd Analysis: تحليل كثافة الحشود وحركتها من صور الأقمار الصناعية",
    ],
    users: ["صحفيو Bellingcat", "Forensics الرقمية", "محققو الجرائم الدولية", "OSINT investigators"],
  },
];

// ─── ADVANCED MALWARE ─────────────────────────────────────────────────────────
const MALWARE_TYPES = [
  {
    id: "kernel_rootkit", name: "Kernel-mode Rootkits (Ring 0)", color: "#e21227", threat: "CRITICAL",
    icon: Cpu,
    desc: "rootkits تعمل في مستوى النواة (Ring 0) — أعلى صلاحية ممكنة في النظام، تتحكم في كل شيء",
    techniques: [
      { name: "DKOM (Direct Kernel Object Manipulation)", detail: "إخفاء العمليات والملفات عن طريق تعديل هياكل بيانات kernel مباشرة" },
      { name: "SSDT Hooking", detail: "اعتراض System Service Descriptor Table لتلاعب بنتائج API calls على مستوى kernel" },
      { name: "IDT/GDT Hooks", detail: "اختراق جداول المقاطعات والواصفات — التحكم في معالجة كل مقاطعة في النظام" },
      { name: "Filter Driver Rootkits", detail: "زرع drivers في سلسلة IRP — التحكم في I/O قبل وصوله للنظام" },
      { name: "Rootkit Loaders", detail: "تحميل rootkit عبر ثغرة kernel driver موقّع أو استغلال Secure Boot" },
      { name: "Kernel Callback Abuse", detail: "تسجيل callbacks في kernel لمراقبة كل عملية، سجل، ملف في الوقت الفعلي" },
    ],
    examples: ["ZeroAccess", "TDL4/TDSS", "Necurs", "BlackEnergy Loader"],
  },
  {
    id: "uefi_rootkit", name: "UEFI/Firmware Rootkits", color: "#a855f7", threat: "CRITICAL",
    icon: Server,
    desc: "rootkits في firmware اللوحة الأم — تنجو من إعادة تثبيت نظام التشغيل، التهيئة الكاملة، حتى استبدال القرص الصلب",
    techniques: [
      { name: "SPI Flash Modification", detail: "كتابة malware مباشرة في SPI Flash chip الذي يحمل firmware UEFI/BIOS" },
      { name: "EFI Bootkit", detail: "إضافة EFI application خبيثة تعمل قبل تحميل أي نظام تشغيل — تجاوز Secure Boot" },
      { name: "Secure Boot Bypass", detail: "استغلال ثغرات في تنفيذ Secure Boot أو المفاتيح الموقعة المسرّبة" },
      { name: "SMM (System Management Mode)", detail: "كود يعمل في Ring -2 — أعمق من kernel، غير مرئي لأي نظام تشغيل" },
      { name: "HDD/SSD Firmware", detail: "برمجة firmware القرص الصلب نفسه — تعيش في HPA أو DCO غير المرئية" },
      { name: "Network Card Firmware", detail: "زرع implant في firmware بطاقة الشبكة — تعمل حتى عند إيقاف الجهاز" },
    ],
    examples: ["Lojax (APT28)", "MosaicRegressor (APT41)", "LoJax", "Equation Group HDD Implants"],
  },
  {
    id: "fileless", name: "Fileless Malware (LOLBins)", color: "#10b981", threat: "HIGH",
    icon: FileCode,
    desc: "برمجيات خبيثة تعمل فقط في الذاكرة — لا ملفات على القرص، لا أثر للـ forensics التقليدي",
    techniques: [
      { name: "PowerShell In-Memory", detail: "تنفيذ payload كامل في ذاكرة PowerShell — IEX (IWR url) وXOR obfuscation" },
      { name: "Process Hollowing", detail: "إنشاء عملية شرعية (svchost.exe) وإفراغها لحقن code خبيث مكانها" },
      { name: "DLL Injection", detail: "حقن DLL خبيثة في ذاكرة عملية شرعية (explorer.exe, lsass.exe)" },
      { name: "Reflective DLL Loading", detail: "تحميل DLL من الذاكرة مباشرة دون كتابتها على القرص — تتجاوز AV scanning" },
      { name: "WMI Persistence", detail: "استخدام WMI subscriptions للبقاء في النظام — يعمل حتى بعد إعادة التشغيل" },
      { name: "Registry Shellcode", detail: "تخزين shellcode في سجل Windows وتنفيذه عبر scheduled task أو startup key" },
    ],
    examples: ["Astaroth", "Cobalt Strike (Beacon)", "Meterpreter", "PowerSploit"],
  },
  {
    id: "hypervisor", name: "Hypervisor Rootkits (Ring -1)", color: "#f59e0b", threat: "CRITICAL",
    icon: Layers,
    desc: "rootkits تعمل أسفل نظام التشغيل كاملاً — تحوّل Windows/Linux ضيفاً افتراضياً لا يعلم بوجودها",
    techniques: [
      { name: "Blue Pill (Joanna Rutkowska)", detail: "تحويل نظام التشغيل الجاري إلى VM فوق hypervisor خفي — بدون إعادة تشغيل" },
      { name: "VM-based Rootkit", detail: "hypervisor rootkit يتحكم في كل I/O وmemory access — اكتشافه شبه مستحيل" },
      { name: "Intel VT-x Abuse", detail: "استخدام virtualization extensions في المعالج لبناء hypervisor خفي" },
      { name: "Azazel / SubVirt", detail: "نماذج بحثية تثبت نظرياً إمكانية hypervisor rootkit مقاومة للاكتشاف" },
      { name: "Memory Introspection Bypass", detail: "إخفاء malware عن أدوات المراقبة التي تعمل من outside the VM" },
    ],
    examples: ["Blue Pill (PoC)", "SubVirt (PoC)", "Lares (PoC)", "Azazel"],
  },
];

// ─── ADVANCED EVASION ─────────────────────────────────────────────────────────
const EVASION_TECH = [
  {
    id: "polymorphic", name: "Polymorphic & Metamorphic Code", color: "#e21227",
    desc: "كود يغير شكله في كل تشغيل مع الحفاظ على الوظيفة — كل نسخة لها توقيع مختلف",
    details: [
      "Polymorphic: تشفير الكود مع متغيير decryption stub مختلف في كل عدوى",
      "Metamorphic: إعادة كتابة الكود كاملاً في كل جيل — لا تشابه في البنية",
      "Garbage Code Insertion: حقن تعليمات لا معنى لها لتشتيت المحللين",
      "Instruction Substitution: استبدال أوامر بمكافئات مختلفة في encoding",
      "Code Transposition: إعادة ترتيب blocks مع jumps للحفاظ على التدفق",
      "أمثلة: Virut، Parite، Zmist — أعقد polymorphic engines موجودة",
    ],
  },
  {
    id: "domain_fronting", name: "Domain Fronting & CDN Abuse", color: "#a855f7",
    desc: "استخدام CDNs كـ Cloudflare وAWS وAzure للتخفي — C2 traffic يبدو كحركة مشروعة",
    details: [
      "Domain Fronting: استخدام عنوان CDN شرعي (google.com) مع Host header يشير لـ C2",
      "Cloudflare Workers: نشر C2 proxy على Cloudflare — IP شرعي لا يُحجب أبداً",
      "Meek (Tor Bridge): استخدام Azure/Google CDN كـ Tor bridge لتجاوز الحجب",
      "Signal/Telegram CDN: استخدام CDN تطبيقات مشروعة كقناة اتصال",
      "HTTPS Certificate Pinning Bypass: تجاوز certificate pinning في تطبيقات mobile",
      "Traffic Blending: جعل C2 traffic يشبه HTTPS عادي لا يمكن تمييزه",
    ],
  },
  {
    id: "dns_tunneling", name: "DNS Tunneling & Covert Channels", color: "#10b981",
    desc: "نقل البيانات عبر بروتوكول DNS — يعمل في أي شبكة حتى مع حجب كل المنافذ الأخرى",
    details: [
      "Iodine: نفق IP كامل عبر DNS — 40-60 Kbps throughput",
      "DNScat2: قناة اتصال عبر DNS — shell تفاعلية، نقل ملفات، C2",
      "Encoding: Base32/Base64 لبيانات C2 في DNS queries/responses",
      "Low & Slow: استعلام واحد كل 30 ثانية — تجاوز rate limiting وDNS anomaly detection",
      "ICMP Tunneling: نقل بيانات في payload packets ICMP (ping)",
      "HTTP/2 Multiplexing: إخفاء C2 channels في streams متعددة داخل connection واحد",
    ],
  },
  {
    id: "steganography", name: "Steganography & Data Hiding", color: "#f59e0b",
    desc: "إخفاء البيانات والأوامر داخل ملفات بريئة — الصوت والصور والفيديو كقنوات اتصال",
    details: [
      "Image LSB: إخفاء bytes في آخر bit من كل pixel — غير مرئي للعين البشرية",
      "Audio Steganography: إخفاء بيانات في ملفات MP3/WAV في نطاق الترددات غير المسموع",
      "Video Frames: إخفاء C2 commands في frames محددة من مقاطع YouTube",
      "PDF Metadata: إخفاء instructions في metadata ملفات PDF المُرسلة",
      "Twitter/Social Media Covert: استخدام الصور المنشورة علناً كـ C2 channel",
      "OpenStego / Steghide: أدوات مفتوحة المصدر لإخفاء والكشف عن البيانات",
    ],
  },
  {
    id: "anti_forensics", name: "Anti-Forensics Techniques", color: "#00e5ff",
    desc: "إخفاء الأثر بعد الاختراق — مسح الأدلة، تزوير الطوابع الزمنية، إرباك المحللين",
    details: [
      "Log Tampering: تعديل Windows Event Logs وSyslog دون ترك أثر",
      "Timestomping: تزوير MACE timestamps (Modified/Accessed/Created/Entry) على الملفات",
      "Memory Wiping: مسح artifacts من الذاكرة عند اكتشاف analysis tools",
      "Secure Delete: كتابة random data فوق الملفات قبل حذفها — منع recovery",
      "MFT Manipulation: تعديل Master File Table لإخفاء ملفات في NTFS",
      "Alternate Data Streams (ADS): إخفاء malware في NTFS streams لا يراها Explorer",
    ],
  },
];

// ─── ICS/SCADA ATTACKS ────────────────────────────────────────────────────────
const ICS_ATTACKS = [
  {
    id: "stuxnet", name: "Stuxnet", year: "2010", origin: "USA + Israel (Joint Operation)",
    color: "#e21227", threat: "CRITICAL",
    desc: "أول سلاح إلكتروني يدمر بنية تحتية فيزيائية — دمّر 1,000 جهاز طرد مركزي في منشأة ناتانز النووية الإيرانية",
    targets: ["Siemens Step 7 PLC controllers", "Centrifuges type IR-1 في منشأة ناتانز", "Windows systems مرتبطة بشبكات SCADA"],
    techniques: ["4 Zero-Day exploits (سجل تاريخي)", "USB propagation في شبكات Air-Gapped", "Siemens PLC Rootkit — يخفي العمليات عن المهندسين", "تسريع وتبطيء دورات الطرد لتدميرها فيزيائياً"],
    impact: "تأخير البرنامج النووي الإيراني 2-3 سنوات، دمار 1,000+ جهاز طرد مركزي",
  },
  {
    id: "triton", name: "TRITON / TRISIS", year: "2017", origin: "روسيا — CNIIHM",
    color: "#f97316", threat: "CRITICAL",
    desc: "أول هجوم يستهدف أنظمة السلامة الصناعية (SIS) — يمكنه إيقاف تشغيل آليات الحماية مما يؤدي لكوارث",
    targets: ["Triconex Safety Instrumented Systems", "منشآت نفطية في الشرق الأوسط", "أنظمة SIS المسؤولة عن منع الانفجارات"],
    techniques: ["استغلال بروتوكول TriStation الخاص", "Custom firmware injection لـ Triconex controllers", "إيقاف Emergency Shutdown Systems", "إخفاء الأوامر كـ diagnostic operations"],
    impact: "كاد يتسبب في كارثة صناعية — أُوقف بسبب bug في الكود قبل التنفيذ الكامل",
  },
  {
    id: "industroyer", name: "Industroyer / Crashoverride", year: "2016/2022", origin: "روسيا — Sandworm",
    color: "#10b981", threat: "CRITICAL",
    desc: "إطار عمل متكامل لاختراق شبكات الكهرباء — يتحدث البروتوكولات الصناعية الحقيقية",
    targets: ["شبكة الكهرباء الأوكرانية", "محطات فرعية بروتوكولات IEC 61850 وIEC 104 وDNP3"],
    techniques: ["دعم 4 بروتوكولات صناعية: IEC 61850, IEC 104, IEC 101, GOOSE", "Wiper component يدمر Registry و MBR بعد الهجوم", "Data Collection قبل الهجوم لتحديد نقاط الضعف", "Industroyer2 (2022): تحديث استهدف أوكرانيا إبان الحرب"],
    impact: "أوقف الكهرباء عن 225,000 أسرة أوكرانية في ديسمبر 2015",
  },
];

// ─── ADVANCED DEFENSE ─────────────────────────────────────────────────────────
const DEFENSE_STRATEGIES = [
  {
    id: "zero_trust", name: "Zero Trust Architecture (ZTA)", color: "#22d3ee", icon: Lock,
    desc: "لا ثقة بأي كيان داخلي أو خارجي — كل طلب وصول يُتحقق منه بغض النظر عن الموقع",
    principles: [
      "Never Trust, Always Verify — لا ثقة ضمنية حتى للمستخدمين الداخليين",
      "Least Privilege Access — صلاحيات دنيا لكل مستخدم وجهاز",
      "Microsegmentation — تقسيم الشبكة لأجزاء صغيرة معزولة",
      "Continuous Monitoring — مراقبة مستمرة لكل session وعملية",
      "Device Attestation — التحقق من حالة أمان الجهاز قبل السماح",
      "Encrypted Everything — تشفير كل الاتصالات حتى الداخلية",
    ],
    tools: ["BeyondCorp (Google)", "Zscaler Private Access", "Palo Alto Prisma", "Microsoft Azure AD"],
  },
  {
    id: "deception", name: "Deception Technology & Honeypots", color: "#a855f7", icon: Eye,
    desc: "جذب المهاجمين إلى فخاخ مصممة — اكتشاف مبكر ومعلومات استخباراتية عالية الجودة",
    principles: [
      "High-Interaction Honeypots: أنظمة حقيقية للمهاجمين لقضاء وقت فيها",
      "Deception Networks: شبكات وهمية كاملة لإرباك المهاجمين",
      "Honey Tokens: بيانات مزيفة تُطلق إنذاراً عند استخدامها",
      "Canary Tokens: روابط ووثائق تُبلّغ فور فتحها في أي مكان",
      "Active Directory Honeypots: حسابات AD مزيفة تُبلّغ عند محاولة الاستخدام",
      "Bread Crumbs: بيانات مزيفة تقود المهاجم لفخ متطور",
    ],
    tools: ["Attivo Networks", "Illusive Networks", "Cymmetria", "Canarytokens.org", "Thinkst Canary"],
  },
  {
    id: "threat_hunting", name: "Proactive Threat Hunting", color: "#10b981", icon: Radar,
    desc: "البحث النشط عن التهديدات قبل ظهور التنبيهات — المحقق الذي يبحث عن الجريمة قبل وقوعها",
    principles: [
      "Hypothesis-Based Hunting: فرضية محددة + بحث منهجي للتحقق",
      "IOC Hunting: البحث عن Indicators of Compromise المعروفة",
      "TTP-Based: البحث عن أساليب المهاجمين لا علاماتها فقط",
      "Behavioral Analytics: تحليل السلوك غير الطبيعي بالذكاء الاصطناعي",
      "MITRE ATT&CK Mapping: ربط كل نشاط بتقنية موثقة في ATT&CK",
      "Memory Analysis: فحص ذاكرة الأنظمة الحية بحثاً عن Fileless malware",
    ],
    tools: ["Volatility", "Velociraptor", "OSQuery", "YARA Rules", "Sigma Rules", "Elastic SIEM"],
  },
  {
    id: "hardware_security", name: "Hardware-Based Security", color: "#f59e0b", icon: Cpu,
    desc: "الحماية من مستوى الـ hardware — لا يمكن لأي software التحايل عليها",
    principles: [
      "TPM 2.0: Trusted Platform Module — مخزن آمن لمفاتيح التشفير ومقاييس النظام",
      "Secure Boot: ضمان تشغيل نظام تشغيل موثوق فقط — يمنع UEFI rootkits",
      "Intel SGX (Software Guard Extensions): مناطق ذاكرة معزولة حتى عن kernel",
      "AMD SEV (Secure Encrypted Virtualization): تشفير ذاكرة VMs منفردة",
      "FIDO2 / WebAuthn: مصادقة hardware token لا يمكن phishing مفاتيحها",
      "Hardware Security Modules (HSM): معالجات متخصصة لعمليات التشفير الحساسة",
    ],
    tools: ["YubiKey 5", "Google Titan", "SoloKeys", "Thales Luna HSM", "AWS CloudHSM"],
  },
  {
    id: "memory_forensics", name: "Memory Forensics & Live Analysis", color: "#e21227", icon: Search,
    desc: "تحليل الذاكرة الحية للكشف عن Fileless malware وAPTs المخفية",
    principles: [
      "RAM Acquisition: أخذ نسخة من الذاكرة الحية دون إيقاف النظام",
      "Process Analysis: فحص كل عملية جارية وذاكرتها ومكتباتها",
      "Rootkit Detection: اكتشاف DKOM وSSdt hooks وhidden processes",
      "Network Artifacts: استخراج اتصالات شبكية ومفاتيح TLS من الذاكرة",
      "Credential Extraction: استخراج hashes وtokens من lsass.exe (للتحقيق القانوني)",
      "Malware Unpacking: استخراج payload الحقيقي من ذاكرة العملية بعد فك الضغط",
    ],
    tools: ["Volatility 3", "Rekall", "WinPmem", "LiME (Linux)", "Magnet RAM Capture", "FTK Imager"],
  },
  {
    id: "privacy_os", name: "Privacy-Hardened Operating Systems", color: "#6366f1", icon: Shield,
    desc: "أنظمة تشغيل مصممة من الأساس للخصوصية القصوى والمقاومة للاختراق",
    principles: [
      "Qubes OS: كل تطبيق في VM معزولة — يتصفح المتشددون والصحفيون والمحققون",
      "Tails OS: نظام Live يعمل من USB — لا يترك أثراً على الجهاز، يوجه كل حركة عبر Tor",
      "Whonix: نظام مكوّن من GatewayVM + WorkstationVM — يفصل الهوية عن الشبكة",
      "GrapheneOS: Android مُصلَّب للهاتف — تُستخدمه الصحفيون ومعارضو الحكومات",
      "Air-Gapped Systems: أجهزة منفصلة تماماً عن الإنترنت للبيانات شديدة الحساسية",
      "TAILS + Veracrypt: تشفير البيانات قبل نقلها عبر القنوات غير الآمنة",
    ],
    tools: ["Qubes OS", "Tails OS", "Whonix", "GrapheneOS", "VeraCrypt", "Signal Protocol"],
  },
];

// ─── NEXT-GEN THREATS ─────────────────────────────────────────────────────────
const NEXTGEN_THREATS = [
  {
    id: "ai_deepfake", name: "Deepfake في الوقت الفعلي", color: "#e21227", icon: Camera,
    desc: "محاكاة الصوت والوجه في الوقت الفعلي للمكالمات ومؤتمرات الفيديو",
    examples: [
      "Real-time Voice Cloning: 3 ثوانٍ من الصوت كافية لمحاكاة أي شخص",
      "Zoom/Meet Deepfake: تحويل وجه المهاجم لوجه الضحية في مكالمات الفيديو",
      "Executive Impersonation: 25 مليون دولار سُرقت عبر مكالمة CFO مزيفة بالكامل في هونج كونج 2024",
      "AI Voice Fraud: مكالمات صوتية مزيفة لأقارب تطلب تحويلات مالية طارئة",
      "Synthetic ID Documents: هويات وجوازات سفر مزيفة لا يكشفها نظام KYC التقليدي",
    ],
    defense: ["صل للشخص على رقم تعرفه مسبقاً للتحقق", "كلمة سر لحالات الطوارئ مع الأسرة", "أنظمة liveness detection متعددة الطبقات", "Deepfake detection AI في مكالمات المؤسسات"],
  },
  {
    id: "ai_phishing", name: "AI-Generated Attacks", color: "#a855f7", icon: Cpu,
    desc: "هجمات مُصممة بالكامل بالذكاء الاصطناعي — شخصية، مقنعة، وتتكيف مع رد فعل الضحية",
    examples: [
      "Personalized Phishing: رسائل تصيد تذكر اسمك ووظيفتك وآخر رحلاتك ومشترياتك",
      "AI Chatbot Vishing: روبوتات محادثة صوتية تجري مكالمات احتيالية مع بشر",
      "Adversarial Emails: رسائل تتجاوز نماذج ML لكشف التصيد عبر perturbations خفية",
      "Auto-OSINT + Generate: جمع OSINT تلقائياً ثم توليد هجمة مخصصة في ثوانٍ",
      "Polymorphic Phishing Kits: أدوات تصيد تولد صفحات فريدة لكل ضحية تتجاوز blocklists",
    ],
    defense: ["تدريب مستمر للموظفين على التعرف على AI-generated content", "Email authentication: DMARC/DKIM/SPF صارم", "AI-powered email security (Abnormal, IRONSCALES)", "Zero-trust في كل طلب مالي أياً كان المصدر"],
  },
  {
    id: "quantum", name: "الحوسبة الكمية — التهديد القادم", color: "#00e5ff", icon: Zap,
    desc: "الحواسيب الكمية ستكسر التشفير الحالي — RSA-2048 وECC ستصبح معرضة للاختراق",
    examples: [
      "Shor's Algorithm: كسر RSA-2048 في ساعات بدلاً من مليارات السنين",
      "Grover's Algorithm: تقليل أمان التشفير المتماثل (AES) بالنصف",
      "HNDL (Harvest Now Decrypt Later): جمع حركة مرور مشفرة الآن لفكها لاحقاً",
      "Crypto-Agile Infrastructure: الحاجة لمرونة تشفير تتيح التبديل السريع للخوارزميات",
      "Y2Q (Years to Quantum): 2030-2035 المتوقعة لحاسوب كمي كافٍ لكسر RSA",
    ],
    defense: ["Post-Quantum Cryptography: CRYSTALS-Kyber, CRYSTALS-Dilithium (NIST 2024)", "Hybrid Encryption: دمج Classical + Post-Quantum أثناء التحول", "Key Size Increase: AES-256 يبقى آمناً — RSA يحتاج 15360 bit", "البدء الآن: تحديث البنية التحتية قبل ظهور التهديد"],
  },
  {
    id: "adversarial_ml", name: "هجمات الذكاء الاصطناعي (Adversarial ML)", color: "#f59e0b", icon: Bug,
    desc: "خداع نماذج الذكاء الاصطناعي لتصنيف المدخلات بشكل خاطئ",
    examples: [
      "Evasion Attacks: تعديل دقيق لـ malware لتجاوز AV/EDR المبني على ML",
      "Adversarial Images: تعديل pixel واحد يجعل نظام التعرف على الوجوه يفشل",
      "Prompt Injection: حقن تعليمات في AI assistants لتجاوز ضماناتها الأمنية",
      "Model Inversion: استرداد بيانات التدريب الحساسة من نموذج ML",
      "Data Poisoning: تلويث بيانات التدريب لجعل النموذج يتصرف بطريقة معينة",
      "Model Stealing: إعادة بناء نموذج ML من خلال استعلامات API فقط",
    ],
    defense: ["Adversarial Training: تضمين أمثلة مخادعة في التدريب", "Certified Defenses: ضمانات رياضية لمقاومة perturbations", "Input Validation: التحقق المسبق من المدخلات", "Ensemble Models: عدة نماذج مختلفة يصعب خداعها جميعاً"],
  },
];

// ─── SUBCOMPONENTS ────────────────────────────────────────────────────────────
function GlowDot({ color }: { color: string }) {
  return <span className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />;
}

function SectionBadge({ label, color }: { label: string; color: string }) {
  return (
    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full font-mono uppercase tracking-wider"
      style={{ background: color + "22", color, border: `1px solid ${color}40` }}>{label}</span>
  );
}

function APTCard({ group }: { group: typeof APT_GROUPS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div layout className="rounded-2xl border overflow-hidden cursor-pointer"
      style={{ borderColor: group.color + "35", background: "rgba(0,0,0,0.8)" }}
      onClick={() => setOpen(!open)} whileHover={{ scale: 1.005 }}>
      <div className="p-4" style={{ background: `linear-gradient(135deg, ${group.color}0d, transparent 65%)` }}>
        <div className="flex items-start gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: group.color + "20", border: `1px solid ${group.color}35` }}>{group.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-sm font-bold font-mono text-white">{group.name}</span>
              <SectionBadge label={group.threat} color={SEV[group.threat]} />
              <SectionBadge label={group.active} color={group.color} />
            </div>
            <div className="text-[9px] font-mono text-gray-400">{group.origin}</div>
          </div>
          <motion.div animate={{ rotate: open ? 90 : 0 }}><ChevronRight size={14} style={{ color: group.color }} /></motion.div>
        </div>
        <p className="text-[10px] text-gray-300 font-mono leading-relaxed">{group.desc}</p>
        <div className="mt-2 text-[9px] font-mono" style={{ color: group.color }}>
          <span className="text-gray-600">الأهداف: </span>{group.targets}
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: group.color + "20" }}>
              <div className="pt-3">
                <div className="text-[8px] font-mono text-gray-600 mb-2 tracking-widest">CORE TECHNIQUES</div>
                <div className="grid grid-cols-1 gap-2">
                  {group.techniques.map((t, i) => {
                    const Icon = t.icon;
                    return (
                      <motion.div key={i} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
                        className="flex gap-2 p-2 rounded-lg" style={{ background: group.color + "08" }}>
                        <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: group.color + "20" }}>
                          <Icon size={10} style={{ color: group.color }} />
                        </div>
                        <div>
                          <div className="text-[9px] font-bold font-mono text-white">{t.name}</div>
                          <div className="text-[8px] font-mono text-gray-400 leading-snug">{t.detail}</div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-[8px] font-mono text-gray-600 mb-1.5 tracking-widest">SIGNATURE TOOLS</div>
                <div className="flex flex-wrap gap-1">
                  {group.tools.map(t => (
                    <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: group.color + "18", color: group.color, border: `1px solid ${group.color}30` }}>{t}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[8px] font-mono text-gray-600 mb-1.5 tracking-widest">NOTABLE OPERATIONS</div>
                <div className="space-y-1">
                  {group.notableOps.map((op, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-[9px] font-mono">
                      <GlowDot color={group.color} />
                      <span className="text-gray-300">{op}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function MalwareCard({ m }: { m: typeof MALWARE_TYPES[0] }) {
  const Icon = m.icon;
  const [open, setOpen] = useState(false);
  return (
    <motion.div layout className="rounded-2xl border overflow-hidden" style={{ borderColor: m.color + "30", background: "rgba(0,0,0,0.8)" }}>
      <div className="p-4 cursor-pointer" style={{ background: `linear-gradient(135deg, ${m.color}0d, transparent 65%)` }} onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: m.color + "20", border: `1px solid ${m.color}35` }}>
            <Icon size={15} style={{ color: m.color }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold font-mono text-white">{m.name}</span>
              <SectionBadge label={m.threat} color={SEV[m.threat]} />
            </div>
          </div>
          <motion.div animate={{ rotate: open ? 90 : 0 }}><ChevronRight size={13} style={{ color: m.color }} /></motion.div>
        </div>
        <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{m.desc}</p>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3 border-t" style={{ borderColor: m.color + "20" }}>
              <div className="pt-3 space-y-2">
                {m.techniques.map((t, i) => (
                  <motion.div key={i} initial={{ x: -8, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="p-2 rounded-lg space-y-0.5" style={{ background: m.color + "08" }}>
                    <div className="text-[9px] font-bold font-mono text-white flex items-center gap-1.5">
                      <span style={{ color: m.color }}>▸</span>{t.name}
                    </div>
                    <div className="text-[8px] font-mono text-gray-400 pl-3">{t.detail}</div>
                  </motion.div>
                ))}
              </div>
              <div>
                <div className="text-[8px] font-mono text-gray-600 mb-1 tracking-widest">REAL-WORLD EXAMPLES</div>
                <div className="flex flex-wrap gap-1">
                  {m.examples.map(e => (
                    <span key={e} className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: m.color + "18", color: m.color, border: `1px solid ${m.color}30` }}>{e}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── NETWORK CANVAS ───────────────────────────────────────────────────────────
function NetCanvas({ color = "#a855f7" }: { color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => { cv.width = cv.offsetWidth * DPR; cv.height = cv.offsetHeight * DPR; ctx.scale(DPR, DPR); };
    resize();
    const pts = Array.from({ length: 30 }, () => ({ x: Math.random() * cv.offsetWidth, y: Math.random() * cv.offsetHeight, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3 }));
    let raf = 0;
    const draw = () => {
      const W = cv.offsetWidth, H = cv.offsetHeight;
      ctx.clearRect(0, 0, W, H);
      pts.forEach(p => { p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > W) p.vx *= -1; if (p.y < 0 || p.y > H) p.vy *= -1; });
      pts.forEach((a, i) => pts.slice(i + 1).forEach(b => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 100) { ctx.strokeStyle = `${color}${Math.round((1 - d / 100) * 18).toString(16).padStart(2, "0")}`; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }));
      pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2); ctx.fillStyle = color + "55"; ctx.fill(); });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [color]);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" />;
}

// ─── OVERVIEW SECTION ─────────────────────────────────────────────────────────
function OverviewSection() {
  const stats = [
    { label: "مجموعات APT موثقة", val: "150+", color: "#e21227" },
    { label: "ثغرات Zero-Day سنوياً", val: "70+", color: "#a855f7" },
    { label: "هجمات ICS/SCADA", val: "3 كبرى", color: "#f97316" },
    { label: "خسائر Crypto سنوياً", val: "$3.8B", color: "#f59e0b" },
    { label: "تقنيات تخفي متقدمة", val: "5 أنواع", color: "#10b981" },
    { label: "مؤسسات تأثرت بـ SolarWinds", val: "18,000+", color: "#00e5ff" },
  ];
  return (
    <div className="space-y-5">
      <div className="p-4 rounded-2xl border" style={{ borderColor: "#e2122730", background: "rgba(226,18,39,0.04)" }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={15} className="text-red-400" />
          <span className="text-[10px] font-mono font-bold text-red-400 tracking-widest">⚠ إخلاء مسؤولية أمني</span>
        </div>
        <p className="text-[10px] font-mono text-gray-400 leading-relaxed">
          جميع المعلومات في هذا المركز تُقدَّم للأغراض <span className="text-emerald-400 font-bold">الدفاعية والتعليمية</span> فقط.
          تهدف إلى فهم التهديدات لتطوير دفاعات أفضل. استخدامها في أنشطة غير قانونية يُعرّضك للملاحقة الجنائية الدولية.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="p-3 rounded-xl border text-center" style={{ borderColor: s.color + "30", background: s.color + "08" }}>
            <div className="text-xl font-black font-mono text-white mb-1">{s.val}</div>
            <div className="text-[9px] font-mono" style={{ color: s.color }}>{s.label}</div>
          </motion.div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {SECTIONS.slice(1).map((s, i) => (
          <motion.div key={s.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
            className="p-3 rounded-xl border flex items-center gap-3" style={{ borderColor: s.color + "25", background: s.color + "06" }}>
            <span className="text-lg">{s.icon}</span>
            <div>
              <div className="text-[10px] font-bold font-mono text-white">{s.label}</div>
              <div className="text-[9px] font-mono text-gray-500">
                {s.id === "apts" && "4 مجموعات نخبة — منشأ، تقنيات، عمليات"}
                {s.id === "exploits" && "NSA / CIA leaked tools + Hardware vulnerabilities"}
                {s.id === "supplychain" && "SolarWinds / CCleaner / Codecov + تقنيات التسميم"}
                {s.id === "osint_adv" && "Palantir / IBM i2 / Clearview AI + AI Geolocation"}
                {s.id === "malware" && "Kernel rootkits / UEFI / Fileless / Hypervisor"}
                {s.id === "evasion" && "Polymorphic / Domain Fronting / DNS Tunneling / Steganography"}
                {s.id === "ics" && "Stuxnet / TRITON / Industroyer — أسلحة البنية التحتية"}
                {s.id === "defense" && "Zero Trust / Deception / Threat Hunting / Hardware Security"}
                {s.id === "nextgen" && "Deepfake RT / AI Phishing / Quantum / Adversarial ML"}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN PAGE COMPONENT ──────────────────────────────────────────────────────
interface Props { onClose?: () => void }

export function APTIntelPage({ onClose }: Props) {
  const [section, setSection] = useState("overview");
  const cur = SECTIONS.find(s => s.id === section) ?? SECTIONS[0];

  const renderSection = () => {
    switch (section) {
      case "overview": return <OverviewSection />;

      case "apts": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500">
            {APT_GROUPS.length} مجموعات APT نخبة — المنشأ، التقنيات، الأدوات، العمليات الشهيرة
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {APT_GROUPS.map(g => <APTCard key={g.id} group={g} />)}
          </div>
        </div>
      );

      case "exploits": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500">أطر الاستغلال المتقدمة — أدوات مسرّبة من أجهزة الاستخبارات + ثغرات الـ hardware</div>
          {EXPLOIT_FRAMEWORKS.map((f, fi) => (
            <motion.div key={f.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: fi * 0.1 }}
              className="rounded-2xl border p-4 space-y-3" style={{ borderColor: f.color + "30", background: "rgba(0,0,0,0.8)" }}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm font-bold font-mono text-white">{f.name}</span>
                    <SectionBadge label={f.threat} color={SEV[f.threat]} />
                  </div>
                  <div className="text-[8px] font-mono text-gray-600">{f.src}</div>
                </div>
              </div>
              <p className="text-[10px] font-mono text-gray-400 leading-relaxed">{f.desc}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {f.tools.map((t, i) => (
                  <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }}
                    className="p-2.5 rounded-lg space-y-0.5" style={{ background: f.color + "08", border: `1px solid ${f.color}18` }}>
                    <div className="text-[9px] font-bold font-mono flex items-center gap-1" style={{ color: f.color }}>
                      <Zap size={8} />{t.name}
                    </div>
                    <div className="text-[8px] font-mono text-gray-400 leading-snug">{t.detail}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      );

      case "supplychain": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500">هجمات سلسلة التوريد — اختراق السلسلة للوصول للضحايا عبر البرامج الموثوقة</div>
          {SUPPLY_CHAIN.map((s, si) => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: si * 0.1 }}
              className="rounded-2xl border overflow-hidden" style={{ borderColor: s.color + "30", background: "rgba(0,0,0,0.8)" }}>
              <div className="p-4" style={{ background: `linear-gradient(135deg, ${s.color}0d, transparent 65%)` }}>
                <div className="flex items-start gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold font-mono text-white">{s.name}</span>
                      <SectionBadge label={s.year} color={s.color} />
                      <SectionBadge label={s.threat} color={SEV[s.threat]} />
                    </div>
                    <div className="text-[9px] font-mono" style={{ color: s.color }}>{s.victims}</div>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-gray-300 leading-relaxed">{s.desc}</p>
              </div>
              <div className="px-4 pb-4 space-y-3">
                <div>
                  <div className="text-[8px] font-mono text-gray-600 mb-2 tracking-widest pt-3">ATTACK TIMELINE</div>
                  <div className="space-y-1.5">
                    {s.timeline.map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded flex items-center justify-center text-[7px] font-bold flex-shrink-0 mt-0.5"
                          style={{ background: s.color + "25", color: s.color }}>{i + 1}</div>
                        <span className="text-[9px] font-mono text-gray-300">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-gray-600 mb-1.5 tracking-widest">IMPACT</div>
                  <div className="space-y-1">
                    {s.impact.map((item, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[9px] font-mono">
                        <GlowDot color={s.color} />
                        <span className="text-gray-300">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      );

      case "osint_adv": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500">OSINT على مستوى الاستخبارات — المنصات والأنظمة التي تستخدمها الحكومات والأجهزة الأمنية</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ADVANCED_OSINT.map((o, i) => {
              const Icon = o.icon;
              return (
                <motion.div key={o.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                  className="rounded-2xl border p-4 space-y-3" style={{ borderColor: o.color + "30", background: "rgba(0,0,0,0.8)" }}>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: o.color + "20", border: `1px solid ${o.color}35` }}>
                      <Icon size={16} style={{ color: o.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="text-[11px] font-bold font-mono text-white">{o.name}</span>
                        <SectionBadge label={o.tier} color={o.color} />
                      </div>
                      <div className="text-[8px] font-mono text-gray-500">{o.vendor}</div>
                    </div>
                  </div>
                  <p className="text-[9px] font-mono text-gray-400 leading-relaxed">{o.desc}</p>
                  <div className="space-y-1">
                    {o.capabilities.map((c, ci) => (
                      <div key={ci} className="flex items-start gap-1.5 text-[9px] font-mono text-gray-300">
                        <span style={{ color: o.color }} className="flex-shrink-0 mt-0.5">▸</span>{c}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[8px] font-mono text-gray-600 mb-1 tracking-widest">REAL USERS</div>
                    <div className="flex flex-wrap gap-1">
                      {o.users.map(u => (
                        <span key={u} className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: o.color + "15", color: o.color, border: `1px solid ${o.color}25` }}>{u}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      );

      case "malware": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500">البرمجيات الخبيثة المتقدمة — من kernel rootkits إلى UEFI firmware وFileless attacks</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {MALWARE_TYPES.map(m => <MalwareCard key={m.id} m={m} />)}
          </div>
        </div>
      );

      case "evasion": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500">تقنيات التخفي المتقدمة — تجاوز الكشف، إخفاء الأثر، والاتصالات السرية</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {EVASION_TECH.map((e, i) => (
              <motion.div key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="rounded-2xl border p-4 space-y-3" style={{ borderColor: e.color + "30", background: "rgba(0,0,0,0.8)" }}>
                <div>
                  <div className="text-[11px] font-bold font-mono text-white mb-1">{e.name}</div>
                  <p className="text-[9px] font-mono text-gray-400 leading-relaxed">{e.desc}</p>
                </div>
                <div className="space-y-1.5">
                  {e.details.map((d, di) => (
                    <div key={di} className="flex items-start gap-1.5">
                      <span style={{ color: e.color }} className="text-[8px] font-mono mt-0.5 flex-shrink-0">▸</span>
                      <span className="text-[9px] font-mono text-gray-300">{d}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      );

      case "ics": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500">هجمات البنية التحتية الحيوية — ICS/SCADA — الأسلحة الإلكترونية التي تدمر العالم المادي</div>
          <div className="p-3 rounded-xl border mb-2" style={{ borderColor: "#f9731630", background: "#f9731608" }}>
            <div className="text-[9px] font-mono text-orange-400">
              هذه الهجمات يمكن أن تقتل بشراً — استهدفت أنظمة السلامة الصناعية والشبكات الكهربائية والمنشآت النووية
            </div>
          </div>
          {ICS_ATTACKS.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="rounded-2xl border overflow-hidden" style={{ borderColor: a.color + "35", background: "rgba(0,0,0,0.8)" }}>
              <div className="p-4" style={{ background: `linear-gradient(135deg, ${a.color}0d, transparent 65%)` }}>
                <div className="flex items-start gap-3 mb-2">
                  <Siren size={18} style={{ color: a.color }} className="flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-sm font-bold font-mono text-white">{a.name}</span>
                      <SectionBadge label={a.year} color={a.color} />
                      <SectionBadge label={a.origin} color={a.color} />
                      <SectionBadge label={a.threat} color={SEV[a.threat]} />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-gray-300 leading-relaxed">{a.desc}</p>
              </div>
              <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
                <div>
                  <div className="text-[8px] font-mono text-gray-600 mb-1.5 tracking-widest">TARGETS</div>
                  <div className="space-y-1">
                    {a.targets.map((t, ti) => (
                      <div key={ti} className="flex items-start gap-1.5 text-[9px] font-mono">
                        <GlowDot color={a.color} />
                        <span className="text-gray-300">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-gray-600 mb-1.5 tracking-widest">TECHNIQUES</div>
                  <div className="space-y-1">
                    {a.techniques.map((t, ti) => (
                      <div key={ti} className="flex items-start gap-1.5 text-[9px] font-mono">
                        <span style={{ color: a.color }} className="flex-shrink-0">▸</span>
                        <span className="text-gray-300">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-gray-600 mb-1.5 tracking-widest">IMPACT</div>
                  <div className="p-2 rounded-lg text-[9px] font-mono text-orange-300" style={{ background: a.color + "10" }}>
                    {a.impact}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      );

      case "defense": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500">استراتيجيات الدفاع النخبة — الحماية ضد التهديدات المتقدمة والـ APTs</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEFENSE_STRATEGIES.map((d, i) => {
              const Icon = d.icon;
              return (
                <motion.div key={d.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                  className="rounded-2xl border p-4 space-y-3" style={{ borderColor: d.color + "30", background: "rgba(0,0,0,0.8)" }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: d.color + "20", border: `1px solid ${d.color}35` }}>
                      <Icon size={14} style={{ color: d.color }} />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold font-mono text-white mb-0.5">{d.name}</div>
                    </div>
                  </div>
                  <p className="text-[9px] font-mono text-gray-400 leading-relaxed">{d.desc}</p>
                  <div className="space-y-1">
                    {d.principles.map((p, pi) => (
                      <div key={pi} className="flex items-start gap-1.5 text-[9px] font-mono">
                        <span style={{ color: d.color }} className="flex-shrink-0 mt-0.5">◈</span>
                        <span className="text-gray-300">{p}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-[8px] font-mono text-gray-600 mb-1 tracking-widest">TOOLS & PLATFORMS</div>
                    <div className="flex flex-wrap gap-1">
                      {d.tools.map(t => (
                        <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                          style={{ background: d.color + "15", color: d.color, border: `1px solid ${d.color}25` }}>{t}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      );

      case "nextgen": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500">التهديدات القادمة — الذكاء الاصطناعي في الهجوم، الحوسبة الكمية، والـ Adversarial ML</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {NEXTGEN_THREATS.map((t, i) => {
              const Icon = t.icon;
              return (
                <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="rounded-2xl border p-4 space-y-3" style={{ borderColor: t.color + "30", background: "rgba(0,0,0,0.8)" }}>
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: t.color + "20", border: `1px solid ${t.color}35` }}>
                      <Icon size={14} style={{ color: t.color }} />
                    </div>
                    <div>
                      <div className="text-[11px] font-bold font-mono text-white">{t.name}</div>
                    </div>
                  </div>
                  <p className="text-[9px] font-mono text-gray-400 leading-relaxed">{t.desc}</p>
                  <div>
                    <div className="text-[8px] font-mono text-gray-600 mb-1.5 tracking-widest">REAL EXAMPLES</div>
                    <div className="space-y-1">
                      {t.examples.map((e, ei) => (
                        <div key={ei} className="flex items-start gap-1.5 text-[9px] font-mono">
                          <span style={{ color: t.color }} className="flex-shrink-0 mt-0.5">▸</span>
                          <span className="text-gray-300">{e}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[8px] font-mono text-gray-600 mb-1.5 tracking-widest">DEFENSE</div>
                    <div className="space-y-1">
                      {t.defense.map((d, di) => (
                        <div key={di} className="flex items-center gap-1.5 text-[9px] font-mono">
                          <Shield size={8} className="text-emerald-400 flex-shrink-0" />
                          <span className="text-emerald-400">{d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      );

      default: return <OverviewSection />;
    }
  };

  return (
    <div className="relative min-h-full bg-black overflow-hidden flex flex-col">
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <NetCanvas color={cur.color} />
      </div>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 50% 0%, ${cur.color}05 0%, transparent 55%)` }} />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: "rgba(168,85,247,0.2)", background: "rgba(0,0,0,0.9)", backdropFilter: "blur(24px)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)" }}>
                <Target size={18} className="text-purple-400" />
              </div>
              <div>
                <h1 className="text-sm font-bold font-mono text-white tracking-wider">APT INTELLIGENCE CENTER — ELITE EDITION</h1>
                <div className="text-[9px] font-mono tracking-[0.15em]" style={{ color: cur.color }}>
                  {APT_GROUPS.length} APTs · {EXPLOIT_FRAMEWORKS.length} Exploit Frameworks · {MALWARE_TYPES.length} Malware Types · {DEFENSE_STRATEGIES.length} Defense Layers
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-mono"
                style={{ background: "#ef444415", border: "1px solid #ef444430", color: "#ef4444" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                TOP SECRET
              </div>
              {onClose && (
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
          {/* Nav */}
          <div className="flex gap-1 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
            {SECTIONS.map(s => (
              <button key={s.id} onClick={() => setSection(s.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap flex-shrink-0 transition-all"
                style={section === s.id ? {
                  background: s.color + "20", color: s.color,
                  border: `1px solid ${s.color}40`, boxShadow: `0 0 10px ${s.color}20`,
                } : { background: "transparent", color: "#6b7280", border: "1px solid transparent" }}>
                <span>{s.icon}</span> {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            <motion.div key={section} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
