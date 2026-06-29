import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, ExternalLink, Copy, CheckCheck, Shield, AlertTriangle, Globe,
  Phone, Mail, User, Database, Layers, Crosshair, Scale, Filter, Star,
  ChevronDown, ChevronUp, Zap, Eye, Activity, Wifi, Terminal, RefreshCw,
  CheckCircle, XCircle, Clock, Server, Lock, FileText, Download
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────
type ToolBadge = "free" | "paid" | "legal";
type ToolStatus = "online" | "offline";
type TabId = "all" | "search" | "databases" | "phone" | "email" | "username" | "frameworks" | "recon" | "legal" | "scanner";

interface OsintTool {
  name: string;
  description: string;
  tags: string[];
  link: string;
  badge: ToolBadge;
  category: string;
  status: ToolStatus;
  details: string;
  tab: Exclude<TabId, "all" | "scanner">;
}

interface Framework {
  name: string;
  usage: string;
  type: string;
  link: string;
}

// ─── SEARCH TOOLS (أنظمة البحث المتقدمة) ─────────────────
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
  {
    name: "FOCA",
    description: "استخراج البيانات الوصفية من الوثائق للكشف عن معلومات الشركات",
    tags: ["بيانات وصفية", "وثائق", "شركات", "OSINT"],
    link: "https://github.com/ElevenPaths/FOCA",
    badge: "free",
    category: "نظام بحث متقدم",
    status: "online",
    details: "FOCA تحلل البيانات الوصفية في ملفات Office وPDF للكشف عن أسماء المستخدمين والبرامج والخوادم.",
    tab: "search",
  },
  {
    name: "Metagoofil",
    description: "جمع البيانات الوصفية من الوثائق المتاحة على الإنترنت",
    tags: ["بيانات وصفية", "وثائق", "Google"],
    link: "https://github.com/laramies/metagoofil",
    badge: "free",
    category: "نظام بحث متقدم",
    status: "online",
    details: "Metagoofil يستخدم Google للبحث عن ملفات وثائق ثم يستخرج البيانات الوصفية منها.",
    tab: "search",
  },
  {
    name: "Google Dorks",
    description: "استخدام مشغلات بحث Google المتقدمة للعثور على معلومات حساسة",
    tags: ["Google", "دوركس", "بحث متقدم", "معلومات حساسة"],
    link: "https://www.exploit-db.com/google-hacking-database",
    badge: "free",
    category: "نظام بحث متقدم",
    status: "online",
    details: "Google Hacking Database تحتوي على آلاف المشغلات للعثور على ملفات حساسة وصفحات تسجيل الدخول المكشوفة.",
    tab: "search",
  },
  {
    name: "Recon-ng",
    description: "إطار عمل OSINT متكامل يشبه Metasploit لجمع المعلومات",
    tags: ["إطار عمل", "وحدات", "أتمتة", "متكامل"],
    link: "https://github.com/lanmaster53/recon-ng",
    badge: "free",
    category: "نظام بحث متقدم",
    status: "online",
    details: "Recon-ng إطار عمل ويب كامل لأتمتة عمليات جمع المعلومات المفتوحة مع وحدات متعددة.",
    tab: "search",
  },
  {
    name: "IntelTechniques",
    description: "مجموعة أدوات OSINT متقدمة للباحثين والمحققين الرقميين",
    tags: ["تحقيق", "متقدم", "محققون"],
    link: "https://inteltechniques.com",
    badge: "paid",
    category: "نظام بحث متقدم",
    status: "online",
    details: "IntelTechniques يوفر دورات وأدوات متخصصة لجمع المعلومات المفتوحة المصادر بطريقة احترافية.",
    tab: "search",
  },
  {
    name: "Creepy",
    description: "تتبع الموقع الجغرافي من بيانات التواصل الاجتماعي",
    tags: ["موقع جغرافي", "تواصل اجتماعي", "تتبع"],
    link: "https://github.com/ilektrojohn/creepy",
    badge: "free",
    category: "نظام بحث متقدم",
    status: "online",
    details: "Creepy يجمع معلومات الموقع الجغرافي من المنصات الاجتماعية كTwitter وInstagram.",
    tab: "search",
  },
];

