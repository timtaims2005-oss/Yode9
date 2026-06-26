import { useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════
   MATRIX RAIN BACKGROUND
   Classic green matrix digital rain — canvas-based.
   Supports accent color override, paused prop, density.
   Zero external deps — pure Canvas 2D.
═══════════════════════════════════════════════════ */

const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF$#@!%^&*()[]{}|<>?/\\";

interface Drop {
  x: number;
  y: number;
  speed: number;
  brightness: number;
  chars: string[];
  length: number;
}

export function MatrixRainBackground({
  color   = "#00ff41",
  opacity = 0.55,
  density = 0.5,
  paused  = false,
  enabled = true,
}: {
  color?:   string;
  opacity?: number;
  density?: number;
  paused?:  boolean;
  enabled?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const dropsRef  = useRef<Drop[]>([]);
  const pausedRef = useRef(paused);

  useEffect(() => { pausedRef.current = paused; }, [paused]);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const FONT_SIZE = 13;
    let W = 0, H = 0;

    function hexToRgb(hex: string) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    }
    const rgb = hexToRgb(color.startsWith("#") && color.length >= 7 ? color : "#00ff41");

    function resize() {
      W = canvas!.offsetWidth; H = canvas!.offsetHeight;
      canvas!.width = W; canvas!.height = H;
      const cols = Math.floor(W / FONT_SIZE);
      const count = Math.floor(cols * density);
      dropsRef.current = [];
      for (let i = 0; i < count; i++) {
        dropsRef.current.push(makeDropAt(Math.floor(Math.random() * cols) * FONT_SIZE));
      }
    }

    function randChar() { return CHARS[Math.floor(Math.random() * CHARS.length)]; }

    function makeDropAt(x: number): Drop {
      const length = Math.floor(8 + Math.random() * 22);
      const chars: string[] = Array.from({ length }, () => randChar());
      return {
        x,
        y: Math.random() < 0.4 ? Math.floor(Math.random() * H) : -length * FONT_SIZE,
        speed: FONT_SIZE * (0.6 + Math.random() * 1.4),
        brightness: 0.5 + Math.random() * 0.5,
        chars,
        length,
      };
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let last = performance.now();

    function tick(now: number) {
      rafRef.current = requestAnimationFrame(tick);
      if (pausedRef.current) return;

      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;

      // Fade trail
      ctx.fillStyle = `rgba(0,0,0,0.18)`;
      ctx.fillRect(0, 0, W, H);

      ctx.font = `bold ${FONT_SIZE}px monospace`;

      dropsRef.current.forEach(drop => {
        drop.y += drop.speed * dt * 60 / FONT_SIZE * FONT_SIZE;

        // Draw each char in trail
        drop.chars.forEach((ch, ci) => {
          const cy = drop.y - ci * FONT_SIZE;
          if (cy < -FONT_SIZE || cy > H + FONT_SIZE) return;
          // Mutate chars occasionally
          if (Math.random() < 0.02) drop.chars[ci] = randChar();
          // Head = white/bright, tail fades
          const isHead = ci === 0;
          const fade = Math.pow(1 - ci / drop.length, 1.4);
          const a = fade * drop.brightness * opacity;
          if (a < 0.02) return;
          if (isHead) {
            ctx.fillStyle = `rgba(255,255,255,${(a * 1.4).toFixed(3)})`;
          } else {
            ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${a.toFixed(3)})`;
          }
          ctx.fillText(ch, drop.x, cy);
        });

        // Reset when fully off-screen
        if (drop.y - drop.length * FONT_SIZE > H + 20) {
          const cols = Math.floor(W / FONT_SIZE);
          drop.x = Math.floor(Math.random() * cols) * FONT_SIZE;
          drop.y = -drop.length * FONT_SIZE;
          drop.speed = FONT_SIZE * (0.6 + Math.random() * 1.4);
          drop.brightness = 0.5 + Math.random() * 0.5;
          drop.length = Math.floor(8 + Math.random() * 22);
          drop.chars = Array.from({ length: drop.length }, () => randChar());
        }
      });
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      dropsRef.current = [];
    };
  }, [color, opacity, density, enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 0,
        willChange: "transform",
        opacity,
      }}
    />
  );
}
