import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Brain, Activity, Timer } from "lucide-react";
import type { StreamMetrics } from "@/hooks/useStreamMetrics";

/*
  STREAM METRICS 3D — Maximum Holographic Edition
  ─────────────────────────────────────────────────
  Pure Canvas 2D at DPR×2, requestAnimationFrame.
  · Radial TPS speedometer with neon arc
  · 60-slot rolling token histogram
  · Neural brainwave overlay (α β θ channels)
  · Particle sparks on each token burst
  · Holographic glass panel — animated border
*/

const QUALITY_COLORS = {
  idle:   { main: "#374151", glow: "#111827", label: "IDLE" },
  slow:   { main: "#f97316", glow: "#78350f", label: "SLOW" },
  normal: { main: "#06b6d4", glow: "#164e63", label: "NORM" },
  fast:   { main: "#10b981", glow: "#064e3b", label: "FAST" },
  ultra:  { main: "#a78bfa", glow: "#4c1d95", label: "ULTRA" },
} as const;

/* ── Holographic Canvas ───────────────────────────────────────────────── */
function MetricsCanvas({ tps, peakTps, history, quality }:
  { tps: number; peakTps: number; history: number[]; quality: StreamMetrics["quality"] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);

  const tpsRef     = useRef(tps);
  const peakRef    = useRef(peakTps);
  const histRef    = useRef(history);
  const qualRef    = useRef(quality);
  const sparksRef  = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([]);

  useEffect(() => { tpsRef.current  = tps; },     [tps]);
  useEffect(() => { peakRef.current = peakTps; },  [peakTps]);
  useEffect(() => { histRef.current = history; },  [history]);
  useEffect(() => {
    qualRef.current = quality;
    if (quality !== "idle") {
      const { main } = QUALITY_COLORS[quality];
      for (let i = 0; i < 6; i++) sparksRef.current.push({
        x: 80, y: 80, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4,
        life: 1, color: main,
      });
    }
  }, [quality]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const W = 320, H = 160;
    const DPR = Math.min(window.devicePixelRatio * 2, 4);
    cv.width  = W * DPR;
    cv.height = H * DPR;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.scale(DPR, DPR);

    const CX = 80, CY = 82, R = 55; // speedometer center

    const draw = (ts: number) => {
      tRef.current = ts * 0.001;
      const t = tRef.current;
      ctx.clearRect(0, 0, W, H);

      const qColors = QUALITY_COLORS[qualRef.current];
      const curTps  = tpsRef.current;
      const maxTps  = Math.max(peakRef.current, 40, curTps);

      /* ── Background glow behind speedometer ── */
      const bgGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 1.3);
      bgGrad.addColorStop(0,   `${qColors.glow}80`);
      bgGrad.addColorStop(1,   "transparent");
      ctx.fillStyle = bgGrad;
      ctx.beginPath(); ctx.arc(CX, CY, R * 1.3, 0, Math.PI * 2); ctx.fill();

      /* ── Track arc (grey) ── */
      const START_ANG = Math.PI * 0.75;
      const END_ANG   = Math.PI * 2.25;
      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth   = 7;
      ctx.lineCap     = "round";
      ctx.beginPath(); ctx.arc(CX, CY, R, START_ANG, END_ANG); ctx.stroke();

      /* ── Live arc (colored, animated) ── */
      const frac = Math.min(curTps / Math.max(maxTps, 1), 1);
      const liveEnd = START_ANG + (END_ANG - START_ANG) * frac;
      if (frac > 0) {
        const arcGrad = ctx.createLinearGradient(CX - R, CY, CX + R, CY);
        arcGrad.addColorStop(0,   `${qColors.main}cc`);
        arcGrad.addColorStop(0.5, qColors.main);
        arcGrad.addColorStop(1,   `${qColors.main}ee`);
        ctx.strokeStyle = arcGrad;
        ctx.lineWidth   = 7;
        ctx.shadowColor = qColors.main;
        ctx.shadowBlur  = 12;
        ctx.beginPath(); ctx.arc(CX, CY, R, START_ANG, liveEnd); ctx.stroke();
        ctx.shadowBlur  = 0;
      }

      /* ── Tick marks ── */
      for (let i = 0; i <= 8; i++) {
        const a   = START_ANG + (END_ANG - START_ANG) * (i / 8);
        const r1  = R - 6, r2 = R + 2;
        ctx.strokeStyle = i % 2 === 0 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)";
        ctx.lineWidth   = i % 2 === 0 ? 1.5 : 0.8;
        ctx.beginPath();
        ctx.moveTo(CX + Math.cos(a) * r1, CY + Math.sin(a) * r1);
        ctx.lineTo(CX + Math.cos(a) * r2, CY + Math.sin(a) * r2);
        ctx.stroke();
      }

      /* ── Needle ── */
      const needleAng  = START_ANG + (END_ANG - START_ANG) * frac;
      const needleLen  = R - 10;
      const nx = CX + Math.cos(needleAng) * needleLen;
      const ny = CY + Math.sin(needleAng) * needleLen;
      ctx.shadowColor  = qColors.main;
      ctx.shadowBlur   = 8;
      ctx.strokeStyle  = qColors.main;
      ctx.lineWidth    = 2;
      ctx.lineCap      = "round";
      ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(nx, ny); ctx.stroke();
      ctx.shadowBlur   = 0;

      /* ── Hub dot ── */
      const hubGrad = ctx.createRadialGradient(CX, CY, 0, CX, CY, 5);
      hubGrad.addColorStop(0, "white");
      hubGrad.addColorStop(1, qColors.main);
      ctx.fillStyle = hubGrad;
      ctx.beginPath(); ctx.arc(CX, CY, 4, 0, Math.PI * 2); ctx.fill();

      /* ── TPS label ── */
      ctx.shadowColor = qColors.main;
      ctx.shadowBlur  = 14;
      ctx.font        = `bold ${curTps >= 100 ? "22" : "26"}px monospace`;
      ctx.fillStyle   = qColors.main;
      ctx.textAlign   = "center";
      ctx.fillText(`${curTps}`, CX, CY + 14);
      ctx.shadowBlur  = 0;
      ctx.font        = "bold 7px monospace";
      ctx.fillStyle   = "rgba(255,255,255,0.35)";
      ctx.fillText("tok/s", CX, CY + 24);

      /* ── Peak label ── */
      ctx.font      = "7px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillText(`peak ${peakRef.current}`, CX, CY + 34);

      /* ── Quality badge ── */
      ctx.font      = "bold 8px monospace";
      ctx.fillStyle = qColors.main;
      ctx.fillText(qColors.label, CX, CY - R - 10);

      /* ── Histogram (right side) ── */
      const hist   = histRef.current;
      const maxH   = Math.max(...hist, 1);
      const barW   = (W - 170) / hist.length;
      const hX0    = 168;
      const hY     = H - 16;
      const hMaxH  = H - 36;

      /* Histogram background */
      ctx.fillStyle = "rgba(255,255,255,0.02)";
      ctx.fillRect(hX0, 20, W - hX0 - 4, hMaxH - 4);

      hist.forEach((v, i) => {
        const barH = (v / maxH) * (hMaxH - 4);
        const x    = hX0 + i * barW;
        const y    = hY - barH;
        const age  = i / hist.length;
        const alpha = 0.15 + age * 0.85;
        ctx.fillStyle = `${qColors.main}${Math.round(alpha * 255).toString(16).padStart(2, "0")}`;
        ctx.fillRect(x, y, Math.max(barW - 0.5, 0.5), barH);
      });

      /* Histogram axis */
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth   = 0.5;
      ctx.beginPath(); ctx.moveTo(hX0, 20); ctx.lineTo(hX0, hY); ctx.lineTo(W - 4, hY); ctx.stroke();

      ctx.font      = "7px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.textAlign = "left";
      ctx.fillText("TPS HISTORY (30s)", hX0 + 2, 17);

      /* ── Brainwave overlay on histogram ── */
      const WAVES = [
        { freq: 0.05, amp: 4, phase: 0,   color: "rgba(0,229,255,0.15)"  },
        { freq: 0.09, amp: 2.5, phase: 1.8, color: "rgba(167,139,250,0.10)" },
      ];
      WAVES.forEach(w => {
        ctx.strokeStyle = w.color;
        ctx.lineWidth   = 0.8;
        ctx.beginPath();
        for (let x = 0; x < W - hX0 - 4; x++) {
          const y = hY - (hMaxH / 2) + Math.sin((x * w.freq) + t * 2 + w.phase) * w.amp;
          if (x === 0) ctx.moveTo(hX0 + x, y);
          else         ctx.lineTo(hX0 + x, y);
        }
        ctx.stroke();
      });

      /* ── Sparks ── */
      sparksRef.current = sparksRef.current.filter(s => s.life > 0.01);
      sparksRef.current.forEach(s => {
        s.x += s.vx; s.y += s.vy; s.vy += 0.1; s.life *= 0.88;
        ctx.globalAlpha = s.life;
        ctx.fillStyle   = s.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.life * 2, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });

      /* ── Animated border pulse ── */
      const borderAlpha = 0.3 + 0.15 * Math.sin(t * 3);
      ctx.strokeStyle = `${qColors.main}${Math.round(borderAlpha * 255).toString(16).padStart(2, "0")}`;
      ctx.lineWidth   = 0.8;
      ctx.strokeRect(1, 1, W - 2, H - 2);

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas ref={canvasRef}
      style={{ width: 320, height: 160, display: "block", borderRadius: 14 }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════════
   EXPORTED COMPONENT
══════════════════════════════════════════════════════════════════════ */
export function StreamMetrics3D({ metrics, visible }: { metrics: StreamMetrics; visible: boolean }) {
  const qc = QUALITY_COLORS[metrics.quality];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.97 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative overflow-hidden rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(0,0,0,0.92) 0%, rgba(8,4,24,0.95) 100%)",
            border: `1px solid ${qc.main}30`,
            boxShadow: `0 0 24px ${qc.glow}40, inset 0 1px 0 rgba(255,255,255,0.04)`,
          }}
        >
          {/* Ambient glow */}
          <motion.div
            animate={{ opacity: [0.12, 0.28, 0.12] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(ellipse at 25% 50%, ${qc.glow}50 0%, transparent 65%)` }}
          />

          <div className="relative flex gap-0">
            {/* Canvas */}
            <MetricsCanvas
              tps={metrics.tps}
              peakTps={metrics.peakTps}
              history={metrics.history}
              quality={metrics.quality}
            />

            {/* Stats sidebar */}
            <div className="flex flex-col justify-center gap-2 px-4 py-3 min-w-[100px]">
              {[
                {
                  icon: <Brain className="w-3 h-3" />,
                  label: "TOKENS",
                  value: metrics.tokenCount.toLocaleString(),
                  color: qc.main,
                },
                {
                  icon: <Timer className="w-3 h-3" />,
                  label: "TTFT",
                  value: metrics.ttft != null ? `${metrics.ttft}ms` : "—",
                  color: "#06b6d4",
                },
                {
                  icon: <Activity className="w-3 h-3" />,
                  label: "ELAPSED",
                  value: metrics.elapsedMs > 0
                    ? `${(metrics.elapsedMs / 1000).toFixed(1)}s`
                    : "—",
                  color: "#a78bfa",
                },
                {
                  icon: <Zap className="w-3 h-3" />,
                  label: "PEAK",
                  value: `${metrics.peakTps} t/s`,
                  color: "#fbbf24",
                },
              ].map(s => (
                <div key={s.label} className="flex flex-col">
                  <div className="flex items-center gap-1 mb-0.5" style={{ color: `${s.color}80` }}>
                    {s.icon}
                    <span className="text-[7px] font-mono tracking-widest">{s.label}</span>
                  </div>
                  <div className="text-[13px] font-black font-mono leading-none" style={{ color: s.color }}>
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom status bar */}
          <div
            className="flex items-center justify-between px-4 py-1.5 border-t text-[8px] font-mono"
            style={{ borderColor: `${qc.main}18`, color: `${qc.main}60` }}
          >
            <div className="flex items-center gap-1.5">
              <motion.div
                animate={metrics.isStreaming
                  ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }
                  : { scale: 1, opacity: 0.4 }}
                transition={{ repeat: Infinity, duration: 0.8 }}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: qc.main }}
              />
              {metrics.isStreaming ? "STREAMING" : "IDLE"}
            </div>
            <span>{(metrics.bytesReceived / 1024).toFixed(1)} KB recv</span>
            <span className="font-black tracking-wider" style={{ color: qc.main }}>
              {qc.label}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
