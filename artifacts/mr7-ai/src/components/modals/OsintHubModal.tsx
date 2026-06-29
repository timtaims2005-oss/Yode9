import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, ExternalLink, Copy, CheckCheck, Shield, AlertTriangle, Globe,
  Phone, Mail, User, Database, Layers, Crosshair, Scale, Filter,
  ChevronDown, ChevronUp, Zap, Eye, Activity, Wifi, Terminal, RefreshCw,
  CheckCircle, XCircle, Clock, Server, Lock, FileText, Download,
  Radio, Hash, Cpu, Network, MapPin, Camera, Bitcoin,
  Github, Code, Bug, TrendingUp, Bookmark, Key, Fingerprint,
  Scan, Monitor, Radar, Siren, GitBranch,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────
type ToolBadge = "free" | "paid" | "legal";
type ToolStatus = "online" | "offline";
type TabId =
  | "all" | "scanner"
  | "search" | "databases" | "phone" | "email" | "username"
  | "frameworks" | "recon" | "legal"
  | "darkweb" | "social" | "threatintel" | "geo"
  | "malware" | "network" | "crypto" | "imageosint"
  | "vuln" | "password" | "dns" | "api" | "iot" | "forensics"
  | "opsec" | "redteam" | "cloud" | "webapp" | "mobile";

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

// ─── SEARCH TOOLS ─────────────────────────────────────────
const SEARCH_TOOLS: OsintTool[] = [
  { name: "Maltego", description: "أداة رسومية قوية لتحليل العلاقات بين البيانات وربط المعلومات بشكل مرئي", tags: ["تحليل", "رسومي", "علاقات", "بيانات"], link: "https://www.maltego.com", badge: "paid", category: "نظام بحث متقدم", status: "online", details: "Maltego أداة قوية لتحليل الروابط والعلاقات بين البيانات المفتوحة. تستخدم في التحقيقات الرقمية وتحليل الشبكات الاجتماعية.", tab: "search" },
  { name: "SpiderFoot", description: "أتمتة جمع المعلومات من 100+ مصدر بشكل تلقائي وشامل", tags: ["أتمتة", "مصادر متعددة", "جمع معلومات"], link: "https://www.spiderfoot.net", badge: "free", category: "نظام بحث متقدم", status: "online", details: "SpiderFoot يقوم بجمع المعلومات تلقائياً من أكثر من 100 مصدر مختلف للبيانات المفتوحة.", tab: "search" },
  { name: "theHarvester", description: "جمع رسائل البريد الإلكتروني والنطاقات الفرعية والموظفين", tags: ["بريد إلكتروني", "نطاقات فرعية", "موظفين"], link: "https://github.com/laramies/theHarvester", badge: "free", category: "نظام بحث متقدم", status: "online", details: "theHarvester أداة مخصصة لجمع البريد الإلكتروني وأسماء الموظفين والنطاقات الفرعية.", tab: "search" },
  { name: "Sherlock", description: "البحث عن أسماء المستخدمين عبر منصات متعددة (400+ منصة)", tags: ["اسم مستخدم", "شبكات اجتماعية", "400+ منصة"], link: "https://github.com/sherlock-project/sherlock", badge: "free", category: "نظام بحث متقدم", status: "online", details: "Sherlock يبحث عن اسم المستخدم عبر 400+ منصة اجتماعية وموقع مختلف.", tab: "search" },
  { name: "FOCA", description: "استخراج البيانات الوصفية من الوثائق للكشف عن معلومات الشركات", tags: ["بيانات وصفية", "وثائق", "شركات"], link: "https://github.com/ElevenPaths/FOCA", badge: "free", category: "نظام بحث متقدم", status: "online", details: "FOCA تحلل البيانات الوصفية في ملفات Office وPDF للكشف عن أسماء المستخدمين والبرامج والخوادم.", tab: "search" },
  { name: "Metagoofil", description: "جمع البيانات الوصفية من الوثائق المتاحة على الإنترنت", tags: ["بيانات وصفية", "وثائق", "Google"], link: "https://github.com/laramies/metagoofil", badge: "free", category: "نظام بحث متقدم", status: "online", details: "Metagoofil يستخدم Google للبحث عن ملفات وثائق ثم يستخرج البيانات الوصفية منها.", tab: "search" },
  { name: "Google Dorks", description: "استخدام مشغلات بحث Google المتقدمة للعثور على معلومات حساسة", tags: ["Google", "دوركس", "بحث متقدم"], link: "https://www.exploit-db.com/google-hacking-database", badge: "free", category: "نظام بحث متقدم", status: "online", details: "Google Hacking Database تحتوي على آلاف المشغلات للعثور على ملفات حساسة وصفحات مكشوفة.", tab: "search" },
  { name: "Recon-ng", description: "إطار عمل OSINT متكامل يشبه Metasploit لجمع المعلومات", tags: ["إطار عمل", "وحدات", "أتمتة"], link: "https://github.com/lanmaster53/recon-ng", badge: "free", category: "نظام بحث متقدم", status: "online", details: "Recon-ng إطار عمل ويب كامل لأتمتة عمليات جمع المعلومات المفتوحة مع وحدات متعددة.", tab: "search" },
  { name: "IntelTechniques", description: "مجموعة أدوات OSINT متقدمة للباحثين والمحققين الرقميين", tags: ["تحقيق", "متقدم", "محققون"], link: "https://inteltechniques.com", badge: "paid", category: "نظام بحث متقدم", status: "online", details: "IntelTechniques يوفر دورات وأدوات متخصصة لجمع المعلومات المفتوحة بطريقة احترافية.", tab: "search" },
  { name: "Creepy", description: "تتبع الموقع الجغرافي من بيانات التواصل الاجتماعي", tags: ["موقع جغرافي", "تواصل اجتماعي", "تتبع"], link: "https://github.com/ilektrojohn/creepy", badge: "free", category: "نظام بحث متقدم", status: "online", details: "Creepy يجمع معلومات الموقع الجغرافي من منصات التواصل كTwitter وInstagram.", tab: "search" },
  { name: "Datasploit", description: "أداة OSINT شاملة تجمع معلومات من مصادر متعددة آلياً", tags: ["شامل", "أتمتة", "OSINT"], link: "https://github.com/DataSploit/datasploit", badge: "free", category: "نظام بحث متقدم", status: "online", details: "Datasploit تجمع معلومات النطاقات والبريد والأشخاص آلياً من مصادر مفتوحة متعددة.", tab: "search" },
  { name: "Buscador", description: "نظام تشغيل مخصص لعمليات OSINT مع أدوات مثبتة مسبقاً", tags: ["نظام تشغيل", "OSINT", "متخصص"], link: "https://inteltechniques.com/buscador", badge: "free", category: "نظام بحث متقدم", status: "online", details: "Buscador VM مخصص لباحثي OSINT مع مئات الأدوات المثبتة والمُهيأة مسبقاً.", tab: "search" },
  { name: "Osmedeus", description: "إطار عمل OSINT هجومي آلي مع تقارير مدمجة", tags: ["هجومي", "آلي", "تقارير"], link: "https://github.com/j3ssie/osmedeus", badge: "free", category: "نظام بحث متقدم", status: "online", details: "Osmedeus يدير دورة الاستطلاع الكاملة بشكل آلي من الاكتشاف حتى التقرير.", tab: "search" },
  { name: "Photon", description: "زاحف ويب سريع لجمع الروابط والأسرار والمعلومات", tags: ["زاحف", "روابط", "أسرار"], link: "https://github.com/s0md3v/Photon", badge: "free", category: "نظام بحث متقدم", status: "online", details: "Photon يزحف على المواقع بسرعة عالية ويستخرج الروابط وعناوين البريد والمعلومات المخفية.", tab: "search" },
  { name: "OSINT Industries", description: "منصة OSINT متكاملة للبحث في شبكات الاجتماعي والأشخاص", tags: ["منصة", "شاملة", "أشخاص"], link: "https://osint.industries", badge: "paid", category: "نظام بحث متقدم", status: "online", details: "OSINT Industries تجمع البيانات من عشرات المصادر في واجهة موحدة.", tab: "search" },
];

// ─── DATABASE TOOLS ────────────────────────────────────────
const DATABASE_TOOLS: OsintTool[] = [
  { name: "Have I Been Pwned", description: "التحقق من تسريبات البيانات والبريد الإلكتروني في الاختراقات المعروفة", tags: ["تسريبات", "بريد إلكتروني", "تحقق"], link: "https://haveibeenpwned.com", badge: "free", category: "قاعدة بيانات", status: "online", details: "يمكنك التحقق مما إذا تم تسريب بريدك الإلكتروني في اختراقات البيانات المعروفة.", tab: "databases" },
  { name: "IntelX", description: "محرك بحث في البيانات المسربة والمعلومات العامة والويب المظلم", tags: ["بيانات مسربة", "ويب مظلم", "بحث"], link: "https://intelx.io", badge: "paid", category: "قاعدة بيانات", status: "online", details: "IntelX يوفر محرك بحث قوي في البيانات المسربة والمعلومات المتاحة علنياً.", tab: "databases" },
  { name: "Shodan", description: "محرك بحث للأجهزة المتصلة بالإنترنت والخوادم وإنترنت الأشياء", tags: ["أجهزة", "إنترنت الأشياء", "خوادم"], link: "https://www.shodan.io", badge: "free", category: "قاعدة بيانات", status: "online", details: "Shodan يتيح البحث عن الأجهزة المتصلة: كاميرات، خوادم، أجهزة IoT.", tab: "databases" },
  { name: "Censys", description: "فحص البنية التحتية للإنترنت وتحليل الشهادات الأمنية", tags: ["بنية تحتية", "شهادات", "أمن"], link: "https://censys.io", badge: "free", category: "قاعدة بيانات", status: "online", details: "Censys يركز على فحص الشهادات الرقمية والبنية التحتية للإنترنت.", tab: "databases" },
  { name: "GreyNoise", description: "تحليل حركة المرور الضجيجية على الإنترنت وتصنيف عناوين IP", tags: ["ضجيج إنترنت", "IP", "تحليل"], link: "https://www.greynoise.io", badge: "free", category: "قاعدة بيانات", status: "online", details: "GreyNoise يميز بين الهجمات المستهدفة وحركة المرور الضجيجية.", tab: "databases" },
  { name: "BinaryEdge", description: "مسح الإنترنت واكتشاف الأصول المكشوفة والثغرات", tags: ["مسح الإنترنت", "ثغرات", "أصول"], link: "https://www.binaryedge.io", badge: "paid", category: "قاعدة بيانات", status: "online", details: "BinaryEdge يقوم بمسح شامل للإنترنت لاكتشاف الأصول المكشوفة.", tab: "databases" },
  { name: "ZoomEye", description: "محرك بحث صيني للأجهزة والخدمات المتصلة بالإنترنت", tags: ["أجهزة", "خدمات", "صيني"], link: "https://www.zoomeye.org", badge: "free", category: "قاعدة بيانات", status: "online", details: "ZoomEye بديل آسيوي لـ Shodan يحتوي على بيانات واسعة.", tab: "databases" },
  { name: "FOFA", description: "محرك بحث للبنية التحتية للإنترنت مع قاعدة بيانات ضخمة", tags: ["بنية تحتية", "محرك بحث", "شامل"], link: "https://fofa.info", badge: "free", category: "قاعدة بيانات", status: "online", details: "FOFA محرك بحث متقدم لاستكشاف البنية التحتية للإنترنت.", tab: "databases" },
  { name: "VirusTotal", description: "فحص الملفات والروابط وعناوين IP مقابل 70+ محرك مضادات فيروسات", tags: ["فيروسات", "ملفات", "روابط"], link: "https://www.virustotal.com", badge: "free", category: "قاعدة بيانات", status: "online", details: "VirusTotal يتيح رفع الملفات والروابط وفحصها مقابل أكثر من 70 محرك.", tab: "databases" },
  { name: "URLhaus", description: "قاعدة بيانات للروابط الخبيثة والبرمجيات الضارة المُبلَّغ عنها", tags: ["روابط خبيثة", "برمجيات ضارة", "قاعدة بيانات"], link: "https://urlhaus.abuse.ch", badge: "free", category: "قاعدة بيانات", status: "online", details: "URLhaus يجمع الروابط الخبيثة المستخدمة في توزيع البرمجيات الضارة.", tab: "databases" },
  { name: "CIRCL.LU MISP", description: "منصة مشاركة مؤشرات التهديد والاستخبارات المفتوحة", tags: ["تهديدات", "استخبارات", "مشاركة"], link: "https://www.misp-project.org", badge: "free", category: "قاعدة بيانات", status: "online", details: "MISP منصة مفتوحة لمشاركة ومزامنة مؤشرات التهديد السيبراني.", tab: "databases" },
  { name: "OpenCTI", description: "منصة استخبارات تهديد مفتوحة المصدر مع تصور متقدم", tags: ["استخبارات تهديد", "مفتوح المصدر", "تصور"], link: "https://www.opencti.io", badge: "free", category: "قاعدة بيانات", status: "online", details: "OpenCTI منصة شاملة لإدارة وتصور بيانات استخبارات التهديدات.", tab: "databases" },
  { name: "AbuseIPDB", description: "قاعدة بيانات لعناوين IP المسيئة والمبلّغ عنها من المجتمع", tags: ["IP سيئة", "إبلاغ", "مجتمع"], link: "https://www.abuseipdb.com", badge: "free", category: "قاعدة بيانات", status: "online", details: "AbuseIPDB قاعدة بيانات مجتمعية لتتبع عناوين IP المستخدمة في الهجمات.", tab: "databases" },
  { name: "LeakIX", description: "محرك بحث للخدمات والبيانات المكشوفة على الإنترنت", tags: ["بيانات مكشوفة", "خدمات", "ثغرات"], link: "https://leakix.net", badge: "free", category: "قاعدة بيانات", status: "online", details: "LeakIX يكتشف الأجهزة والخدمات المكشوفة مع تفاصيل الثغرات.", tab: "databases" },
  { name: "Onyphe", description: "محرك بحث أمني للبيانات السيبرانية والتهديدات المتقدمة", tags: ["سيبراني", "تهديدات", "بيانات"], link: "https://www.onyphe.io", badge: "free", category: "قاعدة بيانات", status: "online", details: "Onyphe يجمع بيانات أمنية من مصادر متعددة لتحليل التهديدات.", tab: "databases" },
  { name: "Vulners", description: "قاعدة بيانات الثغرات الأمنية مع محرك بحث متقدم", tags: ["ثغرات", "CVE", "بحث"], link: "https://vulners.com", badge: "free", category: "قاعدة بيانات", status: "online", details: "Vulners قاعدة بيانات شاملة للثغرات الأمنية مع API مجاني.", tab: "databases" },
];

// ─── PHONE TOOLS ──────────────────────────────────────────
const PHONE_TOOLS: OsintTool[] = [
  { name: "Truecaller", description: "تحديد هوية المتصل باستخدام قاعدة بيانات مجتمعية ضخمة", tags: ["هوية المتصل", "قاعدة بيانات", "مجتمعية"], link: "https://www.truecaller.com", badge: "free", category: "أدوات الهاتف", status: "online", details: "Truecaller يستخدم قاعدة بيانات مجتمعية لتحديد هوية المتصلين المجهولين.", tab: "phone" },
  { name: "PhoneInfoga", description: "أداة متقدمة لجمع معلومات أرقام الهاتف مع دعم متعدد المصادر", tags: ["أرقام هاتف", "جمع معلومات", "متقدم"], link: "https://github.com/sundowndev/PhoneInfoga", badge: "free", category: "أدوات الهاتف", status: "online", details: "PhoneInfoga أداة متقدمة لجمع معلومات مفصلة عن أرقام الهاتف من مصادر متعددة.", tab: "phone" },
  { name: "Numverify", description: "التحقق من صحة أرقام الهاتف وتحديد الدولة والناقل", tags: ["تحقق", "صحة الرقم", "الناقل"], link: "https://numverify.com", badge: "free", category: "أدوات الهاتف", status: "online", details: "Numverify يوفر API للتحقق من صحة أرقام الهاتف وتحديد موقعها والناقل.", tab: "phone" },
  { name: "NumLookup", description: "تحديد الناقل والدولة والموقع الجغرافي للرقم", tags: ["ناقل", "دولة", "موقع"], link: "https://www.numlookup.com", badge: "free", category: "أدوات الهاتف", status: "online", details: "NumLookup يتيح البحث عن معلومات الناقل والدولة لأي رقم هاتف.", tab: "phone" },
  { name: "NumBuster", description: "تحديد هوية المتصلين المجهولين وكشف معلوماتهم", tags: ["هوية", "مجهول", "كشف"], link: "https://numbuster.com", badge: "free", category: "أدوات الهاتف", status: "online", details: "NumBuster يساعد على تحديد هوية الأشخاص من أرقام هواتفهم.", tab: "phone" },
  { name: "OpenCNAM", description: "بحث في قاعدة بيانات CNAM لأسماء المتصلين في أمريكا", tags: ["CNAM", "أمريكا", "أسماء متصلين"], link: "https://www.opencnam.com", badge: "free", category: "أدوات الهاتف", status: "online", details: "OpenCNAM يتيح الوصول إلى قاعدة بيانات CNAM للبحث عن أسماء أصحاب الأرقام.", tab: "phone" },
  { name: "Whitepages", description: "دليل هاتفي شامل للبحث عن الأشخاص بالاسم أو الرقم أو العنوان", tags: ["دليل هاتفي", "أشخاص", "عناوين"], link: "https://www.whitepages.com", badge: "free", category: "أدوات الهاتف", status: "online", details: "Whitepages من أكبر قواعد بيانات الأشخاص وأرقام الهواتف في الولايات المتحدة.", tab: "phone" },
  { name: "Sync.ME", description: "تحديد هوية المتصل مع دعم أرقام دولية وتكامل شبكات اجتماعية", tags: ["هوية المتصل", "دولي", "شبكات اجتماعية"], link: "https://sync.me", badge: "free", category: "أدوات الهاتف", status: "online", details: "Sync.ME يربط أرقام الهاتف بحسابات التواصل الاجتماعي.", tab: "phone" },
  { name: "CallerID Test", description: "اختبار معلومات Caller ID لأي رقم هاتف", tags: ["Caller ID", "اختبار", "معلومات"], link: "https://www.calleridtest.com", badge: "free", category: "أدوات الهاتف", status: "online", details: "أداة لاختبار معلومات Caller ID ومعرفة ما يُعرض للمستقبل.", tab: "phone" },
  { name: "Twilio Lookup", description: "API احترافي للتحقق من أرقام الهاتف وتحديد نوعها", tags: ["API", "تحقق", "Twilio"], link: "https://www.twilio.com/lookup", badge: "paid", category: "أدوات الهاتف", status: "online", details: "Twilio Lookup يوفر معلومات الناقل ونوع الخط وحالة النشاط عبر API.", tab: "phone" },
  { name: "Carrier Lookup", description: "تحديد شركة الاتصالات المحمولة لأي رقم هاتف عالمياً", tags: ["شركة اتصالات", "عالمي", "كشف"], link: "https://www.carrierlookup.com", badge: "free", category: "أدوات الهاتف", status: "online", details: "Carrier Lookup يحدد شركة الاتصالات والنوع (موبايل/ثابت) لأي رقم.", tab: "phone" },
];

