import { useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface DockItem {
  id: string;
  label: string;
  color: string;
  draw: (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => void;
  onClick: () => void;
}

// ── Canvas animation drawers ─────────────────────────────────────────────────

function drawAtomOrbit(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  const cx = w / 2, cy = h / 2;
  ctx.clearRect(0, 0, w, h);
  // Core nucleus
  const ng = ctx.createRadialGradient(cx, cy, 0, cx, cy, 5);
  ng.addColorStop(0, color + "ff");
  ng.addColorStop(1, color + "33");
  ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = ng; ctx.fill();
  // 3 orbits at different angles
  [[0, 1], [Math.PI / 3, 0.85], [Math.PI * 2 / 3, 0.7]].forEach(([baseAngle, opacity], oi) => {
    const rx = w * 0.42, ry = h * 0.18;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(baseAngle + oi * 0.4);
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = color + "66"; ctx.lineWidth = 0.8; ctx.stroke();
    // Electron
    const angle = t * (1.5 + oi * 0.5);
    const ex = Math.cos(angle) * rx, ey = Math.sin(angle) * ry;
    const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 3.5);
    eg.addColorStop(0, color + "ff"); eg.addColorStop(1, color + "00");
    ctx.beginPath(); ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = eg; ctx.fill();
    ctx.restore();
  });
}

function drawNeuralPulse(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const nodes = [
    { x: w * 0.5, y: h * 0.5 },
    { x: w * 0.2, y: h * 0.25 }, { x: w * 0.8, y: h * 0.25 },
    { x: w * 0.2, y: h * 0.75 }, { x: w * 0.8, y: h * 0.75 },
    { x: w * 0.5, y: h * 0.1 },
  ];
  nodes.slice(1).forEach(n => {
    ctx.beginPath(); ctx.moveTo(nodes[0].x, nodes[0].y); ctx.lineTo(n.x, n.y);
    ctx.strokeStyle = color + "44"; ctx.lineWidth = 0.8; ctx.stroke();
  });
  nodes.forEach((n, i) => {
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i * 1.2);
    const r = i === 0 ? 5.5 : 3;
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r + pulse * 3);
    g.addColorStop(0, color + "ff"); g.addColorStop(1, color + "00");
    ctx.beginPath(); ctx.arc(n.x, n.y, r + pulse * 2, 0, Math.PI * 2);
    ctx.fillStyle = g; ctx.fill();
  });
}

function drawGoldMatrix(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const cols = 6, spacing = w / cols;
  for (let c = 0; c < cols; c++) {
    const particles = 4;
    for (let p = 0; p < particles; p++) {
      const yt = ((t * 20 + p * (h / particles) + c * 7) % h);
      const alpha = Math.sin((yt / h) * Math.PI);
      ctx.globalAlpha = alpha * 0.9;
      ctx.font = `bold 7px monospace`;
      ctx.fillStyle = color;
      ctx.fillText(Math.random() > 0.5 ? "1" : "0", c * spacing + 2, yt);
    }
  }
  ctx.globalAlpha = 1;
}

function drawRadarSweep(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.42;
  [0.33, 0.66, 1].forEach(f => {
    ctx.beginPath(); ctx.arc(cx, cy, r * f, 0, Math.PI * 2);
    ctx.strokeStyle = color + "33"; ctx.lineWidth = 0.7; ctx.stroke();
  });
  // Sweep gradient
  const sweepAngle = t * 1.5;
  void ctx;
  for (let i = 0; i < 40; i++) {
    const a = sweepAngle - (i / 40) * (Math.PI * 0.8);
    const opacity = (1 - i / 40) * 0.6;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a, a + 0.08);
    ctx.closePath();
    ctx.fillStyle = color + Math.round(opacity * 255).toString(16).padStart(2, "0");
    ctx.fill();
  }
  // Target blips
  [[0.6, 0.3], [0.85, 0.7], [0.4, 0.8]].forEach(([dr, da]) => {
    const bx = cx + Math.cos(da * Math.PI * 2) * r * dr;
    const by = cy + Math.sin(da * Math.PI * 2) * r * dr;
    const pulse = Math.abs(Math.sin(t * 3 + da * 10));
    const bg = ctx.createRadialGradient(bx, by, 0, bx, by, 3);
    bg.addColorStop(0, color + "ff"); bg.addColorStop(1, color + "00");
    ctx.beginPath(); ctx.arc(bx, by, 2.5 + pulse * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = bg; ctx.fill();
  });
}

