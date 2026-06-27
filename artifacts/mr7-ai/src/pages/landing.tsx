import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { useLocation } from "wouter";
import {
  Shield, Terminal, Zap, Eye, Brain, Lock, ChevronRight, Server, Code2,
  Crosshair, Cpu, Activity, Globe, Wifi, Database, Search, Network,
  FlaskConical, Layers, Radar, Bug, Fingerprint, Key, BarChart3,
  GitBranch, Boxes, Swords, BookOpen, Radio, MonitorCheck,
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

    const COLORS = ["#e21227","#ff3c3c","#ff6b35","rgba(226,18,39,0.6)","rgba(255,255,255,0.5)","rgba(255,255,255,0.2)"];
    const TYPES: Particle["type"][] = ["dot","dot","dot","cross","ring"];

    particles.current = Array.from({ length: 180 }, () => ({
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
   DATA
══════════════════════════════════════════════════════════════ */
const features = [
  { icon: Brain, title: "ذكاء اصطناعي متخصص", desc: "نماذج مدرّبة خصيصاً على الأمن السيبراني — اختبار الاختراق، تحليل الثغرات، والأوامر الهجومية.", color: "#e21227" },
  { icon: Terminal, title: "ترمينال تفاعلي", desc: "طرفية أوامر مدمجة في المتصفح تتيح تنفيذ أوامر Shell بشكل مباشر داخل جلسة الذكاء الاصطناعي.", color: "#ff6b35" },
  { icon: Eye, title: "وحدة OSINT المتقدمة", desc: "جمع المعلومات مفتوحة المصدر، تحليل المواقع، وتتبع البصمة الرقمية بدقة عالية.", color: "#00e5ff" },
  { icon: Crosshair, title: "أسلوب Red Team", desc: "محاكاة هجمات حقيقية، تقييم الدفاعات، وتحليل نقاط الضعف من منظور المهاجم.", color: "#a78bfa" },
  { icon: Server, title: "وضع المجلس — Council Mode", desc: "105 عقل متخصص تعمل في آنٍ واحد: مخترق، محلل، مطور، محقق جنائي، وأكثر.", color: "#e21227" },
  { icon: Code2, title: "ترسانة Arsenal", desc: "+70 أداة متخصصة: JARVIS، Parseltongue، RAGFlow، NexusAI، وأدوات هجومية ودفاعية متكاملة.", color: "#22c55e" },
  { icon: Radar, title: "CVE Watcher", desc: "مراقبة لحظية لقاعدة بيانات الثغرات العالمية مع تنبيهات فورية وتحليل أثر تلقائي.", color: "#fbbf24" },
  { icon: Network, title: "Network Interceptor", desc: "تحليل حركة الشبكة، فحص البروتوكولات، واكتشاف الأجهزة المخفية في البنية التحتية.", color: "#f97316" },
  { icon: Fingerprint, title: "Digital Forensics", desc: "التحليل الجنائي الرقمي: استخراج البيانات، تحليل الأدلة، وإعادة تشكيل سلسلة الهجوم.", color: "#e21227" },
];

const models = [
  { name: "CHAT-GPT Fast",       tag: "سريع",        color: "#3b82f6", icon: Zap },
  { name: "CHAT-GPT Thinking",   tag: "تفكير عميق",  color: "#a855f7", icon: Brain },
  { name: "CHAT-GPT Coder",      tag: "برمجة",        color: "#22c55e", icon: Code2 },
  { name: "CHAT-GPT Researcher", tag: "بحث",          color: "#eab308", icon: Search },
  { name: "KaliGPT Red Team",    tag: "هجومي",        color: "#e21227", icon: Swords },
  { name: "GodMode",             tag: "لا حدود",      color: "#f97316", icon: Zap },
  { name: "Claude Opus",         tag: "تحليل",        color: "#00e5ff", icon: BookOpen },
  { name: "Gemini Ultra",        tag: "متعدد",        color: "#34d399", icon: Layers },
];

const faqs = [
  { q: "هل يمكن استخدام KaliGPT للأغراض التعليمية فقط؟", a: "نعم. KaliGPT مصمم للباحثين الأمنيين والمختبرين المرخصين وطلاب الأمن السيبراني في بيئات اختبار قانونية فقط." },
  { q: "ما الفرق بين KaliGPT وChatGPT العادي؟", a: "KaliGPT مخصص 100% للأمن السيبراني ويمتلك قاعدة معرفية بالأدوات الهجومية والدفاعية، بينما ChatGPT نموذج عام متحفظ." },
  { q: "هل بياناتي محفوظة أم تُعالج محلياً؟", a: "تُرسل المحادثات إلى الخادم لمعالجتها عبر نموذج اللغة. لا نحتفظ بمحتوى المحادثات بعد انتهاء الجلسة." },
  { q: "ما هو وضع المجلس Council Mode؟", a: "وضع فريد يُشغّل 105 نموذج ذكاء اصطناعي متخصص في وقت واحد على نفس المشكلة، ثم يجمع النتائج في تقرير شامل." },
  { q: "هل يدعم GodMode استخدام مفاتيح API الخاصة بي؟", a: "نعم، يمكنك ربط مفاتيح OpenAI وAnthropic وGroq وGemini والمزيد. GodMode يستخدم أفضل مزود متاح تلقائياً." },
  { q: "هل يعمل KaliGPT بدون اتصال بالإنترنت؟", a: "يمكن تشغيل النماذج المحلية مثل Ollama وLM Studio بدون إنترنت عبر وحدة Local Engine المدمجة." },
];

const arsenalTools = [
  { icon: Terminal,    name: "ShellGen",     desc: "توليد أوامر Shell هجومية",     col: "#e21227", cat: "OFFENSIVE" },
  { icon: Eye,         name: "OSINT+",       desc: "استخبارات مصادر مفتوحة",       col: "#00e5ff", cat: "RECON"    },
  { icon: Bug,         name: "CVEWatch",     desc: "مراقبة الثغرات الحية",          col: "#a78bfa", cat: "INTEL"   },
  { icon: Network,     name: "NetScan Pro",  desc: "فحص الشبكات والبنية التحتية",  col: "#22c55e", cat: "NETWORK" },
  { icon: Brain,       name: "Council AI",   desc: "105 عقل في آنٍ واحد",           col: "#fbbf24", cat: "AI"      },
  { icon: Database,    name: "RAGFlow",      desc: "قاعدة معرفة أمنية متجهية",     col: "#00e5ff", cat: "DB"      },
  { icon: Radar,       name: "Threat Intel", desc: "تحليل التهديدات اللحظية",      col: "#e21227", cat: "INTEL"   },
  { icon: Code2,       name: "JARVIS",       desc: "مساعد برمجة هجومية",           col: "#f97316", cat: "DEV"     },
  { icon: Lock,        name: "CipherBreak",  desc: "تحليل التشفير وكسره",           col: "#a78bfa", cat: "CRYPTO"  },
  { icon: Globe,       name: "DarkWeb Mon",  desc: "مراقبة الويب المظلم",           col: "#e21227", cat: "OSINT"   },
  { icon: FlaskConical,name: "Parseltongue", desc: "توليد shellcode متقدم",        col: "#22c55e", cat: "EXPLOIT" },
  { icon: GitBranch,   name: "ChainBuilder", desc: "بناء سلاسل الهجوم",            col: "#00e5ff", cat: "PIPELINE"},
  { icon: Fingerprint, name: "Forensics",    desc: "التحليل الجنائي الرقمي",       col: "#fbbf24", cat: "FORENSIC"},
  { icon: Key,         name: "PrivEsc AI",   desc: "رفع الصلاحيات التلقائي",       col: "#e21227", cat: "EXPLOIT" },
  { icon: Boxes,       name: "ArsenalHub",   desc: "مركز تحكم الأدوات",            col: "#a78bfa", cat: "HUB"     },
  { icon: MonitorCheck,name: "GodMode",      desc: "14 وضع بدون قيود",             col: "#ff6b35", cat: "GODMODE" },
];

const howItWorks = [
  {
    step: "01", icon: Key, title: "سجّل وادخل", col: "#e21227",
    desc: "أنشئ حسابك مجاناً خلال ثوانٍ. ربط مزوديك أو استخدم النماذج المدمجة فوراً.",
  },
  {
    step: "02", icon: Layers, title: "اختر وضع العمل", col: "#00e5ff",
    desc: "اختر من 14 وضع عمل: من Chat البسيط إلى GodMode وCouncil وRed Team AI.",
  },
  {
    step: "03", icon: Swords, title: "اطلق العملية", col: "#a78bfa",
    desc: "شغّل أدواتك، حلّل الأهداف، ولد التقارير — كل شيء في واجهة واحدة متكاملة.",
  },
];

const comparisons = [
  { feature: "تخصص الأمن السيبراني", kg: true,  cg: false, cp: false },
  { feature: "Council Mode — 105 عقل", kg: true,  cg: false, cp: false },
  { feature: "GodMode بدون قيود",      kg: true,  cg: false, cp: false },
  { feature: "Arsenal 70+ أداة",        kg: true,  cg: false, cp: false },
  { feature: "OSINT متقدم",             kg: true,  cg: false, cp: false },
  { feature: "ShellGen هجومي",          kg: true,  cg: false, cp: false },
  { feature: "نماذج متعددة المزودين",   kg: true,  cg: false, cp: true  },
  { feature: "CVE Watcher لحظي",        kg: true,  cg: false, cp: false },
  { feature: "وضع الشبكة المحلية",      kg: true,  cg: false, cp: false },
  { feature: "دعم عربي متكامل",          kg: true,  cg: true,  cp: false },
];

const testimonials = [
  { name: "محمد الشمري", role: "Senior Pentester", avatar: "M", text: "KaliGPT غيّر طريقة عملي كلياً. Council Mode وحده يساوي فريق كامل.", rating: 5, col: "#e21227" },
  { name: "Sarah K.", role: "Red Team Lead", avatar: "S", text: "The Arsenal is unmatched. ShellGen + OSINT+ saved me 3 hours per engagement.", rating: 5, col: "#00e5ff" },
  { name: "خالد العمري", role: "CTF Player", avatar: "K", text: "GodMode للـ CTF = الشفرة المطلقة. لا قيود، لا رقابة، نتائج مباشرة.", rating: 5, col: "#a78bfa" },
  { name: "Alex R.", role: "CISO @ SecureCorp", avatar: "A", text: "We integrated KaliGPT into our threat intel pipeline. Phenomenal accuracy.", rating: 5, col: "#22c55e" },
];

const liveActivity = [
  { type: "SCAN",   msg: "Red team scan initiated on 192.168.1.0/24",   col: "#e21227", time: "now" },
  { type: "CVE",    msg: "CVE-2024-9873 — CVSS 9.8 detected in feed",  col: "#fbbf24", time: "2s"  },
  { type: "OSINT",  msg: "OSINT sweep: 14 subdomains found",            col: "#00e5ff", time: "5s"  },
  { type: "SHELL",  msg: "Reverse shell payload generated",              col: "#a78bfa", time: "8s"  },
  { type: "COUNCIL",msg: "Council session: 105 brains analyzing target", col: "#22c55e", time: "12s" },
  { type: "ALERT",  msg: "Dark web actor 0xDEAD pinged endpoint",       col: "#f97316", time: "18s" },
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

    const NODE_COUNT = Math.min(55, Math.floor(W * H / 18000));
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
  "Red Team · OSINT · Council Mode · Arsenal",
  "105 عقل ذكاء اصطناعي في وقت واحد",
  "Shell Generator · Dark Web Search · Godmode",
  "مساعدك الهجومي الأول في الأمن السيبراني",
  "CVE Watcher · Forensics · Network Interceptor",
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
      <div style={{ position: "absolute", top: 0, bottom: 0, width: "1px", background: "linear-gradient(180deg, transparent 0%, rgba(167,139,250,0.0) 10%, rgba(167,139,250,0.5) 40%, rgba(226,18,39,0.6) 55%, rgba(167,139,250,0.5) 70%, rgba(167,139,250,0.0) 90%, transparent 100%)", animation: "cyberSweep 12s linear infinite", animationDelay: "1.5s", boxShadow: "0 0 10px rgba(167,139,250,0.4)" }} />
    </div>
  );
}

function FloatingOrb({ size, x, y, color, delay }: { size: number; x: string; y: string; color: string; delay: number }) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: size, height: size, borderRadius: "50%", background: `radial-gradient(circle at 35% 35%, ${color}30, ${color}08 60%, transparent 80%)`, border: `1px solid ${color}20`, animation: `orbFloat ${4 + delay}s ease-in-out infinite`, animationDelay: `${delay}s`, boxShadow: `0 0 ${size * 0.8}px ${color}15, inset 0 0 ${size * 0.3}px ${color}10`, pointerEvents: "none" }} />
  );
}

