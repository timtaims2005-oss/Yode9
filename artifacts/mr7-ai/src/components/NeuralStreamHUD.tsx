import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Cpu, Radio } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   NEURAL STREAM HUD  v2 — live inline badge shown while AI streams
   content (after first token). Features:
     • 5-phase rotating label (DECODE → GENERATE → FORMULATE → OUTPUT → STREAM)
     • TPS sparkline with glow fill
     • Radar sweep canvas (rotating arm + concentric rings)
     • Particle trail that spawns dots along the sweep arm
     • Token counter with KB shorthand
     • Energy shimmer sweep
═══════════════════════════════════════════════════════════════ */

const PHASES = [
  { label: "DECODE",    color: "#e21227" },
  { label: "GENERATE",  color: "#a78bfa" },
  { label: "FORMULATE", color: "#00e5ff" },
  { label: "OUTPUT",    color: "#22c55e" },
  { label: "STREAM",    color: "#f59e0b" },
];

/* ── Spark sparkline canvas ─────────────────────────────────── */
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

    ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `${color}40`); g.addColorStop(1, "transparent");
    ctx.fillStyle = g; ctx.fill();
  }, [samples, color]);

  return <canvas ref={ref} width={W} height={H} style={{ display: "block" }} />;
}

/* ── Radar sweep canvas ─────────────────────────────────────── */
interface Particle { x: number; y: number; age: number; maxAge: number }

function RadarCanvas({ color, tps }: { color: string; tps: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const SIZE = 36;
  const CX = SIZE / 2, CY = SIZE / 2, R = SIZE / 2 - 2;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;

    const baseSpeed = 0.025 + Math.min(tps / 80, 1) * 0.06;

    function draw() {
      ctx.clearRect(0, 0, SIZE, SIZE);

      /* rings */
      [0.35, 0.65, 1].forEach(frac => {
        ctx.beginPath();
        ctx.arc(CX, CY, R * frac, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}22`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      });

      /* crosshairs */
      ctx.beginPath();
      ctx.moveTo(CX - R, CY); ctx.lineTo(CX + R, CY);
      ctx.moveTo(CX, CY - R); ctx.lineTo(CX, CY + R);
      ctx.strokeStyle = `${color}15`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      /* sweep arm */
      const arm = angleRef.current;
      /* trailing arc sweep fill */
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R, arm - Math.PI * 0.55, arm);
      ctx.closePath();
      ctx.fillStyle = `${color}18`;
      ctx.fill();

      /* sweep arm line */
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(CX + Math.cos(arm) * R, CY + Math.sin(arm) * R);
      ctx.strokeStyle = `${color}99`;
      ctx.lineWidth = 1;
      ctx.shadowColor = color;
      ctx.shadowBlur = 4;
      ctx.stroke();
      ctx.shadowBlur = 0;

      /* bright sweep tip */
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(CX + Math.cos(arm) * R, CY + Math.sin(arm) * R);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;
      ctx.stroke();
      ctx.shadowBlur = 0;

      /* spawn particle at tip occasionally */
      if (Math.random() < 0.25) {
        const px = CX + Math.cos(arm) * (R * (0.4 + Math.random() * 0.6));
        const py = CY + Math.sin(arm) * (R * (0.4 + Math.random() * 0.6));
        particlesRef.current.push({ x: px, y: py, age: 0, maxAge: 18 + Math.random() * 20 });
      }

      /* draw & age particles */
      particlesRef.current = particlesRef.current.filter(p => {
        const alpha = 1 - p.age / p.maxAge;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${Math.round(alpha * 200).toString(16).padStart(2, "0")}`;
        ctx.shadowColor = color;
        ctx.shadowBlur = 3;
        ctx.fill();
        ctx.shadowBlur = 0;
        p.age++;
        return p.age < p.maxAge;
      });

      /* center dot */
      ctx.beginPath();
      ctx.arc(CX, CY, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = 5;
      ctx.fill();
      ctx.shadowBlur = 0;

      angleRef.current = (angleRef.current + baseSpeed) % (Math.PI * 2);
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [color, tps]);

  return (
    <canvas
      ref={ref}
      width={SIZE}
      height={SIZE}
      style={{ display: "block", imageRendering: "pixelated" }}
    />
  );
}

/* ── Main HUD component ─────────────────────────────────────── */
interface Props {
  streaming?: boolean;
  tps?: number;
  tokenCount?: number;
  mode?: string;
  agentMode?: boolean;
}

export function NeuralStreamHUD({
  streaming: _streaming,
  tps = 0,
  tokenCount = 0,
  mode: _mode,
  agentMode = false,
}: Props) {
  const [phase, setPhase] = useState(0);
  const [sparkSamples, setSparkSamples] = useState<number[]>([0]);

  useEffect(() => {
    setSparkSamples(prev => [...prev, tps].slice(-28));
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
        background: "rgba(6,6,12,0.94)",
        border: `1px solid ${cur.color}30`,
        boxShadow: `0 0 18px ${cur.color}14, inset 0 0 10px rgba(0,0,0,0.5)`,
        padding: "3px 8px 3px 4px",
        backdropFilter: "blur(10px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Radar sweep canvas */}
      <div style={{ flexShrink: 0 }}>
        <RadarCanvas color={cur.color} tps={tps} />
      </div>

      {/* Vertical divider */}
      <div style={{ width: 1, height: 22, background: `${cur.color}20`, flexShrink: 0 }} />

      {/* Phase label + pulsing dot */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: 52 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <motion.div
            animate={{ opacity: [1, 0.2, 1], scale: [1, 1.4, 1] }}
            transition={{ duration: 0.7, repeat: Infinity }}
            style={{ width: 4, height: 4, borderRadius: "50%", background: cur.color, boxShadow: `0 0 5px ${cur.color}`, flexShrink: 0 }}
          />
          <AnimatePresence mode="wait">
            <motion.span
              key={phase}
              initial={{ opacity: 0, y: -3 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{    opacity: 0, y:  3 }}
              transition={{ duration: 0.18 }}
              style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 800, color: cur.color, letterSpacing: "0.8px" }}
            >
              {agentMode ? "EXEC" : cur.label}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Spark row */}
        <SparkCanvas samples={sparkSamples} color={cur.color} />
      </div>

      {/* Divider */}
      <div style={{ width: 1, height: 22, background: `${cur.color}20`, flexShrink: 0 }} />

      {/* TPS + Token stats */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <Cpu style={{ width: 7, height: 7, color: "rgba(255,255,255,0.3)" }} />
            <span style={{ fontSize: "7.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.35)" }}>
              {tokenCount >= 1000 ? `${(tokenCount / 1000).toFixed(1)}K` : tokenCount}
            </span>
          </div>
        )}

        {/* Radio indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <Radio style={{ width: 7, height: 7, color: `${cur.color}80` }} />
          <span style={{ fontSize: "7px", fontFamily: "monospace", color: `${cur.color}60`, letterSpacing: "0.5px" }}>LIVE</span>
        </div>
      </div>

      {/* Energy shimmer sweep */}
      <motion.div
        animate={{ x: ["-100%", "400%"] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.5 }}
        style={{
          position: "absolute",
          left: 0, top: 0, bottom: 0,
          width: "25%",
          background: `linear-gradient(90deg, transparent, ${cur.color}14, transparent)`,
          borderRadius: "8px",
          pointerEvents: "none",
        }}
      />
    </motion.span>
  );
}
