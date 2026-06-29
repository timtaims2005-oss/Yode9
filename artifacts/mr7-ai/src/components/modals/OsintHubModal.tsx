import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, ExternalLink, Copy, CheckCheck, Shield, AlertTriangle, Globe,
  Phone, Mail, User, Database, Layers, Crosshair, Scale, Filter, Star,
  ChevronDown, ChevronUp, Zap, Eye, Activity
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────
type ToolBadge = "free" | "paid" | "legal";
type ToolStatus = "online" | "offline";
type TabId = "all" | "search" | "databases" | "phone" | "email" | "username" | "frameworks" | "recon" | "legal";

interface OsintTool {
  name: string;
  description: string;
  tags: string[];
  link: string;
  badge: ToolBadge;
  category: string;
  status: ToolStatus;
  details: string;
  tab: TabId;
}

interface Framework {
  name: string;
  usage: string;
  type: string;
  link: string;
}

// ─── ALL TOOLS DATA (from OSINT_Hub.md — complete) ───────
const SEARCH_TOOLS: OsintTool[] = [
  {
    name: "Maltego",
    description: "أداة رسومية قوية لتحليل العلاقات بين البيانات وربط المعلومات بشكل مرئي",
    tags: ["تحليل", "رسومي", "علاقات", "بيانات"],
    link: "https://www.maltego.com",
    badge: "paid",
    category: "نظام بحث متقدم",
    status: "online",
    details: "Maltego هو أداة قوية لتحليل الروابط والعلاقات بين البيانات المفتوحة. يستخدم في التحقيقات الرقمية وتحليل الشبكات الاجتماعية.",
    tab: "search",
  },
  {
    name: "SpiderFoot",
    description: "أتمتة جمع المعلومات من مصادر متعددة بشكل تلقائي وشامل",
    tags: ["أتمتة", "مصادر متعددة", "جمع معلومات"],
    link: "https://www.spiderfoot.net",
    badge: "free",
    category: "نظام بحث متقدم",
    status: "online",
    details: "SpiderFoot يقوم بجمع المعلومات تلقائياً من أكثر من 100 مصدر مختلف للبيانات المفتوحة.",
    tab: "search",
  },
  {
    name: "theHarvester",
    description: "جمع رسائل البريد الإلكتروني والنطاقات الفرعية والموظفين",
    tags: ["بريد إلكتروني", "نطاقات فرعية", "موظفين"],
    link: "https://github.com/laramies/theHarvester",
    badge: "free",
    category: "نظام بحث متقدم",
    status: "online",
    details: "theHarvester أداة مخصصة لجمع البريد الإلكتروني وأسماء الموظفين والنطاقات الفرعية لشركة معينة.",
    tab: "search",
  },
  {
    name: "Sherlock",
    description: "البحث عن أسماء المستخدمين عبر منصات متعددة (400+ منصة)",
    tags: ["اسم مستخدم", "شبكات اجتماعية", "400+ منصة"],
    link: "https://github.com/sherlock-project/sherlock",
    badge: "free",
    category: "نظام بحث متقدم",
    status: "online",
    details: "Sherlock يبحث عن اسم المستخدم عبر 400+ منصة اجتماعية وموقع مختلف.",
    tab: "search",
  },
];