// ─── DATABASE TOOLS (قواعد البيانات) ─────────────────────
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
  {
    name: "GreyNoise",
    description: "تحليل حركة المرور الضجيجية على الإنترنت وتصنيف عناوين IP",
    tags: ["ضجيج إنترنت", "IP", "تحليل حركة"],
    link: "https://www.greynoise.io",
    badge: "free",
    category: "قاعدة بيانات",
    status: "online",
    details: "GreyNoise يميز بين الهجمات المستهدفة وحركة المرور الضجيجية العامة على الإنترنت.",
    tab: "databases",
  },
  {
    name: "BinaryEdge",
    description: "مسح الإنترنت واكتشاف الأصول المكشوفة والثغرات",
    tags: ["مسح الإنترنت", "ثغرات", "أصول مكشوفة"],
    link: "https://www.binaryedge.io",
    badge: "paid",
    category: "قاعدة بيانات",
    status: "online",
    details: "BinaryEdge يقوم بمسح شامل للإنترنت لاكتشاف الأصول المكشوفة والثغرات الأمنية.",
    tab: "databases",
  },
  {
    name: "ZoomEye",
    description: "محرك بحث صيني للأجهزة والخدمات المتصلة بالإنترنت",
    tags: ["أجهزة", "خدمات", "صيني", "Shodan بديل"],
    link: "https://www.zoomeye.org",
    badge: "free",
    category: "قاعدة بيانات",
    status: "online",
    details: "ZoomEye بديل آسيوي لـ Shodan يحتوي على بيانات واسعة عن الأجهزة المتصلة.",
    tab: "databases",
  },
  {
    name: "FOFA",
    description: "محرك بحث للبنية التحتية للإنترنت مع قاعدة بيانات ضخمة",
    tags: ["بنية تحتية", "محرك بحث", "شامل"],
    link: "https://fofa.info",
    badge: "free",
    category: "قاعدة بيانات",
    status: "online",
    details: "FOFA محرك بحث متقدم لاستكشاف البنية التحتية للإنترنت والخدمات المتصلة.",
    tab: "databases",
  },
  {
    name: "VirusTotal",
    description: "فحص الملفات والروابط وعناوين IP مقابل 70+ محرك مضادات فيروسات",
    tags: ["فيروسات", "ملفات", "روابط", "IP"],
    link: "https://www.virustotal.com",
    badge: "free",
    category: "قاعدة بيانات",
    status: "online",
    details: "VirusTotal يتيح رفع الملفات والروابط وفحصها مقابل أكثر من 70 محرك مضادات فيروسات.",
    tab: "databases",
  },
  {
    name: "URLhaus",
    description: "قاعدة بيانات للروابط الخبيثة والبرمجيات الضارة المُبلَّغ عنها",
    tags: ["روابط خبيثة", "برمجيات ضارة", "قاعدة بيانات"],
    link: "https://urlhaus.abuse.ch",
    badge: "free",
    category: "قاعدة بيانات",
    status: "online",
    details: "URLhaus يجمع الروابط الخبيثة المستخدمة في توزيع البرمجيات الضارة.",
    tab: "databases",
  },
];

// ─── PHONE TOOLS (أدوات تحليل الهاتف) ────────────────────
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
  {
    name: "NumBuster",
    description: "تحديد هوية المتصلين المجهولين وكشف معلوماتهم",
    tags: ["هوية", "مجهول", "كشف"],
    link: "https://numbuster.com",
    badge: "free",
    category: "أدوات الهاتف",
    status: "online",
    details: "NumBuster يساعد على تحديد هوية الأشخاص من أرقام هواتفهم.",
    tab: "phone",
  },
  {
    name: "OpenCNAM",
    description: "بحث في قاعدة بيانات CNAM لأسماء المتصلين في الولايات المتحدة",
    tags: ["CNAM", "أمريكا", "أسماء متصلين"],
    link: "https://www.opencnam.com",
    badge: "free",
    category: "أدوات الهاتف",
    status: "online",
    details: "OpenCNAM يتيح الوصول إلى قاعدة بيانات CNAM للبحث عن أسماء أصحاب الأرقام الأمريكية.",
    tab: "phone",
  },
  {
    name: "Whitepages",
    description: "دليل هاتفي شامل للبحث عن الأشخاص بالاسم أو الرقم أو العنوان",
    tags: ["دليل هاتفي", "أشخاص", "عناوين"],
    link: "https://www.whitepages.com",
    badge: "free",
    category: "أدوات الهاتف",
    status: "online",
    details: "Whitepages من أكبر قواعد بيانات الأشخاص وأرقام الهواتف والعناوين في الولايات المتحدة.",
    tab: "phone",
  },
  {
    name: "Sync.ME",
    description: "تحديد هوية المتصل مع دعم أرقام دولية وتكامل مع شبكات اجتماعية",
    tags: ["هوية المتصل", "دولي", "شبكات اجتماعية"],
    link: "https://sync.me",
    badge: "free",
    category: "أدوات الهاتف",
    status: "online",
    details: "Sync.ME يربط أرقام الهاتف بحسابات التواصل الاجتماعي لتحديد الهوية.",
    tab: "phone",
  },
];

