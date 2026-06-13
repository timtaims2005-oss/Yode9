import { useEffect, useRef, useState, useCallback } from "react";
import { Cpu } from "lucide-react";
import { perfMonitor } from "@/lib/perf-monitor";
import { securityLayer } from "@/lib/security-layer";
import { contextMemory } from "@/lib/context-memory";
import { requestDedup } from "@/lib/request-dedup";
import { prefetchEngine } from "@/lib/prefetch-engine";
import { anomalyDetector } from "@/lib/anomaly-detector";

const SIZE = 300;

type SystemDef = {
  id: string; label: string; shortLabel: string; color: string;
  getValue: () => number; getStatus: () => string;
  angle: number;
};

type HUDPanel = {
  onOpenPerf?: () => void; onOpenCost?: () => void; onOpenDedup?: () => void;
  onOpenThreat?: () => void; onOpenSecurity?: () => void; onOpenMemory?: () => void;
  onOpenPrefetch?: () => void;
};

function buildSystems(): SystemDef[] {
  return [
    { id: "perf", label: "Performance", shortLabel: "PERF", color: "#e21227", angle: -Math.PI / 2,
      getValue: () => { const m = perfMonitor.snapshot(); return m.fps > 0 ? Math.min(m.fps / 60, 1) : 0.8; },
      getStatus: () => { const m = perfMonitor.snapshot(); return `${m.fps}fps · ${m.avgLatencyMs.toFixed(0)}ms`; } },
    { id: "security", label: "Security Shield", shortLabel: "SEC", color: "#00e5ff", angle: -Math.PI / 6,
      getValue: () => { const s = securityLayer.getStats(); return Math.max(0, 1 - (s.blocked + s.rateLimited) * 0.05); },
      getStatus: () => { const s = securityLayer.getStats(); return `${s.blocked} blocked · ${s.requestsSent} sent`; } },
    { id: "memory", label: "Context Memory", shortLabel: "MEM", color: "#a78bfa", angle: Math.PI / 6,
      getValue: () => { const s = contextMemory.getStats(); return Math.min(s.shortTermCount / 50, 1); },
      getStatus: () => { const s = contextMemory.getStats(); return `${s.shortTermCount} msgs · ${s.savedTokens} saved`; } },
    { id: "dedup", label: "Dedup Network", shortLabel: "DED", color: "#a78bfa", angle: Math.PI / 2,
      getValue: () => { const s = requestDedup.getStats(); return s.totalRequests > 0 ? 0.5 + (s.dedupedRequests / s.totalRequests) * 0.5 : 0.5; },
      getStatus: () => { const s = requestDedup.getStats(); return `${s.savedAPICalls} saved · ${s.totalRequests} total`; } },
    { id: "prefetch", label: "AI Prefetch", shortLabel: "PRE", color: "#fbbf24", angle: Math.PI * 5 / 6,
      getValue: () => { const s = prefetchEngine.getStats(); return s.totalPredictions > 0 ? s.hitRate : 0.5; },
      getStatus: () => { const s = prefetchEngine.getStats(); return `${s.totalPredictions} preds · ${Math.round(s.hitRate * 100)}% hit`; } },
    { id: "anomaly", label: "Anomaly Detector", shortLabel: "ANO", color: "#f97316", angle: -Math.PI * 5 / 6,
      getValue: () => Math.max(0, 1 - anomalyDetector.getStats().riskScore / 100),
      getStatus: () => { const s = anomalyDetector.getStats(); return `Risk: ${s.riskScore}% · ${s.total} events`; } },
  ];
}

