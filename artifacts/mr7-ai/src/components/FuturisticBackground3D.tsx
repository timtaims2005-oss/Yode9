import { useEffect, useRef } from "react";

/*
  FUTURISTIC BACKGROUND 3D — v2
  Enhanced multi-layer cyber canvas:
   · Deep perspective grid with animated wave pulses + color bands
   · Floating hex data nodes with orbital rings + data beams
   · Atmospheric depth fog layers
   · Scan-line sweep + chromatic HUD flickers + glitch streaks
   · Drifting multi-layer particle constellation (3 depth planes)
   · Corner HUD brackets + status blips
  Zero external deps — pure Canvas 2D, requestAnimationFrame.
*/

const LABELS = [
  "0xDEAD", "CVE", "SHELL", "ROOT", "FUZZ", "OSINT",
  "NEXUS",  "XSS", "RCE",  "ARM64","ELF",  "BUF",
  "HEAP",   "KALI","PRIV", "NET",  "TLS",  "DNS",
  "PKT",    "SYN", "IOCTL","MMAP", "PTRACE","EXP",
  "ZERO",   "APT", "C2",   "BOT",  "RAT",  "VXER",
];

export function FuturisticBackground3D({
  opacity = 0.7,
  accentColor = "#e21227",
}: {
  opacity?: number;
  accentColor?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);
  const timeRef   = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true })!;

    const parseColor = (hex: string) => ({
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    });
    const ac  = parseColor(accentColor);
    const sec = { r: 0,   g: 229, b: 255 };  // cyan accent
    const tri = { r: 167, g: 139, b: 250 };  // violet accent

    // ── Types ─────────────────────────────────────────────────────────────
    type HexNode = {
      x: number; y: number; z: number;
      vx: number; vy: number;
      size: number; phase: number; phaseSpd: number;
      label: string; alpha: number;
      orbitAngle: number; orbitSpd: number; orbitR: number;
      accentIdx: number;
    };
    type Beam = { a: number; b: number; t: number; spd: number; col: string };
    type Particle = {
      x: number; y: number;
      vx: number; vy: number;
      alpha: number; r: number;
      col: string; depth: number;
    };
    type GlitchStreak = { x: number; y: number; w: number; h: number; ttl: number };

    let nodes:   HexNode[]     = [];
    let beams:   Beam[]        = [];
    let particles: Particle[]  = [];
    let glitches: GlitchStreak[] = [];

    const ACCENT_COLS = [accentColor, "#00e5ff", "#a78bfa", "#22c55e", "#f59e0b"];

    // ── Resize ────────────────────────────────────────────────────────────
    let W = 0, H = 0;
    function resize() {
      W = canvas!.offsetWidth;
      H = canvas!.offsetHeight;
      canvas!.width  = W;
      canvas!.height = H;
      initScene();
    }
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    function initScene() {
      const nodeCount = Math.min(18, Math.max(8, Math.floor(W * H / 38000)));
      nodes = Array.from({ length: nodeCount }, () => ({
        x:         Math.random() * W,
        y:         Math.random() * H,
        z:         0.35 + Math.random() * 0.65,
        vx:        (Math.random() - 0.5) * 0.16,
        vy:        (Math.random() - 0.5) * 0.13,
        size:      2 + Math.random() * 3.5,
        phase:     Math.random() * Math.PI * 2,
        phaseSpd:  0.004 + Math.random() * 0.014,
        label:     LABELS[Math.floor(Math.random() * LABELS.length)],
        alpha:     0.35 + Math.random() * 0.55,
        orbitAngle: Math.random() * Math.PI * 2,
        orbitSpd:  (Math.random() - 0.5) * 0.018,
        orbitR:    8 + Math.random() * 18,
        accentIdx: Math.floor(Math.random() * ACCENT_COLS.length),
      }));

      const pCount = Math.min(30, Math.floor(W * H / 20000));
      particles = Array.from({ length: pCount }, () => ({
        x:     Math.random() * W,
        y:     Math.random() * H,
        vx:    (Math.random() - 0.5) * 0.06,
        vy:    -(0.05 + Math.random() * 0.22),
        alpha: 0.04 + Math.random() * 0.22,
        r:     0.4 + Math.random() * 1.8,
        col:   ACCENT_COLS[Math.floor(Math.random() * ACCENT_COLS.length)],
        depth: 0.2 + Math.random() * 0.8,
      }));
    }

    // ── Helpers ───────────────────────────────────────────────────────────
    function hexPath(cx: number, cy: number, r: number) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        if (i === 0) ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        else         ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      }
      ctx.closePath();
    }

    // ── Grid ─────────────────────────────────────────────────────────────
    function drawGrid(t: number) {
      const HORIZ  = H * 0.52;
      const FOV    = H * 1.6;
      const COLS   = 24;
      const ROWS   = 20;
      const DEPTH  = 1600;
      const GRID_W = DEPTH * 1.9;
      const pulse  = Math.sin(t * 0.38) * 0.5 + 0.5;
      const camZ   = 240 + Math.sin(t * 0.2) * 50;
      const wavePct = (t * 0.15) % 1;          // wave front 0→1 over depth

      function project(wx: number, wz: number) {
        const dz = wz + camZ;
        if (dz <= 0) return { x: W / 2, y: HORIZ, alpha: 0 };
        return {
          x:     W / 2 + (wx / dz) * FOV,
          y:     HORIZ + (FOV / dz) * 30,
          alpha: Math.max(0, 1 - wz / DEPTH),
        };
      }

      // Vertical lines
      for (let i = 0; i <= COLS; i++) {
        const wx      = (i / COLS - 0.5) * GRID_W;
        const near    = project(wx * 2.5, 0);
        const far     = project(wx,       DEPTH);
        const edgeFade = 1 - Math.abs(i / COLS - 0.5) * 1.8;
        if (edgeFade <= 0) continue;
        const a = edgeFade * 0.065 * opacity;
        if (a < 0.004) continue;
        const grad = ctx.createLinearGradient(near.x, near.y, far.x, far.y);
        grad.addColorStop(0, `rgba(${ac.r},${ac.g},${ac.b},${a + pulse * 0.025})`);
        grad.addColorStop(1, `rgba(${ac.r},${ac.g},${ac.b},0)`);
        ctx.beginPath();
        ctx.moveTo(near.x, H + 10);
        ctx.lineTo(far.x,  HORIZ);
        ctx.strokeStyle = grad;
        ctx.lineWidth   = 0.6;
        ctx.stroke();
      }

      // Horizontal depth bands + traveling wave
      for (let r = 0; r <= ROWS; r++) {
        const wz       = (r / ROWS) * DEPTH;
        const p0       = project(-GRID_W * 0.9, wz);
        const p1       = project( GRID_W * 0.9, wz);
        const rowNorm  = r / ROWS;
        const waveDist = Math.abs(rowNorm - wavePct);
        const waveGlow = Math.exp(-waveDist * 22) * 0.18;
        const rowPulse = Math.sin(t * 1.1 - wz * 0.003) * 0.5 + 0.5;
        const a = p0.alpha * (0.06 + waveGlow) * opacity * rowPulse;
        if (a < 0.003) continue;
        const screenY = HORIZ + (H - HORIZ) * (r / ROWS);
        ctx.beginPath();
        ctx.moveTo(p0.x, screenY);
        ctx.lineTo(p1.x, screenY);
        const lineCol = waveGlow > 0.05
          ? `rgba(${sec.r},${sec.g},${sec.b},${a * 1.5})`
          : `rgba(${ac.r},${ac.g},${ac.b},${a})`;
        ctx.strokeStyle = lineCol;
        ctx.lineWidth   = waveGlow > 0.05 ? 1.2 : 0.6;
        ctx.stroke();
      }

      // Horizon glow
      const hg = ctx.createLinearGradient(0, HORIZ - 16, 0, HORIZ + 16);
      hg.addColorStop(0,   "transparent");
      hg.addColorStop(0.5, `rgba(${ac.r},${ac.g},${ac.b},${0.07 + pulse * 0.04})`);
      hg.addColorStop(1,   "transparent");
      ctx.fillStyle = hg;
      ctx.fillRect(0, HORIZ - 16, W, 32);
    }

    // ── Nodes + beams ────────────────────────────────────────────────────
    function drawNodes(t: number) {
      const CONN_DIST = Math.min(W, H) * 0.28;

      if (Math.random() < 0.022 && nodes.length >= 2 && beams.length < 8) {
        const a = Math.floor(Math.random() * nodes.length);
        let b   = Math.floor(Math.random() * nodes.length);
        if (b === a) b = (b + 1) % nodes.length;
        const dx = nodes[a].x - nodes[b].x;
        const dy = nodes[a].y - nodes[b].y;
        if (Math.hypot(dx, dy) < CONN_DIST * 1.5)
          beams.push({ a, b, t: 0, spd: 0.007 + Math.random() * 0.011,
            col: ACCENT_COLS[Math.floor(Math.random() * ACCENT_COLS.length)] });
      }

      // Static connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const ni = nodes[i], nj = nodes[j];
          const d  = Math.hypot(ni.x - nj.x, ni.y - nj.y);
          if (d > CONN_DIST) continue;
          const a = (1 - d / CONN_DIST) * 0.055 * opacity * Math.min(ni.z, nj.z);
          ctx.beginPath();
          ctx.moveTo(ni.x, ni.y);
          ctx.lineTo(nj.x, nj.y);
          ctx.strokeStyle = `rgba(${ac.r},${ac.g},${ac.b},${a})`;
          ctx.lineWidth   = 0.5;
          ctx.stroke();
        }
      }

      // Beam packets
      beams = beams.filter(bm => {
        bm.t += bm.spd;
        if (bm.t > 1) return false;
        const na = nodes[bm.a], nb = nodes[bm.b];
        if (!na || !nb) return false;
        const px   = na.x + (nb.x - na.x) * bm.t;
        const py   = na.y + (nb.y - na.y) * bm.t;
        const tail = Math.max(0, bm.t - 0.16);
        const tx   = na.x + (nb.x - na.x) * tail;
        const ty   = na.y + (nb.y - na.y) * tail;
        const pc   = parseColor(bm.col);
        const g    = ctx.createLinearGradient(tx, ty, px, py);
        g.addColorStop(0, "transparent");
        g.addColorStop(1, `rgba(${pc.r},${pc.g},${pc.b},${0.9 * opacity})`);
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(px, py);
        ctx.strokeStyle = g; ctx.lineWidth = 1.5; ctx.stroke();
        const gw = ctx.createRadialGradient(px, py, 0, px, py, 7);
        gw.addColorStop(0, `rgba(${pc.r},${pc.g},${pc.b},${0.85 * opacity})`);
        gw.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fillStyle = gw; ctx.fill();
        return true;
      });

      // Hex nodes
      for (const n of nodes) {
        n.phase      += n.phaseSpd;
        n.orbitAngle += n.orbitSpd;
        const pulse = Math.sin(n.phase) * 0.5 + 0.5;
        n.x += n.vx; n.y += n.vy;
        if (n.x < -25) n.x = W + 25; if (n.x > W + 25) n.x = -25;
        if (n.y < -25) n.y = H + 25; if (n.y > H + 25) n.y = -25;

        const acol = ACCENT_COLS[n.accentIdx];
        const nc   = parseColor(acol);
        const sz   = n.size * n.z * (0.78 + pulse * 0.35);
        const a    = n.alpha * n.z * opacity;

        // Outer glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, sz * 4);
        grd.addColorStop(0, `rgba(${nc.r},${nc.g},${nc.b},${a * 0.12})`);
        grd.addColorStop(1, "transparent");
        ctx.beginPath(); ctx.arc(n.x, n.y, sz * 4, 0, Math.PI * 2);
        ctx.fillStyle = grd; ctx.fill();

        // Orbital ring (on large, close nodes)
        if (n.z > 0.6 && sz > 4) {
          ctx.beginPath();
          ctx.ellipse(n.x, n.y, sz * 2.8, sz * 1.1, n.orbitAngle * 0.5, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${nc.r},${nc.g},${nc.b},${a * 0.22})`;
          ctx.lineWidth   = 0.6;
          ctx.stroke();

          // Orbiting dot
          const ox = n.x + Math.cos(n.orbitAngle) * sz * 2.8;
          const oy = n.y + Math.sin(n.orbitAngle) * sz * 1.1;
          ctx.beginPath(); ctx.arc(ox, oy, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${nc.r},${nc.g},${nc.b},${a * 0.7})`;
          ctx.shadowColor = acol; ctx.shadowBlur = 5;
          ctx.fill(); ctx.shadowBlur = 0;
        }

        // Hex shape
        hexPath(n.x, n.y, sz);
        ctx.strokeStyle = `rgba(${nc.r},${nc.g},${nc.b},${a * (0.5 + pulse * 0.3)})`;
        ctx.lineWidth   = 0.8;
        ctx.stroke();
        hexPath(n.x, n.y, sz * 0.5);
        ctx.fillStyle = `rgba(${nc.r},${nc.g},${nc.b},${a * 0.14})`;
        ctx.fill();

        // Center dot
        ctx.beginPath(); ctx.arc(n.x, n.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle   = `rgba(${nc.r},${nc.g},${nc.b},${a * 0.8})`;
        ctx.shadowColor = acol; ctx.shadowBlur = 6;
        ctx.fill(); ctx.shadowBlur = 0;

        // Label
        if (n.z > 0.65 && pulse > 0.6) {
          ctx.font      = `${Math.round(6.5 * n.z)}px monospace`;
          ctx.fillStyle = `rgba(${nc.r},${nc.g},${nc.b},${a * pulse * 0.6})`;
          ctx.fillText(n.label, n.x + sz + 4, n.y + 3);
        }
      }
    }

    // ── Particles (3 depth layers) ────────────────────────────────────────
    function drawParticles() {
      for (const p of particles) {
        p.x += p.vx * p.depth;
        p.y += p.vy * p.depth;
        if (p.y < -12) { p.y = H + 12; p.x = Math.random() * W; }
        if (p.x < -12) { p.x = W + 12; }
        if (p.x > W + 12) { p.x = -12; }
        const pc = parseColor(p.col);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * p.depth, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pc.r},${pc.g},${pc.b},${p.alpha * p.depth * opacity})`;
        ctx.fill();
      }
    }

    // ── Atmospheric fog layers ────────────────────────────────────────────
    function drawFog() {
      // Top vignette
      const tg = ctx.createLinearGradient(0, 0, 0, H * 0.3);
      tg.addColorStop(0, `rgba(${ac.r},${ac.g},${ac.b},${0.018 * opacity})`);
      tg.addColorStop(1, "transparent");
      ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H * 0.3);

      // Bottom vignette
      const bg = ctx.createLinearGradient(0, H * 0.7, 0, H);
      bg.addColorStop(0, "transparent");
      bg.addColorStop(1, `rgba(4,4,8,${0.25 * opacity})`);
      ctx.fillStyle = bg; ctx.fillRect(0, H * 0.7, W, H * 0.3);
    }

    // ── Scan-line sweep ───────────────────────────────────────────────────
    function drawScanLine(t: number) {
      const y  = ((t * 0.165) % 1) * H;
      const sg = ctx.createLinearGradient(0, y - 45, 0, y + 45);
      sg.addColorStop(0,    "transparent");
      sg.addColorStop(0.42, `rgba(${ac.r},${ac.g},${ac.b},${0.012 * opacity})`);
      sg.addColorStop(0.5,  `rgba(${ac.r},${ac.g},${ac.b},${0.035 * opacity})`);
      sg.addColorStop(0.58, `rgba(${ac.r},${ac.g},${ac.b},${0.012 * opacity})`);
      sg.addColorStop(1,    "transparent");
      ctx.fillStyle = sg; ctx.fillRect(0, y - 45, W, 90);
    }

    // ── Glitch streaks ───────────────────────────────────────────────────
    function maybeGlitch(t: number) {
      if (Math.random() < 0.003) {
        glitches.push({
          x: Math.random() * W * 0.8,
          y: Math.random() * H,
          w: 40 + Math.random() * 120,
          h: 1 + Math.random() * 3,
          ttl: 4 + Math.floor(Math.random() * 8),
        });
      }
      glitches = glitches.filter(g => {
        g.ttl--;
        const a = (g.ttl / 10) * 0.6 * opacity;
        ctx.fillStyle = `rgba(${ac.r},${ac.g},${ac.b},${a})`;
        ctx.fillRect(g.x, g.y, g.w, g.h);
        return g.ttl > 0;
      });
    }

    // ── HUD corner brackets ───────────────────────────────────────────────
    function drawCornerHUD(t: number) {
      const SZ   = 22;
      const blink = Math.sin(t * 3.5) > 0.3;
      const ca   = 0.18 * opacity;
      ctx.strokeStyle = `rgba(${ac.r},${ac.g},${ac.b},${ca})`;
      ctx.lineWidth   = 1;

      const corners = [
        [5, 5],       // TL
        [W - 5, 5],   // TR
        [5, H - 5],   // BL
        [W - 5, H - 5], // BR
      ];
      corners.forEach(([cx, cy], ci) => {
        const sx  = cx === 5 ? 1 : -1;
        const sy  = cy === 5 ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(cx + sx * SZ, cy);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx, cy + sy * SZ);
        ctx.stroke();

        if (blink && ci === 0) {
          ctx.fillStyle = `rgba(${ac.r},${ac.g},${ac.b},${0.55 * opacity})`;
          ctx.beginPath();
          ctx.arc(cx + 9, cy + 9, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Secondary micro-brackets at 35px offset
      const SM = 10;
      ctx.strokeStyle = `rgba(${sec.r},${sec.g},${sec.b},${ca * 0.5})`;
      ctx.lineWidth   = 0.5;
      corners.forEach(([cx, cy]) => {
        const sx = cx === 5 ? 1 : -1;
        const sy = cy === 5 ? 1 : -1;
        const ox = cx + sx * 30;
        const oy = cy + sy * 30;
        ctx.beginPath();
        ctx.moveTo(ox + sx * SM, oy);
        ctx.lineTo(ox, oy);
        ctx.lineTo(ox, oy + sy * SM);
        ctx.stroke();
      });
    }

    // ── Status blip bar (bottom-left) ────────────────────────────────────
    function drawStatusBlips(t: number) {
      const blips = [
        { col: `rgba(${ac.r},${ac.g},${ac.b},${opacity * 0.7})`,  on: Math.sin(t * 4.1) > 0    },
        { col: `rgba(${sec.r},${sec.g},${sec.b},${opacity * 0.5})`,on: Math.sin(t * 2.3) > 0.2  },
        { col: `rgba(${tri.r},${tri.g},${tri.b},${opacity * 0.4})`,on: Math.sin(t * 5.7) > 0.5  },
      ];
      blips.forEach((b, i) => {
        if (!b.on) return;
        ctx.beginPath();
        ctx.arc(14 + i * 12, H - 10, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = b.col;
        ctx.fill();
      });
    }

    // ── Main loop ─────────────────────────────────────────────────────────
    let lastFrameTs = 0;
    function draw(now: number) {
      rafRef.current = requestAnimationFrame(draw);
      if (now - lastFrameTs < 42) return; // ~24fps cap
      lastFrameTs = now;
      timeRef.current += 0.011;
      const t = timeRef.current;
      ctx.clearRect(0, 0, W, H);

      drawGrid(t);
      drawNodes(t);
      drawParticles();
      drawFog();
      drawScanLine(t);
      maybeGlitch(t);
      drawCornerHUD(t);
      drawStatusBlips(t);
    }

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [accentColor, opacity]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />
  );
}