// ─── EMAIL TOOLS (أدوات البريد الإلكتروني) ───────────────
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
    name: "Have I Been Pwned",
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
  {
    name: "EmailHippo",
    description: "التحقق من صحة البريد الإلكتروني وما إذا كانت الحسابات فعلية",
    tags: ["صحة البريد", "تحقق", "حسابات"],
    link: "https://tools.emailhippo.com",
    badge: "free",
    category: "أدوات البريد",
    status: "online",
    details: "EmailHippo يتحقق من صحة عناوين البريد الإلكتروني ويكتشف العناوين المؤقتة.",
    tab: "email",
  },
  {
    name: "Clearbit Connect",
    description: "الكشف عن معلومات الشركات والمهنيين من عناوين البريد",
    tags: ["شركات", "مهنيون", "بيانات"],
    link: "https://clearbit.com",
    badge: "paid",
    category: "أدوات البريد",
    status: "online",
    details: "Clearbit يربط عناوين البريد الإلكتروني بمعلومات تفصيلية عن الشركات والموظفين.",
    tab: "email",
  },
  {
    name: "Snov.io",
    description: "إيجاد وتحقق من بريد إلكتروني الشركات بدقة عالية",
    tags: ["إيجاد بريد", "شركات", "تحقق"],
    link: "https://snov.io",
    badge: "paid",
    category: "أدوات البريد",
    status: "online",
    details: "Snov.io يساعد على إيجاد عناوين البريد الإلكتروني للمهنيين من خلال النطاق أو الاسم.",
    tab: "email",
  },
  {
    name: "Phonebook.cz",
    description: "البحث المتقدم في تسريبات البيانات وعناوين البريد",
    tags: ["تسريبات", "بحث متقدم", "بيانات مسربة"],
    link: "https://phonebook.cz",
    badge: "free",
    category: "أدوات البريد",
    status: "online",
    details: "Phonebook.cz يتيح البحث في تسريبات بيانات ضخمة بما في ذلك البريد الإلكتروني وكلمات المرور.",
    tab: "email",
  },
];

// ─── USERNAME TOOLS (البحث بالاسم) ───────────────────────
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
  {
    name: "WhatsMyName",
    description: "التحقق من وجود اسم المستخدم عبر مئات المواقع والخدمات",
    tags: ["اسم مستخدم", "تحقق", "مواقع متعددة"],
    link: "https://whatsmyname.app",
    badge: "free",
    category: "البحث بالاسم",
    status: "online",
    details: "WhatsMyName يبحث عن اسم المستخدم عبر قائمة ضخمة من المواقع والخدمات الإلكترونية.",
    tab: "username",
  },
  {
    name: "GHunt",
    description: "تحليل حسابات Google والحصول على معلومات مفصلة منها",
    tags: ["Google", "تحليل", "بريد Google"],
    link: "https://github.com/mxrch/GHunt",
    badge: "free",
    category: "البحث بالاسم",
    status: "online",
    details: "GHunt يستخرج معلومات مفصلة من حسابات Google مثل الاسم والصورة وخرائط Google.",
    tab: "username",
  },
  {
    name: "LinkedIn OSINT",
    description: "جمع معلومات المهنيين وموظفي الشركات من LinkedIn",
    tags: ["LinkedIn", "مهنيون", "شركات"],
    link: "https://github.com/shield-ai/linkedin2username",
    badge: "free",
    category: "البحث بالاسم",
    status: "online",
    details: "أدوات OSINT متخصصة لاستخراج معلومات الموظفين والشركات من LinkedIn.",
    tab: "username",
  },
  {
    name: "Maigret",
    description: "البحث عن اسم المستخدم عبر 3000+ موقع وخدمة",
    tags: ["3000+ موقع", "اسم مستخدم", "شامل"],
    link: "https://github.com/soxoj/maigret",
    badge: "free",
    category: "البحث بالاسم",
    status: "online",
    details: "Maigret طوّر Sherlock ويدعم آلاف المواقع مع تحليل أعمق للنتائج.",
    tab: "username",
  },
];

