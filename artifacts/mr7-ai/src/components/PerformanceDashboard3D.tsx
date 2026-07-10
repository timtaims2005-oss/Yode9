import { useEffect, useRef, useState, useCallback } from "react";
import { X, Minus, Activity } from "lucide-react";
import { perfMonitor, type PerfSnapshot } from "@/lib/perf-monitor";
import { responseCache } from "@/lib/perf-cache";
import { requestQueue } from "@/lib/request-queue";

const W = 420;
const H = 340;

function drawDashboard(
  canvas: HTMLCanvasElement,
  snap: PerfSnapshot,
  fpsHistory: number[],
  latHistory: number[],
  t: number,
) {
  const ctx = canvas.getContext("2d")!;
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);
  }

  ctx.clearRect(0, 0, cw, ch);

  const accent = "#e21227";
  const cyan = "#00e5ff";
  const violet = "#a78bfa";
  const green = "#22c55e";
  const amber = "#f59e0b";
  const dim = "rgba(255,255,255,0.12)";

  ctx.save();
  const bg = ctx.createLinearGradient(0, 0, 0, ch);
  bg.addColorStop(0, "rgba(8,8,12,0.97)");
  bg.addColorStop(1, "rgba(6,6,10,0.98)");
  ctx.fillStyle = bg;
  ctx.roundRect(0, 0, cw, ch, 10);
  ctx.fill();
  ctx.restore();

  const borderGrad = ctx.createLinearGradient(0, 0, cw, ch);
  borderGrad.addColorStop(0, "rgba(226,18,39,0.7)");
  borderGrad.addColorStop(0.5, "rgba(0,229,255,0.4)");
  borderGrad.addColorStop(1, "rgba(167,139,250,0.6)");
  ctx.save();
  ctx.strokeStyle = borderGrad;
  ctx.lineWidth = 1.2;
  ctx.roundRect(0.5, 0.5, cw - 1, ch - 1, 10);
  ctx.stroke();
  ctx.restore();

  const pulse = Math.sin(t * 2.5) * 0.5 + 0.5;

  function arcGauge(cx: number, cy: number, r: number, value: number, max: number, color: string, label: string, valStr: string) {
    const startA = Math.PI * 0.75;
    const endFull = Math.PI * 2.25;
    const fillA = startA + (endFull - startA) * Math.min(value / max, 1);

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, endFull);
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.stroke();

    const pct = Math.min(value / max, 1);
    const grd = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    grd.addColorStop(0, color + "99");
    grd.addColorStop(1, color);
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, fillA);
    ctx.strokeStyle = grd;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.stroke();

    if (pct > 0.05) {
      const glowR = r + 3;
      ctx.beginPath();
      ctx.arc(cx, cy, glowR, fillA - 0.04, fillA + 0.04);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 12 + pulse * 6;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = color;
    ctx.font = `bold 14px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(valStr, cx, cy - 4);
    ctx.fillStyle = dim;
    ctx.font = `9px monospace`;
    ctx.fillText(label, cx, cy + 12);
    ctx.restore();
  }

  const gaugeY = 80;
  arcGauge(70, gaugeY, 38, snap.fps, 120, accent, "FPS", snap.fps.toFixed(0));
  arcGauge(W / 2, gaugeY, 38, snap.memoryPct * 100, 100, violet, "MEM %", (snap.memoryPct * 100).toFixed(0) + "%");
  arcGauge(W - 70, gaugeY, 38, snap.tps, 200, cyan, "TPS", snap.tps.toFixed(1));

  ctx.save();
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textAlign = "left";
  ctx.fillText("PERFORMANCE MATRIX", 14, 20);
  ctx.fillStyle = "rgba(226,18,39,0.9)";
  ctx.beginPath();
  ctx.arc(cw - 18, 17, 4, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(226,18,39,${0.6 + pulse * 0.4})`;
  ctx.fill();
  ctx.restore();

  function sparkline(x: number, y: number, w2: number, h2: number, data: number[], color: string, label: string, unit: string) {
    if (data.length < 2) return;
    const max2 = Math.max(...data, 1);
    const step = w2 / (data.length - 1);

    ctx.save();
    ctx.beginPath();
    data.forEach((v, i) => {
      const px = x + i * step;
      const py = y + h2 - (v / max2) * h2;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    const grad = ctx.createLinearGradient(x, y, x + w2, y);
    grad.addColorStop(0, color + "33");
    grad.addColorStop(1, color);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.lineTo(x + (data.length - 1) * step, y + h2);
    ctx.lineTo(x, y + h2);
    ctx.closePath();
    const fillGrad = ctx.createLinearGradient(x, y, x, y + h2);
    fillGrad.addColorStop(0, color + "22");
    fillGrad.addColorStop(1, color + "05");
    ctx.fillStyle = fillGrad;
    ctx.fill();

    const last = data[data.length - 1];
    const lx = x + (data.length - 1) * step;
    const ly = y + h2 - (last / max2) * h2;
    ctx.beginPath();
    ctx.arc(lx, ly, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 + pulse * 4;
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = "8px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.textAlign = "left";
    ctx.fillText(label, x, y - 4);
    ctx.textAlign = "right";
    ctx.fillStyle = color;
    ctx.fillText(last.toFixed(0) + unit, x + w2, y - 4);
    ctx.restore();
  }

  const lineW = (W - 30) / 2 - 6;
  sparkline(14, 148, lineW, 50, fpsHistory, accent, "FPS", "");
  sparkline(14 + lineW + 12, 148, lineW, 50, latHistory, cyan, "LATENCY", "ms");

  const barY = 222;
  const bars = [
    { label: "LATENCY AVG", val: snap.avgLatencyMs, max: 3000, color: cyan, unit: "ms" },
    { label: "LATENCY P95", val: snap.p95LatencyMs, max: 5000, color: amber, unit: "ms" },
    { label: "CACHE HIT", val: snap.cacheHitRate * 100, max: 100, color: green, unit: "%" },
    { label: "QUEUE", val: snap.queueDepth, max: 20, color: violet, unit: "" },
  ];

  bars.forEach((b, i) => {
    const bx = 14 + i * ((W - 28) / 4);
    const bw = (W - 28) / 4 - 4;
    const bh = 44;
    const by = barY;

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.roundRect(bx, by, bw, bh, 4);
    ctx.fill();

    const fill = Math.max(0, Math.min(b.val / b.max, 1));
    const barH = fill * (bh - 8);
    const grad3D = ctx.createLinearGradient(bx, by + bh - barH - 4, bx + bw, by + bh - barH - 4);
    grad3D.addColorStop(0, b.color + "55");
    grad3D.addColorStop(0.5, b.color);
    grad3D.addColorStop(1, b.color + "77");
    ctx.fillStyle = grad3D;
    ctx.roundRect(bx + 4, by + bh - barH - 4, bw - 8, barH, 2);
    ctx.fill();

    ctx.shadowColor = b.color;
    ctx.shadowBlur = 6 + pulse * 4;
    ctx.fillStyle = b.color;
    ctx.font = "bold 10px monospace";
    ctx.textAlign = "center";
    ctx.fillText(b.val.toFixed(b.unit === "%" ? 1 : 0) + b.unit, bx + bw / 2, by + bh - 4);
    ctx.shadowBlur = 0;
    ctx.font = "7px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText(b.label, bx + bw / 2, by + bh + 10);
    ctx.restore();
  });

  const statY = ch - 28;
  const stats = [
    { label: "REQUESTS", val: snap.totalRequests.toString(), color: "rgba(255,255,255,0.6)" },
    { label: "TOKENS", val: snap.totalTokens >= 1000 ? (snap.totalTokens / 1000).toFixed(1) + "K" : snap.totalTokens.toString(), color: cyan },
    { label: "ACTIVE", val: snap.activeRequests.toString(), color: snap.activeRequests > 0 ? accent : "rgba(255,255,255,0.3)" },
    { label: "MEM MB", val: snap.memoryMB.toFixed(1), color: violet },
  ];

  stats.forEach((s, i) => {
    const sw = (W - 28) / 4;
    const sx = 14 + i * sw;
    ctx.save();
    ctx.font = "bold 11px monospace";
    ctx.fillStyle = s.color;
    ctx.textAlign = "center";
    ctx.fillText(s.val, sx + sw / 2, statY);
    ctx.font = "7px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillText(s.label, sx + sw / 2, statY + 12);
    ctx.restore();
  });

  const scanX = ((t * 60) % (cw + 40)) - 20;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(scanX, 0);
  ctx.lineTo(scanX + 20, 0);
  ctx.lineTo(scanX + 20, ch);
  ctx.lineTo(scanX, ch);
  ctx.closePath();
  const scanGrad = ctx.createLinearGradient(scanX, 0, scanX + 20, 0);
  scanGrad.addColorStop(0, "rgba(0,229,255,0)");
  scanGrad.addColorStop(0.5, "rgba(0,229,255,0.035)");
  scanGrad.addColorStop(1, "rgba(0,229,255,0)");
  ctx.fillStyle = scanGrad;
  ctx.fill();
  ctx.restore();
}

export function PerformanceDashboard3D({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const fpsHistRef = useRef<number[]>(Array(60).fill(60));
  const latHistRef = useRef<number[]>(Array(60).fill(0));
  const snapRef = useRef<PerfSnapshot>(perfMonitor.snapshot());
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - W - 24, y: 80 });
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);

  useEffect(() => {
    const unsub = perfMonitor.subscribe((snap) => {
      snapRef.current = snap;
      fpsHistRef.current.push(snap.fps);
      if (fpsHistRef.current.length > 60) fpsHistRef.current.shift();
      latHistRef.current.push(snap.avgLatencyMs);
      if (latHistRef.current.length > 60) latHistRef.current.shift();
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (minimized) { cancelAnimationFrame(rafRef.current); return; }
    const tick = () => {
      tRef.current += 0.016;
      const c = canvasRef.current;
      if (c) {
        const s = { ...snapRef.current };
        const cs = responseCache.stats();
        const qs = requestQueue.stats();
        s.cacheHitRate = cs.hitRate;
        s.queueDepth = qs.queued;
        s.activeRequests = qs.running;
        drawDashboard(c, s, fpsHistRef.current, latHistRef.current, tRef.current);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [minimized]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { ox: e.clientX, oy: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      const dx = e.clientX - dragRef.current.ox;
      const dy = e.clientY - dragRef.current.oy;
      setPos({ x: dragRef.current.px + dx, y: dragRef.current.py + dy });
    }
    function onUp() { dragRef.current = null; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        left: pos.x,
        top: pos.y,
        width: W,
        zIndex: 9999,
        userSelect: "none",
        filter: "drop-shadow(0 0 24px rgba(226,18,39,0.25)) drop-shadow(0 0 60px rgba(0,229,255,0.08))",
      }}
    >
      <div
        onMouseDown={onMouseDown}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 10px",
          background: "linear-gradient(90deg, rgba(226,18,39,0.15), rgba(0,229,255,0.06))",
          borderRadius: minimized ? "8px" : "8px 8px 0 0",
          border: "1px solid rgba(226,18,39,0.4)",
          borderBottom: minimized ? undefined : "1px solid rgba(226,18,39,0.2)",
          cursor: "grab",
          backdropFilter: "blur(16px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Activity size={12} color="#e21227" />
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>
            PERFORMANCE MATRIX
          </span>
          <span style={{ fontSize: 8, fontFamily: "monospace", color: "#00e5ff", background: "rgba(0,229,255,0.1)", borderRadius: 3, padding: "1px 5px", border: "1px solid rgba(0,229,255,0.25)" }}>
            LIVE
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setMinimized((m) => !m)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}>
            <Minus size={12} />
          </button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}>
            <X size={12} />
          </button>
        </div>
      </div>
      {!minimized && (
        <canvas
          ref={canvasRef}
          style={{
            width: W,
            height: H,
            display: "block",
            borderRadius: "0 0 8px 8px",
            border: "1px solid rgba(226,18,39,0.25)",
            borderTop: "none",
          }}
        />
      )}
    </div>
  );
}
