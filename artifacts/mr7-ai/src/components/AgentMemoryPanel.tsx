/**
 * AgentMemoryPanel — Long-Term Memory for Swarm & Autonomous Agents
 * Displays successful solutions, evolution insights, error patterns.
 * Connects to /api/agent-memory — no auth required (device-scoped).
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, X, RefreshCw, Search, Trash2, CheckCircle2,
  XCircle, Lightbulb, AlertTriangle, TrendingUp,
  BookOpen, Clock, Zap, ChevronDown, ChevronUp,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

interface AgentMemory {
  id: string;
  type: string;
  goal: string;
  summary: string;
  tags: string[];
  agent: string;
  model: string | null;
  success: boolean;
  importance: number;
  use_count: number;
  iteration: number;
  created_at: string;
}

interface EvolutionInsight {
  id: string;
  insight: string;
  agent: string;
  iteration: number;
  impact_score: number;
  applied_count: number;
  created_at: string;
}

interface ErrorPattern {
  id: string;
  pattern: string;
  solution: string | null;
  occurrence_count: number;
  last_seen: string;
}

interface Stats {
  total: number;
  successful: number;
  failed: number;
  insights: number;
  errors: number;
}

type Tab = "memories" | "insights" | "errors";

function fmtAge(s: string) {
  const d = Date.now() - new Date(s).getTime();
  if (d < 3600000) return `${Math.round(d / 60000)}د`;
  if (d < 86400000) return `${Math.round(d / 3600000)}س`;
  return `${Math.round(d / 86400000)} يوم`;
}

const TYPE_COLORS: Record<string, string> = {
  solution:  "#10b981",
  error:     "#ef4444",
  insight:   "#8b5cf6",
  plan:      "#3b82f6",
  execution: "#22d3ee",
};

const AGENT_COLORS: Record<string, string> = {
  orchestrator: "#e21227",
  planner:      "#8b5cf6",
  executor:     "#22d3ee",
  critic:       "#f97316",
  tester:       "#10b981",
  swarm:        "#e21227",
};

interface Props {
  onClose?: () => void;
  compact?: boolean;
}

export function AgentMemoryPanel({ onClose, compact = false }: Props) {
  const [tab, setTab] = useState<Tab>("memories");
  const [memories, setMemories] = useState<AgentMemory[]>([]);
  const [insights, setInsights] = useState<EvolutionInsight[]>([]);
  const [errors, setErrors] = useState<ErrorPattern[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

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

  return (
    <div className="flex flex-col h-full bg-[#080808] text-white overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
          <Brain className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <div className="text-sm font-bold text-white">ذاكرة الوكيل الذكي</div>
          <div className="text-[10px] text-white/30">Agent Long-Term Memory System</div>
        </div>
        <div className="flex-1" />
        {/* Stats pills */}
        {stats && (
          <div className="hidden sm:flex items-center gap-2 text-[10px]">
            <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
              ✓ {stats.successful}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              💡 {stats.insights}
            </span>
          </div>
        )}
        <button
          onClick={load}
          disabled={loading}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
        {onClose && (
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/8 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex-shrink-0 grid grid-cols-5 gap-px bg-white/5 border-b border-white/5">
          {[
            { label: "إجمالي", value: stats.total, color: "text-white/50" },
            { label: "ناجح", value: stats.successful, color: "text-green-400" },
            { label: "فاشل", value: stats.failed, color: "text-red-400" },
            { label: "رؤى", value: stats.insights, color: "text-purple-400" },
            { label: "أخطاء", value: stats.errors, color: "text-orange-400" },
          ].map(s => (
            <div key={s.label} className="py-2 px-3 bg-[#080808] text-center">
              <div className={`text-lg font-bold ${s.color}`}>{s.value}</div>
              <div className="text-[9px] text-white/25 uppercase tracking-wider">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-white/5">
        {([
          { id: "memories" as Tab,  label: "الذكريات",    icon: BookOpen },
          { id: "insights" as Tab,  label: "الرؤى",       icon: Lightbulb },
          { id: "errors"   as Tab,  label: "الأخطاء",     icon: AlertTriangle },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all border-b-2 ${
              tab === t.id
                ? "border-purple-500 text-purple-400 bg-purple-500/5"
                : "border-transparent text-white/30 hover:text-white/60"
            }`}
          >
            <t.icon className="w-3 h-3" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Search (only for memories) */}
      {tab === "memories" && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-white/5">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/25" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث في الذاكرة..."
              className="w-full bg-white/4 border border-white/8 rounded-lg pr-8 pl-3 py-1.5 text-xs text-white placeholder-white/20 outline-none focus:border-purple-500/30"
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/6 p-4 space-y-2">
        <AnimatePresence mode="wait">
          {/* Memories Tab */}
          {tab === "memories" && (
            <motion.div key="memories" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {filtered.length === 0 && !loading && (
                <div className="text-center py-12 text-white/20 text-sm">
                  <Brain className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  لا توجد ذكريات بعد. ابدأ تشغيل Swarm Agent لتسجيل الذاكرة.
                </div>
              )}
              {filtered.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`rounded-xl border transition-colors group ${
                    m.success
                      ? "bg-green-500/5 border-green-500/15 hover:border-green-500/25"
                      : "bg-red-500/5 border-red-500/15 hover:border-red-500/25"
                  }`}
                >
                  <div className="p-3">
                    <div className="flex items-start gap-2.5">
                      <div className="flex-shrink-0 mt-0.5">
                        {m.success
                          ? <CheckCircle2 className="w-4 h-4 text-green-400" />
                          : <XCircle className="w-4 h-4 text-red-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/70 line-clamp-2">{m.goal}</p>
                        <p className="text-[11px] text-white/40 mt-1 line-clamp-2">{m.summary}</p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {/* Agent badge */}
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-full font-medium border"
                            style={{
                              color: AGENT_COLORS[m.agent] ?? "#6b7280",
                              borderColor: `${AGENT_COLORS[m.agent] ?? "#6b7280"}30`,
                              backgroundColor: `${AGENT_COLORS[m.agent] ?? "#6b7280"}10`,
                            }}
                          >
                            {m.agent}
                          </span>
                          {/* Type badge */}
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded-full border"
                            style={{
                              color: TYPE_COLORS[m.type] ?? "#6b7280",
                              borderColor: `${TYPE_COLORS[m.type] ?? "#6b7280"}30`,
                              backgroundColor: `${TYPE_COLORS[m.type] ?? "#6b7280"}10`,
                            }}
                          >
                            {m.type}
                          </span>
                          {m.model && (
                            <span className="text-[9px] text-white/25">{m.model}</span>
                          )}
                          <span className="text-[9px] text-white/20 flex items-center gap-0.5 mr-auto">
                            <Clock className="w-2 h-2" />
                            {fmtAge(m.created_at)}
                          </span>
                          <span className="text-[9px] text-white/20">⭐ {m.importance}/10</span>
                          {m.use_count > 0 && (
                            <span className="text-[9px] text-purple-400">↻ {m.use_count}</span>
                          )}
                        </div>
                        {/* Tags */}
                        {Array.isArray(m.tags) && m.tags.length > 0 && (
                          <div className="flex gap-1 mt-1.5 flex-wrap">
                            {m.tags.map((t: string) => (
                              <span key={t} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/30">
                                #{t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                          className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-white/60 transition-colors"
                        >
                          {expanded === m.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={() => deleteMemory(m.id)}
                          className="w-6 h-6 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Insights Tab */}
          {tab === "insights" && (
            <motion.div key="insights" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {insights.length === 0 && (
                <div className="text-center py-12 text-white/20 text-sm">
                  <Lightbulb className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  لا توجد رؤى بعد. ستُجمع تلقائياً من جلسات Swarm.
                </div>
              )}
              {insights.map((ins, i) => (
                <motion.div
                  key={ins.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-3 rounded-xl bg-purple-500/6 border border-purple-500/15 hover:border-purple-500/25 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <Lightbulb className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70">{ins.insight}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-full border"
                          style={{
                            color: AGENT_COLORS[ins.agent] ?? "#6b7280",
                            borderColor: `${AGENT_COLORS[ins.agent] ?? "#6b7280"}30`,
                            backgroundColor: `${AGENT_COLORS[ins.agent] ?? "#6b7280"}10`,
                          }}
                        >
                          {ins.agent}
                        </span>
                        <span className="text-[9px] text-purple-400">
                          <TrendingUp className="w-2.5 h-2.5 inline mr-0.5" />
                          {ins.impact_score}/10
                        </span>
                        <span className="text-[9px] text-white/20 mr-auto flex items-center gap-0.5">
                          <Clock className="w-2 h-2" />
                          {fmtAge(ins.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Errors Tab */}
          {tab === "errors" && (
            <motion.div key="errors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {errors.length === 0 && (
                <div className="text-center py-12 text-white/20 text-sm">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  لا توجد أنماط خطأ مسجلة.
                </div>
              )}
              {errors.map((err, i) => (
                <motion.div
                  key={err.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="p-3 rounded-xl bg-red-500/5 border border-red-500/15 hover:border-red-500/25 transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70 font-medium">النمط:</p>
                      <p className="text-xs text-red-300/70 mt-0.5">{err.pattern}</p>
                      {err.solution && (
                        <>
                          <p className="text-xs text-white/50 font-medium mt-2">الحل:</p>
                          <p className="text-xs text-green-300/70 mt-0.5">{err.solution}</p>
                        </>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[9px] text-red-400">
                          تكرر {err.occurrence_count} مرة
                        </span>
                        <span className="text-[9px] text-white/20 mr-auto flex items-center gap-0.5">
                          <Clock className="w-2 h-2" />
                          آخر ظهور: {fmtAge(err.last_seen)}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-white/5 flex items-center gap-2">
        <Zap className="w-3 h-3 text-purple-400" />
        <span className="text-[10px] text-white/25">
          الذاكرة تُحدَّث تلقائياً بعد كل جلسة Swarm ناجحة
        </span>
      </div>
    </div>
  );
}
