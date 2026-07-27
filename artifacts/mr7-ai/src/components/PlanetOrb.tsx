import { useEffect, useRef } from "react";

// ── Shared futuristic planet orb ───────────────────────────────────────────
// Clean single-hue glowing sphere + thin orbit ring + 2-3 moons.
// Replaces the previous rainbow-cycling / particle-storm orb designs used
// across the 4 TopBar icons with one focused, elegant aesthetic
// (reference: dark red glass sphere, soft rim light, orbiting moons).

export function hexToRgb(hex: string, fallback: [number, number, number]): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return fallback;
  return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
}

export interface PlanetOrbProps {
  size?: number;
  color?: [number, number, number];
  moonColor?: [number, number, number];
  hover?: boolean;
  open?: boolean;
  pulse?: boolean;
  moonCount?: 1 | 2 | 3;
  className?: string;
  style?: React.CSSProperties;
}

export function PlanetOrb({
  size = 28,
  color = [226, 18, 39],
  moonColor = [255, 255, 255],
  hover = false,
  open = false,
  pulse = false,
  moonCount = 2,
  className,
  style,
}: PlanetOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const hoverRef  = useRef(hover);
  const openRef   = useRef(open);
  const pulseRef  = useRef(pulse);
  const burstRef  = useRef(0);

  useEffect(() => { hoverRef.current = hover; if (hover) burstRef.current = tRef.current; }, [hover]);
  useEffect(() => { openRef.current  = open;  }, [open]);
  useEffect(() => { pulseRef.current = pulse; }, [pulse]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const SIZE = size;
    const DPR  = Math.min(window.devicePixelRatio || 1, 2);
    cv.width  = SIZE * DPR;
    cv.height = SIZE * DPR;
    ctx.scale(DPR, DPR);

    const cx = SIZE / 2, cy = SIZE / 2;
    const R  = SIZE * 0.30;
    const [cr, cg, cb] = color;
    const [mr, mg, mb] = moonColor;

    type Moon = { orbitR: number; speed: number; angle0: number; tilt: number; r: number; hue: number };
    const moons: Moon[] = Array.from({ length: moonCount }, (_, i) => ({
      orbitR: R + SIZE * (0.16 + i * 0.09),
      speed:  0.35 - i * 0.08,
      angle0: (i / moonCount) * Math.PI * 2 + i * 1.4,
      tilt:   0.34 + i * 0.06,
      r:      SIZE * (0.045 - i * 0.008),
      hue:    i,
    }));

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const isH = hoverRef.current;
      const isO = openRef.current;
      const isP = pulseRef.current;
      tRef.current += isH ? 0.020 : 0.011;
      const t = tRef.current;
      ctx.clearRect(0, 0, SIZE, SIZE);

      const energy = (isH || isO) ? 1 : isP ? 0.7 + Math.sin(t * 2.4) * 0.3 : 0.55;

      // ── outer ambient glow ──────────────────────────────────────────────
      const glow = ctx.createRadialGradient(cx, cy, R * 0.5, cx, cy, SIZE * 0.55);
      glow.addColorStop(0,    `rgba(${cr},${cg},${cb},${0.22 * energy})`);
      glow.addColorStop(0.55, `rgba(${cr},${cg},${cb},${0.08 * energy})`);
      glow.addColorStop(1,    `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, SIZE * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = glow; ctx.fill();

      // ── orbit ring path (single clean ellipse, slight tilt) ─────────────
      const tilt = 0.36 + Math.sin(t * 0.25) * 0.03;
      ctx.beginPath();
      ctx.ellipse(cx, cy, R + SIZE * 0.22, (R + SIZE * 0.22) * tilt, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.28 + energy * 0.14})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // ── planet sphere ─────────────────────────────────────────────────
      // base shadow disc
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${Math.round(cr * 0.18)},${Math.round(cg * 0.10)},${Math.round(cb * 0.10)},0.96)`;
      ctx.fill();

      // main diffuse sphere gradient — single hue, light top-left
      const diff = ctx.createRadialGradient(cx - R * 0.36, cy - R * 0.40, 0, cx, cy, R * 1.25);
      diff.addColorStop(0,    `rgba(${Math.min(cr + 90, 255)},${Math.min(cg + 60, 255)},${Math.min(cb + 60, 255)},0.98)`);
      diff.addColorStop(0.30, `rgba(${cr},${cg},${cb},0.95)`);
      diff.addColorStop(0.65, `rgba(${Math.round(cr * 0.55)},${Math.round(cg * 0.20)},${Math.round(cb * 0.20)},0.92)`);
      diff.addColorStop(1,    `rgba(${Math.round(cr * 0.22)},${Math.round(cg * 0.06)},${Math.round(cb * 0.06)},0.85)`);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = diff; ctx.fill();

      // subtle surface bands (very faint, single hue)
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
      for (let band = 0; band < 3; band++) {
        const by = cy - R + ((band + 0.5) / 3) * R * 2 + Math.sin(t * 0.4 + band) * 0.8;
        ctx.beginPath();
        ctx.ellipse(cx, by, R * 0.92, R * 0.16, 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${Math.round(cr * 0.5)},0,0,0.08)`;
        ctx.lineWidth = 1.0; ctx.stroke();
      }
      ctx.restore();

      // specular highlight
      const spec = ctx.createRadialGradient(cx - R * 0.42, cy - R * 0.46, 0, cx - R * 0.14, cy - R * 0.14, R * 0.95);
      spec.addColorStop(0,    "rgba(255,255,255,0.85)");
      spec.addColorStop(0.18, "rgba(255,255,255,0.28)");
      spec.addColorStop(0.5,  "rgba(255,255,255,0.04)");
      spec.addColorStop(1,    "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = spec; ctx.fill();

      // rim light (hover/open intensifies)
      const rim = ctx.createRadialGradient(cx + R * 0.62, cy + R * 0.5, 0, cx + R * 0.4, cy + R * 0.3, R * 0.9);
      rim.addColorStop(0, `rgba(255,${Math.round(80 + energy * 40)},${Math.round(80 + energy * 40)},${0.25 + energy * 0.25})`);
      rim.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = rim; ctx.fill();

      // ── moons (orbiting, alternating primary/white) ─────────────────────
      moons.forEach((m, i) => {
        const angle = m.angle0 + t * m.speed * (isH ? 1.6 : 1);
        const mx = cx + Math.cos(angle) * m.orbitR;
        const my = cy + Math.sin(angle) * m.orbitR * m.tilt;
        const front = Math.sin(angle) > -0.15;
        if (!front) return;
        const isWhite = i % 2 === 1;
        const [pr_, pg_, pb_] = isWhite ? [mr, mg, mb] : [cr, cg, cb];
        const mAlpha = 0.7 + Math.sin(t * 1.5 + i) * 0.2;
        const mg2 = ctx.createRadialGradient(mx, my, 0, mx, my, m.r * 2.4);
        mg2.addColorStop(0, `rgba(${pr_},${pg_},${pb_},${mAlpha})`);
        mg2.addColorStop(1, `rgba(${pr_},${pg_},${pb_},0)`);
        ctx.beginPath(); ctx.arc(mx, my, m.r * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = mg2; ctx.fill();
        ctx.beginPath(); ctx.arc(mx, my, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.min(pr_ + 60, 255)},${Math.min(pg_ + 60, 255)},${Math.min(pb_ + 60, 255)},${mAlpha})`;
        ctx.fill();
      });

      // ── hover corona pulse ────────────────────────────────────────────
      if (isH) {
        const burstAge = t - burstRef.current;
        if (burstAge < 1.6) {
          const bR = R + burstAge * SIZE * 0.30;
          ctx.beginPath(); ctx.arc(cx, cy, bR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${cr},${cg},${cb},${Math.max(0, 0.5 - burstAge * 0.35)})`;
          ctx.lineWidth = 1.2; ctx.stroke();
        }
      }
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, moonCount, color[0], color[1], color[2], moonColor[0], moonColor[1], moonColor[2]]);

  return (
    <canvas
      ref={canvasRef}
      width={size * 0.5}
      height={size * 0.5}
      className={className}
      style={{ width: size, height: size, display: "block", flexShrink: 0, ...style }}
    />
  );
}
