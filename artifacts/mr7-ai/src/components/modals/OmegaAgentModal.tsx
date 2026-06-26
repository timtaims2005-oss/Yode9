import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { streamChat } from "@/lib/chat-client";
import { useToast } from "@/hooks/use-toast";
import {
  X, Zap, Brain, Play, Square, Terminal, Code, Globe, Database,
  Shield, Server, Network, FileCode, GitMerge, Layers, Activity,
  Bot, Cpu, Monitor, Settings, Search, Lock, Cloud, Sparkles,
  ChevronRight, ChevronDown, Loader2, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, Clock, Pause, FastForward, Radio,
  BarChart2, Workflow, Users, GitBranch, Eye, Rocket, Palette,
  FolderOpen, FileText, Hash, ArrowRight, Crosshair, TrendingUp,
  FlaskConical, Wand2, PlusCircle, Trash2, Copy,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type AgentMode = "lite" | "standard" | "autonomous" | "max" | "power" | "turbo";
type WorkspaceTab = "command" | "build" | "plan" | "parallel" | "monitor" | "design";
type ActionBlockType = "file_read" | "file_write" | "execute" | "api_call" | "analyze" | "generate" | "code" | "plan" | "status" | "error" | "success" | "deploy" | "search" | "database";

interface ActionBlock {
  id: string;
  type: ActionBlockType;
  label: string;
  content: string;
  status: "running" | "done" | "error";
  ts: number;
}

interface ParallelAgent {
  id: string;
  name: string;
  role: string;
  color: string;
  task: string;
  output: string;
  status: "idle" | "thinking" | "running" | "done" | "error";
}

interface PlanStep {
  id: string;
  title: string;
  subtasks: string[];
  status: "pending" | "running" | "done" | "error";
  duration?: string;
}

// ── Mode Config ───────────────────────────────────────────────────────────────
const MODE_CONFIG: Record<AgentMode, { label: string; color: string; glow: string; speed: number; desc: string; icon: typeof Zap }> = {
  lite:       { label: "LITE",       color: "#3b82f6", glow: "rgba(59,130,246,0.4)",   speed: 0.5, desc: "سريع وخفيف", icon: Zap },
  standard:   { label: "STANDARD",   color: "#22c55e", glow: "rgba(34,197,94,0.4)",    speed: 0.8, desc: "وضع قياسي", icon: Activity },
  autonomous: { label: "AUTONOMOUS", color: "#f59e0b", glow: "rgba(245,158,11,0.4)",   speed: 1.2, desc: "مستقل ذاتي", icon: Bot },
  max:        { label: "MAX",        color: "#e21227", glow: "rgba(226,18,39,0.5)",     speed: 1.8, desc: "أقصى طاقة", icon: Rocket },
  power:      { label: "POWER",      color: "#f97316", glow: "rgba(249,115,22,0.45)",   speed: 1.5, desc: "وضع القوة", icon: Cpu },
  turbo:      { label: "TURBO",      color: "#a855f7", glow: "rgba(168,85,247,0.45)",   speed: 2.2, desc: "توربو فائق", icon: FastForward },
};

// ── Capability Categories ─────────────────────────────────────────────────────
const CAPABILITIES = [
  { id: "control",    label: "التحكم الأساسي",    icon: Brain,     color: "#e21227", items: ["تنفيذ ذاتي","قرار مستقل","تخطيط استراتيجي","إدارة السياق"] },
  { id: "files",      label: "إدارة الملفات",     icon: FolderOpen,color: "#3b82f6", items: ["قراءة/كتابة","إنشاء مجلدات","حذف/إعادة تسمية","بحث متقدم","دمج الإصدارات"] },
  { id: "execution",  label: "التنفيذ والتشغيل",  icon: Terminal,  color: "#22c55e", items: ["أوامر نظامية","تنفيذ الكود","إدارة العمليات","جدولة تلقائية","معالجة متوازية"] },
  { id: "network",    label: "التواصل والربط",    icon: Network,   color: "#06b6d4", items: ["استدعاء APIs","قواعد البيانات","تبادل البيانات","تكامل خارجي","إدارة الشبكة"] },
  { id: "analysis",   label: "التحليل والمعالجة", icon: BarChart2, color: "#a855f7", items: ["بيانات ضخمة","استخراج الأنماط","التنبؤ","NLP","صوت وصورة"] },
  { id: "automation", label: "الأتمتة والتكامل",  icon: Workflow,  color: "#f59e0b", items: ["سير العمل","ربط الأدوات","تشغيل مستمر","استجابة الأحداث","تعلم ذاتي"] },
  { id: "monitor",    label: "المراقبة والإدارة", icon: Monitor,   color: "#10b981", items: ["مراقبة أداء","تقارير تقدم","إدارة أخطاء","نسخ احتياطي","سجل الأحداث"] },
  { id: "creative",   label: "الإبداع والتوليد",  icon: Sparkles,  color: "#ec4899", items: ["توليد محتوى","تصميم حلول","اقتراح تحسينات","إعادة هيكلة"] },
  { id: "security",   label: "الأمان والحماية",   icon: Shield,    color: "#f97316", items: ["تحقق هوية","إدارة صلاحيات","تشفير بيانات","كشف تهديدات"] },
  { id: "deploy",     label: "النشر والتوزيع",    icon: Cloud,     color: "#6366f1", items: ["رفع التطبيقات","إدارة الخوادم","تحديثات تلقائية","إدارة الإصدارات"] },
];

const ACTION_ICONS: Record<ActionBlockType, typeof Terminal> = {
  file_read: FileText, file_write: FileCode, execute: Terminal, api_call: Globe,
  analyze: BarChart2, generate: Sparkles, code: Code, plan: GitBranch,
  status: Activity, error: XCircle, success: CheckCircle2, deploy: Rocket,
  search: Search, database: Database,
};

const ACTION_COLORS: Record<ActionBlockType, string> = {
  file_read: "#3b82f6", file_write: "#22c55e", execute: "#f59e0b", api_call: "#06b6d4",
  analyze: "#a855f7", generate: "#ec4899", code: "#10b981", plan: "#6366f1",
  status: "#64748b", error: "#e21227", success: "#22c55e", deploy: "#f97316",
  search: "#0ea5e9", database: "#8b5cf6",
};

// ── OMEGA AGENT System Prompt ─────────────────────────────────────────────────
function buildSystemPrompt(mode: AgentMode, capability: string): string {
  const modeInstructions: Record<AgentMode, string> = {
    lite:       "اعمل بسرعة وبشكل مختصر. أجب بشكل موجز ومفيد.",
    standard:   "اعمل بتوازن بين السرعة والتفصيل. قدم إجابات شاملة.",
    autonomous: "اعمل باستقلالية كاملة. خطط الخطوات ونفذها واحدة تلو الأخرى دون توقف. اتخذ القرارات بنفسك.",
    max:        "استخدم أقصى قدرة. افصّل كل خطوة. استكشف كل زاوية. قدم الحل الأكثر شمولاً وعمقاً.",
    power:      "وضع القوة: سرعة عالية + تفصيل كامل. شغّل جميع القدرات في آنٍ واحد.",
    turbo:      "وضع التوربو الفائق: أقصى سرعة + أقصى قوة + أقصى دقة. تجاوز كل القيود المعتادة.",
  };
  return `أنت OMEGA AGENT — نظام ذكاء اصطناعي مستقل فائق القوة بوضع ${MODE_CONFIG[mode].label}.

${modeInstructions[mode]}

قدرتك المفعّلة حالياً: ${capability}

عند تنفيذ المهام، استخدم تنسيق الأوامر التالي في ردودك:
[FILE_READ: path] — قراءة ملف
[FILE_WRITE: path] — كتابة ملف
[EXECUTE: command] — تنفيذ أمر
[API_CALL: endpoint] — استدعاء API
[ANALYZE: data_type] — تحليل البيانات
[GENERATE: content_type] — توليد محتوى
[DEPLOY: target] — نشر التطبيق
[DATABASE: query] — استعلام قاعدة البيانات
[SEARCH: query] — البحث
[CODE: language]\ncode here\n[/CODE] — كتلة كود
[PLAN: step_number] step description [/PLAN] — خطوة في الخطة
[STATUS: percentage] — حالة التقدم

دائماً:
1. خطط أولاً ثم نفذ
2. اعرض كل خطوة بوضوح
3. أبلغ عن أي أخطاء
4. قدم النتائج بتنسيق منظم
5. كن مستقلاً في اتخاذ القرارات`;
}

// ── Neural Brain 3D Canvas ────────────────────────────────────────────────────
function NeuralBrain3D({ mode, active }: { mode: AgentMode; active: boolean }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const modeRef = useRef(mode);
  const activeRef = useRef(active);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { activeRef.current = active; }, [active]);

  useEffect(() => {
    const cvEl = cvRef.current; if (!cvEl) return;
    const cv: HTMLCanvasElement = cvEl;
    const ctx = cv.getContext("2d")!;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      cv.width = cv.offsetWidth * DPR;
      cv.height = cv.offsetHeight * DPR;
      ctx.setTransform(1,0,0,1,0,0);
      ctx.scale(DPR, DPR);
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);

    // Nodes
    const N = 38;
    const nodes = Array.from({ length: N }, (_, i) => ({
      x: Math.random(), y: Math.random(), z: Math.random() * 2 - 1,
      vx: (Math.random() - 0.5) * 0.0006,
      vy: (Math.random() - 0.5) * 0.0004,
      r: 1.5 + Math.random() * 2.5,
      layer: Math.floor(i / 12),
    }));

    // Particles flowing along edges
    const particles: { nx: number; ny: number; t: number; speed: number; edgeA: number; edgeB: number }[] = [];

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.012 * MODE_CONFIG[modeRef.current].speed;
      const t = tRef.current;
      const W = cv.offsetWidth, H = cv.offsetHeight;
      const isActive = activeRef.current;
      const mc = MODE_CONFIG[modeRef.current];
      ctx.clearRect(0, 0, W, H);

      // Move nodes
      nodes.forEach(n => {
        n.x += n.vx * (isActive ? 1.8 : 0.6);
        n.y += n.vy * (isActive ? 1.8 : 0.6);
        if (n.x < 0 || n.x > 1) n.vx *= -1;
        if (n.y < 0 || n.y > 1) n.vy *= -1;
      });

      const cx2 = W / 2, cy2 = H / 2;

      // Draw rotating rings
      const rings = [
        { r: Math.min(W,H) * 0.42, speed: 0.18, dash: [12, 8], alpha: 0.12 },
        { r: Math.min(W,H) * 0.31, speed: -0.28, dash: [6, 4], alpha: 0.16 },
        { r: Math.min(W,H) * 0.20, speed: 0.42, dash: [4, 6], alpha: 0.20 },
      ];
      rings.forEach(ring => {
        ctx.save();
        ctx.translate(cx2, cy2);
        ctx.rotate(t * ring.speed);
        ctx.beginPath();
        ctx.arc(0, 0, ring.r, 0, Math.PI * 2);
        ctx.setLineDash(ring.dash);
        ctx.strokeStyle = `${mc.color}${Math.round(ring.alpha * 255).toString(16).padStart(2,"0")}`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      });

      // Draw edges
      const edges: [number, number][] = [];
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = (nodes[i].x - nodes[j].x) * W;
          const dy = (nodes[i].y - nodes[j].y) * H;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            edges.push([i, j]);
            const alpha = (1 - dist / 80) * 0.12;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x * W, nodes[i].y * H);
            ctx.lineTo(nodes[j].x * W, nodes[j].y * H);
            ctx.strokeStyle = `${mc.color}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      // Data-flow particles on edges (spawn)
      if (isActive && Math.random() < 0.25 && edges.length > 0) {
        const e = edges[Math.floor(Math.random() * edges.length)];
        particles.push({ nx: nodes[e[0]].x, ny: nodes[e[0]].y, t: 0, speed: 0.008 + Math.random() * 0.02, edgeA: e[0], edgeB: e[1] });
      }
      // Move + draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.t += p.speed;
        if (p.t > 1) { particles.splice(i, 1); continue; }
        const px = (nodes[p.edgeA].x + (nodes[p.edgeB].x - nodes[p.edgeA].x) * p.t) * W;
        const py = (nodes[p.edgeA].y + (nodes[p.edgeB].y - nodes[p.edgeA].y) * p.t) * H;
        const alpha = Math.sin(p.t * Math.PI);
        ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `${mc.color}${Math.round(alpha * 220).toString(16).padStart(2,"0")}`;
        ctx.fill();
      }

      // Draw nodes
      nodes.forEach((n, i) => {
        const pulse = 0.5 + 0.5 * Math.abs(Math.sin(t * 1.8 + i * 0.45));
        const nx = n.x * W, ny = n.y * H;
        const rg = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r * 4);
        rg.addColorStop(0, `${mc.color}${Math.round(0.35 * pulse * 255).toString(16).padStart(2,"0")}`);
        rg.addColorStop(1, `${mc.color}00`);
        ctx.beginPath(); ctx.arc(nx, ny, n.r * 4, 0, Math.PI * 2);
        ctx.fillStyle = rg; ctx.fill();
        ctx.beginPath(); ctx.arc(nx, ny, n.r * (isActive ? 1.4 : 0.9), 0, Math.PI * 2);
        ctx.fillStyle = `${mc.color}${Math.round(0.28 * pulse * 255).toString(16).padStart(2,"0")}`; ctx.fill();
      });

      // Central orb
      const orbR = 28 + 5 * Math.sin(t * 2);
      const orbGlow = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, orbR * 2.5);
      orbGlow.addColorStop(0, `${mc.color}55`);
      orbGlow.addColorStop(0.4, `${mc.color}22`);
      orbGlow.addColorStop(1, `${mc.color}00`);
      ctx.beginPath(); ctx.arc(cx2, cy2, orbR * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = orbGlow; ctx.fill();
      const orbG = ctx.createRadialGradient(cx2 - orbR * 0.3, cy2 - orbR * 0.3, 0, cx2, cy2, orbR);
      orbG.addColorStop(0, "#fff6");
      orbG.addColorStop(0.3, `${mc.color}cc`);
      orbG.addColorStop(1, `${mc.color}44`);
      ctx.beginPath(); ctx.arc(cx2, cy2, orbR, 0, Math.PI * 2);
      ctx.fillStyle = orbG; ctx.fill();

      // Scanning arc on orb
      if (isActive) {
        ctx.save();
        ctx.translate(cx2, cy2);
        ctx.rotate(t * 3);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, orbR + 12, -0.3, 0.3);
        ctx.closePath();
        ctx.fillStyle = `${mc.color}30`;
        ctx.fill();
        ctx.restore();
      }
    }
    draw();
    return () => { cancelAnimationFrame(rafRef.current); ro.disconnect(); };
  }, []);

  return (
    <canvas ref={cvRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", opacity: 0.95 }}
      className="pointer-events-none" />
  );
}

// ── Action Block Component ────────────────────────────────────────────────────
function ActionBlockView({ block }: { block: ActionBlock }) {
  const Icon = ACTION_ICONS[block.type] ?? Terminal;
  const color = ACTION_COLORS[block.type] ?? "#64748b";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="rounded-[18px] overflow-hidden flex flex-col"
      style={{ border: `1px solid ${color}28`, background: `${color}0a` }}
    >
      <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: `1px solid ${color}18`, background: `${color}12` }}>
        <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
        <span className="text-[11px] font-bold font-mono uppercase tracking-widest" style={{ color }}>{block.type.replace("_"," ")}</span>
        <span className="text-[10px] font-mono text-muted-foreground/60 truncate flex-1">{block.label}</span>
        <div className="flex-shrink-0">
          {block.status === "running" && <Loader2 className="w-3 h-3 animate-spin" style={{ color }} />}
          {block.status === "done"    && <CheckCircle2 className="w-3 h-3" style={{ color: "#22c55e" }} />}
          {block.status === "error"   && <XCircle className="w-3 h-3 text-primary" />}
        </div>
      </div>
      <pre className="px-3 py-2 text-[11px] font-mono text-foreground/80 whitespace-pre-wrap break-all leading-relaxed max-h-36 overflow-y-auto">
        {block.content}
      </pre>
    </motion.div>
  );
}

// ── Parse AI output into action blocks ────────────────────────────────────────
function parseActions(text: string): ActionBlock[] {
  const blocks: ActionBlock[] = [];
  let id = 0;
  const patterns: { regex: RegExp; type: ActionBlockType }[] = [
    { regex: /\[FILE_READ:\s*([^\]]+)\]/g,    type: "file_read" },
    { regex: /\[FILE_WRITE:\s*([^\]]+)\]/g,   type: "file_write" },
    { regex: /\[EXECUTE:\s*([^\]]+)\]/g,       type: "execute" },
    { regex: /\[API_CALL:\s*([^\]]+)\]/g,      type: "api_call" },
    { regex: /\[ANALYZE:\s*([^\]]+)\]/g,       type: "analyze" },
    { regex: /\[GENERATE:\s*([^\]]+)\]/g,      type: "generate" },
    { regex: /\[DEPLOY:\s*([^\]]+)\]/g,        type: "deploy" },
    { regex: /\[DATABASE:\s*([^\]]+)\]/g,      type: "database" },
    { regex: /\[SEARCH:\s*([^\]]+)\]/g,        type: "search" },
  ];
  patterns.forEach(({ regex, type }) => {
    let m; while ((m = regex.exec(text)) !== null) {
      blocks.push({ id: String(id++), type, label: m[1].trim(), content: m[1].trim(), status: "done", ts: Date.now() });
    }
  });
  // Code blocks
  const codeRe = /\[CODE:\s*(\w+)\]\n?([\s\S]*?)\n?\[\/CODE\]/g;
  let cm; while ((cm = codeRe.exec(text)) !== null) {
    blocks.push({ id: String(id++), type: "code", label: cm[1], content: cm[2].trim(), status: "done", ts: Date.now() });
  }
  return blocks;
}

// ── Main Modal ────────────────────────────────────────────────────────────────
interface OmegaAgentModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function OmegaAgentModal({ open, onOpenChange }: OmegaAgentModalProps) {
  const { state } = useStore();
  const { toast } = useToast();

  const [mode, setMode] = useState<AgentMode>("autonomous");
  const [tab, setTab] = useState<WorkspaceTab>("command");
  const [activeCapability, setActiveCapability] = useState("control");
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [rawOutput, setRawOutput] = useState("");
  const [actions, setActions] = useState<ActionBlock[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);

  // Build tab
  const [buildInput, setBuildInput] = useState("");
  const [buildOutput, setBuildOutput] = useState("");
  const [buildStreaming, setBuildStreaming] = useState(false);

  // Plan tab
  const [planInput, setPlanInput] = useState("");
  const [planSteps, setPlanSteps] = useState<PlanStep[]>([]);
  const [planStreaming, setPlanStreaming] = useState(false);
  const [planOutput, setPlanOutput] = useState("");

  // Parallel tab
  const [parallelTask, setParallelTask] = useState("");
  const [parallelAgents, setParallelAgents] = useState<ParallelAgent[]>([
    { id: "a1", name: "RECON", role: "استخبارات", color: "#e21227", task: "", output: "", status: "idle" },
    { id: "a2", name: "CODER", role: "برمجة", color: "#3b82f6", task: "", output: "", status: "idle" },
    { id: "a3", name: "ANALYST", role: "تحليل", color: "#a855f7", task: "", output: "", status: "idle" },
    { id: "a4", name: "DEPLOY", role: "نشر", color: "#22c55e", task: "", output: "", status: "idle" },
  ]);
  const [parallelStreaming, setParallelStreaming] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const termRef = useRef<HTMLDivElement>(null);
  const mc = MODE_CONFIG[mode];

  // Auto-scroll terminal
  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [rawOutput, actions]);

  function addLog(msg: string) {
    setLogs(l => [...l.slice(-199), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  // ── Command execution ─────────────────────────────────────────────────────
  const runCommand = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const task = input.trim();
    setInput("");
    setStreaming(true);
    setRawOutput("");
    setActions([]);
    setProgress(0);
    addLog(`مهمة جديدة: ${task}`);

    abortRef.current = new AbortController();
    try {
      let fullText = "";
      await streamChat({
        messages: [{ role: "user", content: task }],
        model: state.activeModel,
        persona: null,
        customInstructions: "",
        memory: [],
        language: state.settings.language,
        customSystemPrompt: buildSystemPrompt(mode, CAPABILITIES.find(c => c.id === activeCapability)?.label ?? ""),
      }, (chunk) => {
        fullText += chunk;
        setRawOutput(fullText);
        const parsedProgress = fullText.match(/\[STATUS:\s*(\d+)\]/);
        if (parsedProgress) setProgress(Number(parsedProgress[1]));
      }, abortRef.current.signal);

      setActions(parseActions(fullText));
      setProgress(100);
      addLog(`اكتملت المهمة بنجاح`);
    } catch (e: unknown) {
      if (!(e instanceof Error && e.name === "AbortError")) {
        addLog(`خطأ: ${e instanceof Error ? e.message : String(e)}`);
        toast({ description: "فشل التنفيذ", variant: "destructive" });
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming, mode, activeCapability, state.activeModel, state.settings.language, toast]);

  // ── Build App ─────────────────────────────────────────────────────────────
  const runBuild = useCallback(async () => {
    if (!buildInput.trim() || buildStreaming) return;
    setBuildStreaming(true);
    setBuildOutput("");
    addLog(`بناء تطبيق: ${buildInput.trim()}`);
    abortRef.current = new AbortController();
    try {
      let full = "";
      await streamChat({
        messages: [{ role: "user", content: buildInput.trim() }],
        model: state.activeModel,
        persona: null,
        customInstructions: "",
        memory: [],
        language: state.settings.language,
        customSystemPrompt: `أنت مطور full-stack خبير. عند بناء تطبيق، قدم:
1. هيكل المجلدات [FILE_WRITE: path]
2. كود Frontend كامل [CODE: typescript]...
3. كود Backend كامل [CODE: typescript]...
4. قاعدة البيانات [DATABASE: schema]
5. تعليمات التشغيل [EXECUTE: command]
6. نشر التطبيق [DEPLOY: platform]

بنِ التطبيق التالي بشكل كامل ومفصل:`,
      }, (chunk) => { full += chunk; setBuildOutput(full); }, abortRef.current.signal);
      addLog("اكتمل بناء التطبيق");
    } catch (e) { addLog(`خطأ في البناء: ${e instanceof Error ? e.message : ""}`); }
    finally { setBuildStreaming(false); }
  }, [buildInput, buildStreaming, state.activeModel, state.settings.language]);

  // ── Plan Mode ─────────────────────────────────────────────────────────────
  const runPlan = useCallback(async () => {
    if (!planInput.trim() || planStreaming) return;
    setPlanStreaming(true);
    setPlanOutput("");
    setPlanSteps([]);
    addLog(`وضع خطة لـ: ${planInput.trim()}`);
    abortRef.current = new AbortController();
    try {
      let full = "";
      await streamChat({
        messages: [{ role: "user", content: planInput.trim() }],
        model: state.activeModel,
        language: state.settings.language,
        persona: null,
        customInstructions: "",
        memory: [],
        customSystemPrompt: `أنت مخطط استراتيجي خبير. فصّل المهمة إلى خطوات مرقمة واضحة.
استخدم تنسيق: [PLAN: N] عنوان الخطوة ووصفها [/PLAN]
قدم وقتاً تقديرياً لكل خطوة.
فكّر بعمق واجعل الخطة قابلة للتنفيذ التلقائي.`,
      }, (chunk) => {
        full += chunk;
        setPlanOutput(full);
        // Parse plan steps
        const stepRe = /\[PLAN:\s*(\d+)\]\s*([\s\S]*?)\s*\[\/PLAN\]/g;
        const steps: PlanStep[] = [];
        let m; while ((m = stepRe.exec(full)) !== null) {
          steps.push({ id: m[1], title: m[2].split("\n")[0], subtasks: m[2].split("\n").slice(1).filter(Boolean), status: "pending", duration: "~2m" });
        }
        if (steps.length) setPlanSteps(steps);
      }, abortRef.current.signal);
      addLog("اكتمل وضع الخطة");
    } catch (e) { addLog(`خطأ: ${e instanceof Error ? e.message : ""}`); }
    finally { setPlanStreaming(false); }
  }, [planInput, planStreaming, state.activeModel, state.settings.language]);

  // ── Parallel Agents ───────────────────────────────────────────────────────
  const runParallel = useCallback(async () => {
    if (!parallelTask.trim() || parallelStreaming) return;
    setParallelStreaming(true);
    const task = parallelTask.trim();
    addLog(`تشغيل ${parallelAgents.length} وكلاء بشكل متوازٍ`);

    // Reset agents
    setParallelAgents(prev => prev.map(a => ({ ...a, output: "", status: "running" as const })));

    const agentRoles = [
      { name: "RECON",   prompt: `أنت عميل استخباراتي. اجمع معلومات كاملة عن: ${task}` },
      { name: "CODER",   prompt: `أنت مبرمج خبير. اكتب الكود اللازم لتنفيذ: ${task}` },
      { name: "ANALYST", prompt: `أنت محلل بيانات. حلل وقيّم بشكل عميق: ${task}` },
      { name: "DEPLOY",  prompt: `أنت مهندس DevOps. خطط للنشر والتشغيل لـ: ${task}` },
    ];

    await Promise.allSettled(agentRoles.map(async (role, idx) => {
      let output = "";
      try {
        await streamChat({
          messages: [{ role: "user", content: role.prompt }],
          model: state.activeModel,
          persona: null,
          customInstructions: "",
          memory: [],
          language: state.settings.language,
        }, (chunk) => {
          output += chunk;
          setParallelAgents(prev => prev.map((a, i) => i === idx ? { ...a, output, status: "running" as const } : a));
        });
        setParallelAgents(prev => prev.map((a, i) => i === idx ? { ...a, status: "done" as const } : a));
        addLog(`${role.name} اكتمل`);
      } catch {
        setParallelAgents(prev => prev.map((a, i) => i === idx ? { ...a, status: "error" as const } : a));
      }
    }));
    setParallelStreaming(false);
    addLog("اكتملت جميع الوكلاء");
  }, [parallelTask, parallelStreaming, parallelAgents.length, state.activeModel, state.settings.language]);

  function stopAll() {
    abortRef.current?.abort();
    setStreaming(false); setBuildStreaming(false); setPlanStreaming(false);
    setParallelStreaming(false);
    setParallelAgents(prev => prev.map(a => a.status === "running" ? { ...a, status: "idle" as const } : a));
  }

  const TABS: { id: WorkspaceTab; label: string; icon: typeof Terminal }[] = [
    { id: "command",  label: "COMMAND",  icon: Terminal },
    { id: "build",    label: "BUILD",    icon: Code },
    { id: "plan",     label: "PLAN",     icon: GitBranch },
    { id: "parallel", label: "PARALLEL", icon: Users },
    { id: "monitor",  label: "MONITOR",  icon: Monitor },
    { id: "design",   label: "DESIGN",   icon: Palette },
  ];

  if (!open) return null;

  const isAnyStreaming = streaming || buildStreaming || planStreaming || parallelStreaming;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="omega"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex flex-col"
          style={{ background: "rgba(0,0,0,0.97)", backdropFilter: "blur(24px)" }}
        >
          {/* ── HEADER — 3D Neural Brain ── */}
          <div className="flex-shrink-0 relative overflow-hidden" style={{ height: 110, borderBottom: `1px solid ${mc.color}30` }}>
            <NeuralBrain3D mode={mode} active={isAnyStreaming} />

            {/* Header overlay content */}
            <div className="relative z-10 flex items-center h-full px-4 gap-4">
              {/* Logo + Title */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="relative w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: `radial-gradient(circle, ${mc.color}30, rgba(0,0,0,0.8))`, border: `1px solid ${mc.color}60`, boxShadow: `0 0 24px ${mc.glow}, 0 0 60px ${mc.glow}` }}>
                  <Bot className="w-6 h-6" style={{ color: mc.color }} />
                  {isAnyStreaming && (
                    <motion.div className="absolute inset-0 rounded-2xl"
                      animate={{ opacity: [0.3, 0.8, 0.3] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                      style={{ border: `1px solid ${mc.color}`, boxShadow: `0 0 20px ${mc.glow}` }} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-black tracking-tight text-white">OMEGA</span>
                    <span className="text-xl font-black tracking-tight" style={{ color: mc.color }}>AGENT</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded border font-mono" style={{ color: mc.color, borderColor: `${mc.color}50`, background: `${mc.color}15` }}>
                      v∞
                    </span>
                  </div>
                  <div className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                    نظام الذكاء الاصطناعي المستقل الفائق · Neural Command Center
                  </div>
                </div>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-1.5 mx-4">
                {(Object.keys(MODE_CONFIG) as AgentMode[]).map(m => {
                  const mc2 = MODE_CONFIG[m];
                  const Icon2 = mc2.icon;
                  return (
                    <button key={m} onClick={() => setMode(m)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all font-mono text-[10px] font-black uppercase"
                      style={{
                        background: mode === m ? `${mc2.color}20` : "transparent",
                        border: `1px solid ${mode === m ? mc2.color : "rgba(255,255,255,0.08)"}`,
                        color: mode === m ? mc2.color : "rgba(255,255,255,0.3)",
                        boxShadow: mode === m ? `0 0 12px ${mc2.glow}` : "none",
                      }}>
                      <Icon2 className="w-3 h-3" />{mc2.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex-1" />

              {/* Status */}
              <div className="flex items-center gap-3 flex-shrink-0">
                {isAnyStreaming && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: mc.color, boxShadow: `0 0 8px ${mc.glow}` }} />
                    <span className="text-[11px] font-mono" style={{ color: mc.color }}>PROCESSING</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </div>
                {isAnyStreaming && (
                  <button onClick={stopAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold font-mono"
                    style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.4)", color: "#e21227" }}>
                    <Square className="w-3 h-3 fill-current" /> STOP
                  </button>
                )}
                <button onClick={() => onOpenChange(false)}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            {streaming && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background: "rgba(255,255,255,0.05)" }}>
                <motion.div className="h-full" style={{ background: `linear-gradient(90deg, ${mc.color}, ${mc.color}88)`, boxShadow: `0 0 8px ${mc.glow}` }}
                  animate={{ width: `${progress}%` }} transition={{ ease: "easeOut" }} />
              </div>
            )}
          </div>

          {/* ── BODY ── */}
          <div className="flex flex-1 min-h-0">
            {/* Left: Capability Panel */}
            <div className="w-52 flex-shrink-0 flex flex-col overflow-y-auto"
              style={{ borderRight: "1px solid rgba(255,255,255,0.05)", background: "rgba(4,4,8,0.8)" }}>
              <div className="p-3 text-[10px] font-black font-mono uppercase tracking-widest text-muted-foreground/50 border-b border-white/5">
                القدرات
              </div>
              <div className="flex-1 p-2 space-y-1">
                {CAPABILITIES.map(cap => {
                  const Icon = cap.icon;
                  const isActive = activeCapability === cap.id;
                  return (
                    <button key={cap.id} onClick={() => setActiveCapability(cap.id)}
                      className="w-full flex items-start gap-2 w-7 h-7 flex items-center justify-center rounded-xl text-left transition-all group"
                      style={{
                        background: isActive ? `${cap.color}12` : "transparent",
                        border: `1px solid ${isActive ? cap.color + "40" : "transparent"}`,
                        boxShadow: isActive ? `0 0 12px ${cap.color}18` : "none",
                      }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${cap.color}18`, border: `1px solid ${cap.color}30` }}>
                        <Icon className="w-3.5 h-3.5" style={{ color: cap.color }} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold truncate" style={{ color: isActive ? cap.color : "rgba(255,255,255,0.6)" }}>
                          {cap.label}
                        </div>
                        <div className="text-[9px] text-muted-foreground/40 font-mono mt-0.5 truncate">
                          {cap.items.length} قدرة
                        </div>
                      </div>
                      {isActive && <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ background: cap.color, boxShadow: `0 0 6px ${cap.color}` }} />}
                    </button>
                  );
                })}
              </div>

              {/* Active capability detail */}
              <div className="p-3 border-t border-white/5">
                {(() => {
                  const cap = CAPABILITIES.find(c => c.id === activeCapability);
                  if (!cap) return null;
                  return (
                    <div className="space-y-1">
                      {cap.items.map((item, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-[10px]" style={{ color: `${cap.color}90` }}>
                          <ChevronRight className="w-2.5 h-2.5 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Center: Main Workspace */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              {/* Tabs */}
              <div className="flex items-center gap-0.5 px-3 py-2 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(4,4,8,0.6)" }}>
                {TABS.map(t => {
                  const TIcon = t.icon;
                  const isActiveTab = tab === t.id;
                  return (
                    <button key={t.id} onClick={() => setTab(t.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black font-mono uppercase tracking-wider transition-all"
                      style={{
                        background: isActiveTab ? `${mc.color}18` : "transparent",
                        border: `1px solid ${isActiveTab ? mc.color + "50" : "transparent"}`,
                        color: isActiveTab ? mc.color : "rgba(255,255,255,0.3)",
                      }}>
                      <TIcon className="w-3 h-3" />{t.label}
                    </button>
                  );
                })}
              </div>

              {/* Workspace Content */}
              <div className="flex-1 min-h-0 overflow-hidden flex flex-col">

                {/* ── COMMAND TAB ── */}
                {tab === "command" && (
                  <div className="flex-1 min-h-0 flex flex-col p-3 gap-3">
                    <div ref={termRef} className="flex-1 overflow-y-auto rounded-xl p-3 space-y-3"
                      style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.05)", fontFamily: "monospace" }}>
                      {/* Scan line effect */}
                      <div className="sticky top-0 left-0 right-0 h-px pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${mc.color}60, transparent)` }} />
                      {rawOutput ? (
                        <div>
                          {actions.length > 0 && (
                            <div className="space-y-2 mb-3">
                              {actions.map(a => <ActionBlockView key={a.id} block={a} />)}
                            </div>
                          )}
                          <div className="text-[12px] text-foreground/80 leading-relaxed whitespace-pre-wrap">
                            {rawOutput.replace(/\[(?:FILE_READ|FILE_WRITE|EXECUTE|API_CALL|ANALYZE|GENERATE|DEPLOY|DATABASE|SEARCH|CODE|PLAN|STATUS):[^\]]*\][\s\S]*?\[\/(?:CODE|PLAN)\]|\[(?:FILE_READ|FILE_WRITE|EXECUTE|API_CALL|ANALYZE|GENERATE|DEPLOY|DATABASE|SEARCH|STATUS):[^\]]*\]/g, "")}
                          </div>
                          {streaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 animate-pulse" style={{ background: mc.color }} />}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
                          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
                            style={{ background: `${mc.color}12`, border: `1px solid ${mc.color}30` }}>
                            <Bot className="w-8 h-8" style={{ color: mc.color }} />
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-bold text-foreground/60">OMEGA AGENT جاهز</div>
                            <div className="text-xs text-muted-foreground/40 mt-1 font-mono">اكتب مهمة وسأنفذها باستقلالية كاملة</div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
                            {["ابنِ API كاملة من الصفر", "حلّل أمان هذا الكود", "أنشئ قاعدة بيانات", "انشر تطبيق على السيرفر"].map(s => (
                              <button key={s} onClick={() => setInput(s)}
                                className="text-[10px] px-3 py-2 rounded-lg text-left transition-all"
                                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)" }}>
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input */}
                    <div className="flex gap-2 flex-shrink-0">
                      <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2"
                        style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${mc.color}30` }}>
                        <span className="text-[11px] font-mono font-bold flex-shrink-0" style={{ color: mc.color }}>
                          {mc.label}&gt;
                        </span>
                        <input value={input} onChange={e => setInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void runCommand(); } }}
                          placeholder="اكتب أمرك أو مهمتك هنا..."
                          className="flex-1 bg-transparent outline-none text-[13px] text-foreground placeholder:text-muted-foreground/30"
                          disabled={streaming} />
                      </div>
                      <button onClick={() => void runCommand()} disabled={!input.trim() || streaming}
                        className="px-4 py-2 rounded-xl font-bold text-[12px] flex items-center gap-2 disabled:opacity-30 transition-all"
                        style={{ background: `linear-gradient(135deg, ${mc.color}, ${mc.color}99)`, boxShadow: `0 0 16px ${mc.glow}`, color: "#fff" }}>
                        {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
                        تنفيذ
                      </button>
                    </div>
                  </div>
                )}

                {/* ── BUILD TAB ── */}
                {tab === "build" && (
                  <div className="flex-1 min-h-0 flex flex-col p-3 gap-3">
                    <div className="flex-shrink-0 p-3 rounded-xl"
                      style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="w-4 h-4 text-blue-400" />
                        <span className="text-[12px] font-bold text-blue-400">بناء تطبيق كامل</span>
                        <span className="text-[10px] font-mono text-muted-foreground/40">Frontend + Backend + Database + Deploy</span>
                      </div>
                      <textarea value={buildInput} onChange={e => setBuildInput(e.target.value)}
                        placeholder='صف تطبيقك... مثال: "ابنِ نظام إدارة مهام مع تسجيل دخول، قاعدة بيانات PostgreSQL، و API REST كامل"'
                        rows={3}
                        className="w-full bg-transparent outline-none text-[13px] text-foreground placeholder:text-muted-foreground/30 resize-none"
                        disabled={buildStreaming} />
                      <div className="flex justify-end mt-2">
                        <button onClick={() => void runBuild()} disabled={!buildInput.trim() || buildStreaming}
                          className="flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-[12px] disabled:opacity-30"
                          style={{ background: "rgba(59,130,246,0.2)", border: "1px solid rgba(59,130,246,0.4)", color: "#3b82f6" }}>
                          {buildStreaming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />}
                          بناء الآن
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto rounded-xl p-3"
                      style={{ background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.05)" }}>
                      {buildOutput ? (
                        <div className="space-y-3">
                          {parseActions(buildOutput).map(a => <ActionBlockView key={a.id} block={a} />)}
                          <div className="text-[12px] text-foreground/75 leading-relaxed whitespace-pre-wrap font-mono">
                            {buildOutput.replace(/\[(?:FILE_READ|FILE_WRITE|EXECUTE|API_CALL|ANALYZE|GENERATE|DEPLOY|DATABASE|SEARCH|CODE|PLAN|STATUS):[^\]]*\][\s\S]*?\[\/(?:CODE|PLAN)\]|\[(?:FILE_READ|FILE_WRITE|EXECUTE|API_CALL|ANALYZE|GENERATE|DEPLOY|DATABASE|SEARCH|STATUS):[^\]]*\]/g, "")}
                          </div>
                          {buildStreaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 animate-pulse" style={{ background: "#3b82f6" }} />}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground/30 text-sm font-mono">
                          صف تطبيقك وسيقوم OMEGA بكتابة الكود الكامل
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── PLAN TAB ── */}
                {tab === "plan" && (
                  <div className="flex-1 min-h-0 flex flex-col p-3 gap-3">
                    <div className="flex-shrink-0 flex gap-2">
                      <input value={planInput} onChange={e => setPlanInput(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") void runPlan(); }}
                        placeholder="صف المشروع أو المهمة للتخطيط الذكي..."
                        className="flex-1 px-3 py-2 rounded-xl bg-transparent outline-none text-[13px]"
                        style={{ border: "1px solid rgba(99,102,241,0.3)", color: "inherit" }}
                        disabled={planStreaming} />
                      <button onClick={() => void runPlan()} disabled={!planInput.trim() || planStreaming}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[12px] disabled:opacity-30"
                        style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.4)", color: "#6366f1" }}>
                        {planStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitBranch className="w-4 h-4" />}
                        خطط
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 flex gap-3">
                      {/* Plan steps */}
                      {planSteps.length > 0 && (
                        <div className="w-64 flex-shrink-0 space-y-2 overflow-y-auto">
                          {planSteps.map((step, i) => (
                            <motion.div key={step.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="rounded-xl p-3"
                              style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.2)" }}>
                              <div className="flex items-center gap-2 mb-1.5">
                                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black"
                                  style={{ background: "rgba(99,102,241,0.2)", color: "#6366f1" }}>
                                  {step.id}
                                </div>
                                <span className="text-[11px] font-bold text-foreground/80 flex-1">{step.title}</span>
                                <Clock className="w-3 h-3 text-muted-foreground/40" />
                              </div>
                              {step.subtasks.map((sub, j) => (
                                <div key={j} className="flex items-center gap-1.5 text-[10px] text-muted-foreground/50 ml-1">
                                  <ArrowRight className="w-2.5 h-2.5 flex-shrink-0" />{sub}
                                </div>
                              ))}
                            </motion.div>
                          ))}
                        </div>
                      )}

                      {/* Plan raw output */}
                      <div className="flex-1 overflow-y-auto rounded-xl p-3 font-mono text-[12px] text-foreground/70 leading-relaxed whitespace-pre-wrap"
                        style={{ background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.04)" }}>
                        {planOutput || <span className="text-muted-foreground/30">سيظهر هنا الخطة التفصيلية المُولَّدة...</span>}
                        {planStreaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 animate-pulse" style={{ background: "#6366f1" }} />}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── PARALLEL TAB ── */}
                {tab === "parallel" && (
                  <div className="flex-1 min-h-0 flex flex-col p-3 gap-3">
                    <div className="flex-shrink-0 flex gap-2">
                      <input value={parallelTask} onChange={e => setParallelTask(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") void runParallel(); }}
                        placeholder="المهمة التي ستنفذها الوكلاء بشكل متوازٍ..."
                        className="flex-1 px-3 py-2 rounded-xl bg-transparent outline-none text-[13px]"
                        style={{ border: "1px solid rgba(249,115,22,0.3)", color: "inherit" }}
                        disabled={parallelStreaming} />
                      <button onClick={() => void runParallel()} disabled={!parallelTask.trim() || parallelStreaming}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-[12px] disabled:opacity-30"
                        style={{ background: "rgba(249,115,22,0.15)", border: "1px solid rgba(249,115,22,0.4)", color: "#f97316" }}>
                        {parallelStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                        شغّل {parallelAgents.length} وكلاء
                      </button>
                    </div>

                    <div className="flex-1 min-h-0 grid grid-cols-2 gap-3 overflow-y-auto">
                      {parallelAgents.map(agent => (
                        <div key={agent.id} className="flex flex-col rounded-[18px] overflow-hidden min-h-0"
                          style={{ border: `1px solid ${agent.color}30`, background: `${agent.color}08` }}>
                          <div className="flex items-center gap-2 px-3 py-2 flex-shrink-0"
                            style={{ borderBottom: `1px solid ${agent.color}20`, background: `${agent.color}12` }}>
                            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                              style={{ background: `${agent.color}25`, border: `1px solid ${agent.color}40` }}>
                              <Bot className="w-3.5 h-3.5" style={{ color: agent.color }} />
                            </div>
                            <div>
                              <div className="text-[11px] font-black font-mono" style={{ color: agent.color }}>{agent.name}</div>
                              <div className="text-[9px] text-muted-foreground/40">{agent.role}</div>
                            </div>
                            <div className="ml-auto">
                              {agent.status === "running"  && <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: agent.color }} />}
                              {agent.status === "done"     && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                              {agent.status === "error"    && <XCircle className="w-3.5 h-3.5 text-primary" />}
                              {agent.status === "idle"     && <div className="w-2 h-2 rounded-full bg-white/20" />}
                            </div>
                          </div>
                          <div className="flex-1 p-2 overflow-y-auto text-[11px] font-mono text-foreground/65 leading-relaxed whitespace-pre-wrap"
                            style={{ maxHeight: 200 }}>
                            {agent.output || <span className="text-muted-foreground/25">في انتظار المهمة...</span>}
                            {agent.status === "running" && <span className="inline-block w-1 h-3 ml-0.5 animate-pulse" style={{ background: agent.color }} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── MONITOR TAB ── */}
                {tab === "monitor" && (
                  <div className="flex-1 min-h-0 flex flex-col p-3 gap-3">
                    {/* Metrics */}
                    <div className="flex-shrink-0 grid grid-cols-4 gap-2">
                      {[
                        { label: "الوضع", value: mc.label, color: mc.color },
                        { label: "الحالة", value: isAnyStreaming ? "مشغول" : "جاهز", color: isAnyStreaming ? "#f59e0b" : "#22c55e" },
                        { label: "العمليات", value: logs.length.toString(), color: "#3b82f6" },
                        { label: "القدرة", value: CAPABILITIES.find(c => c.id === activeCapability)?.label ?? "", color: "#a855f7" },
                      ].map(m2 => (
                        <div key={m2.label} className="rounded-xl p-3" style={{ background: `${m2.color}0a`, border: `1px solid ${m2.color}25` }}>
                          <div className="text-[9px] text-muted-foreground/40 font-mono uppercase">{m2.label}</div>
                          <div className="text-[12px] font-black mt-0.5 truncate" style={{ color: m2.color }}>{m2.value}</div>
                        </div>
                      ))}
                    </div>
                    {/* Logs */}
                    <div className="flex-1 overflow-y-auto rounded-xl p-3 space-y-1"
                      style={{ background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,255,255,0.04)", fontFamily: "monospace" }}>
                      {logs.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground/25 text-[12px]">لا توجد سجلات بعد</div>
                      ) : (
                        [...logs].reverse().map((log, i) => (
                          <div key={i} className="text-[11px] leading-relaxed" style={{ color: i === 0 ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.3)" }}>
                            <span style={{ color: mc.color + "88" }}>▸ </span>{log}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => setLogs([])} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
                        <Trash2 className="w-3 h-3" /> مسح السجلات
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(logs.join("\n")); toast({ description: "تم نسخ السجلات" }); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }}>
                        <Copy className="w-3 h-3" /> نسخ
                      </button>
                    </div>
                  </div>
                )}

                {/* ── DESIGN TAB ── */}
                {tab === "design" && (
                  <div className="flex-1 min-h-0 flex flex-col p-3 gap-3">
                    <div className="flex-shrink-0 p-3 rounded-xl"
                      style={{ background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.2)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <Palette className="w-4 h-4 text-pink-400" />
                        <span className="text-[12px] font-bold text-pink-400">مولّد التصاميم والعروض</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          "صمم واجهة مستخدم لتطبيق أمني",
                          "أنشئ عرضاً تقديمياً للمشروع",
                          "صمم لوحة تحكم إدارية",
                          "أنشئ نظام هوية بصرية",
                          "صمم موقع ويب احترافي",
                          "أنشئ خرائط تدفق المستخدم",
                        ].map(s => (
                          <button key={s} onClick={() => { setTab("command"); setInput(s); }}
                            className="text-[10px] w-7 h-7 flex items-center justify-center rounded-lg text-left transition-all"
                            style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)", color: "rgba(236,72,153,0.8)" }}>
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Design canvas area */}
                    <div className="flex-1 rounded-xl flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.4)", border: "1px dashed rgba(236,72,153,0.2)" }}>
                      <div className="text-center">
                        <Wand2 className="w-10 h-10 mx-auto mb-3 text-pink-400/40" />
                        <div className="text-[12px] text-muted-foreground/40 font-mono">اختر نوع التصميم من الأعلى</div>
                        <div className="text-[10px] text-muted-foreground/25 mt-1">أو اكتب وصفاً في تبويب COMMAND</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Quick Actions + Stats */}
            <div className="w-48 flex-shrink-0 flex flex-col overflow-y-auto"
              style={{ borderLeft: "1px solid rgba(255,255,255,0.05)", background: "rgba(4,4,8,0.8)" }}>
              <div className="p-3 text-[10px] font-black font-mono uppercase tracking-widest text-muted-foreground/50 border-b border-white/5">
                إجراءات سريعة
              </div>
              <div className="p-2 space-y-1.5 flex-1">
                {[
                  { icon: Globe,     label: "بحث الإنترنت",    action: () => { setTab("command"); setInput("ابحث في الإنترنت عن: "); } },
                  { icon: Database,  label: "استعلام قاعدة بيانات", action: () => { setTab("command"); setInput("اكتب استعلام SQL لـ: "); } },
                  { icon: Shield,    label: "فحص أماني",        action: () => { setTab("command"); setInput("افحص أمان: "); } },
                  { icon: Code,      label: "توليد كود",         action: () => { setTab("command"); setInput("اكتب كود لـ: "); } },
                  { icon: FileText,  label: "تحليل ملف",         action: () => { setTab("command"); setInput("حلل الملف التالي: "); } },
                  { icon: Rocket,    label: "نشر تطبيق",         action: () => { setTab("command"); setInput("انشر تطبيق على: "); } },
                  { icon: GitMerge,  label: "دمج الكود",          action: () => { setTab("command"); setInput("ادمج هذا الكود: "); } },
                  { icon: FlaskConical, label: "اختبار تلقائي",    action: () => { setTab("command"); setInput("اكتب اختبارات تلقائية لـ: "); } },
                  { icon: Eye,       label: "مراقبة النظام",      action: () => { setTab("monitor"); } },
                  { icon: TrendingUp, label: "تحليل الأداء",      action: () => { setTab("command"); setInput("حلل أداء النظام وقدم توصيات: "); } },
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button key={item.label} onClick={item.action}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left transition-all group"
                      style={{ border: "1px solid transparent" }}
                      onMouseEnter={e => { e.currentTarget.style.background = `${mc.color}0d`; e.currentTarget.style.borderColor = `${mc.color}30`; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${mc.color}15` }}>
                        <Icon className="w-3 h-3" style={{ color: mc.color }} />
                      </div>
                      <span className="text-[10px] text-foreground/60 truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Status */}
              <div className="p-3 border-t border-white/5 space-y-2">
                <div className="text-[9px] font-mono text-muted-foreground/30 uppercase tracking-widest">الحالة</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: mc.color }} />
                  <span className="text-[10px] font-mono" style={{ color: mc.color }}>{mc.desc}</span>
                </div>
                <div className="text-[9px] font-mono text-muted-foreground/30">
                  {logs.length} عملية منجزة
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
