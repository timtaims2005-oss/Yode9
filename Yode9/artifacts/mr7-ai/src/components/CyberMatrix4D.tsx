import { useEffect, useRef } from "react";

/**
 * CyberMatrix4D — Enhanced Matrix Rain with true 4D depth simulation.
 * Each column exists in 4D space: x, y, z (depth), w (hyper-depth).
 * w dimension controls: color temperature, blur, speed, and glyph density.
 */

const GLYPHS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF▓▒░█∑∏∂∇⊕⊗∈∉⊂⊃∪∩≡≠≤≥←→↑↓⇒⇔01";

interface Column {
  x: number;
  y: number;
  z: number;
  w: number;
  speed: number;
  chars: string[];
  length: number;
  opacity: number;
  hue: number;
}

interface CyberMatrix4DProps {
  className?: string;
  density?: number;
  accentColor?: string;
}

export function CyberMatrix4D({ className = "", density = 1, accentColor = "#e21227" }: CyberMatrix4DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const colsRef = useRef<Column[]>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const W = parent.offsetWidth, H = parent.offsetHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const CELL = 14;
    const NUM_COLS = Math.floor(W / CELL);

    const parseHex = (hex: string) => {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return { r, g, b };
    };
    const ac = parseHex(accentColor);
    const accentHue = Math.round(Math.atan2(ac.b - 128, ac.r - 128) * 180 / Math.PI + 180);

    const initCols = () => {
      colsRef.current = Array.from({ length: Math.floor(NUM_COLS * density) }, (_, i) => {
        const z = Math.random();
        const w = Math.random();
        return {
          x: Math.floor(Math.random() * NUM_COLS) * CELL,
          y: -Math.random() * H,
          z,
          w,
          speed: (0.8 + w * 1.8) * (0.6 + z * 0.8),
          chars: Array.from({ length: 20 + Math.floor(z * 20) }, () =>
            GLYPHS[Math.floor(Math.random() * GLYPHS.length)]),
          length: 8 + Math.floor(z * 20 + w * 10),
          opacity: 0.3 + z * 0.6,
          hue: w > 0.7 ? accentHue : w > 0.4 ? 180 : 120,
        };
      });
    };
    initCols();

    const draw = () => {
      const t = frameRef.current++;

      ctx.fillStyle = "rgba(0,0,0,0.06)";
      ctx.fillRect(0, 0, W, H);

      colsRef.current.forEach(col => {
        const speed4D = col.speed * (0.8 + Math.sin(t * 0.01 + col.w * 10) * 0.2);
        col.y += speed4D;
        if (col.y > H + col.length * CELL) {
          col.y = -col.length * CELL;
          col.x = Math.floor(Math.random() * NUM_COLS) * CELL;
          col.w = Math.random();
          col.z = Math.random();
          col.hue = col.w > 0.7 ? accentHue : col.w > 0.4 ? 180 : 120;
        }

        if (t % 3 === 0) {
          const mutIdx = Math.floor(Math.random() * col.chars.length);
          col.chars[mutIdx] = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        }

        col.chars.forEach((ch, i) => {
          const cy = col.y - i * CELL;
          if (cy < -CELL || cy > H + CELL) return;
          const isHead = i === 0;
          const fade = 1 - i / col.chars.length;
          const depthFade = 0.3 + col.z * 0.7;
          const wFade = 0.2 + col.w * 0.8;
          const alpha = (isHead ? 1 : fade * 0.85) * depthFade * wFade * col.opacity;

          const fontSize = Math.round((10 + col.z * 4) * (0.8 + col.w * 0.4));
          ctx.font = `${fontSize}px monospace`;

          if (isHead) {
            ctx.fillStyle = `rgba(240,255,255,${alpha})`;
            ctx.shadowColor = `hsla(${col.hue},100%,70%,${alpha})`;
            ctx.shadowBlur = 10 + col.w * 15;
          } else if (i < 3) {
            ctx.fillStyle = `hsla(${col.hue},100%,75%,${alpha})`;
            ctx.shadowColor = `hsla(${col.hue},100%,60%,${alpha * 0.5})`;
            ctx.shadowBlur = 4;
          } else {
            ctx.fillStyle = `hsla(${col.hue},80%,${40 + col.z * 25}%,${alpha * 0.7})`;
            ctx.shadowBlur = 0;
          }

          ctx.fillText(ch, col.x, cy);
          ctx.shadowBlur = 0;
        });
      });

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    const onVis = () => {
      if (document.hidden) cancelAnimationFrame(rafRef.current);
      else rafRef.current = requestAnimationFrame(draw);
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelAnimationFrame(rafRef.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [density, accentColor]);

  return (
    <canvas
      ref={canvasRef}
      className={`gpu-layer ${className}`}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    />
  );
}
