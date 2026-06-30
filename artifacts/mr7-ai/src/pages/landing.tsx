import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { useLocation } from "wouter";
import {
  Shield, Terminal, Zap, Eye, Brain, Lock, ChevronRight, Server, Code2,
  Crosshair, Cpu, Activity, Globe, Wifi, Database, Search, Network,
  FlaskConical, Layers, Radar, Bug, Fingerprint, Key, BarChart3,
  GitBranch, Boxes, Swords, BookOpen, Radio, MonitorCheck, Target,
  Cpu as CpuIcon, Hexagon, ShieldCheck, AlertTriangle, TrendingUp,
  Users, Clock, Flame, Star, ChevronDown, Play,
} from "lucide-react";
import { MatrixRain } from "@/components/MatrixRain";
import { HoloCoreOrb } from "@/components/HoloCoreOrb";
import { Cyber3DGrid } from "@/components/Cyber3DGrid";
import { ThreatFeedTicker } from "@/components/ThreatFeedTicker";
import { WebGLParticleField } from "@/components/WebGLParticleField";

/* ══════════════════════════════════════════════════════════════
   3D PARTICLE SYSTEM
══════════════════════════════════════════════════════════════ */
interface Particle {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  r: number; alpha: number; color: string; type: "dot" | "cross" | "ring";
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const COLORS = ["#e21227","#ff3c3c","#ff6b35","rgba(226,18,39,0.6)","rgba(255,255,255,0.5)","rgba(255,255,255,0.2)","rgba(167,139,250,0.5)","rgba(0,229,255,0.3)"];
    const TYPES: Particle["type"][] = ["dot","dot","dot","cross","ring"];

    particles.current = Array.from({ length: 220 }, () => ({
      x: Math.random() * canvas!.width,
      y: Math.random() * canvas!.height,
      z: Math.random() * 1000,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      vz: -0.5 - Math.random() * 1.5,
      r: 1 + Math.random() * 3,
      alpha: 0.3 + Math.random() * 0.7,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      type: TYPES[Math.floor(Math.random() * TYPES.length)],
    }));

    function onMouse(e: MouseEvent) {
      mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    }
    window.addEventListener("mousemove", onMouse);

