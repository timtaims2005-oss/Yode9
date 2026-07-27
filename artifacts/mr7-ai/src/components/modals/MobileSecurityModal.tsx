import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Smartphone, Shield, AlertTriangle, ChevronDown, ChevronUp,
  ExternalLink, Copy, CheckCheck, Search, Filter, Wifi, Eye,
  Lock, Zap, Terminal, Bug, Radio, Cpu, Network, Key,
  Activity, Globe, Database, Code, Layers, Monitor, Server
} from "lucide-react";

interface MobileSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ToolCategory =
  | "all" | "frameworks" | "rat" | "spyware" | "mitm"
  | "c2" | "analysis" | "social" | "defense";

interface SecurityTool {
  id: string;
  name: string;
  category: ToolCategory;
  description: string;
  details: string;
  platform: string[];
  risk: "critical" | "high" | "medium" | "low";
  type: "offensive" | "defensive" | "analysis";
  link?: string;
  techniques?: string[];
  defenses?: string[];
}

const MOBILE_TOOLS: SecurityTool[] = [
  // ── Frameworks ──────────────────────────────────────────────────────────────
  {
    id: "nethunter",
    name: "Kali NetHunter",
    category: "frameworks",
    description: "المنصة الأولى المتخصصة في اختبار اختراق الأجهزة المحمولة",
    details: "توفر بيئة Kali Linux كاملة على أجهزة Android مع دعم هجمات HID Keyboard، BadUSB، Evil AP MANA، وحقن حزم لاسلكية 802.11 والـ MITM Framework.",
    platform: ["Android"],
    risk: "critical",
    type: "offensive",
    link: "https://www.kali.org/docs/nethunter/",
    techniques: [
      "HID Keyboard Attacks — محاكاة لوحة مفاتيح USB لتنفيذ أوامر تلقائية",
      "BadUSB Attacks — حقن صفحات وهمية عبر USB",
      "Evil AP MANA — نقاط وصول Wi-Fi خبيثة للتصيد",
      "802.11 Wireless Injection — حقن حزم لاسلكية للاختراق",
      "MITM Framework — حقن برامج خلفية في التنزيلات",
    ],
    defenses: ["تحديث نظام التشغيل", "تجنب الشبكات العامة", "استخدام VPN موثوق"],
  },
  {
    id: "metasploit",
    name: "Metasploit Framework",
    category: "frameworks",
    description: "أقوى منصة استغلال في العالم — تدعم Android وiOS",
    details: "تدعم Android Meterpreter للتحكم الكامل بالأجهزة، وiOS Meterpreter مع قيود، ووحدات Post-exploitation للوصول إلى المكالمات والرسائل والموقع والكاميرا والميكروفون. تدعم أيضاً Persistent backdoors.",
    platform: ["Android", "iOS", "Windows", "Linux", "macOS"],
    risk: "critical",
    type: "offensive",
    link: "https://metasploit.com",
    techniques: [
      "Android Meterpreter — تحكم كامل بأجهزة Android",
      "iOS Meterpreter — دعم محدود (يتطلب jailbreak)",
      "Post-exploitation modules — الوصول للكاميرا والميكروفون والموقع",
      "Persistent backdoors — أبواب خلفية دائمة",
    ],
    defenses: ["التحقق من التطبيقات قبل التثبيت", "استخدام MDM", "فحص الأذونات بانتظام"],
  },
  {
    id: "mobsf",
    name: "Mobile Security Framework (MobSF)",
    category: "frameworks",
    description: "إطار عمل شامل للتحليل الثابت والديناميكي لتطبيقات Android وiOS",
    details: "يدعم التحليل الثابت (Static Analysis) والديناميكي (Dynamic Analysis) لتطبيقات Android وiOS. يكشف الثغرات الأمنية، ويولد تقارير مفصلة، ويدعم API للتكامل مع بيئات CI/CD.",
    platform: ["Android", "iOS"],
    risk: "medium",
    type: "analysis",
    link: "https://github.com/MobSF/Mobile-Security-Framework-MobSF",
    techniques: [
      "Static Analysis — فحص الكود والموارد",
      "Dynamic Analysis — التحليل أثناء التشغيل",
      "API Security Testing — اختبار أمان APIs",
      "Malware Analysis — تحليل البرمجيات الخبيثة",
    ],
    defenses: ["فحص التطبيقات دورياً", "إجراء Code Review", "اختبار الاختراق قبل النشر"],
  },

  // ── RAT Tools ───────────────────────────────────────────────────────────────
  {
    id: "androrat",
    name: "AndroRAT",
    category: "rat",
    description: "أداة RAT مفتوحة المصدر للتحكم الكامل بأجهزة Android عن بعد",
    details: "تتيح الوصول إلى سجلات المكالمات والرسائل وجهات الاتصال، وتتبع GPS الموقع الجغرافي، والتقاط الصور عبر الكاميرا، وإرسال رسائل نصية عن بعد، وتشغيل كخدمة خفية عند إقلاع الجهاز.",
    platform: ["Android"],
    risk: "critical",
    type: "offensive",
    link: "https://github.com/karma9874/AndroRAT",
    techniques: [
      "سرقة سجلات المكالمات والرسائل",
      "تتبع الموقع الجغرافي عبر GPS",
      "التقاط صور خفية من الكاميرا",
      "الاستمرارية عند إعادة التشغيل",
      "إرسال رسائل SMS عن بعد",
    ],
    defenses: ["عدم تثبيت تطبيقات من مصادر غير موثوقة", "فحص الأذونات", "استخدام Mobile AV"],
  },
  {
    id: "hyperrat",
    name: "HyperRat",
    category: "rat",
    description: "أداة RAT متقدمة بنموذج MaaS (Malware-as-a-Service)",
    details: "تمتلك واجهة احترافية باللغة الروسية وتعمل كخدمة برمجيات خبيثة مُدارة. تتلقى تحديثات مستمرة لتجنب الكشف من مضادات الفيروسات.",
    platform: ["Android"],
    risk: "critical",
    type: "offensive",
    techniques: [
      "واجهة إدارة احترافية MaaS",
      "تحديثات مستمرة لتجنب الكشف",
      "التحكم الكامل بالجهاز المصاب",
      "سرقة بيانات التطبيقات المصرفية",
    ],
    defenses: ["استخدام EDR على الأجهزة المحمولة", "مراقبة نشاط الشبكة", "فحص التطبيقات"],
  },
  {
    id: "anubis",
    name: "Anubis Banking Trojan → RAT",
    category: "rat",
    description: "برمجية خبيثة متطورة بدأت كـ Banking Trojan وتطورت لـ RAT كامل",
    details: "تسجيل الصوت والمفاتيح (Keylogger)، وتسجيل الشاشة في الوقت الفعلي، وسرقة بيانات التطبيقات المصرفية والمحافظ الرقمية. تتميز بتقنيات تهرب متقدمة من الكشف.",
    platform: ["Android"],
    risk: "critical",
    type: "offensive",
    techniques: [
      "Keylogger — تسجيل ضربات المفاتيح",
      "Screen Recording — تسجيل الشاشة",
      "Banking Credential Theft — سرقة بيانات مصرفية",
      "Cryptocurrency Wallet Theft — سرقة محافظ العملات",
    ],
    defenses: ["استخدام تطبيقات بنكية رسمية فقط", "تفعيل 2FA", "مراقبة العمليات المالية"],
  },

  // ── Spyware ──────────────────────────────────────────────────────────────────
  {
    id: "pegasus",
    name: "Pegasus (NSO Group)",
    category: "spyware",
    description: "أقوى برنامج تجسس عسكري تم تطويره — Zero-click على iOS وAndroid",
    details: "يستخدم Zero-click exploits بدون أي تفاعل من المستخدم. يمنح وصولاً كاملاً للجهاز: كاميرا، ميكروفون، رسائل، موقع، تطبيقات مشفرة. يملك آلية Self-destruct عند اكتشاف التحليل الجنائي ويدعم Network injection لحقن الاستغلال مباشرة.",
    platform: ["iOS", "Android"],
    risk: "critical",
    type: "offensive",
    techniques: [
      "Zero-click exploits — اختراق بدون تفاعل المستخدم",
      "Full device access — وصول كامل للجهاز",
      "E2E encryption bypass — تجاوز تشفير WhatsApp وSignal",
      "Self-destruct mechanism — إزالة الأثر عند الكشف",
      "Network injection — حقن الاستغلال عبر الشبكة",
    ],
    defenses: ["تحديث iOS/Android فور توفر التحديث", "استخدام Lockdown Mode (iOS 16+)", "فحص الجهاز بـ MVT"],
  },
  {
    id: "predator",
    name: "Predator (Intellexa)",
    category: "spyware",
    description: "برنامج تجسس تجاري منافس لـ Pegasus يستهدف iOS وAndroid",
    details: "يستغل ثغرات iOS Zero-day ويستخدم Apple Shortcuts للاستمرارية على الجهاز. يمتلك قدرات Network-injection delivery لحقن الاستغلال عبر مزودي الإنترنت.",
    platform: ["iOS", "Android"],
    risk: "critical",
    type: "offensive",
    techniques: [
      "iOS Zero-day exploitation",
      "Apple Shortcuts persistence",
      "Network-injection delivery",
      "Cross-platform surveillance",
    ],
    defenses: ["تجنب الروابط المجهولة", "استخدام DNS over HTTPS", "Lockdown Mode"],
  },
  {
    id: "graphite",
    name: "Graphite (Paragon Solutions)",
    category: "spyware",
    description: "أداة تجسس تجارية جديدة مع وصول شامل لتطبيقات المراسلة",
    details: "تمتلك وصولاً شاملاً لتطبيقات المراسلة المشفرة وOS-level persistence. تُستخدم من قبل حكومات للمراقبة المستهدفة.",
    platform: ["iOS", "Android"],
    risk: "critical",
    type: "offensive",
    techniques: [
      "Messaging app access (Signal, WhatsApp, Telegram)",
      "OS-level persistence",
      "Encrypted channel interception",
    ],
    defenses: ["تفعيل Advanced Data Protection (Apple)", "مراجعة الإعدادات الأمنية", "اختيار هاتف مخصص للأمان"],
  },

  // ── MITM Tools ───────────────────────────────────────────────────────────────
  {
    id: "bettercap",
    name: "BetterCAP",
    category: "mitm",
    description: "إطار عمل MITM متقدم يدعم Wi-Fi وBluetooth وشبكات المحمول",
    details: "يدعم Wi-Fi network scanning والتلاعب بالشبكة، وهجمات Bluetooth Low Energy (BLE)، وCaptive Portal لسرقة البيانات، وCredential harvesting، وNetwork sniffing.",
    platform: ["Linux", "macOS", "Android (NetHunter)"],
    risk: "high",
    type: "offensive",
    link: "https://github.com/bettercap/bettercap",
    techniques: [
      "ARP Spoofing — تسموم جدول ARP",
      "SSL Stripping — تخفيض مستوى HTTPS",
      "BLE hijacking — اختراق Bluetooth LE",
      "DNS Spoofing — تزوير استجابات DNS",
      "Credential harvesting — سرقة بيانات الدخول",
    ],
    defenses: ["HTTPS Strict Transport Security (HSTS)", "استخدام VPN", "Certificate Pinning"],
  },
  {
    id: "burp-mobile",
    name: "Burp Suite (Mobile Proxy)",
    category: "mitm",
    description: "الأداة الأشهر لاختبار تطبيقات الموبايل عبر HTTP proxy",
    details: "يعمل كـ HTTP/HTTPS Proxy لاعتراض وتعديل الطلبات من تطبيقات الموبايل. يدعم SSL Stripping وCertificate Pinning Bypass وTraffic Interception.",
    platform: ["Android", "iOS"],
    risk: "high",
    type: "analysis",
    link: "https://portswigger.net/burp",
    techniques: [
      "SSL Stripping — إجبار HTTPS على العمل كـ HTTP",
      "Certificate Pinning Bypass — تجاوز تثبيت الشهادات",
      "Traffic Interception — اعتراض حركة البيانات",
      "Request Manipulation — تعديل الطلبات في الوقت الفعلي",
    ],
    defenses: ["Certificate Pinning", "Mutual TLS (mTLS)", "Root Detection"],
  },
  {
    id: "sslstrip",
    name: "SSLstrip+",
    category: "mitm",
    description: "تحويل HTTPS إلى HTTP واعتراض البيانات غير المشفرة",
    details: "تقوم بتخفيض مستوى الاتصال من HTTPS إلى HTTP وتتوسط بين الضحية والخادم، مما يتيح اعتراض البيانات المشفرة.",
    platform: ["Linux"],
    risk: "high",
    type: "offensive",
    link: "https://github.com/moxie0/sslstrip",
    techniques: [
      "HTTPS Downgrade Attack",
      "Session Cookie Theft",
      "Credential Interception",
    ],
    defenses: ["HSTS Preloading", "HTTPS-only في المتصفح", "استخدام VPN"],
  },

  // ── C2 Frameworks ────────────────────────────────────────────────────────────
  {
    id: "cobalt-strike",
    name: "Cobalt Strike",
    category: "c2",
    description: "منصة محاكاة الخصم الأقوى مع Beacon Payload ذكي",
    details: "تستخدم Beacon payload للاتصال الخفي بالجهاز المصاب، وMalleable C2 لتخصيص حركة المرور لتجنب الكشف، وSMB/Beacon للتنقل عبر الشبكات الداخلية، وقنوات اتصال مشفرة عبر HTTP/DNS/SMB.",
    platform: ["Windows", "Linux", "macOS"],
    risk: "critical",
    type: "offensive",
    link: "https://cobaltstrike.com",
    techniques: [
      "Beacon — اتصال خفي دوري بـ C2 server",
      "Malleable C2 — تخصيص نمط الاتصال",
      "SMB Beacon — التنقل الجانبي عبر الشبكات",
      "Covert channels — HTTP/DNS/SMB tunneling",
      "Process Injection — حقن الكود في عمليات شرعية",
    ],
    defenses: ["فحص نمط حركة مرور الشبكة", "استخدام EDR متقدم", "Network Segmentation"],
  },
  {
    id: "sliver",
    name: "Sliver C2",
    category: "c2",
    description: "بديل مفتوح المصدر لـ Cobalt Strike مع Multiplayer mode",
    details: "إطار C2 مفتوح المصدر يدعم Multiplayer mode وMultiple transport protocols (HTTP/HTTPS/DNS/mTLS) وIn-memory execution لتجنب الكشف. مبني بـ Go.",
    platform: ["Windows", "Linux", "macOS", "Android"],
    risk: "critical",
    type: "offensive",
    link: "https://github.com/BishopFox/sliver",
    techniques: [
      "Multiple C2 transports — HTTP, HTTPS, DNS, mTLS",
      "In-memory execution — تجنب الكتابة على القرص",
      "Multiplayer — فريق كامل يتحكم بنفس الهدف",
      "Cross-platform implants — Windows وLinux وmacOS",
    ],
    defenses: ["فحص الاتصالات الخارجية غير المألوفة", "DNS Monitoring", "EDR Behavioral Detection"],
  },

  // ── Analysis Tools ────────────────────────────────────────────────────────────
  {
    id: "frida",
    name: "Frida",
    category: "analysis",
    description: "أقوى أداة Dynamic Instrumentation — Hook أي دالة في الوقت الفعلي",
    details: "تتيح Hooking أي دالة في التطبيقات المشغلة وتجاوز Root Detection وJailbreak Detection وتعديل سلوك التطبيقات في الوقت الفعلي والتقاط API calls التشفيرية. تعمل عبر Android وiOS وWindows وmacOS وLinux.",
    platform: ["Android", "iOS", "Windows", "macOS", "Linux"],
    risk: "high",
    type: "analysis",
    link: "https://frida.re",
    techniques: [
      "Function Hooking — تعديل سلوك الدوال",
      "Root/Jailbreak Detection Bypass",
      "SSL Pinning Bypass",
      "API Call Interception",
      "Memory Dump — تفريغ الذاكرة",
    ],
    defenses: ["Frida Detection في التطبيق", "Root/Jailbreak Detection متعدد الطبقات", "Integrity Checks"],
  },
  {
    id: "objection",
    name: "Objection",
    category: "analysis",
    description: "إطار Runtime Exploration مبني على Frida لاختبار الموبايل",
    details: "مبنية على Frida وتوفر تجاوز SSL Pinning وتفريغ الذاكرة وتنفيذ أوامر shell على الجهاز واستخراج بيانات التطبيقات بسهولة من واجهة سطر الأوامر.",
    platform: ["Android", "iOS"],
    risk: "high",
    type: "analysis",
    link: "https://github.com/sensepost/objection",
    techniques: [
      "SSL Pinning Bypass — تجاوز تثبيت الشهادات",
      "Memory Dump — تفريغ محتوى الذاكرة",
      "Shell Execution — تنفيذ أوامر على الجهاز",
      "File System Exploration — استكشاف نظام الملفات",
    ],
    defenses: ["Root/Jailbreak Detection", "Code Obfuscation", "Integrity Verification"],
  },
  {
    id: "drozer",
    name: "Drozer",
    category: "analysis",
    description: "إطار اختبار أمان Android شامل من MWR InfoSecurity",
    details: "يتيح التفاعل مع تطبيقات Android على مستوى الـ IPC وBinder واستغلال ثغرات Content Providers وActivities وServices المكشوفة.",
    platform: ["Android"],
    risk: "high",
    type: "analysis",
    link: "https://github.com/WithSecureLabs/drozer",
    techniques: [
      "Content Provider Exploitation",
      "Activity Hijacking",
      "Intent Injection",
      "Broadcast Receiver Abuse",
    ],
    defenses: ["تقييد صلاحيات IPC", "exported=false للمكوّنات الحساسة", "اختبار أمان قبل النشر"],
  },
  {
    id: "apktool",
    name: "APKTool + JADX",
    category: "analysis",
    description: "فك تجميع وإعادة بناء تطبيقات Android (Decompile + Rebuild)",
    details: "APKTool يفكك ملفات APK لاستعادة الكود Smali والموارد، بينما JADX يحوّل bytecode إلى Java/Kotlin قابلة للقراءة. يُستخدم لاكتشاف مفاتيح API المخبأة والمنطق الخفي.",
    platform: ["Android"],
    risk: "medium",
    type: "analysis",
    link: "https://github.com/iBotPeaches/Apktool",
    techniques: [
      "APK Decompilation — استعادة الكود الأصلي",
      "Hardcoded Secret Discovery — اكتشاف المفاتيح المخبأة",
      "APK Repackaging — إعادة حزم مع كود خبيث",
      "Binary Patching — تعديل السلوك",
    ],
    defenses: ["Code Obfuscation (ProGuard/R8)", "Anti-tamper Detection", "تجنب تخزين الأسرار في الكود"],
  },

  // ── Social Engineering ────────────────────────────────────────────────────────
  {
    id: "set-mobile",
    name: "Social-Engineer Toolkit (SET) — Mobile",
    category: "social",
    description: "أدوات الهندسة الاجتماعية المتخصصة للأجهزة المحمولة",
    details: "يدعم SMS Phishing campaigns وCredential Harvesters مُحسّنة للهواتف وهجمات QR Code. يُنشئ صفحات تصيد متوافقة مع Mobile responsive design.",
    platform: ["Linux"],
    risk: "high",
    type: "offensive",
    link: "https://github.com/trustedsec/social-engineer-toolkit",
    techniques: [
      "SMS Phishing (Smishing)",
      "Mobile-optimized phishing pages",
      "QR Code attacks",
      "Credential harvesting via mobile forms",
    ],
    defenses: ["التحقق من الروابط", "عدم مسح QR codes مجهولة", "الوعي الأمني"],
  },
  {
    id: "evilginx2",
    name: "Evilginx2",
    category: "social",
    description: "تجاوز 2FA عبر Real-time session hijacking — يعمل على Mobile",
    details: "يعمل كـ Reverse Proxy بين الضحية والموقع الحقيقي، مما يتيح سرقة Session Cookies حتى مع تفعيل 2FA. يملك Mobile-optimized templates لصفحات التصيد.",
    platform: ["Linux"],
    risk: "critical",
    type: "offensive",
    link: "https://github.com/kgretzky/evilginx2",
    techniques: [
      "2FA Bypass عبر Session Hijacking",
      "Transparent Reverse Proxy",
      "Real-time credential theft",
      "Mobile-optimized phishing templates",
    ],
    defenses: ["FIDO2/Hardware Security Keys", "Passkeys بدلاً من كلمات مرور", "مراقبة الجلسات المشبوهة"],
  },

  // ── Defense Tools ─────────────────────────────────────────────────────────────
  {
    id: "mvt",
    name: "Mobile Verification Toolkit (MVT)",
    category: "defense",
    description: "أداة Amnesty International للكشف عن برامج التجسس (Pegasus وغيره)",
    details: "تحلل نسخ احتياطية من iOS وAndroid للكشف عن مؤشرات الاختراق (IOCs) المرتبطة ببرامج التجسس مثل Pegasus وPredator وغيرها. تصدر تقريراً شاملاً بالمخاطر.",
    platform: ["iOS", "Android"],
    risk: "low",
    type: "defensive",
    link: "https://github.com/mvt-project/mvt",
    techniques: [
      "Pegasus IOC Detection",
      "Backup Analysis (iTunes/Android)",
      "Process History Analysis",
      "Network Connection Analysis",
    ],
    defenses: ["فحص الجهاز دورياً", "الاحتفاظ بنسخ احتياطية للفحص", "تحديث IOC Database"],
  },
  {
    id: "lockdown-mode",
    name: "Lockdown Mode (Apple iOS 16+)",
    category: "defense",
    description: "وضع الحماية القصوى من Apple ضد برامج التجسس المتطورة",
    details: "يقيّد ميزات iPhone بشكل كبير لحماية المستخدمين من Zero-click attacks. يعطّل معاينات روابط iMessage وعمليات JIT في Safari وبعض ميزات AirDrop.",
    platform: ["iOS"],
    risk: "low",
    type: "defensive",
    link: "https://support.apple.com/lockdown-mode",
    techniques: ["Zero-click Attack Prevention", "Attack Surface Reduction"],
    defenses: ["تفعيله للأشخاص المستهدفين من قبل جهات حكومية"],
  },
  {
    id: "mobile-edp",
    name: "Mobile EDR Solutions (Lookout, Zimperium)",
    category: "defense",
    description: "حلول الكشف والاستجابة للتهديدات على الأجهزة المحمولة",
    details: "توفر Behavioral Analysis للتطبيقات وكشف شبكات Wi-Fi الخبيثة وNetwork Traffic Analysis وCertificate Monitoring. تدعم Lookout وZimperium وCrowdStrike Falcon for Mobile.",
    platform: ["Android", "iOS"],
    risk: "low",
    type: "defensive",
    link: "https://www.zimperium.com",
    techniques: [
      "Behavioral App Analysis",
      "Malicious Wi-Fi Detection",
      "Certificate Anomaly Detection",
      "Jailbreak/Root Detection",
    ],
    defenses: ["نشر MDM + Mobile EDR في المؤسسات", "سياسات MAM", "Zero Trust للجهاز المحمول"],
  },
];

