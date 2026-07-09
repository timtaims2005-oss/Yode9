/**
 * AgentMemoryPanel — Long-Term Memory + Auto-Project Generator + Self-Improve Loop
 * Tabs: Memories · Insights · Errors · Auto-Project · Self-Improve
 * Connects to /api/agent-memory — 3D live design
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, X, RefreshCw, Search, Trash2, CheckCircle2,
  XCircle, Lightbulb, AlertTriangle, TrendingUp,
  BookOpen, Clock, Zap, ChevronDown, ChevronUp,
  Cpu, FolderGit2, RotateCcw, Sparkles, Star,
  BarChart2, Activity,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

interface AgentMemory {
  id: string; type: string; goal: string; summary: string;
  tags: string[]; agent: string; model: string | null;
  success: boolean; importance: number; use_count: number;
  iteration: number; created_at: string;
}
interface EvolutionInsight {
  id: string; insight: string; agent: string;
  iteration: number; impact_score: number;
  applied_count: number; created_at: string;
}
interface ErrorPattern {
  id: string; pattern: string; solution: string | null;
  occurrence_count: number; last_seen: string;
}
interface Stats { total: number; successful: number; failed: number; insights: number; errors: number; }

type Tab = "memories" | "insights" | "errors" | "project" | "self-improve";

function fmtAge(s: string) {
  const d = Date.now() - new Date(s).getTime();
  if (d < 3600000) return `${Math.round(d / 60000)}د`;
  if (d < 86400000) return `${Math.round(d / 3600000)}س`;
  return `${Math.round(d / 86400000)} يوم`;
}

const TYPE_COLORS: Record<string, string> = {
  solution: "#10b981", error: "#ef4444", insight: "#8b5cf6",
  plan: "#3b82f6", execution: "#22d3ee",
};
const AGENT_COLORS: Record<string, string> = {
  orchestrator: "#e21227", planner: "#8b5cf6", executor: "#22d3ee",
  critic: "#f97316", tester: "#10b981", swarm: "#e21227",
};

// ── Live 3D HUD wave canvas ───────────────────────────────────────────────────
function HUDWave3D({ color = "#8b5cf6", height = 6 }: { color?: string; height?: number }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let t = 0;
    const draw = () => {
      t += 0.06;
      const W = cv.offsetWidth, H = height;
      cv.width = W * devicePixelRatio; cv.height = H * devicePixelRatio;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      ctx.clearRect(0, 0, W, H);
      for (let x = 0; x < W; x += 2) {
        const a = 0.1 + Math.abs(Math.sin(t + x * 0.03)) * 0.28;
        const [r, g, b] = color === "#8b5cf6" ? [139,92,246] : color === "#22d3ee" ? [34,211,238] : [34,197,94];
        ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
        ctx.fillRect(x, 0, 1.5, H);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [color, height]);
  return <canvas ref={cvRef} style={{ width: "100%", height, display: "block", borderRadius: 4 }} />;
}

interface Props { onClose?: () => void; compact?: boolean; }

export function AgentMemoryPanel({ onClose, compact = false }: Props) {
  const [tab, setTab] = useState<Tab>("memories");
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [insights, setInsights] = useState<EvolutionInsight[]>([]);
  const [errors, setErrors] = useState<ErrorPattern[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Auto-Project state
  const [projectIdea, setProjectIdea] = useState("");
  const [projectRunning, setProjectRunning] = useState(false);
  const [projectOutput, setProjectOutput] = useState("");
  const [projectData, setProjectData] = useState<Record<string, unknown> | null>(null);
  const [projectDone, setProjectDone] = useState(false);

  // Self-Improve state
  const [improveRunning, setImproveRunning] = useState(false);
  const [improveOutput, setImproveOutput] = useState("");
  const [improveData, setImproveData] = useState<{
    savedInsights?: number;
    analysis?: Record<string, unknown>;
    message?: string;
  } | null>(null);
  const [improveDone, setImproveDone] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, iRes, eRes, sRes] = await Promise.all([
        authFetch("/api/agent-memory?limit=50"),
        authFetch("/api/agent-memory/evolution/insights"),
        authFetch("/api/agent-memory/errors"),
        authFetch("/api/agent-memory/stats"),
      ]);
      if (mRes.ok) { const d = await mRes.json(); setMemories(d.memories ?? []); }
      if (iRes.ok) { const d = await iRes.json(); setInsights(d.insights ?? []); }
      if (eRes.ok) { const d = await eRes.json(); setErrors(d.patterns ?? []); }
      if (sRes.ok) { const d = await sRes.json(); setStats(d); }
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const deleteMemory = useCallback(async (id: string) => {
    setMemories(m => m.filter(x => x.id !== id));
    try { await authFetch(`/api/agent-memory/${id}`, { method: "DELETE" }); } catch { /**/ }
  }, []);

  const filtered = memories.filter(m =>
    !search ||
    m.goal.toLowerCase().includes(search.toLowerCase()) ||
    m.summary.toLowerCase().includes(search.toLowerCase()) ||
    (Array.isArray(m.tags) ? m.tags : []).some((t: string) => t.includes(search))
  );

  // ── Auto-Project Generator ──────────────────────────────────────────────────
  const runAutoProject = async () => {
    if (!projectIdea.trim() || projectRunning) return;
    setProjectRunning(true);
    setProjectOutput("");
    setProjectData(null);
    setProjectDone(false);
    try {
      const resp = await authFetch("/api/agent-memory/auto-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: projectIdea.trim(), language: "ar" }),
      });
      if (!resp.body) { setProjectRunning(false); return; }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = dec.decode(value);
        for (const line of text.split("\n")) {
          if (!line.startsWith("data:")) continue;
          try {
            const ev = JSON.parse(line.slice(5)) as { type: string; content?: string; project?: Record<string, unknown> };
            if (ev.type === "chunk" && ev.content) setProjectOutput(p => p + ev.content);
            if (ev.type === "done" && ev.project) { setProjectData(ev.project); setProjectDone(true); }
          } catch { /* skip */ }
        }
      }
    } catch (e) { setProjectOutput(`[خطأ: ${String(e)}]`); }
    setProjectRunning(false);
    load();
  };

  // ── Self-Improve Loop ───────────────────────────────────────────────────────
  const runSelfImprove = async () => {
    if (improveRunning) return;
    setImproveRunning(true);
    setImproveOutput("");
    setImproveData(null);
    setImproveDone(false);
    try {
      const resp = await authFetch("/api/agent-memory/self-improve-loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxInsights: 5 }),
      });
      if (!resp.body) { setImproveRunning(false); return; }
      const reader = resp.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = dec.decode(value);
        for (const line of text.split("\n")) {
          if (!line.startsWith("data:")) continue;
          try {
            const ev = JSON.parse(line.slice(5)) as {
              type: string; content?: string; message?: string;
              savedInsights?: number; analysis?: Record<string, unknown>;
            };
            if (ev.type === "chunk" && ev.content) setImproveOutput(p => p + ev.content);
            if (ev.type === "done") {
              setImproveData({ savedInsights: ev.savedInsights, analysis: ev.analysis, message: ev.message });
              setImproveDone(true);
            }
          } catch { /* skip */ }
        }
      }
    } catch (e) { setImproveOutput(`[خطأ: ${String(e)}]`); }
    setImproveRunning(false);
    load();
  };

  const TABS = [
    { id: "memories" as Tab,      label: "ذكريات",    icon: BookOpen,    color: "#22d3ee" },
    { id: "insights" as Tab,      label: "رؤى",       icon: Lightbulb,   color: "#8b5cf6" },
    { id: "errors" as Tab,        label: "أخطاء",     icon: AlertTriangle, color: "#ef4444" },
    { id: "project" as Tab,       label: "مشروع",     icon: FolderGit2,  color: "#10b981" },
    { id: "self-improve" as Tab,  label: "تطور",      icon: RotateCcw,   color: "#f97316" },
  ] as const;

  const currentTabColor = TABS.find(t => t.id === tab)?.color ?? "#8b5cf6";

  return (
    <div className="flex flex-col h-full bg-[#060608] text-white overflow-hidden" dir="rtl">

      {/* ── Header ── */}
      <div className="flex-shrink-0 px-4 pt-3 pb-2 border-b border-white/6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center relative overflow-hidden"
          style={{ background: `${currentTabColor}18`, border: `1px solid ${currentTabColor}35` }}>
          <Brain className="w-4 h-4" style={{ color: currentTabColor }} />
          <span className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(circle at 40% 40%, ${currentTabColor}22, transparent 70%)` }} />
        </div>
        <div>
          <div className="text-sm font-black text-white tracking-wide">ذاكرة الوكيل الذكي</div>
          <div className="text-[9px] text-white/25 uppercase tracking-widest">Agent Long-Term Memory · AI System</div>
        </div>
        <div className="flex-1" />
        {stats && (
          <div className="hidden sm:flex items-center gap-1.5 text-[9px]">
            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/18">✓ {stats.successful}</span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/18">💡 {stats.insights}</span>
          </div>
        )}
        <button onClick={load} disabled={loading}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white hover:bg-white/8 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/25 hover:text-white hover:bg-white/8 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Live HUD wave */}
      <div className="flex-shrink-0 px-4 py-1.5">
        <HUDWave3D color={currentTabColor} height={5} />
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex-shrink-0 grid grid-cols-5 gap-px bg-white/4 border-b border-white/5">
          {[
            { label: "إجمالي",  value: stats.total,      color: "text-white/50",   bg: "bg-[#060608]" },
            { label: "ناجح",    value: stats.successful,  color: "text-green-400",  bg: "bg-[#060608]" },
            { label: "فاشل",    value: stats.failed,      color: "text-red-400",    bg: "bg-[#060608]" },
            { label: "رؤى",     value: stats.insights,    color: "text-purple-400", bg: "bg-[#060608]" },
            { label: "أخطاء",   value: stats.errors,      color: "text-orange-400", bg: "bg-[#060608]" },
          ].map(s => (
            <div key={s.label} className={`py-1.5 px-2 ${s.bg} text-center`}>
              <div className={`text-base font-black ${s.color}`}>{s.value}</div>
              <div className="text-[8px] text-white/20 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs — 5 tabs */}
      <div className="flex-shrink-0 flex border-b border-white/5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1 py-2 text-[9px] font-black uppercase tracking-wider transition-all border-b-2 whitespace-nowrap px-1`}
            style={{
              borderColor: tab === t.id ? t.color : "transparent",
              color: tab === t.id ? t.color : "rgba(255,255,255,0.28)",
              background: tab === t.id ? `${t.color}08` : "transparent",
            }}>
            <t.icon className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Search (memories only) */}
      {tab === "memories" && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-white/5">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="بحث في الذاكرة..."
              className="w-full bg-white/4 border border-white/8 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white placeholder-white/18 outline-none focus:border-purple-500/30 transition" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#ffffff10 transparent" }}>
        <AnimatePresence mode="wait">

          {/* ── MEMORIES TAB ── */}
          {tab === "memories" && (
            <motion.div key="memories" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              {filtered.length === 0 && !loading && (
                <div className="text-center py-12 text-white/20 text-sm">
                  <Brain className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  لا توجد ذكريات بعد. ابدأ تشغيل Swarm Agent لتسجيل الذاكرة.
                </div>
              )}
              {filtered.map((m, i) => (
                <motion.div key={m.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="rounded-xl border transition-colors group"
                  style={{
                    background: m.success ? "rgba(16,185,129,0.04)" : "rgba(239,68,68,0.04)",
                    borderColor: m.success ? "rgba(16,185,129,0.14)" : "rgba(239,68,68,0.14)",
                  }}>
                  <div className="p-3">
                    <div className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 mt-0.5">
                        {m.success ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/70 line-clamp-2">{m.goal}</p>
                        <p className="text-[11px] text-white/40 mt-1 line-clamp-2">{m.summary}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium border"
                            style={{ color: AGENT_COLORS[m.agent] ?? "#6b7280", borderColor: `${AGENT_COLORS[m.agent] ?? "#6b7280"}28`, backgroundColor: `${AGENT_COLORS[m.agent] ?? "#6b7280"}10` }}>
                            {m.agent}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full border"
                            style={{ color: TYPE_COLORS[m.type] ?? "#6b7280", borderColor: `${TYPE_COLORS[m.type] ?? "#6b7280"}28`, backgroundColor: `${TYPE_COLORS[m.type] ?? "#6b7280"}10` }}>
                            {m.type}
                          </span>
                          {m.model && <span className="text-[9px] text-white/22">{m.model}</span>}
                          <span className="text-[9px] text-white/20 flex items-center gap-0.5 mr-auto">
                            <Clock className="w-2 h-2" />{fmtAge(m.created_at)}
                          </span>
                          <span className="text-[9px] text-white/20">⭐ {m.importance}/10</span>
                          {m.use_count > 0 && <span className="text-[9px] text-purple-400">↻ {m.use_count}</span>}
                        </div>
                        {Array.isArray(m.tags) && m.tags.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {m.tags.map((t: string) => (
                              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/28">#{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                          className="w-6 h-6 flex items-center justify-center text-white/18 hover:text-white/60 transition-colors">
                          {expanded === m.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        <button onClick={() => deleteMemory(m.id)}
                          className="w-6 h-6 flex items-center justify-center text-white/18 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── INSIGHTS TAB ── */}
          {tab === "insights" && (
            <motion.div key="insights" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              {insights.length === 0 && (
                <div className="text-center py-12 text-white/20 text-sm">
                  <Lightbulb className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  لا توجد رؤى بعد. ستُجمع تلقائياً من جلسات Swarm.
                </div>
              )}
              {insights.map((ins, i) => (
                <motion.div key={ins.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="p-3 rounded-xl border transition-colors"
                  style={{ background: "rgba(139,92,246,0.05)", borderColor: "rgba(139,92,246,0.14)" }}>
                  <div className="flex items-start gap-2.5">
                    <Lightbulb className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70">{ins.insight}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full border"
                          style={{ color: AGENT_COLORS[ins.agent] ?? "#6b7280", borderColor: `${AGENT_COLORS[ins.agent] ?? "#6b7280"}28`, backgroundColor: `${AGENT_COLORS[ins.agent] ?? "#6b7280"}10` }}>
                          {ins.agent}
                        </span>
                        <span className="text-[9px] text-purple-400 flex items-center gap-0.5">
                          <TrendingUp className="w-2.5 h-2.5" />{ins.impact_score}/10
                        </span>
                        {ins.applied_count > 0 && (
                          <span className="text-[9px] text-green-400">✓ طُبّق {ins.applied_count}×</span>
                        )}
                        <span className="text-[9px] text-white/18 mr-auto flex items-center gap-0.5">
                          <Clock className="w-2 h-2" />{fmtAge(ins.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── ERRORS TAB ── */}
          {tab === "errors" && (
            <motion.div key="errors" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
              {errors.length === 0 && (
                <div className="text-center py-12 text-white/20 text-sm">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  لا توجد أنماط خطأ مسجلة.
                </div>
              )}
              {errors.map((err, i) => (
                <motion.div key={err.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className="p-3 rounded-xl border transition-colors"
                  style={{ background: "rgba(239,68,68,0.04)", borderColor: "rgba(239,68,68,0.14)" }}>
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70 font-medium">النمط:</p>
                      <p className="text-xs text-red-300/65 mt-0.5">{err.pattern}</p>
                      {err.solution && (
                        <>
                          <p className="text-xs text-white/48 font-medium mt-2">الحل:</p>
                          <p className="text-xs text-green-300/65 mt-0.5">{err.solution}</p>
                        </>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] text-red-400">تكرر {err.occurrence_count} مرة</span>
                        <span className="text-[9px] text-white/18 mr-auto flex items-center gap-0.5">
                          <Clock className="w-2 h-2" />آخر ظهور: {fmtAge(err.last_seen)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── AUTO-PROJECT TAB ── */}
          {tab === "project" && (
            <motion.div key="project" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="rounded-xl p-3 border" style={{ background: "rgba(16,185,129,0.05)", borderColor: "rgba(16,185,129,0.18)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <FolderGit2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs font-black text-emerald-400">مولّد المشاريع التلقائي</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400/70 border border-emerald-500/18 mr-auto">AI-Powered</span>
                </div>
                <p className="text-[10px] text-white/35 leading-relaxed">
                  أدخل فكرة المشروع وسيقوم الذكاء الاصطناعي بتوليد مواصفات كاملة تشمل المعمارية والمراحل والنقاط الوظيفية.
                </p>
              </div>

              <textarea
                value={projectIdea}
                onChange={e => setProjectIdea(e.target.value)}
                rows={3}
                placeholder="مثال: منصة تعليمية بالذكاء الاصطناعي للغة العربية مع تقييم تلقائي..."
                className="w-full rounded-xl px-3 py-2 text-xs outline-none resize-none transition"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(16,185,129,0.20)", color: "rgba(255,255,255,0.8)" }}
              />

              <motion.button
                onClick={runAutoProject}
                disabled={projectRunning || !projectIdea.trim()}
                className="w-full py-2.5 rounded-xl text-xs font-black relative overflow-hidden"
                style={{
                  background: projectRunning ? "rgba(99,102,241,0.12)" : "rgba(16,185,129,0.14)",
                  border: `1px solid ${projectRunning ? "rgba(99,102,241,0.35)" : "rgba(16,185,129,0.35)"}`,
                  color: projectRunning ? "#6366f1" : "#10b981",
                  opacity: (!projectRunning && projectIdea.trim()) ? 1 : 0.55,
                }}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
              >
                <Sparkles className="w-3.5 h-3.5 inline mr-1.5" />
                {projectRunning ? "جارٍ توليد المشروع..." : "⚡ توليد مواصفات المشروع"}
              </motion.button>

              {/* Streaming output */}
              {(projectOutput || projectRunning) && (
                <div className="rounded-xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.5)", borderColor: "rgba(16,185,129,0.15)" }}>
                  <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "rgba(16,185,129,0.10)" }}>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/70">مواصفات المشروع</span>
                    <Activity className="w-3 h-3 text-emerald-400/50" style={{ animation: projectRunning ? "spin 2s linear infinite" : "none" }} />
                  </div>
                  <div className="p-3 max-h-52 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#10b98120 transparent" }}>
                    <pre className="text-[10px] text-white/60 whitespace-pre-wrap leading-relaxed font-mono">
                      {projectOutput}
                      {projectRunning && <span className="inline-block w-1.5 h-3 animate-pulse ml-0.5" style={{ background: "#10b981" }} />}
                    </pre>
                  </div>
                </div>
              )}

              {/* Parsed project data */}
              {projectDone && projectData && typeof projectData === "object" && (
                <div className="space-y-2">
                  {Boolean(projectData["title"]) && (
                    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.20)" }}>
                      <div className="text-[9px] text-emerald-400/60 uppercase tracking-wider mb-0.5">عنوان المشروع</div>
                      <div className="text-sm font-bold text-emerald-300">{String(projectData["title"])}</div>
                    </div>
                  )}
                  {Array.isArray(projectData["tech_stack"]) && (
                    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="text-[9px] text-white/35 uppercase tracking-wider mb-1.5">التقنيات المستخدمة</div>
                      <div className="flex flex-wrap gap-1">
                        {(projectData["tech_stack"] as string[]).map((t: string) => (
                          <span key={t} className="text-[9px] px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(34,211,238,0.10)", border: "1px solid rgba(34,211,238,0.20)", color: "#22d3ee" }}>{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {Boolean(projectData["estimated_time"]) && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                      <Clock className="w-3 h-3 text-purple-400" />
                      <span className="text-[10px] text-white/60">الوقت المتوقع: </span>
                      <span className="text-[10px] font-bold text-purple-300">{String(projectData["estimated_time"])}</span>
                    </div>
                  )}
                  <div className="text-center">
                    <span className="text-[9px] text-emerald-400/60">✓ تم حفظ المشروع في الذاكرة تلقائياً</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── SELF-IMPROVE TAB ── */}
          {tab === "self-improve" && (
            <motion.div key="self-improve" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
              <div className="rounded-xl p-3 border" style={{ background: "rgba(249,115,22,0.05)", borderColor: "rgba(249,115,22,0.18)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <RotateCcw className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-black text-orange-400">حلقة التحسين الذاتي عبر الجلسات</span>
                </div>
                <p className="text-[10px] text-white/35 leading-relaxed">
                  يحلل النظام كل الجلسات السابقة ويستخرج أنماط النجاح والفشل، ثم يولّد رؤى جديدة تُحسّن أداء الجلسات القادمة تلقائياً.
                </p>
              </div>

              {/* Stats preview */}
              {stats && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "جلسات ناجحة", value: stats.successful, color: "#10b981", icon: CheckCircle2 },
                    { label: "رؤى محفوظة",  value: stats.insights,   color: "#8b5cf6", icon: Lightbulb },
                    { label: "أخطاء رصدت", value: stats.errors,     color: "#ef4444", icon: AlertTriangle },
                  ].map(s => (
                    <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: `${s.color}08`, border: `1px solid ${s.color}20` }}>
                      <div className="text-lg font-black" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-[8px] text-white/28 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              <motion.button
                onClick={runSelfImprove}
                disabled={improveRunning}
                className="w-full py-3 rounded-xl text-xs font-black relative overflow-hidden"
                style={{
                  background: improveRunning ? "rgba(99,102,241,0.12)" : "rgba(249,115,22,0.12)",
                  border: `1px solid ${improveRunning ? "rgba(99,102,241,0.35)" : "rgba(249,115,22,0.30)"}`,
                  color: improveRunning ? "#6366f1" : "#f97316",
                  opacity: improveRunning ? 0.8 : 1,
                }}
                whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.97 }}
              >
                <RotateCcw className={`w-3.5 h-3.5 inline mr-1.5 ${improveRunning ? "animate-spin" : ""}`} />
                {improveRunning ? "جارٍ التحليل والتحسين..." : "⟳ تشغيل حلقة التحسين الذاتي"}
              </motion.button>

              {/* Streaming output */}
              {(improveOutput || improveRunning) && (
                <div className="rounded-xl border overflow-hidden" style={{ background: "rgba(0,0,0,0.5)", borderColor: "rgba(249,115,22,0.15)" }}>
                  <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: "rgba(249,115,22,0.10)" }}>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-orange-400/70">تحليل الجلسات</span>
                    {improveRunning && <Cpu className="w-3 h-3 text-orange-400/50 animate-pulse" />}
                  </div>
                  <div className="p-3 max-h-48 overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
                    <pre className="text-[10px] text-white/55 whitespace-pre-wrap leading-relaxed font-mono">
                      {improveOutput}
                      {improveRunning && <span className="inline-block w-1.5 h-3 animate-pulse ml-0.5" style={{ background: "#f97316" }} />}
                    </pre>
                  </div>
                </div>
              )}

              {/* Results */}
              {improveDone && improveData && (
                <div className="space-y-2">
                  <div className="rounded-xl px-4 py-3 text-center" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.20)" }}>
                    <Star className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                    <div className="text-sm font-black text-emerald-300">تم الحفظ بنجاح</div>
                    <div className="text-[10px] text-white/45 mt-0.5">{improveData.message}</div>
                    {improveData.savedInsights != null && (
                      <div className="mt-2 text-xs font-bold text-emerald-400">
                        +{improveData.savedInsights} رؤية جديدة محفوظة
                      </div>
                    )}
                  </div>
                  {improveData.analysis && typeof improveData.analysis === "object" && Boolean((improveData.analysis as Record<string, unknown>)["strength_patterns"]) && (
                    <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-white/35">نقاط القوة المكتشفة</div>
                      {((improveData.analysis as Record<string, unknown>)["strength_patterns"] as string[]).slice(0, 3).map((p: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-[10px] text-white/55">
                          <span className="text-emerald-400 mt-0.5">↑</span>
                          <span>{p}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {improveData.analysis && typeof improveData.analysis === "object" && Boolean((improveData.analysis as Record<string, unknown>)["next_session_context"]) && (
                    <div className="rounded-xl p-3" style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.15)" }}>
                      <div className="text-[9px] font-bold uppercase tracking-wider text-purple-400/60 mb-1">توصية للجلسة القادمة</div>
                      <p className="text-[10px] text-white/55 leading-relaxed">
                        {String((improveData.analysis as Record<string, unknown>)["next_session_context"])}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {!improveRunning && !improveDone && (
                <div className="text-center py-4">
                  <BarChart2 className="w-8 h-8 mx-auto mb-2 text-white/10" />
                  <p className="text-[11px] text-white/22">اضغط على الزر لبدء التحليل وتحسين الأداء بناءً على جميع الجلسات السابقة.</p>
                </div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-white/5 flex items-center gap-2">
        <Zap className="w-3 h-3 text-purple-400" />
        <span className="text-[9px] text-white/22">
          الذاكرة تُحدَّث تلقائياً بعد كل جلسة Swarm ناجحة · مولّد المشاريع ← حلقة التطور
        </span>
      </div>
    </div>
  );
}