// ─── EMAIL TOOLS ──────────────────────────────────────────
const EMAIL_TOOLS: OsintTool[] = [
  { name: "Holehe", description: "التحقق من وجود الحساب على 100+ منصة باستخدام البريد الإلكتروني", tags: ["تحقق", "منصات متعددة", "حسابات"], link: "https://github.com/megadose/holehe", badge: "free", category: "أدوات البريد", status: "online", details: "Holehe يتحقق من وجود حساب بريد إلكتروني على أكثر من 100 منصة.", tab: "email" },
  { name: "Hunter.io", description: "البحث عن عناوين البريد في الشركات والمجالات المحددة", tags: ["شركات", "مجالات", "بحث"], link: "https://hunter.io", badge: "free", category: "أدوات البريد", status: "online", details: "Hunter.io يساعد في العثور على عناوين البريد المرتبطة بشركة أو مجال.", tab: "email" },
  { name: "Have I Been Pwned", description: "التحقق من تسريبات البيانات عبر البريد الإلكتروني", tags: ["تسريبات", "تحقق", "بيانات"], link: "https://haveibeenpwned.com", badge: "free", category: "أدوات البريد", status: "online", details: "تحقق مما إذا كان بريدك الإلكتروني قد ظهر في أي اختراقات معروفة.", tab: "email" },
  { name: "Emailrep.io", description: "تحليل سمعة البريد الإلكتروني وكشف التصيد الاحتيالي", tags: ["سمعة", "تصيد", "تحليل"], link: "https://emailrep.io", badge: "free", category: "أدوات البريد", status: "online", details: "Emailrep.io يقيّم سمعة أي عنوان بريد إلكتروني ويكشف عن التصيد.", tab: "email" },
  { name: "EmailHippo", description: "التحقق من صحة البريد الإلكتروني وما إذا كانت الحسابات فعلية", tags: ["صحة البريد", "تحقق", "حسابات"], link: "https://tools.emailhippo.com", badge: "free", category: "أدوات البريد", status: "online", details: "EmailHippo يتحقق من صحة عناوين البريد ويكتشف العناوين المؤقتة.", tab: "email" },
  { name: "Clearbit Connect", description: "الكشف عن معلومات الشركات والمهنيين من عناوين البريد", tags: ["شركات", "مهنيون", "بيانات"], link: "https://clearbit.com", badge: "paid", category: "أدوات البريد", status: "online", details: "Clearbit يربط عناوين البريد بمعلومات تفصيلية عن الشركات والموظفين.", tab: "email" },
  { name: "Snov.io", description: "إيجاد وتحقق من بريد إلكتروني الشركات بدقة عالية", tags: ["إيجاد بريد", "شركات", "تحقق"], link: "https://snov.io", badge: "paid", category: "أدوات البريد", status: "online", details: "Snov.io يساعد على إيجاد عناوين البريد للمهنيين من خلال النطاق أو الاسم.", tab: "email" },
  { name: "Phonebook.cz", description: "البحث المتقدم في تسريبات البيانات وعناوين البريد", tags: ["تسريبات", "بحث متقدم", "بيانات مسربة"], link: "https://phonebook.cz", badge: "free", category: "أدوات البريد", status: "online", details: "Phonebook.cz يتيح البحث في تسريبات بيانات ضخمة بما في ذلك البريد الإلكتروني.", tab: "email" },
  { name: "GHunt", description: "تحليل حسابات Google والحصول على معلومات مفصلة منها", tags: ["Google", "تحليل", "بريد Google"], link: "https://github.com/mxrch/GHunt", badge: "free", category: "أدوات البريد", status: "online", details: "GHunt يستخرج معلومات مفصلة من حسابات Google مثل الاسم والصورة.", tab: "email" },
  { name: "Mail-tester", description: "اختبار قابلية تسليم البريد الإلكتروني وجودة إعداداته", tags: ["تسليم", "SPF", "DKIM", "DMARC"], link: "https://www.mail-tester.com", badge: "free", category: "أدوات البريد", status: "online", details: "Mail-tester يختبر إعدادات البريد ويتحقق من SPF وDKIM وDMARC.", tab: "email" },
  { name: "Epieos", description: "البحث عن معلومات الأشخاص عبر البريد الإلكتروني وGoogle", tags: ["Google", "أشخاص", "بحث"], link: "https://epieos.com", badge: "free", category: "أدوات البريد", status: "online", details: "Epieos يستخرج معلومات الحساب من البريد الإلكتروني عبر Google وخدمات أخرى.", tab: "email" },
  { name: "VerifyEmailAddress", description: "التحقق الفوري من صحة أي عنوان بريد إلكتروني", tags: ["تحقق فوري", "صحة", "بريد"], link: "https://verifyemailaddress.org", badge: "free", category: "أدوات البريد", status: "online", details: "أداة مجانية للتحقق من صحة عناوين البريد الإلكتروني في الوقت الفعلي.", tab: "email" },
];

// ─── USERNAME TOOLS ───────────────────────────────────────
const USERNAME_TOOLS: OsintTool[] = [
  { name: "Sherlock", description: "البحث عن اسم المستخدم عبر 400+ منصة اجتماعية", tags: ["400+ منصة", "اسم مستخدم", "شبكات اجتماعية"], link: "https://github.com/sherlock-project/sherlock", badge: "free", category: "البحث بالاسم", status: "online", details: "Sherlock يبحث عن اسم المستخدم عبر مئات المنصات.", tab: "username" },
  { name: "Maigret", description: "البحث عن اسم المستخدم عبر 3000+ موقع وخدمة", tags: ["3000+ موقع", "اسم مستخدم", "شامل"], link: "https://github.com/soxoj/maigret", badge: "free", category: "البحث بالاسم", status: "online", details: "Maigret يدعم آلاف المواقع مع تحليل أعمق للنتائج.", tab: "username" },
  { name: "WhatsMyName", description: "التحقق من وجود اسم المستخدم عبر مئات المواقع", tags: ["اسم مستخدم", "تحقق", "مواقع متعددة"], link: "https://whatsmyname.app", badge: "free", category: "البحث بالاسم", status: "online", details: "WhatsMyName يبحث عن اسم المستخدم عبر قائمة ضخمة من المواقع.", tab: "username" },
  { name: "Namechk", description: "التحقق من توافر اسم المستخدم على عشرات المنصات دفعة واحدة", tags: ["توافر", "منصات", "تحقق"], link: "https://namechk.com", badge: "free", category: "البحث بالاسم", status: "online", details: "Namechk يفحص توافر اسم المستخدم على عشرات المنصات.", tab: "username" },
  { name: "Social Searcher", description: "البحث في الشبكات الاجتماعية بدون تسجيل دخول", tags: ["شبكات اجتماعية", "بحث", "بدون تسجيل"], link: "https://www.social-searcher.com", badge: "free", category: "البحث بالاسم", status: "online", details: "Social Searcher يسمح بالبحث في الشبكات الاجتماعية.", tab: "username" },
  { name: "Pipl", description: "محرك بحث مدفوع للأشخاص مع معلومات مفصلة", tags: ["مدفوع", "أشخاص", "معلومات مفصلة"], link: "https://pipl.com", badge: "paid", category: "البحث بالاسم", status: "online", details: "Pipl محرك بحث متخصص للعثور على الأشخاص ومعلوماتهم.", tab: "username" },
  { name: "LinkedIn OSINT", description: "جمع معلومات المهنيين وموظفي الشركات من LinkedIn", tags: ["LinkedIn", "مهنيون", "شركات"], link: "https://github.com/shield-ai/linkedin2username", badge: "free", category: "البحث بالاسم", status: "online", details: "أدوات OSINT لاستخراج معلومات الموظفين من LinkedIn.", tab: "username" },
  { name: "UserSearch.org", description: "بحث متقدم عن المستخدمين عبر منصات التواصل الاجتماعي", tags: ["بحث", "تواصل اجتماعي", "متقدم"], link: "https://usersearch.org", badge: "free", category: "البحث بالاسم", status: "online", details: "UserSearch.org يبحث في عشرات المنصات لإيجاد حسابات المستخدمين.", tab: "username" },
  { name: "CheckUsernames", description: "التحقق السريع من اسم المستخدم عبر 160+ شبكة اجتماعية", tags: ["160+ شبكة", "سريع", "تحقق"], link: "https://checkusernames.com", badge: "free", category: "البحث بالاسم", status: "online", details: "CheckUsernames يتحقق من توافر اسم المستخدم على أكثر من 160 شبكة.", tab: "username" },
  { name: "NameCheckr", description: "أداة شاملة للتحقق من اسم المستخدم والنطاق والعلامة التجارية", tags: ["علامة تجارية", "نطاق", "شامل"], link: "https://www.namecheckr.com", badge: "free", category: "البحث بالاسم", status: "online", details: "NameCheckr يبحث في المنصات والنطاقات ومسجلي العلامات التجارية.", tab: "username" },
];

// ─── RECON TOOLS ──────────────────────────────────────────
const RECON_TOOLS: OsintTool[] = [
  { name: "Amass", description: "جمع معلومات النطاقات الفرعية واستطلاع البنية التحتية بعمق", tags: ["نطاقات فرعية", "استطلاع", "بنية تحتية"], link: "https://github.com/owasp-amass/amass", badge: "free", category: "جمع المعلومات", status: "online", details: "Amass من OWASP - أداة شاملة لجمع نطاقات الأهداف وتحليل بنيتها.", tab: "recon" },
  { name: "Subfinder", description: "اكتشاف النطاقات الفرعية بسرعة عالية من مصادر سلبية", tags: ["نطاقات فرعية", "سريع", "سلبي"], link: "https://github.com/projectdiscovery/subfinder", badge: "free", category: "جمع المعلومات", status: "online", details: "Subfinder من ProjectDiscovery - اكتشاف النطاقات الفرعية بطريقة سلبية.", tab: "recon" },
  { name: "Nuclei", description: "مسح الثغرات الأمنية باستخدام قوالب جاهزة وقابلة للتخصيص", tags: ["ثغرات", "قوالب", "مسح سريع"], link: "https://github.com/projectdiscovery/nuclei", badge: "free", category: "جمع المعلومات", status: "online", details: "Nuclei يستخدم قوالب YAML لمسح الثغرات بسرعة وكفاءة.", tab: "recon" },
  { name: "crt.sh", description: "استعلام في قواعد بيانات شهادات SSL/TLS والنطاقات الفرعية", tags: ["SSL", "شهادات", "نطاقات فرعية"], link: "https://crt.sh", badge: "free", category: "جمع المعلومات", status: "online", details: "crt.sh وصول مجاني لقواعد بيانات Certificate Transparency.", tab: "recon" },
  { name: "DNSdumpster", description: "استطلاع DNS شامل وخريطة للبنية التحتية للنطاق", tags: ["DNS", "استطلاع", "خريطة"], link: "https://dnsdumpster.com", badge: "free", category: "جمع المعلومات", status: "online", details: "DNSdumpster يقدم خريطة بصرية لسجلات DNS وبنية النطاق.", tab: "recon" },
  { name: "Wayback Machine", description: "استرجاع النسخ التاريخية للمواقع الإلكترونية", tags: ["تاريخي", "نسخ قديمة", "أرشيف"], link: "https://web.archive.org", badge: "free", category: "جمع المعلومات", status: "online", details: "Wayback Machine يحتفظ بنسخ تاريخية من مليارات صفحات الويب.", tab: "recon" },
  { name: "DarkSearch", description: "محرك بحث في الويب المظلم لتحليل المحتوى المخفي", tags: ["ويب مظلم", "بحث", "تحليل"], link: "https://darksearch.io", badge: "free", category: "جمع المعلومات", status: "online", details: "DarkSearch يتيح البحث في محتوى الويب المظلم.", tab: "recon" },
  { name: "httpx", description: "فحص سريع لعناوين الويب واكتشاف الخدمات الحية", tags: ["HTTP", "سريع", "اكتشاف"], link: "https://github.com/projectdiscovery/httpx", badge: "free", category: "جمع المعلومات", status: "online", details: "httpx يتحقق من استجابة عناوين HTTP بسرعة عالية.", tab: "recon" },
  { name: "Katana", description: "أداة زحف وكشف للمسارات والمحتوى في تطبيقات الويب", tags: ["زحف", "مسارات", "ويب"], link: "https://github.com/projectdiscovery/katana", badge: "free", category: "جمع المعلومات", status: "online", details: "Katana من ProjectDiscovery لزحف وكشف محتوى تطبيقات الويب.", tab: "recon" },
  { name: "OSINT Framework", description: "دليل منظم لمصادر المعلومات المفتوحة مع تصنيفات شاملة", tags: ["دليل", "تصنيفات", "مصادر"], link: "https://osintframework.com", badge: "free", category: "جمع المعلومات", status: "online", details: "OSINT Framework دليل منظم شامل لمصادر المعلومات المفتوحة.", tab: "recon" },
  { name: "NMAP", description: "أقوى أداة لمسح الشبكات وكشف المنافذ والخدمات", tags: ["مسح", "منافذ", "خدمات"], link: "https://nmap.org", badge: "free", category: "جمع المعلومات", status: "online", details: "Nmap أداة الاستطلاع الأساسية لأي عملية أمنية - تكتشف المنافذ والخدمات.", tab: "recon" },
  { name: "Gobuster", description: "اكتشاف المسارات والنطاقات الفرعية بالقوة الغاشمة", tags: ["قوة غاشمة", "مسارات", "نطاقات فرعية"], link: "https://github.com/OJ/gobuster", badge: "free", category: "جمع المعلومات", status: "online", details: "Gobuster يستخدم قوائم كلمات لاكتشاف المسارات المخفية والنطاقات الفرعية.", tab: "recon" },
  { name: "Feroxbuster", description: "ماسح محتوى ويب سريع وأكثر قدرة من dirb", tags: ["محتوى ويب", "سريع", "Rust"], link: "https://github.com/epi052/feroxbuster", badge: "free", category: "جمع المعلومات", status: "online", details: "Feroxbuster مكتوب بـ Rust يمسح محتوى الويب بسرعة فائقة وكفاءة.", tab: "recon" },
  { name: "Gau", description: "جمع URLs تاريخية من مصادر متعددة للهدف المحدد", tags: ["URLs", "تاريخي", "مصادر متعددة"], link: "https://github.com/lc/gau", badge: "free", category: "جمع المعلومات", status: "online", details: "Gau يجمع URLs من Wayback Machine وCommon Crawl وOTX وURLScan.", tab: "recon" },
];

// ─── DARK WEB TOOLS ───────────────────────────────────────
const DARKWEB_TOOLS: OsintTool[] = [
  { name: "Ahmia", description: "محرك بحث في شبكة Tor للعثور على الخدمات المخفية", tags: ["Tor", "بحث", "مخفي"], link: "https://ahmia.fi", badge: "free", category: "الويب المظلم", status: "online", details: "Ahmia محرك بحث مجاني للبحث في خدمات .onion على شبكة Tor.", tab: "darkweb" },
  { name: "DarkSearch.io", description: "API للبحث في الويب المظلم بدون Tor مباشرة", tags: ["API", "بدون Tor", "بحث"], link: "https://darksearch.io", badge: "free", category: "الويب المظلم", status: "online", details: "DarkSearch.io يتيح البحث في .onion بدون الحاجة لتثبيت Tor.", tab: "darkweb" },
  { name: "OnionSearch", description: "أداة سطر أوامر للبحث في محركات الويب المظلم", tags: ["سطر أوامر", "بحث", "onion"], link: "https://github.com/megadose/OnionSearch", badge: "free", category: "الويب المظلم", status: "online", details: "OnionSearch أداة Python للبحث في عدة محركات Tor دفعة واحدة.", tab: "darkweb" },
  { name: "Haystak", description: "محرك بحث Tor مع أكثر من مليار صفحة مفهرسة", tags: ["Tor", "فهرس ضخم", "بحث"], link: "http://haystak5njsmn2hqkewecpaxetahtwhsbsa64jom2k22z5afxhnpxfid.onion", badge: "free", category: "الويب المظلم", status: "online", details: "Haystak محرك بحث Tor مع قاعدة بيانات ضخمة لصفحات .onion.", tab: "darkweb" },
  { name: "IntelX Dark Web", description: "البحث في قواعد بيانات الويب المظلم عبر Intelligence X", tags: ["استخبارات", "ويب مظلم", "قاعدة بيانات"], link: "https://intelx.io", badge: "paid", category: "الويب المظلم", status: "online", details: "IntelX يوفر وصولاً لبيانات الويب المظلم والتسريبات عبر API.", tab: "darkweb" },
  { name: "Dark Tracer", description: "مراقبة تسريبات الشركات على الويب المظلم وأسواق الإجرام", tags: ["مراقبة", "تسريبات", "شركات"], link: "https://darktracer.com", badge: "paid", category: "الويب المظلم", status: "online", details: "Dark Tracer يراقب ظهور بيانات شركتك على مواقع الابتزاز والأسواق المظلمة.", tab: "darkweb" },
  { name: "Ransomwatch", description: "مراقبة وتتبع مجموعات برامج الفدية على الويب المظلم", tags: ["فدية", "مراقبة", "مجموعات هجوم"], link: "https://ransomwatch.telemetry.ltd", badge: "free", category: "الويب المظلم", status: "online", details: "Ransomwatch يتتبع مواقع مجموعات الفدية ويعرض ضحاياهم المعلنين.", tab: "darkweb" },
  { name: "Onion.live", description: "دليل مباشر لأبرز المواقع على شبكة Tor", tags: ["دليل", "Tor", "مواقع onion"], link: "https://onion.live", badge: "free", category: "الويب المظلم", status: "online", details: "Onion.live يوفر دليلاً محدثاً لمواقع .onion المتاحة على Tor.", tab: "darkweb" },
  { name: "Torch Search", description: "أحد أقدم محركات البحث على Tor بقاعدة فهرسة ضخمة", tags: ["قديم", "Tor", "فهرسة"], link: "https://torch.onion.ly", badge: "free", category: "الويب المظلم", status: "online", details: "Torch يعمل منذ عقود وفهرس مليارات الصفحات على شبكة Tor.", tab: "darkweb" },
  { name: "DarkOwl Vision", description: "منصة استخبارات الويب المظلم للشركات والمؤسسات", tags: ["مؤسسات", "استخبارات", "مراقبة"], link: "https://www.darkowl.com", badge: "paid", category: "الويب المظلم", status: "online", details: "DarkOwl Vision يراقب الويب المظلم ويوفر تقارير استخباراتية للمؤسسات.", tab: "darkweb" },
  { name: "Flare", description: "مراقبة التهديدات في الويب المظلم وقنوات تيليغرام", tags: ["Telegram", "تهديدات", "مراقبة"], link: "https://flare.io", badge: "paid", category: "الويب المظلم", status: "online", details: "Flare يراقب المنتديات المظلمة وقنوات Telegram لتهديدات محددة.", tab: "darkweb" },
];

// ─── SOCIAL MEDIA OSINT ───────────────────────────────────
const SOCIAL_TOOLS: OsintTool[] = [
  { name: "Twint", description: "جمع تغريدات Twitter/X بدون API وبدون حد تاريخي", tags: ["Twitter", "تغريدات", "بدون API"], link: "https://github.com/twintproject/twint", badge: "free", category: "التواصل الاجتماعي", status: "online", details: "Twint يسمح بجمع التغريدات والمتابعين وبيانات الحسابات بدون API.", tab: "social" },
  { name: "Instaloader", description: "تحميل صور وبيانات ومتابعي حسابات Instagram", tags: ["Instagram", "صور", "متابعون"], link: "https://github.com/instaloader/instaloader", badge: "free", category: "التواصل الاجتماعي", status: "online", details: "Instaloader يحمل الصور والفيديوهات وبيانات المتابعين من Instagram.", tab: "social" },
  { name: "Snscrape", description: "جمع بيانات من Twitter وFacebook وTelegram وInstagram", tags: ["متعدد المنصات", "جمع بيانات", "Python"], link: "https://github.com/JustAnotherArchivist/snscrape", badge: "free", category: "التواصل الاجتماعي", status: "online", details: "Snscrape يدعم منصات متعددة ويجمع البيانات بكميات كبيرة.", tab: "social" },
  { name: "Social-Analyzer", description: "تحليل ملفات التواصل الاجتماعي وكشف الروابط بينها", tags: ["تحليل", "ملفات شخصية", "روابط"], link: "https://github.com/qeeqbox/social-analyzer", badge: "free", category: "التواصل الاجتماعي", status: "online", details: "Social-Analyzer يكتشف ملفات المستخدمين ويحلل روابطهم عبر المنصات.", tab: "social" },
  { name: "TikTok OSINT", description: "أدوات متخصصة لجمع معلومات TikTok والمستخدمين", tags: ["TikTok", "جمع بيانات", "متخصص"], link: "https://github.com/drawrowfly/tiktok-scraper", badge: "free", category: "التواصل الاجتماعي", status: "online", details: "tiktok-scraper يجمع بيانات الفيديوهات والملفات الشخصية من TikTok.", tab: "social" },
  { name: "Telegram OSINT", description: "جمع معلومات من قنوات ومجموعات Telegram", tags: ["Telegram", "قنوات", "مجموعات"], link: "https://github.com/bellingcat/telegram-phone-number-checker", badge: "free", category: "التواصل الاجتماعي", status: "online", details: "أدوات Bellingcat لفحص أرقام الهاتف وجمع المعلومات من Telegram.", tab: "social" },
  { name: "Osintgram", description: "تحليل ملفات Instagram وجمع المعلومات التفصيلية", tags: ["Instagram", "تحليل", "متعمق"], link: "https://github.com/Datalux/Osintgram", badge: "free", category: "التواصل الاجتماعي", status: "online", details: "Osintgram يجمع معلومات متعمقة من حسابات Instagram العامة.", tab: "social" },
  { name: "RedditSearch.io", description: "البحث المتقدم في منشورات Reddit وتاريخ المستخدمين", tags: ["Reddit", "بحث متقدم", "تاريخ"], link: "https://redditsearch.io", badge: "free", category: "التواصل الاجتماعي", status: "online", details: "RedditSearch يتيح البحث في تاريخ Reddit بعمق أكبر من البحث الرسمي.", tab: "social" },
  { name: "Mentionmapp", description: "تحليل شبكة العلاقات والمحادثات على Twitter", tags: ["Twitter", "شبكة علاقات", "تحليل"], link: "https://mentionmapp.com", badge: "free", category: "التواصل الاجتماعي", status: "online", details: "Mentionmapp يرسم خريطة للعلاقات والمحادثات بين حسابات Twitter.", tab: "social" },
  { name: "LinkedIn2Username", description: "استخراج أسماء موظفي الشركات من LinkedIn", tags: ["LinkedIn", "موظفون", "استخراج"], link: "https://github.com/initstring/linkedin2username", badge: "free", category: "التواصل الاجتماعي", status: "online", details: "LinkedIn2Username يولد قوائم بأسماء المستخدمين المحتملة لموظفي الشركات.", tab: "social" },
];

