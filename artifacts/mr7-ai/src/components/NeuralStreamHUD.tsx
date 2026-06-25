import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Cpu, Radio } from "lucide-react";

const PHASES = [
  { label: "DECODE",    color: "#e21227" },
  { label: "GENERATE",  color: "#a78bfa" },
  { label: "FORMULATE", color: "#00e5ff" },
  { label: "OUTPUT",    color: "#22c55e" },
  { label: "STREAM",    color: "#f59e0b" },
];

/* ── Heartbeat / ECG wave canvas with traveling worm signal ─── */
function HeartbeatCanvas({ color, tps }: { color: string; tps: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);
  const rafRef = useRef<number>(0);
  const W = 60, H = 18;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;

    // Speed tied to TPS
    const speed = 0.04 + Math.min(tps / 60, 1) * 0.14;

    function ecgY(x: number, phase: number): number {
      const p = ((x / W + phase) % 1);
      if (p < 0.10) return H * 0.5 + Math.sin(p / 0.10 * Math.PI) * H * 0.12;
      if (p < 0.14) return H * 0.5 - Math.sin((p - 0.10) / 0.04 * Math.PI) * H * 0.42;
      if (p < 0.18) return H * 0.5 + Math.sin((p - 0.14) / 0.04 * Math.PI) * H * 0.55;
      if (p < 0.22) return H * 0.5 - Math.sin((p - 0.18) / 0.04 * Math.PI) * H * 0.22;
      if (p < 0.30) return H * 0.5 + Math.sin((p - 0.22) / 0.08 * Math.PI) * H * 0.10;
      return H * 0.5 + Math.sin(p * Math.PI * 3) * H * 0.04;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const phase = phaseRef.current;

      // Background glow fill under the wave
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x++) {
        ctx.lineTo(x, ecgY(x, phase));
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
      fillGrad.addColorStop(0, `${color}30`);
      fillGrad.addColorStop(1, "transparent");
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Main ECG line
      ctx.beginPath();
      for (let x = 0; x <= W; x++) {
        const y = ecgY(x, phase);
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.shadowColor = color;
      ctx.shadowBlur = 5;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Traveling worm — bright glowing dot moving along the ECG
      const wormX = ((phase % 1) * W * 1.8) % W;
      const wormY = ecgY(wormX, phase);
      const wormGrad = ctx.createRadialGradient(wormX, wormY, 0, wormX, wormY, 5);
      wormGrad.addColorStop(0, `${color}ff`);
      wormGrad.addColorStop(0.4, `${color}99`);
      wormGrad.addColorStop(1, `${color}00`);
      ctx.beginPath();
      ctx.arc(wormX, wormY, 5, 0, Math.PI * 2);
      ctx.fillStyle = wormGrad;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Worm tail (5 trailing dots)
      for (let ti = 1; ti <= 5; ti++) {
        const tx = ((wormX - ti * 3.5 + W * 4) % W);
        const ty = ecgY(tx, phase);
        ctx.beginPath();
        ctx.arc(tx, ty, (1 - ti / 6) * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${Math.round((1 - ti / 6) * 140).toString(16).padStart(2, "0")}`;
        ctx.fill();
      }

      phaseRef.current = (phaseRef.current + speed) % 10;
      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [color, tps]);

  return (
    <canvas
      ref={ref}
      width={W}
      height={H}
      style={{ display: "block", imageRendering: "pixelated" }}
    />
  );
}

/* ── Compact radar sweep ────────────────────────────────────── */
interface Particle { x: number; y: number; age: number; maxAge: number }

function RadarCanvas({ color, tps }: { color: string; tps: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const angleRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);
  const SIZE = 28;
  const CX = SIZE / 2, CY = SIZE / 2, R = SIZE / 2 - 2;

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    const baseSpeed = 0.030 + Math.min(tps / 80, 1) * 0.07;

    function draw() {
      ctx.clearRect(0, 0, SIZE, SIZE);

      [0.35, 0.65, 1].forEach(frac => {
        ctx.beginPath();
        ctx.arc(CX, CY, R * frac, 0, Math.PI * 2);
        ctx.strokeStyle = `${color}25`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });
      ctx.beginPath();
      ctx.moveTo(CX - R, CY); ctx.lineTo(CX + R, CY);
      ctx.moveTo(CX, CY - R); ctx.lineTo(CX, CY + R);
      ctx.strokeStyle = `${color}18`;
      ctx.lineWidth = 0.4;
      ctx.stroke();

      const arm = angleRef.current;
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.arc(CX, CY, R, arm - Math.PI * 0.55, arm);
      ctx.closePath();
      ctx.fillStyle = `${color}1a`;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(CX + Math.cos(arm) * R, CY + Math.sin(arm) * R);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.1;
      ctx.shadowColor = color;
      ctx.shadowBlur = 7;
      ctx.stroke();
      ctx.shadowBlur = 0;

      if (Math.random() < 0.22) {
        const px = CX + Math.cos(arm) * (R * (0.4 + Math.random() * 0.6));
        const py = CY + Math.sin(arm) * (R * (0.4 + Math.random() * 0.6));
        particlesRef.current.push({ x: px, y: py, age: 0, maxAge: 16 + Math.random() * 18 });
      }
      particlesRef.current = particlesRef.current.filter(p => {
        const alpha = 1 - p.age / p.maxAge;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = `${color}${Math.round(alpha * 180).toString(16).padStart(2, "0")}`;
        ctx.shadowColor = color;
        ctx.shadowBlur = 2;
        ctx.fill();
        ctx.shadowBlur = 0;
        p.age++;
        return p.age < p.maxAge;
      });

      ctx.beginPath();
      ctx.arc(CX, CY, 1.2, 0, Math.PI * 2);
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

/* ── Main HUD — COMPACT half-size redesign ──────────────────── */
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

  useEffect(() => {
    const id = setInterval(() => setPhase(p => (p + 1) % PHASES.length), 1800);
    return () => clearInterval(id);
  }, []);

  const cur = PHASES[phase];

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.88, y: 3 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 3 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        verticalAlign: "middle",
        marginLeft: "5px",
        borderRadius: "6px",
        background: "rgba(5,5,10,0.95)",
        border: `1px solid ${cur.color}30`,
        boxShadow: `0 0 14px ${cur.color}12, inset 0 0 8px rgba(0,0,0,0.5)`,
        padding: "2px 6px 2px 3px",
        backdropFilter: "blur(10px)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Compact radar */}
      <div style={{ flexShrink: 0 }}>
        <RadarCanvas color={cur.color} tps={tps} />
      </div>

      <div style={{ width: 1, height: 18, background: `${cur.color}20`, flexShrink: 0 }} />

      {/* Phase label + heartbeat wave */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1px", minWidth: 60 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>
          <motion.div
            animate={{ opacity: [1, 0.15, 1], scale: [1, 1.5, 1] }}
            transition={{ duration: 0.65, repeat: Infinity }}
            style={{ width: 3, height: 3, borderRadius: "50%", background: cur.color, boxShadow: `0 0 4px ${cur.color}`, flexShrink: 0 }}
          />
          <AnimatePresence mode="wait">
            <motion.span
              key={phase}
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 2 }}
              transition={{ duration: 0.15 }}
              style={{ fontSize: "7px", fontFamily: "monospace", fontWeight: 800, color: cur.color, letterSpacing: "0.7px" }}
            >
              {agentMode ? "EXEC" : cur.label}
            </motion.span>
          </AnimatePresence>
        </div>
        {/* ECG / Heartbeat wave */}
        <HeartbeatCanvas color={cur.color} tps={tps} />
      </div>

      <div style={{ width: 1, height: 18, background: `${cur.color}20`, flexShrink: 0 }} />

      {/* TPS + Token stats — compact */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <Zap style={{ width: 6, height: 6, color: "#22c55e" }} />
          <span style={{ fontSize: "7px", fontFamily: "monospace", color: "#22c55e", fontWeight: 700 }}>{tps}</span>
          <span style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.18)" }}>t/s</span>
        </div>
        {tokenCount > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
            <Cpu style={{ width: 6, height: 6, color: "rgba(255,255,255,0.28)" }} />
            <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.32)" }}>
              {tokenCount >= 1000 ? `${(tokenCount / 1000).toFixed(1)}K` : tokenCount}
            </span>
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
          <Radio style={{ width: 6, height: 6, color: `${cur.color}80` }} />
          <span style={{ fontSize: "6px", fontFamily: "monospace", color: `${cur.color}60`, letterSpacing: "0.5px" }}>LIVE</span>
        </div>
      </div>

      {/* Energy shimmer sweep */}
      <motion.div
        animate={{ x: ["-100%", "400%"] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.4 }}
        style={{
          position: "absolute",
          left: 0, top: 0, bottom: 0,
          width: "22%",
          background: `linear-gradient(90deg, transparent, ${cur.color}16, transparent)`,
          borderRadius: "6px",
          pointerEvents: "none",
        }}
      />
    </motion.span>
  );
}