const CATEGORIES: { id: ToolCategory; label: string; icon: React.ComponentType<any>; color: string }[] = [
  { id: "all", label: "الكل", icon: Layers, color: "#e21227" },
  { id: "frameworks", label: "أُطر العمل", icon: Cpu, color: "#f97316" },
  { id: "rat", label: "RAT", icon: Bug, color: "#e21227" },
  { id: "spyware", label: "برامج التجسس", icon: Eye, color: "#a855f7" },
  { id: "mitm", label: "MITM", icon: Wifi, color: "#06b6d4" },
  { id: "c2", label: "C2 Frameworks", icon: Server, color: "#f59e0b" },
  { id: "analysis", label: "التحليل", icon: Code, color: "#10b981" },
  { id: "social", label: "الهندسة الاجتماعية", icon: Globe, color: "#ec4899" },
  { id: "defense", label: "الدفاع", icon: Shield, color: "#22c55e" },
];

const RISK_COLORS: Record<string, string> = {
  critical: "#e21227",
  high: "#f97316",
  medium: "#f59e0b",
  low: "#22c55e",
};

const RISK_LABELS: Record<string, string> = {
  critical: "حرج",
  high: "عالي",
  medium: "متوسط",
  low: "منخفض",
};

const TYPE_COLORS: Record<string, string> = {
  offensive: "#e21227",
  defensive: "#22c55e",
  analysis: "#06b6d4",
};

