// ─────────────────────────────────────────────────────────────────────────────
//  AGENT ORCHESTRATOR HUD — Real-time Multi-Agent Execution UI (System 3 UI)
//  يعرض خطة DAG والوكلاء النشطة والتقدم الحي في واجهة قابلة للطي
//  قاعدة: لا حذف، لا تعديل للكود القائم — إضافة فقط.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Network, Play, CheckCircle, XCircle, Loader2,
  ChevronDown, ChevronUp, SkipForward, Clock, AlertTriangle,
  Brain, Cpu, Eye, Layers,
} from "lucide-react";
import {
  onOrchestrationEvent,
  getActivePlan,
  getPlanHistory,
  type DAGPlan,
  type AgentNode,
  type OrchestrationEvent,
} from "@/lib/multiAgentOrchestrator";

// ── أيقونة الدور ──────────────────────────────────────────────────────────────
function RoleIcon({ role, className = "w-3.5 h-3.5" }: { role: AgentNode["role"]; className?: string }) {
  switch (role) {
    case "planner": return <Brain className={className} />;
    case "executor": return <Cpu className={className} />;
    case "reviewer": return <Eye className={className} />;
    case "synthesizer": return <Layers className={className} />;
  }
}

// ── لون الحالة ────────────────────────────────────────────────────────────────
function statusColor(status: AgentNode["status"]): string {
  switch (status) {
    case "pending": return "text-muted-foreground";
    case "running": return "text-amber-400";
    case "done": return "text-emerald-400";
    case "error": return "text-red-400";
    case "skipped": return "text-zinc-500";
    case "waiting_approval": return "text-violet-400";
  }
}

function StatusIcon({ status }: { status: AgentNode["status"] }) {
  switch (status) {
    case "pending": return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    case "running": return <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />;
    case "done": return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
    case "error": return <XCircle className="w-3.5 h-3.5 text-red-400" />;
    case "skipped": return <SkipForward className="w-3.5 h-3.5 text-zinc-500" />;
    case "waiting_approval": return <AlertTriangle className="w-3.5 h-3.5 text-violet-400" />;
  }
}

