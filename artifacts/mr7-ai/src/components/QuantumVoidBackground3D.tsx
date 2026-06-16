import { useEffect, useRef } from "react";

/*
  QUANTUM VOID BACKGROUND 3D — Maximum Quality
  ─────────────────────────────────────────────
  Layers (back → front):
  1. Deep space starfield — 3 parallax depth planes
  2. Volumetric nebula clouds — 4 drifting radial glows
  3. 3D perspective cyberspace grid — infinite floor + ceiling
  4. Neural network — 80 nodes + connection web + signal pulses
  5. Data rain — falling hex/binary columns
  6. Holographic scan line sweep
  7. Corner HUD brackets + status ticks
  8. Vignette fade
  Pure Canvas 2D, requestAnimationFrame, DPR-aware, zero deps.
*/

interface Props {
  opacity?: number;
  accentColor?: string;
}

export function QuantumVoidBackground3D({ opacity = 0.60, accentColor = "#e21227" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);

  useEffect(() => {
    if (!canvasRef.current) return;
    const cv = canvasRef.current as HTMLCanvasElement;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const DPR = Math.min(window.devicePixelRatio * 1.5, 3);
    const parseHex = (h: string) => ({
      r: parseInt(h.slice(1,3),16), g: parseInt(h.slice(3,5),16), b: parseInt(h.slice(5,7),16),
    });
    const ac = parseHex(accentColor);
    const ACCENT = `${ac.r},${ac.g},${ac.b}`;

    function hsl(hd: number, s = 1, l = 0.55): string {
      const hh = ((hd%360)+360)%360;
      const k  = (n: number) => (n+hh/30)%12;
      const aa = s*Math.min(l,1-l);
      const f  = (n: number) => l-aa*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));
      return `${Math.round(f(0)*255)},${Math.round(f(8)*255)},${Math.round(f(4)*255)}`;
    }

    let W = 0, H = 0;

    function resize() {
      const rect = cv.parentElement?.getBoundingClientRect();
      W = (rect?.width  || window.innerWidth);
      H = (rect?.height || window.innerHeight);
      cv.width  = W * DPR;
      cv.height = H * DPR;
      cv.style.width  = W + "px";
      cv.style.height = H + "px";
      ctx.scale(DPR, DPR);
      initAll();
    }

    // ── 1. Stars ─────────────────────────────────────────────────────────────
    type Star = { x: number; y: number; r: number; a: number; va: number; depth: number };
    let stars: Star[] = [];
    function initStars() {
      stars = Array.from({ length: 260 }, (_, i) => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.15 + Math.random() * (i < 80 ? 0.3 : i < 160 ? 0.7 : 1.4),
        a: 0.08 + Math.random() * 0.7,
        va: 0.005 + Math.random() * 0.025,
        depth: i < 80 ? 0.2 : i < 160 ? 0.55 : 1.0,
      }));
    }

    // ── 2. Nebula clouds ─────────────────────────────────────────────────────
    type Nebula = { cx: number; cy: number; r: number; phase: number; spd: number; hOff: number };
    let nebulae: Nebula[] = [];
    function initNebulae() {
      nebulae = [
        { cx: W*0.22, cy: H*0.28, r: W*0.32, phase: 0,    spd: 0.004, hOff:   0 },
        { cx: W*0.78, cy: H*0.72, r: W*0.28, phase: 2.1,  spd: 0.006, hOff: 120 },
        { cx: W*0.50, cy: H*0.50, r: W*0.40, phase: 4.2,  spd: 0.003, hOff: 240 },
        { cx: W*0.88, cy: H*0.20, r: W*0.18, phase: 1.05, spd: 0.008, hOff:  60 },
      ];
    }

    // ── 3. Cyberspace 3D grid ────────────────────────────────────────────────
    // Draws infinite perspective grid flowing toward camera (z → 0)
    const GRID_COLS  = 18;
    const GRID_ROWS  = 22;
    const GRID_SPEED = 0.18; // z-scroll speed

    // ── 4. Neural network ────────────────────────────────────────────────────
    type NNode = { x: number; y: number; z: number; vx: number; vy: number; hOff: number; r: number };
    type NEdge = { a: number; b: number };
    type NSig  = { edge: number; t: number; spd: number; hOff: number };
    let nodes:   NNode[] = [];
    let edges:   NEdge[] = [];
    let signals: NSig[]  = [];
    const NODE_COUNT = 80;
    const DEPTH_Z = 300;

    function initNodes() {
      nodes = Array.from({ length: NODE_COUNT }, (_, i) => ({
        x: 60 + Math.random() * (W - 120),
        y: 40 + Math.random() * (H - 80),
        z: Math.random() * DEPTH_Z,
        vx: (Math.random() - 0.5) * 0.12,
        vy: (Math.random() - 0.5) * 0.10,
        hOff: (i / NODE_COUNT) * 360,
        r: 1.0 + Math.random() * 1.5,
      }));
      edges = [];
      for (let i = 0; i < NODE_COUNT; i++) {
        for (let j = i+1; j < NODE_COUNT; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d  = Math.sqrt(dx*dx + dy*dy);
          if (d < Math.min(W,H) * 0.20 && edges.length < 180) {
            edges.push({ a: i, b: j });
          }
        }
      }
    }

    function spawnSignal(t: number) {
      if (signals.length < 60 && Math.random() < 0.04) {
        const ei = Math.floor(Math.random() * edges.length);
        signals.push({ edge: ei, t: 0, spd: 0.004 + Math.random() * 0.008, hOff: t * 60 % 360 });
      }
    }

    // ── 5. Data rain ─────────────────────────────────────────────────────────
    const HEX_CHARS = "0123456789ABCDEF";
    const DATA_CHARS = "01" + HEX_CHARS + "XRCE SHELL FUZZ ROOT KALI CVE RCE BUF PRIV ";
    type DataCol = { x: number; chars: { c: string; y: number; a: number }[]; spd: number; hOff: number };
    let dataCols: DataCol[] = [];
    function initDataCols() {
      const count = Math.floor(W / 42);
      dataCols = Array.from({ length: count }, (_, i) => ({
        x: 14 + i * 42 + (Math.random() - 0.5) * 16,
        chars: Array.from({ length: 8 + Math.floor(Math.random() * 12) }, (_, ci) => ({
          c: DATA_CHARS[Math.floor(Math.random() * DATA_CHARS.length)],
          y: Math.random() * H,
          a: 0.05 + Math.random() * 0.55,
        })),
        spd: 0.5 + Math.random() * 1.5,
        hOff: Math.random() * 360,
      }));
    }

    function initAll() {
      initStars();
      initNebulae();
      initNodes();
      initDataCols();
    }

    resize();

    const ro = new ResizeObserver(resize);
    if (cv.parentElement) ro.observe(cv.parentElement);

    // ── Draw ─────────────────────────────────────────────────────────────────
    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current  += 0.014;
      const t = tRef.current;

      if (W < 2 || H < 2) return;

      ctx.clearRect(0, 0, W, H);

      // Global hue cycling
      const hue = (t * 8) % 360;

      // ── LAYER 1: Deep space background ───────────────────────────────────
      const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
      bgGrad.addColorStop(0,   "rgba(2,2,8,1)");
      bgGrad.addColorStop(0.4, "rgba(4,3,14,1)");
      bgGrad.addColorStop(0.8, "rgba(3,2,10,1)");
      bgGrad.addColorStop(1,   "rgba(1,1,5,1)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // ── LAYER 2: Nebula clouds ────────────────────────────────────────────
      nebulae.forEach((nb, ni) => {
        nb.phase += nb.spd * 0.016;
        const ncx = nb.cx + Math.sin(t * 0.05 + nb.phase) * W * 0.04;
        const ncy = nb.cy + Math.cos(t * 0.04 + nb.phase * 0.7) * H * 0.03;
        const alpha = (0.028 + Math.sin(t * 0.08 + ni) * 0.010) * opacity;
        const ng = ctx.createRadialGradient(ncx, ncy, 0, ncx, ncy, nb.r);
        ng.addColorStop(0,   `rgba(${hsl(hue + nb.hOff, 0.7, 0.4)},${alpha})`);
        ng.addColorStop(0.4, `rgba(${hsl(hue + nb.hOff + 40, 0.6, 0.3)},${alpha * 0.55})`);
        ng.addColorStop(0.75,`rgba(${hsl(hue + nb.hOff + 80, 0.5, 0.2)},${alpha * 0.18})`);
        ng.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(ncx, ncy, nb.r, 0, Math.PI*2);
        ctx.fillStyle = ng; ctx.fill();
      });

      // ── LAYER 3: Stars ────────────────────────────────────────────────────
      stars.forEach(s => {
        const a = (s.a * opacity) * (0.55 + Math.sin(t * s.va + s.x) * 0.45);
        // Parallax drift
        const px = (s.x + t * 0.06 * s.depth) % W;
        // Twinkle glow for bright stars
        if (s.r > 0.9) {
          const sg = ctx.createRadialGradient(px, s.y, 0, px, s.y, s.r * 3);
          sg.addColorStop(0, `rgba(255,255,255,${a * 0.6})`);
          sg.addColorStop(1, "rgba(255,255,255,0)");
          ctx.beginPath(); ctx.arc(px, s.y, s.r * 3, 0, Math.PI*2);
          ctx.fillStyle = sg; ctx.fill();
        }
        ctx.beginPath(); ctx.arc(px, s.y, s.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
      });

      // ── LAYER 4: 3D Cyberspace Grid ───────────────────────────────────────
      {
        const gy = H * 0.62; // horizon Y
        const zOff = (t * GRID_SPEED) % (H / GRID_ROWS);
        const perspFn = (z: number) => {
          const fov = H * 0.9;
          return fov / (fov + z);
        };
        const gridA = 0.055 * opacity;
        const gridCol = `${ACCENT}`;

        // Floor grid lines (horizontal — depth bands)
        for (let row = 0; row <= GRID_ROWS + 1; row++) {
          const rawZ = ((row - zOff) / GRID_ROWS) * DEPTH_Z;
          if (rawZ <= 0) continue;
          const sc  = perspFn(rawZ);
          const ly  = gy + (H - gy) * (1 - sc) + (H - gy) * 0.08;
          if (ly > H + 5) continue;
          const lw  = W * sc * 1.4;
          const lx  = W / 2 - lw / 2;
          const la  = gridA * sc * (0.5 + 0.5 * sc);
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + lw, ly);
          ctx.strokeStyle = `rgba(${gridCol},${la})`;
          ctx.lineWidth = sc * 0.8; ctx.stroke();
        }
        // Floor grid lines (vertical — converging at vanishing point)
        for (let col = 0; col <= GRID_COLS; col++) {
          const nx = (col / GRID_COLS - 0.5) * 1.5;  // normalized -0.75 to +0.75
          // Near bottom
          const nearX = W / 2 + nx * W * 0.9;
          const farX  = W / 2 + nx * W * 0.02;
          const nearY = H + 2;
          const farY  = gy;
          const la = gridA * (0.4 + 0.6 * (1 - Math.abs(nx) * 0.8));
          ctx.beginPath(); ctx.moveTo(farX, farY); ctx.lineTo(nearX, nearY);
          ctx.strokeStyle = `rgba(${gridCol},${la})`;
          ctx.lineWidth = 0.45; ctx.stroke();
        }
        // Ceiling grid (mirrored above horizon)
        for (let row = 0; row <= GRID_ROWS + 1; row++) {
          const rawZ = ((row - zOff) / GRID_ROWS) * DEPTH_Z;
          if (rawZ <= 0) continue;
          const sc  = perspFn(rawZ);
          const ly  = gy - (gy) * (1 - sc) - gy * 0.08;
          if (ly < -5) continue;
          const lw  = W * sc * 1.4;
          const lx  = W / 2 - lw / 2;
          const la  = gridA * sc * 0.35;
          ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + lw, ly);
          ctx.strokeStyle = `rgba(${gridCol},${la})`;
          ctx.lineWidth = sc * 0.5; ctx.stroke();
        }
        // Glow line at horizon
        const horGrad = ctx.createLinearGradient(0, gy, W, gy);
        horGrad.addColorStop(0,   "rgba(0,0,0,0)");
        horGrad.addColorStop(0.2, `rgba(${ACCENT},${0.12 * opacity})`);
        horGrad.addColorStop(0.5, `rgba(${ACCENT},${0.25 * opacity})`);
        horGrad.addColorStop(0.8, `rgba(${ACCENT},${0.12 * opacity})`);
        horGrad.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy);
        ctx.strokeStyle = horGrad; ctx.lineWidth = 1.5; ctx.stroke();
      }

      // ── LAYER 5: Neural Network ───────────────────────────────────────────
      // Advance nodes
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy;
        if (n.x < 0) n.x += W; if (n.x > W) n.x -= W;
        if (n.y < 0) n.y += H; if (n.y > H) n.y -= H;
      });

      // Project nodes (simple z-depth → scale)
      const nProj = nodes.map(n => {
        const sc  = 0.35 + (1 - n.z / DEPTH_Z) * 0.65;
        return { x: n.x, y: n.y, sc, z: n.z };
      });

      // Draw edges
      edges.forEach(e => {
        const na = nProj[e.a], nb = nProj[e.b];
        const dx = na.x - nb.x, dy = na.y - nb.y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        const maxD = Math.min(W,H) * 0.20;
        if (d > maxD) return;
        const edgeA = ((1 - d/maxD) * 0.18 + 0.02) * opacity * ((na.sc + nb.sc) * 0.5);
        const eGrad = ctx.createLinearGradient(na.x, na.y, nb.x, nb.y);
        eGrad.addColorStop(0, `rgba(${hsl(hue + nodes[e.a].hOff)},${edgeA})`);
        eGrad.addColorStop(1, `rgba(${hsl(hue + nodes[e.b].hOff)},${edgeA * 0.5})`);
        ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.lineTo(nb.x, nb.y);
        ctx.strokeStyle = eGrad; ctx.lineWidth = 0.4 + na.sc * 0.3; ctx.stroke();
      });

      // Spawn + draw signals
      spawnSignal(t);
      signals.forEach((sig, si) => {
        sig.t += sig.spd;
        if (sig.t >= 1) { signals.splice(si, 1); return; }
        const e  = edges[sig.edge];
        if (!e) return;
        const na = nProj[e.a], nb = nProj[e.b];
        const sx = na.x + (nb.x - na.x) * sig.t;
        const sy = na.y + (nb.y - na.y) * sig.t;
        const sA = Math.sin(sig.t * Math.PI) * 0.85 * opacity;
        const sR = 1.5 + na.sc * 2;
        const sGrad = ctx.createRadialGradient(sx, sy, 0, sx, sy, sR * 2.5);
        sGrad.addColorStop(0, `rgba(${hsl(hue + sig.hOff, 1, 0.85)},${sA})`);
        sGrad.addColorStop(1, `rgba(${hsl(hue + sig.hOff)},0)`);
        ctx.beginPath(); ctx.arc(sx, sy, sR * 2.5, 0, Math.PI*2);
        ctx.fillStyle = sGrad; ctx.fill();
        ctx.beginPath(); ctx.arc(sx, sy, sR * 0.45, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${sA * 0.95})`; ctx.fill();
      });

      // Draw nodes (depth-sorted, back to front)
      const sorted = [...nProj.map((p,i)=>({...p,i}))].sort((a,b)=>b.z-a.z);
      sorted.forEach(({ x, y, sc, i }) => {
        const n   = nodes[i];
        const nr  = n.r * sc * (1 + Math.sin(t * 2.4 + i * 0.8) * 0.15);
        const a   = (0.25 + sc * 0.65) * opacity;
        const col = hsl(hue + n.hOff);

        // Glow halo
        const halo = ctx.createRadialGradient(x, y, 0, x, y, nr * 4);
        halo.addColorStop(0, `rgba(${col},${a * 0.60})`);
        halo.addColorStop(0.4,`rgba(${col},${a * 0.18})`);
        halo.addColorStop(1,  `rgba(${col},0)`);
        ctx.beginPath(); ctx.arc(x, y, nr * 4, 0, Math.PI*2);
        ctx.fillStyle = halo; ctx.fill();

        // Node body — 3-pass glass sphere
        const body = ctx.createRadialGradient(x - nr*0.30, y - nr*0.35, 0, x, y, nr);
        body.addColorStop(0,   `rgba(${hsl(hue + n.hOff, 0.6, 0.88)},${a})`);
        body.addColorStop(0.45,`rgba(${col},${a * 0.85})`);
        body.addColorStop(0.80,`rgba(${hsl(hue + n.hOff, 1, 0.38)},${a * 0.70})`);
        body.addColorStop(1,   `rgba(${hsl(hue + n.hOff, 1, 0.20)},${a * 0.50})`);
        ctx.beginPath(); ctx.arc(x, y, nr, 0, Math.PI*2);
        ctx.fillStyle = body; ctx.fill();

        // Specular
        const spec = ctx.createRadialGradient(x-nr*0.28, y-nr*0.32, 0, x, y, nr*0.7);
        spec.addColorStop(0, `rgba(255,255,255,${a * 0.70})`);
        spec.addColorStop(1, "rgba(255,255,255,0)");
        ctx.beginPath(); ctx.arc(x, y, nr, 0, Math.PI*2);
        ctx.fillStyle = spec; ctx.fill();
      });

      // ── LAYER 6: Data rain ────────────────────────────────────────────────
      ctx.font = "9px monospace";
      dataCols.forEach(col => {
        col.chars.forEach(ch => {
          ch.y += col.spd;
          if (ch.y > H + 12) {
            ch.y = -8;
            ch.c = DATA_CHARS[Math.floor(Math.random() * DATA_CHARS.length)];
            if (Math.random() < 0.25) col.hOff = Math.random() * 360;
          }
          const ca = ch.a * opacity * (0.35 + 0.65 * (ch.y / H));
          ctx.fillStyle = `rgba(${hsl(hue + col.hOff, 1, 0.60)},${ca})`;
          ctx.fillText(ch.c, col.x, ch.y);
        });
      });

      // ── LAYER 7: Holographic scan sweep ──────────────────────────────────
      {
        const scanY = ((t * 40) % (H * 1.4)) - H * 0.2;
        const scanGrad = ctx.createLinearGradient(0, scanY - 12, 0, scanY + 12);
        scanGrad.addColorStop(0,   "rgba(0,0,0,0)");
        scanGrad.addColorStop(0.4, `rgba(${ACCENT},${0.04 * opacity})`);
        scanGrad.addColorStop(0.5, `rgba(${ACCENT},${0.10 * opacity})`);
        scanGrad.addColorStop(0.6, `rgba(${ACCENT},${0.04 * opacity})`);
        scanGrad.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, scanY - 12, W, 24);
      }

      // ── LAYER 8: HUD corner brackets ─────────────────────────────────────
      {
        const bLen = Math.min(W, H) * 0.055;
        const bThk = 1.5;
        const bA   = (0.22 + Math.sin(t * 0.9) * 0.06) * opacity;
        const corners = [
          { x: 0,   y: 0,   sx: 1,  sy: 1  },
          { x: W,   y: 0,   sx: -1, sy: 1  },
          { x: 0,   y: H,   sx: 1,  sy: -1 },
          { x: W,   y: H,   sx: -1, sy: -1 },
        ];
        corners.forEach(({ x, y, sx, sy }) => {
          ctx.beginPath();
          ctx.moveTo(x + sx * bLen, y);
          ctx.lineTo(x, y); ctx.lineTo(x, y + sy * bLen);
          ctx.strokeStyle = `rgba(${ACCENT},${bA})`; ctx.lineWidth = bThk; ctx.stroke();
          // Corner tick glow
          const tg = ctx.createRadialGradient(x, y, 0, x, y, bLen * 0.6);
          tg.addColorStop(0, `rgba(${ACCENT},${bA * 0.40})`);
          tg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath(); ctx.arc(x, y, bLen * 0.6, 0, Math.PI*2);
          ctx.fillStyle = tg; ctx.fill();
        });

        // Center crosshair (subtle)
        const chA = (0.05 + Math.sin(t * 1.8) * 0.03) * opacity;
        const chS = Math.min(W,H) * 0.025;
        ctx.strokeStyle = `rgba(${ACCENT},${chA})`; ctx.lineWidth = 0.5;
        ctx.beginPath(); ctx.moveTo(W/2 - chS, H/2); ctx.lineTo(W/2 + chS, H/2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(W/2, H/2 - chS); ctx.lineTo(W/2, H/2 + chS); ctx.stroke();
        ctx.beginPath(); ctx.arc(W/2, H/2, chS * 0.55, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${ACCENT},${chA * 0.6})`; ctx.stroke();
      }

      // ── LAYER 9: Vignette ─────────────────────────────────────────────────
      {
        const vig = ctx.createRadialGradient(W/2, H/2, Math.min(W,H)*0.25, W/2, H/2, Math.max(W,H)*0.72);
        vig.addColorStop(0, "rgba(0,0,0,0)");
        vig.addColorStop(1, "rgba(0,0,0,0.72)");
        ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);
      }
    }

    draw();
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