// ─── RECON TOOLS (جمع المعلومات) ─────────────────────────
const RECON_TOOLS: OsintTool[] = [
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
    name: "Nmap",
    description: "فحص الشبكات واكتشاف المنافذ والخدمات والأنظمة",
    tags: ["مسح شبكات", "منافذ", "خدمات"],
    link: "https://nmap.org",
    badge: "free",
    category: "جمع المعلومات",
    status: "online",
    details: "Nmap أداة الاستطلاع الكلاسيكية لاكتشاف المضيفين والخدمات على الشبكة.",
    tab: "recon",
  },
  {
    name: "httpx",
    description: "فحص سريع لعناوين الويب واكتشاف الخدمات الحية",
    tags: ["HTTP", "سريع", "اكتشاف"],
    link: "https://github.com/projectdiscovery/httpx",
    badge: "free",
    category: "جمع المعلومات",
    status: "online",
    details: "httpx من ProjectDiscovery يتحقق من استجابة عناوين HTTP بسرعة عالية.",
    tab: "recon",
  },
  {
    name: "Nuclei",
    description: "مسح الثغرات الأمنية باستخدام قوالب جاهزة وقابلة للتخصيص",
    tags: ["ثغرات", "قوالب", "مسح سريع"],
    link: "https://github.com/projectdiscovery/nuclei",
    badge: "free",
    category: "جمع المعلومات",
    status: "online",
    details: "Nuclei يستخدم قوالب YAML لمسح الثغرات الأمنية بسرعة وكفاءة عالية.",
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
    name: "Wayback Machine",
    description: "استرجاع النسخ التاريخية للمواقع الإلكترونية",
    tags: ["تاريخي", "نسخ قديمة", "أرشيف"],
    link: "https://web.archive.org",
    badge: "free",
    category: "جمع المعلومات",
    status: "online",
    details: "Wayback Machine يحتفظ بنسخ تاريخية من مليارات صفحات الويب.",
    tab: "recon",
  },
  {
    name: "crt.sh",
    description: "استعلام في قواعد بيانات شهادات SSL/TLS والنطاقات الفرعية",
    tags: ["SSL", "شهادات", "نطاقات فرعية"],
    link: "https://crt.sh",
    badge: "free",
    category: "جمع المعلومات",
    status: "online",
    details: "crt.sh يوفر وصولاً مجانياً لقواعد بيانات Certificate Transparency logs.",
    tab: "recon",
  },
  {
    name: "DNSdumpster",
    description: "استطلاع DNS شامل وخريطة للبنية التحتية للنطاق",
    tags: ["DNS", "استطلاع", "خريطة"],
    link: "https://dnsdumpster.com",
    badge: "free",
    category: "جمع المعلومات",
    status: "online",
    details: "DNSdumpster يقدم خريطة بصرية لسجلات DNS وبنية النطاق التحتية.",
    tab: "recon",
  },
];

// ─── LEGAL TOOLS (التحذيرات القانونية) ───────────────────
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
  {
    name: "HackerOne",
    description: "منصة Bug Bounty الأولى عالمياً للإبلاغ عن الثغرات بشكل قانوني",
    tags: ["Bug Bounty", "قانوني", "ثغرات"],
    link: "https://www.hackerone.com",
    badge: "legal",
    category: "استخدام قانوني",
    status: "online",
    details: "HackerOne تتيح للباحثين الأمنيين الإبلاغ عن الثغرات ومكافأتهم بشكل قانوني.",
    tab: "legal",
  },
  {
    name: "Bugcrowd",
    description: "منصة bug bounty شاملة لبرامج الكشف عن الثغرات المصرح بها",
    tags: ["Bug Bounty", "ثغرات", "مصرح"],
    link: "https://www.bugcrowd.com",
    badge: "legal",
    category: "استخدام قانوني",
    status: "online",
    details: "Bugcrowd تربط الشركات بباحثي الأمن لاكتشاف الثغرات بطريقة قانونية ومدفوعة.",
    tab: "legal",
  },
];

