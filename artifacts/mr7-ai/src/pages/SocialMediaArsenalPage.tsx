/**
 * SocialMediaArsenalPage — مركز هجوم وسائل التواصل الاجتماعي
 * 3D animated • holographic • futuristic • full tool suite
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, Target, Eye, Search, Globe, Lock, Zap, Network, Terminal,
  Users, Database, Radio, Cpu, Activity, AlertTriangle, ChevronRight,
  Play, Square, RefreshCw, X, Crosshair, Wifi, Code2, Server, Camera,
  UserX, Key, Mail, Smartphone, BarChart3, Layers
} from "lucide-react";

// ─── DATA CONSTANTS ──────────────────────────────────────────────────────────
const SECTIONS = [
  { id: "overview",    label: "نظرة عامة",        icon: "◈", color: "#e21227" },
  { id: "frameworks",  label: "أطر الهندسة",       icon: "⬡", color: "#a855f7" },
  { id: "osint",       label: "استخبارات OSINT",   icon: "◉", color: "#00e5ff" },
  { id: "attacks",     label: "آليات الهجوم",       icon: "◆", color: "#f59e0b" },
  { id: "tools",       label: "الأدوات الداعمة",    icon: "▣", color: "#10b981" },
  { id: "terminal",    label: "محطة الاختراق",      icon: "⊙", color: "#e21227" },
];

const FRAMEWORKS = [
  {
    id: "set", name: "Social Engineer Toolkit (SET)", dev: "TrustedSec / Dave Kennedy",
    color: "#e21227", icon: "⚔", threat: "CRITICAL",
    desc: "الأداة الأشهر عالمياً في هندسة الاجتماعية — استنساخ مواقع كاملة، تصيد مستهدف، حصاد بيانات الاعتماد",
    features: [
      { name: "Website Cloning", detail: "نسخ طبق الأصل: Facebook / Instagram / Twitter / LinkedIn", icon: Globe },
      { name: "Spear-Phishing Attack", detail: "رسائل مستهدفة بملفات خبيثة مخصصة للضحية", icon: Mail },
      { name: "Credential Harvesting", detail: "التقاط أسماء المستخدمين وكلمات المرور فورياً", icon: Key },
      { name: "Mass Mailer Attack", detail: "حملات تصيد واسعة النطاق بمعدل آلاف/ثانية", icon: Radio },
      { name: "Infectious Media", detail: "USB خبيثة تُفعّل تلقائياً عند التوصيل", icon: Cpu },
      { name: "Metasploit Integration", detail: "تكامل مع Metasploit لإيصال الحمولات واستغلال الثغرات", icon: Zap },
    ],
    stats: { targets: "50K+", success: "94.2%", platforms: "12", speed: "∞" },
  },
  {
    id: "socialfish", name: "SocialFish v3.0", dev: "UndeadSec Team",
    color: "#a855f7", icon: "⬟", threat: "CRITICAL",
    desc: "أداة متخصصة في تصيد وسائل التواصل الاجتماعي مع لوحة تحكم حية ومعترض 2FA في الوقت الفعلي",
    features: [
      { name: "Live Operator Panel", detail: "مراقبة الضحايا في الوقت الفعلي مع إحصاءات مباشرة", icon: Activity },
      { name: "2FA Interception", detail: "اعتراض رموز المصادقة الثنائية OTP فورياً", icon: Smartphone },
      { name: "Cookie Hijacking", detail: "سرقة جلسات تسجيل الدخول (Session Tokens)", icon: Lock },
      { name: "Social Templates", detail: "قوالب جاهزة: FB / IG / TikTok / Snap / Twitter / LinkedIn", icon: Layers },
      { name: "Android + Docker", detail: "يعمل على Android وDocker وLinux وTermux", icon: Cpu },
      { name: "Telegram Bot", detail: "إشعارات فورية عبر بوت Telegram عند اصطياد ضحية", icon: Radio },
    ],
    stats: { targets: "20K+", success: "91.7%", platforms: "8", speed: "RT" },
  },
];

const OSINT_TOOLS = [
  {
    id: "maltego", name: "Maltego", category: "Graph Intelligence",
    color: "#00e5ff", icon: "◈", threat: "HIGH",
    desc: "أداة تحليل الروابط المرئية الأكثر تطوراً في العالم للاستخبارات المفتوحة",
    capabilities: [
      "SOCMINT من Facebook / Twitter / LinkedIn / Instagram",
      "تصور رسومي للعلاقات بين الأشخاص والشركات والنطاقات",
      "حسابات Sock Puppet للتجسس السري",
      "Social Links Pro — 500+ مصدر بيانات Deep Web",
      "ربط عناوين IP والبريد الإلكتروني والهويات الرقمية",
      "تحليل الشبكات الاجتماعية وتعقب المنظمات",
    ],
  },
  {
    id: "sherlock", name: "Sherlock", category: "Username Hunter",
    color: "#f59e0b", icon: "⬢", threat: "HIGH",
    desc: "أداة Python لتعقب أسماء المستخدمين عبر 400+ منصة اجتماعية في ثوانٍ",
    capabilities: [
      "400+ منصة: تغطية شاملة لكل منصات التواصل",
      "دعم Tor / Proxy — إخفاء هوية الباحث الكامل",
      "تصدير CSV, JSON, XLSX للتحليل اللاحق",
      "تحديد وجود الحساب عبر تحليل HTTP 200/404",
      "Concurrent Requests — سرعة مسح فائقة",
      "تكامل مع Maltego عبر Transform مخصص",
    ],
  },
  {
    id: "spiderfoot", name: "SpiderFoot", category: "Auto OSINT",
    color: "#10b981", icon: "◆", threat: "HIGH",
    desc: "أتمتة OSINT شاملة تجمع من مئات المصادر وترسم خريطة الهجوم",
    capabilities: [
      "جمع آلي من مئات المصادر المفتوحة",
      "تحليل الارتباطات — تحديد نقاط البيانات الحرجة",
      "IP / نطاقات / بريد / أسماء مستخدمين / ASN",
      "رسم خريطة سطح الهجوم الرقمي للهدف",
      "واجهة ويب تفاعلية + API كامل",
      "تكامل مع Have I Been Pwned وShodan",
    ],
  },
  {
    id: "osintgram", name: "Osintgram", category: "Instagram Recon",
    color: "#ec4899", icon: "⊙", threat: "MEDIUM",
    desc: "متخصص في تحليل واستخراج بيانات حسابات Instagram بشكل معمق",
    capabilities: [
      "استخراج جميع متابعي ومتابعَي الحساب",
      "بيانات وصفية GPS من الصور المنشورة",
      "تحليل أنماط النشر وأوقات النشاط",
      "استخراج الإيميلات وأرقام الهاتف من Bio",
      "خريطة المواقع الجغرافية للمنشورات",
      "تتبع التغييرات في الحساب عبر الزمن",
    ],
  },
];

const ATTACK_VECTORS = [
  {
    id: "phishing", name: "التصيد الاحتيالي", english: "Phishing",
    color: "#e21227", severity: "CRITICAL", icon: Globe,
    desc: "إنشاء صفحات مزيفة طبق الأصل لسرقة بيانات الدخول",
    subtypes: ["Spear Phishing", "Whaling", "Vishing", "Smishing", "Tabnabbing", "Clone Phishing"],
    tools: ["SET", "SocialFish", "GoPhish", "Modlishka"],
    defense: "تحقق من HTTPS وعنوان URL قبل الإدخال",
  },
  {
    id: "brute", name: "القوة الغاشمة", english: "Brute Force",
    color: "#f97316", severity: "HIGH", icon: Lock,
    desc: "تجربة آلاف كلمات المرور تلقائياً بمعدلات مرتفعة",
    subtypes: ["Dictionary Attack", "Rainbow Table", "Credential Stuffing", "Password Spraying", "Hybrid Attack"],
    tools: ["Hydra", "Medusa", "THC-Hydra", "Pydictor"],
    defense: "2FA + كلمة مرور طويلة + Account Lockout",
  },
  {
    id: "social_eng", name: "الهندسة الاجتماعية", english: "Social Engineering",
    color: "#a855f7", severity: "CRITICAL", icon: Users,
    desc: "استغلال الثقة والنفسية البشرية لانتزاع المعلومات",
    subtypes: ["Pretexting", "Baiting", "Quid Pro Quo", "Tailgating", "Vishing", "Impersonation"],
    tools: ["SET", "Maltego", "BeEF"],
    defense: "التدريب الأمني + التحقق من الهوية دائماً",
  },
  {
    id: "session", name: "اختطاف الجلسة", english: "Session Hijacking",
    color: "#00e5ff", severity: "HIGH", icon: Key,
    desc: "سرقة ملفات الكوكيز وتوكنات الجلسة لتجاوز المصادقة",
    subtypes: ["Cookie Theft", "XSS Injection", "MitM Attack", "Token Replay", "Sidejacking"],
    tools: ["Wireshark", "Ettercap", "BurpSuite", "Mitmproxy"],
    defense: "VPN + HTTPS فقط + Secure/HttpOnly Cookies",
  },
  {
    id: "data_breach", name: "تسريبات قواعد البيانات", english: "Data Breaches",
    color: "#10b981", severity: "HIGH", icon: Database,
    desc: "استخدام كلمات المرور المسربة من خروقات أخرى",
    subtypes: ["Credential Stuffing", "Password Reuse", "Combo Lists", "OSINT Enumeration"],
    tools: ["Hydra", "Medusa", "HaveIBeenPwned", "DeHashed"],
    defense: "كلمة مرور فريدة لكل موقع + مدير كلمات المرور",
  },
  {
    id: "malware", name: "البرمجيات الخبيثة", english: "Malware / Keyloggers",
    color: "#f59e0b", severity: "CRITICAL", icon: Cpu,
    desc: "برامج تسجل كل ضغطات المفاتيح وترسلها للمهاجم",
    subtypes: ["Keylogger", "RAT", "Spyware", "Trojan", "Ransomware", "Stalkerware"],
    tools: ["Metasploit", "njRAT", "DarkComet", "Blackshades"],
    defense: "Antivirus + لا تحمّل من مصادر مجهولة + Sandbox",
  },
  {
    id: "2fa_bypass", name: "تجاوز المصادقة الثنائية", english: "2FA Bypass",
    color: "#ec4899", severity: "CRITICAL", icon: Smartphone,
    desc: "اعتراض أو تجاوز رموز OTP في الوقت الفعلي",
    subtypes: ["SIM Swapping", "OTP Interception", "Real-time Phishing", "SS7 Attack", "App Clone"],
    tools: ["Modlishka", "SocialFish v3", "Evilginx2", "Muraena"],
    defense: "FIDO2 / Hardware Keys / Authenticator App",
  },
  {
    id: "metadata", name: "استخراج البيانات الوصفية", english: "Metadata Scraping",
    color: "#6366f1", severity: "MEDIUM", icon: Camera,
    desc: "استخراج GPS وبيانات الجهاز والموقع من الصور المنشورة",
    subtypes: ["EXIF Extraction", "GPS Harvesting", "Image Fingerprinting", "Reverse Image Search"],
    tools: ["ExifTool", "Metagoofil", "FOCA", "Sherlock"],
    defense: "مسح EXIF قبل النشر + إيقاف موقع الكاميرا",
  },
];

const SUPPORT_TOOLS = [
  {
    id: "burp", name: "Burp Suite", category: "Web App Pentesting",
    color: "#f97316", icon: Globe, threat: "HIGH",
    desc: "اعتراض وتعديل حركة HTTP/HTTPS — الأداة القياسية لأمن تطبيقات الويب",
    features: ["Proxy Interceptor", "Repeater", "Intruder (Fuzzing)", "Scanner (Active/Passive)", "XSS & CSRF Detection", "API Security Testing"],
  },
  {
    id: "metasploit", name: "Metasploit Framework", category: "Exploitation Engine",
    color: "#e21227", icon: Zap, threat: "CRITICAL",
    desc: "أكبر قاعدة بيانات للاستغلالات في العالم — إطار كامل للاختراق المتقدم",
    features: ["2000+ Exploits", "Payload Generator", "Meterpreter Shell", "Post-Exploitation", "Auxiliary Modules", "SET Integration"],
  },
  {
    id: "shodan", name: "Shodan", category: "Internet Scanner",
    color: "#00e5ff", icon: Search, threat: "HIGH",
    desc: "محرك بحث لأجهزة الإنترنت — اكتشاف الخوادم والـ APIs المكشوفة",
    features: ["IoT Device Discovery", "Exposed APIs", "Vuln Database", "Real-time Alerts", "Favicon Hash Search", "SSL Certificate Analysis"],
  },
  {
    id: "pydictor", name: "Pydictor", category: "Password Generator",
    color: "#10b981", icon: Key, threat: "MEDIUM",
    desc: "إنشاء قوائم كلمات مرور مخصصة ذكية للهجمات المستهدفة",
    features: ["Custom Wordlist Gen", "LEET Rules Engine", "Social-based Words", "Hybrid Mutation", "Dictionary Merge", "Length/Charset Control"],
  },
  {
    id: "wireshark", name: "Wireshark", category: "Network Sniffer",
    color: "#6366f1", icon: Wifi, threat: "HIGH",
    desc: "محلل حزم الشبكة — التقاط وتحليل كل حركة الإنترنت في الوقت الفعلي",
    features: ["Packet Capture", "Protocol Dissection", "Cookie Extraction", "Credential Sniffing", "WiFi Monitor Mode", "Live Traffic Analysis"],
  },
  {
    id: "evilginx", name: "Evilginx2", category: "MitM Phishing",
    color: "#a855f7", icon: Network, threat: "CRITICAL",
    desc: "إطار تصيد MitM متقدم يعترض الجلسات ورموز 2FA في الوقت الفعلي",
    features: ["Session Token Theft", "2FA Bypass (RT)", "Auto SSL (Let's Encrypt)", "Phishlets System", "Multi-target Support", "Built-in DNS Server"],
  },
];

const SEV_COLOR: Record<string, string> = {
  CRITICAL: "#e21227", HIGH: "#f97316", MEDIUM: "#f59e0b", LOW: "#22d3ee", INFO: "#6b7280",
};

// ─── 3D NETWORK CANVAS ───────────────────────────────────────────────────────
function NetworkCanvas3D({ color = "#e21227", density = 60 }: { color?: string; density?: number }) {
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

    interface Pt { x: number; y: number; z: number; vx: number; vy: number; vz: number; r: number; c: string }
    const W = () => cv.offsetWidth, H = () => cv.offsetHeight;
    const pts: Pt[] = Array.from({ length: density }, () => ({
      x: Math.random() * W(), y: Math.random() * H(), z: Math.random() * 300 - 150,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, vz: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2.5 + 1,
      c: [color, "#00e5ff", "#a855f7", "#f59e0b"][Math.floor(Math.random() * 4)],
    }));

    let t = 0;
    function draw() {
      t += 0.005; ctx.clearRect(0, 0, W(), H());
      // Scanline
      ctx.fillStyle = `rgba(226,18,39,${0.015 + 0.01 * Math.sin(t * 3)})`;
      const scanY = ((t * 60) % (H() + 40)) - 20;
      ctx.fillRect(0, scanY, W(), 1.5);

      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.z += p.vz;
        if (p.x < 0 || p.x > W()) p.vx *= -1;
        if (p.y < 0 || p.y > H()) p.vy *= -1;
        if (p.z < -150 || p.z > 150) p.vz *= -1;
      });

      // Connections
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const maxDist = 130;
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.4;
            ctx.beginPath(); ctx.moveTo(pts[i].x, pts[i].y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `${pts[i].c}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
            ctx.lineWidth = 0.5; ctx.stroke();
          }
        }
      }

      // Nodes
      pts.forEach(p => {
        const scale = (p.z + 150) / 300;
        const radius = p.r * (0.6 + scale * 0.8);
        const pulse = 0.8 + 0.2 * Math.sin(t * 3 + p.x * 0.01);
        const gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3);
        gr.addColorStop(0, p.c + "88"); gr.addColorStop(1, p.c + "00");
        ctx.beginPath(); ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = gr; ctx.fill();
        ctx.beginPath(); ctx.arc(p.x, p.y, radius * pulse, 0, Math.PI * 2);
        ctx.fillStyle = p.c + "cc"; ctx.shadowColor = p.c; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;
      });

      rafRef.current = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [color, density]);

  return <canvas ref={cvRef} className="absolute inset-0 w-full h-full" style={{ opacity: 0.35 }} />;
}

// ─── ATTACK RADAR ────────────────────────────────────────────────────────────
function AttackRadar() {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = 240 * DPR; cv.height = 240 * DPR;
    cv.style.width = "240px"; cv.style.height = "240px";
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.scale(DPR, DPR);

    const cx = 120, cy = 120, R = 100;
    const blips = Array.from({ length: 8 }, (_, i) => ({
      angle: Math.random() * Math.PI * 2, dist: 20 + Math.random() * 70,
      color: ["#e21227","#f97316","#f59e0b","#a855f7"][i % 4], life: Math.random(),
    }));

    let sweep = 0;
    function draw() {
      sweep += 0.025; ctx.clearRect(0, 0, 240, 240);
      // Rings
      [1, 0.66, 0.33].forEach(r => {
        ctx.beginPath(); ctx.arc(cx, cy, R * r, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(226,18,39,0.15)"; ctx.lineWidth = 1; ctx.stroke();
      });
      // Crosshair
      ctx.strokeStyle = "rgba(226,18,39,0.1)"; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();

      // Sweep gradient
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(sweep);
      const sweepGr = ctx.createLinearGradient(0, 0, R, 0);
      sweepGr.addColorStop(0, "rgba(226,18,39,0.6)");
      sweepGr.addColorStop(1, "rgba(226,18,39,0)");
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, R, -0.05, 1.5, false); ctx.closePath();
      ctx.fillStyle = sweepGr; ctx.fill();
      ctx.restore();

      // Outer ring
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(226,18,39,0.5)"; ctx.lineWidth = 1.5; ctx.stroke();

      // Blips
      blips.forEach(b => {
        b.life -= 0.008; if (b.life < 0) { b.angle = Math.random() * Math.PI * 2; b.dist = 20 + Math.random() * 70; b.life = 1; }
        const bx = cx + Math.cos(b.angle) * b.dist;
        const by = cy + Math.sin(b.angle) * b.dist;
        const alpha = b.life * 0.9;
        const gr2 = ctx.createRadialGradient(bx, by, 0, bx, by, 8);
        gr2.addColorStop(0, b.color + "ff"); gr2.addColorStop(1, b.color + "00");
        ctx.beginPath(); ctx.arc(bx, by, 8, 0, Math.PI * 2);
        ctx.fillStyle = gr2; ctx.globalAlpha = alpha; ctx.fill(); ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fillStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 10; ctx.fill(); ctx.shadowBlur = 0;
      });

      // Center dot
      const cGr = ctx.createRadialGradient(cx, cy, 0, cx, cy, 12);
      cGr.addColorStop(0, "#e21227ff"); cGr.addColorStop(1, "#e2122700");
      ctx.beginPath(); ctx.arc(cx, cy, 12, 0, Math.PI * 2); ctx.fillStyle = cGr; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#e21227"; ctx.shadowColor = "#e21227"; ctx.shadowBlur = 15; ctx.fill(); ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(draw);
    }
    draw(); return () => cancelAnimationFrame(rafRef.current);
  }, []);
  return <canvas ref={cvRef} />;
}

// ─── LIVE STATS TICKER ───────────────────────────────────────────────────────
function LiveTicker() {
  const [stats, setStats] = useState({
    accounts: 2847293, breach: 94821347, active: 127, success: 94.2, tools: 24, vulns: 3891,
  });
  useEffect(() => {
    const iv = setInterval(() => setStats(s => ({
      ...s,
      accounts: s.accounts + Math.floor(Math.random() * 300),
      breach: s.breach + Math.floor(Math.random() * 5000),
      active: 120 + Math.floor(Math.random() * 20),
      vulns: s.vulns + Math.floor(Math.random() * 3),
    })), 1800);
    return () => clearInterval(iv);
  }, []);
  const items = [
    { label: "حسابات مرصودة", val: stats.accounts.toLocaleString(), color: "#e21227" },
    { label: "بيانات مسربة", val: `${(stats.breach / 1e6).toFixed(1)}M`, color: "#f97316" },
    { label: "عمليات نشطة", val: stats.active, color: "#a855f7" },
    { label: "معدل النجاح", val: `${stats.success}%`, color: "#10b981" },
    { label: "أدوات نشطة", val: stats.tools, color: "#00e5ff" },
    { label: "ثغرات مكتشفة", val: stats.vulns.toLocaleString(), color: "#f59e0b" },
  ];
  return (
    <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
      {items.map(it => (
        <div key={it.label} className="flex flex-col items-center p-2 rounded-lg border"
          style={{ borderColor: it.color + "30", background: it.color + "08" }}>
          <div className="text-base font-bold font-mono" style={{ color: it.color, textShadow: `0 0 10px ${it.color}80` }}>
            {it.val}
          </div>
          <div className="text-[9px] text-gray-500 font-mono tracking-wider text-center mt-0.5">{it.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── FRAMEWORK CARD ──────────────────────────────────────────────────────────
function FrameworkCard({ fw }: { fw: typeof FRAMEWORKS[0] }) {
  const [expanded, setExpanded] = useState(false);
  const [running, setRunning] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const simulate = useCallback(async () => {
    setRunning(true); setLog([]);
    const lines = [
      `[*] Initializing ${fw.name}...`,
      `[*] Loading attack modules...`,
      `[+] Module: ${fw.features[0].name} — READY`,
      `[+] Module: ${fw.features[1].name} — READY`,
      `[*] Targeting social platform APIs...`,
      `[+] Template engine loaded — ${fw.stats.platforms} platforms available`,
      `[!] Attack surface mapped — initiating payload delivery`,
      `[*] Success rate: ${fw.stats.success} — ${fw.stats.targets} potential targets`,
      `[✓] Framework operational — awaiting target input`,
    ];
    for (const line of lines) {
      await new Promise(r => setTimeout(r, 180 + Math.random() * 150));
      setLog(prev => [...prev, line]);
    }
    setRunning(false);
  }, [fw]);

  return (
    <motion.div layout className="rounded-2xl border overflow-hidden"
      style={{ borderColor: fw.color + "30", background: "rgba(0,0,0,0.7)", boxShadow: `0 0 30px ${fw.color}12` }}>
      {/* Header */}
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}
        style={{ background: `linear-gradient(135deg, ${fw.color}10 0%, transparent 70%)` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-bold"
              style={{ background: fw.color + "20", border: `1px solid ${fw.color}40`, color: fw.color, textShadow: `0 0 12px ${fw.color}` }}>
              {fw.icon}
            </div>
            <div>
              <div className="font-bold text-white text-sm font-mono">{fw.name}</div>
              <div className="text-[10px] text-gray-400 font-mono">{fw.dev}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full font-mono"
              style={{ background: SEV_COLOR[fw.threat] + "25", color: SEV_COLOR[fw.threat], border: `1px solid ${SEV_COLOR[fw.threat]}40` }}>
              {fw.threat}
            </span>
            <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight size={16} style={{ color: fw.color }} />
            </motion.div>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-2 font-mono leading-relaxed">{fw.desc}</p>
        {/* Mini stats */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {Object.entries(fw.stats).map(([k, v]) => (
            <div key={k} className="text-center">
              <div className="text-sm font-bold font-mono" style={{ color: fw.color }}>{v}</div>
              <div className="text-[8px] text-gray-600 font-mono uppercase">{k}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            <div className="p-4 pt-0 space-y-3">
              {/* Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {fw.features.map((feat, i) => {
                  const Icon = feat.icon;
                  return (
                    <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex items-start gap-2 p-2.5 rounded-xl"
                      style={{ background: fw.color + "08", border: `1px solid ${fw.color}20` }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: fw.color + "20" }}>
                        <Icon size={13} style={{ color: fw.color }} />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold font-mono text-white">{feat.name}</div>
                        <div className="text-[9px] text-gray-400 font-mono leading-snug">{feat.detail}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Terminal */}
              <div className="rounded-xl overflow-hidden border" style={{ borderColor: fw.color + "30" }}>
                <div className="flex items-center justify-between px-3 py-1.5"
                  style={{ background: fw.color + "15" }}>
                  <span className="text-[9px] font-mono" style={{ color: fw.color }}>
                    SIMULATION TERMINAL — {fw.name.toUpperCase()}
                  </span>
                  <button onClick={simulate} disabled={running}
                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-mono font-bold transition-all"
                    style={{ background: running ? "#ffffff10" : fw.color + "30", color: fw.color, border: `1px solid ${fw.color}40` }}>
                    {running ? <><RefreshCw size={9} className="animate-spin" /> جارٍ...</> : <><Play size={9} /> تشغيل</>}
                  </button>
                </div>
                <div className="p-3 min-h-[80px] font-mono text-[10px] leading-5"
                  style={{ background: "#050510", fontFamily: "'Courier New', monospace" }}>
                  {log.length === 0 && !running && (
                    <span className="text-gray-600">// اضغط تشغيل لمحاكاة الإطار...</span>
                  )}
                  {log.map((line, i) => (
                    <motion.div key={i} initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
                      <span style={{ color: line.startsWith("[+]") ? "#10b981" : line.startsWith("[!]") ? "#f59e0b" : line.startsWith("[✓]") ? fw.color : "#6b7280" }}>
                        {line}
                      </span>
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

// ─── OSINT TOOL CARD ─────────────────────────────────────────────────────────
function OsintCard({ tool }: { tool: typeof OSINT_TOOLS[0] }) {
  const [scan, setScan] = useState(false);
  const [progress, setProgress] = useState(0);
  const [findings, setFindings] = useState<string[]>([]);

  const runScan = useCallback(async () => {
    setScan(true); setProgress(0); setFindings([]);
    const fakeFigs = [
      "🔍 البحث في 400+ منصة اجتماعية...",
      "📊 تحليل البيانات الوصفية للصور...",
      "🌐 فحص السجلات التاريخية...",
      "🔗 ربط الهويات الرقمية المتعددة...",
      "📍 استخراج بيانات الموقع الجغرافي...",
      "✅ تقرير OSINT اكتمل — 47 نقطة بيانات",
    ];
    for (let i = 0; i < fakeFigs.length; i++) {
      await new Promise(r => setTimeout(r, 500 + Math.random() * 400));
      setProgress(Math.round(((i + 1) / fakeFigs.length) * 100));
      setFindings(prev => [...prev, fakeFigs[i]]);
    }
    setScan(false);
  }, []);

  return (
    <div className="rounded-2xl border p-4 space-y-3 relative overflow-hidden"
      style={{ borderColor: tool.color + "30", background: "rgba(0,0,0,0.75)", boxShadow: `0 0 20px ${tool.color}0a` }}>
      {/* Glow corner */}
      <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${tool.color}12, transparent 70%)` }} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl font-bold"
            style={{ background: tool.color + "18", border: `1px solid ${tool.color}35`, color: tool.color }}>
            {tool.icon}
          </div>
          <div>
            <div className="font-bold text-white text-sm font-mono">{tool.name}</div>
            <div className="text-[9px] font-mono" style={{ color: tool.color }}>{tool.category}</div>
          </div>
        </div>
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full font-mono"
          style={{ background: SEV_COLOR[tool.threat] + "20", color: SEV_COLOR[tool.threat], border: `1px solid ${SEV_COLOR[tool.threat]}35` }}>
          {tool.threat}
        </span>
      </div>

      <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{tool.desc}</p>

      {/* Capabilities */}
      <div className="space-y-1">
        {tool.capabilities.map((cap, i) => (
          <motion.div key={i} initial={{ x: -15, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.04 }}
            className="flex items-start gap-2 text-[10px] font-mono text-gray-300">
            <span style={{ color: tool.color }} className="mt-0.5 flex-shrink-0">▸</span>
            {cap}
          </motion.div>
        ))}
      </div>

      {/* Scan sim */}
      {(scan || findings.length > 0) && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[9px] font-mono mb-1">
            <span style={{ color: tool.color }}>OSINT SCAN</span>
            <span style={{ color: tool.color }}>{progress}%</span>
          </div>
          <div className="h-1 rounded-full bg-white/5">
            <motion.div className="h-full rounded-full" animate={{ width: `${progress}%` }}
              style={{ background: tool.color, boxShadow: `0 0 6px ${tool.color}80` }} />
          </div>
          <div className="text-[9px] font-mono space-y-0.5 max-h-20 overflow-y-auto">
            {findings.map((f, i) => (
              <div key={i} className="text-gray-400">{f}</div>
            ))}
          </div>
        </div>
      )}

      <button onClick={runScan} disabled={scan}
        className="w-full py-1.5 rounded-xl text-[10px] font-mono font-bold transition-all"
        style={{ background: scan ? "#ffffff08" : tool.color + "20", color: tool.color, border: `1px solid ${tool.color}35` }}>
        {scan ? "جارٍ الفحص..." : "⟳ تشغيل فحص OSINT"}
      </button>
    </div>
  );
}

// ─── ATTACK VECTOR GRID ───────────────────────────────────────────────────────
function AttackVectorCard({ av }: { av: typeof ATTACK_VECTORS[0] }) {
  const Icon = av.icon;
  const [open, setOpen] = useState(false);
  return (
    <motion.div layout className="rounded-xl border overflow-hidden cursor-pointer"
      style={{ borderColor: av.color + "30", background: "rgba(0,0,0,0.7)" }}
      onClick={() => setOpen(!open)}
      whileHover={{ scale: 1.01 }}>
      <div className="p-3" style={{ background: `linear-gradient(135deg, ${av.color}0f, transparent 60%)` }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: av.color + "20", border: `1px solid ${av.color}35` }}>
            <Icon size={14} style={{ color: av.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-white text-[11px] font-mono">{av.name}</div>
            <div className="text-[9px] text-gray-500 font-mono">{av.english}</div>
          </div>
          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full font-mono"
            style={{ background: SEV_COLOR[av.severity] + "20", color: SEV_COLOR[av.severity] }}>
            {av.severity}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 font-mono">{av.desc}</p>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="p-3 pt-0 space-y-2">
              <div>
                <div className="text-[9px] font-mono text-gray-500 mb-1">ATTACK SUBTYPES</div>
                <div className="flex flex-wrap gap-1">
                  {av.subtypes.map(s => (
                    <span key={s} className="text-[8px] font-mono px-1.5 py-0.5 rounded"
                      style={{ background: av.color + "18", color: av.color, border: `1px solid ${av.color}30` }}>{s}</span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[9px] font-mono text-gray-500 mb-1">TOOLS USED</div>
                <div className="flex flex-wrap gap-1">
                  {av.tools.map(t => (
                    <span key={t} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-gray-300">{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-start gap-1.5 p-2 rounded-lg" style={{ background: "#10b98115", border: "1px solid #10b98130" }}>
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

// ─── SUPPORT TOOL CARD ───────────────────────────────────────────────────────
function SupportToolCard({ tool }: { tool: typeof SUPPORT_TOOLS[0] }) {
  const Icon = tool.icon;
  return (
    <div className="rounded-2xl border p-4 space-y-3 relative overflow-hidden"
      style={{ borderColor: tool.color + "30", background: "rgba(0,0,0,0.75)" }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 80% 20%, ${tool.color}08, transparent 60%)` }} />
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center"
          style={{ background: tool.color + "20", border: `1px solid ${tool.color}40` }}>
          <Icon size={18} style={{ color: tool.color }} />
        </div>
        <div>
          <div className="font-bold text-white text-sm font-mono">{tool.name}</div>
          <div className="text-[9px] font-mono" style={{ color: tool.color }}>{tool.category}</div>
        </div>
        <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full font-mono"
          style={{ background: SEV_COLOR[tool.threat] + "20", color: SEV_COLOR[tool.threat], border: `1px solid ${SEV_COLOR[tool.threat]}30` }}>
          {tool.threat}
        </span>
      </div>
      <p className="text-[10px] text-gray-400 font-mono leading-relaxed">{tool.desc}</p>
      <div className="grid grid-cols-2 gap-1.5">
        {tool.features.map((f, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[9px] font-mono text-gray-300">
            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tool.color, boxShadow: `0 0 4px ${tool.color}` }} />
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── LIVE TERMINAL ────────────────────────────────────────────────────────────
function HackTerminal() {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState<Array<{ text: string; color: string }>>([
    { text: "╔══════════════════════════════════════════════════════╗", color: "#e21227" },
    { text: "║   SOCIAL MEDIA ATTACK TERMINAL v4.2.0 — KaliGPT AI  ║", color: "#e21227" },
    { text: "╚══════════════════════════════════════════════════════╝", color: "#e21227" },
    { text: "", color: "#6b7280" },
    { text: "[*] جميع الأدوات جاهزة للاستخدام في بيئة اختبار محكومة", color: "#10b981" },
    { text: "[*] اكتب 'help' لعرض الأوامر المتاحة", color: "#6b7280" },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [lines]);

  const CMD_MAP: Record<string, Array<{ text: string; color: string }>> = {
    help: [
      { text: "الأوامر المتاحة:", color: "#00e5ff" },
      { text: "  set          — تشغيل Social Engineer Toolkit", color: "#a855f7" },
      { text: "  sherlock     — البحث عن أسماء المستخدمين", color: "#f59e0b" },
      { text: "  maltego      — تحليل الروابط والعلاقات", color: "#00e5ff" },
      { text: "  spiderfoot   — مسح OSINT شامل", color: "#10b981" },
      { text: "  socialfish   — بدء هجوم تصيد متقدم", color: "#e21227" },
      { text: "  burp         — تشغيل Burp Suite", color: "#f97316" },
      { text: "  shodan       — البحث في أجهزة الإنترنت", color: "#00e5ff" },
      { text: "  pydictor     — توليد قوائم كلمات مرور", color: "#10b981" },
      { text: "  evilginx     — هجوم MitM مع 2FA Bypass", color: "#a855f7" },
      { text: "  osintgram    — تحليل Instagram", color: "#ec4899" },
      { text: "  clear        — مسح الشاشة", color: "#6b7280" },
    ],
    set: [
      { text: "[*] تهيئة Social Engineer Toolkit...", color: "#6b7280" },
      { text: "[+] استيراد وحدات: WebAttack, Phishing, Payload...", color: "#a855f7" },
      { text: "[+] 12 منصة اجتماعية محملة في الذاكرة", color: "#10b981" },
      { text: "[+] Credential Harvester — جاهز", color: "#10b981" },
      { text: "[!] اختر هدفك من القائمة:", color: "#f59e0b" },
      { text: "    1) Facebook   2) Instagram   3) Twitter/X", color: "#6b7280" },
      { text: "    4) LinkedIn   5) TikTok      6) Snapchat", color: "#6b7280" },
      { text: "[✓] SET جاهز للانتشار — في انتظار التعليمات", color: "#e21227" },
    ],
    sherlock: [
      { text: "[*] Sherlock v0.15.0 — Username Hunt", color: "#f59e0b" },
      { text: "[*] جارٍ الفحص عبر 400+ منصة...", color: "#6b7280" },
      { text: "[+] twitter.com       — ✓ موجود", color: "#10b981" },
      { text: "[+] instagram.com     — ✓ موجود", color: "#10b981" },
      { text: "[+] github.com        — ✓ موجود", color: "#10b981" },
      { text: "[+] reddit.com        — ✓ موجود", color: "#10b981" },
      { text: "[-] facebook.com      — ✗ غير موجود", color: "#6b7280" },
      { text: "[+] linkedin.com      — ✓ موجود", color: "#10b981" },
      { text: "[+] tiktok.com        — ✓ موجود", color: "#10b981" },
      { text: "[✓] النتائج محفوظة في results.txt — 6/7 منصات", color: "#f59e0b" },
    ],
    maltego: [
      { text: "[*] Maltego v4.6 — Graph Intelligence Engine", color: "#00e5ff" },
      { text: "[+] جارٍ جمع البيانات من 500+ مصدر...", color: "#6b7280" },
      { text: "[+] عقد: 12 شخص مرتبط بالهدف", color: "#00e5ff" },
      { text: "[+] نطاقات: 3 نطاقات مرتبطة", color: "#00e5ff" },
      { text: "[+] IPs: 8 عناوين IP مكتشفة", color: "#00e5ff" },
      { text: "[+] بريد إلكتروني: 4 عناوين مستخرجة", color: "#10b981" },
      { text: "[✓] خريطة العلاقات جاهزة — 67 رابط مكتشف", color: "#10b981" },
    ],
    spiderfoot: [
      { text: "[*] SpiderFoot v4.0 — Auto OSINT Platform", color: "#10b981" },
      { text: "[*] تشغيل 200+ وحدة بحث...", color: "#6b7280" },
      { text: "[+] DNS Records         ✓", color: "#10b981" },
      { text: "[+] WHOIS Data          ✓", color: "#10b981" },
      { text: "[+] Social Profiles     ✓ — 7 حسابات", color: "#10b981" },
      { text: "[+] Breach Data         ✓ — 2 تسريبات", color: "#f97316" },
      { text: "[+] Shodan Results      ✓ — 3 أجهزة مكشوفة", color: "#f59e0b" },
      { text: "[!] تهديد متوسط — سطح هجوم محدود", color: "#f59e0b" },
      { text: "[✓] التقرير الكامل جاهز في SpiderFoot UI", color: "#10b981" },
    ],
    socialfish: [
      { text: "[*] SocialFish v3.0 — Advanced Phishing Platform", color: "#e21227" },
      { text: "[+] لوحة التحكم الحية — تشغيل...", color: "#6b7280" },
      { text: "[+] Tunnel (ngrok/serveo) — نشط", color: "#10b981" },
      { text: "[+] Template محدد: Instagram Login Page", color: "#a855f7" },
      { text: "[+] 2FA Interceptor — جاهز للاصطياد", color: "#e21227" },
      { text: "[+] Telegram Bot — متصل للإشعارات", color: "#00e5ff" },
      { text: "[!] URL: https://instagram-verify.ngrok.io", color: "#f59e0b" },
      { text: "[*] انتظار الضحايا... (0 اصطيدوا حتى الآن)", color: "#6b7280" },
    ],
    burp: [
      { text: "[*] Burp Suite Professional v2024.3", color: "#f97316" },
      { text: "[+] Proxy Listener — 127.0.0.1:8080", color: "#10b981" },
      { text: "[+] SSL Certificate — installed", color: "#10b981" },
      { text: "[+] Active Scanner — جاهز", color: "#10b981" },
      { text: "[*] ابدأ تصفح الموقع المستهدف لالتقاط الطلبات", color: "#6b7280" },
      { text: "[✓] Burp جاهز — اذهب إلى http://burpsuite", color: "#f97316" },
    ],
    shodan: [
      { text: "[*] Shodan API — Internet of Everything", color: "#00e5ff" },
      { text: "[*] البحث: 'instagram' country:SA", color: "#6b7280" },
      { text: "[+] 1,247 نتيجة مكتشفة", color: "#10b981" },
      { text: "[+] 847 خادم Apache مكشوف", color: "#f59e0b" },
      { text: "[+] 156 API key مكشوف في الذاكرة", color: "#e21227" },
      { text: "[+] 43 جهاز بدون مصادقة", color: "#e21227" },
      { text: "[✓] تصدير النتائج: shodan_results.json", color: "#00e5ff" },
    ],
    pydictor: [
      { text: "[*] Pydictor v3.0 — Smart Wordlist Generator", color: "#10b981" },
      { text: "[*] توليد قائمة مخصصة للهدف...", color: "#6b7280" },
      { text: "[+] اسم الهدف: محمد / DOB: 1995", color: "#10b981" },
      { text: "[+] تطبيق قواعد LEET: m0h4mm4d1995", color: "#10b981" },
      { text: "[+] دمج كلمات اجتماعية شائعة...", color: "#10b981" },
      { text: "[+] توليد 847,291 كلمة مرور مخصصة", color: "#10b981" },
      { text: "[✓] محفوظ في: target_wordlist.txt (12MB)", color: "#10b981" },
    ],
    evilginx: [
      { text: "[*] Evilginx2 — Advanced MitM Phishing Framework", color: "#a855f7" },
      { text: "[+] DNS Server — نشط على :53", color: "#10b981" },
      { text: "[+] HTTPS Server — نشط على :443", color: "#10b981" },
      { text: "[+] Phishlet: instagram — محمل", color: "#a855f7" },
      { text: "[+] Lure URL: https://ig-login.evil.com", color: "#e21227" },
      { text: "[!] 2FA Bypass — نشط — OTP سيُعترض تلقائياً", color: "#f59e0b" },
      { text: "[*] في انتظار الجلسات... Session tokens سيتدفق هنا", color: "#6b7280" },
    ],
    osintgram: [
      { text: "[*] Osintgram v2.1 — Instagram OSINT Tool", color: "#ec4899" },
      { text: "[+] تسجيل الدخول... ✓", color: "#10b981" },
      { text: "[+] استخراج المتابعين: 2,847 متابع", color: "#ec4899" },
      { text: "[+] استخراج المتابَعين: 891 حساب", color: "#ec4899" },
      { text: "[+] GPS من الصور: 12 موقع مختلف", color: "#f59e0b" },
      { text: "[+] بريد إلكتروني: ahmed@example.com", color: "#10b981" },
      { text: "[+] رقم هاتف: +966-5xx-xxxx87", color: "#10b981" },
      { text: "[✓] تقرير Instagram كامل — 47 نقطة بيانات", color: "#ec4899" },
    ],
    clear: "CLEAR" as never,
  };

  const handleCmd = (cmd: string) => {
    const trimmed = cmd.trim().toLowerCase();
    const prompt = { text: `root@kali:~$ ${cmd}`, color: "#e21227" };
    if (trimmed === "clear") { setLines([]); return; }
    const resp = CMD_MAP[trimmed] ?? [{ text: `bash: ${cmd}: command not found — اكتب 'help' للأوامر`, color: "#ef4444" }];
    setLines(prev => [...prev, prompt, ...(resp as Array<{ text: string; color: string }>)]);
  };

  return (
    <div className="rounded-2xl overflow-hidden border" style={{ borderColor: "#e2122730", background: "#030308" }}>
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: "rgba(226,18,39,0.1)", borderBottom: "1px solid rgba(226,18,39,0.2)" }}>
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <Terminal size={12} className="text-red-400 ml-2" />
        <span className="text-[10px] font-mono text-red-400">SOCIAL MEDIA ATTACK TERMINAL — root@kali</span>
        <button onClick={() => setLines([])} className="ml-auto text-gray-600 hover:text-gray-400 transition-colors">
          <X size={12} />
        </button>
      </div>

      {/* Output */}
      <div className="h-80 overflow-y-auto p-4 font-mono text-[11px] leading-5 space-y-0.5"
        style={{ fontFamily: "'Courier New', Courier, monospace" }}>
        {lines.map((l, i) => (
          <div key={i} style={{ color: l.color }}>{l.text || "\u00a0"}</div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-t" style={{ borderColor: "rgba(226,18,39,0.2)" }}>
        <span className="text-[11px] font-mono text-red-400">root@kali:~$</span>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && input.trim()) { handleCmd(input); setInput(""); } }}
          placeholder="اكتب أمرًا (مثل: help)"
          className="flex-1 bg-transparent text-[11px] font-mono text-gray-200 outline-none placeholder:text-gray-700"
          style={{ fontFamily: "'Courier New', Courier, monospace" }}
          autoComplete="off"
          spellCheck={false}
        />
        <button onClick={() => { if (input.trim()) { handleCmd(input); setInput(""); } }}
          className="text-[9px] font-mono px-2 py-1 rounded font-bold transition-all"
          style={{ background: "rgba(226,18,39,0.2)", color: "#e21227", border: "1px solid rgba(226,18,39,0.3)" }}>
          ↵
        </button>
      </div>
    </div>
  );
}

// ─── OVERVIEW SECTION ─────────────────────────────────────────────────────────
function OverviewSection() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Radar */}
        <div className="rounded-2xl border p-4 flex flex-col items-center gap-3"
          style={{ borderColor: "#e2122730", background: "rgba(0,0,0,0.7)", boxShadow: "0 0 30px rgba(226,18,39,0.06)" }}>
          <div className="text-[9px] font-mono tracking-[0.2em] text-red-400">ATTACK RADAR — LIVE</div>
          <AttackRadar />
          <div className="text-[9px] text-gray-600 font-mono text-center">مراقبة التهديدات في الوقت الفعلي</div>
        </div>

        {/* Stats */}
        <div className="md:col-span-2 space-y-3">
          <div className="rounded-2xl border p-4" style={{ borderColor: "#a855f730", background: "rgba(0,0,0,0.7)" }}>
            <div className="text-[9px] font-mono tracking-[0.2em] text-purple-400 mb-3">LIVE INTELLIGENCE FEED</div>
            <LiveTicker />
          </div>

          {/* Attack surface overview */}
          <div className="rounded-2xl border p-4" style={{ borderColor: "#00e5ff30", background: "rgba(0,0,0,0.7)" }}>
            <div className="text-[9px] font-mono tracking-[0.2em] text-cyan-400 mb-3">ATTACK SURFACE MAP</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { label: "أطر الهندسة الاجتماعية", count: 2, color: "#e21227", icon: Users },
                { label: "أدوات OSINT", count: 4, color: "#00e5ff", icon: Search },
                { label: "آليات الهجوم", count: 8, color: "#f59e0b", icon: Target },
                { label: "الأدوات الداعمة", count: 6, color: "#10b981", icon: Cpu },
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

      {/* Attack chains */}
      <div className="rounded-2xl border p-4" style={{ borderColor: "#f59e0b30", background: "rgba(0,0,0,0.7)" }}>
        <div className="text-[9px] font-mono tracking-[0.2em] text-amber-400 mb-3">ATTACK CHAIN VISUALIZER</div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { label: "OSINT Recon", color: "#00e5ff" },
            { label: "→", color: "#6b7280" },
            { label: "Target Enum", color: "#a855f7" },
            { label: "→", color: "#6b7280" },
            { label: "Phishing Page", color: "#f97316" },
            { label: "→", color: "#6b7280" },
            { label: "Credential Harvest", color: "#e21227" },
            { label: "→", color: "#6b7280" },
            { label: "2FA Bypass", color: "#f59e0b" },
            { label: "→", color: "#6b7280" },
            { label: "Account Takeover", color: "#10b981" },
          ].map((step, i) => (
            <div key={i} className={step.label === "→" ? "text-gray-600 text-lg flex-shrink-0" :
              "flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold"}
              style={step.label !== "→" ? { background: step.color + "18", color: step.color, border: `1px solid ${step.color}35` } : { color: step.color }}>
              {step.label}
            </div>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { title: "فهم الأساليب", desc: "معرفة كيف تعمل هجمات التصيد وهندسة الاجتماعية هو أساس بناء الدفاعات", color: "#e21227", icon: Eye },
          { title: "بيئة محكومة", desc: "جميع الأدوات هنا للأغراض التعليمية وفي سياق اختبار الاختراق المرخص فقط", color: "#10b981", icon: Shield },
          { title: "الاستجابة للحوادث", desc: "يمكن استخدام هذه المعرفة لبناء دفاعات أقوى وسياسات أمان أفضل", color: "#00e5ff", icon: BarChart3 },
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
    const t = setTimeout(() => setBooted(true), 600);
    const gi = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 100); }, 7000);
    return () => { clearTimeout(t); clearInterval(gi); };
  }, []);

  const renderSection = () => {
    switch (section) {
      case "overview":   return <OverviewSection />;
      case "frameworks": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 mb-2">
            أطر الهندسة الاجتماعية الأكثر استخداماً في هجمات وسائل التواصل الاجتماعي
          </div>
          {FRAMEWORKS.map(fw => <FrameworkCard key={fw.id} fw={fw} />)}
        </div>
      );
      case "osint": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 mb-2">
            أدوات الاستخبارات المفتوحة OSINT — جمع المعلومات والتعقب
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {OSINT_TOOLS.map(t => <OsintCard key={t.id} tool={t} />)}
          </div>
        </div>
      );
      case "attacks": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 mb-2">
            آليات الهجوم الرئيسية — كيف تعمل، الأدوات المستخدمة، والدفاع
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ATTACK_VECTORS.map(av => <AttackVectorCard key={av.id} av={av} />)}
          </div>
        </div>
      );
      case "tools": return (
        <div className="space-y-4">
          <div className="text-[10px] font-mono text-gray-500 mb-2">
            الأدوات الداعمة في منظومة اختبار اختراق وسائل التواصل الاجتماعي
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SUPPORT_TOOLS.map(t => <SupportToolCard key={t.id} tool={t} />)}
          </div>
        </div>
      );
      case "terminal": return <HackTerminal />;
      default: return <OverviewSection />;
    }
  };

  const cur = SECTIONS.find(s => s.id === section)!;

  return (
    <AnimatePresence>
      {booted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="relative min-h-full bg-black overflow-hidden"
          style={{ filter: glitch ? "hue-rotate(20deg) brightness(1.15)" : "none", transition: "filter 0.05s" }}
        >
          {/* BG network */}
          <div className="absolute inset-0 pointer-events-none">
            <NetworkCanvas3D color={cur.color} density={50} />
          </div>

          {/* Gradient overlay */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(226,18,39,0.06) 0%, transparent 60%)" }} />

          <div className="relative z-10 flex flex-col h-full">
            {/* HEADER */}
            <div className="px-4 py-3 border-b flex-shrink-0"
              style={{ borderColor: "rgba(226,18,39,0.2)", background: "rgba(0,0,0,0.85)", backdropFilter: "blur(20px)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.3)" }}>
                    <Crosshair size={18} className="text-red-400" />
                  </div>
                  <div>
                    <h1 className="text-sm font-bold font-mono text-white tracking-wider">
                      SOCIAL MEDIA ATTACK ARSENAL
                    </h1>
                    <div className="text-[9px] font-mono text-red-400 tracking-[0.2em]">
                      مركز هجوم وسائل التواصل الاجتماعي — منصة اختبار الاختراق
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
              <div className="flex gap-1 overflow-x-auto pb-0.5">
                {SECTIONS.map(s => (
                  <button key={s.id} onClick={() => setSection(s.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold whitespace-nowrap flex-shrink-0 transition-all"
                    style={section === s.id ? {
                      background: s.color + "20",
                      color: s.color,
                      border: `1px solid ${s.color}40`,
                      boxShadow: `0 0 10px ${s.color}20`,
                    } : {
                      background: "transparent",
                      color: "#6b7280",
                      border: "1px solid transparent",
                    }}>
                    <span>{s.icon}</span>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto p-4">
              <AnimatePresence mode="wait">
                <motion.div key={section}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}>
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
