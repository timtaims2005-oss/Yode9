import { useEffect, useRef } from "react";
import { getCanvasConfig } from "@/lib/adaptive-quality";

interface MemorySegment {
  label: string; used: number; total: number; color: string;
}

interface QuantumMemoryGraphProps {
  className?: string;
}

const SEGMENTS: MemorySegment[] = [
  { label: "HEAP",   used: 0, total: 512,  color: "#e21227" },
  { label: "STACK",  used: 0, total: 128,  color: "#00e5ff" },
  { label: "BUFFER", used: 0, total: 256,  color: "#a78bfa" },
  { label: "CACHE",  used: 0, total: 1024, color: "#10b981" },
];

export function QuantumMemoryGraph({ className = "" }: QuantumMemoryGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const segsRef = useRef<MemorySegment[]>(
    SEGMENTS.map(s => ({ ...s, used: Math.random() * s.total * 0.8 }))
  );
  const frameRef = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const { dpr } = getCanvasConfig();
    const safeDpr = Math.min(dpr, 1.5);

    const resize = () => {
      const p = canvas.parentElement!;
      canvas.width = p.offsetWidth * safeDpr;
      canvas.height = p.offsetHeight * safeDpr;
      canvas.style.width = `${p.offsetWidth}px`;
      canvas.style.height = `${p.offsetHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);

    const histLen = 60;
    const history: number[][] = SEGMENTS.map(() => Array(histLen).fill(0));

    const draw = () => {
      const t = frameRef.current++ * 0.016;
      const W = canvas.width / safeDpr, H = canvas.height / safeDpr;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); ctx.scale(safeDpr, safeDpr);

      segsRef.current = segsRef.current.map((s, i) => {
        const target = s.total * (0.3 + 0.5 * Math.abs(Math.sin(t * (0.3 + i * 0.1))));
        const used = s.used + (target - s.used) * 0.05;
        history[i].push(used / s.total);
        if (history[i].length > histLen) history[i].shift();
        return { ...s, used };
      });

      const barH = (H - 20) / SEGMENTS.length - 4;
      segsRef.current.forEach((s, i) => {
        const y = 10 + i * (barH + 4);
        const pct = s.used / s.total;
        const barW = W - 60;

        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.beginPath();
        ctx.roundRect(50, y, barW, barH, 3);
        ctx.fill();

        const grad = ctx.createLinearGradient(50, 0, 50 + barW * pct, 0);
        grad.addColorStop(0, `${s.color}cc`);
        grad.addColorStop(1, `${s.color}44`);
        ctx.fillStyle = grad;
        ctx.shadowColor = s.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(50, y, Math.max(4, barW * pct), barH, 3);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = s.color;
        ctx.font = `bold 8px 'JetBrains Mono', monospace`;
        ctx.textAlign = "left";
        ctx.fillText(s.label, 0, y + barH / 2 + 3);

        ctx.fillStyle = "rgba(255,255,255,0.5)";
        ctx.textAlign = "right";
        ctx.fillText(`${Math.round(pct * 100)}%`, W, y + barH / 2 + 3);
      });

      ctx.restore();
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
  }, []);

  return <canvas ref={canvasRef} className={`gpu-layer ${className}`} style={{ width:"100%", height:"100%" }} />;
}