const DATABASE_TOOLS: OsintTool[] = [
  {
    name: "Have I Been Pwned",
    description: "التحقق من تسريبات البيانات والبريد الإلكتروني في الاختراقات المعروفة",
    tags: ["تسريبات", "بريد إلكتروني", "تحقق"],
    link: "https://haveibeenpwned.com",
    badge: "free",
    category: "قاعدة بيانات",
    status: "online",
    details: "يمكنك التحقق مما إذا تم تسريب بريدك الإلكتروني في اختراقات البيانات المعروفة.",
    tab: "databases",
  },
  {
    name: "IntelX",
    description: "محرك بحث في البيانات المسربة والمعلومات العامة والويب المظلم",
    tags: ["بيانات مسربة", "ويب مظلم", "بحث"],
    link: "https://intelx.io",
    badge: "paid",
    category: "قاعدة بيانات",
    status: "online",
    details: "IntelX يوفر محرك بحث قوي في البيانات المسربة والمعلومات المتاحة علنياً.",
    tab: "databases",
  },
  {
    name: "Shodan",
    description: "محرك بحث للأجهزة المتصلة بالإنترنت والخوادم والإنترنت الأشياء",
    tags: ["أجهزة", "إنترنت الأشياء", "خوادم"],
    link: "https://www.shodan.io",
    badge: "free",
    category: "قاعدة بيانات",
    status: "online",
    details: "Shodan يتيح لك البحث عن الأجهزة المتصلة بالإنترنت: كاميرات، خوادم، أجهزة IoT.",
    tab: "databases",
  },
  {
    name: "Censys",
    description: "فحص البنية التحتية للإنترنت وتحليل الشهادات الأمنية",
    tags: ["بنية تحتية", "شهادات", "أمن"],
    link: "https://censys.io",
    badge: "free",
    category: "قاعدة بيانات",
    status: "online",
    details: "Censys يركز على فحص الشهادات الرقمية والبنية التحتية للإنترنت.",
    tab: "databases",
  },
];

const PHONE_TOOLS: OsintTool[] = [
  {
    name: "Truecaller",
    description: "تحديد هوية المتصل باستخدام قاعدة بيانات مجتمعية ضخمة",
    tags: ["هوية المتصل", "قاعدة بيانات", "مجتمعية"],
    link: "https://www.truecaller.com",
    badge: "free",
    category: "أدوات الهاتف",
    status: "online",
    details: "Truecaller يستخدم قاعدة بيانات مجتمعية لتحديد هوية المتصلين المجهولين.",
    tab: "phone",
  },
  {
    name: "PhoneInfoga",
    description: "أداة متقدمة لجمع معلومات أرقام الهاتف مع دعم متعدد المصادر",
    tags: ["أرقام هاتف", "جمع معلومات", "متقدم"],
    link: "https://github.com/sundowndev/PhoneInfoga",
    badge: "free",
    category: "أدوات الهاتف",
    status: "online",
    details: "PhoneInfoga أداة متقدمة لجمع معلومات مفصلة عن أرقام الهاتف من مصادر متعددة.",
    tab: "phone",
  },
  {
    name: "Numverify",
    description: "التحقق من صحة أرقام الهاتف وتحديد الدولة والناقل",
    tags: ["تحقق", "صحة الرقم", "الناقل", "الدولة"],
    link: "https://numverify.com",
    badge: "free",
    category: "أدوات الهاتف",
    status: "online",
    details: "Numverify يوفر API للتحقق من صحة أرقام الهاتف وتحديد موقعها والناقل.",
    tab: "phone",
  },
  {
    name: "NumLookup",
    description: "تحديد الناقل والدولة والموقع الجغرافي للرقم",
    tags: ["ناقل", "دولة", "موقع"],
    link: "https://www.numlookup.com",
    badge: "free",
    category: "أدوات الهاتف",
    status: "online",
    details: "NumLookup يتيح لك البحث عن معلومات الناقل والدولة لأي رقم هاتف.",
    tab: "phone",
  },
];

const EMAIL_TOOLS: OsintTool[] = [
  {
    name: "Holehe",
    description: "التحقق من وجود الحساب على منصات متعددة باستخدام البريد الإلكتروني",
    tags: ["تحقق", "منصات متعددة", "حسابات"],
    link: "https://github.com/megadose/holehe",
    badge: "free",
    category: "أدوات البريد",
    status: "online",
    details: "Holehe يتحقق من وجود حساب بريد إلكتروني على أكثر من 100 منصة بدون إرسال إشعار.",
    tab: "email",
  },
  {
    name: "Hunter.io",
    description: "البحث عن عناوين البريد في الشركات والمجالات المحددة",
    tags: ["شركات", "مجالات", "بحث"],
    link: "https://hunter.io",
    badge: "free",
    category: "أدوات البريد",
    status: "online",
    details: "Hunter.io يساعد في العثور على عناوين البريد الإلكتروني المرتبطة بشركة أو مجال معين.",
    tab: "email",
  },
  {
    name: "Have I Been Pwned (Email)",
    description: "التحقق من تسريبات البيانات عبر البريد الإلكتروني",
    tags: ["تسريبات", "تحقق", "بيانات"],
    link: "https://haveibeenpwned.com",
    badge: "free",
    category: "أدوات البريد",
    status: "online",
    details: "تحقق مما إذا كان بريدك الإلكتروني قد ظهر في أي اختراقات معروفة.",
    tab: "email",
  },
  {
    name: "Emailrep.io",
    description: "تحليل سمعة البريد الإلكتروني وكشف التصيد الاحتيالي",
    tags: ["سمعة", "تصيد", "تحليل"],
    link: "https://emailrep.io",
    badge: "free",
    category: "أدوات البريد",
    status: "online",
    details: "Emailrep.io يقيّم سمعة أي عنوان بريد إلكتروني ويكشف عن التصيد الاحتيالي.",
    tab: "email",
  },
];

