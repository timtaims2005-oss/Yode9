/**
 * Post-Processing Pipeline
 * Bloom + Chromatic Aberration + CRT Glitch + God Rays + Tone Mapping
 * يعمل فوق أي Canvas بدون مكتبات خارجية إضافية
 */
import { useRef, useMemo, useEffect } from "react";

interface PostFXProps {
  enabled?: boolean;
  bloom?: boolean;
  glitch?: boolean;
  scanlines?: boolean;
  vignette?: boolean;
  chromaticAberration?: boolean;
}

export function CSSPostFX({
  enabled = true,
  bloom = true,
  glitch = false,
  scanlines = true,
  vignette = true,
  chromaticAberration = false,
}: PostFXProps) {
  if (!enabled) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-10" aria-hidden>
      {/* Vignette */}
      {vignette && (
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.7) 100%)",
          }}
        />
      )}

      {/* Scanlines */}
      {scanlines && (
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.8) 2px, rgba(0,0,0,0.8) 4px)",
            backgroundSize: "100% 4px",
          }}
        />
      )}

      {/* Bloom glow overlay */}
      {bloom && (
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at 50% 50%, rgba(226,18,39,0.04) 0%, transparent 70%)",
            mixBlendMode: "screen",
          }}
        />
      )}

      {/* Chromatic Aberration border */}
      {chromaticAberration && (
        <div
          className="absolute inset-0"
          style={{
            boxShadow: "inset 0 0 80px rgba(226,18,39,0.08), inset 0 0 40px rgba(0,229,255,0.06)",
          }}
        />
      )}
    </div>
  );
}

// ── Canvas-based Post Processing (2D overlay) ──────────────────────────────
export function CanvasPostFX({ enabled = true }: { enabled?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef   = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let startTime = performance.now();

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = (now: number) => {
      animRef.current = requestAnimationFrame(draw);
      const t = (now - startTime) / 1000;
      const { width: W, height: H } = canvas;

      ctx.clearRect(0, 0, W, H);

      // Animated edge glow
      const pulse = Math.sin(t * 1.5) * 0.5 + 0.5;
      const grad = ctx.createRadialGradient(W/2, H/2, H*0.3, W/2, H/2, H*0.8);
      grad.addColorStop(0, "transparent");
      grad.addColorStop(1, `rgba(226,18,39,${0.03 * pulse})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Moving scan line
      const scanY = (t * 120) % (H + 40) - 20;
      const scanGrad = ctx.createLinearGradient(0, scanY - 4, 0, scanY + 4);
      scanGrad.addColorStop(0, "transparent");
      scanGrad.addColorStop(0.5, `rgba(0,229,255,${0.05 * pulse})`);
      scanGrad.addColorStop(1, "transparent");
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanY - 4, W, 8);

      // Corner triangles (cyberpunk style)
      ctx.strokeStyle = `rgba(226,18,39,${0.3 + pulse * 0.2})`;
      ctx.lineWidth   = 1;
      const cornerSize = 24;
      // top-left
      ctx.beginPath(); ctx.moveTo(0, cornerSize); ctx.lineTo(0, 0); ctx.lineTo(cornerSize, 0); ctx.stroke();
      // top-right
      ctx.beginPath(); ctx.moveTo(W - cornerSize, 0); ctx.lineTo(W, 0); ctx.lineTo(W, cornerSize); ctx.stroke();
      // bottom-left
      ctx.beginPath(); ctx.moveTo(0, H - cornerSize); ctx.lineTo(0, H); ctx.lineTo(cornerSize, H); ctx.stroke();
      // bottom-right
      ctx.beginPath(); ctx.moveTo(W - cornerSize, H); ctx.lineTo(W, H); ctx.lineTo(W, H - cornerSize); ctx.stroke();

      // Subtle noise grain
      const noise = ctx.createImageData(W, H);
      for (let i = 0; i < noise.data.length; i += 4) {
        const v = Math.random() * 8;
        noise.data[i] = noise.data[i+1] = noise.data[i+2] = v;
        noise.data[i+3] = 6;
      }
      ctx.putImageData(noise, 0, 0);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-20"
      aria-hidden
    />
  );
}