function drawDNAHelix(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const points = 20;
  for (let i = 0; i < points; i++) {
    const y = (i / (points - 1)) * h;
    const phase = (i / points) * Math.PI * 4 + t * 1.5;
    const x1 = w * 0.5 + Math.cos(phase) * w * 0.3;
    const x2 = w * 0.5 + Math.cos(phase + Math.PI) * w * 0.3;
    // Rung
    ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y);
    ctx.strokeStyle = color + "44"; ctx.lineWidth = 0.7; ctx.stroke();
    // Nodes
    const alpha = 0.5 + 0.5 * Math.sin(phase);
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(x1, y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
    ctx.beginPath(); ctx.arc(x2, y, 2.2, 0, Math.PI * 2);
    ctx.fillStyle = "#8b5cf6"; ctx.fill();
    ctx.globalAlpha = 1;
  }
}

function drawTerminalScan(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const lines = ["RECON", "EXPLOIT", "PERSIST", "EXFIL"];
  const lineH = h / (lines.length + 1);
  lines.forEach((line, i) => {
    const progress = Math.min(1, Math.max(0, (t * 0.5 - i * 0.3) % 2));
    const filled = Math.floor(progress * line.length);
    ctx.font = "bold 7px monospace";
    ctx.fillStyle = color + "99";
    ctx.fillText(line.slice(0, filled), 3, (i + 1) * lineH + 3);
    if (filled >= line.length) {
      ctx.fillStyle = "#10b981";
      ctx.fillText(" OK", 3 + filled * 5.2, (i + 1) * lineH + 3);
    }
  });
  // Cursor blink
  const cursorOn = Math.sin(t * 4) > 0;
  if (cursorOn) {
    ctx.fillStyle = color;
    ctx.fillRect(3, h - 8, 6, 2);
  }
}

function drawPyramidAscend(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const levels = 5;
  for (let i = 0; i < levels; i++) {
    const frac = (levels - i) / levels;
    const lw = w * frac * 0.85;
    const x = (w - lw) / 2;
    const lh = (h / levels) * 0.7;
    const y = h - (i + 1) * (h / levels) + (h / levels) * 0.15;
    const pulse = 0.5 + 0.5 * Math.sin(t * 2 + i * 0.8);
    ctx.globalAlpha = 0.4 + pulse * 0.5;
    ctx.fillStyle = i === levels - 1 ? "#fbbf24" : color;
    ctx.fillRect(x, y, lw, lh);
    ctx.globalAlpha = 1;
  }
}

function drawSwarmDots(ctx: CanvasRenderingContext2D, t: number, w: number, h: number, color: string) {
  ctx.clearRect(0, 0, w, h);
  const count = 18;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + t * 0.5;
    const r = 12 + Math.sin(t * 2 + i * 0.7) * 6;
    const x = w / 2 + Math.cos(angle) * r;
    const y = h / 2 + Math.sin(angle) * r;
    const alpha = 0.4 + 0.6 * Math.abs(Math.sin(t + i));
    ctx.globalAlpha = alpha;
    ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
  }
  ctx.globalAlpha = 1;
  const cg = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, 5);
  cg.addColorStop(0, "#ffffff88"); cg.addColorStop(1, color + "00");
  ctx.beginPath(); ctx.arc(w/2, h/2, 4, 0, Math.PI * 2);
  ctx.fillStyle = cg; ctx.fill();
}

// ── Animated Icon Button ─────────────────────────────────────────────────────

function DockButton({ item }: { item: DockItem }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    function loop() {
      rafRef.current = requestAnimationFrame(loop);
      frameRef.current++;
      const t = frameRef.current * 0.016;
      item.draw(ctx!, t, w, h);
    }
    loop();
    return () => cancelAnimationFrame(rafRef.current);
  }, [item]);

  return (
    <motion.button
      onClick={item.onClick}
      className="relative flex flex-col items-center gap-0.5 group"
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      title={item.label}
    >
      {/* Icon wrapper */}
      <div
        className="relative rounded-xl overflow-hidden transition-all duration-200"
        style={{
          width: 44,
          height: 44,
          background: `radial-gradient(circle at 40% 35%, ${item.color}22 0%, #0d0d14 100%)`,
          border: `1px solid ${item.color}33`,
          boxShadow: `0 0 0 0 ${item.color}`,
        }}
      >
        {/* Animated glow on hover */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl"
          style={{ boxShadow: `inset 0 0 16px ${item.color}44`, border: `1px solid ${item.color}88` }}
        />
        <canvas ref={canvasRef} width={44} height={44} className="relative z-10" />
        {/* Pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-xl pointer-events-none"
          animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ border: `1px solid ${item.color}55` }}
        />
      </div>
      {/* Label */}
      <span
        className="text-[8px] font-bold tracking-wide opacity-0 group-hover:opacity-100 transition-opacity truncate max-w-[48px] text-center"
        style={{ color: item.color }}
      >
        {item.label}
      </span>
    </motion.button>
  );
}

