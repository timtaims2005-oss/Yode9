import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════
   AMBIENT PARTICLE FIELD
   Floating cyber particles in the app background.
   Canvas-based — zero DOM overhead, 60fps.
═══════════════════════════════════════════════════ */

interface Particle {
  x: number; y: number; vx: number; vy: number;
  r: number; opacity: number; color: string;
  life: number; maxLife: number; type: "dot" | "cross" | "ring";
}

const COLORS = ["#e21227", "#00e5ff", "#a78bfa", "#22c55e", "#f59e0b"];

function randColor() { return COLORS[Math.floor(Math.random() * COLORS.length)]; }

export function AmbientParticleField({ density = 0.4 }: { density?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let W = 0; let H = 0;
    const TARGET_COUNT = Math.floor(40 * density);

    function resize() {
      W = canvas!.offsetWidth; H = canvas!.offsetHeight;
      canvas!.width = W; canvas!.height = H;
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    function spawnParticle(): Particle {
      const color = randColor();
      const types: Particle["type"][] = ["dot", "dot", "dot", "cross", "ring"];
      return {
        x: Math.random() * W,
        y: H + 10,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -(0.1 + Math.random() * 0.4),
        r: 1 + Math.random() * 3,
        opacity: 0,
        color,
        life: 0,
        maxLife: 300 + Math.random() * 400,
        type: types[Math.floor(Math.random() * types.length)],
      };
    }

    // Initial population
    for (let i = 0; i < TARGET_COUNT; i++) {
      const p = spawnParticle();
      p.y = Math.random() * H; // scattered initially
      p.opacity = Math.random() * 0.5;
      particlesRef.current.push(p);
    }

    function drawParticle(p: Particle) {
      const phase = p.life / p.maxLife;
      const fade = phase < 0.1 ? phase / 0.1 : (phase > 0.85 ? 1 - (phase - 0.85) / 0.15 : 1);
      p.opacity = fade * 0.35;

      ctx.globalAlpha = p.opacity;
      ctx.strokeStyle = p.color;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;

      if (p.type === "dot") {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === "cross") {
        const s = p.r * 2;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(p.x - s, p.y); ctx.lineTo(p.x + s, p.y);
        ctx.moveTo(p.x, p.y - s); ctx.lineTo(p.x, p.y + s);
        ctx.stroke();
      } else {
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 1.8, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    }

    function tick() {
      frameRef.current = requestAnimationFrame(tick);
      ctx.clearRect(0, 0, W, H);

      // Maintain target count
      while (particlesRef.current.length < TARGET_COUNT) {
        particlesRef.current.push(spawnParticle());
      }

      particlesRef.current = particlesRef.current.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        if (p.life > p.maxLife || p.y < -20) return false;
        drawParticle(p);
        return true;
      });
    }

    tick();
    return () => { cancelAnimationFrame(frameRef.current); ro.disconnect(); };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 0,
      }}
    />
  );
}
