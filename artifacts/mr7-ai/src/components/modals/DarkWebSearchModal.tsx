import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Globe, Shield, Eye, AlertTriangle, Terminal, Copy, CheckCheck,
  Zap, Lock, Network, Database, Activity, Target, Crosshair, Radio,
  FileSearch, Hash, Mail, Smartphone, User, Server, Wifi, Key,
  ChevronRight, ExternalLink, Bug, Cpu, ArrowRight, Layers,
  Download, MessageSquare, RefreshCw, CheckCircle, XCircle, AlertCircle,
  ChevronDown, ChevronUp, Link, Clock, FileText, Boxes, ShieldCheck,
  ShieldAlert, History, Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onInjectToChat: (text: string) => void;
}

type Tab = "tor" | "osint" | "threats" | "shodan" | "darkweb";
type OsintType = "email" | "ip" | "domain" | "hash" | "username" | "phone" | "url";
type RiskLevel = "low" | "medium" | "high" | "critical";

interface OsintResult {
  sources: Record<string, { success: boolean; error?: string; disabled?: boolean }>;
  results: Record<string, unknown>;
  analysis: string;
  riskLevel: RiskLevel;
  recommendations: string[];
  error?: string;
}

interface HistoryEntry {
  type: OsintType;
  value: string;
  ts: number;
}

const SESSION_HISTORY_KEY = "osint_search_history";

function loadHistory(): HistoryEntry[] {
  try { return JSON.parse(sessionStorage.getItem(SESSION_HISTORY_KEY) ?? "[]") as HistoryEntry[]; } catch { return []; }
}
function saveHistory(entries: HistoryEntry[]) {
  try { sessionStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(entries.slice(0, 20))); } catch { /* noop */ }
}
function addToHistory(type: OsintType, value: string) {
  const existing = loadHistory().filter(e => !(e.type === type && e.value === value));
  saveHistory([{ type, value, ts: Date.now() }, ...existing]);
}

const TOR_CATEGORIES = [
  {
    id: "recon", label: "Recon & OSINT", color: "#3b82f6", glow: "rgba(59,130,246,0.2)",
    icon: Eye,
    templates: [
      { title: "Email Breach Search", desc: "بحث عن تسريبات البريد الإلكتروني", prompt: "ابحث عن أي تسريبات أو بيانات مخترقة مرتبطة بالبريد الإلكتروني التالي عبر مصادر OSINT المتاحة ومحركات البحث في الويب المظلم: {TARGET}\n\nاستخدم المصادر: Have I Been Pwned, DeHashed, Leakbase, BreachDirectory, HaveIBeenSold\nقدم: تاريخ التسريب، نوع البيانات، مصدر قاعدة البيانات، توصيات الحماية" },
      { title: "Username OSINT", desc: "تتبع اسم المستخدم عبر المنصات", prompt: "قم بعملية OSINT شاملة لاسم المستخدم: {TARGET}\n\nابحث في: GitHub, Twitter/X, Reddit, Telegram, Discord, OnionSearch, Keybase, LinkedIn\nاستخرج: الحسابات المرتبطة، أنماط النشاط، الاهتمامات، الشبكات الاجتماعية، أي معلومات تعريفية" },
      { title: "Domain Intelligence", desc: "تحليل استخباراتي شامل للدومين", prompt: "قم بتحليل استخباراتي شامل للدومين: {TARGET}\n\nاشمل: WHOIS history, DNS records, SSL certificates, subdomain enumeration, IP history, hosting providers, technologies used, related domains, dark web mentions, paste sites, threat feeds" },
      { title: "IP Geolocation & Threat", desc: "تحليل IP وسمعته الأمنية", prompt: "حلل عنوان IP التالي بشكل شامل: {TARGET}\n\nاشمل: الموقع الجغرافي، ASN/ISP، السمعة في قوائم الحظر (blacklists)، سجل الهجمات، Shodan data، VirusTotal، AbuseIPDB، Tor exit node check، VPN/Proxy detection" },
    ]
  },
  {
    id: "pentest", label: "Penetration Testing", color: "#e21227", glow: "rgba(226,18,39,0.2)",
    icon: Target,
    templates: [
      { title: "Web Vulnerability Scan", desc: "مسح ثغرات تطبيقات الويب", prompt: "ابدأ تحليل شامل لثغرات الموقع: {TARGET}\n\nابحث عن: SQL Injection, XSS, CSRF, IDOR, Path Traversal, SSRF, XXE, RCE, Open Redirect, Business Logic Flaws\nاستخدم OWASP Top 10 2023 كإطار مرجعي\nقدم: وصف الثغرة، مستوى الخطورة (CVSS), Proof of Concept, التوصيات" },
      { title: "Network Recon Template", desc: "استطلاع شبكي متقدم", prompt: "قم باستطلاع شبكي شامل للهدف: {TARGET}\n\nnmap commands للمسح: \n- Port scan: nmap -sV -sC -O -A -T4\n- UDP scan: nmap -sU --top-ports 100\n- Script scan: nmap --script=vuln,exploit\nحلل النتائج واقترح: نقاط الدخول، الخدمات الضعيفة، مسارات الاستغلال" },
      { title: "CVE Exploit Chain", desc: "بناء سلسلة استغلال CVE", prompt: "ابحث عن CVEs الأخيرة المرتبطة بالتقنية/المنتج: {TARGET}\n\nاشمل: تفاصيل CVE، CVSS Score، نوع الثغرة، المنتجات المتأثرة، Proof of Concept موجود، patch status\nبنِ سيناريو هجوم واقعي يجمع عدة CVEs في kill chain متكاملة" },
      { title: "Privilege Escalation", desc: "مسارات رفع الصلاحيات", prompt: "حلل مسارات رفع الصلاحيات في البيئة: {TARGET}\n\nابحث في: sudo misconfigurations, SUID/SGID binaries, writable cron jobs, weak file permissions, kernel exploits, PATH hijacking, LD_PRELOAD, Docker escapes, container breakouts\nقدم: enumeration commands، استغلال مقترح، cleanup steps" },
    ]
  },
  {
    id: "malware", label: "Malware Analysis", color: "#f97316", glow: "rgba(249,115,22,0.2)",
    icon: Bug,
    templates: [
      { title: "Static Analysis Template", desc: "تحليل ثابت للبرامج الخبيثة", prompt: "قم بتحليل ثابت (Static Analysis) للعينة: {TARGET}\n\nاستخرج: file type, entropy analysis, strings extraction, imports/exports, PE headers, packers/protectors, embedded resources, suspicious APIs, hardcoded IOCs (IPs/domains/hashes)\nأدوات مقترحة: PEStudio, Ghidra, Radare2, YARA rules generation" },
      { title: "Behavioral Analysis", desc: "تحليل سلوكي ديناميكي", prompt: "صمم خطة تحليل سلوكي (Dynamic Analysis) للعينة: {TARGET}\n\nشمل: sandbox setup (Cuckoo/Any.run), network traffic capture, registry changes, file system activity, process tree, API calls monitoring, memory dumps, IOC extraction\nقدم: YARA rule مقترح، Sigma rule، MITRE ATT&CK mapping" },
      { title: "IOC Extraction", desc: "استخراج مؤشرات الاختراق", prompt: "استخرج جميع IOCs (Indicators of Compromise) من: {TARGET}\n\nأنواع IOCs: IP addresses, domains, URLs, file hashes (MD5/SHA1/SHA256), registry keys, mutex names, file paths, email addresses, Bitcoin wallets\nتحقق من: VirusTotal, AlienVault OTX, Shodan, URLhaus, MalwareBazaar" },
      { title: "YARA Rule Generator", desc: "توليد قواعد YARA", prompt: "اكتب YARA rules احترافية لاكتشاف التهديد: {TARGET}\n\nالقاعدة يجب أن تشمل: string patterns, byte sequences, PE metadata, condition logic\nتحسين: false positive rate منخفض، high confidence detection، متوافقة مع YARA 4.x\nاشمل: main rule + supporting rules + meta section كاملة" },
    ]
  },
  {
    id: "darkweb", label: "Dark Web Intel", color: "#8b5cf6", glow: "rgba(139,92,246,0.2)",
    icon: Globe,
    templates: [
      { title: "Threat Actor Research", desc: "بحث عن جهات التهديد", prompt: "ابحث عن معلومات استخباراتية حول جهة التهديد: {TARGET}\n\nاشمل: TTPs (Tactics, Techniques, Procedures), MITRE ATT&CK groups, ضحايا سابقون، أدوات مستخدمة، بنية تحتية، مؤشرات الاختراق، التوقيت والدوافع\nمصادر: threat intelligence feeds, dark web forums, paste sites, telegram channels" },
      { title: "Data Breach Intel", desc: "استخبارات تسريبات البيانات", prompt: "ابحث عن تسريبات البيانات المرتبطة بالمنظمة: {TARGET}\n\nابحث في: breached databases, ransomware leak sites, dark web markets, paste sites (Pastebin, Ghostbin, Rentry)\nاستخرج: نوع البيانات المسربة، حجم التسريب، تاريخ الاختراق، الجهة المسؤولة، حالة البيانات (مباعة/مجانية)" },
      { title: "Ransomware Tracking", desc: "تتبع مجموعات الفدية", prompt: "تتبع نشاط مجموعة الفدية: {TARGET}\n\nاشمل: ضحايا مؤكدون، مواقع تسريب (.onion)، أنماط الهجوم، طلبات الفدية المتوسطة، decryptors متاحة، مفاوضات موثقة\nTTPs: initial access, lateral movement, data exfil, encryption methods\nMITRE mapping للتقنيات المستخدمة" },
      { title: "Credential Stuffing Intel", desc: "استخبارات حشو بيانات الاعتماد", prompt: "حلل خطر Credential Stuffing للخدمة/المنظمة: {TARGET}\n\nاشمل: قوائم كلمات المرور المسربة المتعلقة بالهدف، combo lists موجودة، نقاط ضعف في نظام المصادقة، توصيات: MFA, rate limiting, breach detection\nأدوات الكشف: HaveIBeenPwned API, Dehashed, SpyCloud" },
    ]
  },
];