// ─── FRAMEWORKS (أطر العمل) ───────────────────────────────
const FRAMEWORKS: Framework[] = [
  { name: "Metasploit",   usage: "اختبار الاختراق والتطوير",                    type: "إطار عمل",           link: "https://www.metasploit.com" },
  { name: "Burp Suite",   usage: "اختبار أمان تطبيقات الويب",                  type: "أداة ويب",           link: "https://portswigger.net/burp" },
  { name: "Nmap",         usage: "فحص الشبكات والمنافذ",                        type: "فحص شبكات",         link: "https://nmap.org" },
  { name: "Wireshark",    usage: "تحليل حركة المرور والبروتوكولات",             type: "تحليل شبكات",       link: "https://www.wireshark.org" },
  { name: "OWASP ZAP",    usage: "اختبار اختراق الويب",                         type: "أمان ويب",          link: "https://www.zaproxy.org" },
  { name: "Kali Linux",   usage: "توزيعة متكاملة للاختبار الأخلاقي",           type: "نظام تشغيل",        link: "https://www.kali.org" },
  { name: "Nikto",        usage: "فحص ثغرات خوادم الويب",                       type: "فحص ويب",           link: "https://cirt.net/Nikto2" },
  { name: "SQLMap",       usage: "اكتشاف واستغلال ثغرات SQL Injection",        type: "قواعد البيانات",     link: "https://sqlmap.org" },
  { name: "Aircrack-ng",  usage: "اختبار أمان شبكات Wi-Fi",                    type: "أمان لاسلكي",       link: "https://www.aircrack-ng.org" },
  { name: "Hashcat",      usage: "كسر كلمات المرور المشفرة",                   type: "كلمات مرور",        link: "https://hashcat.net" },
  { name: "John the Ripper", usage: "اختبار قوة كلمات المرور",                 type: "كلمات مرور",        link: "https://www.openwall.com/john" },
  { name: "Volatility",   usage: "تحليل صور الذاكرة الجنائية الرقمية",         type: "جنائيات رقمية",     link: "https://www.volatilityfoundation.org" },
  { name: "Autopsy",      usage: "منصة تحقيق جنائي رقمي مفتوح المصدر",        type: "جنائيات رقمية",     link: "https://www.autopsy.com" },
  { name: "Maltego",      usage: "تحليل العلاقات بين البيانات بشكل مرئي",      type: "تحليل OSINT",       link: "https://www.maltego.com" },
  { name: "SpiderFoot",   usage: "أتمتة جمع معلومات OSINT من 100+ مصدر",      type: "OSINT تلقائي",      link: "https://www.spiderfoot.net" },
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
const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "all",        label: "الكل",           icon: <Globe size={14} /> },
  { id: "scanner",    label: "الماسح الحي",    icon: <Terminal size={14} /> },
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
  return tool.category.includes("تحذير") || (tool.badge === "legal" && tool.status === "offline");
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
              transition={{ delay: i * 0.03 }}
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
    { icon: <Search size={18} />, value: ALL_TOOLS.length, label: "أداة ونظام",      color: "text-sky-400" },
    { icon: <Filter size={18} />, value: "9",              label: "فئة متخصصة",      color: "text-violet-400" },
    { icon: <Globe size={18} />,  value: "400+",            label: "منصة مدعومة",     color: "text-emerald-400" },
    { icon: <Shield size={18} />, value: "100%",            label: "أخلاقي وقانوني",  color: "text-amber-400" },
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

// ─── LIVE OSINT SCANNER ───────────────────────────────────
type ScanModule = "dns" | "crt" | "whois" | "wayback" | "vt" | "shodan" | "geo" | "hibp";

