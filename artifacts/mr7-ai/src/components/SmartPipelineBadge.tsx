// ─────────────────────────────────────────────────────────────────────────────
//  SMART PIPELINE BADGE — Real-time UI Indicators for All 6 Systems
//  يعرض شارات تفاعلية حية توضح حالة الأنظمة الستة في الـ UI
//  مبني فوق البنية القائمة — إضافة خالصة.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Database, Shield, Network, Cpu, Zap,
  ChevronDown, ChevronUp, Info, CheckCircle,
} from "lucide-react";
import { getPipelineStats, type PipelineStats } from "@/lib/chatPipeline";
import { getMemorySummary } from "@/lib/memoryExtractor";
import { getTaskRunnerStats } from "@/lib/agentTaskRunner";

// ── شارة حالة الذاكرة (System 4 — STM + LTM) ────────────────────────────────

export function MemoryStatusBadge({ compact = false }: { compact?: boolean }) {
  const [summary, setSummary] = useState(() => getMemorySummary());

  useEffect(() => {
    const id = setInterval(() => {
      setSummary(getMemorySummary());
    }, 5000);
    return () => clearInterval(id);
  }, []);

  const hasFacts = summary.totalFacts > 0;
  const hasRecent = summary.recentToolIds.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${
        hasFacts
          ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
          : "bg-zinc-800/60 border-zinc-700/40 text-zinc-500"
      }`}
    >
      <Brain className="w-3 h-3" />
      {compact ? (
        <span>{summary.totalFacts}F</span>
      ) : (
        <>
          <span>Memory</span>
          <span className="opacity-60">
            {summary.totalFacts}F · {summary.sessionMessages}M
          </span>
          {hasRecent && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
        </>
      )}
    </motion.div>
  );
}

// ── شارة الأدوات المُصفَّاة (System 1 — Tool Router) ─────────────────────────

export function FilteredToolsBadge({
  filteredCount,
  totalCount,
  compact = false,
}: {
  filteredCount: number;
  totalCount: number;
  compact?: boolean;
}) {
  if (totalCount === 0) return null;

  const ratio = totalCount > 0 ? filteredCount / totalCount : 0;
  const isEfficient = ratio < 0.2; // أقل من 20% من الأدوات

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${
        isEfficient
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          : "bg-amber-500/10 border-amber-500/30 text-amber-300"
      }`}
    >
      <Zap className="w-3 h-3" />
      {compact ? (
        <span>{filteredCount}/{totalCount}</span>
      ) : (
        <>
          <span>Tools</span>
          <span className="opacity-70">{filteredCount}/{totalCount}</span>
          {isEfficient && <CheckCircle className="w-2.5 h-2.5 opacity-70" />}
        </>
      )}
    </motion.div>
  );
}

// ── شارة حالة وكلاء المهام (System 3 — Multi-Agent) ──────────────────────────

export function AgentStatusBadge({ compact = false }: { compact?: boolean }) {
  const [stats, setStats] = useState(() => getTaskRunnerStats());

  useEffect(() => {
    const id = setInterval(() => setStats(getTaskRunnerStats()), 3000);
    return () => clearInterval(id);
  }, []);

  if (stats.totalTasks === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold border bg-blue-500/10 border-blue-500/30 text-blue-300"
    >
      <Network className="w-3 h-3" />
      {compact ? (
        <span>{stats.multiAgentTasks}A</span>
      ) : (
        <>
          <span>Agents</span>
          <span className="opacity-70">
            {stats.multiAgentTasks} tasks · {Math.round(stats.successRate * 100)}%
          </span>
        </>
      )}
    </motion.div>
  );
}

// ── شارة Pipeline الكاملة (تجمع كل الأنظمة) ────────────────────────────────