// ── بطاقة عُقدة واحدة ─────────────────────────────────────────────────────────
function NodeCard({ node }: { node: AgentNode }) {
  const [expanded, setExpanded] = useState(false);
  const hasOutput = node.output !== undefined || node.error !== undefined;
  const outputStr = node.error
    ? node.error.slice(0, 300)
    : typeof node.output === "string"
    ? node.output.slice(0, 300)
    : node.output
    ? JSON.stringify(node.output).slice(0, 300)
    : "";
  const duration = node.startedAt && node.finishedAt
    ? `${((node.finishedAt - node.startedAt) / 1000).toFixed(1)}s`
    : null;

  return (
    <div
      className={`rounded-lg border transition-all ${
        node.status === "running"
          ? "border-amber-500/40 bg-amber-500/5 shadow-[0_0_8px_rgba(251,191,36,0.15)]"
          : node.status === "done"
          ? "border-emerald-500/20 bg-emerald-500/5"
          : node.status === "error"
          ? "border-red-500/30 bg-red-500/5"
          : "border-border/40 bg-card/30"
      } p-2.5`}
    >
      <div className="flex items-center gap-2">
        <div className={`shrink-0 ${statusColor(node.status)}`}>
          <RoleIcon role={node.role} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <StatusIcon status={node.status} />
            <span className="text-[11px] font-semibold text-foreground truncate">
              {node.label}
            </span>
          </div>
          {node.toolId && (
            <span className="text-[9px] font-mono text-muted-foreground/60">
              {node.toolId}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {duration && (
            <span className="text-[9px] font-mono text-muted-foreground">{duration}</span>
          )}
          {node.retries > 0 && (
            <span className="text-[9px] font-mono text-amber-400/70">×{node.retries}</span>
          )}
          {hasOutput && (
            <button onClick={() => setExpanded((v) => !v)} className="text-muted-foreground hover:text-foreground transition-colors">
              {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          )}
        </div>
      </div>

      {/* Output */}
      <AnimatePresence>
        {expanded && outputStr && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <pre className={`mt-2 text-[9px] font-mono leading-relaxed p-2 rounded-md bg-background/80 border border-border/40 overflow-x-auto whitespace-pre-wrap break-all ${node.error ? "text-red-300" : "text-muted-foreground"}`}>
              {outputStr}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── لوحة خطة DAG واحدة ────────────────────────────────────────────────────────
function PlanPanel({ plan }: { plan: DAGPlan }) {
  const [collapsed, setCollapsed] = useState(false);
  const doneCount = plan.nodes.filter((n) => n.status === "done").length;
  const errCount = plan.nodes.filter((n) => n.status === "error").length;
  const runningCount = plan.nodes.filter((n) => n.status === "running").length;
  const totalCount = plan.nodes.length;
  const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer hover:bg-accent/20 transition-colors select-none"
        onClick={() => setCollapsed((v) => !v)}
      >
        <Network className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-foreground truncate">{plan.goal.slice(0, 80)}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="h-1 flex-1 bg-border/60 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  errCount > 0 ? "bg-gradient-to-r from-amber-500 to-red-500" : "bg-gradient-to-r from-primary to-emerald-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-[9px] font-mono text-muted-foreground shrink-0">
              {doneCount}/{totalCount}
              {runningCount > 0 && <span className="text-amber-400"> · {runningCount} running</span>}
              {errCount > 0 && <span className="text-red-400"> · {errCount} failed</span>}
            </span>
          </div>
        </div>
        <div className={`shrink-0 transition-colors ${
          plan.status === "done" ? "text-emerald-400" :
          plan.status === "error" ? "text-red-400" :
          plan.status === "executing" ? "text-amber-400" : "text-muted-foreground"
        }`}>
          {plan.status === "executing" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : plan.status === "done" ? (
            <CheckCircle className="w-4 h-4" />
          ) : plan.status === "error" ? (
            <XCircle className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </div>
        {collapsed ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>

      {/* Nodes */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-1.5 max-h-64 overflow-y-auto">
              {plan.nodes.map((node) => (
                <NodeCard key={node.id} node={node} />
              ))}
            </div>
            {plan.summary && plan.status === "done" && (
              <div className="px-3 pb-3">
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-2">
                  <p className="text-[10px] font-semibold text-emerald-400 mb-1">Summary</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {plan.summary.slice(0, 400)}
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── الكومبوننت الرئيسي ─────────────────────────────────────────────────────────
export function AgentOrchestratorHUD() {
  const [plans, setPlans] = useState<DAGPlan[]>([]);
  const [open, setOpen] = useState(false);
  const [hasActive, setHasActive] = useState(false);

  const refresh = useCallback(() => {
    const history = getPlanHistory();
    setPlans([...history].reverse().slice(0, 5));
    setHasActive(!!getActivePlan());
  }, []);

  useEffect(() => {
    refresh();
    const unsub = onOrchestrationEvent((e: OrchestrationEvent) => {
      refresh();
      if (e.type === "plan_created" || e.type === "node_start") {
        setOpen(true);
      }
    });
    return unsub;
  }, [refresh]);

  if (plans.length === 0) return null;

  return (
    <div className="fixed bottom-[140px] left-4 z-[9990] w-[340px] max-w-[calc(100vw-2rem)]">
      {/* Toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full border text-[11px] font-semibold transition-all shadow-lg ${
          hasActive
            ? "bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-amber-500/10"
            : "bg-card/80 border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        <Network className={`w-3.5 h-3.5 ${hasActive ? "text-amber-400 animate-pulse" : ""}`} />
        Multi-Agent
        {hasActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />}
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
      </button>

      {/* Plans panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mt-2 space-y-2 max-h-[60vh] overflow-y-auto"
          >
            {plans.map((plan) => (
              <PlanPanel key={plan.id} plan={plan} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