const OSINT_LOOKUPS: { id: OsintType; label: string; icon: React.ElementType; color: string; placeholder: string; promptFallback: (v: string) => string }[] = [
  { id: "email", label: "Email", icon: Mail, color: "#3b82f6", placeholder: "target@domain.com", promptFallback: (v) => `OSINT شامل للبريد الإلكتروني: ${v}` },
  { id: "ip", label: "IP Address", icon: Network, color: "#e21227", placeholder: "8.8.8.8", promptFallback: (v) => `تحليل IP شامل: ${v}` },
  { id: "domain", label: "Domain", icon: Globe, color: "#10b981", placeholder: "target.com", promptFallback: (v) => `تحليل دومين: ${v}` },
  { id: "username", label: "Username", icon: User, color: "#8b5cf6", placeholder: "h4ck3r_name", promptFallback: (v) => `OSINT اسم المستخدم: ${v}` },
  { id: "phone", label: "Phone", icon: Smartphone, color: "#f59e0b", placeholder: "+1234567890", promptFallback: (v) => `OSINT رقم هاتف: ${v}` },
  { id: "hash", label: "Hash", icon: Hash, color: "#06b6d4", placeholder: "d41d8cd98f00b204e9800998ecf8427e", promptFallback: (v) => `تحليل hash: ${v}` },
  { id: "url", label: "URL", icon: Link, color: "#f97316", placeholder: "https://suspicious-site.com", promptFallback: (v) => `تحليل URL: ${v}` },
];

const THREAT_KEYWORDS = [
  { label: "Zero-Day Alerts", color: "#e21227", prompt: "ابحث عن Zero-Day vulnerabilities الجديدة والغير مصححة لعام 2025-2026\n\nشمل:\n• CVEs بدون patch رسمي\n• PoC موجود علناً\n• Actively exploited in the wild\n• عدد الأنظمة المتأثرة المقدر\n• Workarounds مؤقتة\n\nرتب حسب: CVSS Score, Exploitability, Impact" },
  { label: "Ransomware Intel", color: "#f97316", prompt: "تقرير استخباراتي عن أحدث هجمات Ransomware 2025-2026\n\nشمل:\n• أنشط المجموعات حالياً\n• تقنيات جديدة مستخدمة\n• أحدث الضحايا (اسم القطاع لا اسم الشركة)\n• تطورات في استراتيجيات Double/Triple Extortion\n• آخر تحديثات decryptors متاحة\n• توصيات الحماية الفورية" },
  { label: "APT Activity", color: "#8b5cf6", prompt: "تقرير عن نشاط مجموعات APT (Advanced Persistent Threats) الحديث\n\nشمل:\n• أنشط مجموعات APT حالياً مع توصيف الدولة\n• TTPs الجديدة المكتشفة\n• ضحايا قطاعات محددة\n• أدوات جديدة (implants, loaders, C2 frameworks)\n• MITRE ATT&CK mappings\n• Indicators of Compromise الأخيرة" },
  { label: "Supply Chain Threats", color: "#06b6d4", prompt: "تحليل تهديدات سلسلة التوريد (Supply Chain Attacks) الحديثة\n\nشمل:\n• هجمات موثقة خلال آخر 6 أشهر\n• أنواع: npm/PyPI malicious packages, compromised updates, CI/CD attacks\n• مؤشرات الاكتشاف\n• أفضل ممارسات الحماية (SLSA framework)\n• أدوات المسح: Snyk, Dependabot, Socket.dev" },
  { label: "Dark Web Markets", color: "#ec4899", prompt: "تحليل استخباراتي لأسواق الويب المظلم النشطة\n\nشمل (لأغراض بحثية):\n• أبرز الأسواق النشطة وأحجامها\n• أكثر البيانات المتداولة (credentials, cards, access)\n• أسعار متوسطة للبيانات المختلفة\n• اتجاهات جديدة في الأسواق\n• law enforcement actions الأخيرة" },
  { label: "Phishing Campaigns", color: "#fbbf24", prompt: "تحليل حملات التصيد الاحتيالي (Phishing) النشطة\n\nشمل:\n• أكثر التقنيات المستخدمة حالياً\n• استهداف قطاعات محددة\n• أحدث Lures والطعوم المستخدمة\n• تقنيات تجاوز MFA (EvilProxy, Evilginx)\n• نطاقات طيف التصيد الشائعة\n• أدوات الكشف والحماية" },
];

const SHODAN_TEMPLATES = [
  { title: "Open RDP Servers", color: "#e21227", query: 'port:3389 country:SA has_screenshot:true os:"Windows"', prompt: "ابحث عن خوادم RDP مكشوفة للإنترنت وقيّم مخاطرها\n\nاستخدم Shodan query: port:3389 country:[COUNTRY] has_screenshot:true\n\nحلل:\n• إصدارات Windows المكشوفة\n• احتمالية BlueKeep/DejaBlue\n• NLA enforcement\n• Brute force exposure\n• قدم: risk score, recommended actions, exposure statistics" },
  { title: "Exposed Databases", color: "#f97316", query: 'product:MongoDB port:27017 -authentication', prompt: "ابحث عن قواعد بيانات مكشوفة بدون مصادقة\n\nShodan queries:\n• MongoDB: product:MongoDB port:27017\n• Elasticsearch: port:9200 product:Elastic\n• Redis: port:6379 product:Redis\n• MySQL: port:3306 product:MySQL\n\nقدم: نوع قاعدة البيانات، البيانات المكشوفة المحتملة، الموقع الجغرافي، توصيات الأمان الفورية" },
  { title: "ICS/SCADA Systems", color: "#8b5cf6", query: 'port:502 product:Modbus OR port:44818 product:EtherNet/IP', prompt: "ابحث عن أنظمة ICS/SCADA المكشوفة للإنترنت\n\nبروتوكولات للبحث:\n• Modbus: port:502\n• DNP3: port:20000\n• EtherNet/IP: port:44818\n• BACnet: port:47808\n• S7: port:102 product:Siemens\n\nقيّم: مستوى الخطورة، القطاع المحتمل (طاقة/مياه/صناعة)، توصيات العزل الفوري" },
  { title: "Default Credentials", color: "#10b981", query: 'http.title:"Router" OR http.title:"Admin Panel" default password', prompt: "ابحث عن أجهزة تستخدم بيانات اعتماد افتراضية\n\nShould include:\n• Routers with default login pages\n• IP cameras (Hikvision, Dahua, Axis)\n• Network switches\n• Printers with web interface\n• Industrial controllers\n\nقدم: طرق اكتشاف الأجهزة الضعيفة، قائمة بيانات اعتماد افتراضية شائعة، استراتيجية التصلب (hardening)" },
  { title: "SSL/TLS Vulnerabilities", color: "#06b6d4", query: 'ssl.cert.expired:true OR ssl.cipher.name:"TLS_NULL_WITH_NULL_NULL"', prompt: "ابحث عن ثغرات SSL/TLS في الأنظمة المكشوفة\n\nفحص:\n• شهادات منتهية الصلاحية\n• بروتوكولات قديمة: SSLv3, TLS 1.0, TLS 1.1\n• شفرات ضعيفة: RC4, DES, 3DES\n• ثغرات: POODLE, BEAST, DROWN, ROBOT\n• Self-signed certificates\n• Wildcard certificate abuse\n\nقدم: أدوات الكشف (testssl.sh, sslyze), remediation steps" },
  { title: "Open Proxies & Tor", color: "#ec4899", query: 'port:8080 product:Squid country:XX', prompt: "ابحث عن Proxies مفتوحة وعقد Tor\n\nأنواع:\n• Open HTTP Proxies: port:8080, 3128\n• SOCKS proxies: port:1080, 9050\n• Tor relays: port:9001\n• VPN servers: port:1194 (OpenVPN), 1723 (PPTP)\n\nقدم: طرق استخدامها في حركة مرور مجهولة، مخاطر الاستخدام، كيفية الكشف عن الاستخدام المشبوه في شبكتك" },
];

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string; border: string }> = {
  low: { label: "LOW", color: "#10b981", bg: "rgba(16,185,129,0.1)", border: "rgba(16,185,129,0.3)" },
  medium: { label: "MEDIUM", color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.3)" },
  high: { label: "HIGH", color: "#f97316", bg: "rgba(249,115,22,0.1)", border: "rgba(249,115,22,0.3)" },
  critical: { label: "CRITICAL", color: "#e21227", bg: "rgba(226,18,39,0.1)", border: "rgba(226,18,39,0.3)" },
};

