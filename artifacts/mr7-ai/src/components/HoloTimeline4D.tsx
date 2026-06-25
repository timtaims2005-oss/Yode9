import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface TimelineEvent {
  id: string;
  ts: number;
  label: string;
  type: "attack" | "defense" | "anomaly" | "intel";
  severity: number;
  details: string;
}

const TYPE_COLORS = {
  attack:  { line: "#e21227", glow: "rgba(226,18,39,0.8)", bg: "rgba(226,18,39,0.15)" },
  defense: { line: "#00e5ff", glow: "rgba(0,229,255,0.8)", bg: "rgba(0,229,255,0.12)" },
  anomaly: { line: "#ffd000", glow: "rgba(255,208,0,0.8)", bg: "rgba(255,208,0,0.1)" },
  intel:   { line: "#a78bfa", glow: "rgba(167,139,250,0.8)", bg: "rgba(167,139,250,0.12)" },
};

function generateEvents(): TimelineEvent[] {
  const types: TimelineEvent["type"][] = ["attack","defense","anomaly","intel"];
  const now = Date.now();
  const labels = {
    attack:  ["SQL Injection","XSS Vector","Brute Force","DDoS Flood","RCE Attempt","C2 Beacon"],
    defense: ["WAF Blocked","Rate Limit","IP Banned","Patch Applied","Alert Raised","Session Killed"],
    anomaly: ["Unusual Traffic","Odd Port Scan","Geo Anomaly","Time Anomaly","Behavior Drift","Data Spike"],
    intel:   ["New CVE","Threat Feed","IOC Match","Zero-Day Sig","APT Report","Dark Web Hit"],
  };
  return Array.from({ length: 20 }, (_, i) => {
    const type = types[Math.floor(Math.random() * types.length)];
    const list = labels[type];
    return {
      id: `ev-${i}`,
      ts: now - Math.floor(Math.random() * 3600000),
      label: list[Math.floor(Math.random() * list.length)],
      type,
      severity: Math.random(),
      details: `Node-${Math.floor(Math.random()*256)}.${Math.floor(Math.random()*256)} | Port ${Math.floor(Math.random()*65535)}`,
    };
  }).sort((a, b) => b.ts - a.ts);
}

export function HoloTimeline4D() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timeRef = useRef(0);
  const [events] = useState<TimelineEvent[]>(generateEvents);
  const [hovered, setHovered] = useState<TimelineEvent | null>(null);
  const [filter, setFilter] = useState<TimelineEvent["type"] | "all">("all");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = canvas.offsetWidth, H = 80;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const t = timeRef.current++ * 0.02;

      ctx.strokeStyle = "rgba(0,229,255,0.06)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const y = (i / 7) * H;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      ctx.beginPath();
      ctx.strokeStyle = "rgba(0,229,255,0.2)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#00e5ff";
      ctx.shadowBlur = 4;
      for (let x = 0; x < W; x++) {
        const y = H/2 + Math.sin(x * 0.04 + t) * 8 + Math.sin(x * 0.08 - t * 1.3) * 4;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      const now = Date.now();
      const span = 3600000;
      const filtered = filter === "all" ? events : events.filter(e => e.type === filter);
      filtered.forEach(ev => {
        const age = now - ev.ts;
        if (age > span) return;
        const x = W - (age / span) * W;
        const col = TYPE_COLORS[ev.type];
        const pulse = Math.abs(Math.sin(t * 2 + ev.severity * 10));
        const h2 = 8 + ev.severity * 24;
        ctx.beginPath();
        ctx.strokeStyle = col.line;
        ctx.lineWidth = 1.5;
        ctx.shadowColor = col.glow;
        ctx.shadowBlur = 6 + pulse * 8;
        ctx.moveTo(x, H/2 - h2/2);
        ctx.lineTo(x, H/2 + h2/2);
        ctx.stroke();
        ctx.beginPath();
        ctx.fillStyle = col.glow;
        ctx.arc(x, H/2, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [events, filter]);

  const filtered = filter === "all" ? events : events.filter(e => e.type === filter);
  const fmt = (ts: number) => {
    const d = Date.now() - ts;
    if (d < 60000) return `${Math.floor(d/1000)}s ago`;
    if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
    return `${Math.floor(d/3600000)}h ago`;
  };

  return (
    <div className="rounded-xl border border-purple-900/40 bg-black/70 backdrop-blur-md overflow-hidden"
      style={{ boxShadow: "0 0 30px rgba(167,139,250,0.08)" }}>

      <div className="flex items-center gap-2 px-4 py-3 border-b border-purple-900/30">
        <div className="w-2 h-2 rounded-full bg-purple-400" style={{ boxShadow: "0 0 6px #a78bfa" }} />
        <span className="text-xs font-bold tracking-[0.15em] text-purple-400">HOLOGRAPHIC 4D TIMELINE</span>
        <div className="flex gap-1 ml-auto">
          {(["all","attack","defense","anomaly","intel"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded transition-all"
              style={{
                background: filter === f ? (f === "all" ? "#a78bfa22" : TYPE_COLORS[f as TimelineEvent["type"]]?.bg) : "transparent",
                color: filter === f ? (f === "all" ? "#a78bfa" : TYPE_COLORS[f as TimelineEvent["type"]]?.line) : "#555",
                border: `1px solid ${filter === f ? (f === "all" ? "#a78bfa44" : (TYPE_COLORS[f as TimelineEvent["type"]]?.line + "44")) : "#ffffff10"}`,
              }}>
              {f.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 pb-2">
        <canvas ref={canvasRef} style={{ width: "100%", height: "80px" }} />
      </div>

      <div className="px-3 pb-3 max-h-48 overflow-y-auto space-y-1">
        {filtered.slice(0, 12).map((ev, i) => {
          const col = TYPE_COLORS[ev.type];
          return (
            <motion.div key={ev.id}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onMouseEnter={() => setHovered(ev)} onMouseLeave={() => setHovered(null)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-default transition-all"
              style={{ background: hovered?.id === ev.id ? col.bg : "transparent" }}>
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ background: col.line, boxShadow: `0 0 4px ${col.glow}` }} />
              <div className="flex-1 flex items-center gap-2 min-w-0">
                <span className="text-xs text-white font-medium truncate">{ev.label}</span>
                <span className="text-[10px] font-mono flex-shrink-0" style={{ color: col.line }}>
                  [{ev.type.toUpperCase()}]
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="w-10 h-1 rounded-full bg-white/5">
                  <div className="h-full rounded-full" style={{ width: `${ev.severity * 100}%`, background: col.line }} />
                </div>
                <span className="text-[10px] text-gray-500 font-mono w-14 text-right">{fmt(ev.ts)}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {hovered && (
        <div className="mx-3 mb-3 p-2 rounded-lg border border-white/10 bg-white/3">
          <div className="text-[10px] text-gray-400 font-mono">{hovered.details}</div>
        </div>
      )}
    </div>
  );
}
