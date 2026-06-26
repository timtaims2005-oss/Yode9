import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/*
  NEURAL ACTIVITY MONITOR 3D — Max Quality Heartbeat Worm Edition
  ────────────────────────────────────────────────────────────────
  · 3-channel ECG heartbeat scrolling waveform (α β θ)
  · Worm trail: bright head + fading body traveling to infinity
  · TPS-responsive beat frequency (faster stream = faster heartbeat)
  · Subsurface scatter glow + rim lighting
  · Token histogram + arc TPS meter
  · Pure Canvas 2D, DPR×2, RAF-driven
  Size: W=200 H=100 (compact — half the original)
*/

const W = 200, H = 100;
const DPR = 2;
const WAVE_X = 54, WAVE_W = 108;

interface Props { streaming: boolean; tps: number; tokenCount: number; }

const CHANNELS = [
  { label: "α", color: "0,229,255",   yFrac: 0.22, bpm: 72,  amp: 11, phase: 0.00 },
  { label: "β", color: "167,139,250", yFrac: 0.50, bpm: 80,  amp:  9, phase: 0.33 },
  { label: "θ", color: "34,197,94",   yFrac: 0.76, bpm: 60,  amp: 12, phase: 0.67 },
];

function ecgSample(t: number, bpm: number, phase: number): number {
  const period = 60 / bpm;
  const p = (((t / period) + phase) % 1 + 1) % 1;
  const P   = Math.exp(-((p - 0.12) ** 2) / 0.0012) * 0.22;
  const Q   = Math.exp(-((p - 0.28) ** 2) / 0.0006) * (-0.15);
  const R   = Math.exp(-((p - 0.32) ** 2) / 0.0004) * 1.00;
  const S   = Math.exp(-((p - 0.36) ** 2) / 0.0006) * (-0.22);
  const T   = Math.exp(-((p - 0.55) ** 2) / 0.0050) * 0.35;
  return P + Q + R + S + T;
}

