/**
 * SwarmEvolutionPage — Autonomous Swarm Evolution AI System
 * Orchestrator · Planner · Executor · Critic · Tester
 * Full SSE streaming · Model switcher · ON/OFF · Evolution loop
 * Self-Improve · Task Queue · Continuous Mode · Evolution Insights
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Zap, Play, Square, RefreshCw, ChevronDown,
  Cpu, Shield, FlaskConical, Target, Network,
  ToggleLeft, ToggleRight, Settings2, History,
  CheckCircle2, XCircle, Loader2, Sparkles, Bot,
  TrendingUp, AlertTriangle, Dna, Activity,
  ListOrdered, PlusCircle, Trash2, Repeat, Star,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

// ── Types ────────────────────────────────────────────────────────────────────
interface AgentOutput {
  agentId: string;
  name: string;
  output: string;
  status: "idle" | "running" | "done" | "error";
}

interface SwarmModel {
  id: string;
  name: string;
  provider: string;
  tier: string;
}

interface SwarmRun {
  taskId: string;
  goal: string;
  status: "running" | "done" | "error";
  iteration: number;
  agents: AgentOutput[];
  fusion: string;
  fusionRunning: boolean;
}

interface MainAgentState {
  enabled: boolean;
  model: string;
  fallbackModel: string;
}

interface EvolutionInsight {
  insight: string;
  agent: string;
  impact_score: number;
  created_at?: string;
}

interface TaskQueueItem {
  id: string;
  goal: string;
  status: "pending" | "running" | "done" | "error";
}

// ── Agent meta ───────────────────────────────────────────────────────────────
const AGENT_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  orchestrator: { icon: Network,      color: "#e21227", label: "Orchestrator" },
  planner:      { icon: Brain,        color: "#8b5cf6", label: "Planner" },
  executor:     { icon: Zap,          color: "#22d3ee", label: "Executor" },
  critic:       { icon: Shield,       color: "#f97316", label: "Critic" },
  tester:       { icon: FlaskConical, color: "#10b981", label: "Tester" },
};

const TIER_COLORS: Record<string, string> = {
  flagship:  "#e21227",
  advanced:  "#8b5cf6",
  fast:      "#22d3ee",
  reasoning: "#f97316",
  standard:  "#6b7280",
};

interface Props { onClose?: () => void }

export function SwarmEvolutionPage({ onClose }: Props) {
  const [goal, setGoal]             = useState("");
  const [model, setModel]           = useState("gpt-4o");
  const [iterations, setIterations] = useState(1);
  const [continuousMode, setContinuousMode] = useState(false);
  const [run, setRun]               = useState<SwarmRun | null>(null);
  const [models, setModels]         = useState<SwarmModel[]>([]);
  const [modelOpen, setModelOpen]   = useState(false);
  const [history, setHistory]       = useState<Array<{ id: string; goal: string; status: string; created_at: string }>>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mainAgent, setMainAgent]   = useState<MainAgentState>({ enabled: false, model: "gpt-4o", fallbackModel: "gpt-3.5-turbo" });
  const [mainAgentLoading, setMainAgentLoading] = useState(false);

  // Self-Improve state
  const [selfImproving, setSelfImproving]     = useState(false);
  const [selfImproveRecs, setSelfImproveRecs] = useState<string[]>([]);
  const [selfImproveDone, setSelfImproveDone] = useState(false);

  // Evolution insights from DB
  const [evolutionInsights, setEvolutionInsights] = useState<EvolutionInsight[]>([]);
  const [insightsOpen, setInsightsOpen]            = useState(false);

  // Task queue
  const [taskQueue, setTaskQueue]         = useState<TaskQueueItem[]>([]);
  const [taskInput, setTaskInput]         = useState("");
  const [taskQueueOpen, setTaskQueueOpen] = useState(false);
  const [processingQueue, setProcessingQueue] = useState(false);

  // ZAI / GLM provider status
  const [zaiProvider, setZaiProvider] = useState<"zai" | "zhipu" | "none">("none");

  const abortRef = useRef<AbortController | null>(null);

  // ── Load models + agent state + history + evolution insights ──────────────
  useEffect(() => {
    authFetch("/api/swarm/models")
      .then(r => r.json())
      .then(d => { if (d.models) { setModels(d.models); detectZai(d.models); } })
      .catch(() => {});
    authFetch("/api/main-agent/state").then(r => r.json()).then(d => setMainAgent(d)).catch(() => {});
    authFetch("/api/swarm/tasks").then(r => r.json()).then(d => { if (d.tasks) setHistory(d.tasks); }).catch(() => {});
    authFetch("/api/agent-memory/evolution/insights")
      .then(r => r.json())
      .then(d => { if (d.insights) setEvolutionInsights(d.insights.slice(0, 8)); })
      .catch(() => {});
  }, []);

  function detectZai(modelList: SwarmModel[]) {
    const hasZai   = modelList.some(m => m.provider === "glm");
    const hasZhipu = modelList.some(m => m.provider === "zhipu");
    setZaiProvider(hasZai ? "zai" : hasZhipu ? "zhipu" : "none");
  }

  // ── Toggle Main Agent ON/OFF ───────────────────────────────────────────────
  const toggleMainAgent = useCallback(async () => {
    setMainAgentLoading(true);
    try {
      const res = await authFetch("/api/main-agent/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !mainAgent.enabled }),
      });
      const d = await res.json();
      setMainAgent(d);
    } catch { /* non-fatal */ }
    finally { setMainAgentLoading(false); }
  }, [mainAgent.enabled]);

  // ── Update main agent model ───────────────────────────────────────────────
  const setMainAgentModel = useCallback(async (m: string) => {
    try {
      const res = await authFetch("/api/main-agent/state", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: m }),
      });
      const d = await res.json();
      setMainAgent(d);
    } catch { /* non-fatal */ }
  }, []);

  // ── Self-Improve — calls /api/swarm/self-improve after a run ─────────────
  const selfImprove = useCallback(async () => {
    if (!run || run.status !== "done") return;
    setSelfImproving(true);
    setSelfImproveRecs([]);
    setSelfImproveDone(false);

    try {
      const resp = await authFetch("/api/swarm/self-improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: run.taskId || undefined,
          goal: run.goal,
          agentOutputs: Object.fromEntries(run.agents.map(a => [a.agentId, a.output])),
          evolutionNotes: [],
          model,
        }),
      });

      if (!resp.body) return;
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            if (Array.isArray(evt.recommendations)) setSelfImproveRecs(evt.recommendations);
          } catch { /* ignore */ }
        }
      }
      setSelfImproveDone(true);

      // Reload evolution insights from DB
      authFetch("/api/agent-memory/evolution/insights")
        .then(r => r.json())
        .then(d => { if (d.insights) setEvolutionInsights(d.insights.slice(0, 8)); })
        .catch(() => {});
    } catch { /* non-fatal */ }
    finally { setSelfImproving(false); }
  }, [run, model]);

  // ── Start swarm run ───────────────────────────────────────────────────────
  const startRun = useCallback(async (goalOverride?: string) => {
    const targetGoal = (goalOverride ?? goal).trim();
    if (!targetGoal || run?.status === "running") return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSelfImproveRecs([]);
    setSelfImproveDone(false);

    const effectiveIterations = continuousMode ? 3 : iterations;

    const initAgents: AgentOutput[] = Object.keys(AGENT_META).map(id => ({
      agentId: id,
      name: AGENT_META[id].label,
      output: "",
      status: "idle",
    }));

    setRun({
      taskId: "",
      goal: targetGoal,
      status: "running",
      iteration: 0,
      agents: initAgents,
      fusion: "",
      fusionRunning: false,
    });

    try {
      const res = await authFetch("/api/swarm/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: targetGoal, model, maxIterations: effectiveIterations }),
        signal: ctrl.signal,
      });

      if (!res.body) throw new Error("No stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          try {
            const evt = JSON.parse(line.slice(5).trim());
            handleSSEEvent(evt);
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setRun(r => r ? { ...r, status: "error" } : r);
      }
    }
  }, [goal, model, iterations, continuousMode, run]);

  const handleSSEEvent = useCallback((evt: any) => {
    if (!evt) return;
    setRun(prev => {
      if (!prev) return prev;
      if (evt.taskId && !prev.taskId) return { ...prev, taskId: evt.taskId };
      if (evt.agent !== undefined && evt.name !== undefined) {
        if (evt.outputLen !== undefined) {
          return { ...prev, agents: prev.agents.map(a => a.agentId === evt.agent ? { ...a, status: "done" } : a) };
        }
        if (evt.chunk !== undefined) {
          return { ...prev, agents: prev.agents.map(a => a.agentId === evt.agent ? { ...a, status: "running", output: a.output + evt.chunk } : a) };
        }
        if (evt.outputLen === undefined && evt.chunk === undefined) {
          return { ...prev, agents: prev.agents.map(a => a.agentId === evt.agent ? { ...a, status: "running" } : a) };
        }
      }
      if (evt.iteration !== undefined && evt.of === undefined) {
        return { ...prev, iteration: evt.iteration };
      }
      if (evt.chunk !== undefined && evt.agent === undefined) {
        return { ...prev, fusion: prev.fusion + evt.chunk, fusionRunning: true };
      }
      if (evt.result !== undefined) {
        return { ...prev, status: "done", fusionRunning: false };
      }
      if (evt.message !== undefined && prev.status === "running") {
        return { ...prev, status: "error" };
      }
      return prev;
    });
  }, []);

  const stopRun = useCallback(() => {
    abortRef.current?.abort();
    setRun(r => r ? { ...r, status: "error" } : r);
  }, []);

  // ── Task Queue processing ─────────────────────────────────────────────────
  const addToQueue = useCallback(() => {
    if (!taskInput.trim()) return;
    setTaskQueue(prev => [...prev, { id: `tq-${Date.now()}`, goal: taskInput.trim(), status: "pending" }]);
    setTaskInput("");
  }, [taskInput]);

  const runQueue = useCallback(async () => {
    if (processingQueue) return;
    setProcessingQueue(true);
    const pending = taskQueue.filter(t => t.status === "pending");
    for (const task of pending) {
      setTaskQueue(prev => prev.map(t => t.id === task.id ? { ...t, status: "running" } : t));
      setGoal(task.goal);
      await startRun(task.goal);
      setTaskQueue(prev => prev.map(t => t.id === task.id ? { ...t, status: "done" } : t));
      await new Promise(r => setTimeout(r, 1500));
    }
    setProcessingQueue(false);
  }, [taskQueue, processingQueue, startRun]);

  const removeFromQueue = useCallback((id: string) => {
    setTaskQueue(prev => prev.filter(t => t.id !== id));
  }, []);

  const selectedModel = models.find(m => m.id === model);

  return (
    <div className="flex flex-col h-full bg-black/95 text-white overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#e21227] to-[#8b5cf6] flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-wide text-white">SWARM EVOLUTION AI</div>
            <div className="text-[10px] text-white/40 uppercase tracking-widest">Autonomous Multi-Agent System</div>
          </div>
        </div>

        <div className="flex-1" />

        {/* ZAI/GLM-5 status badge */}
        {zaiProvider !== "none" && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
            zaiProvider === "zai"
              ? "bg-[#06b6d4]/10 text-[#06b6d4] border-[#06b6d4]/30"
              : "bg-[#8b5cf6]/10 text-[#8b5cf6] border-[#8b5cf6]/30"
          }`}>
            <Dna className="w-3 h-3" />
            {zaiProvider === "zai" ? "ZAI GLM-5" : "Zhipu GLM"}
          </div>
        )}

        {/* Continuous mode badge */}
        {continuousMode && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#f97316]/10 text-[#f97316] border border-[#f97316]/30">
            <Repeat className="w-3 h-3" />
            Continuous
          </div>
        )}

        {/* Evolution insights button */}
        <button
          onClick={() => setInsightsOpen(o => !o)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition text-xs ${
            insightsOpen ? "bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30" : "bg-white/5 hover:bg-white/10 text-white/60"
          }`}
        >
          <Dna className="w-3.5 h-3.5" />
          رؤى التطور
          {evolutionInsights.length > 0 && (
            <span className="bg-[#8b5cf6] text-white rounded-full px-1.5 py-0.5 text-[9px]">{evolutionInsights.length}</span>
          )}
        </button>

        {/* Task queue button */}
        <button
          onClick={() => setTaskQueueOpen(o => !o)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition text-xs ${
            taskQueueOpen ? "bg-[#22d3ee]/20 text-[#22d3ee] border border-[#22d3ee]/30" : "bg-white/5 hover:bg-white/10 text-white/60"
          }`}
        >
          <ListOrdered className="w-3.5 h-3.5" />
          قائمة المهام
          {taskQueue.filter(t => t.status === "pending").length > 0 && (
            <span className="bg-[#22d3ee] text-black rounded-full px-1.5 py-0.5 text-[9px]">
              {taskQueue.filter(t => t.status === "pending").length}
            </span>
          )}
        </button>

        {/* History button */}
        <button
          onClick={() => setHistoryOpen(h => !h)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition text-xs text-white/60"
        >
          <History className="w-3.5 h-3.5" />
          السجل
        </button>

        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white transition p-1">✕</button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel ─────────────────────────────────────────────────── */}
        <div className="w-80 shrink-0 border-r border-white/10 flex flex-col overflow-y-auto p-4 gap-4">

          {/* Main Agent Control */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#e21227]" />
                <span className="text-sm font-semibold">Main AI Agent</span>
              </div>
              <button
                onClick={toggleMainAgent}
                disabled={mainAgentLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  mainAgent.enabled
                    ? "bg-[#e21227]/20 text-[#e21227] border border-[#e21227]/40 hover:bg-[#e21227]/30"
                    : "bg-white/5 text-white/50 border border-white/10 hover:bg-white/10"
                }`}
              >
                {mainAgentLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : mainAgent.enabled ? (
                  <><ToggleRight className="w-3.5 h-3.5" /> ON</>
                ) : (
                  <><ToggleLeft className="w-3.5 h-3.5" /> OFF</>
                )}
              </button>
            </div>
            <div className={`text-[10px] px-3 py-2 rounded-lg ${mainAgent.enabled ? "bg-[#e21227]/10 text-[#e21227]/80 border border-[#e21227]/20" : "bg-white/5 text-white/40"}`}>
              {mainAgent.enabled
                ? "تخطيط تلقائي · تنفيذ أدوات · ذاكرة متطورة · إصلاح تلقائي"
                : "وضع المساعد العادي — ردود مباشرة فقط"}
            </div>
          </div>

          {/* Model Switcher */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 className="w-4 h-4 text-[#8b5cf6]" />
              <span className="text-sm font-semibold">النموذج الرئيسي</span>
            </div>
            <div className="relative">
              <button
                onClick={() => setModelOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-black/40 border border-white/10 hover:border-white/20 transition text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: TIER_COLORS[selectedModel?.tier ?? "standard"] }}
                  />
                  <span className="text-white/80 text-xs">{selectedModel?.name ?? model}</span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform ${modelOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {modelOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.97 }}
                    className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-white/10 bg-black/95 shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
                  >
                    {Object.entries(
                      models.reduce<Record<string, SwarmModel[]>>((acc, m) => {
                        const p = m.provider;
                        if (!acc[p]) acc[p] = [];
                        acc[p].push(m);
                        return acc;
                      }, {})
                    ).map(([provider, provModels]) => (
                      <div key={provider}>
                        <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-white/30 bg-white/5">
                          {provider}
                        </div>
                        {provModels.map(m => (
                          <button
                            key={m.id}
                            onClick={() => { setModel(m.id); setModelOpen(false); }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-white/5 transition text-left ${model === m.id ? "bg-white/5 text-white" : "text-white/60"}`}
                          >
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TIER_COLORS[m.tier] }} />
                            <span>{m.name}</span>
                            {model === m.id && <CheckCircle2 className="w-3 h-3 ml-auto text-[#e21227]" />}
                          </button>
                        ))}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {model !== mainAgent.model && (
              <button
                onClick={() => setMainAgentModel(model)}
                className="mt-2 w-full text-[10px] text-[#8b5cf6]/70 hover:text-[#8b5cf6] transition text-center py-1"
              >
                تطبيق هذا النموذج على Main Agent →
              </button>
            )}
          </div>

          {/* Iterations + Continuous Mode */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="w-4 h-4 text-[#22d3ee]" />
              <span className="text-sm font-semibold">دورات التطوير</span>
            </div>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => { setIterations(n); setContinuousMode(false); }}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${
                    !continuousMode && iterations === n
                      ? "bg-[#22d3ee]/20 text-[#22d3ee] border border-[#22d3ee]/40"
                      : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
                  }`}
                >
                  {n}×
                </button>
              ))}
            </div>
            {/* Continuous Mode Toggle */}
            <button
              onClick={() => setContinuousMode(p => !p)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition border ${
                continuousMode
                  ? "bg-[#f97316]/15 text-[#f97316] border-[#f97316]/30"
                  : "bg-white/5 text-white/40 border-white/10 hover:bg-white/8"
              }`}
            >
              <div className="flex items-center gap-2">
                <Repeat className="w-3 h-3" />
                <span className="font-medium">Continuous Loop Mode</span>
              </div>
              {continuousMode
                ? <ToggleRight className="w-4 h-4" />
                : <ToggleLeft className="w-4 h-4" />
              }
            </button>
            <div className="mt-1.5 text-[10px] text-white/25 text-center">
              {continuousMode
                ? "يعمل 3 دورات تلقائياً ويحسّن نفسه"
                : iterations === 1 ? "تشغيل واحد" : iterations === 2 ? "تكرار مرتين" : "تكرار 3 مرات"}
            </div>
          </div>

          {/* Agent Status */}
          {run && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="text-[10px] uppercase tracking-widest text-white/40 mb-3">حالة الوكلاء</div>
              <div className="space-y-2">
                {run.agents.map(agent => {
                  const meta = AGENT_META[agent.agentId];
                  if (!meta) return null;
                  const Icon = meta.icon;
                  return (
                    <div key={agent.agentId} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ backgroundColor: meta.color + "20" }}>
                        <Icon {...{ className: "w-3 h-3", style: { color: meta.color } } as Record<string,unknown>} />
                      </div>
                      <span className="text-xs text-white/60 flex-1">{meta.label}</span>
                      {agent.status === "running" && <Loader2 className="w-3 h-3 animate-spin text-white/50" />}
                      {agent.status === "done" && <CheckCircle2 className="w-3 h-3 text-[#10b981]" />}
                      {agent.status === "error" && <XCircle className="w-3 h-3 text-[#e21227]" />}
                      {agent.status === "idle" && <div className="w-3 h-3 rounded-full border border-white/20" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Evolution Insights Panel */}
          <AnimatePresence>
            {insightsOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/5 p-4 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Dna className="w-3.5 h-3.5 text-[#8b5cf6]" />
                  <span className="text-xs font-bold text-[#8b5cf6]">رؤى التطور من الذاكرة</span>
                </div>
                {evolutionInsights.length === 0 ? (
                  <div className="text-[11px] text-white/30 text-center py-3">
                    لا توجد رؤى بعد — ابدأ تشغيلاً وفعّل Self-Improve
                  </div>
                ) : (
                  <div className="space-y-2">
                    {evolutionInsights.map((ins, i) => (
                      <div key={i} className="flex gap-2 p-2 rounded-lg bg-black/30">
                        <div className="w-4 h-4 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Star className="w-2.5 h-2.5 text-[#8b5cf6]" />
                        </div>
                        <div>
                          <div className="text-[11px] text-white/70 leading-relaxed">{ins.insight}</div>
                          <div className="text-[9px] text-white/30 mt-0.5">
                            [{ins.agent}] — impact: {ins.impact_score}/10
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Task Queue Panel */}
          <AnimatePresence>
            {taskQueueOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-[#22d3ee]/20 bg-[#22d3ee]/5 p-4 overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-3">
                  <ListOrdered className="w-3.5 h-3.5 text-[#22d3ee]" />
                  <span className="text-xs font-bold text-[#22d3ee]">قائمة انتظار المهام</span>
                </div>
                <div className="flex gap-2 mb-3">
                  <input
                    value={taskInput}
                    onChange={e => setTaskInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && addToQueue()}
                    placeholder="أضف مهمة جديدة..."
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#22d3ee]/40 transition"
                  />
                  <button
                    onClick={addToQueue}
                    className="p-2 rounded-lg bg-[#22d3ee]/15 text-[#22d3ee] hover:bg-[#22d3ee]/25 transition"
                  >
                    <PlusCircle className="w-4 h-4" />
                  </button>
                </div>
                {taskQueue.length > 0 && (
                  <>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto mb-3">
                      {taskQueue.map(task => (
                        <div key={task.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-black/30">
                          {task.status === "pending" && <div className="w-2 h-2 rounded-full bg-white/30 shrink-0" />}
                          {task.status === "running" && <Loader2 className="w-2.5 h-2.5 animate-spin text-[#22d3ee] shrink-0" />}
                          {task.status === "done" && <CheckCircle2 className="w-2.5 h-2.5 text-[#10b981] shrink-0" />}
                          {task.status === "error" && <XCircle className="w-2.5 h-2.5 text-[#e21227] shrink-0" />}
                          <span className="text-[11px] text-white/60 flex-1 truncate">{task.goal}</span>
                          {task.status === "pending" && (
                            <button onClick={() => removeFromQueue(task.id)} className="text-white/30 hover:text-white/60 transition">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={runQueue}
                      disabled={processingQueue || taskQueue.every(t => t.status !== "pending")}
                      className="w-full py-2 rounded-lg text-xs font-bold bg-[#22d3ee]/15 text-[#22d3ee] border border-[#22d3ee]/30 hover:bg-[#22d3ee]/25 transition disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {processingQueue ? (
                        <><Loader2 className="w-3 h-3 animate-spin inline mr-1" /> جارٍ المعالجة...</>
                      ) : (
                        <><Play className="w-3 h-3 inline mr-1" /> تشغيل القائمة</>
                      )}
                    </button>
                  </>
                )}
                {taskQueue.length === 0 && (
                  <div className="text-[11px] text-white/30 text-center py-2">القائمة فارغة — أضف مهام للمعالجة التلقائية</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* History Panel */}
          <AnimatePresence>
            {historyOpen && history.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="rounded-xl border border-white/10 bg-white/5 p-4 overflow-hidden"
              >
                <div className="text-[10px] uppercase tracking-widest text-white/40 mb-3">آخر المهام</div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {history.map(t => (
                    <div
                      key={t.id}
                      className="px-2 py-2 rounded-lg bg-black/30 cursor-pointer hover:bg-black/50 transition"
                      onClick={() => { setGoal(t.goal); setHistoryOpen(false); }}
                    >
                      <div className="text-xs text-white/70 truncate">{t.goal}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded text-white/60 ${
                          t.status === "done" ? "bg-[#10b981]/20 text-[#10b981]" : t.status === "failed" ? "bg-[#e21227]/20 text-[#e21227]" : "bg-white/10"
                        }`}>{t.status}</span>
                        <span className="text-[10px] text-white/30">{new Date(t.created_at).toLocaleDateString("ar-SA")}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Main Content ───────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Goal input */}
          <div className="shrink-0 p-4 border-b border-white/10">
            <div className="flex gap-3">
              <textarea
                value={goal}
                onChange={e => setGoal(e.target.value)}
                placeholder="صف الهدف أو المشروع الذي تريد بناؤه... (مثال: ابنِ API لإدارة المهام بـ Node.js)"
                rows={3}
                className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:border-[#e21227]/50 transition"
                onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) startRun(); }}
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={run?.status === "running" ? stopRun : startRun}
                  disabled={!goal.trim()}
                  className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                    run?.status === "running"
                      ? "bg-[#e21227]/20 text-[#e21227] border border-[#e21227]/40 hover:bg-[#e21227]/30"
                      : goal.trim()
                        ? "bg-gradient-to-r from-[#e21227] to-[#8b5cf6] text-white hover:opacity-90"
                        : "bg-white/5 text-white/30 border border-white/10 cursor-not-allowed"
                  }`}
                >
                  {run?.status === "running"
                    ? <><Square className="w-4 h-4" /> إيقاف</>
                    : <><Play className="w-4 h-4" /> تشغيل</>}
                </button>
                <div className="text-[10px] text-white/30 text-center">Ctrl+Enter</div>
              </div>
            </div>
          </div>

          {/* Agents grid + fusion */}
          <div className="flex-1 overflow-y-auto p-4">
            {!run && (
              <div className="h-full flex flex-col items-center justify-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#e21227]/20 to-[#8b5cf6]/20 border border-[#e21227]/20 flex items-center justify-center">
                  <Sparkles className="w-10 h-10 text-[#e21227]/60" />
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-white/80 mb-2">Autonomous Swarm Evolution</div>
                  <div className="text-sm text-white/40 max-w-md">
                    نظام وكلاء متعددين يعملون كفريق تطوير كامل — يخططون، ينفذون، يراجعون، يختبرون، ويتطورون تلقائياً
                  </div>
                </div>
                <div className="flex gap-4 flex-wrap justify-center">
                  {Object.entries(AGENT_META).map(([id, meta]) => {
                    const Icon = meta.icon;
                    return (
                      <div key={id} className="flex flex-col items-center gap-1.5">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: meta.color + "20", border: `1px solid ${meta.color}40` }}>
                          <Icon {...{ className: "w-5 h-5", style: { color: meta.color } } as Record<string,unknown>} />
                        </div>
                        <div className="text-[10px] text-white/40">{meta.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Evolution stats if available */}
                {evolutionInsights.length > 0 && (
                  <div className="w-full max-w-lg px-4 py-3 rounded-xl bg-[#8b5cf6]/10 border border-[#8b5cf6]/20">
                    <div className="text-[10px] uppercase tracking-widest text-[#8b5cf6] mb-2 flex items-center gap-1">
                      <Dna className="w-3 h-3" />
                      رؤى التطور المتراكمة ({evolutionInsights.length})
                    </div>
                    <div className="text-xs text-white/50 leading-relaxed">
                      {evolutionInsights[0]?.insight}
                    </div>
                  </div>
                )}
              </div>
            )}

            {run && (
              <div className="space-y-4">
                {/* Status bar */}
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                  {run.status === "running" && <Loader2 className="w-4 h-4 animate-spin text-[#e21227]" />}
                  {run.status === "done" && <CheckCircle2 className="w-4 h-4 text-[#10b981]" />}
                  {run.status === "error" && <XCircle className="w-4 h-4 text-[#e21227]" />}
                  <div className="flex-1">
                    <div className="text-xs font-medium text-white/80 truncate">{run.goal}</div>
                    <div className="text-[10px] text-white/40">
                      {run.status === "running" ? `تشغيل الدورة ${run.iteration}/${continuousMode ? 3 : iterations}...` : run.status === "done" ? "اكتمل بنجاح" : "توقف"}
                    </div>
                  </div>
                  <div className="text-[10px] px-2 py-1 rounded-md text-white/50 bg-white/5">
                    {selectedModel?.name ?? model}
                  </div>
                </div>

                {/* Agent outputs grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {run.agents.map(agent => {
                    const meta = AGENT_META[agent.agentId];
                    if (!meta) return null;
                    const Icon = meta.icon;
                    return (
                      <motion.div
                        key={agent.agentId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border overflow-hidden"
                        style={{ borderColor: meta.color + "30" }}
                      >
                        <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: meta.color + "15" }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                          <span className="text-xs font-bold" style={{ color: meta.color }}>{meta.label}</span>
                          <div className="flex-1" />
                          {agent.status === "running" && <Loader2 className="w-3 h-3 animate-spin" style={{ color: meta.color }} />}
                          {agent.status === "done" && <CheckCircle2 className="w-3 h-3 text-[#10b981]" />}
                        </div>
                        <div className="p-3 bg-black/30 max-h-48 overflow-y-auto">
                          {agent.output ? (
                            <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono leading-relaxed">{agent.output}</pre>
                          ) : (
                            <div className="text-xs text-white/20 italic">
                              {agent.status === "idle" ? "في الانتظار..." : "جارٍ التحليل..."}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Fusion output */}
                {(run.fusion || run.fusionRunning) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-[#e21227]/30 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#e21227]/20 to-[#8b5cf6]/20">
                      <Sparkles className="w-4 h-4 text-[#e21227]" />
                      <span className="text-sm font-bold text-white">FUSION — التقرير النهائي الموحد</span>
                      {run.fusionRunning && <Loader2 className="w-3.5 h-3.5 animate-spin text-white/50 ml-auto" />}
                      {!run.fusionRunning && run.status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981] ml-auto" />}
                    </div>
                    <div className="p-4 bg-black/40 max-h-80 overflow-y-auto">
                      <pre className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">{run.fusion}</pre>
                    </div>
                  </motion.div>
                )}

                {/* ── SELF-IMPROVE SECTION ────────────────────────────── */}
                {run.status === "done" && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-[#8b5cf6]/30 overflow-hidden"
                  >
                    <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#8b5cf6]/15 to-[#06b6d4]/10">
                      <Dna className="w-4 h-4 text-[#8b5cf6]" />
                      <div>
                        <div className="text-sm font-bold text-white">التحسين الذاتي (Self-Improve)</div>
                        <div className="text-[10px] text-white/40">
                          تحليل نتائج الجلسة واستخراج رؤى لتحسين الجلسات المستقبلية
                        </div>
                      </div>
                      <div className="flex-1" />
                      <button
                        onClick={selfImprove}
                        disabled={selfImproving || selfImproveDone}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                          selfImproveDone
                            ? "bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30 cursor-default"
                            : selfImproving
                              ? "bg-[#8b5cf6]/15 text-[#8b5cf6] border border-[#8b5cf6]/30 cursor-not-allowed"
                              : "bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/30"
                        }`}
                      >
                        {selfImproving ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> جارٍ التحليل...</>
                        ) : selfImproveDone ? (
                          <><CheckCircle2 className="w-4 h-4" /> تم التحسين</>
                        ) : (
                          <><TrendingUp className="w-4 h-4" /> تحسين ذاتي</>
                        )}
                      </button>
                    </div>

                    {/* Self-improve recommendations */}
                    <AnimatePresence>
                      {selfImproveRecs.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          className="px-4 py-3 bg-black/30"
                        >
                          <div className="text-[10px] uppercase tracking-widest text-[#8b5cf6] mb-2 flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            توصيات للجلسة القادمة
                          </div>
                          <div className="space-y-1.5">
                            {selfImproveRecs.map((rec, i) => (
                              <div key={i} className="flex gap-2 items-start">
                                <div className="w-4 h-4 rounded-full bg-[#8b5cf6]/20 flex items-center justify-center shrink-0 mt-0.5 text-[9px] text-[#8b5cf6] font-bold">
                                  {i + 1}
                                </div>
                                <p className="text-xs text-white/70 leading-relaxed">{rec}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
