import { useEffect, useRef, useState, useCallback } from "react";
import { X, Minus, GitMerge } from "lucide-react";
import { requestDedup } from "@/lib/request-dedup";

const W = 440;
const H = 380;

type NodeState = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  label: string;
  col: string;
  alpha: number;
  size: number;
  ttl: number;
  type: "origin" | "dedup";
  pulsePhase: number;
  mergeBeam?: { tx: number; ty: number; progress: number };
};

type Particle = {
  x: number; y: number; vx: number; vy: number;
  alpha: number; r: number; col: string; life: number;
};

const COLORS = ["#e21227","#00e5ff","#a78bfa","#22c55e","#f59e0b","#f97316","#ec4899"];

function randomColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

function hexPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    else ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

type DedupStats = { total: number; saved: number; rate: number };

function draw(
  canvas: HTMLCanvasElement,
  nodes: NodeState[],
  particles: Particle[],
  stats: DedupStats,
  t: number,
  totalRequests: number,
  savedAPICalls: number,
) {
  const ctx = canvas.getContext("2d")!;
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (canvas.width !== cw * dpr || canvas.height !== ch * dpr) {
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.scale(dpr, dpr);
  }

  ctx.clearRect(0, 0, cw, ch);
  const pulse = Math.sin(t * 2.2) * 0.5 + 0.5;

  const bg = ctx.createLinearGradient(0, 0, 0, ch);
  bg.addColorStop(0, "rgba(6,8,16,0.98)");
  bg.addColorStop(1, "rgba(4,5,10,0.99)");
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.rect(0, 0, cw, ch);
  ctx.fill();

  const border = ctx.createLinearGradient(0, 0, cw, ch);
  border.addColorStop(0, "rgba(167,139,250,0.6)");
  border.addColorStop(0.5, "rgba(0,229,255,0.3)");
  border.addColorStop(1, "rgba(226,18,39,0.5)");
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.rect(0.5, 0.5, cw - 1, ch - 1);
  ctx.stroke();

  ctx.save();
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.textAlign = "left";
  ctx.fillText("DEDUP NETWORK · 3D", 14, 20);
  ctx.fillStyle = `rgba(167,139,250,${0.7 + pulse * 0.3})`;
  ctx.beginPath();
  ctx.arc(cw - 16, 17, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  const nodeArea = { x: 14, y: 36, w: cw - 28, h: ch - 130 };

  const dot = { x: nodeArea.x + nodeArea.w / 2, y: nodeArea.y + nodeArea.h / 2 };
  ctx.save();
  const ringGrad = ctx.createRadialGradient(dot.x, dot.y, 10, dot.x, dot.y, 55);
  ringGrad.addColorStop(0, `rgba(167,139,250,${0.15 + pulse * 0.08})`);
  ringGrad.addColorStop(1, "rgba(167,139,250,0)");
  ctx.fillStyle = ringGrad;
  ctx.beginPath();
  ctx.arc(dot.x, dot.y, 55, 0, Math.PI * 2);
  ctx.fill();

  for (let r = 30; r <= 90; r += 30) {
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(167,139,250,${0.05 + (r === 30 ? pulse * 0.04 : 0)})`;
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  hexPath(ctx, dot.x, dot.y, 18);
  ctx.strokeStyle = `rgba(167,139,250,${0.5 + pulse * 0.3})`;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = "#a78bfa";
  ctx.shadowBlur = 12 + pulse * 8;
  ctx.stroke();
  ctx.fillStyle = `rgba(167,139,250,${0.15 + pulse * 0.1})`;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.font = "bold 9px monospace";
  ctx.fillStyle = "#a78bfa";
  ctx.textAlign = "center";
  ctx.fillText("API", dot.x, dot.y + 3);
  ctx.restore();

  particles.forEach((p) => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = p.col;
    ctx.shadowColor = p.col;
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.restore();
  });

  nodes.forEach((n) => {
    if (n.mergeBeam) {
      const bx = n.x + (n.mergeBeam.tx - n.x) * n.mergeBeam.progress;
      const by = n.y + (n.mergeBeam.ty - n.y) * n.mergeBeam.progress;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(n.x, n.y);
      ctx.lineTo(bx, by);
      const lineGrad = ctx.createLinearGradient(n.x, n.y, bx, by);
      lineGrad.addColorStop(0, n.col + "99");
      lineGrad.addColorStop(1, n.col);
      ctx.strokeStyle = lineGrad;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = n.col;
      ctx.shadowBlur = 8;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(bx, by, 3, 0, Math.PI * 2);
      ctx.fillStyle = n.col;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
    }

    if (n.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = n.alpha;

    if (n.type === "origin") {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size + Math.sin(n.pulsePhase) * 2, 0, Math.PI * 2);
      const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.size + 3);
      g.addColorStop(0, n.col + "cc");
      g.addColorStop(1, n.col + "33");
      ctx.fillStyle = g;
      ctx.shadowColor = n.col;
      ctx.shadowBlur = 14 + pulse * 6;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size, 0, Math.PI * 2);
      ctx.strokeStyle = n.col;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      hexPath(ctx, n.x, n.y, n.size);
      ctx.strokeStyle = n.col;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = n.col;
      ctx.shadowBlur = 16 + pulse * 8;
      ctx.stroke();
      ctx.fillStyle = n.col + "22";
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    ctx.font = `bold ${n.type === "dedup" ? 7 : 8}px monospace`;
    ctx.fillStyle = n.col;
    ctx.textAlign = "center";
    ctx.shadowColor = n.col;
    ctx.shadowBlur = 4;
    ctx.fillText(n.label.slice(0, 8), n.x, n.y + n.size + 12);
    ctx.shadowBlur = 0;
    ctx.restore();
  });

  const barY = ch - 90;
  const barItems = [
    { label: "TOTAL REQUESTS", val: totalRequests, max: Math.max(totalRequests, 1), color: "#00e5ff" },
    { label: "API CALLS SAVED", val: savedAPICalls, max: Math.max(totalRequests, 1), color: "#22c55e" },
    { label: "DEDUP RATE", val: stats.rate * 100, max: 100, color: "#a78bfa", unit: "%" },
  ];

  const bw = (cw - 28) / 3 - 4;
  barItems.forEach((b, i) => {
    const bx = 14 + i * ((cw - 28) / 3);
    const bh = 32;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.beginPath();
    ctx.rect(bx, barY, bw, bh);
    ctx.fill();

    const fill = Math.max(0, Math.min(b.val / b.max, 1));
    const barH = fill * (bh - 6);
    const barGrad = ctx.createLinearGradient(bx, barY + bh - barH - 3, bx + bw, barY + bh - barH - 3);
    barGrad.addColorStop(0, b.color + "55");
    barGrad.addColorStop(1, b.color);
    ctx.fillStyle = barGrad;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 5 + pulse * 3;
    ctx.beginPath();
    ctx.rect(bx + 4, barY + bh - barH - 3, bw - 8, barH);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = "bold 11px monospace";
    ctx.fillStyle = b.color;
    ctx.textAlign = "center";
    const valStr = b.unit ? b.val.toFixed(1) + b.unit : String(b.val);
    ctx.fillText(valStr, bx + bw / 2, barY + bh - 4);
    ctx.font = "7px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fillText(b.label, bx + bw / 2, barY + bh + 10);
    ctx.restore();
  });

  const infoY = ch - 30;
  const infos = [
    { label: "PENDING", val: nodes.filter((n) => n.type === "origin").length.toString(), color: "#00e5ff" },
    { label: "MERGED", val: nodes.filter((n) => n.type === "dedup").length.toString(), color: "#22c55e" },
    { label: "STATUS", val: savedAPICalls > 0 ? "ACTIVE" : "IDLE", color: savedAPICalls > 0 ? "#a78bfa" : "rgba(255,255,255,0.3)" },
  ];
  infos.forEach((info, i) => {
    const iw = (cw - 28) / 3;
    const ix = 14 + i * iw;
    ctx.save();
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = info.color;
    ctx.textAlign = "center";
    ctx.fillText(info.val, ix + iw / 2, infoY);
    ctx.font = "7px monospace";
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillText(info.label, ix + iw / 2, infoY + 12);
    ctx.restore();
  });

  const scanX = ((t * 40) % (cw + 40)) - 20;
  ctx.save();
  const sg = ctx.createLinearGradient(scanX, 0, scanX + 20, 0);
  sg.addColorStop(0, "rgba(167,139,250,0)");
  sg.addColorStop(0.5, "rgba(167,139,250,0.04)");
  sg.addColorStop(1, "rgba(167,139,250,0)");
  ctx.fillStyle = sg;
  ctx.fillRect(scanX, 0, 20, ch);
  ctx.restore();
}

export function DedupVisualizer3D({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tRef = useRef(0);
  const nodesRef = useRef<NodeState[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const statsRef = useRef({ total: 0, saved: 0, rate: 0 });
  const totalRef = useRef(0);
  const savedRef = useRef(0);
  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - W - 24, y: window.innerHeight - H - 80 });
  const dragRef = useRef<{ ox: number; oy: number; px: number; py: number } | null>(null);

  const centerX = W / 2;
  const centerY = (H - 130) / 2 + 36;

  const spawnNode = useCallback((type: "origin" | "dedup", label: string) => {
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 60;
    const x = centerX + Math.cos(angle) * dist;
    const y = centerY + Math.sin(angle) * dist;
    const col = randomColor();
    const id = `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const node: NodeState = {
      id, x, y, vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      label, col, alpha: 0, size: type === "origin" ? 9 : 7, ttl: type === "origin" ? 180 : 90,
      type, pulsePhase: Math.random() * Math.PI * 2,
    };
    if (type === "dedup") {
      node.mergeBeam = { tx: centerX, ty: centerY, progress: 0 };
    }
    nodesRef.current.push(node);

    for (let i = 0; i < 8; i++) {
      const a2 = Math.random() * Math.PI * 2;
      particlesRef.current.push({
        x, y, vx: Math.cos(a2) * (1 + Math.random() * 2), vy: Math.sin(a2) * (1 + Math.random() * 2),
        alpha: 0.8, r: 1 + Math.random() * 2, col, life: 0.015 + Math.random() * 0.02,
      });
    }
  }, [centerX, centerY]);

  useEffect(() => {
    const unsub = requestDedup.onEvent((e) => {
      if (e.type === "new") {
        totalRef.current++;
        spawnNode("origin", e.label.slice(0, 10));
      } else if (e.type === "hit") {
        savedRef.current++;
        spawnNode("dedup", "DEDUP");
      }
      const total = totalRef.current;
      const saved = savedRef.current;
      statsRef.current = { total, saved, rate: total > 0 ? saved / total : 0 };
    });
    return unsub;
  }, [spawnNode]);

  useEffect(() => {
    if (minimized) { cancelAnimationFrame(rafRef.current); return; }
    const tick = () => {
      tRef.current += 0.016;
      const t = tRef.current;

      nodesRef.current.forEach((n) => {
        n.pulsePhase += 0.05;
        n.ttl--;
        n.alpha = n.ttl > 20 ? Math.min(n.alpha + 0.06, 1) : n.alpha - 0.05;
        n.x += n.vx; n.y += n.vy;
        n.vx *= 0.98; n.vy *= 0.98;
        if (n.mergeBeam && n.mergeBeam.progress < 1) {
          n.mergeBeam.progress = Math.min(n.mergeBeam.progress + 0.025, 1);
        }
      });
      nodesRef.current = nodesRef.current.filter((n) => n.alpha > 0 && n.ttl > 0);

      particlesRef.current.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.94; p.vy *= 0.94;
        p.alpha -= p.life;
      });
      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0);

      const c = canvasRef.current;
      if (c) draw(c, nodesRef.current, particlesRef.current, statsRef.current, t, totalRef.current, savedRef.current);
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
    function mv(e: MouseEvent) {
      if (!dragRef.current) return;
      setPos({ x: dragRef.current.px + e.clientX - dragRef.current.ox, y: dragRef.current.py + e.clientY - dragRef.current.oy });
    }
    function up() { dragRef.current = null; }
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);

  return (
    <div style={{ position: "fixed", left: pos.x, top: pos.y, width: W, zIndex: 9997, userSelect: "none", filter: "drop-shadow(0 0 24px rgba(167,139,250,0.2)) drop-shadow(0 0 60px rgba(0,229,255,0.06))" }}>
      <div onMouseDown={onMouseDown} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "linear-gradient(90deg, rgba(167,139,250,0.12), rgba(0,229,255,0.05))", borderRadius: minimized ? "8px" : "8px 8px 0 0", border: "1px solid rgba(167,139,250,0.35)", borderBottom: minimized ? undefined : "1px solid rgba(167,139,250,0.15)", cursor: "grab", backdropFilter: "blur(16px)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <GitMerge size={12} color="#a78bfa" />
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "rgba(255,255,255,0.7)", letterSpacing: "0.1em" }}>DEDUP NETWORK 3D</span>
          <span style={{ fontSize: 8, fontFamily: "monospace", color: "#a78bfa", background: "rgba(167,139,250,0.1)", borderRadius: 3, padding: "1px 5px", border: "1px solid rgba(167,139,250,0.25)" }}>LIVE</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setMinimized((m) => !m)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}><Minus size={12} /></button>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", padding: 2 }}><X size={12} /></button>
        </div>
      </div>
      {!minimized && <canvas ref={canvasRef} style={{ width: W, height: H, display: "block", borderRadius: "0 0 8px 8px", border: "1px solid rgba(167,139,250,0.2)", borderTop: "none" }} />}
    </div>
  );
}
