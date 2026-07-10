import { useEffect, useRef, useState, useCallback } from "react";
import { X, Minus, Zap } from "lucide-react";
import { prefetchEngine, type PredictionNode, type PrefetchStats } from "@/lib/prefetch-engine";

const W = 420;
const H = 440;

type AnimNode = PredictionNode & { ax: number; ay: number; vx: number; vy: number; alpha: number; beamAlpha: number };

const CAT_COLORS: Record<string, string> = {
  "Network Recon":    "#00e5ff",
  "Exploitation":     "#e21227",
  "SQL Injection":    "#f59e0b",
  "XSS":              "#ec4899",
  "Privilege Escalation": "#a78bfa",
  "Password Cracking": "#f97316",
  "Reverse Engineering": "#22c55e",
  "Social Engineering": "#fbbf24",
  "Wireless":         "#06b6d4",
  "Cloud/Container":  "#3b82f6",
  "Digital Forensics": "#84cc16",
  "C2 & Malware":     "#dc2626",
};

function getColor(cat: string): string { return CAT_COLORS[cat] ?? "#a78bfa"; }

function drawPanel(
  ctx: CanvasRenderingContext2D,
  cw: number, ch: number, t: number,
  nodes: AnimNode[],
  stats: PrefetchStats,
) {
  const pulse = Math.sin(t * 2) * 0.5 + 0.5;

  ctx.fillStyle = "rgba(4,6,14,0.98)";
  ctx.fillRect(0, 0, cw, ch);

  ctx.strokeStyle = "rgba(250,191,36,0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.rect(0.5, 0.5, cw - 1, ch - 1); ctx.stroke();

  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillText("PREFETCH INTELLIGENCE · 3D", 14, 20);
  ctx.fillStyle = `rgba(250,191,36,${0.7 + pulse * 0.3})`;
  ctx.beginPath(); ctx.arc(cw - 16, 16, 4, 0, Math.PI * 2); ctx.fill();

  const cx = cw / 2, cy = 130;

  const coreR = 24 + Math.sin(t * 1.8) * 3;
  for (let r = coreR + 20; r <= coreR + 80; r += 20) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(250,191,36,${0.04 + (r === coreR + 20 ? pulse * 0.03 : 0)})`;
    ctx.lineWidth = 0.5; ctx.stroke();
  }

  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
  coreGrad.addColorStop(0, `rgba(250,191,36,${0.5 + pulse * 0.25})`);
  coreGrad.addColorStop(0.6, `rgba(250,191,36,${0.2 + pulse * 0.1})`);
  coreGrad.addColorStop(1, "rgba(250,191,36,0)");
  ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad;
  ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 20 + pulse * 10;
  ctx.fill(); ctx.shadowBlur = 0;

  ctx.font = "bold 9px monospace"; ctx.fillStyle = "#fbbf24";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("PREDICT", cx, cy - 5);
  ctx.font = "8px monospace"; ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(`${nodes.length} nodes`, cx, cy + 6);

  nodes.forEach((n) => {
    if (n.alpha <= 0) return;
    const col = getColor(n.category);

    ctx.save(); ctx.globalAlpha = n.alpha * 0.7;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(n.ax, n.ay);
    const lg = ctx.createLinearGradient(cx, cy, n.ax, n.ay);
    lg.addColorStop(0, col + "66"); lg.addColorStop(1, col + "22");
    ctx.strokeStyle = lg;
    ctx.lineWidth = n.beamAlpha * 2;
    ctx.shadowColor = col; ctx.shadowBlur = n.beamAlpha * 6;
    ctx.stroke(); ctx.shadowBlur = 0; ctx.restore();

    ctx.save(); ctx.globalAlpha = n.alpha;
    const nodeR = 8 + n.confidence * 8;
    const ng = ctx.createRadialGradient(n.ax, n.ay, 0, n.ax, n.ay, nodeR);
    ng.addColorStop(0, col + (n.hit ? "ff" : "cc")); ng.addColorStop(1, col + "22");
    ctx.beginPath(); ctx.arc(n.ax, n.ay, nodeR, 0, Math.PI * 2);
    ctx.fillStyle = ng;
    ctx.shadowColor = col; ctx.shadowBlur = n.hit ? 20 : (8 + pulse * 4);
    ctx.fill(); ctx.shadowBlur = 0;

    if (n.hit) {
      ctx.beginPath(); ctx.arc(n.ax, n.ay, nodeR + 4 + pulse * 4, 0, Math.PI * 2);
      ctx.strokeStyle = col + "66"; ctx.lineWidth = 1.5; ctx.stroke();
    }

    ctx.font = "bold 8px monospace"; ctx.fillStyle = "#fff";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(`${Math.round(n.confidence * 100)}%`, n.ax, n.ay);

    const label = n.text.length > 32 ? n.text.slice(0, 32) + "…" : n.text;
    ctx.font = "7px monospace"; ctx.fillStyle = col;
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    const ly = n.ay > cy ? n.ay + nodeR + 4 : n.ay - nodeR - 14;
    ctx.fillText(label, n.ax, ly);
    ctx.restore();
  });

  const statsY = cy + 100;
  const items = [
    { label: "PREDICTIONS", val: stats.totalPredictions, color: "#fbbf24" },
    { label: "HIT RATE", val: Math.round(stats.hitRate * 100), color: "#22c55e", unit: "%" },
    { label: "HITS", val: stats.totalHits, color: "#00e5ff" },
    { label: "AVG CONF", val: Math.round(stats.avgConfidence * 100), color: "#a78bfa", unit: "%" },
  ];
  const sw = (cw - 28) / 4;
  items.forEach((s, i) => {
    const sx = 14 + i * sw;
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fillRect(sx, statsY, sw - 3, 36);
    ctx.font = "bold 13px monospace"; ctx.fillStyle = s.color;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = s.color; ctx.shadowBlur = 5;
    ctx.fillText(`${s.val}${s.unit ?? ""}`, sx + sw / 2 - 1.5, statsY + 14);
    ctx.shadowBlur = 0;
    ctx.font = "7px monospace"; ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillText(s.label, sx + sw / 2 - 1.5, statsY + 27);
  });

  const listY = statsY + 50;
  ctx.font = "bold 8px monospace"; ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.textAlign = "left"; ctx.fillText("PREDICTION QUEUE", 14, listY);
  nodes.forEach((n, i) => {
    if (i > 4) return;
    const col = getColor(n.category);
    const iy = listY + 13 + i * 22;
    ctx.fillStyle = n.hit ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.02)";
    ctx.fillRect(14, iy, cw - 28, 18);
    ctx.beginPath(); ctx.arc(21, iy + 9, 3, 0, Math.PI * 2);
    ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 4; ctx.fill(); ctx.shadowBlur = 0;
    ctx.font = "8px monospace"; ctx.fillStyle = n.hit ? "#22c55e" : "rgba(255,255,255,0.55)";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    const label = n.text.length > 42 ? n.text.slice(0, 42) + "…" : n.text;
    ctx.fillText(label, 30, iy + 9);
    ctx.font = "7px monospace"; ctx.fillStyle = col; ctx.textAlign = "right";
    ctx.fillText(`${Math.round(n.confidence * 100)}%`, cw - 14, iy + 9);
  });

  const scanX = ((t * 28) % (cw + 20)) - 10;
  ctx.fillStyle = "rgba(250,191,36,0.018)";
  ctx.fillRect(scanX, 0, 14, ch);
}

export function PrefetchIntelligence3D({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const animNodesRef = useRef<AnimNode[]>([]);
  const statsRef = useRef<PrefetchStats>(prefetchEngine.getStats());
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - W - 24, y: 80 });
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);

  const cx = W / 2, cy = 130;

  const syncNodes = useCallback(() => {
    const preds = prefetchEngine.getPredictions();
    statsRef.current = prefetchEngine.getStats();
    animNodesRef.current = preds.map((p, i) => {
      const angle = ((Math.PI * 2) / Math.max(preds.length, 1)) * i - Math.PI / 2;
      const dist = 85 + Math.random() * 30;
      const existing = animNodesRef.current.find((n) => n.id === p.id);
      return {
        ...p,
        ax: existing?.ax ?? cx + Math.cos(angle) * dist,
        ay: existing?.ay ?? cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: existing?.alpha ?? 0,
        beamAlpha: existing?.beamAlpha ?? 0,
      };
    });
  }, [cx, cy]);

  useEffect(() => {
    syncNodes();
    const unsub = prefetchEngine.subscribe(syncNodes);
    return unsub;
  }, [syncNodes]);

  useEffect(() => {
    if (minimized) { cancelAnimationFrame(rafRef.current); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * dpr; canvas.height = H * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const tick = () => {
      tRef.current += 0.016;
      animNodesRef.current.forEach((n) => {
        n.alpha = Math.min(n.alpha + 0.05, 1);
        n.beamAlpha = Math.min(n.beamAlpha + 0.03, 0.8);
        n.ax += n.vx; n.ay += n.vy;
        n.vx *= 0.97; n.vy *= 0.97;
      });
      const c = canvas.getContext("2d")!;
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.save(); c.scale(dpr, dpr);
      drawPanel(c, W, H, tRef.current, animNodesRef.current, statsRef.current);
      c.restore();
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
    function mv(e: MouseEvent) { if (!dragRef.current) return; setPos({ x: dragRef.current.px + e.clientX - dragRef.current.ox, y: dragRef.current.py + e.clientY - dragRef.current.oy }); }
    function up() { dragRef.current = null; }
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, width: W, zIndex: 9996, userSelect: "none", filter: "drop-shadow(0 0 24px rgba(250,191,36,0.15))" }}>
      <div onMouseDown={onMouseDown} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "linear-gradient(90deg, rgba(250,191,36,0.08), rgba(251,191,36,0.03))", borderRadius: minimized ? "8px" : "8px 8px 0 0", border: "1px solid rgba(250,191,36,0.3)", borderBottom: minimized ? undefined : "1px solid rgba(250,191,36,0.12)", cursor: "grab", backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Zap size={12} color="#fbbf24" />
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>PREFETCH INTELLIGENCE 3D</span>
          <span style={{ fontSize: 8, fontFamily: "monospace", color: "#fbbf24", background: "rgba(250,191,36,0.1)", borderRadius: 3, padding: "1px 5px", border: "1px solid rgba(250,191,36,0.25)" }}>AI</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setMinimized((m) => !m)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}><Minus size={12} /></button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}><X size={12} /></button>
        </div>
      </div>
      {!minimized && <canvas ref={canvasRef} style={{ width: W, height: H, display: "block", borderRadius: "0 0 8px 8px", border: "1px solid rgba(250,191,36,0.15)", borderTop: "none" }} />}
    </div>
  );
}