const TYPE_LABELS: Record<string, string> = {
  offensive: "هجومي",
  defensive: "دفاعي",
  analysis: "تحليل",
};

export function MobileSecurityModal({ isOpen, onClose }: MobileSecurityModalProps) {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("all");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let tools = MOBILE_TOOLS;
    if (activeCategory !== "all") tools = tools.filter(t => t.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      tools = tools.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.techniques?.some(tc => tc.toLowerCase().includes(q))
      );
    }
    return tools;
  }, [activeCategory, search]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="mobile-security-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25 }}
          className="relative flex flex-col"
          style={{
            width: "min(1000px, 96vw)",
            height: "min(86vh, 820px)",
            background: "#0d0d0d",
            border: "1px solid #1f1f1f",
            borderRadius: 16,
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{ background: "#111", borderBottom: "1px solid #1f1f1f", padding: "18px 24px", flexShrink: 0 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Smartphone size={20} style={{ color: "#e21227" }} />
                </div>
                <div>
                  <h2 style={{ color: "#fff", fontWeight: 700, fontSize: 17, margin: 0 }}>Mobile Security Arsenal</h2>
                  <p style={{ color: "#666", fontSize: 12, margin: 0 }}>
                    أدوات اختبار اختراق الأجهزة المحمولة — PENTEST_TOOLS.md — {MOBILE_TOOLS.length} أداة
                  </p>
                </div>
              </div>
              <button onClick={onClose} style={{ color: "#666", background: "none", border: "none", cursor: "pointer", padding: 6, borderRadius: 8, transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "#666")}>
                <X size={20} />
              </button>
            </div>

            {/* Disclaimer */}
            <div style={{ marginTop: 12, padding: "8px 12px", background: "rgba(226,18,39,0.06)", border: "1px solid rgba(226,18,39,0.2)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <AlertTriangle size={14} style={{ color: "#e21227", flexShrink: 0 }} />
              <span style={{ color: "#e21227", fontSize: 11, fontFamily: "monospace" }}>
                للأغراض التعليمية والبحثية واختبار الاختراق المُصرّح به فقط — استخدام هذه الأدوات ضد أنظمة بدون إذن يُعدّ جريمة
              </span>
            </div>

            {/* Search */}
            <div style={{ marginTop: 12, position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#555" }} />
              <input
                type="text"
                placeholder="ابحث في الأدوات، التقنيات..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: "100%", padding: "8px 12px 8px 36px",
                  background: "#161616", border: "1px solid #2a2a2a", borderRadius: 8,
                  color: "#ccc", fontSize: 13, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div style={{ padding: "12px 24px 8px", borderBottom: "1px solid #1a1a1a", flexShrink: 0, overflowX: "auto" }}>
            <div style={{ display: "flex", gap: 8, minWidth: "max-content" }}>
              {CATEGORIES.map(cat => {
                const Icon = cat.icon;
                const active = activeCategory === cat.id;
                const count = cat.id === "all" ? MOBILE_TOOLS.length : MOBILE_TOOLS.filter(t => t.category === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                      background: active ? `${cat.color}18` : "transparent",
                      color: active ? cat.color : "#555",
                      borderBottom: active ? `2px solid ${cat.color}` : "2px solid transparent",
                      fontSize: 12, fontWeight: active ? 600 : 400, transition: "all 0.2s",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Icon size={13} />
                    {cat.label}
                    <span style={{ background: active ? `${cat.color}30` : "#1a1a1a", color: active ? cat.color : "#444", borderRadius: 99, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tool Grid */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", color: "#444", padding: "60px 0" }}>
                <Search size={32} style={{ margin: "0 auto 12px", display: "block" }} />
                <div>لا توجد أدوات تطابق البحث</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))", gap: 12 }}>
                {filtered.map(tool => {
                  const isExpanded = expandedId === tool.id;
                  const riskColor = RISK_COLORS[tool.risk];
                  const typeColor = TYPE_COLORS[tool.type];
                  return (
                    <motion.div
                      key={tool.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={{
                        background: "#111",
                        border: `1px solid ${isExpanded ? riskColor + "40" : "#1f1f1f"}`,
                        borderRadius: 12,
                        overflow: "hidden",
                        transition: "border-color 0.2s",
                      }}
                    >
                      {/* Tool Header */}
                      <div
                        style={{ padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 12 }}
                        onClick={() => setExpandedId(isExpanded ? null : tool.id)}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                            <span style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{tool.name}</span>
                            <span style={{ padding: "2px 7px", borderRadius: 99, fontSize: 10, fontWeight: 600, background: `${riskColor}18`, color: riskColor, border: `1px solid ${riskColor}40` }}>
                              {RISK_LABELS[tool.risk]}
                            </span>
                            <span style={{ padding: "2px 7px", borderRadius: 99, fontSize: 10, background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}30` }}>
                              {TYPE_LABELS[tool.type]}
                            </span>
                          </div>
                          <p style={{ color: "#888", fontSize: 12, margin: 0, lineHeight: 1.5 }}>{tool.description}</p>
                          <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap" }}>
                            {tool.platform.map(p => (
                              <span key={p} style={{ padding: "1px 6px", borderRadius: 99, fontSize: 10, background: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}>{p}</span>
                            ))}
                          </div>
                        </div>
                        <div style={{ color: "#444", flexShrink: 0, marginTop: 2 }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: "hidden" }}
                          >
                            <div style={{ padding: "0 16px 16px", borderTop: "1px solid #1a1a1a" }}>
                              <p style={{ color: "#aaa", fontSize: 12.5, lineHeight: 1.7, marginTop: 12 }}>{tool.details}</p>

                              {tool.techniques && tool.techniques.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                  <div style={{ color: "#e21227", fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>التقنيات والقدرات</div>
                                  {tool.techniques.map((t, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                                      <Zap size={11} style={{ color: "#e21227", flexShrink: 0, marginTop: 2 }} />
                                      <span style={{ color: "#888", fontSize: 12 }}>{t}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {tool.defenses && tool.defenses.length > 0 && (
                                <div style={{ marginTop: 12 }}>
                                  <div style={{ color: "#22c55e", fontSize: 11, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>آليات الدفاع</div>
                                  {tool.defenses.map((d, i) => (
                                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                                      <Shield size={11} style={{ color: "#22c55e", flexShrink: 0, marginTop: 2 }} />
                                      <span style={{ color: "#888", fontSize: 12 }}>{d}</span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                                {tool.link && (
                                  <a
                                    href={tool.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: "#ccc", fontSize: 11, textDecoration: "none", transition: "all 0.2s" }}
                                  >
                                    <ExternalLink size={11} />
                                    الموقع الرسمي
                                  </a>
                                )}
                                <button
                                  onClick={() => copyToClipboard(tool.name + " — " + tool.description, tool.id)}
                                  style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 6, color: "#ccc", fontSize: 11, cursor: "pointer", transition: "all 0.2s" }}
                                >
                                  {copiedId === tool.id ? <CheckCheck size={11} style={{ color: "#22c55e" }} /> : <Copy size={11} />}
                                  {copiedId === tool.id ? "تم النسخ" : "نسخ"}
                                </button>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: "12px 24px", borderTop: "1px solid #1a1a1a", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <span style={{ color: "#444", fontSize: 11 }}>
              {filtered.length} من {MOBILE_TOOLS.length} أداة | PENTEST_TOOLS.md Integration Complete
            </span>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {Object.entries(RISK_COLORS).map(([risk, color]) => (
                <div key={risk} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
                  <span style={{ color: "#555", fontSize: 10 }}>{RISK_LABELS[risk]}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