function getOverallHealth(systems: SystemDef[]): number {
  const vals = systems.map((s) => s.getValue());
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function draw(canvas: HTMLCanvasElement, t: number, systems: SystemDef[], hovered: string | null) {
  const ctx = canvas.getContext("2d")!;
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = SIZE, ch = SIZE;
  if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
    canvas.width = cw * dpr; canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);
  }
  ctx.clearRect(0, 0, cw, ch);

  const pulse = Math.sin(t * 2) * 0.5 + 0.5;
  const cx = cw / 2, cy = ch / 2;
  const orbR = 95;

  ctx.fillStyle = "rgba(4,6,14,0.96)";
  ctx.beginPath(); ctx.arc(cx, cy, cx - 1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.08)"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(cx, cy, cx - 1, 0, Math.PI * 2); ctx.stroke();

  for (let r = 20; r <= orbR; r += 20) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,0.03)`; ctx.lineWidth = 0.5; ctx.stroke();
  }

  const health = getOverallHealth(systems);
  const healthCol = health > 0.75 ? "#22c55e" : health > 0.45 ? "#f59e0b" : "#e21227";
  const sweepAngle = -Math.PI / 2 + (t * 1.2) % (Math.PI * 2);
  for (let i = 0; i < 40; i++) {
    const a = sweepAngle - (i / 40) * Math.PI * 0.5;
    const al = (1 - i / 40) * 0.15;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, orbR + 4, a, a + 0.08); ctx.closePath();
    ctx.fillStyle = `rgba(${health > 0.75 ? "34,197,94" : health > 0.45 ? "245,158,11" : "226,18,39"},${al})`; ctx.fill();
  }

  const arcStart = -Math.PI / 2;
  const arcEnd = arcStart + health * Math.PI * 2;
  ctx.beginPath(); ctx.arc(cx, cy, orbR + 4, arcStart, arcEnd);
  ctx.strokeStyle = healthCol; ctx.lineWidth = 3;
  ctx.shadowColor = healthCol; ctx.shadowBlur = 10 + pulse * 5;
  ctx.stroke(); ctx.shadowBlur = 0;

  systems.forEach((sys) => {
    const nx = cx + Math.cos(sys.angle) * orbR;
    const ny = cy + Math.sin(sys.angle) * orbR;
    const isHov = hovered === sys.id;
    const val = sys.getValue();
    const nr = isHov ? 18 : 14;

    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
    const lg = ctx.createLinearGradient(cx, cy, nx, ny);
    lg.addColorStop(0, sys.color + "22"); lg.addColorStop(1, sys.color + (isHov ? "88" : "44"));
    ctx.strokeStyle = lg; ctx.lineWidth = isHov ? 1.5 : 0.8; ctx.stroke();

    const ng = ctx.createRadialGradient(nx, ny, 0, nx, ny, nr);
    ng.addColorStop(0, sys.color + (isHov ? "ff" : "cc")); ng.addColorStop(1, sys.color + "22");
    ctx.beginPath(); ctx.arc(nx, ny, nr, 0, Math.PI * 2);
    ctx.fillStyle = ng; ctx.shadowColor = sys.color;
    ctx.shadowBlur = isHov ? 20 + pulse * 8 : (8 + val * 6 + pulse * 3);
    ctx.fill(); ctx.shadowBlur = 0;

    const fillA = arcStart + val * Math.PI * 2;
    ctx.beginPath(); ctx.arc(nx, ny, nr, arcStart, fillA);
    ctx.strokeStyle = sys.color; ctx.lineWidth = 2; ctx.stroke();

    ctx.font = `bold ${isHov ? 7 : 6}px monospace`;
    ctx.fillStyle = isHov ? "#fff" : sys.color;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(sys.shortLabel, nx, ny - 2);
    ctx.font = `${isHov ? 7 : 6}px monospace`;
    ctx.fillStyle = isHov ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.45)";
    ctx.fillText(`${Math.round(val * 100)}%`, nx, ny + 6);

    if (isHov) {
      ctx.font = "7px monospace"; ctx.fillStyle = sys.color;
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      const status = sys.getStatus();
      const short = status.length > 24 ? status.slice(0, 24) + "…" : status;
      const labelY = sys.angle > 0 ? ny + nr + 4 : ny - nr - 14;
      ctx.fillText(short, nx, labelY);
    }
  });

  const healthPct = Math.round(health * 100);
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28);
  coreGrad.addColorStop(0, healthCol + (healthPct > 80 ? "aa" : "66")); coreGrad.addColorStop(1, "transparent");
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2);
  ctx.fillStyle = coreGrad; ctx.shadowColor = healthCol;
  ctx.shadowBlur = 16 + pulse * 8; ctx.fill(); ctx.shadowBlur = 0;

  ctx.font = "bold 14px monospace"; ctx.fillStyle = healthCol;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.shadowColor = healthCol; ctx.shadowBlur = 8;
  ctx.fillText(`${healthPct}`, cx, cy - 5); ctx.shadowBlur = 0;
  ctx.font = "6px monospace"; ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText("HEALTH", cx, cy + 7);
}

export function SystemMasterHUD3D(props: HUDPanel & { onOpenAnomalyLog?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const systemsRef = useRef<SystemDef[]>(buildSystems());
  const [hovered, setHovered] = useState<string | null>(null);
  const [pos, setPos] = useState({ x: window.innerWidth / 2 - SIZE / 2, y: window.innerHeight - SIZE - 130 });
  const [minimized, setMinimized] = useState(false);
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);

  const getHitSystem = useCallback((ex: number, ey: number): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = ex - rect.left, my = ey - rect.top;
    const cx = SIZE / 2, cy = SIZE / 2, orbR = 95;
    let closest: string | null = null; let closestD = 20;
    systemsRef.current.forEach((sys) => {
      const nx = cx + Math.cos(sys.angle) * orbR;
      const ny = cy + Math.sin(sys.angle) * orbR;
      const d = Math.hypot(mx - nx, my - ny);
      if (d < closestD) { closestD = d; closest = sys.id; }
    });
    return closest;
  }, []);

  useEffect(() => {
    if (minimized) { cancelAnimationFrame(rafRef.current); return; }
    const tick = () => {
      tRef.current += 0.016;
      const c = canvasRef.current;
      if (c) draw(c, tRef.current, systemsRef.current, hovered);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [minimized, hovered]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) return;
    setHovered(getHitSystem(e.clientX, e.clientY));
  }, [getHitSystem]);

  const onMouseLeave = useCallback(() => { if (!dragRef.current) setHovered(null); }, []);

  const onClick = useCallback((e: React.MouseEvent) => {
    const sys = getHitSystem(e.clientX, e.clientY);
    if (sys === "perf") props.onOpenPerf?.();
    else if (sys === "security") props.onOpenSecurity?.();
    else if (sys === "memory") props.onOpenMemory?.();
    else if (sys === "dedup") props.onOpenDedup?.();
    else if (sys === "prefetch") props.onOpenPrefetch?.();
    else if (sys === "anomaly") props.onOpenAnomalyLog?.();
  }, [getHitSystem, props]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (getHitSystem(e.clientX, e.clientY)) return;
    dragRef.current = { ox: e.clientX, oy: e.clientY, px: pos.x, py: pos.y };
    e.preventDefault();
  }, [pos, getHitSystem]);

  useEffect(() => {
    function mv(e: MouseEvent) { if (!dragRef.current) return; setPos({ x: dragRef.current.px + e.clientX - dragRef.current.ox, y: dragRef.current.py + e.clientY - dragRef.current.oy }); }
    function up() { dragRef.current = null; }
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 9995, userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(4,6,14,0.9)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, padding: "3px 8px", backdropFilter: "blur(12px)" }}>
          <Cpu size={10} color="rgba(255,255,255,0.4)" />
          <span style={{ fontSize: 9, fontFamily: "monospace", color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em" }}>SYSTEM HUD</span>
          <button onClick={() => setMinimized((m) => !m)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 9, fontFamily: "monospace", padding: 0 }}>
            {minimized ? "▲" : "▼"}
          </button>
        </div>
      </div>
      {!minimized && (
        <canvas
          ref={canvasRef}
          style={{ width: SIZE, height: SIZE, display: "block", cursor: hovered ? "pointer" : "grab", borderRadius: "50%", filter: "drop-shadow(0 0 20px rgba(255,255,255,0.06))" }}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onMouseDown={onMouseDown}
          onClick={onClick}
        />
      )}
    </div>
  );
}