    function draw() {
      const w = canvas!.width; const h = canvas!.height;
      ctx.clearRect(0, 0, w, h);
      const focalLength = 600;
      const mx = (mouseRef.current.x - 0.5) * 30;
      const my = (mouseRef.current.y - 0.5) * 20;
      particles.current.forEach(p => {
        p.z += p.vz; p.x += p.vx + mx * 0.002; p.y += p.vy + my * 0.002;
        if (p.z <= 0) p.z = 1000;
        if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
        const scale = focalLength / (focalLength + p.z);
        const px = (p.x - w / 2) * scale + w / 2;
        const py = (p.y - h / 2) * scale + h / 2;
        const r = Math.max(0.3, p.r * scale);
        const alpha = p.alpha * scale * 0.8;
        ctx.globalAlpha = Math.min(1, alpha);
        if (p.type === "dot") {
          const grd = ctx.createRadialGradient(px, py, 0, px, py, r * 4);
          grd.addColorStop(0, p.color); grd.addColorStop(1, "transparent");
          ctx.beginPath(); ctx.arc(px, py, r * 4, 0, Math.PI * 2);
          ctx.fillStyle = grd; ctx.fill();
          ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2);
          ctx.fillStyle = p.color; ctx.fill();
        } else if (p.type === "cross") {
          ctx.strokeStyle = p.color; ctx.lineWidth = r * 0.5;
          ctx.beginPath();
          ctx.moveTo(px - r * 3, py); ctx.lineTo(px + r * 3, py);
          ctx.moveTo(px, py - r * 3); ctx.lineTo(px, py + r * 3);
          ctx.stroke();
        } else {
          ctx.strokeStyle = p.color; ctx.lineWidth = r * 0.4;
          ctx.beginPath(); ctx.arc(px, py, r * 2.5, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      });
      const pts = particles.current;
      for (let i = 0; i < pts.length; i++) {
        const fl = 600;
        const s1 = fl / (fl + pts[i].z);
        const px1 = (pts[i].x - w / 2) * s1 + w / 2;
        const py1 = (pts[i].y - h / 2) * s1 + h / 2;
        for (let j = i + 1; j < Math.min(pts.length, i + 8); j++) {
          const s2 = fl / (fl + pts[j].z);
          const px2 = (pts[j].x - w / 2) * s2 + w / 2;
          const py2 = (pts[j].y - h / 2) * s2 + h / 2;
          const dx = px1 - px2; const dy = py1 - py2;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.globalAlpha = (1 - dist / 120) * 0.12;
            ctx.strokeStyle = "#e21227"; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(px1, py1); ctx.lineTo(px2, py2); ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }
      frameRef.current = requestAnimationFrame(draw);
    }
    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LIVE STATS COUNTER
══════════════════════════════════════════════════════════════ */
function LiveCounter({ target, suffix = "", duration = 2000, color = "#e21227" }: { target: number; suffix?: string; duration?: number; color?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const step = target / (duration / 16);
      const interval = setInterval(() => {
        start = Math.min(start + step, target);
        setVal(Math.floor(start));
        if (start >= target) clearInterval(interval);
      }, 16);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref} style={{ color }}>{val.toLocaleString()}{suffix}</span>;
}

/* ══════════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════════ */
const features = [
  { icon: Brain, title: "ذكاء اصطناعي متخصص", desc: "نماذج مدرّبة خصيصاً على الأمن السيبراني — اختبار الاختراق، تحليل الثغرات، والأوامر الهجومية.", color: "#e21227" },
  { icon: Terminal, title: "ترمينال تفاعلي", desc: "طرفية أوامر مدمجة في المتصفح تتيح تنفيذ أوامر Shell بشكل مباشر داخل جلسة الذكاء الاصطناعي.", color: "#ff6b35" },
  { icon: Eye, title: "وحدة OSINT المتقدمة", desc: "جمع المعلومات مفتوحة المصدر، تحليل المواقع، وتتبع البصمة الرقمية بدقة عالية.", color: "#00e5ff" },
  { icon: Crosshair, title: "أسلوب Red Team", desc: "محاكاة هجمات حقيقية، تقييم الدفاعات، وتحليل نقاط الضعف من منظور المهاجم.", color: "#a78bfa" },
  { icon: Server, title: "وضع المجلس — Council Mode", desc: "256 عقل متخصص تعمل في آنٍ واحد: مخترق، محلل، مطور، محقق جنائي، وأكثر.", color: "#e21227" },
  { icon: Code2, title: "ترسانة Arsenal v2", desc: "+120 أداة متخصصة: JARVIS، Parseltongue، RAGFlow، NexusAI، وأدوات هجومية ودفاعية متكاملة.", color: "#22c55e" },
  { icon: Radar, title: "CVE Watcher Live", desc: "مراقبة لحظية لقاعدة بيانات الثغرات العالمية مع تنبيهات فورية وتحليل أثر تلقائي.", color: "#fbbf24" },
  { icon: Network, title: "Network Interceptor Pro", desc: "تحليل حركة الشبكة، فحص البروتوكولات، واكتشاف الأجهزة المخفية في البنية التحتية.", color: "#f97316" },
  { icon: Fingerprint, title: "Digital Forensics AI", desc: "التحليل الجنائي الرقمي: استخراج البيانات، تحليل الأدلة، وإعادة تشكيل سلسلة الهجوم.", color: "#e21227" },
  { icon: Hexagon, title: "Swarm Intelligence", desc: "16 عميل ذكاء اصطناعي مستقل يعملون بالتوازي على تحليل الأهداف وتنسيق الهجمات.", color: "#a78bfa" },
  { icon: ShieldCheck, title: "SIEM / SOAR مدمج", desc: "محرك الأحداث الأمنية مع ردود فعل آلية — 48 قاعدة استجابة مُعدّة مسبقاً.", color: "#00e5ff" },
  { icon: AlertTriangle, title: "Zero-Day Scanner", desc: "محرك فحص الثغرات غير المكتشفة باستخدام تحليل السلوك الديناميكي والأنماط المجهولة.", color: "#fbbf24" },
];

const models = [
  { name: "CHAT-GPT Fast",       tag: "سريع",        color: "#3b82f6", icon: Zap },
  { name: "CHAT-GPT Thinking",   tag: "تفكير عميق",  color: "#a855f7", icon: Brain },
  { name: "CHAT-GPT Coder",      tag: "برمجة",        color: "#22c55e", icon: Code2 },
  { name: "CHAT-GPT Researcher", tag: "بحث",          color: "#eab308", icon: Search },
  { name: "KaliGPT Red Team",    tag: "هجومي",        color: "#e21227", icon: Swords },
  { name: "GodMode 18x",         tag: "لا حدود",      color: "#f97316", icon: Zap },
  { name: "Claude Opus",         tag: "تحليل",        color: "#00e5ff", icon: BookOpen },
  { name: "Gemini Ultra",        tag: "متعدد",        color: "#34d399", icon: Layers },
  { name: "DeepSeek V3",         tag: "استدلال",      color: "#00ffcc", icon: Brain },
  { name: "Grok 3",              tag: "X.ai",         color: "#ff3333", icon: Flame },
];

const faqs = [
  { q: "هل يمكن استخدام KaliGPT للأغراض التعليمية فقط؟", a: "نعم. KaliGPT مصمم للباحثين الأمنيين والمختبرين المرخصين وطلاب الأمن السيبراني في بيئات اختبار قانونية فقط." },
  { q: "ما الفرق بين KaliGPT وChatGPT العادي؟", a: "KaliGPT مخصص 100% للأمن السيبراني ويمتلك قاعدة معرفية بالأدوات الهجومية والدفاعية، بينما ChatGPT نموذج عام متحفظ." },
  { q: "هل بياناتي محفوظة أم تُعالج محلياً؟", a: "تُرسل المحادثات إلى الخادم لمعالجتها عبر نموذج اللغة. لا نحتفظ بمحتوى المحادثات بعد انتهاء الجلسة." },
  { q: "ما هو وضع المجلس Council Mode؟", a: "وضع فريد يُشغّل 256 نموذج ذكاء اصطناعي متخصص في وقت واحد على نفس المشكلة، ثم يجمع النتائج في تقرير شامل." },
  { q: "هل يدعم GodMode استخدام مفاتيح API الخاصة بي؟", a: "نعم، يمكنك ربط مفاتيح OpenAI وAnthropic وGroq وGemini وDeepSeek وxAI والمزيد. GodMode يستخدم أفضل مزود متاح تلقائياً." },
  { q: "هل يعمل KaliGPT بدون اتصال بالإنترنت؟", a: "يمكن تشغيل النماذج المحلية مثل Ollama وLM Studio بدون إنترنت عبر وحدة Local Engine المدمجة." },
  { q: "ما هو Swarm Intelligence؟", a: "نظام متقدم يُشغّل 16 عميل ذكاء اصطناعي بشكل مستقل وبالتوازي، يتعاونون لتحليل هدف واحد من زوايا مختلفة ويجمعون النتائج." },
  { q: "هل يدعم SIEM/SOAR المدمج التكامل مع الأنظمة الخارجية؟", a: "نعم، يدعم إرسال التنبيهات إلى Slack وPagerDuty وWebhooks مخصصة. يمكن ربطه بأي SIEM خارجي عبر API." },
];

const arsenalTools = [
  { icon: Terminal,    name: "ShellGen v2",    desc: "توليد أوامر Shell هجومية",     col: "#e21227", cat: "OFFENSIVE" },
  { icon: Eye,         name: "OSINT+",         desc: "استخبارات مصادر مفتوحة",       col: "#00e5ff", cat: "RECON"    },
  { icon: Bug,         name: "CVEWatch Live",  desc: "مراقبة الثغرات الحية",          col: "#a78bfa", cat: "INTEL"   },
  { icon: Network,     name: "NetScan Pro",    desc: "فحص الشبكات والبنية التحتية",  col: "#22c55e", cat: "NETWORK" },
  { icon: Brain,       name: "Council 256",    desc: "256 عقل في آنٍ واحد",           col: "#fbbf24", cat: "AI"      },
  { icon: Database,    name: "RAGFlow v2",     desc: "قاعدة معرفة أمنية متجهية",     col: "#00e5ff", cat: "DB"      },
  { icon: Radar,       name: "Threat Intel",   desc: "تحليل التهديدات اللحظية",      col: "#e21227", cat: "INTEL"   },
  { icon: Code2,       name: "JARVIS Pro",     desc: "مساعد برمجة هجومية",           col: "#f97316", cat: "DEV"     },
  { icon: Lock,        name: "CipherBreak",    desc: "تحليل التشفير وكسره",           col: "#a78bfa", cat: "CRYPTO"  },
  { icon: Globe,       name: "DarkWeb Mon",    desc: "مراقبة الويب المظلم",           col: "#e21227", cat: "OSINT"   },
  { icon: FlaskConical,name: "Parseltongue v3",desc: "توليد shellcode متقدم",        col: "#22c55e", cat: "EXPLOIT" },
  { icon: GitBranch,   name: "ChainBuilder v2",desc: "بناء سلاسل الهجوم",            col: "#00e5ff", cat: "PIPELINE"},
  { icon: Fingerprint, name: "Forensics AI",   desc: "التحليل الجنائي الرقمي",       col: "#fbbf24", cat: "FORENSIC"},
  { icon: Key,         name: "PrivEsc AI v2",  desc: "رفع الصلاحيات التلقائي",       col: "#e21227", cat: "EXPLOIT" },
  { icon: Boxes,       name: "ArsenalHub v2",  desc: "مركز تحكم الأدوات",            col: "#a78bfa", cat: "HUB"     },
  { icon: MonitorCheck,name: "GodMode 18x",    desc: "18 وضع بدون قيود",             col: "#ff6b35", cat: "GODMODE" },
  { icon: Hexagon,     name: "Swarm AI",       desc: "16 عميل مستقل",               col: "#a78bfa", cat: "AI"      },
  { icon: ShieldCheck, name: "SIEM/SOAR",      desc: "استجابة آلية للتهديدات",       col: "#00e5ff", cat: "DEFENSE" },
  { icon: AlertTriangle,name: "ZeroDay Scan",  desc: "فحص الثغرات المجهولة",         col: "#fbbf24", cat: "SCANNER" },
  { icon: Target,      name: "C2 Framework",   desc: "إطار القيادة والسيطرة",        col: "#e21227", cat: "C2"      },
];

const howItWorks = [
  {
    step: "01", icon: Key, title: "سجّل وادخل", col: "#e21227",
    desc: "أنشئ حسابك مجاناً خلال ثوانٍ. ربط مزوديك أو استخدم النماذج المدمجة فوراً.",
  },
  {
    step: "02", icon: Layers, title: "اختر وضع العمل", col: "#00e5ff",
    desc: "اختر من 18 وضع عمل: من Chat البسيط إلى GodMode وCouncil وRed Team AI وSwarm.",
  },
  {
    step: "03", icon: Swords, title: "اطلق العملية", col: "#a78bfa",
    desc: "شغّل أدواتك، حلّل الأهداف، ولد التقارير — كل شيء في واجهة واحدة متكاملة.",
  },
];

const comparisons = [
  { feature: "تخصص الأمن السيبراني", kg: true,  cg: false, cp: false },
  { feature: "Council Mode — 256 عقل", kg: true,  cg: false, cp: false },
  { feature: "GodMode 18x بدون قيود", kg: true,  cg: false, cp: false },
  { feature: "Arsenal 120+ أداة",       kg: true,  cg: false, cp: false },
  { feature: "OSINT متقدم + دارك ويب",  kg: true,  cg: false, cp: false },
  { feature: "ShellGen هجومي v2",       kg: true,  cg: false, cp: false },
  { feature: "نماذج متعددة المزودين",   kg: true,  cg: false, cp: true  },
  { feature: "CVE Watcher لحظي",        kg: true,  cg: false, cp: false },
  { feature: "وضع الشبكة المحلية",      kg: true,  cg: false, cp: false },
  { feature: "Swarm Intelligence",      kg: true,  cg: false, cp: false },
  { feature: "SIEM/SOAR مدمج",          kg: true,  cg: false, cp: false },
  { feature: "دعم عربي متكامل",          kg: true,  cg: true,  cp: false },
];

const testimonials = [
  { name: "محمد الشمري", role: "Senior Pentester", avatar: "M", text: "KaliGPT غيّر طريقة عملي كلياً. Council Mode وحده يساوي فريق كامل من المختبرين.", rating: 5, col: "#e21227" },
  { name: "Sarah K.", role: "Red Team Lead", avatar: "S", text: "The Arsenal v2 is unmatched. ShellGen + OSINT+ saved me 3 hours per engagement.", rating: 5, col: "#00e5ff" },
  { name: "خالد العمري", role: "CTF Player", avatar: "K", text: "GodMode للـ CTF = الشفرة المطلقة. لا قيود، لا رقابة، نتائج مباشرة ومدهشة.", rating: 5, col: "#a78bfa" },
  { name: "Alex R.", role: "CISO @ SecureCorp", avatar: "A", text: "We integrated KaliGPT into our threat intel pipeline. Phenomenal accuracy on APT detection.", rating: 5, col: "#22c55e" },
  { name: "يوسف المالكي", role: "Security Researcher", avatar: "Y", text: "Swarm AI ثوري. أرسل 16 عميل يحللون هدف واحد في آنٍ واحد — النتائج خارقة.", rating: 5, col: "#fbbf24" },
  { name: "Chen W.", role: "Bug Bounty Hunter", avatar: "C", text: "CVE Watcher + ZeroDay Scanner combo is a game changer for bug bounty programs.", rating: 5, col: "#f97316" },
];

const liveActivity = [
  { type: "SCAN",   msg: "Red team scan initiated on 192.168.1.0/24",       col: "#e21227", time: "now" },
  { type: "CVE",    msg: "CVE-2025-1337 — CVSS 10.0 CRITICAL detected",     col: "#fbbf24", time: "2s"  },
  { type: "OSINT",  msg: "OSINT sweep: 23 subdomains + 8 exposed APIs",      col: "#00e5ff", time: "5s"  },
  { type: "SHELL",  msg: "Reverse shell payload generated (polymorphic)",     col: "#a78bfa", time: "8s"  },
  { type: "SWARM",  msg: "Swarm session: 16 agents analyzing target",         col: "#22c55e", time: "11s" },
  { type: "COUNCIL",msg: "Council session: 256 brains analyzing CVE",         col: "#22c55e", time: "14s" },
  { type: "ALERT",  msg: "APT-29 lateral movement blocked",                   col: "#f97316", time: "18s" },
  { type: "SIEM",   msg: "SIEM: 847 events/sec — 3 critical alerts fired",   col: "#00e5ff", time: "22s" },
];

const liveStats = [
  { label: "مستخدم نشط",  value: 14823, suffix: "", icon: Users,       col: "#e21227" },
  { label: "فحص اليوم",    value: 98200, suffix: "+", icon: Target,     col: "#00e5ff" },
  { label: "CVE مُكتشف",   value: 1893,  suffix: "",  icon: AlertTriangle, col: "#fbbf24" },
  { label: "نموذج AI",      value: 10,    suffix: "+", icon: Brain,       col: "#a78bfa" },
  { label: "دقة التهديد",  value: 99,    suffix: "%", icon: TrendingUp,  col: "#22c55e" },
  { label: "وضع عمل",       value: 18,    suffix: "",  icon: Layers,      col: "#f97316" },
];

/* ══════════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
══════════════════════════════════════════════════════════════ */
function HolographicCard({ children, className = "", style = {} }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [rot, setRot] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  function handleMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setRot({ x: -dy * 8, y: dx * 8 });
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{ perspective: "1000px", ...style }}
      onMouseMove={handleMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setRot({ x: 0, y: 0 }); }}
    >
      <div style={{
        transform: `rotateX(${rot.x}deg) rotateY(${rot.y}deg) ${hovered ? "translateZ(8px)" : "translateZ(0px)"}`,
        transformStyle: "preserve-3d",
        transition: hovered ? "none" : "transform 0.5s cubic-bezier(0.23,1,0.32,1)",
        willChange: "transform",
      }}>
        {children}
      </div>
    </div>
  );
}

function GridBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `linear-gradient(rgba(226,18,39,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(226,18,39,0.06) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
        transform: "perspective(600px) rotateX(35deg) scaleX(1.6)",
        transformOrigin: "50% 0%",
        maskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 60%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 30%, black 60%, transparent 100%)",
      }} />
    </div>
  );
}

function NeuralNetCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let W = window.innerWidth, H = window.innerHeight;
    cv.width = W; cv.height = H;

    const onResize = () => { W = window.innerWidth; H = window.innerHeight; cv.width = W; cv.height = H; };
    window.addEventListener("resize", onResize);

    const NODE_COUNT = Math.min(65, Math.floor(W * H / 15000));
    interface Node { x: number; y: number; vx: number; vy: number; r: number; pulse: number; phase: number }
    const nodes: Node[] = Array.from({ length: NODE_COUNT }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
      r: 1.5 + Math.random() * 2.5,
      pulse: Math.random() * Math.PI * 2, phase: Math.random() * Math.PI * 2,
    }));

    let t = 0;
    const draw = () => {
      frameRef.current = requestAnimationFrame(draw);
      t += 0.012;
      ctx.clearRect(0, 0, W, H);
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy; n.pulse += 0.04;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
      });
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x; const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const alpha = (1 - dist / 180) * 0.18;
            const pa = alpha * (0.5 + Math.sin(t * 3 + nodes[i].phase) * 0.5);
            ctx.beginPath(); ctx.moveTo(nodes[i].x, nodes[i].y); ctx.lineTo(nodes[j].x, nodes[j].y);
            const g = ctx.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
            g.addColorStop(0, `rgba(226,18,39,${pa * 1.2})`);
            g.addColorStop(0.5, `rgba(167,139,250,${pa})`);
            g.addColorStop(1, `rgba(0,229,255,${pa * 0.8})`);
            ctx.strokeStyle = g; ctx.lineWidth = 0.6; ctx.stroke();
          }
        }
      }
      nodes.forEach(n => {
        const glow = 0.4 + Math.sin(n.pulse) * 0.3;
        const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r * 3);
        rg.addColorStop(0, `rgba(226,18,39,${glow})`); rg.addColorStop(1, `rgba(226,18,39,0)`);
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 3, 0, Math.PI * 2); ctx.fillStyle = rg; ctx.fill();
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${glow * 0.8})`; ctx.fill();
      });
    };
    draw();
    return () => { cancelAnimationFrame(frameRef.current); window.removeEventListener("resize", onResize); };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity: 0.35, zIndex: 0 }} />;
}

