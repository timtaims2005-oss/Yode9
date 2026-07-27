// ─────────────────────────────────────────────────────────────────────────────
//  APPROVAL DIALOG — Human-in-the-Loop UI (System 5 — UI Layer)
//  يعرض نافذة تأكيد احترافية للأدوات ذات التأثير الحرج
//  قاعدة: لا حذف، لا تعديل للكود القائم — إضافة فقط.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, AlertTriangle, AlertOctagon, Info, CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from "lucide-react";
import {
  onApprovalRequest,
  resolveApproval,
  type ApprovalRequest,
} from "@/lib/approvalGate";

const RISK_CONFIG = {
  low: {
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: Info,
    label: "Low Risk",
    labelAr: "مخاطر منخفضة",
  },
  medium: {
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: AlertTriangle,
    label: "Medium Risk",
    labelAr: "مخاطر متوسطة",
  },
  high: {
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/30",
    icon: AlertTriangle,
    label: "High Risk",
    labelAr: "مخاطر عالية",
  },
  critical: {
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/40",
    icon: AlertOctagon,
    label: "Critical",
    labelAr: "حرج",
  },
};

function TimeoutBar({ timeoutMs, startedAt }: { timeoutMs: number; startedAt: number }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);
    return () => clearInterval(interval);
  }, [startedAt]);

  const pct = Math.min(100, (elapsed / timeoutMs) * 100);
  const remaining = Math.max(0, Math.round((timeoutMs - elapsed) / 1000));

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" /> Auto-reject in {remaining}s
        </span>
        <span className="text-[10px] text-muted-foreground">{Math.round(pct)}%</span>
      </div>
      <div className="h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all duration-100"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ApprovalCard({ request, onResolve }: {
  request: ApprovalRequest;
  onResolve: (id: string, approved: boolean) => void;
}) {
  const [showInput, setShowInput] = useState(false);
  const riskCfg = RISK_CONFIG[request.riskLevel];
  const Icon = riskCfg.icon;

  const inputStr = Object.entries(request.input)
    .map(([k, v]) => `${k}: ${typeof v === "string" ? v.slice(0, 80) : JSON.stringify(v).slice(0, 80)}`)
    .join("\n");

  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={`rounded-xl border ${riskCfg.border} ${riskCfg.bg} backdrop-blur-sm p-4 shadow-2xl`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-lg ${riskCfg.bg} border ${riskCfg.border} shrink-0`}>
          <Icon className={`w-5 h-5 ${riskCfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${riskCfg.border} ${riskCfg.color} ${riskCfg.bg}`}>
              {riskCfg.label}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">
              {request.toolId}
            </span>
          </div>
          <p className="text-sm font-semibold mt-1 text-foreground">
            Tool Approval Required
          </p>
          <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
            <Shield className="w-3 h-3 inline mr-1 opacity-70" />
            {request.riskReason}
          </p>
        </div>
      </div>

      {/* Tool Info */}
      <div className="rounded-lg bg-background/60 border border-border p-3 mb-3">
        <p className="text-[11px] font-semibold text-foreground mb-1">
          🔧 {request.toolName}
        </p>
        <p className="text-[11px] text-muted-foreground leading-snug">
          {request.toolDescription.slice(0, 200)}
        </p>

        {/* Input preview */}
        {inputStr && (
          <div className="mt-2">
            <button
              onClick={() => setShowInput((v) => !v)}
              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {showInput ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showInput ? "Hide" : "Show"} parameters
            </button>
            {showInput && (
              <pre className="mt-1.5 text-[10px] font-mono text-muted-foreground bg-background/80 rounded-md p-2 overflow-x-auto whitespace-pre-wrap break-all border border-border/50">
                {inputStr}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* Timeout bar */}
      <TimeoutBar timeoutMs={60_000} startedAt={request.createdAt} />

      {/* Action Buttons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onResolve(request.id, false)}
          className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border border-border bg-background/60 text-sm text-muted-foreground hover:text-foreground hover:border-red-500/40 hover:bg-red-500/5 transition-all"
        >
          <XCircle className="w-4 h-4 text-red-400" />
          Reject
        </button>
        <button
          onClick={() => onResolve(request.id, true)}
          className="flex-1 flex items-center justify-center gap-2 h-9 rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-sm text-emerald-300 hover:bg-emerald-500/20 hover:border-emerald-500/60 transition-all font-semibold"
        >
          <CheckCircle className="w-4 h-4" />
          Approve
        </button>
      </div>
    </motion.div>
  );
}

// ── الكومبوننت الرئيسي — يُعرض في ChatView ────────────────────────────────────
export function ApprovalGateOverlay() {
  const [queue, setQueue] = useState<ApprovalRequest[]>([]);

  useEffect(() => {
    const unsub = onApprovalRequest((req) => {
      setQueue((prev) => [...prev, req]);
    });
    return unsub;
  }, []);

  const handleResolve = (id: string, approved: boolean) => {
    resolveApproval(id, approved);
    setQueue((prev) => prev.filter((r) => r.id !== id));
  };

  if (queue.length === 0) return null;

  return (
    <div
      className="fixed bottom-[140px] right-4 z-[9999] w-[360px] max-w-[calc(100vw-2rem)] space-y-3"
      aria-live="polite"
      aria-label="Approval requests"
    >
      <AnimatePresence mode="sync">
        {queue.map((req) => (
          <ApprovalCard key={req.id} request={req} onResolve={handleResolve} />
        ))}
      </AnimatePresence>
    </div>
  );
}