function NeuralCanvas({ tps, tokenCount }: { tps: number; tokenCount: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const tpsRef    = useRef(tps);
  const tokRef    = useRef(tokenCount);
  const histRef   = useRef<number[]>(Array(40).fill(0));

  useEffect(() => { tpsRef.current = tps; }, [tps]);
  useEffect(() => {
    tokRef.current = tokenCount;
    histRef.current.push(tps);
    if (histRef.current.length > 40) histRef.current.shift();
  }, [tokenCount, tps]);

  useEffect(() => {
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d", { alpha: true })!;
    cv.width  = W * DPR;
    cv.height = H * DPR;
    ctx.scale(DPR, DPR);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const WORM_LEN = 28;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current  += 0.018;
      const t  = tRef.current;
      const tp = tpsRef.current;

      ctx.clearRect(0, 0, W, H);

      // Background glass panel
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0,   "rgba(3,1,10,0.97)");
      bg.addColorStop(1,   "rgba(5,2,14,0.97)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      // Animated border glow
      const bA = 0.38 + Math.sin(t * 1.1) * 0.15;
      ctx.beginPath(); ctx.roundRect(0.5, 0.5, W - 1, H - 1, 5);
      const bGrad = ctx.createLinearGradient(0, 0, W, H);
      bGrad.addColorStop(0,   `rgba(226,18,39,${bA})`);
      bGrad.addColorStop(0.4, `rgba(96,165,250,${bA * 0.5})`);
      bGrad.addColorStop(0.8, `rgba(167,139,250,${bA * 0.4})`);
      bGrad.addColorStop(1,   `rgba(226,18,39,${bA})`);
      ctx.strokeStyle = bGrad; ctx.lineWidth = 1; ctx.stroke();

      // Subtle grid
      ctx.globalAlpha = 0.04;
      for (let gx = WAVE_X; gx <= WAVE_X + WAVE_W; gx += 18) {
        ctx.beginPath(); ctx.moveTo(gx, 4); ctx.lineTo(gx, H - 4);
        ctx.strokeStyle = "rgba(255,255,255,1)"; ctx.lineWidth = 0.3; ctx.stroke();
      }
      for (let gy = 12; gy < H - 4; gy += 14) {
        ctx.beginPath(); ctx.moveTo(WAVE_X, gy); ctx.lineTo(WAVE_X + WAVE_W, gy);
        ctx.strokeStyle = "rgba(255,255,255,1)"; ctx.lineWidth = 0.3; ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Header
      const hAlpha = 0.65 + Math.sin(t * 1.6) * 0.14;
      ctx.fillStyle = `rgba(226,18,39,${hAlpha})`;
      ctx.font = "bold 6.5px monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top";
      ctx.fillText("NEURAL ACTIVITY", 6, 5);

      // Live dot
      ctx.beginPath(); ctx.arc(W - 8, 8, 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(226,18,39,${0.55 + Math.sin(t * 4) * 0.4})`; ctx.fill();
      const dg = ctx.createRadialGradient(W - 8, 8, 0, W - 8, 8, 5);
      dg.addColorStop(0, `rgba(226,18,39,${0.25 + Math.sin(t * 4) * 0.1})`);
      dg.addColorStop(1, "rgba(226,18,39,0)");
      ctx.beginPath(); ctx.arc(W - 8, 8, 5, 0, Math.PI * 2);
      ctx.fillStyle = dg; ctx.fill();

      // ── ECG Heartbeat Worm Waves ─────────────────────────────────────────
      const tpsBoost = Math.min(tp / 20, 1);

      CHANNELS.forEach((ch) => {
        const yBase   = H * ch.yFrac;
        const col     = ch.color;
        const effectiveBpm = ch.bpm * (1 + tpsBoost * 0.6);

        // Channel label
        ctx.fillStyle = `rgba(${col},0.75)`;
        ctx.font = "bold 7px monospace"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(ch.label, WAVE_X - 5, yBase);

        // Draw full waveform line (fading body)
        ctx.beginPath();
        let first = true;
        for (let xi = 0; xi < WAVE_W; xi++) {
          const xTime  = t - (WAVE_W - xi) / (WAVE_W * 0.6);
          const sample = ecgSample(xTime, effectiveBpm, ch.phase);
          const ampMod = ch.amp * (0.7 + tpsBoost * 0.3) * (1 + Math.sin(t * 0.25 + ch.phase * 3) * 0.08);
          const yp = yBase - sample * ampMod;
          const xp = WAVE_X + xi;
          if (first) { ctx.moveTo(xp, yp); first = false; }
          else        { ctx.lineTo(xp, yp); }
        }
        // Body: fading gradient stroke
        const lineGrad = ctx.createLinearGradient(WAVE_X, 0, WAVE_X + WAVE_W, 0);
        lineGrad.addColorStop(0,   `rgba(${col},0.04)`);
        lineGrad.addColorStop(0.5, `rgba(${col},0.20)`);
        lineGrad.addColorStop(0.82,`rgba(${col},0.50)`);
        lineGrad.addColorStop(1,   `rgba(${col},0.90)`);
        ctx.strokeStyle = lineGrad; ctx.lineWidth = 0.8; ctx.stroke();

        // Glow duplicate (wider, dimmer)
        ctx.beginPath(); first = true;
        for (let xi = 0; xi < WAVE_W; xi++) {
          const xTime  = t - (WAVE_W - xi) / (WAVE_W * 0.6);
          const sample = ecgSample(xTime, effectiveBpm, ch.phase);
          const ampMod = ch.amp * (0.7 + tpsBoost * 0.3) * (1 + Math.sin(t * 0.25 + ch.phase * 3) * 0.08);
          const yp = yBase - sample * ampMod;
          const xp = WAVE_X + xi;
          if (first) { ctx.moveTo(xp, yp); first = false; }
          else        { ctx.lineTo(xp, yp); }
        }
        const glowGrad = ctx.createLinearGradient(WAVE_X, 0, WAVE_X + WAVE_W, 0);
        glowGrad.addColorStop(0,   `rgba(${col},0.00)`);
        glowGrad.addColorStop(0.7, `rgba(${col},0.04)`);
        glowGrad.addColorStop(1,   `rgba(${col},0.12)`);
        ctx.strokeStyle = glowGrad; ctx.lineWidth = 4; ctx.stroke();

        // ── WORM HEAD: glowing dots at current leading edge ─────────────────
        const headXi  = WAVE_W - 1;
        const headTime = t;
        const headSample = ecgSample(headTime, effectiveBpm, ch.phase);
        const headAmpMod = ch.amp * (0.7 + tpsBoost * 0.3);
        const headY = yBase - headSample * headAmpMod;
        const headX = WAVE_X + headXi;

        for (let wi = 0; wi < WORM_LEN; wi++) {
          const wiOff  = wi * 0.8;
          const wxi    = headXi - wiOff;
          if (wxi < 0) break;
          const wxp    = WAVE_X + wxi;
          const wTime  = t - wiOff / (WAVE_W * 0.6);
          const wSamp  = ecgSample(wTime, effectiveBpm, ch.phase);
          const wyp    = yBase - wSamp * headAmpMod;
          const alpha  = ((1 - wi / WORM_LEN) ** 1.6) * 0.9;
          const radius = (1 - wi / WORM_LEN) * 2.2;
          ctx.beginPath(); ctx.arc(wxp, wyp, Math.max(radius, 0.3), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${col},${alpha})`; ctx.fill();
        }

        // Head glow burst
        const hg = ctx.createRadialGradient(headX, headY, 0, headX, headY, 8);
        hg.addColorStop(0, `rgba(${col},0.5)`);
        hg.addColorStop(0.4, `rgba(${col},0.2)`);
        hg.addColorStop(1,   `rgba(${col},0)`);
        ctx.beginPath(); ctx.arc(headX, headY, 8, 0, Math.PI * 2);
        ctx.fillStyle = hg; ctx.fill();

        // Bright head dot
        ctx.shadowColor = `rgba(${col},1)`; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(headX, headY, 1.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,0.95)`; ctx.fill();
        ctx.shadowBlur = 0;
      });

      // ── TPS arc meter (right panel) ───────────────────────────────────────
      const mX = WAVE_X + WAVE_W + 6, mW = W - mX - 4;
      const tpsClamped = Math.min(tp, 30);
      const tpsPct     = tpsClamped / 30;
      const tpsCol     = tpsPct > 0.7 ? "34,197,94" : tpsPct > 0.35 ? "251,191,36" : "226,18,39";
      const arcCx = mX + mW / 2, arcCy = 36, arcR = 14;

      ctx.font = "bold 6px monospace"; ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillText("TPS", arcCx, 12);

      ctx.beginPath(); ctx.arc(arcCx, arcCy, arcR, Math.PI * 0.75, Math.PI * 2.25, false);
      ctx.strokeStyle = "rgba(255,255,255,0.07)"; ctx.lineWidth = 3; ctx.stroke();
      if (tpsPct > 0) {
        const s = Math.PI * 0.75, e = Math.PI * 0.75 + tpsPct * Math.PI * 1.5;
        ctx.beginPath(); ctx.arc(arcCx, arcCy, arcR, s, e, false);
        ctx.strokeStyle = `rgba(${tpsCol},0.9)`;
        ctx.lineWidth = 3;
        ctx.shadowColor = `rgba(${tpsCol},0.7)`; ctx.shadowBlur = 5;
        ctx.stroke(); ctx.shadowBlur = 0;
      }
      ctx.font = `bold ${tp >= 10 ? "8" : "9"}px monospace`;
      ctx.textAlign = "center"; ctx.fillStyle = `rgba(${tpsCol},1)`;
      ctx.fillText(tp.toFixed(1), arcCx, arcCy + 3);
      ctx.font = "4.5px monospace"; ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillText("tok/s", arcCx, arcCy + 10);

      // Token histogram
      const histY = 56, histH = H - histY - 6;
      const barW  = mW / 16;
      const hist  = histRef.current.slice(-16);
      const maxH  = Math.max(...hist, 1);
      hist.forEach((v, i) => {
        const bH = (v / maxH) * histH;
        const bA = 0.2 + (i / 16) * 0.6;
        ctx.fillStyle = `rgba(${tpsCol},${bA})`;
        ctx.fillRect(mX + i * barW, histY + histH - bH, barW - 0.5, bH);
      });

      // Token count
      ctx.font = "bold 5.5px monospace"; ctx.textAlign = "center";
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.fillText("TOKENS", arcCx, H - 9);
      ctx.font = "bold 6.5px monospace"; ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.fillText(tokRef.current.toLocaleString(), arcCx, H - 3);

      // Separator lines
      ctx.beginPath(); ctx.moveTo(WAVE_X - 12, 3); ctx.lineTo(WAVE_X - 12, H - 3);
      ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 0.5; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(WAVE_X + WAVE_W + 4, 3); ctx.lineTo(WAVE_X + WAVE_W + 4, H - 3);
      ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 0.5; ctx.stroke();

      // Left column label
      ctx.font = "bold 5.5px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.fillText("EEG", 6, H / 2);

      // Corner brackets
      const bLen = 5;
      [[2,2,1,1],[W-2,2,-1,1],[2,H-2,1,-1],[W-2,H-2,-1,-1]].forEach(([bx,by,sx,sy]) => {
        ctx.beginPath();
        ctx.moveTo(bx + sx * bLen, by); ctx.lineTo(bx, by); ctx.lineTo(bx, by + sy * bLen);
        ctx.strokeStyle = `rgba(226,18,39,${0.15 + Math.sin(t * 0.7) * 0.05})`; ctx.lineWidth = 0.8; ctx.stroke();
      });
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas ref={canvasRef} style={{ width: W, height: H, display: "block", borderRadius: 5 }} />
  );
}

export function NeuralActivityMonitor3D({ streaming, tps, tokenCount }: Props) {
  return (
    <AnimatePresence>
      {streaming && (
        <motion.div
          initial={{ opacity: 0, x: 30, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 30, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            position: "absolute",
            bottom: 170,
            right: 14,
            zIndex: 30,
            borderRadius: 6,
            overflow: "hidden",
            boxShadow: "0 0 22px rgba(226,18,39,0.15), 0 0 44px rgba(226,18,39,0.05), 0 4px 20px rgba(0,0,0,0.8)",
          }}
        >
          <NeuralCanvas tps={tps} tokenCount={tokenCount} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