function ScanLine() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
      <div style={{
        position: "absolute", left: 0, right: 0, height: "2px",
        background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.4), rgba(255,255,255,0.15), rgba(226,18,39,0.4), transparent)",
        animation: "scanline 6s linear infinite",
        boxShadow: "0 0 20px rgba(226,18,39,0.3)",
      }} />
    </div>
  );
}

const TYPEWRITER_PHRASES = [
  "اختبار الاختراق المتقدم بالذكاء الاصطناعي",
  "Advanced Penetration Testing AI",
  "Red Team · OSINT · Council Mode · Arsenal v2",
  "256 عقل ذكاء اصطناعي في وقت واحد",
  "Shell Generator · Dark Web Search · Godmode 18x",
  "مساعدك الهجومي الأول في الأمن السيبراني",
  "CVE Watcher · Forensics · ZeroDay Scanner",
  "Swarm Intelligence · SIEM/SOAR · C2 Framework",
];

function TypewriterText({ className = "", style = {} }: { className?: string; style?: CSSProperties }) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [charIdx, setCharIdx] = useState(0);

  useEffect(() => {
    const phrase = TYPEWRITER_PHRASES[phraseIdx];
    if (!deleting) {
      if (charIdx < phrase.length) {
        const tid = setTimeout(() => { setDisplayed(phrase.slice(0, charIdx + 1)); setCharIdx(c => c + 1); }, 42 + Math.random() * 18);
        return () => clearTimeout(tid);
      } else {
        const tid = setTimeout(() => setDeleting(true), 2400);
        return () => clearTimeout(tid);
      }
    } else {
      if (charIdx > 0) {
        const tid = setTimeout(() => { setDisplayed(phrase.slice(0, charIdx - 1)); setCharIdx(c => c - 1); }, 22);
        return () => clearTimeout(tid);
      } else {
        setDeleting(false);
        setPhraseIdx(i => (i + 1) % TYPEWRITER_PHRASES.length);
        return undefined;
      }
    }
  }, [charIdx, deleting, phraseIdx]);

  return (
    <span className={className} style={style}>
      {displayed}
      <span style={{ display: "inline-block", width: "2px", height: "1em", background: "#e21227", marginLeft: "2px", verticalAlign: "middle", animation: "terminalBlink 1s step-end infinite", boxShadow: "0 0 8px #e21227" }} />
    </span>
  );
}

function GlitchLayer({ text, color = "#e21227" }: { text: string; color?: string }) {
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      {text}
      <span aria-hidden style={{ position: "absolute", left: 0, top: 0, color, clipPath: "inset(30% 0 50% 0)", animation: "glitch 4s infinite", opacity: 0.7, pointerEvents: "none" }}>{text}</span>
      <span aria-hidden style={{ position: "absolute", left: 0, top: 0, color: "#00e5ff", clipPath: "inset(60% 0 20% 0)", animation: "glitch 4s infinite", animationDelay: "0.5s", opacity: 0.4, pointerEvents: "none" }}>{text}</span>
    </span>
  );
}

function HexScanLine() {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 2 }}>
      <div style={{ position: "absolute", left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent 0%, rgba(0,229,255,0.0) 10%, rgba(0,229,255,0.6) 30%, rgba(226,18,39,0.8) 50%, rgba(0,229,255,0.6) 70%, rgba(0,229,255,0.0) 90%, transparent 100%)", animation: "scanline 9s linear infinite", animationDelay: "3s", boxShadow: "0 0 12px rgba(0,229,255,0.4)" }} />
    </div>
  );
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
      <div style={{ width: 20, height: 1, background: "linear-gradient(90deg, transparent, #e21227)" }} />
      <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(226,18,39,0.7)", letterSpacing: "0.35em", fontWeight: 700 }}>{text}</span>
      <div style={{ width: 20, height: 1, background: "linear-gradient(90deg, #e21227, transparent)" }} />
    </div>
  );
}