export function PipelineStatusBadge({
  filteredTools = 0,
  totalTools = 0,
}: {
  filteredTools?: number;
  totalTools?: number;
}) {
  const [stats, setStats] = useState<PipelineStats | null>(null);
  const [expanded, setExpanded] = useState(false);

  const refresh = useCallback(() => {
    try {
      setStats(getPipelineStats());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 4000);
    return () => clearInterval(id);
  }, [refresh]);

  const memSummary = getMemorySummary();
  const hasActivity = (stats?.totalToolExecutions ?? 0) > 0 || memSummary.totalFacts > 0;

  if (!hasActivity && filteredTools === 0) return null;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all shadow-sm ${
          hasActivity
            ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
            : "bg-zinc-800/60 border-zinc-700/40 text-zinc-400 hover:text-zinc-200"
        }`}
      >
        <Cpu className="w-3 h-3" />
        <span>Pipeline</span>
        {filteredTools > 0 && (
          <span className="text-emerald-400 opacity-80">{filteredTools}T</span>
        )}
        {memSummary.totalFacts > 0 && (
          <span className="text-violet-400 opacity-80">{memSummary.totalFacts}F</span>
        )}
        {expanded ? <ChevronUp className="w-2.5 h-2.5 opacity-60" /> : <ChevronDown className="w-2.5 h-2.5 opacity-60" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute bottom-full mb-2 right-0 w-56 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-3 space-y-2 z-50"
          >
            <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-primary" />
              Smart Pipeline Status
            </p>

            {/* Tool Router */}
            <PipelineRow
              icon={<Zap className="w-3 h-3 text-amber-400" />}
              label="Tool Router"
              value={filteredTools > 0 ? `${filteredTools}/${totalTools} tools` : "Active"}
              color="text-amber-300"
            />

            {/* Schema Validator */}
            <PipelineRow
              icon={<Shield className="w-3 h-3 text-emerald-400" />}
              label="Schema Validator"
              value={stats?.totalToolExecutions ? `${stats.totalToolExecutions} execs` : "Ready"}
              color="text-emerald-300"
            />

            {/* Multi-Agent */}
            <PipelineRow
              icon={<Network className="w-3 h-3 text-blue-400" />}
              label="Multi-Agent"
              value={`${getTaskRunnerStats().multiAgentTasks} tasks`}
              color="text-blue-300"
            />

            {/* Memory */}
            <PipelineRow
              icon={<Brain className="w-3 h-3 text-violet-400" />}
              label="Memory"
              value={`${memSummary.totalFacts}F · ${memSummary.sessionMessages}M`}
              color="text-violet-300"
            />

            {/* Approval Gate */}
            <PipelineRow
              icon={<Shield className="w-3 h-3 text-orange-400" />}
              label="Approval Gate"
              value="Active"
              color="text-orange-300"
            />

            {/* LTM Top Tools */}
            {stats?.topTools && stats.topTools.length > 0 && (
              <div className="pt-1.5 border-t border-border/50">
                <p className="text-[9px] text-muted-foreground mb-1 flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" />
                  Frequently Used
                </p>
                {stats.topTools.slice(0, 3).map((t) => (
                  <div key={t.toolId} className="flex items-center justify-between text-[9px]">
                    <span className="font-mono text-muted-foreground truncate max-w-[130px]">{t.toolId}</span>
                    <span className="text-emerald-400 shrink-0">{t.count}×</span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-1 border-t border-border/50">
              <p className="text-[9px] text-muted-foreground flex items-center gap-1">
                <Info className="w-2.5 h-2.5" />
                All 6 systems operational
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PipelineRow({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] text-muted-foreground">{label}</span>
      </div>
      <span className={`text-[10px] font-semibold ${color}`}>{value}</span>
    </div>
  );
}

// ── Overlay الكامل (يُركَّب في ChatView أو App) ──────────────────────────────

export function SmartPipelineOverlay({
  filteredTools = 0,
  totalTools = 0,
  showMemory = true,
  showAgents = true,
  position = "bottom-right",
}: {
  filteredTools?: number;
  totalTools?: number;
  showMemory?: boolean;
  showAgents?: boolean;
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}) {
  const positionClasses: Record<string, string> = {
    "bottom-right": "bottom-20 right-4",
    "bottom-left":  "bottom-20 left-4",
    "top-right":    "top-4 right-4",
    "top-left":     "top-4 left-4",
  };

  return (
    <div
      className={`fixed ${positionClasses[position]} z-[9800] flex flex-col items-end gap-1.5 pointer-events-none`}
    >
      <div className="flex flex-wrap gap-1.5 justify-end pointer-events-auto">
        {filteredTools > 0 && (
          <FilteredToolsBadge filteredCount={filteredTools} totalCount={totalTools} />
        )}
        {showMemory && <MemoryStatusBadge />}
        {showAgents && <AgentStatusBadge />}
        <PipelineStatusBadge filteredTools={filteredTools} totalTools={totalTools} />
      </div>
    </div>
  );
}
