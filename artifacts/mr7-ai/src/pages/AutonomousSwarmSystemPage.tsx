/**
 * AutonomousSwarmSystemPage — Full Autonomous Swarm Evolution AI System
 * Based on: Autonomous Swarm Evolution AI System (FULL UNIFIED PROMPT)
 * 4 Layers: Swarm · Self-Improving Loop · Task Queue · Evolution System
 * Primary: GLM-5 (ZAI api.z.ai/v1) → Fallback: GPT-4o → GPT-3.5-turbo
 * AutoGPT-style ON/OFF · Model Switcher · Task Queue Persistence
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Zap, Play, Square, RefreshCw, Network,
  Shield, FlaskConical, Target, Cpu, Bot,
  ToggleLeft, ToggleRight, ChevronDown, Loader2,
  CheckCircle2, XCircle, ListOrdered, Trash2,
  TrendingUp, Dna, Activity, Sparkles, AlertTriangle,
  PlusCircle, Settings2, History,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AgentEvent {
  agent: "orchestrator" | "planner" | "executor" | "critic" | "tester" | "fusion";
  output: string;
  status: "running" | "done" | "error";
  iteration: number;
}

interface TaskQueueItem {
  id: string;
  goal: string;
  status: "pending" | "running" | "done" | "failed";
  model: string;
  created_at: string;
  result_preview?: string;
}

interface EvolutionState {
  generation: number;
  total_tasks_completed: number;
  total_errors_fixed: number;
  current_strategy: string;
  last_improvement_at?: string;
}

interface EvolutionInsight {
  insight: string;
  agent: string;
  impact_score: number;
  created_at?: string;
}

interface MainAgentState {
  enabled: boolean;
  model: string;
  fallbackModel: string;
}

interface GLM5Status {
  glm5Available: boolean;
  provider: string;
  models: string[];
  primaryModel: string;
  fallbackChain: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const AGENT_META: Record<string, { icon: React.ElementType; color: string; label: string; desc: string }> = {
  orchestrator: { icon: Network,      color: "#e21227", label: "Orchestrator", desc: "يدير النظام بالكامل" },
  planner:      { icon: Brain,        color: "#8b5cf6", label: "Planner",      desc: "يضع الخطة التفصيلية" },
  executor:     { icon: Zap,          color: "#22d3ee", label: "Executor",     desc: "ينفذ الكود والحلول" },
  critic:       { icon: Shield,       color: "#f97316", label: "Critic",       desc: "يراجع ويكتشف الأخطاء" },
  tester:       { icon: FlaskConical, color: "#10b981", label: "Tester",       desc: "يختبر ويتحقق" },
  fusion:       { icon: Sparkles,     color: "#fbbf24", label: "Fusion",       desc: "يجمع النتائج النهائية" },
};

const GLM5_MODELS = [
  { id: "glm-5.2",    label: "GLM-5.2 ★",  color: "#06b6d4", primary: true },
  { id: "glm-5.1",    label: "GLM-5.1",     color: "#22d3ee" },
  { id: "glm-5",      label: "GLM-5",       color: "#22d3ee" },
  { id: "glm-4-plus", label: "GLM-4+",      color: "#67e8f9" },
  { id: "gpt-4o",     label: "GPT-4o",      color: "#10b981" },
  { id: "claude-opus-4-5", label: "Claude Opus", color: "#8b5cf6" },
  { id: "gemini-2.5-pro",  label: "Gemini 2.5", color: "#f97316" },
  { id: "deepseek-r1",     label: "DeepSeek R1", color: "#e21227" },
];

interface Props { onClose?: () => void }

export function AutonomousSwarmSystemPage({ onClose }: Props) {
  const [goal, setGoal]               = useState("");
  const [model, setModel]             = useState("glm-5.2");
  const [fallbackModel, setFallback]  = useState("gpt-4o");
  const [iterations, setIterations]   = useState(2);
  const [running, setRunning]         = useState(false);
  const [agents, setAgents]           = useState<AgentEvent[]>([]);
  const [fusion, setFusion]           = useState("");
  const [fusionRunning, setFusionRunning] = useState(false);
  const [evolutionNotes, setEvolutionNotes] = useState<string[]>([]);
  const [modelOpen, setModelOpen]     = useState(false);
  const [tab, setTab]                 = useState<"run" | "queue" | "evolution">("run");

  // Task Queue
  const [taskQueue, setTaskQueue]     = useState<TaskQueueItem[]>([]);
  const [queueGoal, setQueueGoal]     = useState("");
  const [queueLoading, setQueueLoading] = useState(false);

  // Evolution / Insights
  const [evoState, setEvoState]       = useState<EvolutionState | null>(null);
  const [insights, setInsights]       = useState<EvolutionInsight[]>([]);

  // Main Agent state (ON/OFF + model)
  const [mainAgent, setMainAgent]     = useState<MainAgentState>({ enabled: false, model: "glm-5.2", fallbackModel: "gpt-4o" });
  const [agentLoading, setAgentLoading] = useState(false);

  // GLM-5 status
  const [glm5Status, setGlm5Status]   = useState<GLM5Status | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const dropRef  = useRef<HTMLDivElement>(null);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // ── Load initial data ───────────────────────────────────────────────────────
  useEffect(() => {
    authFetch("/api/main-agent/state").then(r => r.json()).then(setMainAgent).catch(() => {});
    authFetch("/api/swarm/glm5-status").then(r => r.json()).then(setGlm5Status).catch(() => {});
    authFetch("/api/swarm/task-queue").then(r => r.json()).then(d => setTaskQueue(d.tasks ?? [])).catch(() => {});
    authFetch("/api/swarm/evolution-state").then(r => r.json()).then(d => {
      if (d.state) setEvoState(d.state);
      if (d.topInsights) setInsights(d.topInsights);
    }).catch(() => {});
  }, []);

  // ── Close dropdown on outside click ────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setModelOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ── Auto-scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    eventsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agents, fusion]);

  // ── Toggle Main Agent ON/OFF ────────────────────────────────────────────────
  const toggleMainAgent = useCallback(async () => {
    setAgentLoading(true);
    try {
      const res = await authFetch("/api/main-agent/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !mainAgent.enabled, model }),
      });
      const d = await res.json();
      setMainAgent(d);
    } catch { /* non-fatal */ }
    setAgentLoading(false);
  }, [mainAgent.enabled, model]);

  // ── Run Autonomous System ───────────────────────────────────────────────────
  const runAutonomous = useCallback(async () => {
    if (!goal.trim() || running) return;
    setRunning(true);
    setAgents([]);
    setFusion("");
    setFusionRunning(false);
    setEvolutionNotes([]);

    abortRef.current = new AbortController();

    try {
      const res = await authFetch("/api/swarm/autonomous", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal, model, fallbackModel, maxIterations: iterations, agentMode: mainAgent.enabled }),
        signal: abortRef.current.signal,
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE blocks are separated by double newline
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() ?? "";

        for (const block of blocks) {
          if (!block.trim()) continue;
          const blockLines = block.split("\n");
          const evtTypeLine = blockLines.find(l => l.startsWith("event:"));
          const dataLine = blockLines.find(l => l.startsWith("data:"));
          if (!dataLine) continue;
          const evtType = evtTypeLine?.slice(6).trim() ?? "";
          try {
            const evt = JSON.parse(dataLine.slice(5).trim());

            if (evtType === "agent_done" && evt.agent && evt.output) {
              setAgents(prev => {
                const idx = prev.findIndex(a => a.agent === evt.agent && a.iteration === evt.iteration);
                const next: AgentEvent = { agent: evt.agent, output: evt.output, status: "done", iteration: evt.iteration ?? 1 };
                if (idx >= 0) { const arr = [...prev]; arr[idx] = next; return arr; }
                return [...prev, next];
              });
            }
            if (evtType === "agent_start") {
              setAgents(prev => [...prev, { agent: evt.agent, output: "", status: "running", iteration: evt.iteration ?? 1 }]);
            }
            if (evtType === "evolution_note") {
              setEvolutionNotes(prev => [...prev, evt.note]);
            }
            if (evtType === "fusion_start") setFusionRunning(true);
            if (evtType === "fusion_done") { setFusion(evt.result ?? ""); setFusionRunning(false); }
          } catch { /* skip malformed event */ }
        }
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        setAgents(prev => [...prev, { agent: "orchestrator", output: `خطأ: ${e?.message ?? "Unknown"}`, status: "error", iteration: 0 }]);
      }
    } finally {
      setRunning(false);
      // Refresh evolution state
      authFetch("/api/swarm/evolution-state").then(r => r.json()).then(d => {
        if (d.state) setEvoState(d.state);
        if (d.topInsights) setInsights(d.topInsights);
      }).catch(() => {});
      authFetch("/api/swarm/task-queue").then(r => r.json()).then(d => setTaskQueue(d.tasks ?? [])).catch(() => {});
    }
  }, [goal, model, fallbackModel, iterations, mainAgent.enabled, running]);

  // ── Add to Task Queue ──────────────────────────────────────────────────────
  const addToQueue = useCallback(async () => {
    if (!queueGoal.trim()) return;
    setQueueLoading(true);
    try {
      await authFetch("/api/swarm/task-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: queueGoal, model, fallbackModel }),
      });
      setQueueGoal("");
      const res = await authFetch("/api/swarm/task-queue");
      const d = await res.json();
      setTaskQueue(d.tasks ?? []);
    } catch { /* non-fatal */ }
    setQueueLoading(false);
  }, [queueGoal, model, fallbackModel]);

  // ── Remove from Task Queue ─────────────────────────────────────────────────
  const removeFromQueue = useCallback(async (id: string) => {
    try {
      await authFetch(`/api/swarm/task-queue/${id}`, { method: "DELETE" });
      setTaskQueue(prev => prev.filter(t => t.id !== id));
    } catch { /* non-fatal */ }
  }, []);

  const currentModel = GLM5_MODELS.find(m => m.id === model);

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-black text-white overflow-hidden select-none" style={{ fontFamily: "monospace" }}>

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 bg-black/80 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#06b6d4]/30 to-[#8b5cf6]/30 border border-[#06b6d4]/30 flex items-center justify-center">
            <Dna className="w-4 h-4 text-[#06b6d4]" />
          </div>
          <div>
            <div className="text-sm font-black tracking-widest text-white">AUTONOMOUS SWARM EVOLUTION</div>
            <div className="text-[10px] text-white/40 tracking-wider">AI Engineering Team · Self-Evolving · GLM-5 Primary</div>
          </div>
        </div>

        {/* GLM-5 status pill */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
          glm5Status?.glm5Available
            ? "bg-[#06b6d4]/10 border-[#06b6d4]/25 text-[#06b6d4]"
            : "bg-white/5 border-white/10 text-white/30"
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${glm5Status?.glm5Available ? "bg-[#06b6d4] animate-pulse" : "bg-white/20"}`} />
          {glm5Status?.glm5Available ? "GLM-5 ONLINE" : "GLM-5 OFFLINE"}
        </div>
      </div>

      {/* ── CONTROL BAR ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/5 bg-black/60 shrink-0 flex-wrap">

        {/* Main Agent ON/OFF */}
        <button
          onClick={toggleMainAgent}
          disabled={agentLoading}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border transition-all ${
            mainAgent.enabled
              ? "bg-[#e21227]/15 text-[#e21227] border-[#e21227]/30 hover:bg-[#e21227]/25"
              : "bg-white/5 text-white/40 border-white/10 hover:bg-white/10"
          }`}
          title={mainAgent.enabled ? "Agent ON — انقر للإيقاف" : "Agent OFF — انقر للتفعيل"}
        >
          {agentLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : mainAgent.enabled ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
          <Bot className="w-3 h-3" />
          <span>AGENT {mainAgent.enabled ? "ON" : "OFF"}</span>
        </button>

        {/* Model selector */}
        <div className="relative" ref={dropRef}>
          <button
            onClick={() => setModelOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 border border-white/10 hover:border-white/20 text-xs transition"
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentModel?.color ?? "#6b7280" }} />
            <span className="text-white/70">{currentModel?.label ?? model}</span>
            <ChevronDown className={`w-3 h-3 text-white/30 transition-transform ${modelOpen ? "rotate-180" : ""}`} />
          </button>
          <AnimatePresence>
            {modelOpen && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 mt-1 w-48 z-50 rounded-[18px] border border-white/10 bg-black/95 shadow-2xl overflow-hidden"
              >
                {GLM5_MODELS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { setModel(m.id); setModelOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <span className={model === m.id ? "text-white font-bold" : "text-white/55"}>{m.label}</span>
                    {(m as any).primary && <span className="ml-auto text-[9px] text-[#06b6d4] font-bold">PRIMARY</span>}
                    {model === m.id && <CheckCircle2 className="w-3 h-3 ml-auto text-[#e21227]" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Iterations */}
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          <RefreshCw className="w-3 h-3" />
          <select
            value={iterations}
            onChange={e => setIterations(Number(e.target.value))}
            className="bg-black/50 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white/70 outline-none"
          >
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} iteration{n>1?"s":""}</option>)}
          </select>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 ml-auto">
          {(["run", "queue", "evolution"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition ${
                tab === t ? "bg-white/10 text-white border border-white/15" : "text-white/30 hover:text-white/60"
              }`}
            >
              {t === "run" ? "⚡ Run" : t === "queue" ? "📦 Queue" : "🧬 Evolution"}
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex flex-col min-h-0">

        {/* ── TAB: RUN ──────────────────────────────────────────────────────── */}
        {tab === "run" && (
          <div className="flex flex-col h-full min-h-0">
            {/* Goal input */}
            <div className="px-4 py-3 border-b border-white/5 shrink-0">
              <div className="flex gap-2">
                <input
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !running) runAutonomous(); }}
                  placeholder="أدخل هدفك... (مثال: ابنِ REST API لإدارة المهام بـ Node.js + PostgreSQL)"
                  className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#06b6d4]/40 transition"
                  disabled={running}
                />
                {running ? (
                  <button
                    onClick={() => { abortRef.current?.abort(); setRunning(false); }}
                    className="px-4 py-2.5 rounded-xl bg-[#e21227]/15 text-[#e21227] border border-[#e21227]/30 text-xs font-bold hover:bg-[#e21227]/25 transition flex items-center gap-1.5"
                  >
                    <Square className="w-3.5 h-3.5" /> STOP
                  </button>
                ) : (
                  <button
                    onClick={runAutonomous}
                    disabled={!goal.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/30 text-xs font-bold hover:bg-[#06b6d4]/25 transition flex items-center gap-1.5 disabled:opacity-30"
                  >
                    <Play className="w-3.5 h-3.5" /> RUN
                  </button>
                )}
              </div>
              {/* Fallback indicator */}
              <div className="mt-1.5 text-[10px] text-white/25 px-1">
                Fallback chain: <span className="text-[#06b6d4]/60">{model}</span> → <span className="text-[#10b981]/60">{fallbackModel}</span> → <span className="text-white/30">gpt-3.5-turbo</span>
              </div>
            </div>

            {/* Agent outputs */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
              {agents.length === 0 && !running && !fusion && (
                <div className="flex flex-col items-center justify-center h-full text-center py-12 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-[#06b6d4]/10 border border-[#06b6d4]/20 flex items-center justify-center">
                    <Dna className="w-8 h-8 text-[#06b6d4]/50" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-white/40">Autonomous Swarm System</div>
                    <div className="text-[11px] text-white/20 mt-1">أدخل هدفك وسيقوم الفريق بالتخطيط والتنفيذ تلقائياً</div>
                  </div>
                  {/* 4-layer architecture display */}
                  <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-sm">
                    {[
                      { icon: "🤖", label: "Swarm Agents", desc: "5 وكلاء متخصصين" },
                      { icon: "🔁", label: "Self-Improving", desc: "حلقة تحسين مستمر" },
                      { icon: "📦", label: "Task Queue", desc: "قائمة مهام منظمة" },
                      { icon: "🧬", label: "Evolution", desc: "نظام تطوري حي" },
                    ].map(layer => (
                      <div key={layer.label} className="px-3 py-2 rounded-lg bg-white/3 border border-white/6 text-left">
                        <div className="text-sm">{layer.icon}</div>
                        <div className="text-[10px] font-bold text-white/60 mt-0.5">{layer.label}</div>
                        <div className="text-[9px] text-white/25">{layer.desc}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agent cards */}
              <AnimatePresence>
                {agents.map((a, i) => {
                  const meta = AGENT_META[a.agent] ?? AGENT_META.orchestrator;
                  const Icon = meta.icon;
                  return (
                    <motion.div
                      key={`${a.agent}-${a.iteration}-${i}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl border p-3 ${
                        a.status === "running"
                          ? "border-white/10 bg-white/3"
                          : a.status === "error"
                          ? "border-[#e21227]/20 bg-[#e21227]/5"
                          : "border-white/8 bg-white/[0.02]"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: `${meta.color}20`, border: `1px solid ${meta.color}40` }}
                        >
                          <Icon className="w-2.5 h-2.5" style={{ color: meta.color }} />
                        </div>
                        <span className="text-[10px] font-black tracking-wider" style={{ color: meta.color }}>
                          {meta.label.toUpperCase()}
                        </span>
                        <span className="text-[9px] text-white/30">iter {a.iteration}</span>
                        <div className="ml-auto">
                          {a.status === "running" ? (
                            <Loader2 className="w-3 h-3 animate-spin text-white/30" />
                          ) : a.status === "done" ? (
                            <CheckCircle2 className="w-3 h-3 text-[#10b981]" />
                          ) : (
                            <XCircle className="w-3 h-3 text-[#e21227]" />
                          )}
                        </div>
                      </div>
                      {a.output && (
                        <div className="text-[11px] text-white/70 leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                          {a.output}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Evolution notes */}
              {evolutionNotes.length > 0 && (
                <div className="rounded-xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/5 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-3 h-3 text-[#8b5cf6]" />
                    <span className="text-[10px] font-black text-[#8b5cf6] tracking-wider">EVOLUTION NOTES</span>
                  </div>
                  {evolutionNotes.map((n, i) => (
                    <div key={i} className="text-[10px] text-white/50 py-0.5 border-b border-white/5 last:border-0">{n}</div>
                  ))}
                </div>
              )}

              {/* Fusion result */}
              {(fusionRunning || fusion) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="rounded-xl border border-[#fbbf24]/25 bg-[#fbbf24]/5 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-[#fbbf24]" />
                    <span className="text-xs font-black text-[#fbbf24] tracking-wider">FINAL FUSION — النتيجة النهائية</span>
                    {fusionRunning && <Loader2 className="w-3 h-3 animate-spin text-[#fbbf24] ml-auto" />}
                  </div>
                  {fusion && (
                    <div className="text-[12px] text-white/80 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                      {fusion}
                    </div>
                  )}
                </motion.div>
              )}

              <div ref={eventsEndRef} />
            </div>
          </div>
        )}

        {/* ── TAB: QUEUE ────────────────────────────────────────────────────── */}
        {tab === "queue" && (
          <div className="flex flex-col h-full min-h-0 p-4 gap-3">
            {/* Add to queue */}
            <div className="flex gap-2 shrink-0">
              <input
                value={queueGoal}
                onChange={e => setQueueGoal(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addToQueue(); }}
                placeholder="أضف مهمة جديدة لقائمة الانتظار..."
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/25 outline-none focus:border-[#06b6d4]/40 transition"
              />
              <button
                onClick={addToQueue}
                disabled={!queueGoal.trim() || queueLoading}
                className="px-4 py-2.5 rounded-xl bg-[#06b6d4]/15 text-[#06b6d4] border border-[#06b6d4]/30 text-xs font-bold hover:bg-[#06b6d4]/25 transition flex items-center gap-1.5 disabled:opacity-30"
              >
                {queueLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                ADD
              </button>
            </div>

            {/* Queue list */}
            <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
              {taskQueue.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-12 text-center gap-3">
                  <ListOrdered className="w-10 h-10 text-white/10" />
                  <div className="text-sm text-white/30">قائمة المهام فارغة</div>
                  <div className="text-[11px] text-white/15">أضف مهام للتنفيذ التلقائي</div>
                </div>
              ) : (
                taskQueue.map(task => (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-3 px-3 py-2.5 rounded-xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.04] transition"
                  >
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      task.status === "done" ? "bg-[#10b981]" :
                      task.status === "running" ? "bg-[#06b6d4] animate-pulse" :
                      task.status === "failed" ? "bg-[#e21227]" :
                      "bg-white/20"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white/70 truncate">{task.goal}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] text-white/25">{task.model}</span>
                        <span className={`text-[9px] font-bold uppercase ${
                          task.status === "done" ? "text-[#10b981]" :
                          task.status === "running" ? "text-[#06b6d4]" :
                          task.status === "failed" ? "text-[#e21227]" :
                          "text-white/30"
                        }`}>{task.status}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeFromQueue(task.id)}
                      className="text-white/20 hover:text-[#e21227] transition shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB: EVOLUTION ────────────────────────────────────────────────── */}
        {tab === "evolution" && (
          <div className="flex flex-col h-full min-h-0 p-4 gap-4 overflow-y-auto">
            {/* System state */}
            {evoState && (
              <div className="grid grid-cols-2 gap-2 shrink-0">
                {[
                  { label: "Generation", value: evoState.generation, icon: Dna, color: "#8b5cf6" },
                  { label: "Tasks Done", value: evoState.total_tasks_completed, icon: CheckCircle2, color: "#10b981" },
                  { label: "Errors Fixed", value: evoState.total_errors_fixed, icon: Shield, color: "#f97316" },
                  { label: "Strategy", value: evoState.current_strategy, icon: Activity, color: "#06b6d4" },
                ].map(stat => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="px-3 py-2.5 rounded-xl border border-white/8 bg-white/[0.02]">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Icon className="w-3 h-3" style={{ color: stat.color }} />
                        <span className="text-[10px] text-white/40 uppercase tracking-wider">{stat.label}</span>
                      </div>
                      <div className="text-lg font-black" style={{ color: stat.color }}>{stat.value}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* GLM-5 info */}
            {glm5Status && (
              <div className="rounded-xl border border-[#06b6d4]/20 bg-[#06b6d4]/5 p-3 shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <Cpu className="w-4 h-4 text-[#06b6d4]" />
                  <span className="text-xs font-black text-[#06b6d4] tracking-wider">GLM-5 / ZAI Integration</span>
                  <div className={`ml-auto w-2 h-2 rounded-full ${glm5Status.glm5Available ? "bg-[#10b981] animate-pulse" : "bg-[#e21227]"}`} />
                </div>
                <div className="text-[11px] text-white/50 space-y-1">
                  <div>Provider: <span className="text-[#06b6d4]/80">{glm5Status.provider}</span></div>
                  <div>Endpoint: <span className="text-white/40">api.z.ai/v1</span></div>
                  <div>Fallback: <span className="text-white/40">{glm5Status.fallbackChain.join(" → ")}</span></div>
                  <div>Models: <span className="text-[#06b6d4]/60">{glm5Status.models.join(", ")}</span></div>
                </div>
                {!glm5Status.glm5Available && (
                  <div className="mt-2 px-2 py-1.5 rounded-lg bg-[#fbbf24]/10 border border-[#fbbf24]/20 text-[10px] text-[#fbbf24]">
                    ⚠️ لتفعيل GLM-5، أضف مفتاح <code>ZAI_API_KEY</code> من api.z.ai أو <code>ZHIPU_API_KEY</code> من open.bigmodel.cn
                  </div>
                )}
              </div>
            )}

            {/* Top evolution insights */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-[#8b5cf6]" />
                <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">Top Evolution Insights</span>
              </div>
              {insights.length === 0 ? (
                <div className="text-[11px] text-white/25 text-center py-6">لا توجد insights بعد — قم بتشغيل النظام أولاً</div>
              ) : (
                <div className="space-y-2">
                  {insights.map((ins, i) => (
                    <div key={i} className="px-3 py-2 rounded-lg border border-white/6 bg-white/[0.02]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-bold text-[#8b5cf6] uppercase">{ins.agent}</span>
                        <div className="ml-auto flex items-center gap-1">
                          {Array.from({ length: Math.round(ins.impact_score / 2) }).map((_, j) => (
                            <div key={j} className="w-1 h-1 rounded-full bg-[#fbbf24]" />
                          ))}
                          <span className="text-[9px] text-[#fbbf24] ml-1">{ins.impact_score}</span>
                        </div>
                      </div>
                      <div className="text-[11px] text-white/55 leading-relaxed">{ins.insight}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
