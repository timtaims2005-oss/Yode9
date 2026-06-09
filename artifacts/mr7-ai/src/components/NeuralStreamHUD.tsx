import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Activity, Cpu } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   NEURAL STREAM HUD  — live inline badge shown while AI streams
   content (after first token). Shows TPS sparkline, token count,
   phase label, and a pulsing energy bar.
═══════════════════════════════════════════════════════════════ */

const PHASES = [
  { label: "DECODE",    color: "#e21227" },
  { label: "GENERATE",  color: "#a78bfa" },
  { label: "FORMULATE", color: "#00e5ff" },
  { label: "OUTPUT",    color: "#22c55e" },
  { label: "STREAM",    color: "#f59e0b" },
];

/* mini spark canvas */
function SparkCanvas({ samples, color }: { samples: number[]; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const W = 52, H = 16;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, W, H);
    if (samples.length < 2) return;

    const max = Math.max(...samples, 1);
    ctx.beginPath();
    samples.forEach((v, i) => {
      const x = (i / (samples.length - 1)) * W;
      const y = H - (v / max) * H * 0.85;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Fill
    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `${color}40`); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fill();
  }, [samples, color]);

  return <canvas ref={ref} width={W} height={H} style={{ display: "block" }} />;
}

interface Props { tps?: number; tokenCount?: number; agentMode?: boolean }

export function NeuralStreamHUD({ tps = 0, tokenCount = 0, agentMode = false }: Props) {
  const [phase, setPhase] = useState(0);
  const [sparkSamples, setSparkSamples] = useState<number[]>([0]);

  useEffect(() => {
    setSparkSamples(prev => {
      const next = [...prev, tps].slice(-24);
      return next;
    });
  }, [tps]);

  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 1) % PHASES.length), 1800);
    return () => clearInterval(id);
  }, []);

  const cur = PHASES[phase];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.85, y: 4 }}
      animate={{ opacity: 1, scale: 1,    y: 0 }}
      exit={{    opacity: 0, scale: 0.85, y: 4 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        verticalAlign: "middle",
        marginLeft: "6px",
        borderRadius: "8px",
        background: "rgba(6,6,12,0.92)",
        border: `1px solid ${cur.color}28`,
        boxShadow: `0 0 16px ${cur.color}12, inset 0 0 8px rgba(0,0,0,0.4)`,
        padding: "3px 8px 3px 6px",
        backdropFilter: "blur(8px)",
      }}
    >
      {/* Pulsing dot */}
      <motion.div
        animate={{ opacity: [1, 0.3, 1], scale: [1, 1.3, 1] }}
        transition={{ duration: 0.7, repeat: Infinity }}
        style={{ width: 5, height: 5, borderRadius: "50%", background: cur.color, boxShadow: `0 0 6px ${cur.color}`, flexShrink: 0 }}
      />

      {/* Phase label */}
      <AnimatePresence mode="wait">
        <motion.span
          key={phase}
          initial={{ opacity: 0, y: -3 }}
          animate={{ opacity: 1, y: 0  }}
          exit={{    opacity: 0, y:  3 }}
          transition={{ duration: 0.18 }}
          style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 800, color: cur.color, letterSpacing: "0.8px" }}
        >
          {agentMode ? "EXEC" : cur.label}
        </motion.span>
      </AnimatePresence>

      {/* Separator */}
      <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.08)" }} />

      {/* Spark graph */}
      <SparkCanvas samples={sparkSamples} color={cur.color} />

      {/* Separator */}
      <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.08)" }} />

      {/* TPS */}
      <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
        <Zap style={{ width: 7, height: 7, color: "#22c55e" }} />
        <span style={{ fontSize: "8px", fontFamily: "monospace", color: "#22c55e", fontWeight: 700 }}>
          {tps}
        </span>
        <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)" }}>t/s</span>
      </div>

      {/* Token count */}
      {tokenCount > 0 && (
        <>
          <div style={{ width: 1, height: 10, background: "rgba(255,255,255,0.08)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <Cpu style={{ width: 7, height: 7, color: "rgba(255,255,255,0.3)" }} />
            <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.35)" }}>
              {tokenCount >= 1000 ? `${(tokenCount / 1000).toFixed(1)}K` : tokenCount}
            </span>
          </div>
        </>
      )}

      {/* Energy sweep */}
      <motion.div
        animate={{ x: ["-100%", "300%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          left: 0, top: 0, bottom: 0,
          width: "30%",
          background: `linear-gradient(90deg, transparent, ${cur.color}18, transparent)`,
          borderRadius: "8px",
          pointerEvents: "none",
        }}
      />
    </motion.span>
  );
}