const USERNAME_TOOLS: OsintTool[] = [
  {
    name: "Sherlock",
    description: "البحث عن اسم المستخدم عبر 400+ منصة اجتماعية وموقع مختلف",
    tags: ["400+ منصة", "اسم مستخدم", "شبكات اجتماعية"],
    link: "https://github.com/sherlock-project/sherlock",
    badge: "free",
    category: "البحث بالاسم",
    status: "online",
    details: "Sherlock يبحث عن اسم المستخدم عبر مئات المنصات الاجتماعية والمواقع.",
    tab: "username",
  },
  {
    name: "Social Searcher",
    description: "البحث في الشبكات الاجتماعية بدون تسجيل دخول",
    tags: ["شبكات اجتماعية", "بحث", "بدون تسجيل"],
    link: "https://www.social-searcher.com",
    badge: "free",
    category: "البحث بالاسم",
    status: "online",
    details: "Social Searcher يسمح بالبحث في الشبكات الاجتماعية بدون الحاجة لحسابات.",
    tab: "username",
  },
  {
    name: "Pipl",
    description: "محرك بحث مدفوع للأشخاص مع معلومات مفصلة",
    tags: ["مدفوع", "أشخاص", "معلومات مفصلة"],
    link: "https://pipl.com",
    badge: "paid",
    category: "البحث بالاسم",
    status: "online",
    details: "Pipl هو محرك بحث متخصص للعثور على الأشخاص ومعلوماتهم المتاحة علنياً.",
    tab: "username",
  },
  {
    name: "Namechk",
    description: "التحقق من توافر اسم المستخدم على عشرات المنصات دفعة واحدة",
    tags: ["توافر", "منصات", "تحقق"],
    link: "https://namechk.com",
    badge: "free",
    category: "البحث بالاسم",
    status: "online",
    details: "Namechk يفحص توافر اسم المستخدم المطلوب على عشرات المنصات الاجتماعية.",
    tab: "username",
  },
];

const RECON_TOOLS: OsintTool[] = [
  {
    name: "Recon-ng",
    description: "إطار عمل ويب مخصص للـ OSINT مع وحدات متعددة",
    tags: ["ويب", "وحدات", "أتمتة"],
    link: "https://github.com/lanmaster53/recon-ng",
    badge: "free",
    category: "جمع المعلومات",
    status: "online",
    details: "Recon-ng هو إطار عمل ويب كامل لأتمتة عمليات جمع المعلومات المفتوحة.",
    tab: "recon",
  },
  {
    name: "OSINT Framework",
    description: "دليل منظم لمصادر المعلومات المفتوحة مع تصنيفات شاملة",
    tags: ["دليل", "تصنيفات", "مصادر"],
    link: "https://osintframework.com",
    badge: "free",
    category: "جمع المعلومات",
    status: "online",
    details: "OSINT Framework يوفر دليلاً منظماً شاملاً لمصادر المعلومات المفتوحة.",
    tab: "recon",
  },
  {
    name: "DarkSearch",
    description: "محرك بحث في الويب المظلم لتحليل المحتوى المخفي",
    tags: ["ويب مظلم", "بحث", "تحليل"],
    link: "https://darksearch.io",
    badge: "free",
    category: "جمع المعلومات",
    status: "online",
    details: "DarkSearch يتيح البحث في محتوى الويب المظلم والإنترنت المخفي.",
    tab: "recon",
  },
  {
    name: "Amass",
    description: "جمع معلومات النطاقات الفرعية واستطلاع البنية التحتية بعمق",
    tags: ["نطاقات فرعية", "استطلاع", "بنية تحتية"],
    link: "https://github.com/owasp-amass/amass",
    badge: "free",
    category: "جمع المعلومات",
    status: "online",
    details: "Amass من OWASP - أداة شاملة لجمع نطاقات الأهداف وتحليل بنيتها التحتية.",
    tab: "recon",
  },
  {
    name: "Subfinder",
    description: "اكتشاف النطاقات الفرعية بسرعة عالية من مصادر سلبية",
    tags: ["نطاقات فرعية", "سريع", "سلبي"],
    link: "https://github.com/projectdiscovery/subfinder",
    badge: "free",
    category: "جمع المعلومات",
    status: "online",
    details: "Subfinder من ProjectDiscovery - اكتشاف النطاقات الفرعية بطريقة سلبية وسريعة.",
    tab: "recon",
  },
];