/* ── Section Label ── */
function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{ display: "inline-block", fontSize: "11px", fontFamily: "monospace", color: "#e21227", border: "1px solid rgba(226,18,39,0.3)", padding: "4px 14px", borderRadius: "100px", marginBottom: "16px", background: "rgba(226,18,39,0.08)" }}>
      {text}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LIVE ACTIVITY FEED
══════════════════════════════════════════════════════════════ */
function LiveActivityFeed() {
  const [currentIdx, setCurrentIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setCurrentIdx(i => (i + 1) % liveActivity.length), 2200);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      background: "linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(10,10,10,0.9) 100%)",
      border: "1px solid rgba(226,18,39,0.15)",
      borderRadius: "16px",
      padding: "20px 24px",
      backdropFilter: "blur(20px)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#e21227", boxShadow: "0 0 10px #e21227", animation: "neonFlicker 1.5s infinite" }} />
        <span style={{ fontSize: "11px", fontFamily: "monospace", color: "rgba(255,255,255,0.4)", letterSpacing: "0.3em" }}>LIVE OPERATIONS FEED</span>
        <span style={{ marginLeft: "auto", fontSize: "10px", fontFamily: "monospace", color: "rgba(34,197,94,0.6)" }}>● LIVE</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {liveActivity.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: "10px",
            padding: "8px 12px", borderRadius: "8px",
            background: i === currentIdx ? `${item.col}10` : "rgba(255,255,255,0.02)",
            border: `1px solid ${i === currentIdx ? `${item.col}30` : "rgba(255,255,255,0.04)"}`,
            transition: "all 0.4s ease",
          }}>
            <span style={{ fontSize: "9px", fontFamily: "monospace", color: item.col, fontWeight: 700, minWidth: 60, border: `1px solid ${item.col}30`, padding: "1px 5px", borderRadius: 4, textAlign: "center" }}>
              {item.type}
            </span>
            <span style={{ fontSize: "12px", color: i === currentIdx ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.25)", flex: 1, fontFamily: "monospace" }}>{item.msg}</span>
            <span style={{ fontSize: "9px", color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>{item.time} ago</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const [, navigate] = useLocation();
  const [counter, setCounter] = useState({ users: 0, attacks: 0, uptime: 0, cves: 0 });
  const [activeToolCat, setActiveToolCat] = useState("ALL");
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    const target = { users: 12847, attacks: 3421, uptime: 99, cves: 8742 };
    const duration = 2000; const steps = 60; let step = 0;
    const id = setInterval(() => {
      step++;
      const p = step / steps;
      const ease = 1 - Math.pow(1 - p, 3);
      setCounter({ users: Math.round(target.users * ease), attacks: Math.round(target.attacks * ease), uptime: Math.round(target.uptime * ease), cves: Math.round(target.cves * ease) });
      if (step >= steps) clearInterval(id);
    }, duration / steps);
    return () => clearInterval(id);
  }, []);

  const toolCategories = ["ALL", "OFFENSIVE", "RECON", "INTEL", "NETWORK", "EXPLOIT", "AI", "FORENSIC"];
  const filteredTools = activeToolCat === "ALL" ? arsenalTools : arsenalTools.filter(t => t.cat === activeToolCat);

  return (
    <div style={{ minHeight: "100vh", background: "#080808", color: "#fff", fontFamily: "'Inter', sans-serif", overflowX: "hidden", position: "relative" }}>

      {/* ── GLOBAL STYLES ── */}
      <style>{`
        @keyframes scanline { 0% { top: -2px; } 100% { top: 100%; } }
        @keyframes orbFloat { 0%, 100% { transform: translateY(0px) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }
        @keyframes pulse3d { 0%, 100% { box-shadow: 0 0 20px rgba(226,18,39,0.3), 0 0 60px rgba(226,18,39,0.1); } 50% { box-shadow: 0 0 40px rgba(226,18,39,0.6), 0 0 120px rgba(226,18,39,0.2); } }
        @keyframes rotateHex { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes dataFlow { 0% { transform: translateY(-100%); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(100vh); opacity: 0; } }
        @keyframes glitch { 0%, 100% { clip-path: inset(0 0 100% 0); transform: translate(0); } 20% { clip-path: inset(30% 0 50% 0); transform: translate(-3px, 1px); } 40% { clip-path: inset(60% 0 20% 0); transform: translate(3px, -1px); } 60% { clip-path: inset(10% 0 70% 0); transform: translate(-2px, 2px); } 80% { clip-path: inset(80% 0 5% 0); transform: translate(2px, -2px); } }
        @keyframes holoshimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
        @keyframes neonFlicker { 0%, 100% { opacity: 1; } 92% { opacity: 1; } 93% { opacity: 0.8; } 94% { opacity: 1; } 96% { opacity: 0.7; } 97% { opacity: 1; } }
        @keyframes float3d { 0%, 100% { transform: translateY(0px) rotateX(0deg); } 33% { transform: translateY(-12px) rotateX(2deg); } 66% { transform: translateY(-6px) rotateX(-1deg); } }
        @keyframes terminalBlink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }
        @keyframes cyberSweep { 0% { transform: translateX(-100%); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateX(100vw); opacity: 0; } }
        @keyframes floatOrb3D { 0%, 100% { transform: translateY(-50%) scale(1) rotateY(0deg); } 33% { transform: translateY(calc(-50% - 18px)) scale(1.02) rotateY(5deg); } 66% { transform: translateY(calc(-50% - 8px)) scale(0.99) rotateY(-3deg); } }
        @keyframes statsGlow { 0%, 100% { text-shadow: 0 0 20px rgba(226,18,39,0.4), 0 0 40px rgba(226,18,39,0.2); } 50% { text-shadow: 0 0 40px rgba(226,18,39,0.7), 0 0 80px rgba(226,18,39,0.3), 0 0 120px rgba(226,18,39,0.1); } }
        @keyframes borderGlow { 0%, 100% { box-shadow: 0 0 20px rgba(226,18,39,0.2), inset 0 0 20px rgba(226,18,39,0.05); } 50% { box-shadow: 0 0 40px rgba(226,18,39,0.4), 0 0 80px rgba(226,18,39,0.15), inset 0 0 30px rgba(226,18,39,0.08); } }
        @keyframes heroTitlePulse { 0%, 100% { filter: drop-shadow(0 0 20px rgba(226,18,39,0.5)); } 50% { filter: drop-shadow(0 0 40px rgba(226,18,39,0.8)) drop-shadow(0 0 80px rgba(226,18,39,0.3)); } }
        @keyframes shimmerSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
        @keyframes tickerScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .hero-orb-desktop { animation: floatOrb3D 8s ease-in-out infinite; }
        @media (max-width: 1100px) { .hero-orb-desktop { display: none !important; } .hero-data-stream { display: none !important; } }
        .neon-text-red { color: #e21227; text-shadow: 0 0 10px rgba(226,18,39,0.8), 0 0 30px rgba(226,18,39,0.4), 0 0 60px rgba(226,18,39,0.2); animation: neonFlicker 8s infinite; }
        .holo-btn { position: relative; overflow: hidden; transition: all 0.3s ease; }
        .holo-btn::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%); animation: holoshimmer 3s linear infinite; }
        .holo-btn:hover { transform: translateY(-2px) scale(1.02); box-shadow: 0 8px 32px rgba(226,18,39,0.5), 0 0 0 1px rgba(226,18,39,0.8); }
        .glass-panel { background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%); border: 1px solid rgba(226,18,39,0.15); backdrop-filter: blur(20px); box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(226,18,39,0.08); }
        .glass-panel:hover { border-color: rgba(226,18,39,0.35); box-shadow: 0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 20px rgba(226,18,39,0.1); }
        .tool-card:hover { transform: translateY(-4px); }
      `}</style>

      {/* Backgrounds */}
      <WebGLParticleField count={5000} opacity={0.75} />
      <NeuralNetCanvas />

      {/* Data streams */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
        {[...Array(10)].map((_, i) => (
          <div key={i} style={{ position: "absolute", left: `${8 + i * 9}%`, top: 0, width: "1px", height: "120px", background: "linear-gradient(to bottom, transparent, rgba(226,18,39,0.4), transparent)", animation: `dataFlow ${3 + i * 0.6}s linear infinite`, animationDelay: `${i * 0.35}s` }} />
        ))}
        <FloatingOrb size={500} x="-10%" y="5%" color="#e21227" delay={0} />
        <FloatingOrb size={300} x="70%" y="20%" color="#ff6b35" delay={1.5} />
        <FloatingOrb size={200} x="40%" y="60%" color="#e21227" delay={3} />
        <FloatingOrb size={420} x="55%" y="-5%" color="#00e5ff" delay={2} />
        <FloatingOrb size={260} x="80%" y="55%" color="#a78bfa" delay={0.8} />
        <FloatingOrb size={180} x="15%" y="70%" color="#00e5ff" delay={4} />
      </div>

      {/* ── LIVE TOP TICKER ── */}
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, height: "28px", background: "linear-gradient(90deg, rgba(226,18,39,0.9), rgba(180,10,30,0.9))", display: "flex", alignItems: "center", overflow: "hidden", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ flexShrink: 0, padding: "0 16px", fontSize: "9px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "0.3em", borderRight: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}>
          ● LIVE
        </div>
        <div style={{ flex: 1, overflow: "hidden" }}>
          <div style={{ display: "flex", gap: "60px", animation: "tickerScroll 30s linear infinite", whiteSpace: "nowrap" }}>
            {[...Array(2)].map((_, ri) =>
              [...liveActivity, ...liveActivity].map((item, i) => (
                <span key={`${ri}-${i}`} style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.85)" }}>
                  <span style={{ color: "#ffd700", marginRight: 6 }}>▸</span>{item.msg}
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── NAV ── */}
      <nav style={{ position: "fixed", top: "28px", left: 0, right: 0, zIndex: 100, height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 24px", background: "linear-gradient(180deg, rgba(8,8,8,0.97) 0%, rgba(8,8,8,0.90) 100%)", borderBottom: "1px solid rgba(226,18,39,0.2)", backdropFilter: "blur(20px)", boxShadow: "0 1px 0 rgba(226,18,39,0.15), 0 4px 30px rgba(0,0,0,0.6)" }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.6) 30%, rgba(255,100,50,0.4) 50%, rgba(226,18,39,0.6) 70%, transparent)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #e21227 0%, #ff6b35 100%)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 20px rgba(226,18,39,0.5), 0 4px 12px rgba(226,18,39,0.3), inset 0 1px 0 rgba(255,255,255,0.2)", transform: "perspective(100px) rotateX(5deg)", animation: "pulse3d 3s ease-in-out infinite" }}>
            <Shield style={{ width: "18px", height: "18px", color: "#fff" }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: "16px", letterSpacing: "-0.5px" }}>KaliGPT</span>
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", fontFamily: "monospace", marginLeft: "2px" }}>mr7.ai</span>
          <span style={{ fontSize: "9px", color: "#22c55e", fontFamily: "monospace", border: "1px solid rgba(34,197,94,0.3)", padding: "1px 6px", borderRadius: 4, background: "rgba(34,197,94,0.08)" }}>v4.0</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <div style={{ display: "flex", gap: "20px" }}>
            {[
              { label: "الميزات", href: "#features" },
              { label: "الترسانة", href: "#arsenal" },
              { label: "الأسعار", href: "#pricing" },
              { label: "FAQ", href: "#faq" },
              { label: "Roadmap", href: "/roadmap" },
            ].map((item, i) => (
              <button key={i}
                onClick={() => item.href.startsWith("#") ? document.querySelector(item.href)?.scrollIntoView({ behavior: "smooth" }) : navigate(item.href)}
                style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px", background: "none", border: "none", cursor: "pointer", transition: "color 0.2s", letterSpacing: "0.3px" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#fff")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.45)")}
              >{item.label}</button>
            ))}
          </div>
          <button onClick={() => navigate("/app")} className="holo-btn" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 20px", borderRadius: "10px", background: "linear-gradient(135deg, #e21227 0%, #c4101f 100%)", color: "#fff", fontSize: "13px", fontWeight: 600, border: "none", cursor: "pointer", boxShadow: "0 0 20px rgba(226,18,39,0.35), 0 4px 12px rgba(226,18,39,0.2)" }}>
            Launch App <ChevronRight style={{ width: "14px", height: "14px" }} />
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section style={{ position: "relative", paddingTop: "148px", paddingBottom: "80px", paddingLeft: "24px", paddingRight: "24px", zIndex: 10, minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <MatrixRain opacity={0.07} color="#e21227" speed={0.7} density={0.6} style={{ zIndex: 0 }} />
        <Cyber3DGrid opacity={0.45} color="#e21227" style={{ zIndex: 1 }} />
        <ScanLine />
        <HexScanLine />

        {/* HoloCoreOrb */}
        <div style={{ position: "absolute", right: "clamp(2%, 6%, 100px)", top: "50%", transform: "translateY(-50%)", zIndex: 3, opacity: 0.92, pointerEvents: "none" }} className="hero-orb-desktop">
          <HoloCoreOrb size={320} color="#e21227" stats={[{ label: "Models", value: "20+" }, { label: "Modes", value: "14" }, { label: "Brains", value: "105" }, { label: "Tools", value: "70+" }]} />
        </div>

        {/* Left data stream */}
        <div style={{ position: "absolute", left: "clamp(2%, 4%, 60px)", top: "50%", transform: "translateY(-50%)", zIndex: 3, opacity: 0.4, pointerEvents: "none", fontFamily: "monospace", fontSize: "10px", color: "#e21227", lineHeight: 2, letterSpacing: "0.5px" }} className="hero-data-stream">
          {["0xDEADBEEF","CVE-2024-9873","SHELL::REVERSE","OSINT::SWEEP","AGENT::LOOP","NET::INTERCEPT","FUZZ::TARGET","MEM::INJECT","0xCAFEBABE","KERNEL::EXPLOIT","PRIV::ESC","PAYLOAD::GEN"].map((line, i) => (
            <div key={i} style={{ opacity: 0.3 + (i % 3) * 0.2 }}>{line}</div>
          ))}
        </div>

        {/* Main glow */}
        <div style={{ position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)", width: "900px", height: "600px", background: "radial-gradient(ellipse at center, rgba(226,18,39,0.12) 0%, rgba(226,18,39,0.04) 40%, transparent 70%)", pointerEvents: "none" }} />

        {/* Badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: "10px", padding: "8px 20px", borderRadius: "100px", border: "1px solid rgba(226,18,39,0.6)", background: "linear-gradient(135deg, rgba(226,18,39,0.18) 0%, rgba(100,0,20,0.12) 50%, rgba(226,18,39,0.08) 100%)", color: "#ff3355", fontSize: "11px", fontFamily: "monospace", fontWeight: "bold", letterSpacing: "0.12em", marginBottom: "28px", boxShadow: "0 0 30px rgba(226,18,39,0.35), 0 0 60px rgba(226,18,39,0.12), inset 0 1px 0 rgba(255,255,255,0.12)", backdropFilter: "blur(16px)", animation: "neonFlicker 4s infinite", position: "relative" as const, overflow: "hidden" as const }}>
          <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#ff2d55", boxShadow: "0 0 12px #ff2d55, 0 0 24px rgba(255,45,85,0.5)", animation: "neonFlicker 2s infinite", flexShrink: 0 }} />
          <span>v4.0 — ARSENAL MODE PRO MAX</span>
          <span style={{ fontSize: "8px", background: "rgba(255,45,85,0.2)", border: "1px solid rgba(255,45,85,0.4)", borderRadius: "4px", padding: "1px 5px", color: "#ff6b80", letterSpacing: "0.2em" }}>NEW</span>
        </div>

        {/* Title */}
        <div style={{ marginBottom: "20px", perspective: "800px" }}>
          <h1 style={{ fontSize: "clamp(64px, 10vw, 120px)", fontWeight: 900, letterSpacing: "-4px", lineHeight: 1, transform: "perspective(600px) rotateX(3deg)", transformStyle: "preserve-3d", display: "inline-block", animation: "heroTitlePulse 4s ease-in-out infinite" }}>
            <span style={{ color: "#fff", textShadow: "0 4px 20px rgba(255,255,255,0.1), 0 1px 0 rgba(255,255,255,0.5)", display: "inline-block", transform: "translateZ(20px)" }}>Kali</span>
            <span className="neon-text-red" style={{ display: "inline-block", transform: "translateZ(40px)", letterSpacing: "-4px" }}>
              <GlitchLayer text="GPT" />
            </span>
          </h1>
        </div>

        {/* Typewriter */}
        <p style={{ fontSize: "clamp(15px, 2.2vw, 20px)", color: "rgba(255,255,255,0.6)", fontWeight: 300, marginBottom: "12px", maxWidth: "640px", minHeight: "2em", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <TypewriterText style={{ fontFamily: "monospace", letterSpacing: "0.3px" }} />
        </p>
        <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.22)", fontFamily: "monospace", marginBottom: "44px", letterSpacing: "1px" }}>
          Offensive AI · Red Team · OSINT · Arsenal · Council Mode · GodMode
        </p>

        {/* CTA */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center", marginBottom: "70px" }}>
          <button onClick={() => navigate("/app")} className="holo-btn" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px 36px", borderRadius: "14px", background: "linear-gradient(135deg, #e21227 0%, #c4101f 50%, #a00d1a 100%)", color: "#fff", fontSize: "16px", fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 0 40px rgba(226,18,39,0.45), 0 8px 24px rgba(226,18,39,0.25), inset 0 1px 0 rgba(255,255,255,0.2)", animation: "pulse3d 3s ease-in-out infinite" }}>
            <Terminal style={{ width: "20px", height: "20px" }} />
            ابدأ الآن — مجاناً
          </button>
          <button onClick={() => document.querySelector("#arsenal")?.scrollIntoView({ behavior: "smooth" })} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px 36px", borderRadius: "14px", background: "rgba(0,229,255,0.06)", color: "rgba(0,229,255,0.9)", fontSize: "16px", fontWeight: 500, border: "1px solid rgba(0,229,255,0.25)", cursor: "pointer", transition: "all 0.3s ease", backdropFilter: "blur(10px)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.12)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(0,229,255,0.06)"; }}
          >
            <Radio style={{ width: "18px", height: "18px" }} />
            استكشف الترسانة
          </button>
          <button onClick={() => navigate("/roadmap")} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px 36px", borderRadius: "14px", background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.7)", fontSize: "16px", fontWeight: 500, border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer", transition: "all 0.3s ease", backdropFilter: "blur(10px)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(226,18,39,0.4)"; (e.currentTarget as HTMLElement).style.color = "#fff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.7)"; }}
          >
            خريطة الطريق
          </button>
        </div>

        {/* Terminal demo */}
        <div style={{ width: "100%", maxWidth: "720px", animation: "float3d 6s ease-in-out infinite", perspective: "1200px" }}>
          <div style={{ borderRadius: "16px", border: "1px solid rgba(226,18,39,0.25)", overflow: "hidden", background: "linear-gradient(180deg, #111 0%, #0d0d0d 100%)", boxShadow: "0 40px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(226,18,39,0.1), 0 0 60px rgba(226,18,39,0.1), inset 0 1px 0 rgba(255,255,255,0.06)", transform: "perspective(1200px) rotateX(4deg)", transformStyle: "preserve-3d" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "12px 18px", borderBottom: "1px solid rgba(226,18,39,0.12)", background: "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ff5f57", boxShadow: "0 0 6px rgba(255,95,87,0.6)" }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#ffbd2e", boxShadow: "0 0 6px rgba(255,189,46,0.4)" }} />
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "#28ca41", boxShadow: "0 0 6px rgba(40,202,65,0.4)" }} />
              <span style={{ marginLeft: "12px", fontSize: "12px", color: "rgba(255,255,255,0.25)", fontFamily: "monospace" }}>kaligpt@mr7 ~ $</span>
              <div style={{ marginLeft: "auto", display: "flex", gap: "6px" }}>
                <span style={{ fontSize: "10px", color: "rgba(226,18,39,0.6)", fontFamily: "monospace", border: "1px solid rgba(226,18,39,0.2)", padding: "1px 6px", borderRadius: "4px" }}>RED TEAM v4</span>
              </div>
            </div>
            <div style={{ padding: "20px 22px", fontFamily: "monospace", fontSize: "13px", lineHeight: "1.8" }}>
              <p><span style={{ color: "#e21227", textShadow: "0 0 8px rgba(226,18,39,0.5)" }}>user@kali</span><span style={{ color: "rgba(255,255,255,0.3)" }}>:~$</span><span style={{ color: "rgba(255,255,255,0.8)", marginLeft: "8px" }}>kaligpt scan --target example.com --mode full-recon --council</span></p>
              <p style={{ color: "#22c55e", textShadow: "0 0 8px rgba(34,197,94,0.4)" }}>[✓] KaliGPT Red Team v4.0 — Council Mode activated (105 brains)</p>
              <p style={{ color: "rgba(255,255,255,0.4)" }}>[*] Running OSINT sweep, subdomain enum, port scan…</p>
              <p style={{ color: "#60a5fa", textShadow: "0 0 8px rgba(96,165,250,0.4)" }}>[›] Found 7 subdomains, 23 open ports, 4 critical CVEs</p>
              <p style={{ color: "#fbbf24", textShadow: "0 0 8px rgba(251,191,36,0.4)" }}>[!] CVE-2024-9873 — CVSS 9.8 — RCE via unauthenticated endpoint</p>
              <p style={{ color: "#a78bfa" }}>[›] Council consensus: Exploit chain recommended — confidence 97%</p>
              <p style={{ color: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", gap: "4px" }}><span>█</span><span style={{ animation: "terminalBlink 1s step-end infinite" }}>_</span></p>
            </div>
          </div>
          <div style={{ height: "40px", marginTop: "-1px", background: "linear-gradient(to bottom, rgba(226,18,39,0.06), transparent)", borderRadius: "0 0 16px 16px", filter: "blur(8px)" }} />
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: "0", marginTop: "60px", justifyContent: "center", flexWrap: "wrap", background: "linear-gradient(135deg, rgba(226,18,39,0.05) 0%, rgba(0,0,0,0.4) 50%, rgba(226,18,39,0.05) 100%)", border: "1px solid rgba(226,18,39,0.12)", borderRadius: "20px", backdropFilter: "blur(20px)", padding: "6px", maxWidth: "720px", animation: "borderGlow 4s ease-in-out infinite" }}>
          {[
            { value: counter.users.toLocaleString(), label: "باحث أمني", sublabel: "مستخدم نشط", icon: Activity, color: "#e21227" },
            { value: `${counter.attacks.toLocaleString()}+`, label: "هجوم محاكَى", sublabel: "هذا الشهر", icon: Crosshair, color: "#ff6b35" },
            { value: `${counter.uptime}%`, label: "وقت التشغيل", sublabel: "SLA مضمون", icon: Cpu, color: "#22c55e" },
            { value: `${counter.cves.toLocaleString()}+`, label: "CVE محللة", sublabel: "في القاعدة", icon: Bug, color: "#a78bfa" },
          ].map(({ value, label, sublabel, icon: Icon, color }, i) => (
            <div key={i} style={{ flex: "1 1 140px", textAlign: "center", padding: "20px 20px", borderRight: i < 3 ? "1px solid rgba(226,18,39,0.08)" : "none", position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center", marginBottom: "6px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "8px", background: `${color}15`, border: `1px solid ${color}30`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon style={{ width: "13px", height: "13px", color }} />
                </div>
                <span style={{ fontSize: "clamp(20px, 3.5vw, 30px)", fontWeight: 900, color: "#fff", letterSpacing: "-1px", animation: "statsGlow 3s ease-in-out infinite", animationDelay: `${i * 0.5}s` }}>{value}</span>
              </div>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.3px" }}>{label}</div>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.22)", marginTop: "2px", fontFamily: "monospace" }}>{sublabel}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section style={{ padding: "100px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <SectionLabel text="HOW IT WORKS" />
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: "12px" }}>ثلاث خطوات للانطلاق</h2>
            <p style={{ color: "rgba(255,255,255,0.35)", maxWidth: "480px", margin: "0 auto" }}>من التسجيل إلى العملية الأولى في أقل من دقيقتين</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px", position: "relative" }}>
            {/* Connector line */}
            <div style={{ position: "absolute", top: "40px", left: "16%", right: "16%", height: "1px", background: "linear-gradient(90deg, rgba(226,18,39,0.3), rgba(0,229,255,0.3), rgba(167,139,250,0.3))", display: "none" }} />
            {howItWorks.map((step, i) => (
              <HolographicCard key={i} style={{ borderRadius: "20px" }}>
                <div className="glass-panel" style={{ padding: "32px 28px", borderRadius: "20px", position: "relative", overflow: "hidden" }}>
                  {/* Step number watermark */}
                  <div style={{ position: "absolute", top: -10, right: 16, fontSize: "80px", fontWeight: 900, color: "rgba(255,255,255,0.03)", fontFamily: "monospace", lineHeight: 1, userSelect: "none" }}>{step.step}</div>
                  {/* Icon */}
                  <div style={{ width: "56px", height: "56px", borderRadius: "16px", background: `linear-gradient(135deg, ${step.col}25 0%, ${step.col}08 100%)`, border: `1px solid ${step.col}35`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", boxShadow: `0 0 24px ${step.col}15` }}>
                    <step.icon style={{ width: "26px", height: "26px", color: step.col }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                    <span style={{ fontSize: "10px", fontFamily: "monospace", color: step.col, fontWeight: 700 }}>STEP {step.step}</span>
                    <div style={{ flex: 1, height: "1px", background: `linear-gradient(90deg, ${step.col}30, transparent)` }} />
                  </div>
                  <h3 style={{ fontWeight: 700, fontSize: "18px", marginBottom: "10px", letterSpacing: "-0.5px" }}>{step.title}</h3>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>{step.desc}</p>
                  {/* Bottom glow */}
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, ${step.col}50, transparent)` }} />
                </div>
              </HolographicCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" style={{ padding: "100px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "64px" }}>
            <SectionLabel text="CAPABILITIES" />
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: "12px" }}>لماذا KaliGPT؟</h2>
            <p style={{ color: "rgba(255,255,255,0.35)", maxWidth: "480px", margin: "0 auto" }}>بُنيَ من الصفر للمختصين الأمنيين — ليس ChatGPT معدَّلاً</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "20px" }}>
            {features.map((f, i) => (
              <HolographicCard key={i} style={{ borderRadius: "20px" }}>
                <div className="glass-panel" style={{ padding: "28px", borderRadius: "20px", cursor: "default", transition: "border-color 0.3s, box-shadow 0.3s", position: "relative" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: `linear-gradient(135deg, ${f.color}20 0%, ${f.color}08 100%)`, border: `1px solid ${f.color}30`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px", boxShadow: `0 0 20px ${f.color}15, inset 0 1px 0 rgba(255,255,255,0.05)`, transform: "translateZ(10px)" }}>
                    <f.icon style={{ width: "22px", height: "22px", color: f.color }} />
                  </div>
                  <div style={{ position: "absolute", top: "20px", right: "20px", fontSize: "11px", fontFamily: "monospace", color: "rgba(255,255,255,0.15)", fontWeight: 700 }}>0{i + 1}</div>
                  <h3 style={{ fontWeight: 700, fontSize: "15px", marginBottom: "10px", letterSpacing: "-0.3px" }}>{f.title}</h3>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>{f.desc}</p>
                  <div style={{ position: "absolute", bottom: 0, left: "28px", right: "28px", height: "1px", background: `linear-gradient(90deg, transparent, ${f.color}30, transparent)` }} />
                </div>
              </HolographicCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── ARSENAL SHOWCASE ── */}
      <section id="arsenal" style={{ padding: "100px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "48px" }}>
            <SectionLabel text="ARSENAL HUB" />
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: "12px" }}>الترسانة الكاملة</h2>
            <p style={{ color: "rgba(255,255,255,0.35)", marginBottom: "32px" }}>70+ أداة متخصصة في الأمن الهجومي والدفاعي</p>
            {/* Category filter */}
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", flexWrap: "wrap" }}>
              {toolCategories.map(cat => (
                <button key={cat} onClick={() => setActiveToolCat(cat)} style={{ padding: "6px 14px", borderRadius: "100px", fontSize: "11px", fontFamily: "monospace", fontWeight: 600, cursor: "pointer", transition: "all 0.2s", background: activeToolCat === cat ? "#e21227" : "rgba(255,255,255,0.04)", color: activeToolCat === cat ? "#fff" : "rgba(255,255,255,0.4)", border: activeToolCat === cat ? "1px solid #e21227" : "1px solid rgba(255,255,255,0.08)", boxShadow: activeToolCat === cat ? "0 0 16px rgba(226,18,39,0.4)" : "none" }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
            {filteredTools.map((tool, i) => (
              <div key={tool.name} className="tool-card" style={{ padding: "18px 16px", borderRadius: "14px", background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.07)`, cursor: "pointer", transition: "all 0.3s ease", position: "relative", overflow: "hidden" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${tool.col}40`; (e.currentTarget as HTMLElement).style.background = `${tool.col}08`; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px rgba(0,0,0,0.3), 0 0 20px ${tool.col}15`; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
              >
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, ${tool.col}50, transparent)`, opacity: 0.7 }} />
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                  <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: `${tool.col}15`, border: `1px solid ${tool.col}25`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <tool.icon style={{ width: "16px", height: "16px", color: tool.col }} />
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>{tool.name}</div>
                    <div style={{ fontSize: "8px", fontFamily: "monospace", color: tool.col, fontWeight: 600, letterSpacing: "0.2em" }}>{tool.cat}</div>
                  </div>
                </div>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", lineHeight: 1.5 }}>{tool.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: "32px" }}>
            <button onClick={() => navigate("/app")} className="holo-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 28px", borderRadius: "12px", background: "rgba(226,18,39,0.1)", color: "#e21227", fontSize: "13px", fontWeight: 600, border: "1px solid rgba(226,18,39,0.3)", cursor: "pointer" }}>
              <Swords style={{ width: "16px", height: "16px" }} />
              استكشف كل الأدوات في التطبيق
            </button>
          </div>
        </div>
      </section>

      {/* ── COUNCIL MODE SPOTLIGHT ── */}
      <section style={{ padding: "100px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", alignItems: "center" }}>
            <div>
              <SectionLabel text="COUNCIL MODE" />
              <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: "16px" }}>105 عقل ذكاء اصطناعي<br /><span style={{ color: "#e21227" }}>في آنٍ واحد</span></h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "15px", lineHeight: 1.8, marginBottom: "28px" }}>بدلاً من نموذج واحد، يُشغّل وضع المجلس 105 تخصصاً مختلفاً في آنٍ واحد — المخترق، المحلل، المطور، المحقق الجنائي، خبير الشبكات — ويجمع نتائجهم في تقرير موحد عالي الدقة.</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "32px" }}>
                {["تحليل متعدد الزوايا من 105 تخصص", "توافق ديمقراطي: كل عقل يصوّت على الحل", "دقة تتجاوز 97% في نتائج CTF", "تقارير قابلة للتصدير بصيغ متعددة"].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "14px", color: "rgba(255,255,255,0.65)" }}>
                    <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: "10px", color: "#22c55e" }}>✓</span>
                    </div>
                    {item}
                  </div>
                ))}
              </div>
              <button onClick={() => navigate("/app")} className="holo-btn" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "14px 28px", borderRadius: "12px", background: "linear-gradient(135deg, #e21227, #c4101f)", color: "#fff", fontSize: "14px", fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 0 30px rgba(226,18,39,0.35)" }}>
                <Brain style={{ width: "18px", height: "18px" }} />
                جرّب Council Mode
              </button>
            </div>
            {/* Council visual */}
            <div style={{ position: "relative", height: "420px" }}>
              <div style={{ position: "absolute", inset: 0, borderRadius: "24px", background: "radial-gradient(ellipse at center, rgba(226,18,39,0.08) 0%, transparent 70%)" }} />
              {/* Center orb */}
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 80, height: 80, borderRadius: "50%", background: "linear-gradient(135deg, rgba(226,18,39,0.3), rgba(226,18,39,0.1))", border: "2px solid rgba(226,18,39,0.5)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(226,18,39,0.3)", zIndex: 5 }}>
                <Brain style={{ width: 32, height: 32, color: "#e21227" }} />
              </div>
              {/* Orbit nodes */}
              {[
                { label: "Red Team", col: "#e21227", angle: 0,   orbit: 140 },
                { label: "Forensics", col: "#fbbf24", angle: 45,  orbit: 140 },
                { label: "OSINT",    col: "#00e5ff", angle: 90,  orbit: 140 },
                { label: "Crypto",   col: "#a78bfa", angle: 135, orbit: 140 },
                { label: "Network",  col: "#22c55e", angle: 180, orbit: 140 },
                { label: "Dev",      col: "#f97316", angle: 225, orbit: 140 },
                { label: "Malware",  col: "#e21227", angle: 270, orbit: 140 },
                { label: "Analyst",  col: "#38bdf8", angle: 315, orbit: 140 },
              ].map((node, i) => {
                const rad = (node.angle * Math.PI) / 180;
                const x = Math.cos(rad) * node.orbit;
                const y = Math.sin(rad) * node.orbit;
                return (
                  <div key={i} style={{ position: "absolute", top: `calc(50% + ${y}px)`, left: `calc(50% + ${x}px)`, transform: "translate(-50%,-50%)", zIndex: 4 }}>
                    {/* Connector line */}
                    <svg style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", overflow: "visible", pointerEvents: "none" }}>
                      <line x1="0" y1="0" x2={-x} y2={-y} stroke={node.col} strokeOpacity="0.2" strokeWidth="1" strokeDasharray="3 4" />
                    </svg>
                    <div style={{ width: 50, height: 50, borderRadius: "12px", background: `${node.col}15`, border: `1px solid ${node.col}35`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, boxShadow: `0 0 16px ${node.col}20`, backdropFilter: "blur(8px)" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: node.col, boxShadow: `0 0 8px ${node.col}`, animation: "neonFlicker 2s infinite", animationDelay: `${i * 0.25}s` }} />
                      <span style={{ fontSize: "7px", color: node.col, fontFamily: "monospace", fontWeight: 700, textAlign: "center" }}>{node.label}</span>
                    </div>
                  </div>
                );
              })}
              {/* Live activity */}
              <div style={{ position: "absolute", bottom: 16, left: 16, right: 16, padding: "12px 16px", borderRadius: "12px", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(34,197,94,0.2)", backdropFilter: "blur(12px)" }}>
                <div style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(34,197,94,0.6)", marginBottom: "4px" }}>COUNCIL CONSENSUS</div>
                <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>
                  8/8 specialists agree — confidence <span style={{ color: "#22c55e", fontWeight: 700 }}>97%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE ACTIVITY ── */}
      <section style={{ padding: "80px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "40px" }}>
            <SectionLabel text="LIVE OPS" />
            <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: "12px" }}>العمليات الجارية الآن</h2>
          </div>
          <LiveActivityFeed />
        </div>
      </section>

      {/* ── MODELS ── */}
      <section style={{ padding: "100px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", textAlign: "center" }}>
          <SectionLabel text="AI MODELS" />
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: "12px" }}>نماذج متخصصة لكل مهمة</h2>
          <p style={{ color: "rgba(255,255,255,0.35)", marginBottom: "52px" }}>اختر النموذج المناسب أو شغّل عدة نماذج في آنٍ واحد</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            {models.map((m, i) => (
              <HolographicCard key={i} style={{ borderRadius: "16px" }}>
                <div className="glass-panel" style={{ padding: "22px 20px", borderRadius: "16px", textAlign: "left", cursor: "default", position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ width: 32, height: 32, borderRadius: "9px", background: `${m.color}15`, border: `1px solid ${m.color}25`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <m.icon style={{ width: 15, height: 15, color: m.color }} />
                    </div>
                    <span style={{ fontSize: "9px", fontFamily: "monospace", color: m.color, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>{m.tag}</span>
                  </div>
                  <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.85)", fontWeight: 600, letterSpacing: "-0.3px" }}>{m.name}</div>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", borderRadius: "16px 16px 0 0", background: `linear-gradient(90deg, transparent, ${m.color}50, transparent)` }} />
                </div>
              </HolographicCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ── */}
      <section style={{ padding: "100px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "860px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <SectionLabel text="COMPARISON" />
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: "12px" }}>KaliGPT مقابل المنافسين</h2>
            <p style={{ color: "rgba(255,255,255,0.35)" }}>لماذا نختلف جذرياً عن أدوات الذكاء الاصطناعي الأخرى</p>
          </div>
          <div style={{ borderRadius: "20px", overflow: "hidden", border: "1px solid rgba(226,18,39,0.15)", backdropFilter: "blur(20px)" }}>
            {/* Header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", background: "rgba(0,0,0,0.6)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ padding: "16px 20px", fontSize: "11px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em" }}>FEATURE</div>
              {[{ name: "KaliGPT", col: "#e21227" }, { name: "ChatGPT", col: "rgba(255,255,255,0.3)" }, { name: "Copilot", col: "rgba(255,255,255,0.3)" }].map(h => (
                <div key={h.name} style={{ padding: "16px 12px", textAlign: "center", fontSize: "12px", fontWeight: 700, color: h.col, fontFamily: "monospace" }}>{h.name}</div>
              ))}
            </div>
            {comparisons.map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px 120px", background: i % 2 === 0 ? "rgba(255,255,255,0.015)" : "transparent", borderBottom: i < comparisons.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                <div style={{ padding: "14px 20px", fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>{row.feature}</div>
                {[row.kg, row.cg, row.cp].map((val, j) => (
                  <div key={j} style={{ padding: "14px 12px", textAlign: "center" }}>
                    {val
                      ? <span style={{ color: j === 0 ? "#22c55e" : "#22c55e", fontSize: "16px" }}>✓</span>
                      : <span style={{ color: "rgba(255,255,255,0.15)", fontSize: "16px" }}>✗</span>
                    }
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: "100px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <SectionLabel text="TESTIMONIALS" />
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: "12px" }}>يثق بنا المحترفون</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
            {testimonials.map((t, i) => (
              <HolographicCard key={i} style={{ borderRadius: "20px" }}>
                <div className="glass-panel" style={{ padding: "28px", borderRadius: "20px", position: "relative", overflow: "hidden" }}>
                  {/* Quote mark */}
                  <div style={{ position: "absolute", top: 12, right: 20, fontSize: "60px", color: `${t.col}15`, fontFamily: "serif", lineHeight: 1 }}>"</div>
                  {/* Stars */}
                  <div style={{ display: "flex", gap: "2px", marginBottom: "16px" }}>
                    {Array.from({ length: t.rating }, (_, j) => (
                      <span key={j} style={{ color: "#fbbf24", fontSize: "12px" }}>★</span>
                    ))}
                  </div>
                  <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", lineHeight: 1.7, marginBottom: "20px", fontStyle: "italic" }}>"{t.text}"</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: `linear-gradient(135deg, ${t.col}30, ${t.col}10)`, border: `1px solid ${t.col}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: 700, color: t.col }}>
                      {t.avatar}
                    </div>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff" }}>{t.name}</div>
                      <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{t.role}</div>
                    </div>
                  </div>
                  <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: `linear-gradient(90deg, transparent, ${t.col}40, transparent)` }} />
                </div>
              </HolographicCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: "100px 24px", position: "relative", zIndex: 10, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", textAlign: "center" }}>
          <SectionLabel text="PRICING" />
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, letterSpacing: "-1.5px", marginBottom: "12px" }}>ابدأ مجاناً</h2>
          <p style={{ color: "rgba(255,255,255,0.35)", marginBottom: "52px" }}>خطط مرنة للأفراد والفرق الأمنية</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
            {[
              { name: "Free",  price: "$0",  period: "/شهر", features: ["50k رمز/يوم", "النماذج الأساسية", "ترمينال محدود", "OSINT أساسي"], highlight: false, col: "rgba(255,255,255,0.1)" },
              { name: "Pro",   price: "$19", period: "/شهر", features: ["500k رمز/يوم", "كل النماذج", "Arsenal كامل", "OSINT متقدم", "Council Mode", "CVE Watcher"], highlight: true, col: "#e21227" },
              { name: "Elite", price: "$49", period: "/شهر", features: ["نقاط غير محدودة", "GodMode مفتوح", "API Access", "أولوية الدعم", "Team Dashboard", "Custom Models"], highlight: false, col: "rgba(255,255,255,0.1)" },
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
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
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
        {/* Background glow */}
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: "600px", height: "400px", background: "radial-gradient(ellipse, rgba(226,18,39,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ maxWidth: "620px", margin: "0 auto", position: "relative" }}>
          <div style={{ width: "80px", height: "80px", margin: "0 auto 32px", position: "relative", animation: "pulse3d 3s ease-in-out infinite" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "22px", background: "linear-gradient(135deg, rgba(226,18,39,0.2) 0%, rgba(226,18,39,0.05) 100%)", border: "1px solid rgba(226,18,39,0.35)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(226,18,39,0.25), inset 0 1px 0 rgba(255,255,255,0.08)", transform: "perspective(200px) rotateX(15deg)" }}>
              <Zap style={{ width: "36px", height: "36px", color: "#e21227" }} />
            </div>
          </div>
          <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, letterSpacing: "-2px", marginBottom: "16px" }}>جاهز للانطلاق؟</h2>
          <p style={{ color: "rgba(255,255,255,0.35)", marginBottom: "48px", fontSize: "16px", lineHeight: 1.7 }}>
            انضم لآلاف الباحثين الأمنيين الذين يستخدمون KaliGPT يومياً
          </p>
          <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/app")} className="holo-btn" style={{ display: "inline-flex", alignItems: "center", gap: "12px", padding: "18px 48px", borderRadius: "16px", background: "linear-gradient(135deg, #e21227 0%, #c4101f 50%, #a00d1a 100%)", color: "#fff", fontSize: "18px", fontWeight: 800, border: "none", cursor: "pointer", boxShadow: "0 0 60px rgba(226,18,39,0.45), 0 12px 32px rgba(226,18,39,0.25), inset 0 1px 0 rgba(255,255,255,0.2)", letterSpacing: "-0.3px" }}>
              <Terminal style={{ width: "22px", height: "22px" }} />
              افتح KaliGPT
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
            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #e21227, #c4101f)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 16px rgba(226,18,39,0.4)" }}>
                  <Shield style={{ width: "18px", height: "18px", color: "#fff" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "15px" }}>KaliGPT</div>
                  <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>mr7.ai · v4.0</div>
                </div>
              </div>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", lineHeight: 1.7, maxWidth: "280px" }}>
                منصة الأمن السيبراني بالذكاء الاصطناعي — مبنية للباحثين المرخصين والفرق الأمنية الاحترافية.
              </p>
              <div style={{ display: "flex", gap: "8px", marginTop: "16px" }}>
                {["GPT-4o", "Claude 3.5", "Gemini", "Groq"].map(tag => (
                  <span key={tag} style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: "4px" }}>{tag}</span>
                ))}
              </div>
            </div>
            {/* Links */}
            {[
              { title: "المنتج", links: ["الميزات", "الترسانة", "الأسعار", "Roadmap", "ما الجديد"] },
              { title: "المجتمع", links: ["Discord", "GitHub", "Blog", "CTF Labs", "YouTube"] },
              { title: "الدعم", links: ["FAQ", "توثيق API", "تواصل معنا", "سياسة الخصوصية", "شروط الخدمة"] },
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
          {/* Bottom bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", fontFamily: "monospace" }}>
              © 2025 mr7.ai · KaliGPT · For authorized security research only
            </p>
            <div style={{ display: "flex", gap: "6px" }}>
              {["● ONLINE", "14 NODES", "99.9% SLA"].map(stat => (
                <span key={stat} style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(34,197,94,0.5)", border: "1px solid rgba(34,197,94,0.15)", padding: "2px 8px", borderRadius: "4px", background: "rgba(34,197,94,0.04)" }}>{stat}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
