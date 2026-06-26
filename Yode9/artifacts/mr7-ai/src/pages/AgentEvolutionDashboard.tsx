/**
 * AgentEvolutionDashboard — Full Autonomous Agent Memory & Evolution Dashboard
 * Shows: DB-backed agent memories · Evolution insights · Error patterns · Stats
 * Connects to: /api/agent-memory, /api/agent-memory/evolution/insights,
 *              /api/agent-memory/errors, /api/agent-memory/stats
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Dna, AlertTriangle, BarChart3, RefreshCw,
  Search, Trash2, Star, Activity, TrendingUp,
  CheckCircle2, XCircle, Loader2, Database,
  Zap, Shield, Network, FlaskConical, Bot,
  Clock, Tag, ChevronDown, ChevronRight,
} from "lucide-react";
import { authFetch } from "@/lib/auth";

// ── Types ────────────────────────────────────────────────────────────────────
interface AgentMemory {
  id: string;
  type: string;
  goal: string;
  summary: string;
  tags: string[];
  agent: string;
  model: string;
  success: boolean;
  importance: number;
  use_count: number;
  iteration: number;
  created_at: string;
}

interface EvolutionInsight {
  id: string;
  task_id: string;
  insight: string;
  agent: string;
  iteration: number;
  model: string;
  impact_score: number;
  applied_count: number;
  created_at: string;
}

interface ErrorPattern {
  id: string;
  pattern: string;
  solution: string;
  model: string;
  occurrence_count: number;
  last_seen: string;
}

interface MemoryStats {
  total: number;
  successful: number;
  failed: number;
  insights_count: number;
  error_patterns_count: number;
}

type Tab = "memory" | "insights" | "errors" | "stats";

const AGENT_COLORS: Record<string, string> = {
  swarm:             "#e21227",
  orchestrator:      "#e21227",
  planner:           "#8b5cf6",
  executor:          "#22d3ee",
  critic:            "#f97316",
  tester:            "#10b981",
  "project-generator": "#fbbf24",
  agent4:            "#06b6d4",
  default:           "#6b7280",
};

function agentColor(agent: string) {
  return AGENT_COLORS[agent] ?? AGENT_COLORS["default"];
}

interface Props { onClose?: () => void }

export function AgentEvolutionDashboard({ onClose }: Props) {
  const [tab, setTab] = useState<Tab>("memory");
  const [loading, setLoading] = useState(false);

  // Memory tab
  const [memories, setMemories]     = useState<AgentMemory[]>([]);
  const [memTotal, setMemTotal]     = useState(0);
  const [memSearch, setMemSearch]   = useState("");
  const [expanded, setExpanded]     = useState<string | null>(null);

  // Insights tab
  const [insights, setInsights] = useState<EvolutionInsight[]>([]);

  // Errors tab
  const [errors, setErrors] = useState<ErrorPattern[]>([]);

  // Stats tab
  const [stats, setStats] = useState<MemoryStats | null>(null);

  // ── Load data ───────────────────────────────────────────────────────────
  const loadMemories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/agent-memory?limit=30&${memSearch ? `&search=${encodeURIComponent(memSearch)}` : ""}`);
      const d = await res.json();
      setMemories(d.memories ?? []);
      setMemTotal(d.total ?? 0);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, [memSearch]);

  const loadInsights = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/agent-memory/evolution/insights");
      const d = await res.json();
      setInsights(d.insights ?? []);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  const loadErrors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/agent-memory/errors");
      const d = await res.json();
      setErrors(d.patterns ?? []);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/agent-memory/stats");
      const d = await res.json();
      setStats(d);
    } catch { /* non-fatal */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (tab === "memory")   loadMemories();
    if (tab === "insights") loadInsights();
    if (tab === "errors")   loadErrors();
    if (tab === "stats")    loadStats();
  }, [tab, loadMemories, loadInsights, loadErrors, loadStats]);

  // Reload on search change
  useEffect(() => {
    if (tab === "memory") {
      const t = setTimeout(loadMemories, 400);
      return () => clearTimeout(t);
    }
  }, [memSearch, tab, loadMemories]);

  // Load stats always for header
  useEffect(() => { loadStats(); }, [loadStats]);

  const deleteMemory = useCallback(async (id: string) => {
    await authFetch(`/api/agent-memory/${id}`, { method: "DELETE" }).catch(() => {});
    setMemories(prev => prev.filter(m => m.id !== id));
  }, []);

  const reload = useCallback(() => {
    if (tab === "memory")   loadMemories();
    if (tab === "insights") loadInsights();
    if (tab === "errors")   loadErrors();
    if (tab === "stats")    loadStats();
  }, [tab, loadMemories, loadInsights, loadErrors, loadStats]);

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-black/95 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#22d3ee] flex items-center justify-center">
          <Brain className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-wide">AGENT EVOLUTION DASHBOARD</div>
          <div className="text-[10px] text-white/40 uppercase tracking-widest">Persistent Memory · Insights · Error Patterns</div>
        </div>
        <div className="flex-1" />

        {/* Quick stats */}
        {stats && (
          <div className="flex gap-3">
            <div className="text-center px-3 py-1 rounded-lg bg-white/5 border border-white/10">
              <div className="text-sm font-bold text-white">{stats.total}</div>
              <div className="text-[9px] text-white/40">ذاكرة</div>
            </div>
            <div className="text-center px-3 py-1 rounded-lg bg-[#8b5cf6]/10 border border-[#8b5cf6]/20">
              <div className="text-sm font-bold text-[#8b5cf6]">{stats.insights_count}</div>
              <div className="text-[9px] text-white/40">رؤية</div>
            </div>
            <div className="text-center px-3 py-1 rounded-lg bg-[#f97316]/10 border border-[#f97316]/20">
              <div className="text-sm font-bold text-[#f97316]">{stats.error_patterns_count}</div>
              <div className="text-[9px] text-white/40">خطأ</div>
            </div>
          </div>
        )}

        <button onClick={reload} className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/40 hover:text-white">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white transition p-1">✕</button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-3 pb-0 shrink-0 border-b border-white/10">
        {([
          { id: "memory",   label: "الذاكرة",       icon: Database },
          { id: "insights", label: "رؤى التطور",    icon: Dna },
          { id: "errors",   label: "أنماط الأخطاء", icon: AlertTriangle },
          { id: "stats",    label: "الإحصاءات",     icon: BarChart3 },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-lg text-xs font-medium transition -mb-px border-b-2 ${
              tab === id
                ? "bg-white/5 text-white border-[#8b5cf6]"
                : "text-white/40 hover:text-white/60 border-transparent"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {/* ── MEMORY TAB ── */}
        {tab === "memory" && (
          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-3">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10">
                <Search className="w-4 h-4 text-white/30" />
                <input
                  value={memSearch}
                  onChange={e => setMemSearch(e.target.value)}
                  placeholder="ابحث في الذاكرة..."
                  className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none"
                />
              </div>
              <div className="text-xs text-white/30 flex items-center px-3">
                {memTotal} إجمالي
              </div>
            </div>

            {loading && memories.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-white/30" />
              </div>
            )}

            {!loading && memories.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Database className="w-10 h-10 text-white/20" />
                <div className="text-white/40 text-sm">لا توجد ذكريات بعد</div>
                <div className="text-white/25 text-xs">تظهر هنا بعد تشغيل Swarm أو Autonomous Agent</div>
              </div>
            )}

            <div className="space-y-3">
              {memories.map(mem => (
                <motion.div
                  key={mem.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
                >
                  <div
                    className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/3 transition"
                    onClick={() => setExpanded(expanded === mem.id ? null : mem.id)}
                  >
                    {/* Agent icon */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ backgroundColor: agentColor(mem.agent) + "20", border: `1px solid ${agentColor(mem.agent)}40` }}
                    >
                      <Bot className="w-3.5 h-3.5" style={{ color: agentColor(mem.agent) }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/80 font-medium truncate">{mem.goal}</div>
                      <div className="text-xs text-white/45 mt-0.5 line-clamp-1">{mem.summary}</div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 text-white/40">{mem.agent}</span>
                        {mem.model && <span className="text-[10px] text-white/30">{mem.model}</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${mem.success ? "bg-[#10b981]/15 text-[#10b981]" : "bg-[#e21227]/15 text-[#e21227]"}`}>
                          {mem.success ? "نجح" : "فشل"}
                        </span>
                        {mem.use_count > 0 && (
                          <span className="text-[10px] text-white/25">استُخدم {mem.use_count} مرة</span>
                        )}
                        <div className="flex items-center gap-0.5 ml-auto">
                          {Array.from({ length: Math.min(mem.importance, 10) }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-2.5 h-2.5 ${i < mem.importance ? "text-[#fbbf24]" : "text-white/10"}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {expanded === mem.id
                        ? <ChevronDown className="w-4 h-4 text-white/30" />
                        : <ChevronRight className="w-4 h-4 text-white/30" />
                      }
                      <button
                        onClick={e => { e.stopPropagation(); deleteMemory(mem.id); }}
                        className="p-1 text-white/20 hover:text-[#e21227] transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  {mem.tags && mem.tags.length > 0 && (
                    <div className="px-4 pb-2 flex flex-wrap gap-1">
                      {mem.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-white/35 border border-white/10">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Expanded timestamp */}
                  <AnimatePresence>
                    {expanded === mem.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="px-4 pb-3 border-t border-white/8 pt-3"
                      >
                        <div className="flex items-center gap-2 text-[10px] text-white/30 mb-2">
                          <Clock className="w-3 h-3" />
                          {new Date(mem.created_at).toLocaleString("ar-SA")}
                          {mem.iteration > 1 && <span>· {mem.iteration} دورات</span>}
                        </div>
                        <div className="text-xs text-white/55 leading-relaxed font-mono bg-black/30 rounded-lg p-3">
                          {mem.summary || "لا يوجد ملخص"}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── INSIGHTS TAB ── */}
        {tab === "insights" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Dna className="w-4 h-4 text-[#8b5cf6]" />
              <span className="text-sm font-semibold text-white">رؤى التطور المتراكمة</span>
              <span className="ml-auto text-xs text-white/30">{insights.length} رؤية</span>
            </div>

            {loading && insights.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-white/30" />
              </div>
            )}

            {!loading && insights.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Dna className="w-10 h-10 text-white/20" />
                <div className="text-white/40 text-sm">لا توجد رؤى بعد</div>
                <div className="text-white/25 text-xs">تظهر بعد تفعيل Self-Improve في Swarm Evolution</div>
              </div>
            )}

            {/* Timeline */}
            <div className="relative">
              {insights.length > 0 && (
                <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gradient-to-b from-[#8b5cf6]/40 to-transparent" />
              )}
              <div className="space-y-4 pl-10">
                {insights.map((ins, i) => (
                  <motion.div
                    key={ins.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="relative"
                  >
                    {/* Timeline dot */}
                    <div
                      className="absolute -left-10 top-2.5 w-5 h-5 rounded-full flex items-center justify-center border-2 border-black"
                      style={{ backgroundColor: agentColor(ins.agent) }}
                    >
                      <div className="w-2 h-2 rounded-full bg-white/60" />
                    </div>

                    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <p className="text-sm text-white/80 leading-relaxed">{ins.insight}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                              style={{ backgroundColor: agentColor(ins.agent) + "20", color: agentColor(ins.agent) }}
                            >
                              {ins.agent}
                            </span>
                            {ins.model && <span className="text-[10px] text-white/30">{ins.model}</span>}
                            <div className="flex items-center gap-1 ml-auto">
                              <TrendingUp className="w-3 h-3 text-[#8b5cf6]" />
                              <span className="text-[10px] text-[#8b5cf6] font-bold">{ins.impact_score}/10</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Impact bar */}
                      <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#22d3ee] transition-all"
                          style={{ width: `${(ins.impact_score / 10) * 100}%` }}
                        />
                      </div>

                      <div className="flex items-center gap-2 mt-2 text-[9px] text-white/25">
                        <Clock className="w-3 h-3" />
                        {new Date(ins.created_at).toLocaleString("ar-SA")}
                        {ins.applied_count > 0 && <span>· طُبّق {ins.applied_count} مرة</span>}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ERRORS TAB ── */}
        {tab === "errors" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-[#f97316]" />
              <span className="text-sm font-semibold text-white">أنماط الأخطاء المكتشفة</span>
              <span className="ml-auto text-xs text-white/30">{errors.length} نمط</span>
            </div>

            {loading && errors.length === 0 && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-white/30" />
              </div>
            )}

            {!loading && errors.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Shield className="w-10 h-10 text-white/20" />
                <div className="text-white/40 text-sm">لا توجد أنماط أخطاء مسجّلة</div>
                <div className="text-white/25 text-xs">تظهر تلقائياً عند اكتشاف أخطاء متكررة</div>
              </div>
            )}

            <div className="space-y-3">
              {errors.map((err, i) => (
                <motion.div
                  key={err.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-[#f97316]/20 bg-[#f97316]/5 overflow-hidden"
                >
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-md bg-[#f97316]/20 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-[#f97316]" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-white/80 font-medium">نمط الخطأ</div>
                        <pre className="text-xs text-[#f97316]/80 mt-1 whitespace-pre-wrap font-mono leading-relaxed bg-black/20 rounded-lg p-2.5">
                          {err.pattern}
                        </pre>
                      </div>
                      <div className="text-center px-3 py-1 rounded-lg bg-[#f97316]/15 border border-[#f97316]/25 shrink-0">
                        <div className="text-sm font-bold text-[#f97316]">{err.occurrence_count}</div>
                        <div className="text-[9px] text-white/40">تكرار</div>
                      </div>
                    </div>

                    {err.solution && (
                      <div className="mt-3 border-t border-[#f97316]/15 pt-3">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <CheckCircle2 className="w-3 h-3 text-[#10b981]" />
                          <span className="text-[10px] text-[#10b981] font-medium uppercase tracking-wider">الحل المقترح</span>
                        </div>
                        <p className="text-xs text-white/60 leading-relaxed">{err.solution}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-[9px] text-white/25">
                      {err.model && <span>{err.model}</span>}
                      <Clock className="w-3 h-3" />
                      <span>آخر رصد: {new Date(err.last_seen).toLocaleString("ar-SA")}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── STATS TAB ── */}
        {tab === "stats" && (
          <div className="space-y-6">
            <div className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[#22d3ee]" />
              إحصاءات نظام ذاكرة الوكيل
            </div>

            {loading && !stats && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-white/30" />
              </div>
            )}

            {stats && (
              <>
                {/* Main metrics */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: "إجمالي الذكريات",   value: stats.total,                color: "#22d3ee", icon: Database },
                    { label: "ناجحة",              value: stats.successful,           color: "#10b981", icon: CheckCircle2 },
                    { label: "فاشلة",              value: stats.failed,               color: "#e21227", icon: XCircle },
                    { label: "رؤى التطور",         value: stats.insights_count,       color: "#8b5cf6", icon: Dna },
                    { label: "أنماط الأخطاء",      value: stats.error_patterns_count, color: "#f97316", icon: AlertTriangle },
                    { label: "معدل النجاح",
                      value: stats.total > 0 ? `${Math.round((stats.successful / stats.total) * 100)}%` : "0%",
                      color: "#fbbf24", icon: TrendingUp },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="rounded-xl border bg-white/5 p-4 text-center"
                      style={{ borderColor: color + "30" }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2"
                        style={{ backgroundColor: color + "20" }}
                      >
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="text-2xl font-bold text-white">{value}</div>
                      <div className="text-[10px] text-white/40 mt-0.5">{label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Success rate bar */}
                {stats.total > 0 && (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-white">معدل النجاح الإجمالي</span>
                      <span className="text-sm font-bold text-[#10b981]">
                        {Math.round((stats.successful / stats.total) * 100)}%
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-white/5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(stats.successful / stats.total) * 100}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="h-full rounded-full bg-gradient-to-r from-[#10b981] to-[#22d3ee]"
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[10px] text-white/30">
                      <span>{stats.successful} نجحت</span>
                      <span>{stats.failed} فشلت</span>
                    </div>
                  </div>
                )}

                {/* Evolution health */}
                <div className="rounded-xl border border-[#8b5cf6]/20 bg-[#8b5cf6]/5 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-[#8b5cf6]" />
                    <span className="text-sm font-semibold text-white">صحة نظام التطور</span>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      {
                        label: "الذاكرة التراكمية",
                        value: stats.total > 0 ? "مفعّلة" : "فارغة",
                        ok: stats.total > 0,
                      },
                      {
                        label: "رؤى التطور",
                        value: stats.insights_count > 0 ? `${stats.insights_count} رؤية متراكمة` : "لا توجد بعد",
                        ok: stats.insights_count > 0,
                      },
                      {
                        label: "كشف أنماط الأخطاء",
                        value: stats.error_patterns_count > 0 ? `${stats.error_patterns_count} نمط مكتشف` : "لا أنماط بعد",
                        ok: true,
                      },
                      {
                        label: "التحسين الذاتي",
                        value: stats.insights_count > 0 ? "يعمل" : "بانتظار البيانات",
                        ok: stats.insights_count > 0,
                      },
                    ].map(({ label, value, ok }) => (
                      <div key={label} className="flex items-center gap-3">
                        {ok
                          ? <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0" />
                          : <div className="w-4 h-4 rounded-full border border-white/20 shrink-0" />
                        }
                        <span className="text-xs text-white/60 flex-1">{label}</span>
                        <span className={`text-[10px] font-medium ${ok ? "text-[#10b981]" : "text-white/30"}`}>{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