const LEGAL_TOOLS: OsintTool[] = [
  {
    name: "الوصول غير المصرح به",
    description: "الوصول إلى بيانات شخصية أو أنظمة خاصة بدون إذن هو جريمة إلكترونية في معظم الدول",
    tags: ["تحذير", "جريمة", "غير قانوني"],
    link: "#",
    badge: "legal",
    category: "تحذير قانوني",
    status: "offline",
    details: "هذا النشاط غير قانوني ويحمل عقوبات سجنية وغرامات مالية في معظم الدول.",
    tab: "legal",
  },
  {
    name: "اختبار الاختراق المصرح به",
    description: "Bug Bounty - الاختبار القانوني مع إذن مسبق من صاحب النظام",
    tags: ["قانوني", "Bug Bounty", "مصرح"],
    link: "https://bugcrowd.com",
    badge: "legal",
    category: "استخدام قانوني",
    status: "online",
    details: "الاختبار المصرح به هو النشاط الوحيد القانوني لاختبار اختراق الأنظمة.",
    tab: "legal",
  },
  {
    name: "حماية النظام الخاص بك",
    description: "استخدام الأدوات لفحص وتحليل أمان نظامك الشخصي",
    tags: ["قانوني", "حماية", "نظام شخصي"],
    link: "#",
    badge: "legal",
    category: "استخدام قانوني",
    status: "online",
    details: "مسموح لك باستخدام كل الأدوات لفحص وتحليل نظامك الخاص أو الأنظمة التي تمتلك إذناً باختبارها.",
    tab: "legal",
  },
  {
    name: "التحقق من هوية المتصلين",
    description: "استخدام الأدوات للتحقق من هوية المتصلين المشبوهين",
    tags: ["قانوني", "تحقق", "هوية"],
    link: "#",
    badge: "legal",
    category: "استخدام قانوني",
    status: "online",
    details: "التحقق من هوية المتصلين لحماية نفسك من التصيد الاحتيالي والاحتيال.",
    tab: "legal",
  },
];

const FRAMEWORKS: Framework[] = [
  { name: "Metasploit",  usage: "اختبار الاختراق والتطوير",              type: "إطار عمل",    link: "https://www.metasploit.com" },
  { name: "Burp Suite",  usage: "اختبار أمان تطبيقات الويب",            type: "أداة ويب",    link: "https://portswigger.net/burp" },
  { name: "Nmap",        usage: "فحص الشبكات والمنافذ",                  type: "فحص شبكات",  link: "https://nmap.org" },
  { name: "Wireshark",   usage: "تحليل حركة المرور والبروتوكولات",       type: "تحليل شبكات", link: "https://www.wireshark.org" },
  { name: "OWASP ZAP",   usage: "اختبار اختراق الويب",                  type: "أمان ويب",   link: "https://www.zaproxy.org" },
  { name: "Kali Linux",  usage: "توزيعة متكاملة للاختبار الأخلاقي",     type: "نظام تشغيل", link: "https://www.kali.org" },
  { name: "Nikto",       usage: "فحص ثغرات خوادم الويب",                type: "فحص ويب",    link: "https://cirt.net/Nikto2" },
  { name: "SQLMap",      usage: "اكتشاف واستغلال ثغرات SQL Injection",  type: "هجوم قواعد البيانات", link: "https://sqlmap.org" },
  { name: "Aircrack-ng", usage: "اختبار أمان شبكات Wi-Fi",              type: "أمان لاسلكي", link: "https://www.aircrack-ng.org" },
  { name: "Hashcat",     usage: "كسر كلمات المرور المشفرة",             type: "كلمات مرور",  link: "https://hashcat.net" },
];