// ── QuickDock3D ───────────────────────────────────────────────────────────────

interface QuickDock3DProps {
  onOpenArsenal: () => void;
  onOpenAgent: () => void;
  onOpenNexus: () => void;
  onOpenWarRoom: () => void;
  onOpenCognitiveWarfare: () => void;
  onOpenAutonomousOffense: () => void;
  onOpenCyberHierarchy: () => void;
}

export function QuickDock3D({
  onOpenArsenal,
  onOpenAgent,
  onOpenNexus,
  onOpenWarRoom,
  onOpenCognitiveWarfare,
  onOpenAutonomousOffense,
  onOpenCyberHierarchy,
}: QuickDock3DProps) {
  const buildItems = useCallback((): DockItem[] => [
    {
      id: "arsenal",
      label: "ARSENAL",
      color: "#e21227",
      draw: (ctx, t, w, h) => drawAtomOrbit(ctx, t, w, h, "#e21227"),
      onClick: onOpenArsenal,
    },
    {
      id: "agent",
      label: "AGENT",
      color: "#ff4d4d",
      draw: (ctx, t, w, h) => drawNeuralPulse(ctx, t, w, h, "#ff4d4d"),
      onClick: onOpenAgent,
    },
    {
      id: "nexus",
      label: "NEXUS",
      color: "#fbbf24",
      draw: (ctx, t, w, h) => drawGoldMatrix(ctx, t, w, h, "#fbbf24"),
      onClick: onOpenNexus,
    },
    {
      id: "warroom",
      label: "WAR ROOM",
      color: "#00e5ff",
      draw: (ctx, t, w, h) => drawRadarSweep(ctx, t, w, h, "#00e5ff"),
      onClick: onOpenWarRoom,
    },
    {
      id: "cogwar",
      label: "COG WAR",
      color: "#8b5cf6",
      draw: (ctx, t, w, h) => drawDNAHelix(ctx, t, w, h, "#8b5cf6"),
      onClick: onOpenCognitiveWarfare,
    },
    {
      id: "offense",
      label: "OFFENSE",
      color: "#f97316",
      draw: (ctx, t, w, h) => drawTerminalScan(ctx, t, w, h, "#f97316"),
      onClick: onOpenAutonomousOffense,
    },
    {
      id: "hierarchy",
      label: "PYRAMID",
      color: "#10b981",
      draw: (ctx, t, w, h) => drawPyramidAscend(ctx, t, w, h, "#10b981"),
      onClick: onOpenCyberHierarchy,
    },
    {
      id: "swarm",
      label: "COUNCIL",
      color: "#a78bfa",
      draw: (ctx, t, w, h) => drawSwarmDots(ctx, t, w, h, "#a78bfa"),
      onClick: onOpenArsenal,
    },
  ], [onOpenArsenal, onOpenAgent, onOpenNexus, onOpenWarRoom, onOpenCognitiveWarfare, onOpenAutonomousOffense, onOpenCyberHierarchy]);

  const items = buildItems();

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="flex items-center gap-2 px-3 py-1.5 overflow-x-auto"
      style={{
        background: "linear-gradient(180deg, rgba(8,8,16,0.97) 0%, rgba(5,5,10,0.99) 100%)",
        borderBottom: "1px solid rgba(226,18,39,0.12)",
        boxShadow: "0 2px 20px rgba(0,0,0,0.5)",
        scrollbarWidth: "none",
      }}
    >
      {/* Subtle ambient glow left */}
      <div className="absolute left-0 top-0 bottom-0 w-8 pointer-events-none z-10" style={{ background: "linear-gradient(90deg, rgba(8,8,16,1), transparent)" }} />

      {items.map(item => (
        <DockButton key={item.id} item={item} />
      ))}

      {/* Divider */}
      <div className="h-8 w-px mx-1 flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)" }} />

      {/* Live status indicator */}
      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
        <div className="flex items-center gap-1">
          <motion.div
            className="w-1.5 h-1.5 rounded-full"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            style={{ background: "#10b981" }}
          />
          <span className="text-[8px] font-mono font-bold" style={{ color: "#10b981" }}>LIVE</span>
        </div>
        <span className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>SYS.OK</span>
      </div>
    </motion.div>
  );
}
