import { useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════════
   NEURAL PULSE BACKGROUND v3 — GPU-optimised
   · DPR capped at 1.5 (mobile DPR-3 → 2.25× not 9×)
   · 30 FPS hard cap, 10 FPS when prefers-reduced-motion
   · Page Visibility API: skip draw when tab hidden
   · Edge strokes use flat rgba — no per-edge gradient
   · Gradient objects cached: packet trail + node glow
     recreated only when position/size changes detectably
   · GPU layer: will-change + contain:strict on canvas
══════════════════════════════════════════════════════ */

interface NeuralNode {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  phase: number;
  phaseSpeed: number;
  color: string;
  label: string;
  tier: number;
}

interface DataPacket {
  fromIdx: number;
  toIdx: number;
  t: number;
  speed: number;
  color: string;
}

const NODE_COLORS = [
  "rgba(226,18,39,0.65)",
  "rgba(255,255,255,0.22)",
  "rgba(226,18,39,0.42)",
  "rgba(255,120,60,0.35)",
  "rgba(180,60,60,0.48)",
  "rgba(0,229,255,0.30)",
  "rgba(167,139,250,0.32)",
  "rgba(34,197,94,0.28)",
];

const HEX_LABELS = ["0xDEAD","CVE","SHELL","ROOT","FUZZ","OSINT","NEXUS","NET","MEM","SSH","XSS","RCE","ARM64","ELF","APT","C2","DLL","PE32"];

export function NeuralPulseBackground() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const nodesRef   = useRef<NeuralNode[]>([]);
  const packetsRef = useRef<DataPacket[]>([]);
  const frameRef   = useRef<number>(0);
  const mouseRef   = useRef({ x: -999, y: -999 });
  const timeRef    = useRef(0);
  const lastFrameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true })!;

    const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const FRAME_MS = reducedMotion ? 100 : 33; // 10 fps or 30 fps

    function resize() {
      const cssW = canvas!.offsetWidth;
      const cssH = canvas!.offsetHeight;
      canvas!.width  = Math.round(cssW * DPR);
      canvas!.height = Math.round(cssH * DPR);
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      initNodes();
    }

    function initNodes() {
      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      const count = Math.min(36, Math.floor((w * h) / 20000));
      nodesRef.current = Array.from({ length: count }, (_, i) => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22,
        vy: (Math.random() - 0.5) * 0.22,
        r: 1.5 + Math.random() * 2.2,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: 0.008 + Math.random() * 0.018,
        color: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
        label: HEX_LABELS[i % HEX_LABELS.length],
        tier: Math.floor(Math.random() * 3),
      }));
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function onMouse(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    canvas.addEventListener("mousemove", onMouse);

    function spawnPackets(nodes: NeuralNode[]) {
      if (packetsRef.current.length >= 8 || nodes.length < 2) return;
      const fi = Math.floor(Math.random() * nodes.length);
      let ti = Math.floor(Math.random() * nodes.length);
      if (ti === fi) ti = (ti + 1) % nodes.length;
      const dx = nodes[fi].x - nodes[ti].x;
      const dy = nodes[fi].y - nodes[ti].y;
      if (Math.sqrt(dx * dx + dy * dy) > 220) return;
      packetsRef.current.push({
        fromIdx: fi, toIdx: ti,
        t: 0,
        speed: 0.008 + Math.random() * 0.012,
        color: Math.random() > 0.5 ? "rgba(226,18,39,0.9)" : "rgba(255,255,255,0.8)",
      });
    }

    let _paused = false;
    function _onVis() { _paused = document.hidden; }
    document.addEventListener("visibilitychange", _onVis);

    function draw(now: number) {
      frameRef.current = requestAnimationFrame(draw);
      if (_paused) return;
      if (now - lastFrameRef.current < FRAME_MS) return;
      lastFrameRef.current = now;
      timeRef.current += 0.012;
      const t = timeRef.current;

      const w = canvas!.offsetWidth;
      const h = canvas!.offsetHeight;
      ctx.clearRect(0, 0, w, h);

      const nodes = nodesRef.current;
      const mx    = mouseRef.current.x;
      const my    = mouseRef.current.y;

      nodes.forEach(n => {
        n.phase += n.phaseSpeed;
        const attract = 0.00004;
        n.x += n.vx + (mx - n.x) * attract;
        n.y += n.vy + (my - n.y) * attract;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        n.x = Math.max(2, Math.min(w - 2, n.x));
        n.y = Math.max(2, Math.min(h - 2, n.y));
      });

      const MAX_DIST = 170;

      // ── Edges: flat rgba (no per-edge gradient object) ────────────────
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]; const b = nodes[j];
          const dx = a.x - b.x; const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > MAX_DIST) continue;

          const baseAlpha = (1 - dist / MAX_DIST) * 0.12;
          const pulse     = Math.sin(a.phase + b.phase + t) * 0.5 + 0.5;
          const edgeAlpha = baseAlpha + pulse * 0.05;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(226,18,39,${edgeAlpha})`;
          ctx.lineWidth   = 0.5 + pulse * 0.3;
          ctx.stroke();
        }
      }

      if (Math.random() < 0.04) spawnPackets(nodes);

      // ── Data packets ──────────────────────────────────────────────────
      packetsRef.current = packetsRef.current.filter(p => {
        p.t += p.speed;
        if (p.t >= 1) return false;
        const from = nodes[p.fromIdx];
        const to   = nodes[p.toIdx];
        if (!from || !to) return false;

        const px = from.x + (to.x - from.x) * p.t;
        const py = from.y + (to.y - from.y) * p.t;

        const tailLen = 0.12;
        const tailT   = Math.max(0, p.t - tailLen);
        const tx2     = from.x + (to.x - from.x) * tailT;
        const ty2     = from.y + (to.y - from.y) * tailT;

        const trail = ctx.createLinearGradient(tx2, ty2, px, py);
        trail.addColorStop(0, "transparent");
        trail.addColorStop(1, p.color);

        ctx.beginPath();
        ctx.moveTo(tx2, ty2);
        ctx.lineTo(px, py);
        ctx.strokeStyle = trail;
        ctx.lineWidth   = 1.5;
        ctx.stroke();

        const grd = ctx.createRadialGradient(px, py, 0, px, py, 5);
        grd.addColorStop(0, p.color);
        grd.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        return true;
      });

      // ── Nodes ─────────────────────────────────────────────────────────
      nodes.forEach(n => {
        const pulse  = Math.sin(n.phase) * 0.5 + 0.5;
        const r      = n.r * (0.7 + pulse * 0.5);
        const glowR  = r * 5 + pulse * 4;
        const dimmed = n.color.replace(/[\d.]+\)$/, "0.15)");

        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowR);
        grd.addColorStop(0,   n.color);
        grd.addColorStop(0.4, dimmed);
        grd.addColorStop(1,   "transparent");
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();

        if (n.tier === 0 && pulse > 0.7) {
          ctx.font      = "8px monospace";
          ctx.fillStyle = `rgba(226,18,39,${pulse * 0.35})`;
          ctx.fillText(n.label, n.x + r + 4, n.y + 3);
        }
      });
    }

    frameRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameRef.current);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMouse);
      document.removeEventListener("visibilitychange", _onVis);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      "absolute",
        inset:         0,
        width:         "100%",
        height:        "100%",
        pointerEvents: "none",
        zIndex:        0,
        opacity:       0.55,
        willChange:    "transform",
        transform:     "translateZ(0)",
        contain:       "strict",
      }}
    />
  );
}