const ALL_TOOLS: OsintTool[] = [
  ...SEARCH_TOOLS,
  ...DATABASE_TOOLS,
  ...PHONE_TOOLS,
  ...EMAIL_TOOLS,
  ...USERNAME_TOOLS,
  ...RECON_TOOLS,
  ...LEGAL_TOOLS,
];

// ─── Tab Config ──────────────────────────────────────────
const TABS: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
  { id: "all",        label: "الكل",           icon: <Globe size={14} /> },
  { id: "search",     label: "أنظمة البحث",    icon: <Search size={14} /> },
  { id: "databases",  label: "قواعد البيانات", icon: <Database size={14} /> },
  { id: "phone",      label: "أدوات الهاتف",   icon: <Phone size={14} /> },
  { id: "email",      label: "أدوات البريد",   icon: <Mail size={14} /> },
  { id: "username",   label: "البحث بالاسم",   icon: <User size={14} /> },
  { id: "frameworks", label: "أطر العمل",      icon: <Layers size={14} /> },
  { id: "recon",      label: "جمع المعلومات",  icon: <Crosshair size={14} /> },
  { id: "legal",      label: "التحذيرات",      icon: <Scale size={14} /> },
];

// ─── Badge / Status Helpers ──────────────────────────────
function badgeStyle(badge: ToolBadge) {
  if (badge === "paid")  return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
  if (badge === "legal") return "bg-sky-500/20 text-sky-400 border border-sky-500/30";
  return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
}
function badgeLabel(badge: ToolBadge) {
  if (badge === "paid")  return "مدفوع";
  if (badge === "legal") return "قانوني";
  return "مجاني";
}
function isDanger(tool: OsintTool) {
  return tool.category.includes("تحذير") || tool.badge === "legal" && tool.status === "offline";
}