function RiskBadge({ level }: { level: RiskLevel }) {
  const cfg = RISK_CONFIG[level];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black font-mono border"
      style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}>
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function SourceTag({ name, info }: { name: string; info: { success: boolean; error?: string; disabled?: boolean } }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-mono border"
      style={{
        color: info.disabled ? "#64748b" : info.success ? "#10b981" : "#f97316",
        borderColor: info.disabled ? "rgba(100,116,139,0.3)" : info.success ? "rgba(16,185,129,0.3)" : "rgba(249,115,22,0.3)",
        background: info.disabled ? "rgba(100,116,139,0.08)" : info.success ? "rgba(16,185,129,0.08)" : "rgba(249,115,22,0.08)",
      }}>
      {info.disabled ? <AlertCircle className="w-2.5 h-2.5" /> : info.success ? <CheckCircle className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
      {name}
      {info.error && !info.disabled && <span className="opacity-60 ml-1 truncate max-w-[100px]">{info.error}</span>}
    </span>
  );
}

function LoadingPulse({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-[#8b5cf6]/20 animate-ping" />
        <div className="absolute inset-2 rounded-full border-2 border-[#8b5cf6]/40 animate-ping" style={{ animationDelay: "0.15s" }} />
        <div className="absolute inset-0 rounded-full border-t-2 border-[#8b5cf6] animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Search className="w-5 h-5 text-[#8b5cf6]" />
        </div>
      </div>
      <p className="text-[11px] font-mono text-[#8b5cf6] animate-pulse">{text}</p>
    </div>
  );
}

function MarkdownBlock({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) return <p key={i} className="text-[12px] font-black text-white mt-3 mb-1">{line.slice(3)}</p>;
        if (line.startsWith("# ")) return <p key={i} className="text-[13px] font-black text-white mt-3 mb-1">{line.slice(2)}</p>;
        if (line.startsWith("### ")) return <p key={i} className="text-[11px] font-bold text-slate-200 mt-2">{line.slice(4)}</p>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="text-[11px] font-bold text-slate-200">{line.slice(2, -2)}</p>;
        if (line.startsWith("- ") || line.startsWith("• ")) return <p key={i} className="text-[10px] text-slate-400 pl-3 flex gap-2"><span className="text-[#8b5cf6] shrink-0">▸</span>{line.slice(2)}</p>;
        if (line.trim() === "---" || line.trim() === "") return <div key={i} className="h-1" />;
        if (line.startsWith("`") && line.endsWith("`")) return <code key={i} className="block text-[9px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.5)", color: "#06b6d4" }}>{line.slice(1, -1)}</code>;
        return <p key={i} className="text-[10px] text-slate-400 leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

function InfoCard({ label, value, col2 }: { label: string; value?: string | number | null; col2?: boolean }) {
  if (!value && value !== 0) return null;
  return (
    <div className={`px-2 py-1.5 rounded-lg border border-[#1a1a2e] bg-black/20 text-[9px] font-mono${col2 ? " col-span-2" : ""}`}>
      <span className="text-slate-600">{label}: </span>
      <span className="text-slate-300">{String(value)}</span>
    </div>
  );
}

// ── Email Results ──────────────────────────────────────────────────────────────
function EmailResults({ data, color, onQuickAction }: { data: OsintResult; color: string; onQuickAction: (type: OsintType, val: string) => void }) {
  const results = data.results as {
    email: string; domain: string; breaches: { Name: string; BreachDate: string; PwnCount: number; DataClasses: string[] }[];
    breachCount: number; hunter: unknown; isDisposable: boolean;
    mxRecords: { exchange: string; priority: number }[];
    mxSecurity: { spf: string | null; dmarc: string | null; dkim: string[] };
  };
  const breaches = results.breaches ?? [];
  const mx = results.mxSecurity;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono text-slate-500">البريد:</span>
        <code className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color }}>{results.email}</code>
        <RiskBadge level={data.riskLevel} />
        {results.isDisposable && <span className="text-[9px] px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-400 bg-amber-500/10 font-mono">DISPOSABLE</span>}
      </div>

      {/* Breach status */}
      {breaches.length === 0 ? (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-[12px] font-bold text-emerald-400">لم يُكتشف تسريب لهذا البريد</p>
            <p className="text-[10px] text-emerald-400/60">لا توجد سجلات في قواعد بيانات التسريبات المُفحوصة</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-slate-500">وُجد في <span className="text-[#e21227] font-bold">{breaches.length}</span> تسريب</p>
          {breaches.map((b, i) => (
            <div key={i} className="rounded-xl border border-[#e21227]/20 p-3 bg-[#e21227]/5">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-[12px] font-bold text-white">{b.Name}</p>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded border border-[#e21227]/30 text-[#e21227] bg-[#e21227]/10 shrink-0">{b.BreachDate}</span>
              </div>
              <p className="text-[10px] text-slate-500 mb-2">{b.PwnCount ? `${b.PwnCount.toLocaleString()} حساب متأثر` : ""}</p>
              <div className="flex flex-wrap gap-1">
                {(b.DataClasses ?? []).map((dc: string) => (
                  <span key={dc} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(226,18,39,0.15)", color: "#fca5a5" }}>{dc}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Email domain MX security */}
      <div className="rounded-xl border border-[#1a1a2e] p-3 bg-black/30">
        <p className="text-[9px] text-slate-600 font-mono uppercase mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3" /> Email Domain Security ({results.domain})
        </p>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-[9px] font-mono">
            {mx?.spf ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
            <span className="text-slate-500">SPF:</span>
            <span className={`truncate max-w-[220px] ${mx?.spf ? "text-emerald-400/80" : "text-red-400/80"}`}>{mx?.spf ?? "غير مُعرَّف — الدومين عُرضة لانتحال الهوية"}</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono">
            {mx?.dmarc ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
            <span className="text-slate-500">DMARC:</span>
            <span className={`truncate max-w-[220px] ${mx?.dmarc ? "text-emerald-400/80" : "text-red-400/80"}`}>{mx?.dmarc ?? "غير مُعرَّف — لا حماية ضد spoofing"}</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono">
            {mx?.dkim?.length ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />}
            <span className="text-slate-500">DKIM:</span>
            <span className={mx?.dkim?.length ? "text-emerald-400/80" : "text-amber-400/80"}>{mx?.dkim?.length ? `${mx.dkim.length} مفتاح مُكتشف` : "غير مُكتشف في DNS"}</span>
          </div>
        </div>
      </div>

      {/* Quick action */}
      {results.domain && (
        <button onClick={() => onQuickAction("domain", results.domain)}
          className="flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-1.5 rounded-lg border border-[#10b981]/30 text-[#10b981] bg-[#10b981]/5 hover:bg-[#10b981]/10 transition-colors">
          <ArrowRight className="w-3 h-3" /> فحص دومين البريد: {results.domain}
        </button>
      )}
    </div>
  );
}

// ── IP Results ─────────────────────────────────────────────────────────────────
function IpResults({ data, color, onQuickAction }: { data: OsintResult; color: string; onQuickAction: (type: OsintType, val: string) => void }) {
  const results = data.results as {
    ip: string; abuseScore: number;
    abuseData: { data?: { countryCode?: string; usageType?: string; isp?: string; totalReports?: number; domain?: string } } | null;
    ipapiData: { city?: string; region?: string; country_name?: string; org?: string; latitude?: number; longitude?: number } | null;
    ipApiData: { city?: string; country?: string; countryCode?: string; regionName?: string; isp?: string; org?: string; as?: string; lat?: number; lon?: number; mobile?: boolean; proxy?: boolean; hosting?: boolean; timezone?: string } | null;
    shodanData: { ports?: number[]; tags?: string[]; vulns?: string[]; hostnames?: string[]; cpes?: string[] } | null;
  };
  const abuse = results.abuseData?.data;
  const geo = results.ipapiData;
  const geoAlt = results.ipApiData;
  const shodan = results.shodanData;
  const score = results.abuseScore ?? 0;
  const cityDisplay = geo?.city ?? geoAlt?.city ?? "—";
  const countryDisplay = geo?.country_name ?? geoAlt?.country ?? abuse?.countryCode ?? "—";
  const orgDisplay = geo?.org ?? geoAlt?.isp ?? geoAlt?.org ?? abuse?.isp ?? "—";
  const latDisplay = geo?.latitude ?? geoAlt?.lat;
  const lonDisplay = geo?.longitude ?? geoAlt?.lon;
  const asDisplay = geoAlt?.as ?? null;
  const isProxy = geoAlt?.proxy ?? false;
  const isHosting = geoAlt?.hosting ?? false;
  const isMobile = geoAlt?.mobile ?? false;
  const vulns = shodan?.vulns ?? [];
  const ports = shodan?.ports ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(226,18,39,0.1)", color }}>{results.ip}</code>
        <RiskBadge level={data.riskLevel} />
        {isProxy && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-400 bg-amber-500/10">PROXY</span>}
        {isHosting && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-400 bg-blue-500/10">HOSTING</span>}
        {isMobile && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-purple-500/30 text-purple-400 bg-purple-500/10">MOBILE</span>}
        {vulns.length > 0 && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-red-500/40 text-red-400 bg-red-500/10 animate-pulse">{vulns.length} CVE</span>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-[#1a1a2e] p-3 bg-black/30">
          <p className="text-[9px] text-slate-600 font-mono mb-2 uppercase">Geolocation</p>
          <p className="text-[11px] text-white font-bold">{cityDisplay}, {countryDisplay}</p>
          <p className="text-[10px] text-slate-400 mt-1 truncate">{orgDisplay}</p>
          {latDisplay && <p className="text-[9px] text-slate-600 font-mono mt-1">{latDisplay?.toFixed(4)}° {lonDisplay?.toFixed(4)}°</p>}
          {asDisplay && <p className="text-[9px] text-slate-600 font-mono mt-0.5 truncate">{asDisplay}</p>}
        </div>
        <div className="rounded-xl border border-[#1a1a2e] p-3 bg-black/30">
          <p className="text-[9px] text-slate-600 font-mono mb-2 uppercase">Abuse Score</p>
          <p className="text-[22px] font-black" style={{ color: score > 50 ? "#e21227" : score > 10 ? "#f59e0b" : "#10b981" }}>{score}%</p>
          <div className="w-full h-1.5 rounded-full bg-[#1a1a2e] mt-2">
            <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: score > 50 ? "#e21227" : score > 10 ? "#f59e0b" : "#10b981" }} />
          </div>
          {abuse?.totalReports !== undefined && <p className="text-[9px] text-slate-600 mt-1">{abuse.totalReports} تقرير إساءة</p>}
        </div>
      </div>

      {/* Shodan InternetDB */}
      {shodan && (ports.length > 0 || vulns.length > 0 || (shodan.tags?.length ?? 0) > 0) && (
        <div className="rounded-xl border border-[#1a1a2e] p-3 bg-black/30">
          <p className="text-[9px] text-slate-600 font-mono uppercase mb-2 flex items-center gap-1.5">
            <Database className="w-3 h-3" /> Shodan InternetDB
          </p>
          {ports.length > 0 && (
            <div className="mb-2">
              <p className="text-[8px] text-slate-700 font-mono mb-1">OPEN PORTS ({ports.length})</p>
              <div className="flex flex-wrap gap-1">
                {ports.map(p => (
                  <span key={p} className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-[#3b82f6]/20 bg-[#3b82f6]/10 text-blue-300">{p}</span>
                ))}
              </div>
            </div>
          )}
          {vulns.length > 0 && (
            <div className="mb-2">
              <p className="text-[8px] text-slate-700 font-mono mb-1">CVEs ({vulns.length})</p>
              <div className="flex flex-wrap gap-1">
                {vulns.slice(0, 10).map(v => (
                  <a key={v} href={`https://nvd.nist.gov/vuln/detail/${v}`} target="_blank" rel="noopener noreferrer"
                    className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-[#e21227]/30 bg-[#e21227]/10 text-red-300 hover:bg-[#e21227]/20 transition-colors">{v}</a>
                ))}
                {vulns.length > 10 && <span className="text-[8px] font-mono text-slate-600">+{vulns.length - 10}</span>}
              </div>
            </div>
          )}
          {(shodan.tags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1">
              {shodan.tags!.map(t => (
                <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-[#8b5cf6]/20 bg-[#8b5cf6]/10 text-purple-300">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
        {abuse?.usageType && <InfoCard label="نوع الاستخدام" value={abuse.usageType} />}
        {geoAlt?.timezone && <InfoCard label="المنطقة الزمنية" value={geoAlt.timezone} />}
        {abuse?.domain && <InfoCard label="الدومين" value={abuse.domain} col2 />}
      </div>

      {/* Quick action */}
      {shodan?.hostnames?.[0] && (
        <button onClick={() => onQuickAction("domain", shodan.hostnames![0])}
          className="flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-1.5 rounded-lg border border-[#10b981]/30 text-[#10b981] bg-[#10b981]/5 hover:bg-[#10b981]/10 transition-colors">
          <ArrowRight className="w-3 h-3" /> فحص دومين: {shodan.hostnames[0]}
        </button>
      )}
    </div>
  );
}

// ── Domain Results ─────────────────────────────────────────────────────────────
function DomainResults({ data, color, onQuickAction }: { data: OsintResult; color: string; onQuickAction: (type: OsintType, val: string) => void }) {
  const results = data.results as {
    domain: string;
    dnsRecords: { a: string[]; aaaa: string[]; mx: { exchange: string; priority: number }[]; txt: string[][]; ns: string[]; soa: { nsname?: string } | null; caa: { critical: number; issue: string }[] };
    subdomains: string[];
    sslCount: number;
    mxSecurity: { spf: string | null; dmarc: string | null; dkim: string[] };
    waybackData: { archived_snapshots?: { closest?: { url?: string; timestamp?: string; available?: boolean } } } | null;
    rdapData: unknown;
  };
  const dns = results.dnsRecords ?? {};
  const mx = results.mxSecurity;
  const wayback = results.waybackData?.archived_snapshots?.closest;
  const [showAllSubs, setShowAllSubs] = useState(false);
  const visibleSubs = showAllSubs ? results.subdomains : results.subdomains?.slice(0, 12);

  const DNS_TYPES = [
    { key: "a", label: "A", color: "#3b82f6", items: dns.a?.map(v => ({ v })) ?? [] },
    { key: "aaaa", label: "AAAA", color: "#8b5cf6", items: dns.aaaa?.map(v => ({ v })) ?? [] },
    { key: "mx", label: "MX", color: "#10b981", items: dns.mx?.map(r => ({ v: `${r.exchange} (priority: ${r.priority})` })) ?? [] },
    { key: "ns", label: "NS", color: "#f59e0b", items: dns.ns?.map(v => ({ v })) ?? [] },
    { key: "txt", label: "TXT", color: "#06b6d4", items: dns.txt?.map(r => ({ v: r.join(" ").slice(0, 80) })) ?? [] },
    { key: "caa", label: "CAA", color: "#ec4899", items: dns.caa?.map(r => ({ v: r.issue })) ?? [] },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.1)", color }}>{results.domain}</code>
        <RiskBadge level={data.riskLevel} />
        <span className="text-[9px] font-mono text-slate-600">{results.sslCount} شهادة SSL</span>
      </div>

      {/* MX Security */}
      <div className="rounded-xl border border-[#1a1a2e] p-3 bg-black/30">
        <p className="text-[9px] text-slate-600 font-mono uppercase mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3" /> Email Security (SPF / DMARC / DKIM)
        </p>
        <div className="space-y-1.5">
          <div className="flex items-start gap-2 text-[9px] font-mono">
            {mx?.spf ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />}
            <div><span className="text-slate-500">SPF: </span><span className={`break-all ${mx?.spf ? "text-emerald-400/80" : "text-red-400/80"}`}>{mx?.spf ? mx.spf.slice(0, 80) : "غير مُعرَّف"}</span></div>
          </div>
          <div className="flex items-start gap-2 text-[9px] font-mono">
            {mx?.dmarc ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" /> : <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />}
            <div><span className="text-slate-500">DMARC: </span><span className={`break-all ${mx?.dmarc ? "text-emerald-400/80" : "text-red-400/80"}`}>{mx?.dmarc ? mx.dmarc.slice(0, 80) : "غير مُعرَّف"}</span></div>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-mono">
            {mx?.dkim?.length ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> : <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />}
            <span className="text-slate-500">DKIM: </span>
            <span className={mx?.dkim?.length ? "text-emerald-400/80" : "text-amber-400/80"}>{mx?.dkim?.length ? `${mx.dkim.length} مفتاح مكتشف` : "غير مكتشف"}</span>
          </div>
        </div>
      </div>

      {/* Wayback Machine */}
      {wayback?.available && (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl border border-[#1a1a2e] bg-black/30">
          <Clock className="w-3.5 h-3.5 text-[#8b5cf6] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-mono text-slate-500">Wayback Machine — آخر أرشفة</p>
            <p className="text-[9px] font-mono text-slate-300 truncate">{wayback.timestamp ? new Date(wayback.timestamp.replace(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6')).toLocaleDateString("ar") : "—"}</p>
          </div>
          {wayback.url && (
            <a href={wayback.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <ExternalLink className="w-3 h-3 text-[#8b5cf6] hover:text-[#a78bfa]" />
            </a>
          )}
        </div>
      )}

      {/* DNS Records */}
      <div className="space-y-1.5">
        <p className="text-[9px] text-slate-600 font-mono uppercase">DNS Records</p>
        {DNS_TYPES.filter(t => t.items.length > 0).map(t => (
          <div key={t.key} className="rounded-lg border border-[#1a1a2e] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: `${t.color}11` }}>
              <span className="text-[9px] font-black font-mono px-1.5 py-0.5 rounded" style={{ background: `${t.color}22`, color: t.color }}>{t.label}</span>
              <span className="text-[8px] text-slate-600 font-mono">{t.items.length} سجل</span>
            </div>
            <div className="px-3 py-2 space-y-0.5">
              {t.items.slice(0, 5).map((item, i) => (
                <p key={i} className="text-[9px] font-mono text-slate-400 truncate">{item.v}</p>
              ))}
              {t.items.length > 5 && <p className="text-[8px] text-slate-600 font-mono">+{t.items.length - 5} أخرى</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Subdomains */}
      {results.subdomains?.length > 0 && (
        <div>
          <p className="text-[9px] text-slate-600 font-mono uppercase mb-2">Subdomains ({results.subdomains.length} مكتشف)</p>
          <div className="flex flex-wrap gap-1.5">
            {visibleSubs?.map((s, i) => (
              <button key={i} onClick={() => onQuickAction("domain", s)}
                className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#1a1a2e] text-slate-400 hover:border-[#10b981]/30 hover:text-[#10b981] transition-colors"
                style={{ background: "rgba(0,0,0,0.4)" }}>{s}</button>
            ))}
          </div>
          {results.subdomains.length > 12 && (
            <button onClick={() => setShowAllSubs(!showAllSubs)} className="mt-2 flex items-center gap-1 text-[9px] font-mono text-[#8b5cf6] hover:text-[#a78bfa]">
              {showAllSubs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showAllSubs ? "عرض أقل" : `عرض ${results.subdomains.length - 12} نطاق فرعي إضافي`}
            </button>
          )}
        </div>
      )}

      {/* Quick actions */}
      {dns.a?.[0] && (
        <button onClick={() => onQuickAction("ip", dns.a[0])}
          className="flex items-center gap-1.5 text-[9px] font-mono px-2.5 py-1.5 rounded-lg border border-[#e21227]/30 text-[#e21227] bg-[#e21227]/5 hover:bg-[#e21227]/10 transition-colors">
          <ArrowRight className="w-3 h-3" /> فحص IP: {dns.a[0]}
        </button>
      )}
    </div>
  );
}

// ── Hash Results ───────────────────────────────────────────────────────────────
function HashResults({ data, color }: { data: OsintResult; color: string }) {
  const results = data.results as {
    hash: string; hashType: string; detectionRatio: number; maliciousCount: number; totalEngines: number;
    fileInfo: { name?: string | null; type?: string | null; size?: number | null; firstSeen?: string | null; signature?: string | null; tags?: string[]; deliveryMethod?: string | null } | null;
    vtData: { data?: { attributes?: { last_analysis_results?: Record<string, { category: string; engine_name: string; result?: string }> } } } | null;
    mbData: { file_name?: string; file_type?: string; signature?: string; tags?: string[]; delivery_method?: string } | null;
  };
  const ratio = results.detectionRatio ?? 0;
  const ratioColor = ratio > 50 ? "#e21227" : ratio > 15 ? "#f59e0b" : "#10b981";
  const engines = Object.entries(results.vtData?.data?.attributes?.last_analysis_results ?? {})
    .filter(([, v]) => v.category === "malicious" || v.category === "suspicious")
    .slice(0, 20);
  const fi = results.fileInfo;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-[9px] font-mono px-2 py-0.5 rounded truncate max-w-[200px]" style={{ background: "rgba(6,182,212,0.1)", color }}>{results.hash}</code>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#1a1a2e] text-slate-500">{results.hashType}</span>
        <RiskBadge level={data.riskLevel} />
      </div>
      <div className="flex items-center gap-4 px-4 py-3 rounded-xl border border-[#1a1a2e] bg-black/30">
        <div>
          <p className="text-[9px] text-slate-600 font-mono mb-0.5">نسبة الكشف</p>
          <p className="text-[28px] font-black" style={{ color: ratioColor }}>{ratio}%</p>
          <p className="text-[8px] text-slate-600 font-mono">{results.maliciousCount}/{results.totalEngines} محرك</p>
        </div>
        <div className="flex-1">
          <div className="w-full h-2.5 rounded-full bg-[#1a1a2e]">
            <div className="h-full rounded-full" style={{ width: `${ratio}%`, background: ratioColor }} />
          </div>
          {fi?.signature && <p className="text-[9px] text-[#e21227] font-mono mt-2 font-bold">{fi.signature}</p>}
          {fi?.deliveryMethod && <p className="text-[8px] text-slate-600 font-mono mt-0.5">التوزيع: {fi.deliveryMethod}</p>}
        </div>
      </div>
      {fi && (fi.name || fi.type || fi.size || fi.firstSeen) && (
        <div className="grid grid-cols-2 gap-2">
          {fi.name && <InfoCard label="الاسم" value={String(fi.name).slice(0, 30)} />}
          {fi.type && <InfoCard label="النوع" value={fi.type} />}
          {fi.size && <InfoCard label="الحجم" value={`${((fi.size as number) / 1024).toFixed(1)} KB`} />}
          {fi.firstSeen && <InfoCard label="أول ظهور" value={typeof fi.firstSeen === "number" ? new Date(fi.firstSeen * 1000).toLocaleDateString() : fi.firstSeen} />}
        </div>
      )}
      {fi?.tags && fi.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {fi.tags.map(t => <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-[#8b5cf6]/20 bg-[#8b5cf6]/10 text-purple-300">{t}</span>)}
        </div>
      )}
      {engines.length > 0 && (
        <div>
          <p className="text-[9px] text-slate-600 font-mono uppercase mb-2">محركات الكشف الإيجابية ({engines.length})</p>
          <div className="flex flex-wrap gap-1">
            {engines.map(([k, v]) => (
              <span key={k} className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-[#e21227]/20 bg-[#e21227]/10 text-red-300">
                {v.engine_name}: {v.result ?? "malicious"}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Username Results ────────────────────────────────────────────────────────────
function UsernameResults({ data, color }: { data: OsintResult; color: string }) {
  const results = data.results as {
    username: string;
    platformResults: { platform: string; url: string; category: string; found: boolean; status: number; error?: string }[];
    foundCount: number; totalChecked: number;
  };
  const CATEGORY_LABELS: Record<string, string> = { dev: "Dev", social: "Social", security: "Security", blog: "Blog", paste: "Paste", work: "Work" };
  const byCategory = (results.platformResults ?? []).reduce<Record<string, typeof results.platformResults>>((acc, p) => {
    const cat = p.category ?? "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.1)", color }}>@{results.username}</code>
        <span className="text-[10px] font-mono text-[#8b5cf6]">{results.foundCount}/{results.totalChecked} منصة</span>
        <RiskBadge level={data.riskLevel} />
      </div>
      {Object.entries(byCategory).map(([cat, platforms]) => (
        <div key={cat}>
          <p className="text-[8px] font-mono text-slate-600 uppercase mb-1.5">{CATEGORY_LABELS[cat] ?? cat}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {platforms.map((p, i) => (
              <a key={i} href={p.found ? p.url : undefined} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${p.found ? "hover:border-opacity-60 cursor-pointer" : "opacity-40 cursor-default"}`}
                style={{ borderColor: p.found ? `${color}40` : "#1a1a2e", background: p.found ? `${color}08` : "rgba(0,0,0,0.2)" }}>
                {p.found
                  ? <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color }} />
                  : <XCircle className="w-3.5 h-3.5 shrink-0 text-slate-700" />}
                <span className="text-[10px] font-semibold truncate" style={{ color: p.found ? "white" : "#64748b" }}>{p.platform}</span>
                {p.found && <ExternalLink className="w-2.5 h-2.5 ml-auto shrink-0" style={{ color }} />}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Phone Results ──────────────────────────────────────────────────────────────
function PhoneResults({ data, color }: { data: OsintResult; color: string }) {
  const results = data.results as {
    phone: string;
    numverifyData: { valid?: boolean; number?: string; local_format?: string; international_format?: string; country_prefix?: string; country_code?: string; country_name?: string; location?: string; carrier?: string; line_type?: string } | null;
    detectedCountry: { name: string; region: string } | null;
  };
  const nd = results.numverifyData;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.1)", color }}>{results.phone}</code>
        <RiskBadge level={data.riskLevel} />
        {results.detectedCountry && (
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#1a1a2e] text-slate-400">{results.detectedCountry.name}</span>
        )}
      </div>
      {nd ? (
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          {nd.valid !== undefined && (
            <div className="col-span-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1a1a2e] bg-black/20">
              {nd.valid ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
              <span className="text-slate-400">الرقم {nd.valid ? "صالح" : "غير صالح"}</span>
            </div>
          )}
          {nd.country_name && <InfoCard label="الدولة" value={nd.country_name} />}
          {nd.location && <InfoCard label="الموقع" value={nd.location} />}
          {nd.carrier && <InfoCard label="الشبكة" value={nd.carrier} />}
          {nd.line_type && <InfoCard label="نوع الخط" value={nd.line_type} />}
          {nd.international_format && <InfoCard label="الصيغة الدولية" value={nd.international_format} col2 />}
        </div>
      ) : results.detectedCountry ? (
        <div className="space-y-2">
          <div className="px-4 py-3 rounded-xl border border-[#1a1a2e] bg-black/30">
            <p className="text-[9px] text-slate-500 font-mono mb-2">تحليل رمز الدولة (مجاني)</p>
            <div className="grid grid-cols-2 gap-2">
              <InfoCard label="الدولة" value={results.detectedCountry.name} />
              <InfoCard label="المنطقة" value={results.detectedCountry.region} />
            </div>
          </div>
          <div className="px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-400/70">
            تفعيل NUMVERIFY_API_KEY مطلوب للبيانات التفصيلية. احصل عليه من numverify.com (مجاني: 100 طلب/شهر)
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-400/70">
          تفعيل NUMVERIFY_API_KEY مطلوب لعرض بيانات الرقم. احصل عليه من numverify.com (مجاني: 100 طلب/شهر)
        </div>
      )}
    </div>
  );
}

// ── URL Results ────────────────────────────────────────────────────────────────
function UrlResults({ data, color }: { data: OsintResult; color: string }) {
  const results = data.results as {
    url: string; title: string; status: number;
    iocs: Record<string, string[]>;
    securityHeaders: Record<string, string | null>;
    missingSecHeaders: string[];
    serverHeader: string | null; poweredBy: string | null;
    contentLength: number;
    vtUrlData: unknown; urlscanData: unknown;
  };
  const [showIocs, setShowIocs] = useState(false);
  const iocTypes = Object.entries(results.iocs ?? {}).filter(([, v]) => v.length > 0);
  const statusOk = results.status >= 200 && results.status < 400;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-[9px] font-mono px-2 py-0.5 rounded truncate max-w-[200px]" style={{ background: "rgba(249,115,22,0.1)", color }}>{results.url}</code>
        <RiskBadge level={data.riskLevel} />
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${statusOk ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" : "border-red-500/30 text-red-400 bg-red-500/10"}`}>HTTP {results.status}</span>
      </div>

      {results.title && results.title !== results.url && (
        <div className="px-3 py-2 rounded-lg border border-[#1a1a2e] bg-black/30 text-[10px] font-mono text-slate-300 truncate">
          <span className="text-slate-600">Title: </span>{results.title}
        </div>
      )}

      {/* Tech fingerprint */}
      {(results.serverHeader || results.poweredBy) && (
        <div className="grid grid-cols-2 gap-2">
          {results.serverHeader && <InfoCard label="Server" value={results.serverHeader} />}
          {results.poweredBy && <InfoCard label="X-Powered-By" value={results.poweredBy} />}
          <InfoCard label="Content Size" value={`${(results.contentLength / 1024).toFixed(1)} KB`} />
        </div>
      )}

      {/* Security headers */}
      <div className="rounded-xl border border-[#1a1a2e] p-3 bg-black/30">
        <p className="text-[9px] text-slate-600 font-mono uppercase mb-2 flex items-center gap-1.5">
          <ShieldAlert className="w-3 h-3" /> Security Headers
        </p>
        <div className="space-y-1">
          {Object.entries(results.securityHeaders ?? {}).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-[9px] font-mono">
              {v ? <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" /> : <XCircle className="w-3 h-3 text-red-400 shrink-0" />}
              <span className="text-slate-500 uppercase w-14 shrink-0">{k}</span>
              <span className={`truncate ${v ? "text-emerald-400/70" : "text-red-400/70"}`}>{v ? v.slice(0, 50) : "مفقود"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* IOCs */}
      {iocTypes.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 overflow-hidden">
          <button onClick={() => setShowIocs(!showIocs)}
            className="w-full flex items-center justify-between px-3 py-2 text-[9px] font-mono text-amber-400">
            <span className="flex items-center gap-1.5"><AlertCircle className="w-3 h-3" /> IOCs مكتشفة ({iocTypes.reduce((s, [, v]) => s + v.length, 0)})</span>
            {showIocs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {showIocs && (
            <div className="px-3 pb-3 space-y-2">
              {iocTypes.map(([type, vals]) => (
                <div key={type}>
                  <p className="text-[8px] font-mono text-slate-600 uppercase mb-1">{type} ({vals.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {vals.slice(0, 8).map((v, i) => (
                      <span key={i} className="text-[8px] font-mono px-1.5 py-0.5 rounded border border-amber-500/20 bg-amber-500/10 text-amber-300 truncate max-w-[140px]">{v}</span>
                    ))}
                    {vals.length > 8 && <span className="text-[8px] font-mono text-slate-600">+{vals.length - 8}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────────
export function DarkWebSearchModal({ open, onClose, onInjectToChat }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("tor");
  const [activeCategory, setActiveCategory] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState("");
  const [osintType, setOsintType] = useState(0);
  const [pulseRing, setPulseRing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [osintResults, setOsintResults] = useState<Record<string, OsintResult>>({});
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const currentLookup = OSINT_LOOKUPS[osintType];
  const currentResult = osintResults[currentLookup.id];

  useEffect(() => {
    if (open) setHistory(loadHistory());
  }, [open]);

  function inject(text: string) {
    const final = text.replace(/{TARGET}/g, targetInput || "[ضع الهدف هنا]");
    onInjectToChat(final);
    onClose();
    toast({ description: "تم إرسال الاستعلام للمحادثة" });
  }

  function copyText(text: string, id: string) {
    void navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  function exportJson() {
    if (!currentResult) return;
    const blob = new Blob([JSON.stringify(currentResult, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `osint-${currentLookup.id}-${targetInput}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ description: "تم تصدير نتيجة JSON" });
  }

  function exportReport() {
    if (!currentResult) return;
    const lines = [
      `# OSINT Intelligence Report`,
      `## Target: ${targetInput} (${currentLookup.label})`,
      `## Risk Level: ${currentResult.riskLevel.toUpperCase()}`,
      `## Generated: ${new Date().toLocaleString("ar")}`,
      ``,
      `## Sources`,
      ...Object.entries(currentResult.sources).map(([k, v]) =>
        `- ${k}: ${v.disabled ? "⚪ disabled" : v.success ? "✅ success" : "❌ failed"}`
      ),
      ``,
      `## AI Analysis`,
      currentResult.analysis || "(No AI analysis — model key not configured)",
      ``,
      `## Recommendations`,
      ...(currentResult.recommendations ?? []).map(r => `• ${r}`),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `osint-report-${currentLookup.id}-${targetInput}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ description: "تم تصدير التقرير كـ Markdown" });
  }

  function injectResult() {
    if (!currentResult) return;
    const text = `OSINT Report — ${currentLookup.label}: ${targetInput}\n\nRisk Level: ${currentResult.riskLevel.toUpperCase()}\n\n${currentResult.analysis}\n\nRecommendations:\n${currentResult.recommendations.map(r => `• ${r}`).join("\n")}`;
    onInjectToChat(text);
    onClose();
    toast({ description: "تم إرسال نتائج OSINT للمحادثة" });
  }

  function copyResult() {
    if (!currentResult) return;
    copyText(JSON.stringify(currentResult, null, 2), "result-copy");
    toast({ description: "تم نسخ النتائج" });
  }

  function clearHistory() {
    saveHistory([]);
    setHistory([]);
  }

  function loadFromHistory(entry: HistoryEntry) {
    const idx = OSINT_LOOKUPS.findIndex(l => l.id === entry.type);
    if (idx >= 0) setOsintType(idx);
    setTargetInput(entry.value);
    setShowHistory(false);
  }

  function handleQuickAction(type: OsintType, value: string) {
    const idx = OSINT_LOOKUPS.findIndex(l => l.id === type);
    if (idx >= 0) setOsintType(idx);
    setTargetInput(value);
    setShowAnalysis(false);
  }

  const LOADING_MESSAGES: Record<OsintType, string> = {
    email: "جارٍ الاستعلام من Have I Been Pwned و Hunter.io...",
    ip: "جارٍ الاستعلام من AbuseIPDB و ipapi.co و Shodan InternetDB...",
    domain: "جارٍ الاستعلام DNS و crt.sh و RDAP و Wayback Machine...",
    hash: "جارٍ الاستعلام من VirusTotal و MalwareBazaar...",
    username: "جارٍ التحقق من 20 منصة...",
    phone: "جارٍ تحليل رقم الهاتف...",
    url: "جارٍ فحص URL من مصادر متعددة...",
  };

  async function triggerScan() {
    if (!targetInput.trim()) {
      toast({ description: "أدخل الهدف أولاً" });
      return;
    }
    setPulseRing(true);
    setTimeout(() => setPulseRing(false), 2000);
    setLoading(true);
    setLoadingMsg(LOADING_MESSAGES[currentLookup.id]);
    setShowAnalysis(false);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const body: Record<string, string> = { language: "ar" };
      if (currentLookup.id === "email") body.email = targetInput.trim();
      else if (currentLookup.id === "ip") body.ip = targetInput.trim();
      else if (currentLookup.id === "domain") body.domain = targetInput.trim();
      else if (currentLookup.id === "hash") body.hash = targetInput.trim();
      else if (currentLookup.id === "username") body.username = targetInput.trim();
      else if (currentLookup.id === "phone") body.phone = targetInput.trim();
      else if (currentLookup.id === "url") body.url = targetInput.trim();

      const res = await fetch(`/api/osint/${currentLookup.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      const json = await res.json() as OsintResult;
      setOsintResults(prev => ({ ...prev, [currentLookup.id]: json }));
      addToHistory(currentLookup.id, targetInput.trim());
      setHistory(loadHistory());
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        toast({ description: "فشل الاستعلام. تحقق من الاتصال.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  }

  const TABS = [
    { id: "tor" as Tab, label: "قوالب Tor", icon: Globe },
    { id: "osint" as Tab, label: "OSINT", icon: Eye },
    { id: "threats" as Tab, label: "رصد التهديدات", icon: Radio },
    { id: "shodan" as Tab, label: "Shodan Scanner", icon: Network },
    { id: "darkweb" as Tab, label: "Dark Web Intel", icon: Lock },
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-2"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
          <motion.div
            className="relative w-full max-h-[96vh] flex flex-col overflow-hidden rounded-[18px] border border-[#1f1f1f] shadow-[0_0_80px_rgba(139,92,246,0.2)]"
            style={{ width: "clamp(340px, 40vw, 560px)", backdropFilter: "blur(40px)", background: "#070010" }}
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 24 }}
            transition={{ duration: 0.22 }}>

            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#8b5cf6]/80 to-transparent" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-8 bg-[#8b5cf6]/10 blur-xl" />

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3 pb-[10px] border-b border-[#1a1a2e] shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)" }}>
                  <Globe className="w-5 h-5 text-[#8b5cf6]" />
                  <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#8b5cf6] animate-pulse" />
                </div>
                <div>
                  <h2 className="text-[15px] font-black text-white">Dark Web Intelligence</h2>
                  <p className="text-[10px] font-mono" style={{ color: "rgba(139,92,246,0.7)" }}>OSINT · Tor · Threat Intel · Shodan Scanner</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-[9px] font-mono px-2 py-1 rounded-full border" style={{ color: "#8b5cf6", borderColor: "rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.08)" }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-pulse" />
                  DARK MODE ACTIVE
                </div>
                <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-white transition-colors hover:bg-white/5">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0.5 px-4 pt-2.5 shrink-0 overflow-x-auto no-scrollbar border-b border-[#1a1a2e]">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-[11px] font-semibold transition-all shrink-0 border-b-2 ${
                    tab === id ? "text-[#8b5cf6] border-[#8b5cf6] bg-[#8b5cf6]/10" : "text-slate-500 border-transparent hover:text-slate-300 hover:bg-white/5"
                  }`}>
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">

              {/* TOR TEMPLATES */}
              {tab === "tor" && (
                <div className="flex h-full" style={{ minHeight: "400px" }}>
                  <div className="w-40 border-r border-[#1a1a2e] p-2 space-y-1 shrink-0">
                    {TOR_CATEGORIES.map((cat, i) => {
                      const Icon = cat.icon;
                      return (
                        <button key={cat.id} onClick={() => setActiveCategory(i)}
                          className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-[11px] font-semibold transition-all ${
                            activeCategory === i ? "text-white" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                          }`}
                          style={activeCategory === i ? { background: cat.glow, borderLeft: `2px solid ${cat.color}` } : {}}>
                          <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: activeCategory === i ? cat.color : undefined }} />
                          <span className="truncate">{cat.label}</span>
                        </button>
                      );
                    })}
                    <div className="pt-2 border-t border-[#1a1a2e] mt-2">
                      <p className="text-[9px] text-slate-600 mb-1 px-1">الهدف (اختياري)</p>
                      <input value={targetInput} onChange={(e) => setTargetInput(e.target.value)}
                        placeholder="example.com"
                        className="w-full bg-[#0a0015] border border-[#1a1a2e] rounded-lg px-2 py-1.5 text-[10px] font-mono text-slate-300 outline-none focus:border-[#8b5cf6]/50 placeholder:text-slate-700"
                        dir="ltr" />
                    </div>
                  </div>
                  <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                    {TOR_CATEGORIES[activeCategory].templates.map((tpl, i) => {
                      const cat = TOR_CATEGORIES[activeCategory];
                      return (
                        <div key={i} className="rounded-xl border p-3.5 transition-all group hover:border-opacity-40"
                          style={{ borderColor: cat.color + "22", background: "rgba(0,0,0,0.3)" }}>
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div>
                              <p className="text-[12px] font-bold text-white">{tpl.title}</p>
                              <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{tpl.desc}</p>
                            </div>
                            <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => copyText(tpl.prompt, `tpl-${i}`)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
                                {copiedId === `tpl-${i}` ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                              <button onClick={() => inject(tpl.prompt)}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white transition-colors"
                                style={{ background: cat.color }}>
                                <ArrowRight className="w-3 h-3" /> إرسال
                              </button>
                            </div>
                          </div>
                          <div className="text-[9px] font-mono rounded-lg px-3 py-2 line-clamp-2" style={{ background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.3)" }}>
                            {tpl.prompt.substring(0, 120)}...
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* OSINT — Real Intelligence System */}
              {tab === "osint" && (
                <div className="p-4 space-y-3">
                  {/* Type selector */}
                  <div className="flex gap-1.5 flex-wrap">
                    {OSINT_LOOKUPS.map((l, i) => {
                      const Icon = l.icon;
                      const hasResult = !!osintResults[l.id];
                      return (
                        <button key={l.id} onClick={() => { setOsintType(i); setShowAnalysis(false); }}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all relative ${
                            osintType === i ? "text-white" : "text-slate-500 border-[#1a1a2e] hover:text-slate-300 hover:border-slate-600"
                          }`}
                          style={osintType === i ? { background: l.color + "22", borderColor: l.color + "55", color: l.color } : {}}>
                          <Icon className="w-3.5 h-3.5" /> {l.label}
                          {hasResult && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Input */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-xl opacity-30 blur-sm" style={{ background: currentLookup.color }} />
                    <div className="relative rounded-xl border p-1" style={{ borderColor: currentLookup.color + "40", background: "rgba(0,0,0,0.6)" }}>
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        {(() => { const Icon = currentLookup.icon; return <Icon className="w-4 h-4 shrink-0" style={{ color: currentLookup.color }} />; })()}
                        <input value={targetInput} onChange={(e) => setTargetInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && void triggerScan()}
                          placeholder={currentLookup.placeholder}
                          dir="ltr"
                          className="flex-1 bg-transparent text-[12px] font-mono text-white outline-none placeholder:text-slate-600" />
                        <button onClick={() => setShowHistory(!showHistory)}
                          className={`p-1 rounded-lg transition-colors ${showHistory ? "text-[#8b5cf6] bg-[#8b5cf6]/10" : "text-slate-600 hover:text-slate-400"}`}
                          title="سجل البحث">
                          <History className="w-3.5 h-3.5" />
                        </button>
                        {pulseRing && <div className="w-2 h-2 rounded-full animate-ping" style={{ background: currentLookup.color }} />}
                      </div>
                    </div>
                  </div>

                  {/* Search history dropdown */}
                  {showHistory && history.length > 0 && (
                    <div className="rounded-xl border border-[#1a1a2e] bg-[#080012] overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a1a2e]">
                        <p className="text-[9px] font-mono text-slate-600 uppercase flex items-center gap-1"><History className="w-2.5 h-2.5" /> سجل البحث</p>
                        <button onClick={clearHistory} className="text-[8px] font-mono text-slate-700 hover:text-red-400 flex items-center gap-1 transition-colors">
                          <Trash2 className="w-2.5 h-2.5" /> مسح
                        </button>
                      </div>
                      <div className="max-h-40 overflow-y-auto">
                        {history.slice(0, 15).map((entry, i) => {
                          const lookup = OSINT_LOOKUPS.find(l => l.id === entry.type);
                          if (!lookup) return null;
                          const Icon = lookup.icon;
                          return (
                            <button key={i} onClick={() => loadFromHistory(entry)}
                              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left border-b border-[#1a1a2e]/50 last:border-0">
                              <Icon className="w-3 h-3 shrink-0" style={{ color: lookup.color }} />
                              <span className="text-[10px] font-mono text-slate-400 flex-1 truncate" dir="ltr">{entry.value}</span>
                              <span className="text-[8px] font-mono px-1 py-0.5 rounded" style={{ background: lookup.color + "20", color: lookup.color }}>{lookup.label}</span>
                              <span className="text-[8px] font-mono text-slate-700 shrink-0">{new Date(entry.ts).toLocaleTimeString("ar")}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {showHistory && history.length === 0 && (
                    <p className="text-[10px] font-mono text-slate-600 text-center py-2">لا يوجد سجل بحث بعد</p>
                  )}

                  {/* Scan button */}
                  <button onClick={() => void triggerScan()} disabled={loading}
                    className="w-full py-2.5 rounded-xl text-[12px] font-black text-white transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    style={{ background: loading ? "rgba(139,92,246,0.2)" : `linear-gradient(135deg, ${currentLookup.color}, ${currentLookup.color}99)`, boxShadow: loading ? "none" : `0 0 20px ${currentLookup.color}40` }}>
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {loading ? "جارٍ الفحص..." : `فحص ${currentLookup.label}`}
                  </button>

                  {/* Loading */}
                  {loading && <LoadingPulse text={loadingMsg} />}

                  {/* Results */}
                  {!loading && currentResult && !currentResult.error && (
                    <div className="space-y-3">
                      {/* Toolbar */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1 flex-wrap flex-1">
                          {Object.entries(currentResult.sources).map(([name, info]) => (
                            <SourceTag key={name} name={name} info={info} />
                          ))}
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <button onClick={copyResult} title="نسخ JSON"
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#1a1a2e] bg-black/30 text-slate-500 hover:text-white hover:border-slate-600 transition-colors">
                            {copiedId === "result-copy" ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={exportJson} title="تصدير JSON"
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#1a1a2e] bg-black/30 text-slate-500 hover:text-white hover:border-slate-600 transition-colors">
                            <Download className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={exportReport} title="تصدير تقرير Markdown"
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#1a1a2e] bg-black/30 text-slate-500 hover:text-white hover:border-slate-600 transition-colors">
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={injectResult} title="إرسال للمحادثة"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white transition-colors"
                            style={{ background: currentLookup.color + "99" }}>
                            <MessageSquare className="w-3 h-3" /> إرسال
                          </button>
                        </div>
                      </div>

                      {/* Result cards */}
                      {currentLookup.id === "email" && <EmailResults data={currentResult} color={currentLookup.color} onQuickAction={handleQuickAction} />}
                      {currentLookup.id === "ip" && <IpResults data={currentResult} color={currentLookup.color} onQuickAction={handleQuickAction} />}
                      {currentLookup.id === "domain" && <DomainResults data={currentResult} color={currentLookup.color} onQuickAction={handleQuickAction} />}
                      {currentLookup.id === "hash" && <HashResults data={currentResult} color={currentLookup.color} />}
                      {currentLookup.id === "username" && <UsernameResults data={currentResult} color={currentLookup.color} />}
                      {currentLookup.id === "phone" && <PhoneResults data={currentResult} color={currentLookup.color} />}
                      {currentLookup.id === "url" && <UrlResults data={currentResult} color={currentLookup.color} />}

                      {/* AI Analysis toggle */}
                      <button onClick={() => setShowAnalysis(!showAnalysis)}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl border border-[#1a1a2e] bg-black/40 hover:bg-black/60 transition-colors">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-3.5 h-3.5 text-[#8b5cf6]" />
                          <span className="text-[11px] font-bold text-white">التحليل الذكي</span>
                          {!currentResult.analysis && <span className="text-[9px] font-mono text-slate-600">(يتطلب مفتاح نموذج AI)</span>}
                        </div>
                        {showAnalysis ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                      </button>

                      {showAnalysis && (
                        <div className="rounded-xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/5 p-4 space-y-3">
                          <RiskBadge level={currentResult.riskLevel} />
                          {currentResult.analysis ? (
                            <MarkdownBlock content={currentResult.analysis} />
                          ) : (
                            <p className="text-[10px] text-slate-600 font-mono">
                              لم يُولَّد تحليل — أضف مفتاح نموذج AI في الإعدادات لتفعيل هذه الميزة.
                            </p>
                          )}
                          {currentResult.recommendations?.length > 0 && (
                            <div className="border-t border-[#1a1a2e] pt-3">
                              <p className="text-[10px] font-bold text-slate-300 mb-2">التوصيات</p>
                              {currentResult.recommendations.map((r, i) => (
                                <div key={i} className="flex gap-2 text-[10px] text-slate-400 mb-1">
                                  <span className="text-[#8b5cf6] shrink-0">▸</span>
                                  <span>{r}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error state */}
                  {!loading && currentResult?.error && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5">
                      <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                      <div>
                        <p className="text-[11px] font-bold text-red-400">فشل الاستعلام</p>
                        <p className="text-[10px] text-red-400/60">{currentResult.error}</p>
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {!loading && !currentResult && (
                    <div className="flex flex-col items-center gap-3 py-8 text-center">
                      {(() => { const Icon = currentLookup.icon; return <Icon className="w-10 h-10 opacity-20" style={{ color: currentLookup.color }} />; })()}
                      <p className="text-[12px] font-bold text-slate-500">أدخل {currentLookup.label} وابدأ الفحص</p>
                      <p className="text-[10px] text-slate-700 font-mono max-w-[240px]">
                        {currentLookup.id === "email" && "HIBP · Hunter.io · DNS MX Security"}
                        {currentLookup.id === "ip" && "AbuseIPDB · ipapi.co · ip-api.com · Shodan InternetDB"}
                        {currentLookup.id === "domain" && "DNS · crt.sh · RDAP · Wayback Machine · MX Security"}
                        {currentLookup.id === "hash" && "VirusTotal · MalwareBazaar"}
                        {currentLookup.id === "username" && "20 منصة: GitHub, GitLab, npm, Docker, Reddit, HackerOne, Telegram, ..."}
                        {currentLookup.id === "phone" && "Numverify · Country Code Parser"}
                        {currentLookup.id === "url" && "HTTP Fetch · VirusTotal URL · URLScan.io · Security Headers"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* THREAT MONITOR */}
              {tab === "threats" && (
                <div className="p-4 space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 mb-3 flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-[#e21227] animate-pulse" />
                    استخبارات التهديدات السيبرانية الحديثة
                  </p>
                  {THREAT_KEYWORDS.map((kw, i) => (
                    <button key={i} onClick={() => inject(kw.prompt)}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:border-opacity-50 hover:bg-white/5 group"
                      style={{ borderColor: kw.color + "22" }}>
                      <div className="w-2 h-2 rounded-full shrink-0 group-hover:animate-pulse" style={{ background: kw.color }} />
                      <span className="flex-1 text-[12px] font-bold text-white group-hover:text-slate-100">{kw.label}</span>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white transition-colors" />
                    </button>
                  ))}
                </div>
              )}

              {/* SHODAN SCANNER */}
              {tab === "shodan" && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-[#e21227] animate-pulse" />
                    <p className="text-[11px] font-bold text-slate-400">قوالب Shodan لكشف الأصول المكشوفة</p>
                  </div>
                  {SHODAN_TEMPLATES.map((tpl, i) => (
                    <div key={i} className="rounded-xl border p-3.5 transition-all group hover:border-opacity-40"
                      style={{ borderColor: tpl.color + "22", background: "rgba(0,0,0,0.3)" }}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-bold text-white">{tpl.title}</p>
                          <code className="text-[8px] font-mono text-slate-600 truncate block mt-1">{tpl.query}</code>
                        </div>
                        <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => copyText(tpl.query, `sq-${i}`)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
                            {copiedId === `sq-${i}` ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => inject(tpl.prompt)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white transition-colors"
                            style={{ background: tpl.color }}>
                            <ArrowRight className="w-3 h-3" /> تحليل
                          </button>
                        </div>
                      </div>
                      <div className="text-[9px] font-mono rounded-lg px-3 py-2 line-clamp-2" style={{ background: "rgba(0,0,0,0.4)", color: "rgba(255,255,255,0.3)" }}>
                        {tpl.prompt.substring(0, 100)}...
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* DARK WEB INTEL */}
              {tab === "darkweb" && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#8b5cf6]/20 bg-[#8b5cf6]/5 mb-3">
                    <Lock className="w-3.5 h-3.5 text-[#8b5cf6]" />
                    <p className="text-[10px] text-[#8b5cf6]/80 font-mono">نماذج استخباراتية لتحليل الويب المظلم</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    <div className="pt-2 border-t border-[#1a1a2e]">
                      <p className="text-[9px] text-slate-600 mb-1 px-1">الهدف</p>
                      <input value={targetInput} onChange={(e) => setTargetInput(e.target.value)}
                        placeholder="اسم شركة / نطاق / جهة تهديد"
                        className="w-full bg-[#0a0015] border border-[#1a1a2e] rounded-lg px-3 py-2 text-[11px] font-mono text-slate-300 outline-none focus:border-[#8b5cf6]/50 placeholder:text-slate-700 mb-3" />
                    </div>
                    {TOR_CATEGORIES.find(c => c.id === "darkweb")?.templates.map((tpl, i) => (
                      <div key={i} className="rounded-xl border border-[#8b5cf6]/20 p-3.5 bg-[#8b5cf6]/5 group hover:border-[#8b5cf6]/40 transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[12px] font-bold text-white">{tpl.title}</p>
                            <p className="text-[10px] mt-0.5 text-[#8b5cf6]/60">{tpl.desc}</p>
                          </div>
                          <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => copyText(tpl.prompt, `dw-${i}`)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-500 hover:text-white">
                              {copiedId === `dw-${i}` ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => inject(tpl.prompt)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-[#8b5cf6]">
                              <ArrowRight className="w-3 h-3" /> إرسال
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
