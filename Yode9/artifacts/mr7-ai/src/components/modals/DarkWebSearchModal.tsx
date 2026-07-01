import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Globe, Shield, Eye, AlertTriangle, Terminal, Copy, CheckCheck,
  Zap, Lock, Network, Database, Activity, Target, Crosshair, Radio,
  FileSearch, Hash, Mail, Smartphone, User, Server, Wifi, Key,
  ChevronRight, ExternalLink, Bug, Cpu, ArrowRight, Layers,
  Download, MessageSquare, RefreshCw, CheckCircle, XCircle, AlertCircle,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onInjectToChat: (text: string) => void;
}

type Tab = "tor" | "osint" | "threats" | "shodan" | "darkweb";
type OsintType = "email" | "ip" | "domain" | "hash" | "username" | "phone";
type RiskLevel = "low" | "medium" | "high" | "critical";

interface OsintResult {
  sources: Record<string, { success: boolean; error?: string; disabled?: boolean }>;
  results: Record<string, unknown>;
  analysis: string;
  riskLevel: RiskLevel;
  recommendations: string[];
  error?: string;
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
  { id: "email", label: "Email", icon: Mail, color: "#3b82f6", placeholder: "target@domain.com", promptFallback: (v) => `OSINT شامل للبريد الإلكتروني: ${v}\nالمصادر: Have I Been Pwned, Hunter.io, Breach databases` },
  { id: "ip", label: "IP Address", icon: Network, color: "#e21227", placeholder: "8.8.8.8", promptFallback: (v) => `تحليل IP شامل: ${v}\nالمصادر: AbuseIPDB, ipapi.co, ip-api.com` },
  { id: "domain", label: "Domain", icon: Globe, color: "#10b981", placeholder: "target.com", promptFallback: (v) => `تحليل استخباراتي للدومين: ${v}\nالمصادر: DNS, crt.sh, RDAP/WHOIS` },
  { id: "username", label: "Username", icon: User, color: "#8b5cf6", placeholder: "h4ck3r_name", promptFallback: (v) => `OSINT لاسم المستخدم: ${v}\nالمنصات: GitHub, GitLab, Reddit, HackerOne, Bugcrowd, Keybase, Telegram, Medium, Dev.to, Pastebin` },
  { id: "phone", label: "Phone Number", icon: Smartphone, color: "#f59e0b", placeholder: "+1234567890", promptFallback: (v) => `OSINT لرقم الهاتف: ${v}\nالمصادر: Numverify, carrier lookup` },
  { id: "hash", label: "File Hash", icon: Hash, color: "#06b6d4", placeholder: "d41d8cd98f00b204e9800998ecf8427e", promptFallback: (v) => `تحليل hash الملف: ${v}\nالمصادر: VirusTotal (MD5/SHA1/SHA256)` },
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

function EmailResults({ data, color }: { data: OsintResult; color: string }) {
  const results = data.results as { email: string; breaches: { Name: string; BreachDate: string; PwnCount: number; DataClasses: string[] }[]; breachCount: number; hunter: unknown };
  const breaches = results.breaches ?? [];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono text-slate-500">البريد المُفحوص:</span>
        <code className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(59,130,246,0.1)", color }}>{results.email}</code>
        <RiskBadge level={data.riskLevel} />
      </div>
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
              <p className="text-[10px] text-slate-500 mb-2">
                {b.PwnCount ? `${b.PwnCount.toLocaleString()} حساب متأثر` : ""}
              </p>
              <div className="flex flex-wrap gap-1">
                {(b.DataClasses ?? []).map((dc: string) => (
                  <span key={dc} className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(226,18,39,0.15)", color: "#fca5a5" }}>{dc}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function IpResults({ data, color }: { data: OsintResult; color: string }) {
  const results = data.results as {
    ip: string;
    abuseScore: number;
    abuseData: { data?: { countryCode?: string; usageType?: string; isp?: string; totalReports?: number; domain?: string; hostnames?: string[] } } | null;
    ipapiData: { city?: string; region?: string; country_name?: string; org?: string; latitude?: number; longitude?: number } | null;
    ipApiData: { city?: string; country?: string; countryCode?: string; regionName?: string; isp?: string; org?: string; as?: string; lat?: number; lon?: number; mobile?: boolean; proxy?: boolean; hosting?: boolean; timezone?: string } | null;
  };
  const abuse = results.abuseData?.data;
  const geo = results.ipapiData;
  const geoAlt = results.ipApiData;
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
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(226,18,39,0.1)", color }}>{results.ip}</code>
        <RiskBadge level={data.riskLevel} />
        {isProxy && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-400 bg-amber-500/10">PROXY</span>}
        {isHosting && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-blue-500/30 text-blue-400 bg-blue-500/10">HOSTING</span>}
        {isMobile && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-purple-500/30 text-purple-400 bg-purple-500/10">MOBILE</span>}
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
      <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
        {abuse?.usageType && <div className="px-2 py-1.5 rounded-lg border border-[#1a1a2e] bg-black/20"><span className="text-slate-600">نوع الاستخدام: </span><span className="text-slate-300">{abuse.usageType}</span></div>}
        {geoAlt?.timezone && <div className="px-2 py-1.5 rounded-lg border border-[#1a1a2e] bg-black/20"><span className="text-slate-600">المنطقة الزمنية: </span><span className="text-slate-300">{geoAlt.timezone}</span></div>}
        {abuse?.domain && <div className="px-2 py-1.5 rounded-lg border border-[#1a1a2e] bg-black/20 col-span-2"><span className="text-slate-600">الدومين: </span><span className="text-slate-300">{abuse.domain}</span></div>}
      </div>
    </div>
  );
}

function DomainResults({ data, color }: { data: OsintResult; color: string }) {
  const results = data.results as { domain: string; dnsRecords: { a: string[]; aaaa: string[]; mx: { exchange: string; priority: number }[]; txt: string[][]; ns: string[]; soa: { nsname?: string } | null }; subdomains: string[]; sslCount: number };
  const dns = results.dnsRecords ?? {};
  const [showAllSubs, setShowAllSubs] = useState(false);
  const visibleSubs = showAllSubs ? results.subdomains : results.subdomains?.slice(0, 12);

  const DNS_TYPES = [
    { key: "a", label: "A", color: "#3b82f6", items: dns.a?.map(v => ({ v })) ?? [] },
    { key: "aaaa", label: "AAAA", color: "#8b5cf6", items: dns.aaaa?.map(v => ({ v })) ?? [] },
    { key: "mx", label: "MX", color: "#10b981", items: dns.mx?.map(r => ({ v: `${r.exchange} (priority: ${r.priority})` })) ?? [] },
    { key: "ns", label: "NS", color: "#f59e0b", items: dns.ns?.map(v => ({ v })) ?? [] },
    { key: "txt", label: "TXT", color: "#06b6d4", items: dns.txt?.map(r => ({ v: r.join(" ").slice(0, 80) })) ?? [] },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(16,185,129,0.1)", color }}>{results.domain}</code>
        <RiskBadge level={data.riskLevel} />
        <span className="text-[9px] font-mono text-slate-600">{results.sslCount} شهادة SSL تاريخية</span>
      </div>
      <div className="space-y-1.5">
        <p className="text-[9px] text-slate-600 font-mono uppercase">DNS Records</p>
        {DNS_TYPES.filter(t => t.items.length > 0).map(t => (
          <div key={t.key} className="rounded-lg border border-[#1a1a2e] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-1.5" style={{ background: `${t.color}11` }}>
              <span className="text-[9px] font-black font-mono px-1.5 py-0.5 rounded" style={{ background: `${t.color}22`, color: t.color }}>{t.label}</span>
            </div>
            <div className="px-3 py-2 space-y-0.5">
              {t.items.map((item, i) => (
                <p key={i} className="text-[9px] font-mono text-slate-400">{item.v}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
      {results.subdomains?.length > 0 && (
        <div>
          <p className="text-[9px] text-slate-600 font-mono uppercase mb-2">Subdomains ({results.subdomains.length} مكتشف)</p>
          <div className="flex flex-wrap gap-1.5">
            {visibleSubs?.map((s, i) => (
              <span key={i} className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-[#1a1a2e] text-slate-400" style={{ background: "rgba(0,0,0,0.4)" }}>{s}</span>
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
    </div>
  );
}

function HashResults({ data, color }: { data: OsintResult; color: string }) {
  const results = data.results as { hash: string; hashType: string; detectionRatio: number; maliciousCount: number; totalEngines: number; fileInfo: { name?: string; type?: string; size?: number; firstSeen?: number } | null; vtData: { data?: { attributes?: { last_analysis_results?: Record<string, { category: string; engine_name: string; result?: string }> } } } | null };
  const ratio = results.detectionRatio ?? 0;
  const ratioColor = ratio > 50 ? "#e21227" : ratio > 15 ? "#f59e0b" : "#10b981";
  const engines = Object.entries(results.vtData?.data?.attributes?.last_analysis_results ?? {})
    .filter(([, v]) => v.category === "malicious" || v.category === "suspicious")
    .slice(0, 20);
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
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-[9px] font-mono text-slate-600 mb-1">
            <span>{results.maliciousCount} اكتشاف</span>
            <span>{results.totalEngines} محرك</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#1a1a2e]">
            <div className="h-full rounded-full" style={{ width: `${ratio}%`, background: ratioColor }} />
          </div>
        </div>
      </div>
      {results.fileInfo && (
        <div className="grid grid-cols-2 gap-2 text-[9px] font-mono">
          {results.fileInfo.name && <div className="px-2 py-1.5 rounded-lg border border-[#1a1a2e] bg-black/20"><span className="text-slate-600">الاسم: </span><span className="text-slate-300">{String(results.fileInfo.name).slice(0, 30)}</span></div>}
          {results.fileInfo.type && <div className="px-2 py-1.5 rounded-lg border border-[#1a1a2e] bg-black/20"><span className="text-slate-600">النوع: </span><span className="text-slate-300">{results.fileInfo.type}</span></div>}
          {results.fileInfo.size && <div className="px-2 py-1.5 rounded-lg border border-[#1a1a2e] bg-black/20"><span className="text-slate-600">الحجم: </span><span className="text-slate-300">{(results.fileInfo.size / 1024).toFixed(1)} KB</span></div>}
          {results.fileInfo.firstSeen && <div className="px-2 py-1.5 rounded-lg border border-[#1a1a2e] bg-black/20"><span className="text-slate-600">أول ظهور: </span><span className="text-slate-300">{new Date(results.fileInfo.firstSeen * 1000).toLocaleDateString()}</span></div>}
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

function UsernameResults({ data, color }: { data: OsintResult; color: string }) {
  const results = data.results as { username: string; platformResults: { platform: string; url: string; found: boolean; status: number; error?: string }[]; foundCount: number; totalChecked: number };
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.1)", color }}>@{results.username}</code>
        <span className="text-[10px] font-mono text-[#8b5cf6]">{results.foundCount}/{results.totalChecked} منصة</span>
        <RiskBadge level={data.riskLevel} />
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {results.platformResults?.map((p, i) => (
          <a key={i} href={p.found ? p.url : undefined} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${p.found ? "hover:border-opacity-60 cursor-pointer" : "opacity-50 cursor-default"}`}
            style={{
              borderColor: p.found ? `${color}40` : "#1a1a2e",
              background: p.found ? `${color}08` : "rgba(0,0,0,0.2)",
            }}>
            {p.found ? <CheckCircle className="w-3.5 h-3.5 shrink-0" style={{ color }} /> : <XCircle className="w-3.5 h-3.5 shrink-0 text-slate-700" />}
            <span className="text-[10px] font-semibold" style={{ color: p.found ? "white" : "#64748b" }}>{p.platform}</span>
            {p.found && <ExternalLink className="w-2.5 h-2.5 ml-auto shrink-0" style={{ color }} />}
          </a>
        ))}
      </div>
    </div>
  );
}

function PhoneResults({ data, color }: { data: OsintResult; color: string }) {
  const results = data.results as { phone: string; numverifyData: { valid?: boolean; number?: string; local_format?: string; international_format?: string; country_prefix?: string; country_code?: string; country_name?: string; location?: string; carrier?: string; line_type?: string } | null };
  const nd = results.numverifyData;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <code className="text-[11px] font-mono px-2 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.1)", color }}>{results.phone}</code>
        <RiskBadge level={data.riskLevel} />
      </div>
      {nd ? (
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          {nd.valid !== undefined && <div className="col-span-2 flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1a1a2e] bg-black/20">
            {nd.valid ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
            <span className="text-slate-400">الرقم {nd.valid ? "صالح" : "غير صالح"}</span>
          </div>}
          {nd.country_name && <div className="px-2 py-1.5 rounded-lg border border-[#1a1a2e] bg-black/20"><span className="text-slate-600">الدولة: </span><span className="text-slate-300">{nd.country_name}</span></div>}
          {nd.location && <div className="px-2 py-1.5 rounded-lg border border-[#1a1a2e] bg-black/20"><span className="text-slate-600">الموقع: </span><span className="text-slate-300">{nd.location}</span></div>}
          {nd.carrier && <div className="px-2 py-1.5 rounded-lg border border-[#1a1a2e] bg-black/20"><span className="text-slate-600">الشبكة: </span><span className="text-slate-300">{nd.carrier}</span></div>}
          {nd.line_type && <div className="px-2 py-1.5 rounded-lg border border-[#1a1a2e] bg-black/20"><span className="text-slate-600">نوع الخط: </span><span className="text-slate-300">{nd.line_type}</span></div>}
          {nd.international_format && <div className="col-span-2 px-2 py-1.5 rounded-lg border border-[#1a1a2e] bg-black/20"><span className="text-slate-600">الصيغة الدولية: </span><span className="text-slate-300">{nd.international_format}</span></div>}
        </div>
      ) : (
        <div className="px-4 py-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-[10px] text-amber-400/70">
          تفعيل NUMVERIFY_API_KEY مطلوب لعرض بيانات الرقم. احصل عليه من numverify.com (مجاني: 100 طلب/شهر)
        </div>
      )}
    </div>
  );
}

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
  const abortRef = useRef<AbortController | null>(null);

  const currentLookup = OSINT_LOOKUPS[osintType];
  const currentResult = osintResults[currentLookup.id];

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
  }

  function injectResult() {
    if (!currentResult) return;
    const text = `OSINT Report — ${currentLookup.label}: ${targetInput}

Risk Level: ${currentResult.riskLevel.toUpperCase()}

${currentResult.analysis}

Recommendations:
${currentResult.recommendations.map(r => `• ${r}`).join("\n")}`;
    onInjectToChat(text);
    onClose();
    toast({ description: "تم إرسال نتائج OSINT للمحادثة" });
  }

  function copyResult() {
    if (!currentResult) return;
    copyText(JSON.stringify(currentResult, null, 2), "result-copy");
    toast({ description: "تم نسخ النتائج" });
  }

  const LOADING_MESSAGES: Record<OsintType, string> = {
    email: "جارٍ الاستعلام من Have I Been Pwned و Hunter.io...",
    ip: "جارٍ الاستعلام من AbuseIPDB و ipapi.co...",
    domain: "جارٍ الاستعلام DNS و crt.sh و RDAP/WHOIS...",
    hash: "جارٍ الاستعلام من VirusTotal...",
    username: "جارٍ التحقق من المنصات المتعددة...",
    phone: "جارٍ الاستعلام من Numverify...",
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

      const res = await fetch(`/api/osint/${currentLookup.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      const json = await res.json() as OsintResult;
      setOsintResults(prev => ({ ...prev, [currentLookup.id]: json }));
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
                          onKeyDown={(e) => { if (e.key === "Enter" && !loading) triggerScan(); }}
                          placeholder={currentLookup.placeholder}
                          className="flex-1 bg-transparent outline-none text-[14px] font-mono text-white placeholder:text-slate-700"
                          dir="ltr" disabled={loading} />
                        <button onClick={loading ? undefined : triggerScan} disabled={loading}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold text-white transition-all ${pulseRing ? "animate-pulse" : ""} ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
                          style={{ background: currentLookup.color }}>
                          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                          {loading ? "جارٍ..." : "ابدأ البحث"}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Loading state */}
                  {loading && <LoadingPulse text={loadingMsg} />}

                  {/* Results */}
                  {!loading && currentResult && !currentResult.error && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                      {/* Toolbar */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(currentResult.sources).map(([name, info]) => (
                            <SourceTag key={name} name={name} info={info} />
                          ))}
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={copyResult} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-mono border border-[#1a1a2e] text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
                            {copiedId === "result-copy" ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />} نسخ
                          </button>
                          <button onClick={exportJson} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-mono border border-[#1a1a2e] text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
                            <Download className="w-3 h-3" /> JSON
                          </button>
                          <button onClick={injectResult} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-mono border border-[#8b5cf6]/30 text-[#8b5cf6] hover:bg-[#8b5cf6]/10 transition-colors">
                            <MessageSquare className="w-3 h-3" /> حقن
                          </button>
                        </div>
                      </div>

                      {/* Type-specific results */}
                      <div className="rounded-xl border border-[#1a1a2e] p-4 bg-black/30">
                        {currentLookup.id === "email" && <EmailResults data={currentResult} color={currentLookup.color} />}
                        {currentLookup.id === "ip" && <IpResults data={currentResult} color={currentLookup.color} />}
                        {currentLookup.id === "domain" && <DomainResults data={currentResult} color={currentLookup.color} />}
                        {currentLookup.id === "hash" && <HashResults data={currentResult} color={currentLookup.color} />}
                        {currentLookup.id === "username" && <UsernameResults data={currentResult} color={currentLookup.color} />}
                        {currentLookup.id === "phone" && <PhoneResults data={currentResult} color={currentLookup.color} />}
                      </div>

                      {/* AI Analysis */}
                      {currentResult.analysis && (
                        <div className="rounded-xl border border-[#8b5cf6]/20 overflow-hidden">
                          <button onClick={() => setShowAnalysis(!showAnalysis)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#8b5cf6]/5 transition-colors">
                            <div className="flex items-center gap-2">
                              <Cpu className="w-3.5 h-3.5 text-[#8b5cf6]" />
                              <span className="text-[11px] font-bold text-[#8b5cf6]">التحليل الذكي</span>
                              <RiskBadge level={currentResult.riskLevel} />
                            </div>
                            {showAnalysis ? <ChevronUp className="w-3.5 h-3.5 text-[#8b5cf6]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#8b5cf6]" />}
                          </button>
                          {showAnalysis && (
                            <div className="px-4 pb-4 space-y-3 border-t border-[#8b5cf6]/10" style={{ background: "rgba(139,92,246,0.04)" }}>
                              <div className="pt-3">
                                <MarkdownBlock content={currentResult.analysis} />
                              </div>
                              {currentResult.recommendations.length > 0 && (
                                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-1.5">
                                  <p className="text-[10px] font-bold text-amber-400 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3 h-3" /> التوصيات
                                  </p>
                                  {currentResult.recommendations.map((r, i) => (
                                    <p key={i} className="text-[10px] text-amber-400/70 flex gap-2">
                                      <span className="shrink-0">▸</span>{r}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* Error state */}
                  {!loading && currentResult?.error && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-red-500/20 bg-red-500/5">
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <p className="text-[11px] text-red-400">{currentResult.error}</p>
                    </div>
                  )}

                  {/* Empty state — show prompt preview */}
                  {!loading && !currentResult && (
                    <div className="rounded-xl border border-[#1a1a2e] p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
                      <p className="text-[10px] text-slate-600 mb-2 font-mono uppercase">معاينة ما سيُفحص</p>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-mono whitespace-pre-line">
                        {currentLookup.promptFallback(targetInput || currentLookup.placeholder)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* THREATS */}
              {tab === "threats" && (
                <div className="p-4 space-y-2.5">
                  <div className="flex items-center gap-2 mb-3">
                    <Radio className="w-4 h-4 text-[#8b5cf6]" />
                    <p className="text-[13px] font-black text-white">رصد التهديدات الأمنية</p>
                    <span className="text-[9px] font-mono text-[#8b5cf6] bg-[#8b5cf6]/10 border border-[#8b5cf6]/30 px-2 py-0.5 rounded-full">LIVE INTEL</span>
                  </div>
                  {THREAT_KEYWORDS.map((t, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all group cursor-pointer hover:border-opacity-40"
                      style={{ borderColor: t.color + "22", background: "rgba(0,0,0,0.3)" }}
                      onClick={() => inject(t.prompt)}>
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ background: t.color }} />
                      <div className="flex-1">
                        <p className="text-[12px] font-bold text-white">{t.label}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{t.prompt.split("\n")[0]}</p>
                      </div>
                      <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); copyText(t.prompt, `threat-${i}`); }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-500 hover:text-white">
                          {copiedId === `threat-${i}` ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                        <ArrowRight className="w-4 h-4 self-center" style={{ color: t.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* SHODAN */}
              {tab === "shodan" && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Network className="w-4 h-4 text-[#06b6d4]" />
                    <p className="text-[13px] font-black text-white">Shodan Intelligence Scanner</p>
                    <span className="text-[9px] font-mono px-2 py-0.5 rounded-full border" style={{ color: "#06b6d4", borderColor: "rgba(6,182,212,0.3)", background: "rgba(6,182,212,0.08)" }}>INTERNET-WIDE SCAN</span>
                  </div>
                  <div className="grid gap-2.5">
                    {SHODAN_TEMPLATES.map((s, i) => (
                      <div key={i} className="rounded-xl border p-3.5 group transition-all"
                        style={{ borderColor: s.color + "22", background: "rgba(0,0,0,0.3)" }}>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <p className="text-[12px] font-bold text-white">{s.title}</p>
                            <code className="text-[9px] font-mono px-2 py-0.5 rounded mt-1 inline-block" style={{ background: "rgba(0,0,0,0.5)", color: s.color }}>
                              {s.query}
                            </code>
                          </div>
                          <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => copyText(s.query, `shodan-q-${i}`)}
                              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-500 hover:text-white transition-colors">
                              {copiedId === `shodan-q-${i}` ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                            <button onClick={() => inject(s.prompt)}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold text-white"
                              style={{ background: s.color }}>
                              <Zap className="w-3 h-3" /> تحليل
                            </button>
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-2">{s.prompt.split("\n\n")[0]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DARK WEB INTEL */}
              {tab === "darkweb" && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Lock className="w-4 h-4 text-[#8b5cf6]" />
                    <p className="text-[13px] font-black text-white">Dark Web Intelligence</p>
                  </div>
                  {TOR_CATEGORIES.find(c => c.id === "darkweb")?.templates.map((tpl, i) => (
                    <div key={i} className="rounded-xl border p-4 group transition-all"
                      style={{ borderColor: "#8b5cf6" + "22", background: "rgba(0,0,0,0.3)" }}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="text-[13px] font-bold text-white">{tpl.title}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{tpl.desc}</p>
                        </div>
                        <div className="flex gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => copyText(tpl.prompt, `dw-${i}`)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-slate-500 hover:text-white">
                            {copiedId === `dw-${i}` ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          <button onClick={() => inject(tpl.prompt)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white"
                            style={{ background: "#8b5cf6" }}>
                            <ArrowRight className="w-3.5 h-3.5" /> إرسال
                          </button>
                        </div>
                      </div>
                      <div className="text-[10px] font-mono rounded-lg px-3 py-2 leading-relaxed line-clamp-3"
                        style={{ background: "rgba(0,0,0,0.5)", color: "rgba(139,92,246,0.7)" }}>
                        {tpl.prompt.substring(0, 180)}...
                      </div>
                    </div>
                  ))}
                  <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3.5 mt-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-400/70 leading-relaxed">
                      هذه القوالب لأغراض بحثية وأمنية مشروعة فقط. الاستخدام للبحث في التهديدات وتحسين الدفاع.
                    </p>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="px-4 pt-3 pb-[10px] border-t border-[#1a1a2e] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-[9px] font-mono" style={{ color: "rgba(139,92,246,0.5)" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-pulse" />
                DARK WEB INTELLIGENCE MODULE · RESEARCH ONLY · KALIGPT
              </div>
              <button onClick={onClose} className="px-4 py-1.5 rounded-xl text-[12px] font-bold border border-[#1a1a2e] text-slate-400 hover:text-white hover:border-slate-600 transition-colors">
                إغلاق
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