// ─── THREAT INTELLIGENCE ──────────────────────────────────
const THREATINTEL_TOOLS: OsintTool[] = [
  { name: "MISP", description: "منصة مشاركة مؤشرات التهديد المفتوحة المصدر", tags: ["مؤشرات تهديد", "مشاركة", "مفتوح"], link: "https://www.misp-project.org", badge: "free", category: "استخبارات التهديد", status: "online", details: "MISP منصة قياسية لتبادل معلومات التهديد السيبراني بين المنظمات.", tab: "threatintel" },
  { name: "OpenCTI", description: "منصة استخبارات تهديد مفتوحة مع تصور متقدم", tags: ["CTI", "تصور", "مفتوح المصدر"], link: "https://www.opencti.io", badge: "free", category: "استخبارات التهديد", status: "online", details: "OpenCTI يوفر نظاماً شاملاً لإدارة بيانات استخبارات التهديد.", tab: "threatintel" },
  { name: "AlienVault OTX", description: "منصة استخبارات مفتوحة للتهديدات مع ملايين IOCs", tags: ["OTX", "IOCs", "مجتمع"], link: "https://otx.alienvault.com", badge: "free", category: "استخبارات التهديد", status: "online", details: "OTX من AlienVault يوفر مؤشرات تهديد مشتركة من مجتمع عالمي.", tab: "threatintel" },
  { name: "ThreatFox", description: "قاعدة بيانات مجانية لمؤشرات الاختراق من Abuse.ch", tags: ["IOC", "برمجيات ضارة", "مجاني"], link: "https://threatfox.abuse.ch", badge: "free", category: "استخبارات التهديد", status: "online", details: "ThreatFox يجمع IOCs من مصادر متعددة ويوفرها مجاناً عبر API.", tab: "threatintel" },
  { name: "Recorded Future", description: "منصة استخبارات تهديد تجارية متقدمة بالذكاء الاصطناعي", tags: ["تجاري", "AI", "تهديدات"], link: "https://www.recordedfuture.com", badge: "paid", category: "استخبارات التهديد", status: "online", details: "Recorded Future يستخدم AI لتحليل بيانات التهديدات من الويب المظلم والعام.", tab: "threatintel" },
  { name: "Mandiant Advantage", description: "استخبارات تهديد من مختبر Mandiant/Google", tags: ["Mandiant", "Google", "APT"], link: "https://www.mandiant.com/advantage", badge: "paid", category: "استخبارات التهديد", status: "online", details: "Mandiant يوفر استخبارات تهديد عميقة حول مجموعات APT والبرمجيات الضارة.", tab: "threatintel" },
  { name: "Cybersixgill", description: "استخبارات من الويب المظلم والمنتديات السرية", tags: ["ويب مظلم", "منتديات", "استخبارات"], link: "https://cybersixgill.com", badge: "paid", category: "استخبارات التهديد", status: "online", details: "Cybersixgill يجمع استخبارات من أعمق طبقات الويب المظلم.", tab: "threatintel" },
  { name: "Pulsedive", description: "منصة مجانية لتحليل IOCs وتصنيف التهديدات", tags: ["IOC", "تحليل", "مجاني"], link: "https://pulsedive.com", badge: "free", category: "استخبارات التهديد", status: "online", details: "Pulsedive تجمع IOCs من مصادر متعددة وتصنفها حسب الخطورة.", tab: "threatintel" },
  { name: "Shodan Monitor", description: "مراقبة أصولك على Shodan والتنبيه عند تغييرها", tags: ["Shodan", "مراقبة", "أصول"], link: "https://monitor.shodan.io", badge: "paid", category: "استخبارات التهديد", status: "online", details: "Shodan Monitor يتتبع تغييرات في أصولك الرقمية المكشوفة على الإنترنت.", tab: "threatintel" },
  { name: "CISA KEV", description: "قائمة الثغرات المستغلة بشكل فعلي من وكالة CISA الأمريكية", tags: ["CISA", "ثغرات فعلية", "KEV"], link: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog", badge: "free", category: "استخبارات التهديد", status: "online", details: "CISA KEV القائمة الرسمية للثغرات التي يتم استغلالها فعلياً في الهجمات.", tab: "threatintel" },
  { name: "Feodo Tracker", description: "تتبع خوادم C2 لبرامج Botnet المعروفة", tags: ["C2", "Botnet", "تتبع"], link: "https://feodotracker.abuse.ch", badge: "free", category: "استخبارات التهديد", status: "online", details: "Feodo Tracker يتتبع خوادم C&C لعائلات البرمجيات الضارة الشهيرة.", tab: "threatintel" },
  { name: "MITRE ATT&CK", description: "إطار معرفة شامل عن تقنيات وتكتيكات المهاجمين", tags: ["تقنيات هجوم", "تكتيكات", "إطار"], link: "https://attack.mitre.org", badge: "free", category: "استخبارات التهديد", status: "online", details: "MITRE ATT&CK المرجع العالمي لتصنيف تقنيات الهجوم والدفاع السيبراني.", tab: "threatintel" },
];

// ─── GEO & PHYSICAL OSINT ────────────────────────────────
const GEO_TOOLS: OsintTool[] = [
  { name: "GeoSpy", description: "تحديد الموقع الجغرافي للصور باستخدام الذكاء الاصطناعي", tags: ["AI", "صور", "موقع جغرافي"], link: "https://geospy.ai", badge: "free", category: "OSINT الجغرافي", status: "online", details: "GeoSpy يحلل الصور ويحدد موقعها الجغرافي باستخدام الذكاء الاصطناعي.", tab: "geo" },
  { name: "Google Maps", description: "استكشاف الأماكن وتحليل الصور الجوية والشوارع", tags: ["خرائط", "صور جوية", "Street View"], link: "https://maps.google.com", badge: "free", category: "OSINT الجغرافي", status: "online", details: "Google Maps يوفر صور جوية وخرائط شاملة وStreet View.", tab: "geo" },
  { name: "ExifTool", description: "استخراج البيانات الوصفية من الصور بما في ذلك GPS", tags: ["EXIF", "GPS", "بيانات وصفية"], link: "https://exiftool.org", badge: "free", category: "OSINT الجغرافي", status: "online", details: "ExifTool يستخرج جميع البيانات الوصفية من الصور بما فيها الإحداثيات.", tab: "geo" },
  { name: "Copernicus", description: "بيانات الأقمار الصناعية والصور الجوية من الاتحاد الأوروبي", tags: ["أقمار صناعية", "صور جوية", "مجاني"], link: "https://www.copernicus.eu", badge: "free", category: "OSINT الجغرافي", status: "online", details: "Copernicus يوفر صور أقمار صناعية مجانية عالية الدقة.", tab: "geo" },
  { name: "SunCalc", description: "تحديد موقع الشمس والظلال في صورة لتحديد الوقت والموقع", tags: ["ظلال", "وقت", "تحديد موقع"], link: "https://www.suncalc.org", badge: "free", category: "OSINT الجغرافي", status: "online", details: "SunCalc يحلل زوايا الشمس في الصور لتحديد الوقت والموقع الجغرافي.", tab: "geo" },
  { name: "What3Words", description: "نظام عناوين عالمي يقسم الأرض لمربعات 3×3 متر", tags: ["عناوين", "دقيق", "عالمي"], link: "https://what3words.com", badge: "free", category: "OSINT الجغرافي", status: "online", details: "What3Words يحدد أي موقع بثلاث كلمات فريدة بدقة 3 أمتار.", tab: "geo" },
  { name: "Bellingcat GeoLocator", description: "أدوات Bellingcat لتحديد مواقع الصور والفيديوهات", tags: ["Bellingcat", "تحقق", "صور"], link: "https://www.bellingcat.com/resources/how-tos", badge: "free", category: "OSINT الجغرافي", status: "online", details: "Bellingcat قيادي في OSINT الجغرافي وله منهجيات موثقة لتحديد المواقع.", tab: "geo" },
  { name: "ACLED", description: "بيانات النزاعات المسلحة والأحداث الأمنية حول العالم", tags: ["نزاعات", "أمن", "بيانات"], link: "https://acleddata.com", badge: "free", category: "OSINT الجغرافي", status: "online", details: "ACLED يتتبع النزاعات المسلحة والأحداث الأمنية وينشرها مجاناً.", tab: "geo" },
  { name: "Sentinel Hub", description: "صور أقمار صناعية مجانية عالية الدقة من ESA", tags: ["أقمار صناعية", "ESA", "تحليل"], link: "https://www.sentinel-hub.com", badge: "free", category: "OSINT الجغرافي", status: "online", details: "Sentinel Hub يوفر وصولاً لصور Sentinel من وكالة الفضاء الأوروبية.", tab: "geo" },
  { name: "Overpass Turbo", description: "استعلام في بيانات OpenStreetMap بشكل متقدم", tags: ["OpenStreetMap", "استعلام", "خرائط"], link: "https://overpass-turbo.eu", badge: "free", category: "OSINT الجغرافي", status: "online", details: "Overpass Turbo يتيح استعلامات متقدمة في قاعدة بيانات OpenStreetMap.", tab: "geo" },
];

// ─── MALWARE ANALYSIS ────────────────────────────────────
const MALWARE_TOOLS: OsintTool[] = [
  { name: "Any.run", description: "تحليل البرمجيات الضارة بشكل تفاعلي في بيئة معزولة", tags: ["تحليل تفاعلي", "sandbox", "برمجيات ضارة"], link: "https://any.run", badge: "free", category: "تحليل البرمجيات الضارة", status: "online", details: "Any.run يتيح تشغيل الملفات المشبوهة في بيئة معزولة ومشاهدة سلوكها.", tab: "malware" },
  { name: "Hybrid Analysis", description: "تحليل ملفات وروابط مشبوهة بمحركات كشف متعددة", tags: ["تحليل", "ملفات", "روابط مشبوهة"], link: "https://www.hybrid-analysis.com", badge: "free", category: "تحليل البرمجيات الضارة", status: "online", details: "Hybrid Analysis من CrowdStrike يوفر تحليلاً عميقاً للملفات والروابط.", tab: "malware" },
  { name: "Joe Sandbox", description: "تحليل متعمق للبرمجيات الضارة في بيئات متعددة", tags: ["sandbox", "متعمق", "متعدد البيئات"], link: "https://www.joesandbox.com", badge: "free", category: "تحليل البرمجيات الضارة", status: "online", details: "Joe Sandbox يحلل الملفات في بيئات Windows وLinux وMac ومحمول.", tab: "malware" },
  { name: "MalwareBazaar", description: "قاعدة بيانات لعينات البرمجيات الضارة من Abuse.ch", tags: ["عينات", "قاعدة بيانات", "مجاني"], link: "https://bazaar.abuse.ch", badge: "free", category: "تحليل البرمجيات الضارة", status: "online", details: "MalwareBazaar يوفر عينات برمجيات ضارة للباحثين الأمنيين مجاناً.", tab: "malware" },
  { name: "Cuckoo Sandbox", description: "نظام تحليل تلقائي مفتوح المصدر للبرمجيات الضارة", tags: ["مفتوح المصدر", "تلقائي", "sandbox"], link: "https://cuckoo.cert.ee", badge: "free", category: "تحليل البرمجيات الضارة", status: "online", details: "Cuckoo Sandbox منظومة تحليل مفتوحة يمكن تشغيلها محلياً.", tab: "malware" },
  { name: "CAPE Sandbox", description: "تطوير لـ Cuckoo مع استخراج الـ payload والتشفير", tags: ["payload", "تشفير", "sandbox"], link: "https://capesandbox.com", badge: "free", category: "تحليل البرمجيات الضارة", status: "online", details: "CAPE Sandbox يستخرج البرامج المشفرة ويحلل تقنيات التشفير.", tab: "malware" },
  { name: "VirusTotal", description: "فحص الملفات والروابط مقابل 70+ محرك مضادات فيروسات", tags: ["70+ محرك", "فحص فوري", "API"], link: "https://www.virustotal.com", badge: "free", category: "تحليل البرمجيات الضارة", status: "online", details: "VirusTotal المنصة الأكثر شيوعاً لفحص الملفات والروابط والهاشات.", tab: "malware" },
  { name: "Intezer Analyze", description: "تحليل جيني للبرمجيات الضارة وربطها بمجموعات هجوم", tags: ["جيني", "نسب", "مجموعات هجوم"], link: "https://analyze.intezer.com", badge: "free", category: "تحليل البرمجيات الضارة", status: "online", details: "Intezer ينسب البرمجيات الضارة لمجموعات وعائلات محددة.", tab: "malware" },
  { name: "Triage", description: "منصة تحليل برمجيات ضارة سريعة مع واجهة تفاعلية", tags: ["سريع", "تفاعلي", "sandbox"], link: "https://tria.ge", badge: "free", category: "تحليل البرمجيات الضارة", status: "online", details: "Triage يوفر تحليلاً سريعاً مع واجهة تفاعلية لمراقبة السلوك.", tab: "malware" },
  { name: "Unpacme", description: "فك تشفير وضغط البرمجيات الضارة تلقائياً", tags: ["فك تشفير", "unpacking", "أتمتة"], link: "https://www.unpac.me", badge: "free", category: "تحليل البرمجيات الضارة", status: "online", details: "Unpacme يفك تشفير وضغط الملفات التنفيذية الخبيثة تلقائياً.", tab: "malware" },
  { name: "Yara", description: "أداة تحديد البرمجيات الضارة بالقواعد الشرطية", tags: ["قواعد", "كشف", "تحليل"], link: "https://virustotal.github.io/yara", badge: "free", category: "تحليل البرمجيات الضارة", status: "online", details: "YARA أداة تساعد الباحثين في كشف البرمجيات الضارة وتصنيفها.", tab: "malware" },
];

// ─── NETWORK & INFRASTRUCTURE ────────────────────────────
const NETWORK_TOOLS: OsintTool[] = [
  { name: "BGPView", description: "معلومات تفصيلية عن ASN وبروتوكول BGP والمسارات", tags: ["ASN", "BGP", "مسارات شبكة"], link: "https://bgpview.io", badge: "free", category: "الشبكات والبنية التحتية", status: "online", details: "BGPView يوفر معلومات تفصيلية عن الأنظمة المستقلة وتوجيه BGP.", tab: "network" },
  { name: "RIPE NCC", description: "قاعدة بيانات WHOIS لعناوين IP في أوروبا والشرق الأوسط", tags: ["WHOIS", "IP", "أوروبا"], link: "https://www.ripe.net", badge: "free", category: "الشبكات والبنية التحتية", status: "online", details: "RIPE NCC السجل الإقليمي لعناوين IP في أوروبا والشرق الأوسط.", tab: "network" },
  { name: "ARIN", description: "سجل عناوين الإنترنت لأمريكا الشمالية", tags: ["WHOIS", "IP", "أمريكا"], link: "https://www.arin.net", badge: "free", category: "الشبكات والبنية التحتية", status: "online", details: "ARIN يدير توزيع عناوين IP وASN في أمريكا الشمالية.", tab: "network" },
  { name: "MXToolbox", description: "فحص سجلات DNS وBLACKLIST وSPF وDKIM وDMARC", tags: ["DNS", "Blacklist", "SPF", "DKIM"], link: "https://mxtoolbox.com", badge: "free", category: "الشبكات والبنية التحتية", status: "online", details: "MXToolbox يفحص سجلات البريد وإعدادات الشبكة وقوائم الحظر.", tab: "network" },
  { name: "SecurityHeaders", description: "فحص رؤوس HTTP الأمنية وتقييم جودتها", tags: ["HTTP Headers", "أمان ويب", "تقييم"], link: "https://securityheaders.com", badge: "free", category: "الشبكات والبنية التحتية", status: "online", details: "SecurityHeaders يفحص رؤوس الأمان ويقيّم مستوى الحماية.", tab: "network" },
  { name: "SSL Labs", description: "تقييم شامل لإعداد SSL/TLS والشهادات الأمنية", tags: ["SSL", "TLS", "شهادات", "تقييم"], link: "https://www.ssllabs.com/ssltest", badge: "free", category: "الشبكات والبنية التحتية", status: "online", details: "SSL Labs يختبر إعداد SSL/TLS ويمنح تقييماً من A+ إلى F.", tab: "network" },
  { name: "Netcraft", description: "معلومات عن الاستضافة وتاريخ المواقع وتقنياتها", tags: ["استضافة", "تاريخ موقع", "تقنيات"], link: "https://sitereport.netcraft.com", badge: "free", category: "الشبكات والبنية التحتية", status: "online", details: "Netcraft يوفر معلومات عن استضافة الموقع وتاريخه وتقنياته.", tab: "network" },
  { name: "Wappalyzer", description: "كشف تقنيات بناء المواقع وإطارات العمل والمكتبات", tags: ["تقنيات ويب", "فريموورك", "كشف"], link: "https://www.wappalyzer.com", badge: "free", category: "الشبكات والبنية التحتية", status: "online", details: "Wappalyzer يكشف عن CMS والأطر والمكتبات المستخدمة في أي موقع.", tab: "network" },
  { name: "WhatWeb", description: "بصمة المواقع واكتشاف التقنيات والإصدارات", tags: ["بصمة", "تقنيات", "إصدارات"], link: "https://morningstarsecurity.com/research/whatweb", badge: "free", category: "الشبكات والبنية التحتية", status: "online", details: "WhatWeb يكتشف تقنيات المواقع وإصداراتها لتحليل الثغرات المحتملة.", tab: "network" },
  { name: "IPinfo", description: "معلومات شاملة عن عناوين IP مع API مجاني", tags: ["IP", "معلومات", "API"], link: "https://ipinfo.io", badge: "free", category: "الشبكات والبنية التحتية", status: "online", details: "IPinfo يوفر موقع IP والشركة والISP وغيرها عبر API.", tab: "network" },
  { name: "Robtex", description: "تحليل DNS والشبكات وعناوين IP بشكل شامل", tags: ["DNS", "شبكات", "تحليل شامل"], link: "https://www.robtex.com", badge: "free", category: "الشبكات والبنية التحتية", status: "online", details: "Robtex يوفر معلومات DNS وASN وBGP لأي نطاق أو IP.", tab: "network" },
];

// ─── BLOCKCHAIN & CRYPTO OSINT ───────────────────────────
const CRYPTO_TOOLS: OsintTool[] = [
  { name: "Chainalysis", description: "تتبع حركة العملات المشفرة والتحقيق في الجرائم المالية", tags: ["تتبع", "جرائم مالية", "عملات مشفرة"], link: "https://www.chainalysis.com", badge: "paid", category: "OSINT البلوكتشين", status: "online", details: "Chainalysis الأداة الرائدة لتتبع حركة العملات المشفرة.", tab: "crypto" },
  { name: "Breadcrumbs", description: "تحليل معاملات Blockchain وتتبع عناوين المحافظ", tags: ["Blockchain", "معاملات", "تتبع"], link: "https://www.breadcrumbs.app", badge: "free", category: "OSINT البلوكتشين", status: "online", details: "Breadcrumbs يتتبع معاملات العملات المشفرة بشكل مرئي ومجاني.", tab: "crypto" },
  { name: "Etherscan", description: "مستكشف Ethereum blockchain للمعاملات والعقود الذكية", tags: ["Ethereum", "معاملات", "عقود ذكية"], link: "https://etherscan.io", badge: "free", category: "OSINT البلوكتشين", status: "online", details: "Etherscan يتيح استكشاف جميع معاملات Ethereum والعقود الذكية.", tab: "crypto" },
  { name: "Blockchain.com", description: "مستكشف Bitcoin blockchain وتحليل المحافظ", tags: ["Bitcoin", "BTC", "معاملات"], link: "https://www.blockchain.com/explorer", badge: "free", category: "OSINT البلوكتشين", status: "online", details: "Blockchain.com يوفر استكشافاً للمعاملات والمحافظ على Bitcoin.", tab: "crypto" },
  { name: "Crystal Blockchain", description: "تحليل مخاطر العملات المشفرة وتتبع مصادرها", tags: ["مخاطر", "تتبع", "مصادر"], link: "https://crystalblockchain.com", badge: "paid", category: "OSINT البلوكتشين", status: "online", details: "Crystal يحلل مخاطر المعاملات ويتتبع مصادر الأموال المشبوهة.", tab: "crypto" },
  { name: "TRM Labs", description: "استخبارات Blockchain لمكافحة الاحتيال وغسيل الأموال", tags: ["AML", "احتيال", "امتثال"], link: "https://www.trmlabs.com", badge: "paid", category: "OSINT البلوكتشين", status: "online", details: "TRM Labs يساعد المؤسسات المالية في مكافحة غسيل الأموال المشفرة.", tab: "crypto" },
  { name: "OXT.me", description: "تحليل متقدم لمعاملات Bitcoin وتحديد الكيانات", tags: ["Bitcoin", "تحليل متقدم", "كيانات"], link: "https://oxt.me", badge: "free", category: "OSINT البلوكتشين", status: "online", details: "OXT.me أداة مجانية لتحليل Bitcoin blockchain وتحديد المجموعات.", tab: "crypto" },
  { name: "Solscan", description: "مستكشف Solana blockchain للمعاملات والـ NFTs", tags: ["Solana", "SOL", "NFT"], link: "https://solscan.io", badge: "free", category: "OSINT البلوكتشين", status: "online", details: "Solscan أكثر مستكشفات Solana تفصيلاً وسهولة في الاستخدام.", tab: "crypto" },
  { name: "Nansen", description: "تحليل حركة المال الذكي على Ethereum وL2 chains", tags: ["Smart Money", "DeFi", "تحليل"], link: "https://www.nansen.ai", badge: "paid", category: "OSINT البلوكتشين", status: "online", details: "Nansen يتتبع محافظ المستثمرين الكبار ويحلل سلوك المال الذكي.", tab: "crypto" },
];

// ─── IMAGE & FACE OSINT ───────────────────────────────────
const IMAGEOSINT_TOOLS: OsintTool[] = [
  { name: "PimEyes", description: "بحث عكسي بالوجه للعثور على صور الشخص عبر الإنترنت", tags: ["وجه", "بحث عكسي", "صور"], link: "https://pimeyes.com", badge: "paid", category: "OSINT الصور والوجوه", status: "online", details: "PimEyes يبحث في مليارات الصور للعثور على مطابقات للوجه المعطى.", tab: "imageosint" },
  { name: "Google Lens", description: "بحث عكسي ذكي بالصور مع تحليل المحتوى", tags: ["بحث عكسي", "Google", "AI"], link: "https://lens.google.com", badge: "free", category: "OSINT الصور والوجوه", status: "online", details: "Google Lens يحلل الصور ويبحث عنها بطريقة ذكية.", tab: "imageosint" },
  { name: "TinEye", description: "محرك بحث عكسي بالصور مع تتبع أماكن ظهورها", tags: ["بحث عكسي", "تتبع صور", "ظهور"], link: "https://tineye.com", badge: "free", category: "OSINT الصور والوجوه", status: "online", details: "TinEye يجد أماكن ظهور الصورة على الإنترنت ويتتبع تاريخها.", tab: "imageosint" },
  { name: "Yandex Images", description: "محرك بحث عكسي روسي بالصور مع نتائج مميزة", tags: ["بحث عكسي", "Yandex", "روسي"], link: "https://yandex.com/images", badge: "free", category: "OSINT الصور والوجوه", status: "online", details: "Yandex Images يوفر بحثاً عكسياً ممتازاً للوجوه والأماكن.", tab: "imageosint" },
  { name: "FaceCheck.ID", description: "بحث مجاني بالوجه مع مقارنة النتائج بشبكات اجتماعية", tags: ["وجه", "مجاني", "شبكات اجتماعية"], link: "https://facecheck.id", badge: "free", category: "OSINT الصور والوجوه", status: "online", details: "FaceCheck.ID يبحث عن مطابقات الوجه في ملايين صور وسائل التواصل.", tab: "imageosint" },
  { name: "InVID/WeVerify", description: "التحقق من صحة الصور والفيديوهات وكشف التلاعب", tags: ["تحقق", "تلاعب", "أخبار مزيفة"], link: "https://www.invid-project.eu", badge: "free", category: "OSINT الصور والوجوه", status: "online", details: "InVID يتحقق من أصالة الصور والفيديوهات ويكشف التلاعب.", tab: "imageosint" },
  { name: "Forensically", description: "أدوات تحليل جنائي رقمي للصور وكشف التلاعب", tags: ["جنائي رقمي", "تلاعب", "تحليل"], link: "https://29a.ch/photo-forensics", badge: "free", category: "OSINT الصور والوجوه", status: "online", details: "Forensically يكتشف التلاعب بالصور باستخدام Error Level Analysis.", tab: "imageosint" },
  { name: "Ghiro", description: "منصة تحليل جنائي رقمي للصور مفتوحة المصدر", tags: ["جنائي", "مفتوح المصدر", "تحليل صور"], link: "https://www.getghiro.org", badge: "free", category: "OSINT الصور والوجوه", status: "online", details: "Ghiro منصة شاملة لتحليل الصور جنائياً واستخراج بياناتها الوصفية.", tab: "imageosint" },
  { name: "Bing Visual Search", description: "بحث عكسي بالصور من Microsoft مع نتائج متميزة", tags: ["Bing", "Microsoft", "بحث عكسي"], link: "https://www.bing.com/visualsearch", badge: "free", category: "OSINT الصور والوجوه", status: "online", details: "Bing Visual Search يوفر نتائج مختلفة عن Google مما يوسع نطاق البحث.", tab: "imageosint" },
];

// ─── VULNERABILITY & CVE ─────────────────────────────────
const VULN_TOOLS: OsintTool[] = [
  { name: "NVD (NIST)", description: "قاعدة بيانات CVE الرسمية الأمريكية مع معلومات CVSS", tags: ["CVE", "CVSS", "NIST"], link: "https://nvd.nist.gov", badge: "free", category: "ثغرات أمنية", status: "online", details: "NVD قاعدة البيانات الوطنية للثغرات من NIST مع تقييمات CVSS.", tab: "vuln" },
  { name: "Exploit-DB", description: "قاعدة بيانات للثغرات وأكواد الاستغلال من Offensive Security", tags: ["استغلال", "ثغرات", "POC"], link: "https://www.exploit-db.com", badge: "free", category: "ثغرات أمنية", status: "online", details: "Exploit-DB تحتوي على آلاف الثغرات وأكواد الاستغلال الجاهزة.", tab: "vuln" },
  { name: "CVE Details", description: "واجهة بحث محسّنة لقاعدة بيانات CVE مع إحصائيات", tags: ["CVE", "بحث", "إحصائيات"], link: "https://www.cvedetails.com", badge: "free", category: "ثغرات أمنية", status: "online", details: "CVE Details يوفر واجهة بحث أفضل مع رسوم بيانية وإحصائيات مفصلة.", tab: "vuln" },
  { name: "MITRE CVE", description: "قاعدة بيانات CVE الأصلية من MITRE Corporation", tags: ["CVE", "MITRE", "رسمي"], link: "https://cve.mitre.org", badge: "free", category: "ثغرات أمنية", status: "online", details: "MITRE CVE المصدر الأصلي لقائمة الثغرات الأمنية العامة.", tab: "vuln" },
  { name: "Vulhub", description: "بيئات Docker جاهزة لاختبار ثغرات حقيقية", tags: ["Docker", "اختبار", "بيئة"], link: "https://vulhub.org", badge: "free", category: "ثغرات أمنية", status: "online", details: "Vulhub يوفر بيئات Docker جاهزة لاختبار آلاف الثغرات الحقيقية.", tab: "vuln" },
  { name: "OSV.dev", description: "قاعدة بيانات مفتوحة للثغرات في الحزم المفتوحة المصدر", tags: ["مفتوح المصدر", "حزم", "ثغرات"], link: "https://osv.dev", badge: "free", category: "ثغرات أمنية", status: "online", details: "OSV قاعدة بيانات Google للثغرات في مكتبات ولغات البرمجة.", tab: "vuln" },
  { name: "Snyk", description: "فحص ثغرات تبعيات الكود والحزم مفتوحة المصدر", tags: ["تبعيات", "كود", "فحص"], link: "https://snyk.io", badge: "free", category: "ثغرات أمنية", status: "online", details: "Snyk يكتشف ثغرات في مكتبات npm وPyPI وMaven وغيرها.", tab: "vuln" },
  { name: "VulnHub", description: "أجهزة افتراضية ضعيفة للتدريب على اختبار الاختراق", tags: ["تدريب", "اختبار اختراق", "VM"], link: "https://www.vulnhub.com", badge: "free", category: "ثغرات أمنية", status: "online", details: "VulnHub يوفر أجهزة VM ضعيفة عمداً للتدريب الأمني القانوني.", tab: "vuln" },
  { name: "HackerOne Hacktivity", description: "تقارير الثغرات العامة المكشوفة من برامج Bug Bounty", tags: ["Bug Bounty", "تقارير", "عامة"], link: "https://hackerone.com/hacktivity", badge: "free", category: "ثغرات أمنية", status: "online", details: "Hacktivity يعرض تقارير الثغرات التي تم الكشف عنها من برامج Bug Bounty.", tab: "vuln" },
  { name: "CVSS Calculator", description: "حاسبة CVSS لتقييم درجة خطورة الثغرات الأمنية", tags: ["CVSS", "تقييم", "درجة خطورة"], link: "https://www.first.org/cvss/calculator/3.1", badge: "free", category: "ثغرات أمنية", status: "online", details: "CVSS Calculator يحسب درجة خطورة الثغرات وفق معيار CVSS 3.1.", tab: "vuln" },
];

// ─── PASSWORD & CREDENTIAL OSINT ─────────────────────────
const PASSWORD_TOOLS: OsintTool[] = [
  { name: "Have I Been Pwned (Passwords)", description: "التحقق من تسريب كلمة مرور في قواعد البيانات المسربة", tags: ["كلمات مرور", "تسريبات", "هاش"], link: "https://haveibeenpwned.com/Passwords", badge: "free", category: "بيانات اعتماد مسربة", status: "online", details: "HIBP Passwords يتحقق من كلمة المرور بطريقة آمنة عبر k-anonymity.", tab: "password" },
  { name: "Dehashed", description: "محرك بحث في التسريبات والبيانات المسروقة", tags: ["تسريبات", "بيانات مسروقة", "بحث"], link: "https://dehashed.com", badge: "paid", category: "بيانات اعتماد مسربة", status: "online", details: "Dehashed يبحث في مليارات السجلات المسربة بما فيها أسماء المستخدمين وكلمات المرور.", tab: "password" },
  { name: "LeakCheck", description: "التحقق من تسريب بيانات الاعتماد في قواعد بيانات ضخمة", tags: ["تحقق", "بيانات اعتماد", "تسريبات"], link: "https://leakcheck.io", badge: "free", category: "بيانات اعتماد مسربة", status: "online", details: "LeakCheck يتحقق من ظهور بريدك أو اسم المستخدم في بيانات مسربة.", tab: "password" },
  { name: "BreachDirectory", description: "دليل التسريبات للتحقق السريع من البيانات المخترقة", tags: ["تسريبات", "سريع", "تحقق"], link: "https://breachdirectory.org", badge: "free", category: "بيانات اعتماد مسربة", status: "online", details: "BreachDirectory يوفر بحثاً سريعاً في قواعد بيانات التسريبات.", tab: "password" },
  { name: "Snusbase", description: "محرك بحث متخصص في قواعد بيانات مسربة ضخمة", tags: ["قواعد بيانات مسربة", "بحث", "شامل"], link: "https://snusbase.com", badge: "paid", category: "بيانات اعتماد مسربة", status: "online", details: "Snusbase يحتوي على مليارات السجلات من مئات التسريبات.", tab: "password" },
  { name: "Hashcat", description: "أقوى أداة لاستعادة كلمات المرور من الهاشات", tags: ["استعادة", "هاش", "GPU"], link: "https://hashcat.net", badge: "free", category: "بيانات اعتماد مسربة", status: "online", details: "Hashcat يستخدم GPU للبحث في مليارات الاحتمالات لاستعادة كلمات المرور.", tab: "password" },
  { name: "John the Ripper", description: "اختبار قوة كلمات المرور وكسر التشفير الضعيف", tags: ["كسر تشفير", "قوة مرور", "اختبار"], link: "https://www.openwall.com/john", badge: "free", category: "بيانات اعتماد مسربة", status: "online", details: "John the Ripper أداة كلاسيكية لاختبار قوة كلمات المرور.", tab: "password" },
  { name: "CrackStation", description: "كشف كلمات المرور من الهاشات عبر قاعدة بيانات ضخمة", tags: ["هاش", "كشف", "قاعدة بيانات"], link: "https://crackstation.net", badge: "free", category: "بيانات اعتماد مسربة", status: "online", details: "CrackStation يقارن الهاشات مع قاعدة بيانات تضم مليارات كلمة مرور.", tab: "password" },
];

// ─── DNS TOOLS ────────────────────────────────────────────
const DNS_TOOLS: OsintTool[] = [
  { name: "DNSdumpster", description: "استطلاع DNS شامل مع خريطة بصرية للبنية التحتية", tags: ["DNS", "استطلاع", "خريطة"], link: "https://dnsdumpster.com", badge: "free", category: "أدوات DNS", status: "online", details: "DNSdumpster يقدم خريطة بصرية لسجلات DNS وبنية النطاق.", tab: "dns" },
  { name: "ViewDNS", description: "مجموعة أدوات DNS وWhois وIP lookup متكاملة", tags: ["DNS", "WHOIS", "IP lookup"], link: "https://viewdns.info", badge: "free", category: "أدوات DNS", status: "online", details: "ViewDNS يوفر عشرات الأدوات لتحليل DNS والشبكات والنطاقات.", tab: "dns" },
  { name: "SecurityTrails", description: "سجلات DNS التاريخية وبيانات الاستطلاع الشاملة", tags: ["DNS تاريخي", "بيانات", "سجلات"], link: "https://securitytrails.com", badge: "free", category: "أدوات DNS", status: "online", details: "SecurityTrails يتتبع سجلات DNS التاريخية وتغييرات النطاقات.", tab: "dns" },
  { name: "Passive DNS (DNSDB)", description: "قاعدة بيانات DNS السلبية لتتبع حل النطاقات تاريخياً", tags: ["DNS سلبي", "تاريخي", "نطاقات"], link: "https://www.farsightsecurity.com/solutions/dnsdb", badge: "paid", category: "أدوات DNS", status: "online", details: "DNSDB قاعدة البيانات الرائدة في السجلات التاريخية لـ DNS.", tab: "dns" },
  { name: "DNSViz", description: "تصور شجرة DNS والتحقق من DNSSEC بشكل بصري", tags: ["DNSSEC", "تصور", "تحقق"], link: "https://dnsviz.net", badge: "free", category: "أدوات DNS", status: "online", details: "DNSViz يرسم شجرة DNS بصرياً ويتحقق من صحة DNSSEC.", tab: "dns" },
  { name: "WhoisXMLAPI", description: "بيانات WHOIS وDNS والاستضافة عبر API موحد", tags: ["WHOIS", "API", "بيانات شاملة"], link: "https://whoisxmlapi.com", badge: "free", category: "أدوات DNS", status: "online", details: "WhoisXMLAPI يوفر بيانات WHOIS والشهادات والنطاقات الفرعية عبر API.", tab: "dns" },
  { name: "MassDNS", description: "حل DNS بالقوة الغاشمة بسرعة فائقة", tags: ["DNS", "سريع", "قوة غاشمة"], link: "https://github.com/blechschmidt/massdns", badge: "free", category: "أدوات DNS", status: "online", details: "MassDNS يحل ملايين أسماء النطاقات في دقائق باستخدام resolvers متعددة.", tab: "dns" },
  { name: "PureDNS", description: "أداة ضبط نطاق نقي مع التحقق من النتائج الحية", tags: ["نطاقات فرعية", "تحقق", "سريع"], link: "https://github.com/d3mondev/puredns", badge: "free", category: "أدوات DNS", status: "online", details: "PureDNS يجمع بين MassDNS وقوائم الكلمات لاكتشاف نطاقات فرعية حية.", tab: "dns" },
];

// ─── API SECURITY TOOLS ───────────────────────────────────
const API_TOOLS: OsintTool[] = [
  { name: "Postman", description: "منصة اختبار API الأكثر شيوعاً في العالم", tags: ["API", "اختبار", "REST"], link: "https://www.postman.com", badge: "free", category: "أمن API", status: "online", details: "Postman أداة شاملة لتطوير واختبار وتوثيق APIs.", tab: "api" },
  { name: "Swagger Inspector", description: "اختبار وتحليل APIs مع تصدير OpenAPI تلقائي", tags: ["Swagger", "OpenAPI", "تحليل"], link: "https://inspector.swagger.io", badge: "free", category: "أمن API", status: "online", details: "Swagger Inspector يختبر APIs ويولد توثيقاً OpenAPI تلقائياً.", tab: "api" },
  { name: "Kiterunner", description: "استكشاف مسارات API بقوائم كلمات متخصصة وسريع", tags: ["API مسارات", "قوائم", "سريع"], link: "https://github.com/assetnote/kiterunner", badge: "free", category: "أمن API", status: "online", details: "Kiterunner من Assetnote مخصص لاكتشاف نقاط نهاية API المخفية.", tab: "api" },
  { name: "Arjun", description: "اكتشاف معاملات HTTP المخفية في تطبيقات الويب", tags: ["HTTP", "معاملات مخفية", "اكتشاف"], link: "https://github.com/s0md3v/Arjun", badge: "free", category: "أمن API", status: "online", details: "Arjun يكتشف المعاملات المخفية في طلبات HTTP بكفاءة عالية.", tab: "api" },
  { name: "APIFuzzer", description: "اختبار مكثف لـ APIs بتوليد بيانات عشوائية", tags: ["Fuzzing", "API", "اختبار مكثف"], link: "https://github.com/KissPeter/APIFuzzer", badge: "free", category: "أمن API", status: "online", details: "APIFuzzer يختبر APIs باستخدام بيانات عشوائية للكشف عن الثغرات.", tab: "api" },
  { name: "OWASP API Security", description: "دليل أفضل ممارسات أمن API من OWASP", tags: ["OWASP", "أمان", "أفضل ممارسات"], link: "https://owasp.org/www-project-api-security", badge: "free", category: "أمن API", status: "online", details: "OWASP API Security Top 10 الدليل المرجعي لأخطر ثغرات APIs.", tab: "api" },
  { name: "GraphQL Voyager", description: "استكشاف وتصور مخطط GraphQL API", tags: ["GraphQL", "تصور", "استكشاف"], link: "https://graphql-voyager.deploystack.io", badge: "free", category: "أمن API", status: "online", details: "GraphQL Voyager يرسم مخطط GraphQL بصرياً لفهم العلاقات.", tab: "api" },
];

// ─── IoT & HARDWARE OSINT ─────────────────────────────────
const IOT_TOOLS: OsintTool[] = [
  { name: "Shodan (IoT)", description: "البحث المتخصص في أجهزة إنترنت الأشياء المكشوفة", tags: ["IoT", "أجهزة", "مكشوف"], link: "https://www.shodan.io", badge: "free", category: "OSINT الأجهزة", status: "online", details: "Shodan يفهرس ملايين أجهزة IoT المتصلة بما فيها الكاميرات وأجهزة التوجيه.", tab: "iot" },
  { name: "Censys (Devices)", description: "فحص وتحليل أجهزة IoT والبنية التحتية", tags: ["IoT", "بنية تحتية", "فحص"], link: "https://censys.io", badge: "free", category: "OSINT الأجهزة", status: "online", details: "Censys يركز على تحليل الأجهزة والشهادات وبنية الإنترنت.", tab: "iot" },
  { name: "ZoomEye (IoT)", description: "محرك بحث صيني مخصص للأجهزة الذكية والـ IoT", tags: ["IoT", "صيني", "أجهزة ذكية"], link: "https://www.zoomeye.org", badge: "free", category: "OSINT الأجهزة", status: "online", details: "ZoomEye يحتوي على مئات الملايين من سجلات أجهزة IoT.", tab: "iot" },
  { name: "FOFA (Hardware)", description: "اكتشاف الأجهزة والـ firmware المكشوفة على الإنترنت", tags: ["firmware", "أجهزة", "اكتشاف"], link: "https://fofa.info", badge: "free", category: "OSINT الأجهزة", status: "online", details: "FOFA يكتشف أجهزة بـ firmware محدد أو إعدادات معينة.", tab: "iot" },
  { name: "Firmware.re", description: "تحليل firmware أجهزة IoT لاكتشاف الثغرات", tags: ["firmware", "تحليل", "ثغرات"], link: "https://firmware.re", badge: "free", category: "OSINT الأجهزة", status: "online", details: "Firmware.re يحلل ملفات firmware الموجودة لاكتشاف مشاكل الأمان.", tab: "iot" },
  { name: "RouterSploit", description: "إطار عمل لاستغلال ثغرات أجهزة التوجيه المنزلية", tags: ["توجيه", "ثغرات", "إطار عمل"], link: "https://github.com/threat9/routersploit", badge: "free", category: "OSINT الأجهزة", status: "online", details: "RouterSploit مخصص لاختبار أمان أجهزة التوجيه والأجهزة المدمجة.", tab: "iot" },
  { name: "Mirai Scanner", description: "اكتشاف الأجهزة المعرضة لهجمات Mirai botnet", tags: ["Mirai", "botnet", "اكتشاف"], link: "https://github.com/Gu1mix/mirai-scanner", badge: "free", category: "OSINT الأجهزة", status: "online", details: "يكتشف الأجهزة التي قد تكون عرضة لهجمات Mirai الشهيرة.", tab: "iot" },
];

// ─── DIGITAL FORENSICS ────────────────────────────────────
const FORENSICS_TOOLS: OsintTool[] = [
  { name: "Autopsy", description: "منصة تحقيق جنائي رقمي مفتوحة المصدر", tags: ["جنائي رقمي", "تحقيق", "مفتوح"], link: "https://www.autopsy.com", badge: "free", category: "جنائيات رقمية", status: "online", details: "Autopsy من أقوى أدوات التحقيق الجنائي الرقمي مفتوح المصدر.", tab: "forensics" },
  { name: "Volatility", description: "تحليل صور الذاكرة واستخراج الأدلة الجنائية", tags: ["ذاكرة", "تحليل", "أدلة"], link: "https://www.volatilityfoundation.org", badge: "free", category: "جنائيات رقمية", status: "online", details: "Volatility المعيار الذهبي لتحليل صور الذاكرة في التحقيقات الجنائية.", tab: "forensics" },
  { name: "FTK Imager", description: "إنشاء صور جنائية للأقراص الصلبة والأدلة الرقمية", tags: ["صور قرص", "أدلة", "جنائي"], link: "https://www.exterro.com/ftk-imager", badge: "free", category: "جنائيات رقمية", status: "online", details: "FTK Imager يُنشئ صوراً جنائية دقيقة مع التحقق من السلامة.", tab: "forensics" },
  { name: "Wireshark", description: "تحليل حركة المرور الشبكية واستخراج البيانات", tags: ["شبكة", "تحليل", "بروتوكولات"], link: "https://www.wireshark.org", badge: "free", category: "جنائيات رقمية", status: "online", details: "Wireshark أداة تحليل حركة مرور الشبكات الأكثر شيوعاً في العالم.", tab: "forensics" },
  { name: "Bulk Extractor", description: "استخراج بيانات من صور القرص بسرعة عالية", tags: ["استخراج", "بيانات", "قرص"], link: "https://github.com/simsong/bulk_extractor", badge: "free", category: "جنائيات رقمية", status: "online", details: "Bulk Extractor يستخرج البريد وعناوين URL والتشفير من صور الأقراص.", tab: "forensics" },
  { name: "Sleuth Kit", description: "مجموعة أدوات تحليل أنظمة الملفات الجنائية", tags: ["نظام ملفات", "تحليل", "أدوات"], link: "https://www.sleuthkit.org", badge: "free", category: "جنائيات رقمية", status: "online", details: "Sleuth Kit يتيح تحليل أنظمة ملفات NTFS وFAT وEXT وHFS.", tab: "forensics" },
  { name: "CAINE", description: "توزيعة Linux متخصصة للتحقيق الجنائي الرقمي", tags: ["Linux", "جنائي", "توزيعة"], link: "https://www.caine-live.net", badge: "free", category: "جنائيات رقمية", status: "online", details: "CAINE Linux بيئة متكاملة مخصصة لعمليات التحقيق الجنائي الرقمي.", tab: "forensics" },
  { name: "Magnet AXIOM", description: "منصة تحقيق جنائي متكاملة للأجهزة المحمولة والكمبيوتر", tags: ["أجهزة محمولة", "كمبيوتر", "متكاملة"], link: "https://www.magnetforensics.com/products/magnet-axiom", badge: "paid", category: "جنائيات رقمية", status: "online", details: "Magnet AXIOM الحل الاحترافي للتحقيق في الأدلة الرقمية من جميع المصادر.", tab: "forensics" },
];

// ─── OPSEC & ANONYMITY ────────────────────────────────────
const OPSEC_TOOLS: OsintTool[] = [
  { name: "Tor Browser", description: "تصفح الإنترنت بشكل مجهول عبر شبكة Tor المشفرة", tags: ["مجهولية", "Tor", "تشفير"], link: "https://www.torproject.org", badge: "free", category: "OPSEC", status: "online", details: "Tor Browser يُشغّل حركة المرور عبر 3 طبقات تشفير ونودات متعددة لإخفاء هويتك.", tab: "opsec" },
  { name: "Tails OS", description: "نظام تشغيل مباشر لا يترك أثراً — كل شيء في الذاكرة", tags: ["نظام تشغيل", "مجهولية", "لا أثر"], link: "https://tails.boum.org", badge: "free", category: "OPSEC", status: "online", details: "Tails يُشغَّل من USB ويوجّه كل حركة المرور عبر Tor ولا يترك أي أثر على الجهاز.", tab: "opsec" },
  { name: "ProxyChains", description: "تحويل اتصالات البرامج عبر سلسلة من البروكسيات", tags: ["بروكسي", "سلسلة", "مجهولية"], link: "https://github.com/haad/proxychains", badge: "free", category: "OPSEC", status: "online", details: "ProxyChains يُمرّر اتصالات أي برنامج عبر بروكسيات متعددة تُعقّد التتبع.", tab: "opsec" },
  { name: "Whonix", description: "نظام تشغيل مجهولية يُشغَّل كـ VM مع Tor مدمج", tags: ["VM", "Tor", "مجهولية"], link: "https://www.whonix.org", badge: "free", category: "OPSEC", status: "online", details: "Whonix يفصل تطبيقاتك عن الشبكة الحقيقية بـ Gateway VM يُوجَّه فقط عبر Tor.", tab: "opsec" },
  { name: "Qubes OS", description: "نظام تشغيل يعزل التطبيقات في VMs منفصلة للأمان", tags: ["عزل", "VM", "أمان"], link: "https://www.qubes-os.org", badge: "free", category: "OPSEC", status: "online", details: "Qubes OS يشغّل كل تطبيق في VM منعزل لمنع الاختراق من الانتشار.", tab: "opsec" },
  { name: "VPN Gate", description: "شبكة VPN أكاديمية مجانية مع آلاف الخوادم", tags: ["VPN", "مجاني", "أكاديمي"], link: "https://www.vpngate.net", badge: "free", category: "OPSEC", status: "online", details: "VPN Gate مشروع أكاديمي يوفر آلاف خوادم VPN مجانية مشغَّلة من متطوعين.", tab: "opsec" },
  { name: "Signal", description: "تطبيق مراسلة مشفر من طرف لطرف E2E بمعايير عسكرية", tags: ["رسائل", "تشفير", "E2E"], link: "https://signal.org", badge: "free", category: "OPSEC", status: "online", details: "Signal يستخدم بروتوكول Signal المعيار الذهبي للتشفير E2E.", tab: "opsec" },
  { name: "Veracrypt", description: "تشفير الأقراص الصلبة والملفات بخوارزميات عسكرية", tags: ["تشفير قرص", "ملفات", "AES"], link: "https://www.veracrypt.fr", badge: "free", category: "OPSEC", status: "online", details: "VeraCrypt يُشفّر الأقراص وإنشاء حجرات مخفية داخل القسم.", tab: "opsec" },
  { name: "MAT2", description: "إزالة البيانات الوصفية من الملفات والصور", tags: ["بيانات وصفية", "إزالة", "EXIF"], link: "https://0xacab.org/jvoisin/mat2", badge: "free", category: "OPSEC", status: "online", details: "MAT2 يُنظّف بيانات EXIF والـ metadata من الصور والوثائق.", tab: "opsec" },
  { name: "Keybase", description: "تشفير وتوقيع الرسائل والملفات عبر مفاتيح عامة/خاصة", tags: ["تشفير", "مفاتيح عامة", "هوية"], link: "https://keybase.io", badge: "free", category: "OPSEC", status: "online", details: "Keybase يربط هويتك الرقمية بمفاتيح تشفير عامة لضمان المصداقية.", tab: "opsec" },
  { name: "I2P", description: "شبكة مجهولية بديلة لـ Tor مع بروتوكول Garlic Routing", tags: ["مجهولية", "Garlic", "شبكة"], link: "https://geti2p.net", badge: "free", category: "OPSEC", status: "online", details: "I2P شبكة مجهولية لامركزية مختلفة عن Tor مع Garlic Routing المتعدد الطبقات.", tab: "opsec" },
  { name: "BleachBit", description: "حذف الملفات المؤقتة والأدلة بشكل آمن وكامل", tags: ["حذف آمن", "أدلة", "خصوصية"], link: "https://www.bleachbit.org", badge: "free", category: "OPSEC", status: "online", details: "BleachBit يمسح ملفات الكاش والسجلات وبيانات التصفح بشكل آمن.", tab: "opsec" },
  { name: "OnionShare", description: "مشاركة الملفات بشكل مجهول عبر Tor Network", tags: ["مشاركة ملفات", "Tor", "مجهولية"], link: "https://onionshare.org", badge: "free", category: "OPSEC", status: "online", details: "OnionShare يُنشئ عنوان .onion مؤقت لمشاركة الملفات بأمان تام.", tab: "opsec" },
  { name: "Proxifier", description: "تحويل أي برنامج للعمل عبر البروكسيات والـ SOCKS", tags: ["بروكسي", "SOCKS", "شبكة"], link: "https://www.proxifier.com", badge: "paid", category: "OPSEC", status: "online", details: "Proxifier يُجبر أي تطبيق على استخدام البروكسي بغض النظر عن دعمه الأصلي.", tab: "opsec" },
  { name: "Cryptomator", description: "تشفير الملفات في السحابة (Dropbox, Google Drive) محلياً", tags: ["سحابة", "تشفير", "Dropbox"], link: "https://cryptomator.org", badge: "free", category: "OPSEC", status: "online", details: "Cryptomator يُشفّر ملفاتك قبل رفعها للسحابة — لا يرى المزود شيئاً.", tab: "opsec" },
];

// ─── RED TEAM / OFFENSIVE ─────────────────────────────────
const REDTEAM_TOOLS: OsintTool[] = [
  { name: "Metasploit Framework", description: "إطار الاختراق الأشهر عالمياً — 2000+ وحدة هجوم", tags: ["اختراق", "وحدات", "هجوم"], link: "https://www.metasploit.com", badge: "free", category: "Red Team", status: "online", details: "Metasploit المعيار الذهبي لاختبار الاختراق مع آلاف الاستغلالات والـ payloads.", tab: "redteam" },
  { name: "Cobalt Strike", description: "منصة محاكاة الهجمات المتقدمة لفرق Red Team", tags: ["Red Team", "APT", "محاكاة"], link: "https://www.cobaltstrike.com", badge: "paid", category: "Red Team", status: "online", details: "Cobalt Strike يُحاكي هجمات APT مع Beacon C2 وتقنيات التهرب المتقدمة.", tab: "redteam" },
  { name: "Empire Framework", description: "إطار عمل C2 بـ PowerShell وPython للعمليات الهجومية", tags: ["C2", "PowerShell", "Post-Exploitation"], link: "https://github.com/BC-SECURITY/Empire", badge: "free", category: "Red Team", status: "online", details: "Empire يوفر قدرات post-exploitation قوية عبر وحدات PowerShell وPython.", tab: "redteam" },
  { name: "Sliver C2", description: "إطار عمل C2 مفتوح المصدر حديث — بديل مجاني لـ Cobalt Strike", tags: ["C2", "مجاني", "Golang"], link: "https://github.com/BishopFox/sliver", badge: "free", category: "Red Team", status: "online", details: "Sliver من BishopFox مكتوب بـ Go مع دعم TLS وHTTP وDNS beaconing.", tab: "redteam" },
  { name: "BloodHound", description: "رسم خريطة Active Directory وإيجاد مسارات التصعيد", tags: ["Active Directory", "تصعيد صلاحيات", "خريطة"], link: "https://github.com/BloodHoundAD/BloodHound", badge: "free", category: "Red Team", status: "online", details: "BloodHound يرسم علاقات AD كاملة ويكشف أقصر مسار للوصول إلى Domain Admin.", tab: "redteam" },
  { name: "Mimikatz", description: "استخراج بيانات الاعتماد وكلمات المرور من ذاكرة Windows", tags: ["كلمات مرور", "Windows", "LSASS"], link: "https://github.com/gentilkiwi/mimikatz", badge: "free", category: "Red Team", status: "online", details: "Mimikatz يستخرج كلمات المرور والتذاكر Kerberos وhashes من LSASS.", tab: "redteam" },
  { name: "CrackMapExec", description: "أتمتة هجمات شبكات Windows وActive Directory", tags: ["SMB", "Windows", "أتمتة"], link: "https://github.com/Porchetta-Industries/CrackMapExec", badge: "free", category: "Red Team", status: "online", details: "CrackMapExec يُؤتمت عمليات التحقق من بيانات الاعتماد والحركة الجانبية.", tab: "redteam" },
  { name: "Responder", description: "اعتراض بيانات الاعتماد عبر LLMNR وNBT-NS Poisoning", tags: ["LLMNR", "اعتراض", "Hash"], link: "https://github.com/lgandx/Responder", badge: "free", category: "Red Team", status: "online", details: "Responder يعترض بيانات الاعتماد NTLMv2 عبر تسميم البروتوكولات المحلية.", tab: "redteam" },
  { name: "Impacket", description: "مجموعة بروتوكولات Python لعمليات Windows الشبكية", tags: ["Python", "SMB", "Kerberos"], link: "https://github.com/SecureAuthCorp/impacket", badge: "free", category: "Red Team", status: "online", details: "Impacket يوفر تطبيقات Python لبروتوكولات SMB وKerberos وDCE/RPC.", tab: "redteam" },
  { name: "PowerSploit", description: "مجموعة وحدات PowerShell للاختراق وما بعد الاستغلال", tags: ["PowerShell", "Post-Exploitation", "Windows"], link: "https://github.com/PowerShellMafia/PowerSploit", badge: "free", category: "Red Team", status: "online", details: "PowerSploit يوفر وحدات Invoke-Mimikatz وGet-GPPPassword والمزيد.", tab: "redteam" },
  { name: "Havoc C2", description: "إطار C2 متقدم مفتوح المصدر بواجهة مرئية", tags: ["C2", "مفتوح", "واجهة مرئية"], link: "https://github.com/HavocFramework/Havoc", badge: "free", category: "Red Team", status: "online", details: "Havoc يوفر واجهة مرئية احترافية مع تقنيات تهرب متقدمة.", tab: "redteam" },
  { name: "Nishang", description: "إطار عمل PowerShell لاختبار الاختراق والفرق الحمراء", tags: ["PowerShell", "Red Team", "هجومي"], link: "https://github.com/samratashok/nishang", badge: "free", category: "Red Team", status: "online", details: "Nishang مجموعة Scripts PowerShell للـ Reverse Shell والـ Persistence.", tab: "redteam" },
  { name: "PsExec", description: "تنفيذ الأوامر عن بُعد على أجهزة Windows", tags: ["Windows", "تنفيذ بعيد", "SMB"], link: "https://docs.microsoft.com/en-us/sysinternals/downloads/psexec", badge: "free", category: "Red Team", status: "online", details: "PsExec من Sysinternals يُنفّذ الأوامر على أجهزة Windows عن بُعد.", tab: "redteam" },
  { name: "Evil-WinRM", description: "اتصال WinRM هجومي بميزات post-exploitation مدمجة", tags: ["WinRM", "Post-Exploitation", "Windows"], link: "https://github.com/Hackplayers/evil-winrm", badge: "free", category: "Red Team", status: "online", details: "Evil-WinRM يوفر shell متقدم عبر WinRM مع تحميل ملفات ومجمّع .NET.", tab: "redteam" },
  { name: "Kerbrute", description: "معلومات حسابات AD والتخمين السريع لـ Kerberos", tags: ["Kerberos", "Active Directory", "تخمين"], link: "https://github.com/ropnop/kerbrute", badge: "free", category: "Red Team", status: "online", details: "Kerbrute يستخدم Kerberos لاستعلام حسابات AD ومهاجمة كلمات المرور.", tab: "redteam" },
];

// ─── CLOUD SECURITY ────────────────────────────────────────
const CLOUD_TOOLS: OsintTool[] = [
  { name: "Prowler", description: "أداة مسح أمني شامل لـ AWS مع 300+ فحص", tags: ["AWS", "مسح أمني", "CIS"], link: "https://github.com/prowler-cloud/prowler", badge: "free", category: "أمن السحابة", status: "online", details: "Prowler يفحص AWS مقابل معايير CIS وPCI DSS وSOC2 وNIST.", tab: "cloud" },
  { name: "ScoutSuite", description: "مسح أمني متعدد السحابة — AWS وAzure وGCP", tags: ["AWS", "Azure", "GCP", "متعدد"], link: "https://github.com/nccgroup/ScoutSuite", badge: "free", category: "أمن السحابة", status: "online", details: "ScoutSuite يدعم AWS وAzure وGCP وAliCloud ويُنتج تقارير مرئية.", tab: "cloud" },
  { name: "CloudMapper", description: "رسم خريطة البنية التحتية AWS بشكل مرئي", tags: ["AWS", "خريطة", "بنية تحتية"], link: "https://github.com/duo-labs/cloudmapper", badge: "free", category: "أمن السحابة", status: "online", details: "CloudMapper يرسم VPCs والـ EC2 والـ Security Groups في رسم تفاعلي.", tab: "cloud" },
  { name: "Pacu", description: "إطار عمل اختراق AWS — بديل Metasploit للسحابة", tags: ["AWS", "اختراق", "هجومي"], link: "https://github.com/RhinoSecurityLabs/pacu", badge: "free", category: "أمن السحابة", status: "online", details: "Pacu يوفر وحدات هجومية لاستغلال إعدادات AWS الضعيفة.", tab: "cloud" },
  { name: "CloudFox", description: "اكتشاف نقاط الهجوم في بيئات السحابة", tags: ["AWS", "Azure", "اكتشاف"], link: "https://github.com/BishopFox/cloudfox", badge: "free", category: "أمن السحابة", status: "online", details: "CloudFox يُسرّع اكتشاف الثغرات الشائعة في إعدادات السحابة.", tab: "cloud" },
  { name: "S3Scanner", description: "اكتشاف حاويات S3 المكشوفة والمُعرَّضة للخطر", tags: ["S3", "AWS", "مكشوف"], link: "https://github.com/sa7mon/S3Scanner", badge: "free", category: "أمن السحابة", status: "online", details: "S3Scanner يكتشف حاويات S3 العامة وغير المحمية.", tab: "cloud" },
  { name: "GrayhatWarfare", description: "بحث في حاويات S3 وBlob Storage المكشوفة", tags: ["S3", "Blob", "بحث"], link: "https://grayhatwarfare.com", badge: "free", category: "أمن السحابة", status: "online", details: "GrayhatWarfare قاعدة بيانات لحاويات التخزين السحابي المكشوفة.", tab: "cloud" },
  { name: "Trivy", description: "فحص الثغرات في صور Docker وملفات Infrastructure", tags: ["Docker", "Kubernetes", "ثغرات"], link: "https://github.com/aquasecurity/trivy", badge: "free", category: "أمن السحابة", status: "online", details: "Trivy يفحص صور Docker وملفات Terraform وHelm عن الثغرات.", tab: "cloud" },
  { name: "Checkov", description: "تحليل ثابت لملفات Terraform وCloudFormation", tags: ["Terraform", "IaC", "ثابت"], link: "https://github.com/bridgecrewio/checkov", badge: "free", category: "أمن السحابة", status: "online", details: "Checkov يفحص ملفات Infrastructure as Code عن الثغرات قبل النشر.", tab: "cloud" },
  { name: "KICS", description: "فحص أمني لملفات IaC — 2400+ فحص", tags: ["IaC", "Kubernetes", "أمني"], link: "https://github.com/Checkmarx/kics", badge: "free", category: "أمن السحابة", status: "online", details: "KICS يدعم Terraform وAnsible وKubernetes وDockerfile والمزيد.", tab: "cloud" },
  { name: "Cartography", description: "رسم خريطة أصول السحابة وعلاقاتها في Neo4j", tags: ["Neo4j", "AWS", "أصول"], link: "https://github.com/lyft/cartography", badge: "free", category: "أمن السحابة", status: "online", details: "Cartography يُنشئ رسم بياني لأصول AWS وGSuite في قاعدة Neo4j.", tab: "cloud" },
  { name: "Enumerate-IAM", description: "استعلام صلاحيات IAM في AWS بشكل آمن وشامل", tags: ["IAM", "AWS", "صلاحيات"], link: "https://github.com/andresriancho/enumerate-iam", badge: "free", category: "أمن السحابة", status: "online", details: "يُعدَّد جميع صلاحيات مفتاح AWS IAM بدون إنشاء أي موارد.", tab: "cloud" },
  { name: "Kubernetes Goat", description: "بيئة Kubernetes ضعيفة مقصودة للتدريب", tags: ["Kubernetes", "تدريب", "هجومي"], link: "https://github.com/madhuakula/kubernetes-goat", badge: "free", category: "أمن السحابة", status: "online", details: "Kubernetes Goat بيئة تدريب عملي لاختبار أمان Kubernetes.", tab: "cloud" },
  { name: "ROADtools", description: "استعلام Azure Active Directory وتحليل المستأجرين", tags: ["Azure", "AD", "استعلام"], link: "https://github.com/dirkjanm/ROADtools", badge: "free", category: "أمن السحابة", status: "online", details: "ROADtools يستعلم Azure AD ويُحلّل صلاحيات المستأجرين.", tab: "cloud" },
  { name: "Steampipe", description: "استعلام SQL في بنية السحابة متعددة المزودين", tags: ["SQL", "AWS", "Azure", "GCP"], link: "https://steampipe.io", badge: "free", category: "أمن السحابة", status: "online", details: "Steampipe يُتيح كتابة SQL لاستعلام موارد AWS وAzure وGCP في وقت واحد.", tab: "cloud" },
];

// ─── WEB APPLICATION SECURITY ─────────────────────────────
const WEBAPP_TOOLS: OsintTool[] = [
  { name: "Burp Suite Pro", description: "أقوى أداة لاختبار اختراق تطبيقات الويب — المعيار الاحترافي", tags: ["ويب", "اختراق", "احترافي"], link: "https://portswigger.net/burp/pro", badge: "paid", category: "أمن تطبيقات الويب", status: "online", details: "Burp Suite Pro المرجع الأول لاختبار تطبيقات الويب مع Scanner متقدم.", tab: "webapp" },
  { name: "OWASP ZAP", description: "بديل مجاني وقوي لـ Burp Suite لاختبار الويب", tags: ["مجاني", "OWASP", "ويب"], link: "https://www.zaproxy.org", badge: "free", category: "أمن تطبيقات الويب", status: "online", details: "ZAP من OWASP يوفر مسح تلقائي وواجهة proxy تفاعلية مجانية.", tab: "webapp" },
  { name: "SQLMap", description: "أتمتة اكتشاف واستغلال ثغرات SQL Injection", tags: ["SQL Injection", "أتمتة", "قواعد بيانات"], link: "https://sqlmap.org", badge: "free", category: "أمن تطبيقات الويب", status: "online", details: "SQLMap يكتشف ويستغل تلقائياً ثغرات SQL Injection في قواعد البيانات.", tab: "webapp" },
  { name: "Nikto", description: "ماسح خوادم الويب للثغرات والإعدادات الضعيفة", tags: ["خوادم ويب", "ثغرات", "مسح"], link: "https://cirt.net/Nikto2", badge: "free", category: "أمن تطبيقات الويب", status: "online", details: "Nikto يفحص الخوادم عن 6700+ ثغرة وإعداد خاطئ معروف.", tab: "webapp" },
  { name: "Wfuzz", description: "أداة فازينج لتطبيقات الويب والـ API", tags: ["Fuzzing", "ويب", "API"], link: "https://github.com/xmendez/wfuzz", badge: "free", category: "أمن تطبيقات الويب", status: "online", details: "Wfuzz يُؤتمت الفازينج لاكتشاف الموارد المخفية والثغرات.", tab: "webapp" },
  { name: "XSStrike", description: "أداة متخصصة لاكتشاف واستغلال ثغرات XSS", tags: ["XSS", "Cross-Site Scripting", "متخصص"], link: "https://github.com/s0md3v/XSStrike", badge: "free", category: "أمن تطبيقات الويب", status: "online", details: "XSStrike يُحلّل استجابات الويب ويُولّد payloads XSS مخصصة.", tab: "webapp" },
  { name: "Dalfox", description: "ماسح XSS سريع مع دعم DOM وBlind XSS", tags: ["XSS", "Blind XSS", "DOM"], link: "https://github.com/hahwul/dalfox", badge: "free", category: "أمن تطبيقات الويب", status: "online", details: "Dalfox مكتوب بـ Go يدعم الفحص السريع لـ XSS مع الـ DOM.", tab: "webapp" },
  { name: "Arjun", description: "اكتشاف المعاملات المخفية في HTTP وAPIs", tags: ["HTTP", "API", "Parameters"], link: "https://github.com/s0md3v/Arjun", badge: "free", category: "أمن تطبيقات الويب", status: "online", details: "Arjun يكتشف المعاملات المخفية في نماذج HTTP وAPI الـ endpoints.", tab: "webapp" },
  { name: "ffuf", description: "فازينج سريع جداً للويب والـ API", tags: ["Fuzzing", "سريع", "Go"], link: "https://github.com/ffuf/ffuf", badge: "free", category: "أمن تطبيقات الويب", status: "online", details: "ffuf مكتوب بـ Go يُعدّ من أسرع أدوات الفازينج للويب.", tab: "webapp" },
  { name: "JWT Tool", description: "تحليل وهجوم رموز JSON Web Tokens", tags: ["JWT", "Token", "تحليل"], link: "https://github.com/ticarpi/jwt_tool", badge: "free", category: "أمن تطبيقات الويب", status: "online", details: "JWT Tool يُحلّل ويُهاجم JWT مع دعم RS/HS256 وalg:none.", tab: "webapp" },
  { name: "Caido", description: "بديل حديث لـ Burp Suite بواجهة مرئية جميلة", tags: ["ويب", "Proxy", "حديث"], link: "https://caido.io", badge: "free", category: "أمن تطبيقات الويب", status: "online", details: "Caido أداة اختبار اختراق ويب حديثة مع واجهة مرئية نظيفة.", tab: "webapp" },
  { name: "Nuclei Templates", description: "قاعدة بيانات قوالب Nuclei المجتمعية — 7000+", tags: ["Nuclei", "قوالب", "مجتمع"], link: "https://github.com/projectdiscovery/nuclei-templates", badge: "free", category: "أمن تطبيقات الويب", status: "online", details: "أكثر من 7000 قالب YAML لاكتشاف الثغرات المعروفة.", tab: "webapp" },
  { name: "SSRF Sheriff", description: "خادم اكتشاف ثغرات SSRF مع callbacks", tags: ["SSRF", "Callback", "كشف"], link: "https://github.com/teknogeek/ssrf-sheriff", badge: "free", category: "أمن تطبيقات الويب", status: "online", details: "يُساعد على اكتشاف ثغرات SSRF عبر callbacks HTTP.", tab: "webapp" },
  { name: "Smuggler", description: "اكتشاف ثغرات HTTP Request Smuggling", tags: ["HTTP Smuggling", "ثغرات", "متقدم"], link: "https://github.com/defparam/smuggler", badge: "free", category: "أمن تطبيقات الويب", status: "online", details: "Smuggler يكتشف ثغرات HTTP Request Smuggling في الخوادم.", tab: "webapp" },
  { name: "GraphQL Voyager", description: "استكشاف وتحليل GraphQL APIs بشكل مرئي", tags: ["GraphQL", "API", "تحليل"], link: "https://github.com/IvanGoncharov/graphql-voyager", badge: "free", category: "أمن تطبيقات الويب", status: "online", details: "GraphQL Voyager يرسم schema الـ API بشكل مرئي تفاعلي.", tab: "webapp" },
];

// ─── MOBILE OSINT ─────────────────────────────────────────
const MOBILE_TOOLS: OsintTool[] = [
  { name: "MobSF", description: "إطار تحليل أمان تطبيقات الجوال — Android وiOS", tags: ["Android", "iOS", "تحليل"], link: "https://github.com/MobSF/Mobile-Security-Framework-MobSF", badge: "free", category: "أمن الجوال", status: "online", details: "MobSF يُحلّل APK وIPA ستاتيكياً وديناميكياً ويُنتج تقارير تفصيلية.", tab: "mobile" },
  { name: "Objection", description: "اختبار أمان تطبيقات الجوال في وقت التشغيل بـ Frida", tags: ["Frida", "Runtime", "Android", "iOS"], link: "https://github.com/sensepost/objection", badge: "free", category: "أمن الجوال", status: "online", details: "Objection يعتمد على Frida لتحليل التطبيقات حياً وتجاوز الحماية.", tab: "mobile" },
  { name: "Frida", description: "إطار عمل Dynamic Instrumentation للتطبيقات", tags: ["Dynamic", "Instrumentation", "Hook"], link: "https://frida.re", badge: "free", category: "أمن الجوال", status: "online", details: "Frida يُتيح حقن JavaScript في العمليات الحية لمراقبتها وتعديلها.", tab: "mobile" },
  { name: "Jadx", description: "معكوس هندسي لملفات APK إلى كود Java مقروء", tags: ["APK", "Decompile", "Java"], link: "https://github.com/skylot/jadx", badge: "free", category: "أمن الجوال", status: "online", details: "Jadx يُحوّل DEX إلى Java بجودة عالية مع واجهة مرئية سهلة.", tab: "mobile" },
  { name: "APKTool", description: "فك وإعادة بناء تطبيقات Android APK", tags: ["APK", "Smali", "فك"], link: "https://apktool.org", badge: "free", category: "أمن الجوال", status: "online", details: "APKTool يفك ويُعيد بناء APK مع Smali code ويُسهّل التحليل.", tab: "mobile" },
  { name: "Drozer", description: "إطار اختبار أمان Android من الداخل", tags: ["Android", "اختبار داخلي", "Components"], link: "https://github.com/WithSecureLabs/drozer", badge: "free", category: "أمن الجوال", status: "online", details: "Drozer يتفاعل مع Android Components من داخل الجهاز مباشرة.", tab: "mobile" },
  { name: "iMazing", description: "استخراج بيانات وتحليل النسخ الاحتياطية لـ iOS", tags: ["iOS", "نسخ احتياطية", "استخراج"], link: "https://imazing.com", badge: "paid", category: "أمن الجوال", status: "online", details: "iMazing يستخرج بيانات مفصلة من أجهزة iOS والنسخ الاحتياطية.", tab: "mobile" },
  { name: "iFunBox", description: "استكشاف نظام ملفات iOS والتطبيقات", tags: ["iOS", "نظام ملفات", "استكشاف"], link: "https://www.i-funbox.com", badge: "free", category: "أمن الجوال", status: "online", details: "iFunBox يُتيح الوصول لنظام ملفات iOS بدون jailbreak في بعض الحالات.", tab: "mobile" },
  { name: "Android Debug Bridge", description: "التحكم في أجهزة Android عبر ADB", tags: ["ADB", "Android", "تحكم"], link: "https://developer.android.com/studio/command-line/adb", badge: "free", category: "أمن الجوال", status: "online", details: "ADB يُتيح نقل الملفات والوصول للـ shell وتثبيت التطبيقات.", tab: "mobile" },
  { name: "Genymotion", description: "محاكي Android سريع للاختبار والتحليل", tags: ["محاكي", "Android", "اختبار"], link: "https://www.genymotion.com", badge: "free", category: "أمن الجوال", status: "online", details: "Genymotion محاكي Android احترافي مع snapshots وتحكم كامل.", tab: "mobile" },
  { name: "Needle", description: "إطار اختبار أمان iOS من سطر الأوامر", tags: ["iOS", "اختبار", "CLI"], link: "https://github.com/WithSecureLabs/needle", badge: "free", category: "أمن الجوال", status: "online", details: "Needle يُتيح اختبار iOS بمودولات لتحليل الذاكرة والملفات والشبكة.", tab: "mobile" },
  { name: "Ghidra Mobile", description: "تحليل ثنائيات الجوال بـ Ghidra من NSA", tags: ["تحليل ثنائي", "NSA", "Ghidra"], link: "https://github.com/NationalSecurityAgency/ghidra", badge: "free", category: "أمن الجوال", status: "online", details: "Ghidra من NSA مجاني ومفتوح لتحليل الثنائيات بما فيها مكتبات ARM.", tab: "mobile" },
  { name: "QARK", description: "مسح ثابت لتطبيقات Android وكشف الثغرات", tags: ["Android", "ثابت", "ثغرات"], link: "https://github.com/linkedin/qark", badge: "free", category: "أمن الجوال", status: "online", details: "QARK من LinkedIn يُحلّل APK ويكتشف ثغرات أمنية شائعة.", tab: "mobile" },
  { name: "RMS Runtime Mobile Security", description: "تحليل ديناميكي لتطبيقات iOS وAndroid في وقت التشغيل", tags: ["Runtime", "Android", "iOS"], link: "https://github.com/m0bilesecurity/RMS-Runtime-Mobile-Security", badge: "free", category: "أمن الجوال", status: "online", details: "RMS يُسهّل استخدام Frida مع واجهة ويب لتحليل التطبيقات.", tab: "mobile" },
  { name: "Santoku", description: "توزيعة Linux متخصصة لأمن وجنائيات الجوال", tags: ["Linux", "جنائيات", "جوال"], link: "https://santoku-linux.com", badge: "free", category: "أمن الجوال", status: "online", details: "Santoku بيئة متكاملة لأمن وتحليل جنائيات تطبيقات الجوال.", tab: "mobile" },
];

// ─── LEGAL TOOLS ──────────────────────────────────────────
const LEGAL_TOOLS: OsintTool[] = [
  { name: "الوصول غير المصرح به", description: "الوصول إلى بيانات شخصية أو أنظمة خاصة بدون إذن هو جريمة إلكترونية", tags: ["تحذير", "جريمة", "غير قانوني"], link: "#", badge: "legal", category: "تحذير قانوني", status: "offline", details: "هذا النشاط غير قانوني ويحمل عقوبات سجنية وغرامات مالية في معظم الدول.", tab: "legal" },
  { name: "اختبار الاختراق المصرح به", description: "Bug Bounty - الاختبار القانوني مع إذن مسبق من صاحب النظام", tags: ["قانوني", "Bug Bounty", "مصرح"], link: "https://bugcrowd.com", badge: "legal", category: "استخدام قانوني", status: "online", details: "الاختبار المصرح به هو النشاط الوحيد القانوني لاختبار اختراق الأنظمة.", tab: "legal" },
  { name: "حماية النظام الخاص", description: "استخدام الأدوات لفحص وتحليل أمان نظامك الشخصي", tags: ["قانوني", "حماية", "نظام شخصي"], link: "#", badge: "legal", category: "استخدام قانوني", status: "online", details: "مسموح لك باستخدام كل الأدوات لفحص نظامك الخاص أو الأنظمة التي تمتلك إذناً.", tab: "legal" },
  { name: "التحقق من هوية المتصلين", description: "استخدام الأدوات للتحقق من هوية المتصلين المشبوهين", tags: ["قانوني", "تحقق", "هوية"], link: "#", badge: "legal", category: "استخدام قانوني", status: "online", details: "التحقق من هوية المتصلين لحماية نفسك من التصيد الاحتيالي.", tab: "legal" },
  { name: "HackerOne", description: "منصة Bug Bounty الأولى عالمياً للإبلاغ عن الثغرات", tags: ["Bug Bounty", "قانوني", "ثغرات"], link: "https://www.hackerone.com", badge: "legal", category: "استخدام قانوني", status: "online", details: "HackerOne تتيح للباحثين الأمنيين الإبلاغ عن الثغرات ومكافأتهم.", tab: "legal" },
  { name: "Bugcrowd", description: "منصة bug bounty شاملة لبرامج الكشف عن الثغرات المصرح بها", tags: ["Bug Bounty", "ثغرات", "مصرح"], link: "https://www.bugcrowd.com", badge: "legal", category: "استخدام قانوني", status: "online", details: "Bugcrowd تربط الشركات بباحثي الأمن لاكتشاف الثغرات بطريقة قانونية.", tab: "legal" },
  { name: "GDPR & Privacy Laws", description: "فهم قوانين الخصوصية وحماية البيانات عند استخدام OSINT", tags: ["GDPR", "خصوصية", "قوانين"], link: "https://gdpr.eu", badge: "legal", category: "تحذير قانوني", status: "online", details: "GDPR يحظر جمع واستخدام البيانات الشخصية بدون موافقة في أوروبا.", tab: "legal" },
  { name: "Intigriti", description: "منصة Bug Bounty أوروبية للإبلاغ المسؤول عن الثغرات", tags: ["Bug Bounty", "أوروبا", "مسؤول"], link: "https://www.intigriti.com", badge: "legal", category: "استخدام قانوني", status: "online", details: "Intigriti منصة Bug Bounty رائدة في أوروبا مع برامج لمئات الشركات.", tab: "legal" },
];

// ─── FRAMEWORKS ───────────────────────────────────────────
const FRAMEWORKS: Framework[] = [
  { name: "Metasploit",        usage: "اختبار الاختراق والتطوير",                          type: "إطار عمل",           link: "https://www.metasploit.com" },
  { name: "Burp Suite",        usage: "اختبار أمان تطبيقات الويب",                         type: "أداة ويب",           link: "https://portswigger.net/burp" },
  { name: "Nmap",              usage: "فحص الشبكات والمنافذ والخدمات",                     type: "فحص شبكات",          link: "https://nmap.org" },
  { name: "Wireshark",         usage: "تحليل حركة المرور والبروتوكولات",                    type: "تحليل شبكات",        link: "https://www.wireshark.org" },
  { name: "OWASP ZAP",         usage: "اختبار اختراق الويب",                                type: "أمان ويب",           link: "https://www.zaproxy.org" },
  { name: "Kali Linux",        usage: "توزيعة متكاملة للاختبار الأخلاقي",                  type: "نظام تشغيل",         link: "https://www.kali.org" },
  { name: "Nikto",             usage: "فحص ثغرات خوادم الويب",                              type: "فحص ويب",            link: "https://cirt.net/Nikto2" },
  { name: "SQLMap",            usage: "اكتشاف واستغلال ثغرات SQL Injection",               type: "قواعد البيانات",      link: "https://sqlmap.org" },
  { name: "Aircrack-ng",       usage: "اختبار أمان شبكات Wi-Fi",                           type: "أمان لاسلكي",        link: "https://www.aircrack-ng.org" },
  { name: "Hashcat",           usage: "كسر كلمات المرور المشفرة",                          type: "كلمات مرور",         link: "https://hashcat.net" },
  { name: "John the Ripper",   usage: "اختبار قوة كلمات المرور",                           type: "كلمات مرور",         link: "https://www.openwall.com/john" },
  { name: "Volatility",        usage: "تحليل صور الذاكرة الجنائية الرقمية",                type: "جنائيات رقمية",      link: "https://www.volatilityfoundation.org" },
  { name: "Autopsy",           usage: "منصة تحقيق جنائي رقمي مفتوح المصدر",               type: "جنائيات رقمية",      link: "https://www.autopsy.com" },
  { name: "Maltego",           usage: "تحليل العلاقات بين البيانات بشكل مرئي",             type: "تحليل OSINT",        link: "https://www.maltego.com" },
  { name: "SpiderFoot",        usage: "أتمتة جمع معلومات OSINT من 100+ مصدر",             type: "OSINT تلقائي",       link: "https://www.spiderfoot.net" },
  { name: "Shodan",            usage: "البحث في الأجهزة المتصلة بالإنترنت",               type: "استطلاع شبكات",      link: "https://www.shodan.io" },
  { name: "MISP",              usage: "مشاركة مؤشرات التهديد بين المنظمات",               type: "استخبارات تهديد",    link: "https://www.misp-project.org" },
  { name: "OpenCTI",           usage: "إدارة وتصور بيانات استخبارات التهديد",              type: "CTI Platform",       link: "https://www.opencti.io" },
  { name: "TheHive",           usage: "منصة استجابة للحوادث الأمنية",                      type: "SOAR / IR",          link: "https://thehive-project.org" },
  { name: "Cortex",            usage: "تحليل الملاحظات وإثرائها آلياً",                   type: "تحليل أمني",         link: "https://github.com/TheHive-Project/Cortex" },
  { name: "Cobalt Strike",     usage: "محاكاة الهجمات وفرق Red Team",                      type: "Red Team",           link: "https://www.cobaltstrike.com" },
  { name: "Impacket",          usage: "معالجة بروتوكولات Windows الشبكية",                 type: "أدوات شبكة",         link: "https://github.com/SecureAuthCorp/impacket" },
  { name: "BloodHound",        usage: "رسم خريطة AD وتحديد مسارات التصعيد",               type: "Active Directory",   link: "https://github.com/BloodHoundAD/BloodHound" },
  { name: "PowerSploit",       usage: "أدوات PowerShell للاختراق في Windows",              type: "Post-Exploitation",  link: "https://github.com/PowerShellMafia/PowerSploit" },
  { name: "Empire",            usage: "إطار عمل C2 بـ PowerShell وPython",                 type: "Red Team C2",        link: "https://github.com/BC-SECURITY/Empire" },
  { name: "Sliver",            usage: "إطار عمل C2 مفتوح المصدر حديث",                    type: "Red Team C2",        link: "https://github.com/BishopFox/sliver" },
  { name: "Nuclei",            usage: "مسح الثغرات بقوالب YAML سريعة",                    type: "مسح ثغرات",          link: "https://github.com/projectdiscovery/nuclei" },
  { name: "Amass",             usage: "جمع معلومات النطاقات الفرعية",                      type: "OSINT / Recon",      link: "https://github.com/owasp-amass/amass" },
  { name: "Subfinder",         usage: "اكتشاف النطاقات الفرعية بمصادر سلبية",             type: "Recon",              link: "https://github.com/projectdiscovery/subfinder" },
  { name: "Burp Suite Pro",    usage: "اختبار اختراق ويب احترافي متقدم",                   type: "Web Pentesting",     link: "https://portswigger.net/burp/pro" },
  { name: "Frida",             usage: "Dynamic Instrumentation وتحليل التطبيقات الحية",    type: "Mobile / Runtime",   link: "https://frida.re" },
  { name: "MobSF",             usage: "تحليل أمان تطبيقات Android وiOS",                  type: "Mobile Security",    link: "https://github.com/MobSF/Mobile-Security-Framework-MobSF" },
  { name: "Ghidra",            usage: "تحليل ثنائيات وهندسة عكسية",                        type: "Reverse Engineering", link: "https://ghidra-sre.org" },
  { name: "IDA Pro",           usage: "تحليل ثنائيات احترافي ومتقدم",                      type: "Reverse Engineering", link: "https://hex-rays.com/ida-pro" },
  { name: "Radare2",           usage: "تحليل ثنائيات مفتوح المصدر",                        type: "Reverse Engineering", link: "https://www.radare.org" },
  { name: "YARA",              usage: "تصنيف البرمجيات الضارة بقواعد مخصصة",              type: "Malware Analysis",   link: "https://virustotal.github.io/yara" },
  { name: "Tails OS",          usage: "نظام تشغيل مجهولية لا يترك أثراً",                 type: "OPSEC / Privacy",    link: "https://tails.boum.org" },
  { name: "VeraCrypt",         usage: "تشفير الأقراص والملفات بمعايير عسكرية",             type: "Encryption",         link: "https://www.veracrypt.fr" },
  { name: "Pacu",              usage: "اختبار اختراق AWS وبيئات السحابة",                  type: "Cloud Pentesting",   link: "https://github.com/RhinoSecurityLabs/pacu" },
  { name: "Prowler",           usage: "مسح أمني شامل لـ AWS مع 300+ فحص",                 type: "Cloud Security",     link: "https://github.com/prowler-cloud/prowler" },
  { name: "Trivy",             usage: "فحص الثغرات في Docker وKubernetes",                 type: "Container Security", link: "https://github.com/aquasecurity/trivy" },
  { name: "Drozer",            usage: "اختبار أمان تطبيقات Android",                       type: "Mobile Pentesting",  link: "https://github.com/WithSecureLabs/drozer" },
  { name: "Responder",         usage: "اعتراض بيانات الاعتماد عبر LLMNR Poisoning",       type: "Network Attack",     link: "https://github.com/lgandx/Responder" },
  { name: "CrackMapExec",      usage: "أتمتة هجمات Active Directory وSMB",                  type: "Post-Exploitation",  link: "https://github.com/Porchetta-Industries/CrackMapExec" },
  { name: "Mimikatz",          usage: "استخراج بيانات الاعتماد من ذاكرة Windows",          type: "Credential Access",  link: "https://github.com/gentilkiwi/mimikatz" },
  { name: "Havoc C2",          usage: "إطار C2 متقدم مفتوح المصدر",                        type: "Red Team C2",        link: "https://github.com/HavocFramework/Havoc" },
  { name: "Kerbrute",          usage: "هجمات Kerberos واستعلام حسابات AD",                 type: "Active Directory",   link: "https://github.com/ropnop/kerbrute" },
  { name: "Caido",             usage: "أداة اختبار اختراق ويب حديثة",                      type: "Web Pentesting",     link: "https://caido.io" },
  { name: "ffuf",              usage: "فازينج سريع للويب والـ API",                         type: "Web Fuzzing",        link: "https://github.com/ffuf/ffuf" },
  { name: "SQLMap",            usage: "اكتشاف واستغلال SQL Injection آلياً",                type: "SQLi Scanner",       link: "https://sqlmap.org" },
  { name: "Censys",            usage: "فحص البنية التحتية للإنترنت والشهادات",              type: "OSINT / Recon",      link: "https://censys.io" },
];

const ALL_TOOLS: OsintTool[] = [
  ...SEARCH_TOOLS, ...DATABASE_TOOLS, ...PHONE_TOOLS, ...EMAIL_TOOLS,
  ...USERNAME_TOOLS, ...RECON_TOOLS, ...LEGAL_TOOLS,
  ...DARKWEB_TOOLS, ...SOCIAL_TOOLS, ...THREATINTEL_TOOLS,
  ...GEO_TOOLS, ...MALWARE_TOOLS, ...NETWORK_TOOLS,
  ...CRYPTO_TOOLS, ...IMAGEOSINT_TOOLS,
  ...VULN_TOOLS, ...PASSWORD_TOOLS, ...DNS_TOOLS,
  ...API_TOOLS, ...IOT_TOOLS, ...FORENSICS_TOOLS,
  ...OPSEC_TOOLS, ...REDTEAM_TOOLS, ...CLOUD_TOOLS,
  ...WEBAPP_TOOLS, ...MOBILE_TOOLS,
];

// ─── Tab Config ──────────────────────────────────────────
const TABS: { id: TabId; label: string; icon: React.ReactNode; color?: string }[] = [
  { id: "all",         label: "الكل",              icon: <Globe size={13} /> },
  { id: "scanner",     label: "الماسح الحي",        icon: <Terminal size={13} />, color: "from-violet-600 to-pink-600" },
  { id: "search",      label: "أنظمة البحث",        icon: <Search size={13} /> },
  { id: "databases",   label: "قواعد البيانات",     icon: <Database size={13} /> },
  { id: "recon",       label: "جمع المعلومات",      icon: <Crosshair size={13} /> },
  { id: "network",     label: "الشبكات",            icon: <Network size={13} /> },
  { id: "threatintel", label: "استخبارات التهديد",  icon: <Shield size={13} />, color: "from-red-600 to-orange-600" },
  { id: "malware",     label: "تحليل برمجيات ضارة", icon: <Bug size={13} /> },
  { id: "vuln",        label: "الثغرات الأمنية",    icon: <Scan size={13} />, color: "from-orange-600 to-red-700" },
  { id: "darkweb",     label: "الويب المظلم",       icon: <Eye size={13} />, color: "from-slate-700 to-slate-900" },
  { id: "social",      label: "التواصل الاجتماعي",  icon: <Radio size={13} /> },
  { id: "geo",         label: "OSINT جغرافي",       icon: <MapPin size={13} /> },
  { id: "imageosint",  label: "OSINT الصور",        icon: <Camera size={13} /> },
  { id: "crypto",      label: "البلوكتشين",         icon: <Bitcoin size={13} /> },
  { id: "phone",       label: "أدوات الهاتف",       icon: <Phone size={13} /> },
  { id: "email",       label: "أدوات البريد",       icon: <Mail size={13} /> },
  { id: "username",    label: "البحث بالاسم",       icon: <User size={13} /> },
  { id: "password",    label: "بيانات الاعتماد",    icon: <Key size={13} /> },
  { id: "dns",         label: "أدوات DNS",          icon: <Server size={13} /> },
  { id: "api",         label: "أمن API",            icon: <Code size={13} /> },
  { id: "iot",         label: "OSINT الأجهزة",      icon: <Cpu size={13} /> },
  { id: "forensics",   label: "جنائيات رقمية",      icon: <Fingerprint size={13} /> },
  { id: "opsec",       label: "OPSEC & مجهولية",    icon: <Lock size={13} />, color: "from-teal-700 to-cyan-700" },
  { id: "redteam",     label: "Red Team",            icon: <Siren size={13} />, color: "from-red-800 to-rose-700" },
  { id: "cloud",       label: "أمن السحابة",         icon: <Monitor size={13} />, color: "from-sky-700 to-blue-700" },
  { id: "webapp",      label: "أمن الويب",           icon: <Globe size={13} /> },
  { id: "mobile",      label: "أمن الجوال",          icon: <Phone size={13} /> },
  { id: "frameworks",  label: "أطر العمل",          icon: <Layers size={13} /> },
  { id: "legal",       label: "التحذيرات",          icon: <Scale size={13} /> },
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
      whileHover={{ y: -3 }}
      className={`relative rounded-xl border p-4 cursor-pointer transition-all duration-200 group
        ${isDanger(tool)
          ? "bg-red-900/10 border-red-500/20 hover:border-red-500/50 hover:shadow-[0_8px_24px_rgba(239,68,68,0.15)]"
          : "bg-[#161616] border-[#1f1f1f] hover:border-sky-500/50 hover:shadow-[0_8px_24px_rgba(14,165,233,0.15)]"
        }`}
      onClick={() => onSelect(tool)}
    >
      <div className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-xl opacity-0 group-hover:opacity-100 transition-opacity
        ${isDanger(tool) ? "bg-gradient-to-r from-red-500 to-orange-500" : "bg-gradient-to-r from-sky-500 to-violet-500"}`}
      />
      <div className="flex items-start justify-between mb-2">
        <span className="font-bold text-white text-sm">{tool.name}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${badgeStyle(tool.badge)}`}>{badgeLabel(tool.badge)}</span>
      </div>
      <p className="text-[#94a3b8] text-xs mb-3 leading-relaxed line-clamp-2">{tool.description}</p>
      <div className="flex flex-wrap gap-1 mb-3">
        {tool.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[#94a3b8]">{tag}</span>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-[#1f1f1f]">
        <a
          href={tool.link !== "#" ? tool.link : undefined}
          target={tool.link !== "#" ? "_blank" : undefined}
          rel="noopener noreferrer"
          onClick={e => { if (tool.link === "#") e.preventDefault(); e.stopPropagation(); }}
          className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-gradient-to-r from-sky-600 to-violet-600 hover:from-sky-500 hover:to-violet-500 text-white font-semibold transition-all"
        >
          <ExternalLink size={10} /> زيارة
        </a>
        <div className={`flex items-center gap-1 text-[10px] ${tool.status === "online" ? "text-emerald-400" : "text-red-400"}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${tool.status === "online" ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
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
    navigator.clipboard.writeText(tool.link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }, [tool.link]);
  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm" onClick={onClose}>
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
          className="bg-[#161616] border border-[#262626] rounded-2xl max-w-lg w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent">{tool.name}</h3>
            <button onClick={onClose} className="text-[#94a3b8] hover:text-red-400 transition-colors"><X size={20} /></button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {tool.tags.map(tag => <span key={tag} className="text-xs px-2 py-0.5 rounded bg-white/5 text-[#94a3b8]">{tag}</span>)}
          </div>
          <p className="text-[#94a3b8] text-sm leading-relaxed mb-3">{tool.description}</p>
          <p className="text-[#94a3b8] text-sm leading-relaxed mb-4">{tool.details}</p>
          <div className="flex items-center gap-2 bg-[#0d0d0d] border border-[#1f1f1f] rounded-lg p-3 mb-4">
            <span className="text-sky-400 text-sm font-mono flex-1 truncate">{tool.link}</span>
            <button onClick={copyLink} className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-md transition-all ${copied ? "bg-emerald-500/20 text-emerald-400" : "bg-[#262626] text-[#94a3b8] hover:bg-sky-500/20 hover:text-sky-400"}`}>
              {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
              {copied ? "تم النسخ!" : "نسخ"}
            </button>
          </div>
          {tool.link !== "#" && (
            <a href={tool.link} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 hover:from-sky-500 hover:to-violet-500 text-white font-semibold text-sm transition-all">
              <ExternalLink size={14} /> فتح الموقع في نافذة جديدة
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
            <motion.tr key={f.name} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
              className="border-t border-[#1f1f1f] hover:bg-white/[0.02] transition-colors">
              <td className="p-3 font-bold text-white">{f.name}</td>
              <td className="p-3 text-[#94a3b8] text-xs">{f.usage}</td>
              <td className="p-3"><span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">{f.type}</span></td>
              <td className="p-3">
                <a href={f.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors text-xs">
                  <ExternalLink size={10} /> الرابط
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
    { icon: <Search size={16} />, value: `${ALL_TOOLS.length}+`, label: "أداة ونظام",      color: "text-sky-400" },
    { icon: <Filter size={16} />, value: "27",                    label: "فئة متخصصة",      color: "text-violet-400" },
    { icon: <Globe size={16} />,  value: `${FRAMEWORKS.length}`,  label: "إطار عمل",        color: "text-emerald-400" },
    { icon: <Shield size={16} />, value: "100%",                   label: "أخلاقي وقانوني",  color: "text-amber-400" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
      {stats.map((s, i) => (
        <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
          className="bg-[#161616] border border-[#1f1f1f] rounded-xl p-3 text-center">
          <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
          <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
          <div className="text-[10px] text-[#94a3b8] mt-0.5">{s.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── LIVE OSINT SCANNER ───────────────────────────────────
type ScanModule =
  | "dns" | "crt" | "whois" | "wayback" | "vt" | "shodan"
  | "geo" | "hibp" | "subdomains" | "asn" | "reverseip"
  | "emailrep" | "threatfeed" | "greynoise" | "pastebin"
  | "social" | "github" | "certTransparency" | "passiveDns"
  | "urlscan" | "leakix" | "abuseipdb" | "securityheaders"
  | "dnssec" | "portscan" | "reversedns" | "bgpview"
  | "techdetect" | "internetdb" | "ipqs" | "censys";

interface ScanResult {
  id: ScanModule;
  label: string;
  status: "idle" | "loading" | "done" | "error";
  data?: unknown;
  error?: string;
}

interface ModuleGroup {
  label: string;
  color: string;
  modules: { id: ScanModule; label: string; icon: React.ReactNode; forTypes: ("domain" | "ip" | "email" | "username" | "any")[] }[];
}

const MODULE_GROUPS: ModuleGroup[] = [
  {
    label: "الأساسيات",
    color: "#3b82f6",
    modules: [
      { id: "dns",              label: "DNS Lookup",         icon: <Server size={11} />,      forTypes: ["domain", "any"] },
      { id: "whois",            label: "WHOIS / RDAP",        icon: <FileText size={11} />,    forTypes: ["domain", "any"] },
      { id: "crt",              label: "SSL Certs",           icon: <Lock size={11} />,        forTypes: ["domain", "any"] },
      { id: "certTransparency", label: "Cert Transparency",   icon: <Hash size={11} />,        forTypes: ["domain", "any"] },
      { id: "subdomains",       label: "Subdomains",          icon: <Network size={11} />,     forTypes: ["domain", "any"] },
      { id: "dnssec",           label: "DNSSEC Check",        icon: <Lock size={11} />,        forTypes: ["domain", "any"] },
    ],
  },
  {
    label: "IP وشبكات",
    color: "#a78bfa",
    modules: [
      { id: "geo",              label: "IP Geolocation",      icon: <MapPin size={11} />,      forTypes: ["ip", "any"] },
      { id: "shodan",           label: "Shodan",              icon: <Wifi size={11} />,        forTypes: ["ip", "domain", "any"] },
      { id: "censys",           label: "Censys",              icon: <Database size={11} />,    forTypes: ["ip", "domain", "any"] },
      { id: "asn",              label: "ASN / BGP",           icon: <TrendingUp size={11} />,  forTypes: ["ip", "domain", "any"] },
      { id: "reverseip",        label: "Reverse IP",          icon: <Cpu size={11} />,         forTypes: ["ip"] },
      { id: "greynoise",        label: "GreyNoise",           icon: <Activity size={11} />,    forTypes: ["ip"] },
      { id: "portscan",         label: "Port Scan",           icon: <Scan size={11} />,        forTypes: ["ip", "domain"] },
      { id: "bgpview",          label: "BGP View",            icon: <GitBranch size={11} />,   forTypes: ["ip", "any"] },
      { id: "reversedns",       label: "Reverse DNS",         icon: <Hash size={11} />,        forTypes: ["ip"] },
      { id: "internetdb",       label: "Shodan InternetDB",   icon: <Server size={11} />,      forTypes: ["ip"] },
      { id: "ipqs",             label: "IP Quality Score",    icon: <Radar size={11} />,       forTypes: ["ip"] },
    ],
  },
  {
    label: "تهديدات ومعلومات",
    color: "#ef4444",
    modules: [
      { id: "vt",               label: "VirusTotal",          icon: <Shield size={11} />,      forTypes: ["domain", "ip", "any"] },
      { id: "threatfeed",       label: "Threat Feeds",        icon: <AlertTriangle size={11} />, forTypes: ["domain", "ip", "email", "any"] },
      { id: "abuseipdb",        label: "AbuseIPDB",           icon: <Siren size={11} />,       forTypes: ["ip"] },
      { id: "leakix",           label: "LeakIX",              icon: <Database size={11} />,    forTypes: ["domain", "ip", "any"] },
      { id: "urlscan",          label: "URLScan.io",          icon: <Monitor size={11} />,     forTypes: ["domain", "any"] },
      { id: "pastebin",         label: "Paste Search",        icon: <Bookmark size={11} />,    forTypes: ["any"] },
      { id: "wayback",          label: "Wayback Machine",     icon: <Clock size={11} />,       forTypes: ["domain", "any"] },
      { id: "passiveDns",       label: "Passive DNS",         icon: <Globe size={11} />,       forTypes: ["domain", "any"] },
    ],
  },
  {
    label: "بريد ومستخدمون",
    color: "#10b981",
    modules: [
      { id: "hibp",             label: "HIBP Breach Check",   icon: <AlertTriangle size={11} />, forTypes: ["email"] },
      { id: "emailrep",         label: "Email Reputation",    icon: <Mail size={11} />,        forTypes: ["email"] },
      { id: "social",           label: "Social Presence",     icon: <Radio size={11} />,       forTypes: ["username", "any"] },
      { id: "github",           label: "GitHub Recon",        icon: <Github size={11} />,      forTypes: ["any"] },
      { id: "securityheaders",  label: "Security Headers",    icon: <Radar size={11} />,       forTypes: ["domain", "any"] },
      { id: "techdetect",       label: "Tech Detection",      icon: <Code size={11} />,        forTypes: ["domain", "any"] },
    ],
  },
];

const ALL_MODULES = MODULE_GROUPS.flatMap(g => g.modules);

function LiveScanner() {
  const [target, setTarget]   = useState("");
  const [scanType, setScanType] = useState<"domain" | "ip" | "email" | "username" | "any">("any");
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [aiReport, setAiReport] = useState("");
  const [selectedModules, setSelectedModules] = useState<Set<ScanModule>>(
    new Set(["dns", "crt", "whois", "wayback", "vt", "geo", "subdomains", "asn", "abuseipdb", "urlscan"])
  );
  const [expandedId, setExpandedId] = useState<ScanModule | null>(null);
  const [showModules, setShowModules] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

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

  const selectGroup = (group: ModuleGroup) => {
    setSelectedModules(prev => {
      const next = new Set(prev);
      const ids = group.modules.map(m => m.id);
      const allOn = ids.every(id => next.has(id));
      if (allOn) ids.forEach(id => next.delete(id)); else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const autoDetectType = (val: string) => {
    if (/^\d+\.\d+\.\d+\.\d+$/.test(val)) setScanType("ip");
    else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) setScanType("email");
    else if (/^[a-z0-9-]+\.[a-z]{2,}$/i.test(val)) setScanType("domain");
    else setScanType("any");
  };

  const startScan = useCallback(async () => {
    if (!target.trim() || running) return;
    setRunning(true);
    setAiReport("");
    setExpandedId(null);
    setHistory(prev => [target.trim(), ...prev.filter(h => h !== target.trim())].slice(0, 10));
    const mods = [...selectedModules];
    setResults(mods.map(id => ({
      id,
      label: ALL_MODULES.find(m => m.id === id)?.label ?? id,
      status: "loading" as const,
    })));

    try {
      const res = await fetch(`${apiBase}/api/osint-advanced/scan/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: target.trim(), modules: mods, scanType }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

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
              const hasError = payload.error && !payload.data;
              setResults(prev => prev.map(r =>
                r.id === payload.id
                  ? { ...r, status: hasError ? "error" : "done", data: payload.data, error: payload.error }
                  : r
              ));
            }
            if (payload.analysis) setAiReport(payload.analysis);
          } catch { /* skip malformed SSE */ }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setResults(prev => prev.map(r => r.status === "loading" ? { ...r, status: "error", error: msg } : r));
    } finally {
      setRunning(false);
    }
  }, [target, running, selectedModules, apiBase, scanType]);

  const statusIcon = (s: ScanResult["status"]) => {
    if (s === "loading") return <RefreshCw size={12} className="animate-spin text-sky-400" />;
    if (s === "done")    return <CheckCircle size={12} className="text-emerald-400" />;
    if (s === "error")   return <XCircle size={12} className="text-red-400" />;
    return <Clock size={12} className="text-[#555]" />;
  };

  const copyReport = () => {
    const text = results.map(r =>
      `=== ${r.label} ===\n${r.status === "done" ? JSON.stringify(r.data, null, 2) : r.error ?? "pending"}`
    ).join("\n\n") + (aiReport ? `\n\n=== AI Analysis ===\n${aiReport}` : "");
    navigator.clipboard.writeText(text);
  };

  const [generatingReport, setGeneratingReport] = useState(false);
  const [fullReport, setFullReport] = useState("");

  const generateFullReport = useCallback(async () => {
    if (!target || results.length === 0) return;
    setGeneratingReport(true);
    try {
      const allData = Object.fromEntries(results.filter(r => r.status === "done").map(r => [r.id, r.data]));
      const res = await fetch(`${apiBase}/api/osint-advanced/report/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, results: allData, analysis: aiReport }),
      });
      if (res.ok) {
        const data = await res.json() as { report?: string };
        if (data.report) setFullReport(data.report);
      }
    } catch { /* ignore */ } finally {
      setGeneratingReport(false);
    }
  }, [target, results, aiReport, apiBase]);

  const done   = results.filter(r => r.status === "done").length;
  const errors = results.filter(r => r.status === "error").length;
  const total  = results.length;
  const pct    = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Warning */}
      <div className="flex gap-2 items-start bg-amber-900/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
        <span>يُرجى استخدام هذا الماسح فقط على النطاقات/عناوين IP التي تملكها أو لديك إذن صريح لفحصها.</span>
      </div>

      {/* Scan type badges */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-[10px] text-[#555] self-center">نوع الهدف:</span>
        {(["any","domain","ip","email","username"] as const).map(t => (
          <button key={t} onClick={() => setScanType(t)}
            className={`text-[10px] px-2.5 py-1 rounded-lg border font-bold transition-all ${scanType === t ? "bg-sky-600/20 border-sky-500/50 text-sky-300" : "bg-transparent border-[#1f1f1f] text-[#555] hover:text-[#94a3b8]"}`}>
            {t === "any" ? "عام" : t === "domain" ? "نطاق" : t === "ip" ? "عنوان IP" : t === "email" ? "بريد إلكتروني" : "اسم مستخدم"}
          </button>
        ))}
      </div>

      {/* Input + Scan button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input type="text" value={target}
            onChange={e => { setTarget(e.target.value); autoDetectType(e.target.value); }}
            onKeyDown={e => e.key === "Enter" && startScan()}
            placeholder="نطاق، عنوان IP، بريد، مستخدم... (مثال: example.com)"
            className="w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#555] focus:outline-none focus:border-sky-500/60 transition-colors"
            dir="ltr" />
          {history.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-[#161616] border border-[#1f1f1f] rounded-xl overflow-hidden z-10 hidden group-focus-within:block">
              {history.map(h => (
                <button key={h} className="w-full text-left px-4 py-1.5 text-xs text-[#94a3b8] hover:bg-white/5" onClick={() => { setTarget(h); autoDetectType(h); }}>
                  {h}
                </button>
              ))}
            </div>
          )}
        </div>
        <button onClick={startScan} disabled={running || !target.trim()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-violet-600 hover:from-sky-500 hover:to-violet-500 text-white font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
          {running ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
          {running ? `جارٍ الفحص... ${pct}%` : "ابدأ الفحص"}
        </button>
      </div>

      {/* Module selector */}
      <div>
        <button onClick={() => setShowModules(!showModules)}
          className="flex items-center gap-2 text-xs text-[#94a3b8] hover:text-white transition-colors mb-2">
          {showModules ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          تخصيص الوحدات ({selectedModules.size} من {ALL_MODULES.length} محددة)
        </button>
        <AnimatePresence>
          {showModules && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden">
              <div className="space-y-3 pb-2 border border-[#1f1f1f] rounded-xl p-3 bg-[#0d0d0d]">
                <div className="flex gap-2 mb-2">
                  <button onClick={() => setSelectedModules(new Set(ALL_MODULES.map(m => m.id)))}
                    className="text-[10px] px-2 py-0.5 rounded bg-sky-600/20 text-sky-400 border border-sky-500/30">تحديد الكل</button>
                  <button onClick={() => setSelectedModules(new Set())}
                    className="text-[10px] px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">إلغاء الكل</button>
                </div>
                {MODULE_GROUPS.map(group => (
                  <div key={group.label}>
                    <button onClick={() => selectGroup(group)}
                      className="flex items-center gap-2 text-[10px] font-bold mb-1.5 opacity-70 hover:opacity-100"
                      style={{ color: group.color }}>
                      <span className="w-2 h-2 rounded-full" style={{ background: group.color }} />
                      {group.label}
                    </button>
                    <div className="flex flex-wrap gap-1.5">
                      {group.modules.map(m => (
                        <button key={m.id} onClick={() => toggleModule(m.id)}
                          className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                            selectedModules.has(m.id)
                              ? "text-white border-transparent"
                              : "bg-[#161616] border-[#1f1f1f] text-[#555]"
                          }`}
                          style={selectedModules.has(m.id) ? { background: group.color + "30", borderColor: group.color + "60", color: group.color } : undefined}>
                          {m.icon} {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Progress Bar */}
      {total > 0 && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-[#94a3b8]">{done}/{total} اكتملت {running && <span className="text-sky-400">({pct}%)</span>}</span>
            {errors > 0 && <span className="text-red-400">{errors} أخطاء</span>}
            {!running && done > 0 && <span className="text-emerald-400">✓ اكتمل الفحص</span>}
          </div>
          <div className="w-full h-1.5 bg-[#1f1f1f] rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-sky-500 to-violet-500 rounded-full"
              animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94a3b8]">نتائج: <span className="text-sky-400 font-mono">{target}</span></span>
            {!running && (
              <button onClick={copyReport} className="flex items-center gap-1.5 text-xs text-[#555] hover:text-white transition-colors">
                <Download size={11} /> تصدير التقرير
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {results.map(r => (
              <div key={r.id} className="bg-[#0d0d0d] border border-[#1f1f1f] rounded-xl overflow-hidden">
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}>
                  {statusIcon(r.status)}
                  <span className={`font-semibold flex-1 text-left text-xs ${r.status === "done" ? "text-white" : r.status === "error" ? "text-red-400" : "text-[#94a3b8]"}`}>
                    {r.label}
                  </span>
                  {r.status === "done" && <span className="text-[10px] text-emerald-400">✓ مكتمل</span>}
                  {r.status === "error" && <span className="text-[10px] text-red-400">✗ خطأ</span>}
                  {r.status === "loading" && <RefreshCw size={10} className="text-sky-400 animate-spin" />}
                  {(r.status === "done" || r.status === "error") && (expandedId === r.id ? <ChevronUp size={12} className="text-[#555]" /> : <ChevronDown size={12} className="text-[#555]" />)}
                </button>
                <AnimatePresence>
                  {expandedId === r.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="border-t border-[#1f1f1f] p-4">
                        {r.status === "error"
                          ? <p className="text-red-400 text-xs font-mono">{r.error}</p>
                          : <pre className="text-xs text-[#94a3b8] font-mono overflow-x-auto whitespace-pre-wrap max-h-60 scrollbar-thin">{JSON.stringify(r.data, null, 2)}</pre>}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* AI Report */}
          {aiReport && (
            <div className="bg-violet-900/10 border border-violet-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap size={13} className="text-violet-400" />
                  <span className="text-violet-400 font-semibold text-sm">تحليل الذكاء الاصطناعي</span>
                </div>
                {!running && (
                  <button onClick={generateFullReport} disabled={generatingReport}
                    className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-500 hover:to-pink-500 text-white font-semibold transition-all disabled:opacity-50">
                    {generatingReport ? <RefreshCw size={10} className="animate-spin" /> : <FileText size={10} />}
                    {generatingReport ? "جارٍ التوليد..." : "توليد تقرير PDF"}
                  </button>
                )}
              </div>
              <p className="text-[#94a3b8] text-xs leading-relaxed whitespace-pre-wrap">{aiReport}</p>
            </div>
          )}

          {/* Full Report */}
          {fullReport && (
            <div className="bg-emerald-900/10 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText size={13} className="text-emerald-400" />
                  <span className="text-emerald-400 font-semibold text-sm">التقرير الشامل</span>
                </div>
                <button onClick={() => navigator.clipboard.writeText(fullReport)}
                  className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 transition-all">
                  <Copy size={10} /> نسخ التقرير
                </button>
              </div>
              <pre className="text-xs text-[#94a3b8] font-mono overflow-x-auto whitespace-pre-wrap max-h-80 scrollbar-thin">{fullReport}</pre>
            </div>
          )}
        </div>
      )}

      {results.length === 0 && (
        <div className="text-center py-16 text-[#555]">
          <Terminal size={40} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm font-semibold mb-1">الماسح الحي جاهز</p>
          <p className="text-xs opacity-60 mb-4">أدخل هدفاً وابدأ الفحص الشامل</p>
          <div className="flex flex-wrap justify-center gap-2">
            {["example.com", "8.8.8.8", "user@email.com", "username123"].map(ex => (
              <button key={ex} onClick={() => { setTarget(ex); autoDetectType(ex); }}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-[#161616] border border-[#1f1f1f] text-[#555] hover:text-sky-400 hover:border-sky-500/30 transition-all font-mono">
                {ex}
              </button>
            ))}
          </div>
          <p className="text-[10px] mt-3 opacity-40">النطاقات · عناوين IP · البريد الإلكتروني · أسماء المستخدمين</p>
        </div>
      )}

      {/* Scan History */}
      {history.length > 0 && results.length === 0 && (
        <div>
          <p className="text-[10px] text-[#555] mb-2">السجل الأخير:</p>
          <div className="flex flex-wrap gap-1.5">
            {history.map(h => (
              <button key={h} onClick={() => { setTarget(h); autoDetectType(h); }}
                className="text-[10px] px-2 py-0.5 rounded bg-[#161616] border border-[#1f1f1f] text-[#555] hover:text-white font-mono transition-all">
                {h}
              </button>
            ))}
          </div>
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
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") { if (selected) setSelected(null); else onClose(); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, selected]);

  // Focus search on Ctrl+F
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") { e.preventDefault(); searchRef.current?.focus(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const toolsByTab = useMemo<Record<Exclude<TabId, "scanner">, OsintTool[]>>(() => ({
    all:        ALL_TOOLS,
    search:     SEARCH_TOOLS,
    databases:  DATABASE_TOOLS,
    phone:      PHONE_TOOLS,
    email:      EMAIL_TOOLS,
    username:   USERNAME_TOOLS,
    frameworks: [],
    recon:      RECON_TOOLS,
    legal:      LEGAL_TOOLS,
    darkweb:    DARKWEB_TOOLS,
    social:     SOCIAL_TOOLS,
    threatintel:THREATINTEL_TOOLS,
    geo:        GEO_TOOLS,
    malware:    MALWARE_TOOLS,
    network:    NETWORK_TOOLS,
    crypto:     CRYPTO_TOOLS,
    imageosint: IMAGEOSINT_TOOLS,
    vuln:       VULN_TOOLS,
    password:   PASSWORD_TOOLS,
    dns:        DNS_TOOLS,
    api:        API_TOOLS,
    iot:        IOT_TOOLS,
    forensics:  FORENSICS_TOOLS,
    opsec:      OPSEC_TOOLS,
    redteam:    REDTEAM_TOOLS,
    cloud:      CLOUD_TOOLS,
    webapp:     WEBAPP_TOOLS,
    mobile:     MOBILE_TOOLS,
  }), []);

  const displayTools = useMemo(() => {
    if (activeTab === "scanner" || activeTab === "frameworks") return [];
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
      {/* Header */}
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
          {/* Search */}
          <div className="relative">
            <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#555]" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); if (e.target.value && activeTab !== "all") setActiveTab("all"); }}
              placeholder="بحث... (Ctrl+F)"
              className="bg-[#161616] border border-[#1f1f1f] rounded-lg pr-8 pl-3 py-1.5 text-xs text-white placeholder-[#555] focus:outline-none focus:border-sky-500/60 w-44"
              dir="rtl"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute left-2 top-1/2 -translate-y-1/2 text-[#555] hover:text-white">
                <X size={10} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {ALL_TOOLS.length}+ أداة
          </div>
          <button onClick={onClose} className="text-[#94a3b8] hover:text-red-400 transition-colors p-1">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-5 min-h-0">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-5">
          <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-violet-400 bg-clip-text text-transparent mb-1">
            مركز أدوات OSINT والأمن السيبراني
          </h1>
          <p className="text-[#94a3b8] text-sm">
            دليل شامل بأقوى الأدوات في مجال الاستخبارات المفتوحة المصادر والأمن السيبراني — {ALL_TOOLS.length}+ أداة في {TABS.length - 3} فئة · {FRAMEWORKS.length} إطار عمل
          </p>
        </motion.div>

        {/* Legal Warning */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          className="flex items-start gap-3 bg-red-900/10 border border-red-500/20 rounded-xl p-4 mb-5 text-sm">
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-400 mb-1">⚖️ تحذيرات قانونية وأخلاقية مهمة</p>
            <ul className="text-[#94a3b8] text-xs space-y-1">
              <li>• الوصول غير المصرح به إلى بيانات شخصية أو أنظمة خاصة <strong className="text-red-400">جريمة إلكترونية</strong> في معظم الدول</li>
              <li>• استخدم هذه الأدوات فقط في اختبار الاختراق المصرح به (Bug Bounty) أو البحث عن معلوماتك الشخصية</li>
              <li>• يجب استخدام هذه الأدوات فقط للأغراض الأخلاقية والقانونية المشروعة</li>
            </ul>
          </div>
        </motion.div>

        <StatsBar />

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5 flex-wrap">
          {TABS.map(tab => (
            <button key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(""); }}
              className={`flex items-center gap-1.5 text-[11px] px-3 py-1.5 rounded-lg border font-semibold transition-all ${
                activeTab === tab.id
                  ? tab.color
                    ? `bg-gradient-to-r ${tab.color} text-white border-transparent`
                    : "bg-gradient-to-r from-sky-600 to-violet-600 text-white border-transparent"
                  : "bg-[#161616] border-[#1f1f1f] text-[#94a3b8] hover:text-white hover:border-[#333]"
              }`}>
              {tab.icon} {tab.label}
              {tab.id !== "all" && tab.id !== "scanner" && tab.id !== "frameworks" && toolsByTab[tab.id]?.length > 0 && (
                <span className={`text-[9px] rounded-full px-1 ${activeTab === tab.id ? "bg-white/20" : "bg-[#333] text-[#555]"}`}>
                  {toolsByTab[tab.id].length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search results indicator */}
        {search && (
          <div className="mb-4 flex items-center gap-2 text-xs text-[#94a3b8]">
            <Search size={12} />
            <span>نتائج البحث عن "<span className="text-sky-400">{search}</span>": {displayTools.length} نتيجة</span>
            <button onClick={() => setSearch("")} className="text-[#555] hover:text-red-400 transition-colors">✕ مسح</button>
          </div>
        )}

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === "scanner" ? (
            <motion.div key="scanner" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <LiveScanner />
            </motion.div>
          ) : activeTab === "frameworks" ? (
            <motion.div key="frameworks" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="mb-3 flex items-center gap-2">
                <Layers size={16} className="text-sky-400" />
                <span className="text-sm font-semibold text-white">أطر العمل والأدوات الأمنية المتكاملة</span>
                <span className="text-[10px] text-[#555]">({FRAMEWORKS.length} إطار)</span>
              </div>
              <FrameworksTable frameworks={FRAMEWORKS} />
            </motion.div>
          ) : (
            <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {displayTools.length === 0 ? (
                <div className="text-center py-16 text-[#555]">
                  <Search size={32} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">لا توجد نتائج للبحث</p>
                  <button onClick={() => setSearch("")} className="text-xs mt-2 text-sky-400 hover:text-sky-300">مسح البحث</button>
                </div>
              ) : (
                <>
                  {activeTab === "all" && !search && (
                    <div className="mb-3 flex items-center gap-2">
                      <Globe size={14} className="text-sky-400" />
                      <span className="text-xs text-[#94a3b8]">جميع الأدوات ({ALL_TOOLS.length} أداة)</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {displayTools.map((tool, i) => (
                      <ToolCard key={`${tool.name}-${tool.tab}-${i}`} tool={tool} onSelect={setSelected} />
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tool Detail Modal */}
      {selected && <ToolDetailModal tool={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
