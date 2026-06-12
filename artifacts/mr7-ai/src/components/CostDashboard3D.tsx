import { useEffect, useRef, useState, useCallback } from "react";
import { X, Minus, DollarSign } from "lucide-react";
import { getPricing, calcCost, fmtCost } from "@/lib/provider-pricing";

export type CostEntry = {
  model: string;
  providerModel?: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  label: string;
  ts: number;
};

const W = 400;
const H = 360;

const MODEL_COLORS = [
  "#e21227", "#00e5ff", "#a78bfa", "#22c55e", "#f59e0b",
  "#f97316", "#ec4899", "#06b6d4", "#84cc16", "#8b5cf6",
];

function drawCost(
  canvas: HTMLCanvasElement,
  entries: CostEntry[],
  sessionTotal: number,
  t: number,
  animProgress: number,
) {
  const ctx = canvas.getContext("2d");
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
  const pulse = Math.sin(t * 2.2) * 0.5 + 0.5;

  ctx.save();
  const bg = ctx.createLinearGradient(0, 0, 0, ch);
  bg.addColorStop(0, "rgba(6,8,14,0.98)");
  bg.addColorStop(1, "rgba(4,6,10,0.99)");
  ctx.fillStyle = bg;
  ctx.roundRect(0, 0, cw, ch, 10);
  ctx.fill();

  const bord = ctx.createLinearGradient(0, 0, cw, ch);
  bord.addColorStop(0, "rgba(34,197,94,0.7)");
  bord.addColorStop(0.5, "rgba(0,229,255,0.3)");
  bord.addColorStop(1, "rgba(167,139,250,0.5)");
  ctx.strokeStyle = bord;
  ctx.lineWidth = 1.2;
  ctx.roundRect(0.5, 0.5, cw - 1, ch - 1, 10);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textAlign = "left";
  ctx.fillText("COST INTELLIGENCE · 3D", 14, 20);

  ctx.textAlign = "right";
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 13px monospace";
  ctx.shadowColor = "#22c55e";
  ctx.shadowBlur = 8 + pulse * 5;
  ctx.fillText(fmtCost(sessionTotal), cw - 14, 20);
  ctx.shadowBlur = 0;
  ctx.font = "8px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillText("SESSION TOTAL", cw - 14, 32);
  ctx.restore();

  if (entries.length === 0) {
    ctx.save();
    ctx.font = "11px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.textAlign = "center";
    ctx.fillText("No cost data yet — send a message to begin", cw / 2, ch / 2);
    ctx.restore();
    return;
  }

  const aggregated = new Map<string, { cost: number; tokens: number; color: string; label: string }>();
  entries.forEach((e, i) => {
    const k = e.model;
    const existing = aggregated.get(k);
    if (existing) {
      existing.cost += e.cost;
      existing.tokens += e.inputTokens + e.outputTokens;
    } else {
      aggregated.set(k, {
        cost: e.cost,
        tokens: e.inputTokens + e.outputTokens,
        color: MODEL_COLORS[i % MODEL_COLORS.length],
        label: e.label || e.model,
      });
    }
  });

  const bars = Array.from(aggregated.entries()).slice(0, 8);
  const maxCost = Math.max(...bars.map(([, v]) => v.cost), 0.0001);

  const chartLeft = 14;
  const chartRight = cw - 14;
  const chartBottom = ch - 90;
  const chartTop = 55;
  const chartH = chartBottom - chartTop;
  const chartW = chartRight - chartLeft;
  const barW = Math.min(48, chartW / bars.length - 8);
  const spacing = chartW / bars.length;

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 0.5;
  [0.25, 0.5, 0.75, 1].forEach((pct) => {
    const gy = chartBottom - chartH * pct;
    ctx.beginPath();
    ctx.moveTo(chartLeft, gy);
    ctx.lineTo(chartRight, gy);
    ctx.stroke();
    ctx.font = "7px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.textAlign = "left";
    ctx.fillText(fmtCost(maxCost * pct), chartLeft, gy - 2);
  });
  ctx.restore();

  bars.forEach(([, v], i) => {
    const cx2 = chartLeft + i * spacing + spacing / 2;
    const pct = v.cost / maxCost;
    const fullH = pct * chartH * animProgress;
    const bx = cx2 - barW / 2;
    const by = chartBottom - fullH;

    ctx.save();

    const side3DW = 8;
    const side3DH = 5;

    const front = ctx.createLinearGradient(bx, by, bx + barW, by + fullH);
    front.addColorStop(0, v.color);
    front.addColorStop(0.6, v.color + "cc");
    front.addColorStop(1, v.color + "77");
    ctx.fillStyle = front;
    ctx.shadowColor = v.color;
    ctx.shadowBlur = 10 + pulse * 6;
    ctx.beginPath();
    ctx.roundRect(bx, by, barW, fullH, [3, 3, 0, 0]);
    ctx.fill();
    ctx.shadowBlur = 0;

    if (fullH > 4) {
      ctx.fillStyle = v.color + "55";
      ctx.beginPath();
      ctx.moveTo(bx + barW, by);
      ctx.lineTo(bx + barW + side3DW, by - side3DH);
      ctx.lineTo(bx + barW + side3DW, chartBottom - side3DH);
      ctx.lineTo(bx + barW, chartBottom);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = v.color + "88";
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + barW, by);
      ctx.lineTo(bx + barW + side3DW, by - side3DH);
      ctx.lineTo(bx + side3DW, by - side3DH);
      ctx.closePath();
      ctx.fill();
    }

    ctx.font = "bold 9px monospace";
    ctx.fillStyle = v.color;
    ctx.textAlign = "center";
    if (fullH > 18) {
      ctx.fillText(fmtCost(v.cost), cx2, by + 14);
    } else {
      ctx.fillText(fmtCost(v.cost), cx2, by - 6);
    }

    const shortLabel = v.label.replace("CHAT-GPT ", "").slice(0, 8);
    ctx.font = "7px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(shortLabel, cx2, chartBottom + 12);

    ctx.restore();
  });

  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chartLeft, chartTop);
  ctx.lineTo(chartLeft, chartBottom);
  ctx.lineTo(chartRight, chartBottom);
  ctx.stroke();
  ctx.restore();

  const listY = ch - 72;
  const recent = entries.slice(-5).reverse();
  ctx.save();
  ctx.font = "8px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.textAlign = "left";
  ctx.fillText("RECENT", 14, listY);
  recent.forEach((e, i) => {
    const ry = listY + 14 + i * 13;
    const shortMdl = (e.label || e.model).replace("CHAT-GPT ", "").slice(0, 12);
    ctx.fillStyle = MODEL_COLORS[i % MODEL_COLORS.length];
    ctx.fillText(`▸ ${shortMdl}`, 14, ry);
    ctx.textAlign = "right";
    ctx.fillStyle = "#22c55e";
    ctx.fillText(fmtCost(e.cost), cw - 14, ry);
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    const toks = e.inputTokens + e.outputTokens;
    ctx.fillText(`${toks >= 1000 ? (toks / 1000).toFixed(1) + "K" : toks} tok`, cw / 2 - 10, ry);
  });
  ctx.restore();

  const scanX = ((t * 45) % (cw + 40)) - 20;
  ctx.save();
  const sg = ctx.createLinearGradient(scanX, 0, scanX + 20, 0);
  sg.addColorStop(0, "rgba(34,197,94,0)");
  sg.addColorStop(0.5, "rgba(34,197,94,0.03)");
  sg.addColorStop(1, "rgba(34,197,94,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(scanX, 0, 20, ch);
  ctx.restore();
}