interface ScanResult {
  id: ScanModule;
  label: string;
  status: "idle" | "loading" | "done" | "error";
  data?: unknown;
  error?: string;
}

const MODULE_CONFIG: { id: ScanModule; label: string; icon: React.ReactNode }[] = [
  { id: "dns",     label: "DNS Lookup",         icon: <Server size={13} /> },
  { id: "crt",     label: "SSL Certificates",   icon: <Lock size={13} /> },
  { id: "whois",   label: "WHOIS / RDAP",        icon: <FileText size={13} /> },
  { id: "wayback", label: "Wayback Machine",     icon: <Clock size={13} /> },
  { id: "vt",      label: "VirusTotal",          icon: <Shield size={13} /> },
  { id: "shodan",  label: "Shodan",              icon: <Wifi size={13} /> },
  { id: "geo",     label: "IP Geolocation",      icon: <Globe size={13} /> },
  { id: "hibp",    label: "HIBP Breach Check",   icon: <AlertTriangle size={13} /> },
];

function LiveScanner() {
  const [target, setTarget]   = useState("");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [aiReport, setAiReport] = useState("");
  const [selectedModules, setSelectedModules] = useState<Set<ScanModule>>(
    new Set(["dns", "crt", "whois", "wayback", "vt", "geo"])
  );
  const [expandedId, setExpandedId] = useState<ScanModule | null>(null);
  const esRef = useRef<EventSource | null>(null);

  const apiBase = (typeof window !== "undefined" && (window as Window & { __API_BASE__?: string }).__API_BASE__)
    || (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL
    || "";

  const toggleModule = (id: ScanModule) => {
    setSelectedModules(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const startScan = useCallback(async () => {
    if (!target.trim() || running) return;
    if (esRef.current) esRef.current.close();

    setRunning(true);
    setAiReport("");
    const mods = [...selectedModules];
    setResults(mods.map(id => ({
      id,
      label: MODULE_CONFIG.find(m => m.id === id)?.label ?? id,
      status: "loading" as const,
    })));

    try {
      const res = await fetch(`${apiBase}/api/scan/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: target.trim(), modules: mods }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const payload = JSON.parse(line.slice(5)) as { id?: string; data?: unknown; error?: string; analysis?: string };
            if ("id" in payload && payload.id) {
              const isError = line.includes('"module_error"') || (payload.error && !payload.data);
              setResults(prev => prev.map(r =>
                r.id === payload.id
                  ? { ...r, status: isError ? "error" : "done", data: payload.data, error: payload.error }
                  : r
              ));
            }
            if (payload.analysis) setAiReport(payload.analysis);
          } catch { /* skip malformed SSE lines */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setResults(prev => prev.map(r => r.status === "loading" ? { ...r, status: "error", error: msg } : r));
    } finally {
      setRunning(false);
    }
  }, [target, running, selectedModules, apiBase]);

  const statusIcon = (s: ScanResult["status"]) => {
    if (s === "loading") return <RefreshCw size={13} className="animate-spin text-sky-400" />;
    if (s === "done")    return <CheckCircle size={13} className="text-emerald-400" />;
    if (s === "error")   return <XCircle size={13} className="text-red-400" />;
    return <Clock size={13} className="text-[#555]" />;
  };

  const copyReport = () => {
    const text = results.map(r => `=== ${r.label} ===\n${r.status === "done" ? JSON.stringify(r.data, null, 2) : r.error ?? "pending"}`).join("\n\n")
      + (aiReport ? `\n\n=== AI Analysis ===\n${aiReport}` : "");
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-4">
      {/* Legal disclaimer */}
      <div className="flex gap-2 items-start bg-amber-900/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
        <AlertTriangle size={14} className="shrink-0 mt-0.5" />
        <span>يُرجى استخدام هذا الماسح فقط على النطاقات/عناوين IP التي تملكها أو لديك إذن صريح لفحصها.</span>
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={target}
          onChange={e => setTarget(e.target.value)}
          onKeyDown={e => e.key === "Enter" && startScan()}
          placeholder="نطاق، عنوان IP، بريد إلكتروني... (مثال: example.com)"
          className="flex-1 bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-sky-500/60 transition-colors"
          dir="ltr"
        />
        <button
          onClick={startScan}
          disabled={running || !target.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 hover:from-sky-500 hover:to-violet-500 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {running ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
          {running ? "جارٍ الفحص..." : "ابدأ الفحص"}
        </button>
      </div>

      {/* Module toggles */}
      <div className="flex flex-wrap gap-2">
        {MODULE_CONFIG.map(m => (
          <button
            key={m.id}
            onClick={() => toggleModule(m.id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all ${
              selectedModules.has(m.id)
                ? "bg-sky-600/20 border-sky-500/50 text-sky-300"
                : "bg-[#161616] border-[#1f1f1f] text-[#555] hover:border-[#333] hover:text-[#94a3b8]"
            }`}
          >
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      {/* Results grid */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94a3b8] font-semibold">نتائج الفحص لـ: <span className="text-sky-400 font-mono">{target}</span></span>
            {!running && (
              <button onClick={copyReport} className="flex items-center gap-1.5 text-xs text-[#555] hover:text-white transition-colors">
                <Download size={12} /> تصدير التقرير
              </button>
            )}
          </div>

          {results.map(r => (
            <div key={r.id} className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-right hover:bg-white/[0.02] transition-colors"
                onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
              >
                {statusIcon(r.status)}
                <span className={`font-semibold flex-1 text-left ${
                  r.status === "done" ? "text-white" : r.status === "error" ? "text-red-400" : "text-[#94a3b8]"
                }`}>{r.label}</span>
                {r.status === "done" && (
                  <span className="text-xs text-emerald-400">✓ مكتمل</span>
                )}
                {r.status === "error" && (
                  <span className="text-xs text-red-400">✗ خطأ</span>
                )}
                {(r.status === "done" || r.status === "error") && (
                  expandedId === r.id ? <ChevronUp size={14} className="text-[#555]" /> : <ChevronDown size={14} className="text-[#555]" />
                )}
              </button>

              <AnimatePresence>
                {expandedId === r.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-[#1f1f1f] p-4">
                      {r.status === "error" ? (
                        <p className="text-red-400 text-xs font-mono">{r.error}</p>
                      ) : (
                        <pre className="text-xs text-[#94a3b8] font-mono overflow-x-auto whitespace-pre-wrap max-h-60">
                          {JSON.stringify(r.data, null, 2)}
                        </pre>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}

          {/* AI Report */}
          {aiReport && (
            <div className="bg-violet-900/10 border border-violet-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap size={14} className="text-violet-400" />
                <span className="text-violet-400 font-semibold text-sm">تحليل الذكاء الاصطناعي</span>
              </div>
              <p className="text-[#94a3b8] text-xs leading-relaxed whitespace-pre-wrap">{aiReport}</p>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {results.length === 0 && (
        <div className="text-center py-12 text-[#555]">
          <Terminal size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">أدخل هدفاً وابدأ الفحص</p>
          <p className="text-xs mt-1 opacity-60">النطاقات · عناوين IP · البريد الإلكتروني</p>
        </div>
      )}
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

  const toolsByTab = useMemo<Record<Exclude<TabId, "scanner">, OsintTool[]>>(() => ({
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
    if (activeTab === "scanner") return [];
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
    <div dir="rtl" className="flex flex-col h-full min-h-0 bg-[#0d0d0d] text-white font-sans">
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
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            النظام نشط
          </div>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-red-400 transition-colors p-1">
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

        {/* Search (hidden on scanner tab) */}
        {activeTab !== "scanner" && (
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
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-5">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeTab === tab.id
                  ? tab.id === "scanner"
                    ? "bg-gradient-to-r from-violet-600 to-pink-600 text-white border-transparent"
                    : "bg-gradient-to-r from-sky-600 to-violet-600 text-white border-transparent"
                  : "bg-[#161616] border border-[#1f1f1f] text-[#94a3b8] hover:text-white hover:bg-[#262626]"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "scanner" && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "scanner" ? (
            <motion.div key="scanner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#1f1f1f]">
                <Terminal size={18} className="text-violet-400" />
                <h2 className="text-base font-bold text-white">الماسح الحي — Live OSINT Scanner</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">مباشر</span>
              </div>
              <LiveScanner />
            </motion.div>
          ) : activeTab === "frameworks" ? (
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