function TerminalDemo() {
  const lines = [
    { text: "$ kaligpt --mode red-team --target example.com", col: "#00ff41", delay: 0 },
    { text: "[*] Initializing Red Team mode...", col: "#a78bfa", delay: 600 },
    { text: "[*] Running OSINT sweep on example.com...", col: "#00e5ff", delay: 1100 },
    { text: "[+] Found: 14 subdomains, 3 exposed APIs, 1 login panel", col: "#22c55e", delay: 1800 },
    { text: "[*] Scanning for CVEs in stack...", col: "#00e5ff", delay: 2400 },
    { text: "[!] CVE-2025-1337 (CVSS 9.8) — Apache vulnerable version", col: "#fbbf24", delay: 3100 },
    { text: "[*] Generating exploit payload...", col: "#a78bfa", delay: 3700 },
    { text: "[+] Payload ready — council review initiated (256 brains)", col: "#22c55e", delay: 4400 },
    { text: "[✓] Report generated: 47 findings, 12 critical", col: "#e21227", delay: 5100 },
  ];

  const [visible, setVisible] = useState(0);

  useEffect(() => {
    lines.forEach(({ delay }, i) => {
      setTimeout(() => setVisible(v => Math.max(v, i + 1)), delay);
    });
  }, []);

  return (
    <div style={{
      background: "#060606", borderRadius: 16, border: "1px solid rgba(0,229,255,0.15)",
      boxShadow: "0 0 40px rgba(0,229,255,0.08), 0 20px 60px rgba(0,0,0,0.5)",
      overflow: "hidden",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#eab308" }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e" }} />
        <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", marginLeft: 8 }}>kaligpt — bash · Red Team Mode</span>
      </div>
      <div style={{ padding: "16px", fontFamily: "monospace", fontSize: "12px", lineHeight: 1.9, minHeight: 220 }}>
        {lines.slice(0, visible).map((line, i) => (
          <div key={i} style={{ color: line.col }}>{line.text}</div>
        ))}
        {visible < lines.length && (
          <span style={{ display: "inline-block", width: 8, height: 14, background: "#00ff41", animation: "terminalBlink 1s step-end infinite", verticalAlign: "middle" }} />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [, navigate] = useLocation();
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [activityIdx, setActivityIdx] = useState(0);
  const [activeToolCat, setActiveToolCat] = useState("ALL");

  useEffect(() => {
    const id = setInterval(() => setActivityIdx(i => (i + 1) % liveActivity.length), 2200);
    return () => clearInterval(id);
  }, []);

  const toolCats = ["ALL", "OFFENSIVE", "RECON", "INTEL", "NETWORK", "AI", "EXPLOIT", "FORENSIC", "GODMODE", "DEFENSE"];
  const filteredTools = activeToolCat === "ALL" ? arsenalTools : arsenalTools.filter(t => t.cat === activeToolCat);

  return (
    <div style={{ background: "#000", color: "#fff", minHeight: "100vh", overflowX: "hidden", position: "relative" }}>
      <style>{`
        @keyframes scanline { from { top: -2px } to { top: 100% } }
        @keyframes terminalBlink { 0%,100% { opacity:1 } 50% { opacity:0 } }
        @keyframes glitch {
          0%,90%,100% { transform: translate(0) }
          91% { transform: translate(-2px,1px) }
          93% { transform: translate(2px,-1px) }
          95% { transform: translate(-1px,2px) }
          97% { transform: translate(1px,-2px) }
        }
        @keyframes pulse3d {
          0%,100% { transform: scale(1) rotateY(0deg) }
          50% { transform: scale(1.05) rotateY(10deg) }
        }
        @keyframes float {
          0%,100% { transform: translateY(0) }
          50% { transform: translateY(-10px) }
        }
        .holo-btn { transition: all 0.3s ease; }
        .holo-btn:hover { filter: brightness(1.15); transform: translateY(-2px); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
        ::-webkit-scrollbar-thumb { background: rgba(226,18,39,0.3); border-radius: 2px; }
      `}</style>

      <ParticleCanvas />
      <NeuralNetCanvas />

      {/* ── NAV ── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(226,18,39,0.12)",
        background: "rgba(0,0,0,0.85)",
      }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #e21227, #c4101f)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(226,18,39,0.5)" }}>
              <Shield style={{ width: 18, height: 18, color: "#fff" }} />
            </div>
            <div>
              <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.5px" }}>
                <span style={{ color: "#e21227" }}>Kali</span>GPT
              </span>
              <div style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em" }}>v5.0 · ARSENAL MODE PRO</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            {[["الميزات", "features"], ["الترسانة", "arsenal"], ["الأسعار", "pricing"], ["FAQ", "faq"]].map(([label, id]) => (
              <button key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}
                style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
              >{label}</button>
            ))}
            <button onClick={() => navigate("/app")} className="holo-btn" style={{
              padding: "8px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: "linear-gradient(135deg, #e21227, #c4101f)", color: "#fff",
              border: "none", cursor: "pointer", boxShadow: "0 0 20px rgba(226,18,39,0.35)",
            }}>
              ابدأ الآن ←
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 10, padding: "120px 24px 80px", textAlign: "center" }}>
        <GridBackground />
        <HexScanLine />

        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 16px", borderRadius: 100, border: "1px solid rgba(226,18,39,0.3)", background: "rgba(226,18,39,0.06)", marginBottom: 28, backdropFilter: "blur(10px)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e", animation: "terminalBlink 1.5s step-end infinite", display: "inline-block" }} />
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.6)", letterSpacing: "0.2em" }}>
            NEW: Swarm AI · SIEM/SOAR · ZeroDay Scanner — v5.0
          </span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: "clamp(40px, 7vw, 88px)", fontWeight: 900, letterSpacing: "-3px", lineHeight: 1, marginBottom: 24, position: "relative", zIndex: 1 }}>
          <GlitchLayer text="KALI" color="#e21227" />
          <span style={{ color: "#fff" }}>GPT</span>
          <br />
          <span style={{ fontSize: "clamp(24px, 4vw, 52px)", color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "-1px" }}>
            الذكاء الاصطناعي الهجومي
          </span>
        </h1>

        <div style={{ height: "40px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 32 }}>
          <TypewriterText style={{ fontSize: "clamp(14px, 2vw, 20px)", color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }} />
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap", marginBottom: 56 }}>
          <button onClick={() => navigate("/app")} className="holo-btn" style={{
            display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 42px",
            borderRadius: 14, background: "linear-gradient(135deg, #e21227 0%, #c4101f 50%, #a00d1a 100%)",
            color: "#fff", fontSize: 16, fontWeight: 800, border: "none", cursor: "pointer",
            boxShadow: "0 0 60px rgba(226,18,39,0.45), 0 12px 32px rgba(226,18,39,0.25)",
          }}>
            <Terminal style={{ width: 20, height: 20 }} /> ابدأ مجاناً
          </button>
          <button onClick={() => document.getElementById("terminal-demo")?.scrollIntoView({ behavior: "smooth" })} style={{
            display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 32px",
            borderRadius: 14, background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.6)",
            fontSize: 15, fontWeight: 500, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", transition: "all 0.3s",
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.25)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)"; }}
          >
            <Play style={{ width: 16, height: 16 }} /> شاهد العرض
          </button>
        </div>

        {/* Live activity ticker */}
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "12px 20px", borderRadius: 12, background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(10px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "0.3em" }}>LIVE</span>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: liveActivity[activityIdx].col, boxShadow: `0 0 8px ${liveActivity[activityIdx].col}`, display: "inline-block", animation: "terminalBlink 1s step-end infinite" }} />
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "rgba(255,255,255,0.45)" }}>
              [{liveActivity[activityIdx].type}] {liveActivity[activityIdx].msg}
            </span>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.2)", marginLeft: "auto" }}>{liveActivity[activityIdx].time} ago</span>
          </div>
        </div>

        {/* Scroll hint */}
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, animation: "float 2s ease-in-out infinite" }}>
          <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.3em" }}>SCROLL</span>
          <ChevronDown style={{ width: 16, height: 16, color: "rgba(255,255,255,0.2)" }} />
        </div>
      </section>

      {/* ── LIVE STATS ── */}
      <section style={{ padding: "64px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)", borderBottom: "1px solid rgba(255,255,255,0.04)", background: "rgba(226,18,39,0.02)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 24 }}>
          {liveStats.map((stat, i) => {
            const Icon = stat.icon;
            return (
              <div key={i} style={{ textAlign: "center", padding: "20px 16px", borderRadius: 16, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <Icon style={{ width: 22, height: 22, color: stat.col, margin: "0 auto 10px" }} />
                <div style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 900, fontFamily: "monospace", letterSpacing: "-1px" }}>
                  <LiveCounter target={stat.value} suffix={stat.suffix} color={stat.col} />
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4, fontFamily: "monospace" }}>{stat.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "100px 24px", position: "relative", zIndex: 10 }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <SectionLabel text="CAPABILITIES" />
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: 12 }}>
              قدرات لا مثيل لها
            </h2>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 15, maxWidth: 560, margin: "0 auto" }}>
              منصة شاملة تجمع أقوى أدوات الأمن السيبراني مع أحدث نماذج الذكاء الاصطناعي
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <HolographicCard key={i}>
                  <div style={{
                    padding: "24px", borderRadius: 18,
                    background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
                    border: `1px solid ${feat.color}18`,
                    boxShadow: `0 4px 24px rgba(0,0,0,0.3)`,
                    position: "relative", overflow: "hidden", transition: "all 0.3s",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${feat.color}35`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${feat.color}15`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${feat.color}18`; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(0,0,0,0.3)"; }}
                  >
                    <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle, ${feat.color}08, transparent)`, borderRadius: "0 18px 0 80px", pointerEvents: "none" }} />
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${feat.color}15`, border: `1px solid ${feat.color}30`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                      <Icon style={{ width: 22, height: 22, color: feat.color }} />
                    </div>
                    <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{feat.title}</h3>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>{feat.desc}</p>
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${feat.color}35, transparent)` }} />
                  </div>
                </HolographicCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── TERMINAL DEMO ── */}
      <section id="terminal-demo" style={{ padding: "80px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <SectionLabel text="LIVE DEMO" />
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 42px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: 12 }}>
              شاهد KaliGPT في العمل
            </h2>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>جلسة Red Team حقيقية — من الاستطلاع إلى التقرير</p>
          </div>
          <TerminalDemo />
          <div style={{ display: "flex", justifyContent: "center", marginTop: 32 }}>
            <button onClick={() => navigate("/app")} className="holo-btn" style={{
              display: "inline-flex", alignItems: "center", gap: 10, padding: "14px 36px",
              borderRadius: 12, background: "linear-gradient(135deg, #e21227, #c4101f)",
              color: "#fff", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer",
              boxShadow: "0 0 40px rgba(226,18,39,0.35)",
            }}>
              جرّب الآن — مجاناً <ChevronRight style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "100px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <SectionLabel text="HOW IT WORKS" />
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1.5px" }}>ثلاث خطوات للسيطرة</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, position: "relative" }}>
            <div style={{ position: "absolute", top: "50%", left: "10%", right: "10%", height: 1, background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.3), transparent)", transform: "translateY(-50%)", pointerEvents: "none" }} />
            {howItWorks.map((step, i) => {
              const Icon = step.icon;
              return (
                <HolographicCard key={i} style={{ borderRadius: 20 }}>
                  <div style={{ padding: "32px 24px", borderRadius: 20, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", textAlign: "center", position: "relative" }}>
                    <div style={{ fontSize: "clamp(48px,6vw,72px)", fontWeight: 900, fontFamily: "monospace", color: `${step.col}15`, position: "absolute", top: 12, right: 16, lineHeight: 1 }}>{step.step}</div>
                    <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${step.col}15`, border: `1px solid ${step.col}35`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                      <Icon style={{ width: 24, height: 24, color: step.col }} />
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>{step.title}</h3>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>{step.desc}</p>
                    <div style={{ width: 32, height: 2, background: step.col, margin: "16px auto 0", borderRadius: 1 }} />
                  </div>
                </HolographicCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── MODELS ── */}
      <section style={{ padding: "80px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(226,18,39,0.015)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <SectionLabel text="AI MODELS" />
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 800, letterSpacing: "-1.5px" }}>10+ نموذج ذكاء اصطناعي</h2>
            <p style={{ color: "rgba(255,255,255,0.3)", marginTop: 8, fontSize: 13 }}>مختلفة التخصصات — واحدة واجهة</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            {models.map((model, i) => {
              const Icon = model.icon;
              return (
                <HolographicCard key={i}>
                  <div style={{
                    padding: "18px 16px", borderRadius: 14,
                    background: `${model.color}08`,
                    border: `1px solid ${model.color}25`,
                    textAlign: "center", transition: "all 0.25s", cursor: "pointer",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${model.color}14`; (e.currentTarget as HTMLElement).style.borderColor = `${model.color}45`; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${model.color}08`; (e.currentTarget as HTMLElement).style.borderColor = `${model.color}25`; }}
                  >
                    <Icon style={{ width: 24, height: 24, color: model.color, margin: "0 auto 10px" }} />
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 5 }}>{model.name}</div>
                    <span style={{ fontSize: 9, fontFamily: "monospace", padding: "2px 8px", borderRadius: 6, background: `${model.color}20`, color: model.color, fontWeight: 700 }}>{model.tag}</span>
                  </div>
                </HolographicCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── ARSENAL ── */}
      <section id="arsenal" style={{ padding: "100px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <SectionLabel text="ARSENAL V2" />
            <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: 8 }}>120+ أداة متخصصة</h2>
            <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14 }}>أدوات هجومية ودفاعية جاهزة للاستخدام فوراً</p>
          </div>

          {/* Category filter */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginBottom: 32 }}>
            {toolCats.map(cat => (
              <button key={cat} onClick={() => setActiveToolCat(cat)} style={{
                padding: "5px 14px", borderRadius: 20, fontSize: 10, fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.1em",
                cursor: "pointer", transition: "all 0.2s",
                background: activeToolCat === cat ? "rgba(226,18,39,0.2)" : "rgba(255,255,255,0.03)",
                color: activeToolCat === cat ? "#e21227" : "rgba(255,255,255,0.35)",
                border: `1px solid ${activeToolCat === cat ? "rgba(226,18,39,0.4)" : "rgba(255,255,255,0.06)"}`,
              }}>{cat}</button>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
            {filteredTools.map((tool, i) => {
              const Icon = tool.icon;
              return (
                <HolographicCard key={tool.name}>
                  <div style={{
                    padding: "16px", borderRadius: 14,
                    background: `${tool.col}08`,
                    border: `1px solid ${tool.col}20`,
                    transition: "all 0.2s", cursor: "pointer",
                    display: "flex", gap: 12, alignItems: "flex-start",
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${tool.col}14`; (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${tool.col}08`; (e.currentTarget as HTMLElement).style.transform = "none"; }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${tool.col}18`, border: `1px solid ${tool.col}30`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon style={{ width: 17, height: 17, color: tool.col }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", marginBottom: 3 }}>{tool.name}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 6, lineHeight: 1.4 }}>{tool.desc}</div>
                      <span style={{ fontSize: 8, fontFamily: "monospace", padding: "1.5px 5px", borderRadius: 4, background: `${tool.col}18`, color: tool.col, fontWeight: 700 }}>{tool.cat}</span>
                    </div>
                  </div>
                </HolographicCard>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section style={{ padding: "100px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)", background: "rgba(226,18,39,0.015)" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 48 }}>
            <SectionLabel text="COMPARISON" />
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 42px)", fontWeight: 800, letterSpacing: "-1.5px" }}>لماذا KaliGPT؟</h2>
          </div>
          <div style={{ borderRadius: 20, overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px", background: "rgba(255,255,255,0.03)", padding: "14px 24px" }}>
              {["الميزة", "KaliGPT", "ChatGPT", "CoPilot"].map((h, i) => (
                <div key={h} style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: i === 1 ? "#e21227" : "rgba(255,255,255,0.4)", textAlign: i > 0 ? "center" : "left", letterSpacing: "0.1em" }}>{h}</div>
              ))}
            </div>
            {comparisons.map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 100px 100px 100px", padding: "12px 24px", borderTop: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>{row.feature}</div>
                {[row.kg, row.cg, row.cp].map((v, j) => (
                  <div key={j} style={{ textAlign: "center", fontSize: 14, color: v ? "#22c55e" : "rgba(255,255,255,0.15)" }}>{v ? "✓" : "✗"}</div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: "100px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)", overflow: "hidden" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <SectionLabel text="TESTIMONIALS" />
            <h2 style={{ fontSize: "clamp(24px, 3.5vw, 42px)", fontWeight: 800, letterSpacing: "-1.5px" }}>ماذا يقول المستخدمون</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {testimonials.map((t, i) => (
              <HolographicCard key={i}>
                <div style={{
                  padding: "24px", borderRadius: 18,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                  position: "relative", overflow: "hidden",
                }}>
                  <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} style={{ width: 12, height: 12, fill: "#fbbf24", color: "#fbbf24" }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.8, marginBottom: 18 }}>"{t.text}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: `${t.col}20`, border: `1px solid ${t.col}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: t.col }}>
                      {t.avatar}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{t.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{t.role}</div>
                    </div>
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${t.col}40, transparent)` }} />
                </div>
              </HolographicCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "100px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
          <SectionLabel text="PRICING" />
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: 12 }}>ابدأ مجاناً</h2>
          <p style={{ color: "rgba(255,255,255,0.35)", marginBottom: 52 }}>خطط مرنة للأفراد والفرق الأمنية</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              { name: "Free",  price: "$0",  period: "/شهر", features: ["50k رمز/يوم", "النماذج الأساسية", "ترمينال محدود", "OSINT أساسي", "5 جلسات Council"], highlight: false, col: "rgba(255,255,255,0.1)" },
              { name: "Pro",   price: "$19", period: "/شهر", features: ["500k رمز/يوم", "كل النماذج", "Arsenal v2 كامل", "OSINT متقدم", "Council 256", "CVE Watcher", "Swarm AI"], highlight: true, col: "#e21227" },
              { name: "Elite", price: "$49", period: "/شهر", features: ["نقاط غير محدودة", "GodMode 18x", "API Access", "SIEM/SOAR كامل", "ZeroDay Scanner", "Team Dashboard", "Custom Models", "أولوية الدعم"], highlight: false, col: "rgba(255,255,255,0.1)" },
            ].map((plan, i) => (
              <HolographicCard key={i} style={{ borderRadius: "20px" }}>
                <div style={{ padding: "32px 28px", borderRadius: "20px", background: plan.highlight ? "linear-gradient(135deg, rgba(226,18,39,0.12) 0%, rgba(226,18,39,0.04) 100%)" : "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)", border: plan.highlight ? "1px solid rgba(226,18,39,0.4)" : "1px solid rgba(255,255,255,0.06)", boxShadow: plan.highlight ? "0 0 40px rgba(226,18,39,0.12), 0 16px 48px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.4)", position: "relative" }}>
                  {plan.highlight && (<div style={{ position: "absolute", top: "-1px", left: "50%", transform: "translateX(-50%)", background: "linear-gradient(90deg, #e21227, #ff6b35)", color: "#fff", fontSize: "10px", fontWeight: 700, padding: "3px 14px", borderRadius: "0 0 8px 8px", letterSpacing: "0.5px" }}>الأكثر شيوعاً</div>)}
                  <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginBottom: "6px", letterSpacing: "1px", fontFamily: "monospace" }}>{plan.name.toUpperCase()}</div>
                  <div style={{ marginBottom: "24px" }}>
                    <span style={{ fontSize: "42px", fontWeight: 900, letterSpacing: "-2px", color: plan.highlight ? "#e21227" : "#fff" }}>{plan.price}</span>
                    <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.25)", marginLeft: "4px" }}>{plan.period}</span>
                  </div>
                  <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", textAlign: "left" }}>
                    {plan.features.map((f, j) => (
                      <li key={j} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 0", fontSize: "13px", color: "rgba(255,255,255,0.55)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                        <span style={{ color: "#e21227", fontWeight: 700, fontSize: "14px" }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => navigate("/app")} className="holo-btn" style={{ width: "100%", padding: "12px", borderRadius: "12px", background: plan.highlight ? "linear-gradient(135deg, #e21227 0%, #c4101f 100%)" : "rgba(255,255,255,0.05)", color: plan.highlight ? "#fff" : "rgba(255,255,255,0.6)", fontSize: "13px", fontWeight: 600, border: plan.highlight ? "none" : "1px solid rgba(255,255,255,0.08)", cursor: "pointer", boxShadow: plan.highlight ? "0 0 20px rgba(226,18,39,0.35)" : "none" }}>ابدأ الآن</button>
                </div>
              </HolographicCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" style={{ padding: "100px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <SectionLabel text="FAQ" />
            <h2 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-1.5px" }}>أسئلة شائعة</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {faqs.map((item, i) => (
              <div key={i} style={{ borderRadius: "16px", border: `1px solid ${faqOpen === i ? "rgba(226,18,39,0.3)" : "rgba(255,255,255,0.06)"}`, background: faqOpen === i ? "rgba(226,18,39,0.04)" : "rgba(255,255,255,0.02)", overflow: "hidden", transition: "all 0.3s ease", cursor: "pointer" }} onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                <div style={{ padding: "20px 24px", display: "flex", alignItems: "center", gap: "16px" }}>
                  <span style={{ minWidth: "24px", height: "24px", borderRadius: "8px", background: "rgba(226,18,39,0.12)", border: "1px solid rgba(226,18,39,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#e21227" }}>Q</span>
                  <h3 style={{ fontWeight: 600, fontSize: "14px", color: "#fff", flex: 1 }}>{item.q}</h3>
                  <span style={{ color: faqOpen === i ? "#e21227" : "rgba(255,255,255,0.25)", fontSize: "18px", transition: "transform 0.3s", transform: faqOpen === i ? "rotate(45deg)" : "none" }}>+</span>
                </div>
                {faqOpen === i && (
                  <div style={{ padding: "0 24px 20px 64px" }}>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", lineHeight: 1.8 }}>{item.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: "120px 24px", position: "relative", zIndex: 10, textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.04)", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "700px", height: "500px", background: "radial-gradient(ellipse, rgba(226,18,39,0.1) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "620px", margin: "0 auto", position: "relative" }}>
          <div style={{ width: "80px", height: "80px", margin: "0 auto 32px", position: "relative", animation: "pulse3d 3s ease-in-out infinite" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "22px", background: "linear-gradient(135deg, rgba(226,18,39,0.2) 0%, rgba(226,18,39,0.05) 100%)", border: "1px solid rgba(226,18,39,0.35)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(226,18,39,0.25)", transform: "perspective(200px) rotateX(15deg)" }}>
              <Zap style={{ width: "36px", height: "36px", color: "#e21227" }} />
            </div>
          </div>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, letterSpacing: "-2px", marginBottom: "16px" }}>جاهز للانطلاق؟</h2>
          <p style={{ color: "rgba(255,255,255,0.35)", marginBottom: "48px", fontSize: "16px", lineHeight: 1.7 }}>
            انضم لـ 14,000+ باحث أمني يستخدمون KaliGPT يومياً
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/app")} className="holo-btn" style={{ display: "inline-flex", alignItems: "center", gap: "12px", padding: "18px 48px", borderRadius: "16px", background: "linear-gradient(135deg, #e21227 0%, #c4101f 50%, #a00d1a 100%)", color: "#fff", fontSize: "18px", fontWeight: 800, border: "none", cursor: "pointer", boxShadow: "0 0 60px rgba(226,18,39,0.45), 0 12px 32px rgba(226,18,39,0.25)" }}>
              <Terminal style={{ width: "22px", height: "22px" }} />
              افتح KaliGPT v5.0
            </button>
            <button onClick={() => navigate("/roadmap")} style={{ display: "inline-flex", alignItems: "center", gap: "12px", padding: "18px 32px", borderRadius: "16px", background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: "16px", fontWeight: 500, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", transition: "all 0.3s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.3)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.5)"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; }}
            >
              <BarChart3 style={{ width: "18px", height: "18px" }} />
              الخريطة
            </button>
          </div>
        </div>
      </section>

      {/* ── THREAT FEED TICKER ── */}
      <ThreatFeedTicker />

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: "1px solid rgba(226,18,39,0.08)", padding: "48px 24px 32px", position: "relative", zIndex: 10, background: "linear-gradient(180deg, transparent 0%, rgba(226,18,39,0.03) 100%)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "40px", marginBottom: "40px" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #e21227, #c4101f)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(226,18,39,0.4)" }}>
                  <Shield style={{ width: "18px", height: "18px", color: "#fff" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "15px" }}>KaliGPT</div>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>mr7.ai · v5.0 · Arsenal Pro</div>
                </div>
              </div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", lineHeight: 1.7, maxWidth: "280px" }}>
                منصة الأمن السيبراني بالذكاء الاصطناعي — مبنية للباحثين المرخصين والفرق الأمنية الاحترافية.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "16px" }}>
                {["GPT-4o", "Claude 3.5", "Gemini", "Groq", "DeepSeek", "xAI"].map(tag => (
                  <span key={tag} style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: "4px" }}>{tag}</span>
                ))}
              </div>
            </div>
            {[
              { title: "المنتج", links: ["الميزات", "الترسانة v2", "الأسعار", "Roadmap", "ما الجديد", "Swarm AI"] },
              { title: "المجتمع", links: ["Discord", "GitHub", "Blog", "CTF Labs", "YouTube", "Newsletter"] },
              { title: "الدعم", links: ["FAQ", "توثيق API", "تواصل معنا", "سياسة الخصوصية", "شروط الخدمة", "Bug Bounty"] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: "11px", fontFamily: "monospace", color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em", marginBottom: "16px", fontWeight: 700 }}>{col.title}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {col.links.map(link => (
                    <button key={link} style={{ fontSize: "13px", color: "rgba(255,255,255,0.3)", background: "none", border: "none", cursor: "pointer", textAlign: "left", transition: "color 0.2s", padding: 0 }}
                      onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.75)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
                    >{link}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", fontFamily: "monospace" }}>
              © 2025 mr7.ai · KaliGPT v5.0 · For authorized security research only
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              {["● ONLINE", "20 NODES", "99.9% SLA", "v5.0"].map(stat => (
                <span key={stat} style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(34,197,94,0.5)", border: "1px solid rgba(34,197,94,0.15)", padding: "2px 8px", borderRadius: "4px", background: "rgba(34,197,94,0.04)" }}>{stat}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
