import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Globe, Shield, Eye, AlertTriangle, Terminal, Copy, CheckCheck,
  Zap, Lock, Network, Database, Activity, Target, Crosshair, Radio,
  FileSearch, Hash, Mail, Smartphone, User, Server, Wifi, Key,
  ChevronRight, ExternalLink, Bug, Cpu, ArrowRight, Layers,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  onInjectToChat: (text: string) => void;
}

type Tab = "tor" | "osint" | "threats" | "shodan" | "darkweb";

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

const OSINT_LOOKUPS = [
  { id: "email", label: "Email", icon: Mail, color: "#3b82f6", placeholder: "target@domain.com", prompt: (v: string) => `قم بعملية OSINT شاملة للبريد الإلكتروني: ${v}\n\nابحث في:\n• Have I Been Pwned - التسريبات السابقة\n• Hunter.io pattern - نمط البريد في المنظمة\n• Email reputation - سمعة العنوان\n• Social media accounts linked - حسابات مرتبطة\n• Dark web mentions - ذكر في الويب المظلم\n• Breach databases - قواعد بيانات الاختراقات\n\nقدم تقرير OSINT مفصل مع مستوى الخطورة` },
  { id: "ip", label: "IP Address", icon: Network, color: "#e21227", placeholder: "192.168.1.1", prompt: (v: string) => `حلل عنوان IP التالي بشكل شامل: ${v}\n\nاشمل:\n• Geolocation & ISP/ASN info\n• Reverse DNS lookup\n• Shodan data (open ports, services, vulnerabilities)\n• VirusTotal reputation\n• AbuseIPDB blacklist check\n• Tor exit node / VPN / Proxy detection\n• Historical data (passive DNS)\n• Threat intelligence feeds\n• Associated malware campaigns\n\nقدم تقرير تهديد كامل مع توصيات` },
  { id: "domain", label: "Domain", icon: Globe, color: "#10b981", placeholder: "target.com", prompt: (v: string) => `قم بتحليل استخباراتي شامل للدومين: ${v}\n\nاشمل:\n• WHOIS & registration history\n• DNS records (A, MX, TXT, NS, CNAME, SOA)\n• SSL certificate transparency logs\n• Subdomain enumeration (crt.sh, Amass, Subfinder)\n• IP history & hosting changes\n• Web technologies (Wappalyzer)\n• Dark web & paste site mentions\n• Related domains & IP clusters\n• Threat intelligence score\n• Email security (SPF, DKIM, DMARC)\n\nقدم attack surface map` },
  { id: "username", label: "Username", icon: User, color: "#8b5cf6", placeholder: "h4ck3r_name", prompt: (v: string) => `تتبع اسم المستخدم "${v}" عبر الإنترنت\n\nابحث في:\n• GitHub, GitLab, Bitbucket\n• Twitter/X, Reddit, Instagram, TikTok, YouTube\n• Telegram, Discord, Slack communities\n• Dark web forums & markets\n• Keybase, Mastodon, Matrix\n• Gaming platforms (Steam, PSN, Xbox)\n• Hacking forums (Exploit.in, RaidForums archives)\n• Paste sites\n\nاستخدم Sherlock, Maigret patterns\nاستخرج: حسابات مؤكدة، نشاط تاريخي، أنماط سلوك، معلومات تعريفية محتملة` },
  { id: "phone", label: "Phone Number", icon: Smartphone, color: "#f59e0b", placeholder: "+1234567890", prompt: (v: string) => `قم بـ OSINT لرقم الهاتف: ${v}\n\nاشمل:\n• Carrier & country lookup\n• Spam/scam reputation (NumLookup, WhoCallsMe)\n• Social media accounts (WhatsApp, Telegram, Viber)\n• Data broker databases\n• Truecaller-style lookup\n• Dark web breach data\n• Previous owner history\n\nقدم: نوع الخط، الموقع التقريبي، الحسابات المرتبطة، مستوى المخاطر` },
  { id: "hash", label: "File Hash", icon: Hash, color: "#06b6d4", placeholder: "d41d8cd98f00b204e9800998ecf8427e", prompt: (v: string) => `حلل hash الملف التالي: ${v}\n\nابحث في:\n• VirusTotal - تقرير engines كاملة\n• MalwareBazaar - بيانات العينة\n• Hybrid Analysis - تقرير sandbox\n• ANY.RUN - التحليل الديناميكي\n• CAPE Sandbox\n• AlienVault OTX\n\nاستخرج: نوع الملف، اسم الملف الأصلي، عائلة البرمجية الخبيثة، IOCs، YARA rules، ATT&CK techniques` },
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

export function DarkWebSearchModal({ open, onClose, onInjectToChat }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("tor");
  const [activeCategory, setActiveCategory] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [targetInput, setTargetInput] = useState("");
  const [osintType, setOsintType] = useState(0);
  const [pulseRing, setPulseRing] = useState(false);

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

  function triggerScan() {
    setPulseRing(true);
    setTimeout(() => setPulseRing(false), 2000);
    const lookup = OSINT_LOOKUPS[osintType];
    if (targetInput.trim()) {
      inject(lookup.prompt(targetInput.trim()));
    } else {
      toast({ description: "أدخل الهدف أولاً" });
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

            {/* Top accent */}
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
                  {/* Category sidebar */}
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
                    {/* Target input */}
                    <div className="pt-2 border-t border-[#1a1a2e] mt-2">
                      <p className="text-[9px] text-slate-600 mb-1 px-1">الهدف (اختياري)</p>
                      <input value={targetInput} onChange={(e) => setTargetInput(e.target.value)}
                        placeholder="example.com"
                        className="w-full bg-[#0a0015] border border-[#1a1a2e] rounded-lg px-2 py-1.5 text-[10px] font-mono text-slate-300 outline-none focus:border-[#8b5cf6]/50 placeholder:text-slate-700"
                        dir="ltr" />
                    </div>
                  </div>
                  {/* Templates */}
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

              {/* OSINT */}
              {tab === "osint" && (
                <div className="p-4 space-y-4">
                  {/* Type selector */}
                  <div className="flex gap-2 flex-wrap">
                    {OSINT_LOOKUPS.map((l, i) => {
                      const Icon = l.icon;
                      return (
                        <button key={l.id} onClick={() => { setOsintType(i); setTargetInput(""); }}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border transition-all ${
                            osintType === i ? "text-white" : "text-slate-500 border-[#1a1a2e] hover:text-slate-300 hover:border-slate-600"
                          }`}
                          style={osintType === i ? { background: l.color + "22", borderColor: l.color + "55", color: l.color } : {}}>
                          <Icon className="w-3.5 h-3.5" /> {l.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Input */}
                  <div className="relative">
                    <div className="absolute inset-0 rounded-xl opacity-30 blur-sm" style={{ background: OSINT_LOOKUPS[osintType].color }} />
                    <div className="relative rounded-xl border p-1" style={{ borderColor: OSINT_LOOKUPS[osintType].color + "40", background: "rgba(0,0,0,0.6)" }}>
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        {(() => { const Icon = OSINT_LOOKUPS[osintType].icon; return <Icon className="w-4 h-4 shrink-0" style={{ color: OSINT_LOOKUPS[osintType].color }} />; })()}
                        <input value={targetInput} onChange={(e) => setTargetInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") triggerScan(); }}
                          placeholder={OSINT_LOOKUPS[osintType].placeholder}
                          className="flex-1 bg-transparent outline-none text-[14px] font-mono text-white placeholder:text-slate-700"
                          dir="ltr" />
                        <button onClick={triggerScan}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold text-white transition-all ${pulseRing ? "animate-pulse" : ""}`}
                          style={{ background: OSINT_LOOKUPS[osintType].color }}>
                          <Search className="w-4 h-4" /> ابدأ البحث
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="rounded-xl border border-[#1a1a2e] p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
                    <p className="text-[10px] text-slate-600 mb-2 font-mono uppercase">معاينة الاستعلام</p>
                    <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-6 font-mono whitespace-pre-line">
                      {OSINT_LOOKUPS[osintType].prompt(targetInput || OSINT_LOOKUPS[osintType].placeholder)}
                    </p>
                  </div>
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
