import { useEffect, useRef } from "react";
import { getCanvasConfig } from "@/lib/adaptive-quality";
import { Rotation4D, TESSERACT_VERTICES, TESSERACT_EDGES, project4Dto2D } from "@/lib/four-d-engine";

/**
 * NeuralParticleField4D — Combines 4D tesseract projection with
 * neural network particle connections for a stunning visual effect.
 * Fully GPU-accelerated with adaptive FPS and DPR.
 */

interface Particle4D {
  x: number; y: number; z: number; w: number;
  vx: number; vy: number; vz: number; vw: number;
  r: number; alpha: number; hue: number; phase: number;
}

interface NeuralParticleField4DProps {
  className?: string;
  accentColor?: string;
  particleCount?: number;
  showTesseract?: boolean;
  speed?: number;
}

export function NeuralParticleField4D({
  className = "",
  accentColor = "#e21227",
  particleCount = 60,
  showTesseract = true,
  speed = 0.5,
}: NeuralParticleField4DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const particlesRef = useRef<Particle4D[]>([]);
  const rotRef = useRef(new Rotation4D());
  const frameRef = useRef(0);
  const lastFrameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const { dpr } = getCanvasConfig();
    const limitedDpr = Math.min(dpr, 1.5);

    const resize = () => {
      const W = parent.offsetWidth, H = parent.offsetHeight;
      canvas.width = W * limitedDpr; canvas.height = H * limitedDpr;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const initParticles = () => {
      particlesRef.current = Array.from({ length: particleCount }, () => ({
        x: (Math.random() * 2 - 1) * 0.8,
        y: (Math.random() * 2 - 1) * 0.8,
        z: (Math.random() * 2 - 1) * 0.8,
        w: (Math.random() * 2 - 1) * 0.8,
        vx: (Math.random() - 0.5) * 0.003,
        vy: (Math.random() - 0.5) * 0.003,
        vz: (Math.random() - 0.5) * 0.002,
        vw: (Math.random() - 0.5) * 0.002,
        r: 1.5 + Math.random() * 2.5,
        alpha: 0.3 + Math.random() * 0.5,
        hue: Math.random() * 60 + 330,
        phase: Math.random() * Math.PI * 2,
      }));
    };
    initParticles();

    const hexToRgb = (hex: string) => ({
      r: parseInt(hex.slice(1,3),16),
      g: parseInt(hex.slice(3,5),16),
      b: parseInt(hex.slice(5,7),16),
    });
    const ac = hexToRgb(accentColor);

    const ctx = canvas.getContext("2d")!;

    const draw = () => {
      if (document.hidden) { rafRef.current = requestAnimationFrame(draw); return; }
      const now = performance.now();
      if (now - lastFrameRef.current < 1000/60) { rafRef.current = requestAnimationFrame(draw); return; }
      lastFrameRef.current = now;

      const W = canvas.width / limitedDpr, H = canvas.height / limitedDpr;
      const frame = frameRef.current++;
      const t = frame * 0.016 * speed;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(limitedDpr, limitedDpr);

      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(0, 0, W, H);

      rotRef.current.step({
        xy: 0.007 * speed, xw: 0.011 * speed, yz: 0.009 * speed,
        zw: 0.005 * speed, xz: 0.006 * speed,
      }, 1);

      const cx = W / 2, cy = H / 2;
      const scale = Math.min(W, H) * 0.25;

      if (showTesseract) {
        const rotMatrix = rotRef.current.matrix();
        const projected = TESSERACT_VERTICES.map(v => {
          const rotated: [number,number,number,number] = [
            rotMatrix[0]*v[0]+rotMatrix[1]*v[1]+rotMatrix[2]*v[2]+rotMatrix[3]*v[3],
            rotMatrix[4]*v[0]+rotMatrix[5]*v[1]+rotMatrix[6]*v[2]+rotMatrix[7]*v[3],
            rotMatrix[8]*v[0]+rotMatrix[9]*v[1]+rotMatrix[10]*v[2]+rotMatrix[11]*v[3],
            rotMatrix[12]*v[0]+rotMatrix[13]*v[1]+rotMatrix[14]*v[2]+rotMatrix[15]*v[3],
          ];
          return project4Dto2D(rotated, cx, cy, scale * 0.6);
        });

        TESSERACT_EDGES.forEach(([i, j]) => {
          const a = projected[i], b = projected[j];
          const depth = (a.depth + b.depth) / 2 + 0.5;
          const alpha = depth * 0.25;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(${ac.r},${ac.g},${ac.b},${alpha})`;
          ctx.lineWidth = depth * 0.8;
          ctx.shadowColor = `rgba(${ac.r},${ac.g},${ac.b},${alpha * 1.5})`;
          ctx.shadowBlur = 4;
          ctx.moveTo(a.pos[0], a.pos[1]);
          ctx.lineTo(b.pos[0], b.pos[1]);
          ctx.stroke();
          ctx.shadowBlur = 0;
        });
      }

      particlesRef.current.forEach((p, pi) => {
        p.x += p.vx * (1 + Math.sin(t + p.phase) * 0.3);
        p.y += p.vy * (1 + Math.cos(t * 0.7 + p.phase) * 0.3);
        p.z += p.vz;
        p.w += p.vw * (1 + Math.sin(t * 0.5) * 0.2);
        if (Math.abs(p.x) > 1) p.vx *= -1;
        if (Math.abs(p.y) > 1) p.vy *= -1;
        if (Math.abs(p.z) > 1) p.vz *= -1;
        if (Math.abs(p.w) > 1) p.vw *= -1;

        const rot = rotRef.current.apply([p.x, p.y, p.z, p.w]);
        const { pos, depth } = project4Dto2D(rot, cx, cy, scale);
        const size = p.r * (0.5 + depth * 0.8);
        const alpha = p.alpha * (0.4 + depth * 0.6);
        const wBlend = (p.w + 1) / 2;
        const r2 = Math.round(ac.r * wBlend + 100 * (1 - wBlend));
        const g2 = Math.round(ac.g * wBlend + 200 * (1 - wBlend));
        const b2 = Math.round(ac.b * wBlend + 255 * (1 - wBlend));

        ctx.beginPath();
        ctx.fillStyle = `rgba(${r2},${g2},${b2},${alpha})`;
        ctx.shadowColor = `rgba(${r2},${g2},${b2},${alpha * 0.8})`;
        ctx.shadowBlur = size * 2;
        ctx.arc(pos[0], pos[1], size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        particlesRef.current.slice(pi + 1).forEach(p2 => {
          const rot2 = rotRef.current.apply([p2.x, p2.y, p2.z, p2.w]);
          const { pos: pos2, depth: d2 } = project4Dto2D(rot2, cx, cy, scale);
          const dx = pos2[0] - pos[0], dy = pos2[1] - pos[1];
          const dist = Math.sqrt(dx*dx + dy*dy);
          const maxDist = 80 + (depth + d2) * 30;
          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * 0.15 * (depth + d2) / 2;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${r2},${g2},${b2},${lineAlpha})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(pos[0], pos[1]);
            ctx.lineTo(pos2[0], pos2[1]);
            ctx.stroke();
          }
        });
      });

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [accentColor, particleCount, showTesseract, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`gpu-layer ${className}`}
      style={{ display: "block", width: "100%", height: "100%" }}
    />
  );
}
