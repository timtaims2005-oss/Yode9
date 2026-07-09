import { useEffect, useRef } from "react";

/**
 * NeonCursorTrail — Custom neon cursor + 20-particle glow trail
 * Pure canvas overlay, pointer-events:none, tab-pause aware, 144fps delta-time
 */

interface TrailDot {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  r: number; color: string;
}

const COLORS = ["#00e5ff","#a78bfa","#22c55e","#e21227","#fbbf24","#ff6b31"];

export function NeonCursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let W = 0, H = 0;
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      canvas!.width = W; canvas!.height = H;
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    const mouse = { x: -999, y: -999, px: -999, py: -999 };
    const dots: TrailDot[] = [];
    let hidden = false;
    let spawnAccum = 0;

    function onMouse(e: MouseEvent) {
      mouse.px = mouse.x; mouse.py = mouse.y;
      mouse.x = e.clientX; mouse.y = e.clientY;
    }
    function onVis() { hidden = document.hidden; }
    window.addEventListener("mousemove", onMouse, { passive: true });
    document.addEventListener("visibilitychange", onVis);

    let prev = 0, raf = 0;
    function draw(ts: number) {
      raf = requestAnimationFrame(draw);
      if (hidden) return;
      const dt = prev ? Math.min((ts - prev) / 1000, 0.05) : 1 / 144;
      prev = ts;

      ctx.clearRect(0, 0, W, H);

      // Spawn trail particles on mouse movement
      const dx = mouse.x - mouse.px, dy = mouse.y - mouse.py;
      const spd = Math.sqrt(dx*dx + dy*dy);
      if (spd > 1) {
        spawnAccum += spd * dt * 8;
        while (spawnAccum >= 1) {
          spawnAccum--;
          const spread = 1.5;
          dots.push({
            x: mouse.x + (Math.random()-0.5)*4,
            y: mouse.y + (Math.random()-0.5)*4,
            vx: (Math.random()-0.5)*spread - dx*0.1,
            vy: (Math.random()-0.5)*spread - dy*0.1,
            life: 0,
            maxLife: 0.25 + Math.random()*0.35,
            r: 1.5 + Math.random()*3,
            color: COLORS[Math.floor(Math.random()*COLORS.length)],
          });
        }
      }

      // Draw & update dots
      ctx.globalCompositeOperation = "lighter";
      for (let i = dots.length - 1; i >= 0; i--) {
        const d = dots[i];
        d.life += dt;
        d.x += d.vx * dt * 60;
        d.y += d.vy * dt * 60;
        d.vx *= 0.92;
        d.vy *= 0.92;
        if (d.life >= d.maxLife) { dots.splice(i, 1); continue; }

        const progress = d.life / d.maxLife;
        const fade = Math.sin(progress * Math.PI);
        const r = d.r * (1 - progress * 0.5);
        ctx.globalAlpha = fade * 0.75;
        const grd = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, r * 4);
        grd.addColorStop(0, d.color);
        grd.addColorStop(0.4, d.color + "99");
        grd.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(d.x, d.y, r*4, 0, Math.PI*2);
        ctx.fillStyle = grd; ctx.fill();
        ctx.beginPath(); ctx.arc(d.x, d.y, r, 0, Math.PI*2);
        ctx.fillStyle = "#fff"; ctx.fill();
      }

      // Custom cursor crosshair
      if (mouse.x > 0) {
        ctx.globalCompositeOperation = "source-over";
        ctx.globalAlpha = 0.9;
        const cx = mouse.x, cy = mouse.y;
        const sz = 10;

        // Outer ring
        ctx.beginPath(); ctx.arc(cx, cy, sz, 0, Math.PI*2);
        ctx.strokeStyle = "#00e5ff";
        ctx.lineWidth = 1;
        ctx.shadowColor = "#00e5ff"; ctx.shadowBlur = 8;
        ctx.stroke();

        // Cross hairs
        ctx.strokeStyle = "#00e5ff"; ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(cx-sz-4, cy); ctx.lineTo(cx-3, cy);
        ctx.moveTo(cx+3, cy);    ctx.lineTo(cx+sz+4, cy);
        ctx.moveTo(cx, cy-sz-4); ctx.lineTo(cx, cy-3);
        ctx.moveTo(cx, cy+3);    ctx.lineTo(cx, cy+sz+4);
        ctx.stroke();

        // Center dot
        ctx.beginPath(); ctx.arc(cx, cy, 1.5, 0, Math.PI*2);
        ctx.fillStyle = "#fff"; ctx.shadowBlur = 6; ctx.fill();
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
    }
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, zIndex: 99999,
        pointerEvents: "none", width: "100%", height: "100%",
        willChange: "contents",
      }}
    />
  );
}
