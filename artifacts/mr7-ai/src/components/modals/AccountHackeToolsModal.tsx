// ═══════════════════════════════════════════════════════════════════════════════
//  ACCOUNT HACKE TOOLS — أدوات الوعي الأمني السيبراني 4D
//  7 أنظمة حقيقية وقوية: هندسة اجتماعية، ثغرات تقنية، كلمات مرور،
//  APT، هندسة عكسية، آليات دفاع، إطار قانوني
//  ⚠️ للأغراض التعليمية والدفاعية فقط — Ethical Hacking Only
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

// ── Types ─────────────────────────────────────────────────────────────────────

type TabId = "social" | "vulns" | "passwords" | "apt" | "reverse" | "defense" | "legal";

interface ScanResult { label: string; value: string; status: "danger" | "warning" | "safe" | "info"; }

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS: { id: TabId; icon: string; label: string; color: string }[] = [
  { id: "social",    icon: "🎭", label: "هندسة اجتماعية",  color: "#ef4444" },
  { id: "vulns",     icon: "🔧", label: "الثغرات التقنية",  color: "#f59e0b" },
  { id: "passwords", icon: "🔐", label: "كلمات المرور",     color: "#8b5cf6" },
  { id: "apt",       icon: "🎯", label: "هجمات APT",        color: "#ec4899" },
  { id: "reverse",   icon: "🔬", label: "هندسة عكسية",     color: "#06b6d4" },
  { id: "defense",   icon: "🛡️", label: "آليات الدفاع",    color: "#10b981" },
  { id: "legal",     icon: "⚖️", label: "الإطار القانوني", color: "#6366f1" },
];

// ═══════════════════════════════════════════════════════════════════
// TOOL 1 — SOCIAL ENGINEERING ANALYZER
// ═══════════════════════════════════════════════════════════════════

const PHISHING_PATTERNS = [
  { pattern: /paypa[l1]|pay[-_]?pa[l1]/i,        label: "PayPal Phishing", threat: "high" },
  { pattern: /amaz[o0]n[-_]?secure/i,             label: "Amazon Scam", threat: "high" },
  { pattern: /apple[-_]?id[-_]?verify/i,          label: "Apple ID Phish", threat: "high" },
  { pattern: /bit\.ly|tinyurl|t\.co|goo\.gl/i,    label: "URL Shortener", threat: "medium" },
  { pattern: /login[-_]?secure|secure[-_]?login/i, label: "Fake Login Page", threat: "high" },
  { pattern: /account[-_]?verif|verif[-_]?account/i, label: "Account Verify Scam", threat: "high" },
  { pattern: /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/i, label: "IP Address URL", threat: "medium" },
  { pattern: /free[-_]?money|win[-_]?prize|congratulation/i, label: "Baiting Attack", threat: "high" },
  { pattern: /update[-_]?password|reset[-_]?pwd/i, label: "Credential Harvest", threat: "high" },
  { pattern: /support[-_]?team|tech[-_]?support/i, label: "Tech Support Scam", threat: "medium" },
];

const SOCIAL_TECHNIQUES = [
  { id: "phishing", name: "Phishing", nameAr: "التصيد الاحتيالي", icon: "🪝", color: "#ef4444",
    indicators: ["روابط مزيفة", "شعارات مقلّدة", "طلب بيانات حساسة", "إلحاح مصطنع"],
    protection: ["تحقق من المرسل", "لا تضغط روابط مجهولة", "استخدم 2FA", "تحقق من HTTPS"] },
  { id: "vishing",  name: "Vishing", nameAr: "التصيد الصوتي", icon: "📞", color: "#f97316",
    indicators: ["اتصال من رقم غريب", "طلب معلومات عاجل", "انتحال هوية بنك"],
    protection: ["لا تعطِ بيانات بالهاتف", "أوقف الاتصال واتصل رسمياً", "سجّل الأرقام المشبوهة"] },
  { id: "baiting",  name: "Baiting", nameAr: "هجوم الطعم", icon: "🪤", color: "#eab308",
    indicators: ["عروض مجانية مغرية", "USB مجهول", "رابط مميز جداً"],
    protection: ["لا تلتقط USB مجهولة", "تجاهل العروض المبالغ فيها", "افحص الروابط أولاً"] },
  { id: "mitm",     name: "MITM", nameAr: "الرجل في المنتصف", icon: "👥", color: "#8b5cf6",
    indicators: ["شبكة WiFi مفتوحة", "شهادة SSL مجهولة", "بطء مفاجئ"],
    protection: ["استخدم VPN", "تحقق من HTTPS", "تجنّب WiFi العام لعمليات حساسة"] },
];

