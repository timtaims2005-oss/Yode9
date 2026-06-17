import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  trail: { x: number; y: number }[];
}

const COLORS = [
  "#e21227", "#ff3d5a", "#00e5ff", "#00ff88",
  "#a78bfa", "#f59e0b", "#22d3ee", "#f97316",
];

export function ChatInputParticles({
  value,
  containerRef,
}: {
  value: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const rafRef = useRef(0);
  const prevLenRef = useRef(0);
  const spawnXRef = useRef(0);

  /* ── Spawn particles on keypress ─────────────────────────────── */
  useEffect(() => {
    const diff = value.length - prevLenRef.current;
    prevLenRef.current = value.length;
    if (diff <= 0) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const W = rect.width;
    const H = rect.height;

    /* Estimate cursor X position based on text length */
    const charWidth = 8.5;
    const padding = 28;
    const rawX = padding + (value.length % Math.floor((W - padding * 2) / charWidth)) * charWidth;
    spawnXRef.current = Math.min(rawX, W - 20);
    const spawnY = H * 0.5;

    const count = Math.min(diff * 5 + 4, 18);
    for (let i = 0; i < count; i++) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 1.4;
      const speed = 1.8 + Math.random() * 3.5;
      particlesRef.current.push({
        x: spawnXRef.current + (Math.random() - 0.5) * 12,
        y: spawnY + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.8,
        size: 1.5 + Math.random() * 3,
        color,
        trail: [],
      });
    }

    /* cap total */
    if (particlesRef.current.length > 220) {
      particlesRef.current = particlesRef.current.slice(-220);
    }
  }, [value]);

  /* ── Animation loop ───────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    function resize() {
      const container = containerRef.current;
      if (!container || !canvas) return;
      const r = container.getBoundingClientRect();
      canvas.width = r.width;
      canvas.height = r.height;
    }
    resize();
    const ro = new ResizeObserver(resize);
    if (containerRef.current) ro.observe(containerRef.current);

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const W = canvas!.width, H = canvas!.height;
      ctx.clearRect(0, 0, W, H);

      const dt = 0.016;
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      for (const p of particlesRef.current) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 12) p.trail.shift();

        /* physics */
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.06; /* gravity */
        p.vx *= 0.972;
        p.vy *= 0.972;
        p.life -= dt / p.maxLife;

        const alpha = Math.max(0, p.life);

        /* trail */
        if (p.trail.length > 2) {
          for (let ti = 1; ti < p.trail.length; ti++) {
            const ta = (ti / p.trail.length) * alpha * 0.35;
            ctx.beginPath();
            ctx.moveTo(p.trail[ti - 1].x, p.trail[ti - 1].y);
            ctx.lineTo(p.trail[ti].x, p.trail[ti].y);
            ctx.strokeStyle = p.color;
            ctx.globalAlpha = ta;
            ctx.lineWidth = (ti / p.trail.length) * p.size * 0.7;
            ctx.stroke();
          }
        }

        /* outer glow halo */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.07;
        ctx.fill();

        /* particle core */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * 0.92;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.shadowBlur = 0;

        /* bright inner core */
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.32, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.globalAlpha = alpha * 0.75;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [containerRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 10,
        borderRadius: "inherit",
      }}
    />
  );
}