// ─── Tool Card ───────────────────────────────────────────
function ToolCard({ tool, onSelect }: { tool: OsintTool; onSelect: (t: OsintTool) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      className={`relative rounded-xl border p-4 cursor-pointer transition-all duration-200 group
        ${isDanger(tool)
          ? "bg-red-900/10 border-red-500/20 hover:border-red-500/50 hover:shadow-[0_8px_24px_rgba(239,68,68,0.15)]"
          : "bg-[#161616] border-[#1f1f1f] hover:border-sky-500/50 hover:shadow-[0_8px_24px_rgba(14,165,233,0.15)]"
        }`}
      onClick={() => onSelect(tool)}
    >
      {/* top accent bar */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity
        ${isDanger(tool)
          ? "bg-gradient-to-r from-red-500 to-orange-500"
          : "bg-gradient-to-r from-sky-500 to-violet-500"}`}
      />

      <div className="flex items-start justify-between mb-2">
        <span className="font-bold text-white text-base">{tool.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${badgeStyle(tool.badge)}`}>
          {badgeLabel(tool.badge)}
        </span>
      </div>

      <p className="text-[#94a3b8] text-sm mb-3 leading-relaxed">{tool.description}</p>

      <div className="flex flex-wrap gap-1 mb-3">
        {tool.tags.map(tag => (
          <span key={tag} className="text-xs px-2 py-0.5 rounded bg-white/5 text-[#94a3b8]">{tag}</span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-[#1f1f1f]">
        <a
          href={tool.link !== "#" ? tool.link : undefined}
          target={tool.link !== "#" ? "_blank" : undefined}
          rel="noopener noreferrer"
          onClick={e => { if (tool.link === "#") e.preventDefault(); e.stopPropagation(); }}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gradient-to-r from-sky-600 to-violet-600 hover:from-sky-500 hover:to-violet-500 text-white font-semibold transition-all"
        >
          <ExternalLink size={11} />
          زيارة الموقع
        </a>
        <div className={`flex items-center gap-1.5 text-xs ${tool.status === "online" ? "text-emerald-400" : "text-red-400"}`}>
          <span className={`w-2 h-2 rounded-full animate-pulse ${tool.status === "online" ? "bg-emerald-400" : "bg-red-400"}`} />
          {tool.status === "online" ? "نشط" : "محظور"}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Tool Detail Modal ───────────────────────────────────
function ToolDetailModal({ tool, onClose }: { tool: OsintTool; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(tool.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [tool.link]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#161616] border border-[#262626] rounded-2xl max-w-lg w-full p-6 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">
              {tool.name}
            </h3>
            <button onClick={onClose} className="text-[#94a3b8] hover:text-red-400 transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {tool.tags.map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded bg-white/5 text-[#94a3b8]">{tag}</span>
            ))}
          </div>

          <p className="text-[#94a3b8] text-sm leading-relaxed mb-3">{tool.description}</p>
          <p className="text-[#94a3b8] text-sm leading-relaxed mb-4">{tool.details}</p>

          <div className="flex items-center gap-2 bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg p-3 mb-4">
            <span className="text-sky-400 text-sm font-mono flex-1 truncate">{tool.link}</span>
            <button
              onClick={copyLink}
              className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-md transition-all ${
                copied ? "bg-emerald-500/20 text-emerald-400" : "bg-[#262626] text-[#94a3b8] hover:bg-sky-500/20 hover:text-sky-400"
              }`}
            >
              {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
              {copied ? "تم النسخ!" : "نسخ"}
            </button>
          </div>

          {tool.link !== "#" && (
            <a
              href={tool.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 hover:from-sky-500 hover:to-violet-500 text-white font-semibold text-sm transition-all"
            >
              <ExternalLink size={14} />
              فتح الموقع في نافذة جديدة
            </a>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Frameworks Table ─────────────────────────────────────
function FrameworksTable({ frameworks }: { frameworks: Framework[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#1f1f1f]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gradient-to-r from-sky-900/60 to-violet-900/60">
            <th className="text-right p-3 font-semibold text-white">الأداة</th>
            <th className="text-right p-3 font-semibold text-white">الاستخدام</th>
            <th className="text-right p-3 font-semibold text-white">النوع</th>
            <th className="text-right p-3 font-semibold text-white">الرابط</th>
          </tr>
        </thead>
        <tbody>
          {frameworks.map((f, i) => (
            <motion.tr
              key={f.name}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="border-t border-[#1f1f1f] hover:bg-white/[0.02] transition-colors"
            >
              <td className="p-3 font-bold text-white">{f.name}</td>
              <td className="p-3 text-[#94a3b8]">{f.usage}</td>
              <td className="p-3">
                <span className="text-xs px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">{f.type}</span>
              </td>
              <td className="p-3">
                <a
                  href={f.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors text-xs"
                >
                  <ExternalLink size={11} />
                  الرابط
                </a>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Stats Bar ────────────────────────────────────────────
function StatsBar() {
  const stats = [
    { icon: <Search size={18} />, value: ALL_TOOLS.length, label: "أداة ونظام",     color: "text-sky-400" },
    { icon: <Filter size={18} />, value: "8",              label: "فئة متخصصة",     color: "text-violet-400" },
    { icon: <Globe size={18} />,  value: "400+",            label: "منصة مدعومة",    color: "text-emerald-400" },
    { icon: <Shield size={18} />, value: "100%",            label: "أخلاقي وقانوني", color: "text-amber-400" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
          className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-3 text-center"
        >
          <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
          <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
          <div className="text-xs text-[#94a3b8] mt-0.5">{s.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────
export function OsintHubModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<OsintTool | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const toolsByTab = useMemo<Record<TabId, OsintTool[]>>(() => ({
    all:       ALL_TOOLS,
    search:    SEARCH_TOOLS,
    databases: DATABASE_TOOLS,
    phone:     PHONE_TOOLS,
    email:     EMAIL_TOOLS,
    username:  USERNAME_TOOLS,
    frameworks:[],
    recon:     RECON_TOOLS,
    legal:     LEGAL_TOOLS,
  }), []);

  const displayTools = useMemo(() => {
    const source = activeTab === "all" ? ALL_TOOLS : (toolsByTab[activeTab] ?? []);
    if (!search.trim()) return source;
    const q = search.toLowerCase();
    return source.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q)) ||
      t.category.toLowerCase().includes(q)
    );
  }, [activeTab, search, toolsByTab]);

  return (
    <div
      dir="rtl"
      className="flex flex-col h-full min-h-0 bg-[#0d0d0d] text-white font-sans"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1f1f1f] bg-[#0d0d0d]/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center">
            <Eye size={16} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-white text-sm leading-tight">OSINT Hub</h2>
            <p className="text-[10px] text-[#94a3b8]">مركز أدوات الاستخبارات المفتوحة والأمن السيبراني</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status dot */}
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            النظام نشط
          </div>
          <button
            onClick={onClose}
            className="text-[#94a3b8] hover:text-red-400 transition-colors p-1"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* ── Body (scrollable) ── */}
      <div className="flex-1 overflow-y-auto p-5 min-h-0">

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-5"
        >
          <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent mb-1">
            مركز أدوات OSINT والأمن السيبراني
          </h1>
          <p className="text-[#94a3b8] text-sm">
            دليل شامل بأقوى الأدوات والأنظمة في مجال الاستخبارات المفتوحة المصادر والأمن السيبراني
          </p>
        </motion.div>

        {/* Legal Warning */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="flex gap-3 bg-red-900/10 border border-red-500/30 rounded-xl p-4 mb-5"
        >
          <AlertTriangle size={22} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-red-400 font-bold text-sm mb-1">تحذيرات قانونية وأخلاقية مهمة</h3>
            <ul className="space-y-1 text-[#94a3b8] text-xs">
              <li>• الوصول غير المصرح به إلى بيانات شخصية أو أنظمة خاصة <strong className="text-red-300">جريمة إلكترونية</strong> في معظم الدول</li>
              <li>• استخدام أدوات البحث مقبول فقط في اختبار الاختراق المصرح به (Bug Bounty) أو البحث عن معلوماتك الشخصية</li>
              <li>• أدوات "اختراق" الهواتف أو استخراج البيانات بدون إذن <strong className="text-red-300">غير قانونية</strong></li>
              <li>• يجب استخدام هذه الأدوات فقط للأغراض الأخلاقية والقانونية</li>
            </ul>
          </div>
        </motion.div>

        {/* Stats */}
        <StatsBar />

        {/* Search */}
        <div className="relative mb-4">
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن أداة، نظام، أو ميزة..."
            className="w-full bg-[#161616] border border-[#1f1f1f] rounded-xl pr-9 pl-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-sky-500/50 transition-colors"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-sky-600 to-violet-600 text-white border-transparent"
                  : "bg-[#161616] border border-[#1f1f1f] text-[#94a3b8] hover:text-white hover:bg-[#262626]"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "frameworks" ? (
            <motion.div key="fw" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <h2 className="flex items-center gap-2 text-base font-bold mb-4 pb-2 border-b border-[#1f1f1f]">
                <Layers size={18} className="text-sky-400" />
                أطر العمل الكاملة
              </h2>
              <FrameworksTable frameworks={FRAMEWORKS} />
            </motion.div>
          ) : (
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {displayTools.length === 0 ? (
                <div className="text-center py-12 text-[#94a3b8]">
                  <Search size={32} className="mx-auto mb-3 opacity-30" />
                  <p>لا توجد نتائج للبحث</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {displayTools.map(tool => (
                    <ToolCard key={`${tool.name}-${tool.tab}`} tool={tool} onSelect={setSelected} />
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t border-[#1f1f1f] flex items-center justify-between text-xs text-[#555]">
          <span>OSINT Hub — للاستخدام القانوني والأخلاقي فقط</span>
          <div className="flex items-center gap-1.5 text-emerald-500">
            <Activity size={11} />
            <span className="animate-pulse">النظام نشط</span>
          </div>
        </div>
      </div>

      {/* ── Tool Detail Modal ── */}
      {selected && (
        <ToolDetailModal tool={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

export default OsintHubModal;