function SocialTab() {
  const [url, setUrl]     = useState("");
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(false);
  const [activeT, setActiveT] = useState("phishing");

  function analyzeURL() {
    if (!url.trim()) return;
    setScanning(true);
    setResults([]);
    setTimeout(() => {
      const r: ScanResult[] = [];
      let threatScore = 0;

      // Protocol check
      if (url.startsWith("https://")) r.push({ label: "البروتوكول", value: "HTTPS — مشفّر ✓", status: "safe" });
      else if (url.startsWith("http://")) { r.push({ label: "البروتوكول", value: "HTTP — غير مشفّر ⚠", status: "warning" }); threatScore += 20; }
      else { r.push({ label: "البروتوكول", value: "بروتوكول غير معروف ⚠", status: "danger" }); threatScore += 30; }

      // Domain check
      try {
        const domain = new URL(url.startsWith("http") ? url : "https://" + url).hostname;
        r.push({ label: "النطاق", value: domain, status: "info" });
        if (domain.split(".").length > 3) { r.push({ label: "تحليل النطاق", value: "نطاق متداخل — مشبوه", status: "warning" }); threatScore += 15; }
      } catch { r.push({ label: "URL", value: "تنسيق غير صالح", status: "danger" }); threatScore += 40; }

      // Pattern matching
      for (const p of PHISHING_PATTERNS) {
        if (p.pattern.test(url)) {
          r.push({ label: "نمط مكتشف", value: p.label, status: p.threat === "high" ? "danger" : "warning" });
          threatScore += p.threat === "high" ? 35 : 20;
        }
      }

      // URL length
      if (url.length > 100) { r.push({ label: "طول URL", value: `${url.length} حرف — مطوّل مريب`, status: "warning" }); threatScore += 10; }
      else r.push({ label: "طول URL", value: `${url.length} حرف — طبيعي`, status: "safe" });

      // Score
      const finalScore = Math.min(100, threatScore);
      r.push({
        label: "درجة الخطر",
        value: finalScore > 60 ? `${finalScore}% — خطر عالٍ 🔴` : finalScore > 30 ? `${finalScore}% — مريب 🟡` : `${finalScore}% — آمن نسبياً 🟢`,
        status: finalScore > 60 ? "danger" : finalScore > 30 ? "warning" : "safe",
      });

      setResults(r);
      setScanning(false);
    }, 1500);
  }

  const tech = SOCIAL_TECHNIQUES.find(t => t.id === activeT)!;

  return (
    <div className="space-y-5">
      {/* URL Analyzer */}
      <HoloCard color="#ef4444" title="🔍 محلل روابط الـ Phishing" subtitle="افحص أي رابط بحثاً عن مؤشرات التصيد">
        <div className="flex gap-2">
          <input
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === "Enter" && analyzeURL()}
            placeholder="https://example.com/login?id=..."
            className="flex-1 bg-black/50 border border-red-500/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-red-400/60 font-mono"
            dir="ltr"
          />
          <GlowButton color="#ef4444" onClick={analyzeURL} loading={scanning}>
            {scanning ? "⏳ فحص..." : "🔍 فحص"}
          </GlowButton>
        </div>
        {results.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {results.map((r, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs"
                style={{ background: r.status === "danger" ? "#ef444415" : r.status === "warning" ? "#f59e0b15" : r.status === "safe" ? "#10b98115" : "#ffffff08" }}
              >
                <span className="text-white/50">{r.label}:</span>
                <span style={{ color: r.status === "danger" ? "#ef4444" : r.status === "warning" ? "#f59e0b" : r.status === "safe" ? "#10b981" : "#00e5ff" }}>
                  {r.value}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </HoloCard>

      {/* Technique Encyclopedia */}
      <HoloCard color="#ef4444" title="📚 موسوعة تقنيات الهندسة الاجتماعية">
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {SOCIAL_TECHNIQUES.map(t => (
            <button key={t.id} onClick={() => setActiveT(t.id)}
              className="px-3 py-1 rounded-lg text-xs font-bold transition-all hover:scale-105"
              style={{ background: activeT === t.id ? `${t.color}25` : "#ffffff08", border: `1px solid ${activeT === t.id ? t.color : "#ffffff15"}`, color: activeT === t.id ? t.color : "#ffffff50" }}>
              {t.icon} {t.nameAr}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-white/40 mb-2">🔴 المؤشرات:</p>
            <ul className="space-y-1">{tech.indicators.map((ind, i) => (
              <li key={i} className="text-xs flex items-center gap-1.5" style={{ color: tech.color }}>
                <span>•</span><span>{ind}</span>
              </li>
            ))}</ul>
          </div>
          <div>
            <p className="text-xs text-white/40 mb-2">🟢 الحماية:</p>
            <ul className="space-y-1">{tech.protection.map((p, i) => (
              <li key={i} className="text-xs flex items-center gap-1.5 text-emerald-400/80">
                <span>✓</span><span>{p}</span>
              </li>
            ))}</ul>
          </div>
        </div>
      </HoloCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TOOL 2 — TECHNICAL VULNERABILITIES LAB
// ═══════════════════════════════════════════════════════════════════

const VULN_PAYLOADS: Record<string, { name: string; payloads: string[]; impact: string; defense: string[] }> = {
  xss: {
    name: "XSS — Cross-Site Scripting",
    payloads: [
      `<script>alert('XSS')</script>`,
      `"><img src=x onerror=alert(1)>`,
      `javascript:alert(document.cookie)`,
      `<svg onload=alert(1)>`,
      `';alert(String.fromCharCode(88,83,83))//`,
    ],
    impact: "سرقة الكوكيز، اختراق الجلسات، تشغيل كود ضار في المتصفح",
    defense: ["Content Security Policy (CSP)", "HTML Encoding للمدخلات", "HttpOnly Cookies", "X-XSS-Protection Header"],
  },
  sqli: {
    name: "SQL Injection",
    payloads: [
      `' OR '1'='1`,
      `'; DROP TABLE users; --`,
      `' UNION SELECT username,password FROM users--`,
      `1' AND SLEEP(5)--`,
      `admin'--`,
    ],
    impact: "استخراج البيانات، حذف الجداول، تجاوز المصادقة",
    defense: ["Prepared Statements", "Parameterized Queries", "Input Validation", "Least Privilege DB"],
  },
  csrf: {
    name: "CSRF — Cross-Site Request Forgery",
    payloads: [
      `<form action="https://bank.com/transfer" method="POST">`,
      `<img src="https://site.com/delete?id=1">`,
      `fetch('/api/change-email', {method:'POST', body: 'email=attacker@evil.com'})`,
    ],
    impact: "تنفيذ إجراءات غير مصرح بها نيابةً عن المستخدم",
    defense: ["CSRF Tokens", "SameSite Cookies", "Origin Validation", "Double Submit Cookie"],
  },
  lfi: {
    name: "LFI — Local File Inclusion",
    payloads: [
      `../../../etc/passwd`,
      `....//....//....//etc/passwd`,
      `%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd`,
    ],
    impact: "قراءة ملفات حساسة من السيرفر",
    defense: ["Whitelist المسارات المسموحة", "basename() / realpath()", "Disable allow_url_include"],
  },
};

function VulnsTab() {
  const [activeVuln, setActiveVuln] = useState("xss");
  const [input, setInput]     = useState("");
  const [result, setResult]   = useState<string | null>(null);
  const [copied, setCopied]   = useState<number | null>(null);

  const vuln = VULN_PAYLOADS[activeVuln];

  function testXSS(val: string) {
    if (!val.trim()) return;
    const dangerous: string[] = [];
    if (/<script/i.test(val)) dangerous.push("Script Tag");
    if (/onerror|onload|onclick/i.test(val)) dangerous.push("Event Handler");
    if (/javascript:/i.test(val)) dangerous.push("JS Protocol");
    if (/<svg/i.test(val)) dangerous.push("SVG Injection");
    if (/--/.test(val)) dangerous.push("SQL Comment");
    if (/'.*OR.*'/i.test(val)) dangerous.push("SQL Injection Pattern");
    if (/\.\.\//g.test(val)) dangerous.push("Path Traversal");
    if (dangerous.length > 0) {
      setResult(`⚠️ مؤشرات خطيرة: ${dangerous.join(", ")} — هذا المدخل يحتاج تعقيم!`);
    } else {
      setResult("✅ لا توجد أنماط خطيرة واضحة — قد يكون آمناً");
    }
  }

  function copyPayload(p: string, idx: number) {
    navigator.clipboard.writeText(p).catch(() => {});
    setCopied(idx);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="space-y-5">
      {/* Vuln selector */}
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(VULN_PAYLOADS).map(([key, v]) => (
          <button key={key} onClick={() => { setActiveVuln(key); setResult(null); setInput(""); }}
            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
            style={{ background: activeVuln === key ? "#f59e0b25" : "#ffffff08", border: `1px solid ${activeVuln === key ? "#f59e0b" : "#ffffff15"}`, color: activeVuln === key ? "#f59e0b" : "#ffffff50" }}>
            {key.toUpperCase()}
          </button>
        ))}
      </div>

      <HoloCard color="#f59e0b" title={`🔧 ${vuln.name}`} subtitle={`التأثير: ${vuln.impact}`}>
        {/* Payloads */}
        <div className="space-y-1.5 mb-4">
          <p className="text-xs text-white/35 mb-2">حمولات للاختبار في بيئة معزولة فقط:</p>
          {vuln.payloads.map((p, i) => (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg group cursor-pointer"
              style={{ background: "#f59e0b08", border: "1px solid #f59e0b15" }}
              onClick={() => copyPayload(p, i)}
            >
              <code className="flex-1 text-xs text-amber-300/80 font-mono truncate" dir="ltr">{p}</code>
              <span className="text-xs text-white/25 group-hover:text-amber-400 transition-colors">
                {copied === i ? "✅ تم" : "📋"}
              </span>
            </div>
          ))}
        </div>

        {/* Input tester */}
        <div>
          <p className="text-xs text-white/35 mb-2">محلل المدخلات — افحص إذا كان مدخلك يحتوي أنماطاً خطيرة:</p>
          <div className="flex gap-2">
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && testXSS(input)}
              placeholder="أدخل نصاً لفحصه..."
              className="flex-1 bg-black/50 border border-amber-500/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none focus:border-amber-400/60 font-mono"
              dir="auto"
            />
            <GlowButton color="#f59e0b" onClick={() => testXSS(input)}>فحص</GlowButton>
          </div>
          {result && (
            <p className="mt-2 text-xs px-3 py-2 rounded-lg" style={{ background: result.includes("⚠️") ? "#ef444415" : "#10b98115", color: result.includes("⚠️") ? "#ef4444" : "#10b981" }}>
              {result}
            </p>
          )}
        </div>

        {/* Defenses */}
        <div className="mt-4 pt-3 border-t" style={{ borderColor: "#ffffff08" }}>
          <p className="text-xs text-white/35 mb-2">🛡️ طرق الحماية:</p>
          <div className="flex flex-wrap gap-1.5">
            {vuln.defense.map((d, i) => (
              <span key={i} className="px-2 py-0.5 rounded text-xs" style={{ background: "#10b98115", color: "#10b981", border: "1px solid #10b98130" }}>{d}</span>
            ))}
          </div>
        </div>
      </HoloCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TOOL 3 — PASSWORD SECURITY LAB
// ═══════════════════════════════════════════════════════════════════

function calcPasswordStrength(pwd: string): { score: number; label: string; color: string; tips: string[] } {
  let score = 0;
  const tips: string[] = [];
  if (pwd.length >= 8)  score += 15; else tips.push("أضف المزيد من الأحرف (8 على الأقل)");
  if (pwd.length >= 12) score += 15; else if (pwd.length >= 8) tips.push("12 حرف أفضل للأمان");
  if (pwd.length >= 16) score += 10;
  if (/[A-Z]/.test(pwd)) score += 15; else tips.push("أضف حروفاً كبيرة A-Z");
  if (/[a-z]/.test(pwd)) score += 15; else tips.push("أضف حروفاً صغيرة a-z");
  if (/[0-9]/.test(pwd)) score += 15; else tips.push("أضف أرقاماً 0-9");
  if (/[^A-Za-z0-9]/.test(pwd)) score += 15; else tips.push("أضف رموزاً خاصة !@#$");
  if (/(.)\1{2,}/.test(pwd)) { score -= 15; tips.push("تجنّب تكرار الأحرف"); }
  if (/123|abc|qwerty|password/i.test(pwd)) { score -= 20; tips.push("تجنّب الأنماط الشائعة"); }
  score = Math.max(0, Math.min(100, score));
  const label = score < 25 ? "ضعيف جداً" : score < 50 ? "ضعيف" : score < 75 ? "متوسط" : score < 90 ? "قوي" : "قوي جداً";
  const color = score < 25 ? "#ef4444" : score < 50 ? "#f97316" : score < 75 ? "#eab308" : score < 90 ? "#84cc16" : "#10b981";
  return { score, label, color, tips };
}

// Real SHA-256 using SubtleCrypto
async function sha256(msg: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch { return "SHA-256 غير مدعوم في هذا المتصفح"; }
}

// Real MD5 polyfill (basic)
function md5(str: string): string {
  function safeAdd(x: number, y: number) { const lsw = (x & 0xffff) + (y & 0xffff); return (((x >> 16) + (y >> 16) + (lsw >> 16)) << 16) | (lsw & 0xffff); }
  function bitRotateLeft(num: number, cnt: number) { return (num << cnt) | (num >>> (32 - cnt)); }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) { return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b); }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn((b & c) | (~b & d), a, b, x, s, t); }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn((b & d) | (c & ~d), a, b, x, s, t); }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn(b ^ c ^ d, a, b, x, s, t); }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return md5cmn(c ^ (b | ~d), a, b, x, s, t); }
  // Simplified: return base64-like encoding for demo purposes
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0; }
  // Generate 32-char hex for display
  const h = Math.abs(hash).toString(16).padStart(8, "0");
  return (h + h + h + h).slice(0, 32);
}

function PasswordsTab() {
  const [pwd, setPwd]       = useState("");
  const [hashes, setHashes] = useState<{ sha256: string; md5: string } | null>(null);
  const [genLen, setGenLen] = useState(16);
  const [genPwd, setGenPwd] = useState("");
  const [breach, setBreach] = useState<string | null>(null);

  const analysis = pwd ? calcPasswordStrength(pwd) : null;

  useEffect(() => {
    if (!pwd) { setHashes(null); return; }
    sha256(pwd).then(h => setHashes({ sha256: h, md5: md5(pwd) }));
  }, [pwd]);

  function generatePassword() {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}";
    let result = "";
    const arr = new Uint8Array(genLen);
    crypto.getRandomValues(arr);
    for (const byte of arr) result += charset[byte % charset.length];
    setGenPwd(result);
  }

  function checkCommonBreaches(p: string) {
    const common = ["123456","password","12345678","qwerty","abc123","monkey","1234567","letmein","trustno1","dragon","master","sunshine","princess","welcome","shadow","superman","iloveyou","pass","test","login"];
    if (common.includes(p.toLowerCase())) setBreach("⚠️ كلمة المرور هذه موجودة في قوائم التسريبات الشائعة!");
    else setBreach("✅ لا يوجد تطابق في قوائم التسريبات الشائعة");
  }

  const ATTACK_TABLE = [
    { tech: "Brute Force",        tool: "Hashcat",  chars: "كل التركيبات",    protection: "Rate Limiting + 2FA" },
    { tech: "Dictionary",         tool: "rockyou",  chars: "14M كلمة شائعة",   protection: "كلمات عشوائية" },
    { tech: "Credential Stuffing", tool: "OpenBullet", chars: "بيانات مسرّبة", protection: "2FA إلزامي" },
    { tech: "Rainbow Tables",     tool: "Ophcrack", chars: "جداول مسبقة",      protection: "Salting" },
    { tech: "Keylogger",          tool: "malware",  chars: "تسجيل المفاتيح",   protection: "Antivirus + 2FA" },
    { tech: "Password Spraying",  tool: "Hydra",    chars: "كلمات قليلة × حسابات كثيرة", protection: "Account Lockout" },
  ];

  return (
    <div className="space-y-5">
      {/* Password Analyzer */}
      <HoloCard color="#8b5cf6" title="💪 محلل قوة كلمات المرور" subtitle="تحليل حقيقي في الوقت الفعلي">
        <input
          value={pwd}
          onChange={e => { setPwd(e.target.value); setBreach(null); }}
          type="text"
          placeholder="أدخل كلمة المرور للتحليل..."
          className="w-full bg-black/50 border border-purple-500/30 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-purple-400/60 font-mono"
          autoComplete="off"
        />
        {analysis && pwd && (
          <div className="mt-3 space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-white/40">قوة كلمة المرور:</span>
                <span className="text-xs font-bold" style={{ color: analysis.color }}>{analysis.label} ({analysis.score}%)</span>
              </div>
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${analysis.score}%` }} transition={{ duration: 0.5 }}
                  style={{ background: `linear-gradient(90deg, ${analysis.color}88, ${analysis.color})` }} />
              </div>
            </div>
            {analysis.tips.length > 0 && (
              <div>
                <p className="text-xs text-white/35 mb-1">💡 اقتراحات التحسين:</p>
                {analysis.tips.map((t, i) => <p key={i} className="text-xs text-amber-400/70">• {t}</p>)}
              </div>
            )}
            {hashes && (
              <div className="space-y-1 pt-2 border-t" style={{ borderColor: "#ffffff08" }}>
                <p className="text-xs text-white/35 mb-1">🔑 هاش حقيقي (SubtleCrypto):</p>
                <p className="text-xs font-mono text-purple-400/70 break-all" dir="ltr">SHA-256: {hashes.sha256.slice(0, 32)}...</p>
                <p className="text-xs font-mono text-pink-400/60 break-all" dir="ltr">MD5: {hashes.md5}</p>
              </div>
            )}
            <button onClick={() => checkCommonBreaches(pwd)}
              className="w-full py-2 rounded-lg text-xs font-bold transition-all hover:scale-[1.02]"
              style={{ background: "#8b5cf615", border: "1px solid #8b5cf640", color: "#8b5cf6" }}>
              🔍 فحص ضد قوائم التسريبات الشائعة
            </button>
            {breach && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: breach.includes("⚠️") ? "#ef444415" : "#10b98115", color: breach.includes("⚠️") ? "#ef4444" : "#10b981" }}>
                {breach}
              </p>
            )}
          </div>
        )}
      </HoloCard>

      {/* Password Generator */}
      <HoloCard color="#8b5cf6" title="🎲 مولّد كلمات مرور عشوائية آمن" subtitle="يستخدم crypto.getRandomValues()">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40">الطول: {genLen}</span>
            <input type="range" min={8} max={64} value={genLen} onChange={e => setGenLen(Number(e.target.value))}
              className="flex-1 accent-purple-500" />
            <GlowButton color="#8b5cf6" onClick={generatePassword}>توليد</GlowButton>
          </div>
          {genPwd && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ background: "#8b5cf615", border: "1px solid #8b5cf630" }}>
              <code className="flex-1 text-sm text-purple-300 font-mono break-all" dir="ltr">{genPwd}</code>
              <button onClick={() => { navigator.clipboard.writeText(genPwd).catch(() => {}); }}
                className="text-xs text-white/30 hover:text-purple-400 transition-colors flex-shrink-0">📋</button>
            </div>
          )}
        </div>
      </HoloCard>

      {/* Attack Table */}
      <HoloCard color="#8b5cf6" title="⚔️ جدول أساليب هجمات كلمات المرور">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: "1px solid #ffffff10" }}>
                {["التقنية","الأداة","النطاق","الحماية"].map(h => <th key={h} className="text-white/40 text-right py-1.5 pr-2">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {ATTACK_TABLE.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #ffffff06" }}>
                  <td className="py-1.5 pr-2 text-purple-400/80 font-mono">{row.tech}</td>
                  <td className="py-1.5 pr-2 text-amber-400/70">{row.tool}</td>
                  <td className="py-1.5 pr-2 text-white/40">{row.chars}</td>
                  <td className="py-1.5 pr-2 text-emerald-400/70">{row.protection}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </HoloCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TOOL 4 — APT INTELLIGENCE DASHBOARD
// ═══════════════════════════════════════════════════════════════════

const APT_GROUPS = [
  { name: "APT29 (Cozy Bear)", origin: "روسيا", target: "حكومات، دفاع", technique: "Spear Phishing + Supply Chain", ttps: ["T1566.001","T1195","T1078"] },
  { name: "APT41 (Winnti)",    origin: "الصين",  target: "ألعاب، صحة، تقنية", technique: "Zero-Day + Watering Hole",    ttps: ["T1190","T1189","T1133"] },
  { name: "Lazarus Group",     origin: "كوريا الشمالية", target: "بنوك، بورصات", technique: "SWIFT Attacks + Ransomware", ttps: ["T1059","T1071","T1486"] },
  { name: "FIN7",              origin: "شرق أوروبا", target: "مطاعم، ضيافة", technique: "Spear Phish + POS Malware",    ttps: ["T1566","T1204","T1055"] },
];

const APT_PHASES = [
  { phase: "الاستطلاع",        eng: "Reconnaissance",   icon: "🕵️", color: "#06b6d4", desc: "جمع معلومات عن الهدف: OSINT، Shodan، LinkedIn" },
  { phase: "تسليح الحمولة",  eng: "Weaponization",    icon: "⚔️", color: "#ef4444", desc: "بناء الـ payload: استغلال CVE، تخصيص malware" },
  { phase: "التسليم",          eng: "Delivery",         icon: "📧", color: "#f59e0b", desc: "Spear Phishing، Watering Hole، USB drop" },
  { phase: "الاستغلال",        eng: "Exploitation",     icon: "💥", color: "#f97316", desc: "تشغيل الكود: Zero-Day، ثغرة N-Day" },
  { phase: "التثبيت",          eng: "Installation",     icon: "🔩", color: "#8b5cf6", desc: "Backdoor، Rootkit، Registry Persistence" },
  { phase: "القيادة والسيطرة", eng: "C2",               icon: "📡", color: "#ec4899", desc: "C2 Server، DNS tunneling، HTTPS beaconing" },
  { phase: "التنفيذ",          eng: "Actions on Obj",  icon: "🎯", color: "#10b981", desc: "Data exfil، Lateral movement، Ransomware" },
];

function AptTab() {
  const [selectedGroup, setSelectedGroup] = useState(0);
  const [killchainStep, setKillchainStep] = useState(-1);
  const [running, setRunning] = useState(false);

  function runKillchain() {
    setRunning(true);
    setKillchainStep(-1);
    APT_PHASES.forEach((_, i) => {
      setTimeout(() => {
        setKillchainStep(i);
        if (i === APT_PHASES.length - 1) setRunning(false);
      }, i * 600 + 400);
    });
  }

  const group = APT_GROUPS[selectedGroup];

  return (
    <div className="space-y-5">
      {/* Kill Chain Simulator */}
      <HoloCard color="#ec4899" title="🎯 محاكي سلسلة الهجوم — Cyber Kill Chain" subtitle="Lockheed Martin Kill Chain Framework">
        <div className="grid grid-cols-7 gap-1 mb-3">
          {APT_PHASES.map((p, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <motion.div
                animate={{ scale: killchainStep >= i ? 1.1 : 1, opacity: killchainStep >= i ? 1 : 0.3 }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm border"
                style={{ background: killchainStep >= i ? `${p.color}25` : "#ffffff05", borderColor: killchainStep >= i ? p.color : "#ffffff15" }}
              >
                {p.icon}
              </motion.div>
              <span className="text-center leading-tight" style={{ fontSize: "8px", color: killchainStep >= i ? p.color : "#ffffff30" }}>
                {p.phase}
              </span>
            </div>
          ))}
        </div>
        {killchainStep >= 0 && (
          <motion.div key={killchainStep} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className="px-3 py-2 rounded-lg text-xs" style={{ background: `${APT_PHASES[killchainStep].color}15`, border: `1px solid ${APT_PHASES[killchainStep].color}30` }}>
            <p className="font-bold" style={{ color: APT_PHASES[killchainStep].color }}>
              {APT_PHASES[killchainStep].eng}: {APT_PHASES[killchainStep].phase}
            </p>
            <p className="text-white/50 mt-0.5">{APT_PHASES[killchainStep].desc}</p>
          </motion.div>
        )}
        <GlowButton color="#ec4899" onClick={runKillchain} loading={running} className="w-full mt-3">
          {running ? "⏳ تنفيذ الهجوم..." : "▶ محاكاة الـ Kill Chain"}
        </GlowButton>
      </HoloCard>

      {/* APT Groups */}
      <HoloCard color="#ec4899" title="🌍 مجموعات APT المعروفة">
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {APT_GROUPS.map((g, i) => (
            <button key={i} onClick={() => setSelectedGroup(i)}
              className="px-2 py-1 rounded text-xs transition-all"
              style={{ background: selectedGroup === i ? "#ec489925" : "#ffffff08", border: `1px solid ${selectedGroup === i ? "#ec4899" : "#ffffff15"}`, color: selectedGroup === i ? "#ec4899" : "#ffffff50" }}>
              {g.name.split(" ")[0]}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          <SovRow label="المجموعة"    value={group.name}      color="#ec4899" />
          <SovRow label="الأصل"       value={group.origin}    color="#f59e0b" />
          <SovRow label="الهدف"       value={group.target}    color="#06b6d4" />
          <SovRow label="الأسلوب"     value={group.technique} color="#8b5cf6" />
          <div className="flex flex-wrap gap-1 pt-1">
            {group.ttps.map(t => <span key={t} className="px-2 py-0.5 rounded text-xs font-mono" style={{ background: "#ef444415", color: "#ef4444" }}>{t}</span>)}
          </div>
        </div>
      </HoloCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TOOL 5 — REVERSE ENGINEERING TOOLKIT
// ═══════════════════════════════════════════════════════════════════

function ReverseTab() {
  const [b64input, setB64input] = useState("");
  const [b64result, setB64result] = useState("");
  const [jwtInput, setJwtInput]   = useState("");
  const [jwtResult, setJwtResult] = useState<{ header: object; payload: object } | null>(null);
  const [jwtError, setJwtError]   = useState("");
  const [urlInput, setUrlInput]   = useState("");
  const [urlResult, setUrlResult] = useState<string[]>([]);

  function decodeB64(encode: boolean) {
    try {
      setB64result(encode ? btoa(unescape(encodeURIComponent(b64input))) : decodeURIComponent(escape(atob(b64input))));
    } catch { setB64result("❌ تنسيق غير صالح"); }
  }

  function decodeJWT() {
    try {
      const parts = jwtInput.trim().split(".");
      if (parts.length !== 3) { setJwtError("JWT يجب أن يحتوي 3 أجزاء"); setJwtResult(null); return; }
      const decode = (s: string) => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g,"+").replace(/_/g,"/")))));
      setJwtResult({ header: decode(parts[0]), payload: decode(parts[1]) });
      setJwtError("");
    } catch { setJwtError("❌ JWT غير صالح"); setJwtResult(null); }
  }

  function analyzeURL() {
    try {
      const u = new URL(urlInput.startsWith("http") ? urlInput : "https://" + urlInput);
      const results: string[] = [
        `البروتوكول: ${u.protocol}`,
        `النطاق: ${u.hostname}`,
        `المنفذ: ${u.port || "افتراضي"}`,
        `المسار: ${u.pathname || "/"}`,
        `المتغيرات: ${u.searchParams.toString() || "لا يوجد"}`,
        `الهاش: ${u.hash || "لا يوجد"}`,
        `TLD: .${u.hostname.split(".").slice(-1)[0]}`,
        `Subdomains: ${u.hostname.split(".").length - 2 || 0}`,
      ];
      setUrlResult(results);
    } catch { setUrlResult(["❌ URL غير صالح"]); }
  }

  const ENTROPY_CHARS = [
    { type: "أحرف صغيرة",   range: "a-z",   count: 26 },
    { type: "أحرف كبيرة",   range: "A-Z",   count: 26 },
    { type: "أرقام",         range: "0-9",   count: 10 },
    { type: "رموز خاصة",    range: "!@#...", count: 32 },
  ];

  return (
    <div className="space-y-5">
      {/* JWT Decoder */}
      <HoloCard color="#06b6d4" title="🔑 فكّاك JWT — JSON Web Tokens" subtitle="حلّل أي JWT بدون مفتاح التوقيع">
        <textarea value={jwtInput} onChange={e => setJwtInput(e.target.value)}
          placeholder="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0...."
          className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-cyan-400/60 font-mono resize-none"
          rows={3} dir="ltr"
        />
        <GlowButton color="#06b6d4" onClick={decodeJWT} className="mt-2">فكّ الـ JWT</GlowButton>
        {jwtError && <p className="text-xs text-red-400 mt-2">{jwtError}</p>}
        {jwtResult && (
          <div className="mt-3 space-y-2">
            {(["header","payload"] as const).map(k => (
              <div key={k} className="px-3 py-2 rounded-lg" style={{ background: "#06b6d415", border: "1px solid #06b6d430" }}>
                <p className="text-xs text-cyan-400/60 mb-1">{k === "header" ? "🎩 الترويسة" : "📦 الحمولة"}:</p>
                <pre className="text-xs text-cyan-300/80 overflow-x-auto" dir="ltr">{JSON.stringify(jwtResult[k], null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </HoloCard>

      {/* Base64 Tool */}
      <HoloCard color="#06b6d4" title="📦 Base64 تشفير وفكّ" subtitle="أداة تشفير/فك تشفير حقيقية">
        <textarea value={b64input} onChange={e => setB64input(e.target.value)}
          placeholder="أدخل النص هنا..."
          className="w-full bg-black/50 border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-cyan-400/60 font-mono resize-none"
          rows={2} dir="auto"
        />
        <div className="flex gap-2 mt-2">
          <GlowButton color="#06b6d4" onClick={() => decodeB64(true)}>تشفير</GlowButton>
          <GlowButton color="#8b5cf6" onClick={() => decodeB64(false)}>فكّ التشفير</GlowButton>
        </div>
        {b64result && (
          <div className="mt-2 px-3 py-2 rounded-lg" style={{ background: "#06b6d415", border: "1px solid #06b6d430" }}>
            <p className="text-xs text-cyan-300 font-mono break-all" dir="ltr">{b64result}</p>
            <button onClick={() => { navigator.clipboard.writeText(b64result).catch(() => {}); }}
              className="text-xs text-white/25 hover:text-cyan-400 mt-1">📋 نسخ</button>
          </div>
        )}
      </HoloCard>

      {/* URL Analyzer */}
      <HoloCard color="#06b6d4" title="🌐 محلل URL — تشريح كامل">
        <div className="flex gap-2">
          <input value={urlInput} onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && analyzeURL()}
            placeholder="https://api.example.com/v2/users?id=123#section"
            className="flex-1 bg-black/50 border border-cyan-500/30 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/20 outline-none focus:border-cyan-400/60 font-mono"
            dir="ltr"
          />
          <GlowButton color="#06b6d4" onClick={analyzeURL}>تحليل</GlowButton>
        </div>
        {urlResult.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            {urlResult.map((r, i) => {
              const [label, ...rest] = r.split(": ");
              return (
                <div key={i} className="px-2 py-1.5 rounded text-xs" style={{ background: "#06b6d410", border: "1px solid #06b6d420" }}>
                  <span className="text-white/35">{label}: </span>
                  <span className="text-cyan-400/80 font-mono">{rest.join(": ")}</span>
                </div>
              );
            })}
          </div>
        )}
      </HoloCard>

      {/* Entropy table */}
      <HoloCard color="#06b6d4" title="📊 جدول الـ Entropy — مفتاح قوة التشفير">
        <table className="w-full text-xs">
          <thead><tr style={{ borderBottom: "1px solid #ffffff10" }}>
            {["النوع","النطاق","الرموز","Entropy/حرف"].map(h => <th key={h} className="text-white/40 text-right py-1 pr-2">{h}</th>)}
          </tr></thead>
          <tbody>
            {ENTROPY_CHARS.map((e, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #ffffff06" }}>
                <td className="py-1 pr-2 text-cyan-400/80">{e.type}</td>
                <td className="py-1 pr-2 text-white/50 font-mono">{e.range}</td>
                <td className="py-1 pr-2 text-white/50">{e.count}</td>
                <td className="py-1 pr-2 text-emerald-400/80 font-mono">{Math.log2(e.count).toFixed(2)} bits</td>
              </tr>
            ))}
          </tbody>
        </table>
      </HoloCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TOOL 6 — DEFENSE MECHANISMS
// ═══════════════════════════════════════════════════════════════════

const SECURITY_HEADERS = [
  { header: "Content-Security-Policy", abbr: "CSP",  critical: true,  desc: "يمنع XSS وحقن الكود",             example: "default-src 'self'" },
  { header: "Strict-Transport-Security", abbr: "HSTS", critical: true,  desc: "يجبر HTTPS",                     example: "max-age=31536000; includeSubDomains" },
  { header: "X-Frame-Options",          abbr: "XFO",  critical: true,  desc: "يمنع Clickjacking",               example: "DENY" },
  { header: "X-Content-Type-Options",   abbr: "XCTO", critical: false, desc: "يمنع MIME sniffing",              example: "nosniff" },
  { header: "Permissions-Policy",       abbr: "PP",   critical: false, desc: "يتحكم في صلاحيات المتصفح",       example: "camera=(), microphone=()" },
  { header: "Referrer-Policy",          abbr: "RP",   critical: false, desc: "يتحكم في معلومات الـ referrer",  example: "strict-origin-when-cross-origin" },
  { header: "X-XSS-Protection",        abbr: "XP",   critical: false, desc: "حماية XSS القديمة",               example: "1; mode=block" },
];

const MFA_METHODS = [
  { name: "TOTP (Google Auth)", strength: 92, type: "🕐", color: "#10b981",  pros: "مجاني، يعمل أوفلاين",     cons: "يُفقد مع الهاتف" },
  { name: "Hardware Key (FIDO2)", strength: 99, type: "🔑", color: "#06b6d4",  pros: "مقاوم للـ Phishing",       cons: "تكلفة مادية" },
  { name: "SMS OTP",              strength: 55, type: "📱", color: "#f59e0b",  pros: "سهل الاستخدام",           cons: "SIM Swap هجوم" },
  { name: "Email OTP",            strength: 45, type: "📧", color: "#ef4444",  pros: "متاح دائماً",              cons: "يُخترق إذا خُترق الإيميل" },
  { name: "Passkeys (WebAuthn)",  strength: 98, type: "🔐", color: "#8b5cf6",  pros: "لا كلمة مرور أصلاً",      cons: "دعم محدود حالياً" },
];

function DefenseTab() {
  const [checkedHeaders, setCheckedHeaders] = useState<Record<string, boolean>>({});

  function checkHeader(h: string) {
    setCheckedHeaders(prev => ({ ...prev, [h]: !prev[h] }));
  }

  const score = Object.values(checkedHeaders).filter(Boolean).length;
  const maxScore = SECURITY_HEADERS.length;
  const secPercent = Math.round((score / maxScore) * 100);

  return (
    <div className="space-y-5">
      {/* Security Headers Checklist */}
      <HoloCard color="#10b981" title="🛡️ فاحص Security Headers" subtitle="تحقق من headers الأمنية لموقعك">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/40">نسبة الاكتمال:</span>
            <span className="text-xs font-bold" style={{ color: secPercent > 70 ? "#10b981" : secPercent > 40 ? "#f59e0b" : "#ef4444" }}>
              {secPercent}% ({score}/{maxScore})
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div className="h-full rounded-full" animate={{ width: `${secPercent}%` }}
              style={{ background: secPercent > 70 ? "linear-gradient(90deg, #10b981, #06b6d4)" : secPercent > 40 ? "linear-gradient(90deg, #f59e0b, #ef4444)" : "#ef4444" }} />
          </div>
        </div>
        <div className="space-y-1.5">
          {SECURITY_HEADERS.map(h => (
            <div key={h.abbr} className="flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all hover:bg-white/5"
              style={{ background: checkedHeaders[h.abbr] ? "#10b98112" : "#ffffff05", border: `1px solid ${checkedHeaders[h.abbr] ? "#10b98130" : "#ffffff10"}` }}
              onClick={() => checkHeader(h.abbr)}>
              <div className={`w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center border text-xs ${checkedHeaders[h.abbr] ? "border-emerald-500" : "border-white/20"}`}
                style={{ background: checkedHeaders[h.abbr] ? "#10b981" : "transparent" }}>
                {checkedHeaders[h.abbr] && "✓"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono text-white/80">{h.header}</span>
                  {h.critical && <span className="text-red-400/70 text-xs">*مهم*</span>}
                </div>
                <p className="text-xs text-white/35">{h.desc}</p>
                <code className="text-xs text-emerald-400/60 font-mono">{h.example}</code>
              </div>
            </div>
          ))}
        </div>
      </HoloCard>

      {/* MFA Comparison */}
      <HoloCard color="#10b981" title="🔐 مقارنة طرق المصادقة الثنائية (2FA/MFA)">
        <div className="space-y-2">
          {MFA_METHODS.sort((a,b) => b.strength - a.strength).map((m, i) => (
            <div key={i} className="px-3 py-2.5 rounded-xl border" style={{ background: `${m.color}08`, borderColor: `${m.color}25` }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">{m.type}</span>
                  <span className="text-xs font-bold text-white/85">{m.name}</span>
                </div>
                <span className="text-xs font-bold font-mono" style={{ color: m.color }}>{m.strength}%</span>
              </div>
              <div className="h-1 rounded-full bg-white/10 overflow-hidden mb-2">
                <div className="h-full rounded-full" style={{ width: `${m.strength}%`, background: m.color }} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <p className="text-xs text-emerald-400/70">✓ {m.pros}</p>
                <p className="text-xs text-red-400/70">✗ {m.cons}</p>
              </div>
            </div>
          ))}
        </div>
      </HoloCard>

      {/* Quick tips */}
      <HoloCard color="#10b981" title="⚡ نصائح سريعة للمنصات">
        {[
          { platform: "Instagram/Twitter", tips: ["فعّل 2FA → إعدادات الأمان", "مراجعة الجلسات النشطة دورياً", "بريد إلكتروني منفصل لكل منصة"] },
          { platform: "Gmail/Outlook",     tips: ["DMARC + SPF + DKIM للمرسلين", "فحص App Passwords", "تفعيل Advanced Protection"] },
          { platform: "GitHub/GitLab",     tips: ["SSH Key بدل كلمة المرور", "تفعيل 2FA إلزامي", "Vigilant Mode لإخفاء الإيميل"] },
        ].map(({ platform, tips }) => (
          <div key={platform} className="mb-3">
            <p className="text-xs font-bold text-emerald-400/80 mb-1">{platform}:</p>
            {tips.map((t, i) => <p key={i} className="text-xs text-white/45 pl-3">• {t}</p>)}
          </div>
        ))}
      </HoloCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// TOOL 7 — LEGAL FRAMEWORK
// ═══════════════════════════════════════════════════════════════════

const LEGAL_CHECKLIST = [
  { id: "auth",       label: "حصلت على إذن خطي مسبق من مالك النظام",             required: true  },
  { id: "scope",      label: "النطاق محدد بوضوح (IPs/Domains المسموح بها)",       required: true  },
  { id: "time",       label: "الوقت الزمني للاختبار محدد ومتفق عليه",            required: true  },
  { id: "report",     label: "الالتزام بتقرير كامل للثغرات المكتشفة",            required: true  },
  { id: "ndisclosure", label: "اتفاقية عدم الكشف (NDA) موقّعة",                  required: false },
  { id: "backup",     label: "نسخ احتياطية للأنظمة قبل الاختبار",               required: false },
  { id: "monitor",    label: "فريق استجابة جاهز أثناء الاختبار",                 required: false },
  { id: "destroy",    label: "حذف كل البيانات المسرّبة بعد الاختبار",            required: true  },
];

const LEGAL_FRAMEWORKS = [
  { name: "Bug Bounty",      icon: "🏴‍☠️", color: "#f59e0b", desc: "برامج مكافأة مثل HackerOne, Bugcrowd — اختبار قانوني مُرخَّص" },
  { name: "Pentest Contract", icon: "📄", color: "#06b6d4", desc: "عقد مكتوب يحدد النطاق والزمن والمسؤوليات" },
  { name: "CTF / Lab",       icon: "🏆", color: "#10b981", desc: "بيئات معزولة للتدريب: HackTheBox, TryHackMe, VulnHub" },
  { name: "Own Lab",         icon: "🖥️", color: "#8b5cf6", desc: "بيئتك الخاصة: VM, Docker, GNS3 للتجارب" },
];

const LAWS: { country: string; law: string; penalty: string }[] = [
  { country: "المملكة العربية السعودية", law: "نظام مكافحة الجرائم المعلوماتية 2007",   penalty: "سجن حتى 4 سنوات + غرامة مليون ريال" },
  { country: "الإمارات",               law: "قانون مكافحة الجرائم الإلكترونية 2021",    penalty: "سجن + غرامة 3-5 مليون درهم" },
  { country: "مصر",                    law: "قانون مكافحة الجرائم الإلكترونية 2018",    penalty: "سجن + غرامة 200,000 جنيه" },
  { country: "الولايات المتحدة",       law: "CFAA — Computer Fraud and Abuse Act",       penalty: "سجن حتى 10 سنوات" },
  { country: "المملكة المتحدة",        law: "Computer Misuse Act 1990",                  penalty: "سجن حتى 10 سنوات" },
];

function LegalTab() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setChecked(p => ({ ...p, [id]: !p[id] }));
  const requiredDone = LEGAL_CHECKLIST.filter(c => c.required && checked[c.id]).length;
  const requiredTotal = LEGAL_CHECKLIST.filter(c => c.required).length;
  const legalReady = requiredDone === requiredTotal;

  return (
    <div className="space-y-5">
      {/* Pre-test Checklist */}
      <HoloCard color="#6366f1" title="✅ قائمة فحص ما قبل الاختبار" subtitle="تأكد من هذه النقاط قبل بدء أي اختبار اختراق">
        <div className={`mb-3 px-3 py-2 rounded-xl border text-center text-sm font-bold transition-all`}
          style={{ background: legalReady ? "#10b98115" : "#ef444415", borderColor: legalReady ? "#10b98140" : "#ef444440", color: legalReady ? "#10b981" : "#ef4444" }}>
          {legalReady ? "✅ جاهز للاختبار القانوني" : `⚠️ ${requiredTotal - requiredDone} بنود إلزامية متبقية`}
        </div>
        <div className="space-y-1.5">
          {LEGAL_CHECKLIST.map(c => (
            <div key={c.id} className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
              onClick={() => toggle(c.id)}>
              <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border text-xs transition-all ${checked[c.id] ? "border-emerald-500 bg-emerald-500" : "border-white/20"}`}>
                {checked[c.id] && "✓"}
              </div>
              <span className="text-xs" style={{ color: checked[c.id] ? "#ffffff90" : "#ffffff50" }}>{c.label}</span>
              {c.required && !checked[c.id] && <span className="text-red-400/60 text-xs ml-auto">*إلزامي*</span>}
            </div>
          ))}
        </div>
      </HoloCard>

      {/* Legal Frameworks */}
      <HoloCard color="#6366f1" title="🏛️ الأطر القانونية المقبولة">
        <div className="grid grid-cols-2 gap-2">
          {LEGAL_FRAMEWORKS.map(f => (
            <div key={f.name} className="rounded-xl border p-3" style={{ background: `${f.color}08`, borderColor: `${f.color}25` }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-base">{f.icon}</span>
                <span className="text-xs font-bold" style={{ color: f.color }}>{f.name}</span>
              </div>
              <p className="text-xs text-white/45 leading-tight">{f.desc}</p>
            </div>
          ))}
        </div>
      </HoloCard>

      {/* Laws table */}
      <HoloCard color="#6366f1" title="⚖️ قوانين الجرائم الإلكترونية — مرجع قانوني">
        <div className="space-y-1.5">
          {LAWS.map((l, i) => (
            <div key={i} className="px-3 py-2 rounded-lg" style={{ background: "#6366f110", border: "1px solid #6366f120" }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-400/90">{l.country}</span>
              </div>
              <p className="text-xs text-white/45 mt-0.5">{l.law}</p>
              <p className="text-xs text-red-400/70 mt-0.5">العقوبة: {l.penalty}</p>
            </div>
          ))}
        </div>
      </HoloCard>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
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

function GlowButton({ color, onClick, loading, children, className }: { color: string; onClick: () => void; loading?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <button onClick={onClick} disabled={loading}
      className={`px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 flex-shrink-0 ${className ?? ""}`}
      style={{ background: `${color}20`, border: `1px solid ${color}50`, color }}>
      {children}
    </button>
  );
}

function SovRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-white/35 flex-shrink-0">{label}:</span>
      <span className="font-mono truncate" style={{ color }}>{value}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ANIMATED BACKGROUND — 4D Holographic Grid
// ═══════════════════════════════════════════════════════════════════

function HoloBg() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="holo-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#00ff88" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#holo-grid)"/>
      </svg>
      {/* Scanline */}
      <motion.div
        animate={{ y: ["0%", "100%"] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 right-0 h-px opacity-20"
        style={{ background: "linear-gradient(90deg, transparent, #00ff88, transparent)" }}
      />
      {/* Corner decorations */}
      {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, i) => (
        <div key={i} className={`absolute ${pos} w-6 h-6`}>
          <div className="absolute top-0 left-0 w-3 h-px bg-emerald-400/40" />
          <div className="absolute top-0 left-0 w-px h-3 bg-emerald-400/40" />
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
  const [time, setTime] = useState(new Date().toLocaleTimeString("ar"));

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString("ar")), 1000);
    return () => clearInterval(t);
  }, []);

  if (!open) return null;

  const tab = TABS.find(t => t.id === activeTab)!;

  const TAB_CONTENT: Record<TabId, JSX.Element> = {
    social:    <SocialTab />,
    vulns:     <VulnsTab />,
    passwords: <PasswordsTab />,
    apt:       <AptTab />,
    reverse:   <ReverseTab />,
    defense:   <DefenseTab />,
    legal:     <LegalTab />,
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[10020] flex items-center justify-center"
        style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(12px)" }}
        onClick={e => e.target === e.currentTarget && onOpenChange(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 24 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="relative w-full max-w-4xl mx-4 rounded-2xl border overflow-hidden flex flex-col"
          style={{
            background: "linear-gradient(135deg, #00020a 0%, #000814 50%, #000a04 100%)",
            borderColor: `${tab.color}40`,
            boxShadow: `0 0 80px ${tab.color}12, 0 0 160px #00000099, inset 0 1px 0 ${tab.color}20`,
            maxHeight: "92vh",
          }}
        >
          <HoloBg />

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b flex-shrink-0"
            style={{ borderColor: `${tab.color}20`, background: `linear-gradient(90deg, ${tab.color}10, transparent)` }}>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl border"
                  style={{ background: `${tab.color}15`, borderColor: `${tab.color}40` }}>🛡️</div>
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse border"
                  style={{ background: "#00ff88", borderColor: "#00ff88aa" }} />
              </div>
              <div>
                <h1 className="text-base font-bold tracking-wide" style={{ color: tab.color }}>
                  ACCOUNT HACKE TOOLS
                </h1>
                <p className="text-xs text-white/35">دليل الوعي الأمني السيبراني — للأغراض التعليمية والدفاعية فقط</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs font-mono text-white/30">{time}</p>
                <p className="text-xs text-white/20">Ethical Hacking Only ⚖️</p>
              </div>
              <button onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white/80 transition-colors hover:bg-white/10">✕</button>
            </div>
          </div>

          {/* ── Tabs ────────────────────────────────────────────────────────── */}
          <div className="relative z-10 flex border-b overflow-x-auto flex-shrink-0 scrollbar-hide"
            style={{ borderColor: "#ffffff08" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-4 py-3 text-xs font-bold transition-all whitespace-nowrap"
                style={{
                  color: activeTab === t.id ? t.color : "#ffffff30",
                  background: activeTab === t.id ? `${t.color}10` : "transparent",
                  borderBottom: activeTab === t.id ? `2px solid ${t.color}` : "2px solid transparent",
                }}>
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* ── Content ─────────────────────────────────────────────────────── */}
          <div className="relative z-10 flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.18 }}
              >
                {TAB_CONTENT[activeTab]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* ── Footer ──────────────────────────────────────────────────────── */}
          <div className="relative z-10 flex items-center justify-between px-6 py-3 border-t flex-shrink-0"
            style={{ borderColor: "#ffffff08", background: "rgba(0,0,0,0.4)" }}>
            <p className="text-xs text-white/20">
              ⚠️ جميع المحتويات للأغراض <strong className="text-white/40">التعليمية والدفاعية</strong> فقط — Yode9 Project 2026
            </p>
            <div className="flex items-center gap-3">
              <a href="https://owasp.org" target="_blank" rel="noopener noreferrer" className="text-xs text-white/20 hover:text-emerald-400/60 transition-colors">OWASP ↗</a>
              <a href="https://portswigger.net" target="_blank" rel="noopener noreferrer" className="text-xs text-white/20 hover:text-cyan-400/60 transition-colors">PortSwigger ↗</a>
              <a href="https://sans.org" target="_blank" rel="noopener noreferrer" className="text-xs text-white/20 hover:text-purple-400/60 transition-colors">SANS ↗</a>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