type Props = {
  entries: CostEntry[];
  onClose: () => void;
};

export function CostDashboard3D({ entries, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const animRef = useRef(0);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: 24, y: 80 });
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);

  const sessionTotal = entries.reduce((s, e) => s + e.cost, 0);

  useEffect(() => {
    animRef.current = 0;
    const start = performance.now();
    const dur = 800;
    const animate = () => {
      animRef.current = Math.min((performance.now() - start) / dur, 1);
      if (animRef.current < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [entries.length]);

  useEffect(() => {
    if (minimized) { cancelAnimationFrame(rafRef.current); return; }
    const tick = () => {
      tRef.current += 0.016;
      const c = canvasRef.current;
      if (c) drawCost(c, entries, sessionTotal, tRef.current, animRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [minimized, entries, sessionTotal]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = { ox: e.clientX, oy: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  }, [pos]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragRef.current) return;
      setPos({ x: dragRef.current.px + e.clientX - dragRef.current.ox, y: dragRef.current.py + e.clientY - dragRef.current.oy });
    }
    function onUp() { dragRef.current = null; }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, width: W, zIndex: 9998, userSelect: "none", filter: "drop-shadow(0 0 24px rgba(34,197,94,0.2)) drop-shadow(0 0 60px rgba(0,229,255,0.06))" }}>
      <div onMouseDown={onMouseDown} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "linear-gradient(90deg, rgba(34,197,94,0.1), rgba(0,229,255,0.05))", borderRadius: minimized ? "8px" : "8px 8px 0 0", border: "1px solid rgba(34,197,94,0.35)", borderBottom: minimized ? undefined : "1px solid rgba(34,197,94,0.15)", cursor: "grab", backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <DollarSign size={12} color="#22c55e" />
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>COST INTELLIGENCE 3D</span>
          <span style={{ fontSize: 8, fontFamily: "monospace", color: "#22c55e", background: "rgba(34,197,94,0.1)", borderRadius: 3, padding: "1px 5px", border: "1px solid rgba(34,197,94,0.25)" }}>LIVE</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setMinimized((m) => !m)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}><Minus size={12} /></button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}><X size={12} /></button>
        </div>
      </div>
      {!minimized && <canvas ref={canvasRef} style={{ width: W, height: H, display: "block", borderRadius: "0 0 8px 8px", border: "1px solid rgba(34,197,94,0.2)", borderTop: "none" }} />}
    </div>
  );
}

export function useCostTracker() {
  const [entries, setEntries] = useState<CostEntry[]>([]);

  const addEntry = useCallback((
    model: string,
    providerModel: string | undefined,
    inputTokens: number,
    outputTokens: number,
    label: string,
  ) => {
    const pricing = getPricing(model, providerModel);
    if (!pricing) return;
    const cost = calcCost(inputTokens, outputTokens, pricing);
    setEntries((prev) => [...prev, { model, providerModel, inputTokens, outputTokens, cost, label: label || model, ts: Date.now() }]);
  }, []);

  const reset = useCallback(() => setEntries([]), []);
  const sessionTotal = entries.reduce((s, e) => s + e.cost, 0);

  return { entries, addEntry, reset, sessionTotal };
}
