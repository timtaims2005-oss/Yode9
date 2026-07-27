/**
 * QueueStatusBadge — مؤشر حالة طابور BullMQ أثناء معالجة الطلب
 * يُعرض أثناء streaming ليوضح أن الطلب يُعالج في الخلفية
 */
import { motion, AnimatePresence } from "framer-motion";
import { Cpu, Zap, CheckCircle2, Clock } from "lucide-react";

export type QueuePhase =
  | "idle"
  | "queued"        // انتظار الدور في BullMQ
  | "processing"    // يُعالج الآن
  | "streaming"     // ردّ يتدفق
  | "cached"        // استُرجع من Redis Cache
  | "done";         // اكتمل

interface Props {
  phase: QueuePhase;
  tps?: number | null;        // tokens per second during streaming
  jobMode?: "bullmq" | "inprocess" | null;
  className?: string;
}

const PHASE_CONFIG: Record<QueuePhase, { label: string; color: string; pulse: boolean }> = {
  idle:       { label: "",               color: "#71717a", pulse: false },
  queued:     { label: "في الطابور…",    color: "#f59e0b", pulse: true  },
  processing: { label: "يُعالج في الخلفية", color: "#3b82f6", pulse: true  },
  streaming:  { label: "يتدفق…",         color: "#10b981", pulse: true  },
  cached:     { label: "من الـ Cache ⚡",  color: "#8b5cf6", pulse: false },
  done:       { label: "اكتمل",          color: "#10b981", pulse: false },
};

export function QueueStatusBadge({ phase, tps, jobMode, className = "" }: Props) {
  if (phase === "idle") return null;

  const { label, color, pulse } = PHASE_CONFIG[phase];

  return (
    <AnimatePresence>
      <motion.div
        key={phase}
        initial={{ opacity: 0, y: 4, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -4, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium select-none ${className}`}
        style={{
          background: `${color}14`,
          border: `1px solid ${color}28`,
          color,
        }}
      >
        {/* Icon */}
        {phase === "queued" && <Clock size={11} className={pulse ? "animate-pulse" : ""} />}
        {phase === "processing" && <Cpu size={11} className="animate-pulse" />}
        {phase === "streaming" && <Zap size={11} className="animate-pulse" />}
        {phase === "cached" && <Zap size={11} />}
        {phase === "done" && <CheckCircle2 size={11} />}

        {/* Label */}
        <span>{label}</span>

        {/* TPS */}
        {phase === "streaming" && tps !== null && tps !== undefined && tps > 0 && (
          <span className="opacity-70">{tps.toFixed(0)} tok/s</span>
        )}

        {/* Mode badge */}
        {jobMode === "bullmq" && phase !== "cached" && (
          <span className="text-[9px] opacity-60 font-normal">BullMQ</span>
        )}

        {/* Animated dot */}
        {pulse && (
          <span className="relative w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full animate-ping" style={{ background: color, opacity: 0.5 }} />
            <span className="absolute inset-0 rounded-full" style={{ background: color }} />
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
