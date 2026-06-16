import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";

// ── QUANTUM PERSONA 3D — Maximum Quality Neural Brain Orb v2 ──────────────────
// 52-node fibonacci sphere + DNA helix spine + 5 orbital rings
// Cascading brainwave neural firing + chromatic aberration + depth sorting
// DPR×2 (max 4) for ultra-sharp rendering

function QuantumBrain3D({ open, hover, activeColor }: { open: boolean; hover: boolean; activeColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const openRef   = useRef(open);
  const hoverRef  = useRef(hover);
  const colorRef  = useRef(activeColor);
  const burstRef  = useRef(0);

  useEffect(() => { openRef.current  = open;       }, [open]);
  useEffect(() => { hoverRef.current = hover;      if (hover) burstRef.current = tRef.current; }, [hover]);
  useEffect(() => { colorRef.current = activeColor; }, [activeColor]);

  useEffect(() => {
    const cvEl = canvasRef.current;
    if (!cvEl) return;
    const cv: HTMLCanvasElement = cvEl;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.imageSmoothingEnabled   = true;
    ctx.imageSmoothingQuality   = "high";

    const SIZE = 46;
    const DPR  = Math.min(window.devicePixelRatio * 2, 4);
    cv.width   = SIZE * DPR;
    cv.height  = SIZE * DPR;
    ctx.scale(DPR, DPR);
    const cx = SIZE / 2, cy = SIZE / 2;
    const FOV     = 220;
    const R_BRAIN = 10.5;

    // ── Math helpers ──────────────────────────────────────────────────────────
    function rotX(x: number, y: number, z: number, a: number): [number,number,number] {
      const c=Math.cos(a), s=Math.sin(a); return [x, y*c-z*s, y*s+z*c];
    }
    function rotY(x: number, y: number, z: number, a: number): [number,number,number] {
      const c=Math.cos(a), s=Math.sin(a); return [x*c+z*s, y, -x*s+z*c];
    }
    function rotZ(x: number, y: number, z: number, a: number): [number,number,number] {
      const c=Math.cos(a), s=Math.sin(a); return [x*c-y*s, x*s+y*c, z];
    }
    function proj(x: number, y: number, z: number) {
      const sc = FOV / (FOV + z + 55);
      return { px: cx + x*sc, py: cy + y*sc, sc };
    }
    function hsl(hd: number, s = 1, l = 0.58): string {
      const hh=((hd%360)+360)%360;
      const k=(n: number)=>(n+hh/30)%12;
      const aa=s*Math.min(l,1-l);
      const f=(n: number)=>l-aa*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));
      return `${Math.round(f(0)*255)},${Math.round(f(8)*255)},${Math.round(f(4)*255)}`;
    }

    // ── Parse accent color into RGB ───────────────────────────────────────────
    function parseColor(hex: string) {
      const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
      return `${r},${g},${b}`;
    }

    // ── 52 Fibonacci sphere neural nodes ─────────────────────────────────────
    type NNode = {
      x0: number; y0: number; z0: number;
      r: number; hOff: number; connections: number[];
      firePhase: number; fireSpd: number;
    };
    const NODE_COUNT = 52;
    const nodes: NNode[] = Array.from({ length: NODE_COUNT }, (_, i) => {
      const phi   = Math.acos(1 - 2*(i+0.5)/NODE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return {
        x0: Math.sin(phi)*Math.cos(theta),
        y0: Math.cos(phi),
        z0: Math.sin(phi)*Math.sin(theta),
        r:  0.50 + (i % 5) * 0.12,
        hOff: (i / NODE_COUNT) * 360,
        connections: [],
        firePhase: Math.random() * Math.PI * 2,
        fireSpd:   0.8 + Math.random() * 1.8,
      };
    });

    // Connect nearby nodes (max 5 connections each, threshold 0.85)
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i+1; j < NODE_COUNT; j++) {
        if (nodes[i].connections.length >= 5) break;
        const dx=nodes[i].x0-nodes[j].x0, dy=nodes[i].y0-nodes[j].y0, dz=nodes[i].z0-nodes[j].z0;
        if (Math.sqrt(dx*dx+dy*dy+dz*dz) < 0.85 && nodes[j].connections.length < 5) {
          nodes[i].connections.push(j);
          nodes[j].connections.push(i);
        }
      }
    }

    // ── DNA double helix (12 base pairs) ─────────────────────────────────────
    const DNA_PAIRS = 12;

    // ── 5 orbital rings ───────────────────────────────────────────────────────
    type OrbRing = { r: number; tX: number; tY: number; tZ: number; speed: number; hOff: number; nodeCount: number };
    const ORB_RINGS: OrbRing[] = [
      { r: 14.0, tX:  0.28, tY:  0.12, tZ: 0.05, speed:  0.025, hOff:   0, nodeCount: 5 },
      { r: 17.5, tX: -0.48, tY:  0.42, tZ: 0.15, speed: -0.018, hOff:  72, nodeCount: 6 },
      { r: 20.5, tX:  0.68, tY: -0.52, tZ: 0.30, speed:  0.012, hOff: 144, nodeCount: 7 },
      { r: 22.5, tX: -0.20, tY:  0.65, tZ: 0.50, speed: -0.022, hOff: 216, nodeCount: 4 },
      { r: 24.5, tX:  0.55, tY: -0.25, tZ: 0.70, speed:  0.008, hOff: 288, nodeCount: 8 },
    ];

    type OrbP = { ring: number; angle: number; trail: { x: number; y: number }[] };
    const orbParticles: OrbP[] = ORB_RINGS.flatMap((ring, ri) =>
      Array.from({ length: ring.nodeCount }, (_, i) => ({
        ring: ri, angle: (i/ring.nodeCount)*Math.PI*2 + ri*1.26, trail: [],
      }))
    );

    function xfOrb(r: number, angle: number, ring: OrbRing, gRX: number, gRY: number, gRZ: number) {
      let [x,y,z] = rotX(r*Math.cos(angle), 0, r*Math.sin(angle), ring.tX);
      [x,y,z] = rotY(x,y,z, ring.tY);
      [x,y,z] = rotZ(x,y,z, ring.tZ);
      [x,y,z] = rotX(x,y,z, gRX);
      [x,y,z] = rotY(x,y,z, gRY);
      [x,y,z] = rotZ(x,y,z, gRZ);
      const { px, py, sc } = proj(x, y, z);
      return { px, py, sc, zd: z };
    }

    // ── Signal pulses ─────────────────────────────────────────────────────────
    type Signal = { ni: number; nj: number; t: number; spd: number; hOff: number };
    const signals: Signal[] = [];
    function spawnSignals() {
      nodes.forEach((n, ni) => {
        if (n.connections.length > 0 && Math.random() < 0.025) {
          const nj = n.connections[Math.floor(Math.random() * n.connections.length)];
          signals.push({ ni, nj, t: 0, spd: 0.008 + Math.random() * 0.022, hOff: n.hOff });
        }
      });
      while (signals.length > 30) signals.shift();
    }

    // ── Background stars ──────────────────────────────────────────────────────
    const STARS = Array.from({ length: 55 }, () => ({
      x: Math.random()*SIZE, y: Math.random()*SIZE,
      r: 0.15 + Math.random()*0.55, a: 0.08+Math.random()*0.6, va: 0.008+Math.random()*0.03,
    }));

    // ── Main draw loop ────────────────────────────────────────────────────────
    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const isH = hoverRef.current;
      const isO = openRef.current;
      tRef.current += isH ? 0.030 : 0.018;
      const t = tRef.current;

      ctx.clearRect(0, 0, SIZE, SIZE);

      const hue  = (t * (isH ? 25 : 12)) % 360;
      const acRGB = parseColor(colorRef.current);
      const gRX = Math.sin(t*0.22)*0.32 + 0.10;
      const gRY = t * (isH ? 0.40 : 0.22);
      const gRZ = Math.sin(t*0.29)*0.18;

      // ── Stars ───────────────────────────────────────────────────────────────
      STARS.forEach(s => {
        const a = s.a*(0.45+Math.sin(t*s.va+s.x)*0.55);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
      });

      // ── Outer corona aura ──────────────────────────────────────────────────
      const coronaR = R_BRAIN + (isH ? 18 : 13.5);
      const corona  = ctx.createRadialGradient(cx, cy, R_BRAIN*0.65, cx, cy, coronaR);
      corona.addColorStop(0,   `rgba(${acRGB},${isO ? 0.26 : isH ? 0.20 : 0.12})`);
      corona.addColorStop(0.3, `rgba(${hsl(hue+60)},${isO ? 0.13 : 0.07})`);
      corona.addColorStop(0.6, `rgba(${hsl(hue+120)},0.03)`);
      corona.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, coronaR, 0, Math.PI*2);
      ctx.fillStyle = corona; ctx.fill();

      // ── 4 pulsing aura rings ───────────────────────────────────────────────
      for (let pr = 0; pr < 4; pr++) {
        const pulse = (Math.sin(t*(1.8+pr*0.45) + pr*1.1) + 1) / 2;
        const rr    = R_BRAIN + 1.5 + pr*2.8 + pulse*3.5;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${hsl(hue+pr*90)},${(0.20-pr*0.04)*(1-pulse*0.35)})`;
        ctx.lineWidth   = 0.7 - pr*0.15; ctx.stroke();
      }

      // ── Hover energy burst ─────────────────────────────────────────────────
      if (isH && (t - burstRef.current) < 2.8) {
        for (let bi = 0; bi < 16; bi++) {
          const bp   = ((t*0.65 + bi*12) % 72) / 72;
          const bRad = R_BRAIN + 1 + bp * 16;
          ctx.beginPath(); ctx.arc(cx, cy, bRad, 0, Math.PI*2);
          ctx.strokeStyle = `rgba(${hsl(hue+bi*22.5)},${(1-bp)*0.35})`;
          ctx.lineWidth   = 1.6*(1-bp); ctx.stroke();
        }
      }

      // ── Chromatic aberration glow (hover) ──────────────────────────────────
      if (isH) {
        const chromR = R_BRAIN * 1.25;
        [[-1.2, 0, hue], [0, -1.2, hue+120], [1.2, 0, hue+240]].forEach(([ox, oy, h]) => {
          const cg = ctx.createRadialGradient(cx+(ox as number), cy+(oy as number), 0, cx+(ox as number), cy+(oy as number), chromR);
          cg.addColorStop(0, `rgba(${hsl(h as number)},0.20)`);
          cg.addColorStop(1, "rgba(0,0,0,0)");
          ctx.beginPath(); ctx.arc(cx+(ox as number), cy+(oy as number), chromR, 0, Math.PI*2);
          ctx.fillStyle = cg; ctx.fill();
        });
      }

      // ── Project 52 brain nodes ─────────────────────────────────────────────
      const projected: { px: number; py: number; sc: number; zd: number; ni: number }[] = [];
      nodes.forEach((n, ni) => {
        let [x,y,z] = rotX(n.x0*R_BRAIN, n.y0*R_BRAIN, n.z0*R_BRAIN, gRX);
        [x,y,z] = rotY(x,y,z, gRY);
        [x,y,z] = rotZ(x,y,z, gRZ);
        const { px, py, sc } = proj(x,y,z);
        projected.push({ px, py, sc, zd: z, ni });
      });
      const sortedNodes = [...projected].sort((a,b) => a.zd - b.zd);

      // ── DNA double helix spine ─────────────────────────────────────────────
      {
        const dnaStep = (Math.PI*2) / DNA_PAIRS;
        for (let pass = 0; pass < 2; pass++) {
          const phaseOff = pass * Math.PI;
          const pts: { x: number; y: number; z: number }[] = [];
          for (let dp = 0; dp <= DNA_PAIRS * 3; dp++) {
            const dAngle = (dp / (DNA_PAIRS*3)) * Math.PI * 4 + t*0.25 + phaseOff;
            const dY = ((dp / (DNA_PAIRS*3)) - 0.5) * R_BRAIN * 2.2;
            let [x,y,z] = rotX(Math.cos(dAngle)*R_BRAIN*0.42, dY, Math.sin(dAngle)*R_BRAIN*0.42, gRX);
            [x,y,z] = rotY(x,y,z, gRY); [x,y,z] = rotZ(x,y,z, gRZ);
            const { px, py, sc } = proj(x,y,z);
            pts.push({ x: px, y: py, z });
            if (dp > 0) {
              const prev = pts[dp-1];
              const dnaA = (0.08 + sc*0.10) * (pass === 0 ? 1 : 0.7);
              ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(px, py);
              ctx.strokeStyle = `rgba(${hsl(hue + pass*180 + (dp/DNA_PAIRS/3)*120)},${dnaA})`;
              ctx.lineWidth = 0.35; ctx.stroke();
            }
          }
          // Base-pair rungs
          for (let bp = 0; bp < DNA_PAIRS; bp++) {
            const bpAngle0 = (bp / DNA_PAIRS) * Math.PI * 4 + t*0.25;
            const bpY = ((bp / DNA_PAIRS) - 0.5) * R_BRAIN * 2.2;
            let [x0,y0,z0] = rotX(Math.cos(bpAngle0)*R_BRAIN*0.42, bpY, Math.sin(bpAngle0)*R_BRAIN*0.42, gRX);
            [x0,y0,z0] = rotY(x0,y0,z0,gRY); [x0,y0,z0] = rotZ(x0,y0,z0,gRZ);
            const p0 = proj(x0,y0,z0);
            let [x1,y1,z1] = rotX(Math.cos(bpAngle0+Math.PI)*R_BRAIN*0.42, bpY, Math.sin(bpAngle0+Math.PI)*R_BRAIN*0.42, gRX);
            [x1,y1,z1] = rotY(x1,y1,z1,gRY); [x1,y1,z1] = rotZ(x1,y1,z1,gRZ);
            const p1 = proj(x1,y1,z1);
            const rungA = (0.06 + p0.sc*0.08) * dnaStep;
            void rungA;
            ctx.beginPath(); ctx.moveTo(p0.px, p0.py); ctx.lineTo(p1.px, p1.py);
            ctx.strokeStyle = `rgba(${hsl(hue+bp*30)},0.08)`;
            ctx.lineWidth = 0.28; ctx.stroke();
          }
        }
      }

      // ── Neural connections ─────────────────────────────────────────────────
      sortedNodes.forEach(({ px, py, sc, zd, ni }) => {
        const n = nodes[ni];
        n.connections.forEach(j => {
          const pj = projected[j];
          const alpha = (0.10 + sc*0.12) * (0.4 + zd*0.035) * (isH ? 1.5 : 1.0);
          if (alpha <= 0.01) return;
          const linGrad = ctx.createLinearGradient(px, py, pj.px, pj.py);
          linGrad.addColorStop(0, `rgba(${hsl(hue+n.hOff)},${Math.min(alpha, 0.42)})`);
          linGrad.addColorStop(1, `rgba(${hsl(hue+nodes[j].hOff)},${Math.min(alpha*0.55, 0.24)})`);
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(pj.px, pj.py);
          ctx.strokeStyle = linGrad;
          ctx.lineWidth = 0.28 + sc*0.20; ctx.stroke();
        });
      });

      // ── Signal pulses ──────────────────────────────────────────────────────
      spawnSignals();
      signals.forEach(sig => {
        sig.t += sig.spd;
        if (sig.t > 1) { sig.t = 0; return; }
        const pI = projected[sig.ni], pJ = projected[sig.nj];
        const sx  = pI.px + (pJ.px - pI.px) * sig.t;
        const sy  = pI.py + (pJ.py - pI.py) * sig.t;
        const sA  = 0.92 * Math.sin(sig.t * Math.PI);
        // Inner core
        ctx.beginPath(); ctx.arc(sx, sy, 1.1 + sig.t*0.6, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${hsl(hue+sig.hOff, 1, 0.90)},${sA})`; ctx.fill();
        // Outer glow
        const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 3.5);
        grd.addColorStop(0, `rgba(${hsl(hue+sig.hOff)},${sA*0.45})`);
        grd.addColorStop(1, `rgba(${hsl(hue+sig.hOff)},0)`);
        ctx.beginPath(); ctx.arc(sx, sy, 3.5, 0, Math.PI*2);
        ctx.fillStyle = grd; ctx.fill();
      });

      // ── Neural nodes (depth-sorted, back to front) ─────────────────────────
      sortedNodes.forEach(({ px, py, sc, zd, ni }) => {
        const n     = nodes[ni];
        // Brainwave firing pulse
        const fire  = Math.pow(Math.max(0, Math.sin(t*n.fireSpd + n.firePhase)), 3);
        const nr    = (n.r * sc + fire * 0.5) * (isH ? 1.15 : 1.0);
        const alpha = 0.45 + (zd/R_BRAIN)*0.42 + fire*0.15;
        const col   = hsl(hue + n.hOff);

        // Firing flash halo
        if (fire > 0.5 || isH) {
          const ng = ctx.createRadialGradient(px, py, 0, px, py, nr*(3.5+fire*1.5));
          ng.addColorStop(0, `rgba(${col},${(alpha*0.6+fire*0.4)*(isH?1.2:1)})`);
          ng.addColorStop(0.4, `rgba(${col},${alpha*0.15})`);
          ng.addColorStop(1,   `rgba(${col},0)`);
          ctx.beginPath(); ctx.arc(px, py, nr*(3.5+fire*1.5), 0, Math.PI*2);
          ctx.fillStyle = ng; ctx.fill();
        }

        // Node body — 3-pass glass sphere
        const body = ctx.createRadialGradient(px-nr*0.28, py-nr*0.34, 0, px, py, nr);
        body.addColorStop(0,   `rgba(${hsl(hue+n.hOff, 0.7, 0.88)},${alpha})`);
        body.addColorStop(0.45,`rgba(${col},${alpha*0.85})`);
        body.addColorStop(0.80,`rgba(${hsl(hue+n.hOff,1,0.40)},${alpha*0.70})`);
        body.addColorStop(1,   `rgba(${hsl(hue+n.hOff,1,0.22)},${alpha*0.48})`);
        ctx.beginPath(); ctx.arc(px, py, nr, 0, Math.PI*2);
        ctx.fillStyle = body; ctx.fill();

        // Specular highlight
        const spec = ctx.createRadialGradient(px-nr*0.30, py-nr*0.36, 0, px, py, nr*0.75);
        spec.addColorStop(0, `rgba(255,255,255,${alpha*0.75})`);
        spec.addColorStop(1, "rgba(255,255,255,0)");
        ctx.beginPath(); ctx.arc(px, py, nr, 0, Math.PI*2);
        ctx.fillStyle = spec; ctx.fill();

        // Firing spark micro-dot
        if (fire > 0.7) {
          ctx.beginPath(); ctx.arc(px, py, 0.55, 0, Math.PI*2);
          ctx.fillStyle = "rgba(255,255,255,0.98)"; ctx.fill();
        }
      });

      // ── 5 Orbital rings ────────────────────────────────────────────────────
      ORB_RINGS.forEach((ring, ri) => {
        // Ring orbit path (true 3D, 96 segments)
        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= 96; i++) {
          const a = (i/96)*Math.PI*2;
          const { px, py } = xfOrb(ring.r, a, ring, gRX, gRY, gRZ);
          if (first) { ctx.moveTo(px, py); first = false; }
          else          ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.setLineDash([1.2, 3.2]);
        ctx.strokeStyle = `rgba(${hsl(hue+ring.hOff)},${0.10 + ri*0.018})`;
        ctx.lineWidth = 0.35; ctx.stroke();
        ctx.setLineDash([]);

        // Orbital electrons
        orbParticles.filter(p => p.ring === ri).forEach(p => {
          p.angle += ring.speed * (isH ? 1.4 : 1.0);
          const { px, py, sc } = xfOrb(ring.r, p.angle, ring, gRX, gRY, gRZ);
          // Trail
          p.trail.push({ x: px, y: py });
          if (p.trail.length > 10) p.trail.shift();
          p.trail.forEach((pt, ti) => {
            if (ti === 0) return;
            const ta = (ti/p.trail.length)*0.45;
            const tr = sc * 0.8 * (ti/p.trail.length);
            ctx.beginPath(); ctx.arc(pt.x, pt.y, tr, 0, Math.PI*2);
            ctx.fillStyle = `rgba(${hsl(hue+ring.hOff)},${ta})`; ctx.fill();
          });
          // Electron core
          const eR = 1.3 * sc;
          const eGrad = ctx.createRadialGradient(px, py, 0, px, py, eR*3.5);
          eGrad.addColorStop(0, `rgba(${hsl(hue+ring.hOff, 1, 0.92)},0.92)`);
          eGrad.addColorStop(1, `rgba(${hsl(hue+ring.hOff)},0)`);
          ctx.beginPath(); ctx.arc(px, py, eR*3.5, 0, Math.PI*2);
          ctx.fillStyle = eGrad; ctx.fill();
          ctx.beginPath(); ctx.arc(px, py, eR*0.45, 0, Math.PI*2);
          ctx.fillStyle = "rgba(255,255,255,0.97)"; ctx.fill();
        });
      });

      // ── Brain core sphere — 6 render passes ───────────────────────────────
      // P1: Shadow base
      ctx.beginPath(); ctx.arc(cx, cy, R_BRAIN, 0, Math.PI*2);
      ctx.fillStyle = "rgba(2,2,10,0.92)"; ctx.fill();

      // P2: Main diffuse (cycling hue)
      const diff = ctx.createRadialGradient(cx-R_BRAIN*0.32, cy-R_BRAIN*0.36, 0, cx, cy, R_BRAIN*1.22);
      diff.addColorStop(0,    `rgba(${hsl(hue, 0.7, 0.88)},0.95)`);
      diff.addColorStop(0.25, `rgba(${hsl(hue+45, 1, 0.65)},0.82)`);
      diff.addColorStop(0.58, `rgba(${hsl(hue+90, 1, 0.42)},0.72)`);
      diff.addColorStop(0.85, `rgba(${hsl(hue+150, 1, 0.22)},0.60)`);
      diff.addColorStop(1,    `rgba(${hsl(hue+210, 1, 0.10)},0.40)`);
      ctx.beginPath(); ctx.arc(cx, cy, R_BRAIN, 0, Math.PI*2);
      ctx.fillStyle = diff; ctx.fill();

      // P3: Accent color subsurface scatter
      const acTint = ctx.createRadialGradient(cx, cy+R_BRAIN*0.42, 0, cx, cy, R_BRAIN);
      acTint.addColorStop(0,   `rgba(${acRGB},0.22)`);
      acTint.addColorStop(0.5, `rgba(${acRGB},0.06)`);
      acTint.addColorStop(1,   `rgba(${acRGB},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, R_BRAIN, 0, Math.PI*2);
      ctx.fillStyle = acTint; ctx.fill();

      // P4: Surface scan line
      ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R_BRAIN, 0, Math.PI*2); ctx.clip();
      const scanY = cy - R_BRAIN + ((t*22) % (R_BRAIN*2));
      ctx.beginPath(); ctx.moveTo(cx-R_BRAIN, scanY); ctx.lineTo(cx+R_BRAIN, scanY);
      ctx.strokeStyle = `rgba(${hsl(hue)},0.14)`; ctx.lineWidth = 0.4; ctx.stroke();
      ctx.restore();

      // P5: Specular highlight
      const spec = ctx.createRadialGradient(cx-R_BRAIN*0.38, cy-R_BRAIN*0.44, 0, cx-R_BRAIN*0.10, cy-R_BRAIN*0.10, R_BRAIN*0.88);
      spec.addColorStop(0,    "rgba(255,255,255,0.92)");
      spec.addColorStop(0.18, "rgba(255,255,255,0.32)");
      spec.addColorStop(0.52, "rgba(255,255,255,0.06)");
      spec.addColorStop(1,    "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R_BRAIN, 0, Math.PI*2);
      ctx.fillStyle = spec; ctx.fill();

      // P6: Rim light
      const rim = ctx.createRadialGradient(cx+R_BRAIN*0.60, cy+R_BRAIN*0.42, 0, cx+R_BRAIN*0.36, cy+R_BRAIN*0.24, R_BRAIN*0.85);
      rim.addColorStop(0, `rgba(${acRGB},0.55)`);
      rim.addColorStop(1, `rgba(${acRGB},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, R_BRAIN, 0, Math.PI*2);
      ctx.fillStyle = rim; ctx.fill();

      // Brain border + glow
      const pulse = Math.sin(t*2.2)*0.5+0.5;
      ctx.beginPath(); ctx.arc(cx, cy, R_BRAIN, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${hsl(hue)},${isH ? 0.75 : 0.45})`;
      ctx.lineWidth = isH ? 1.3 : 0.85;
      ctx.shadowColor = `rgba(${hsl(hue)},${0.7+pulse*0.3})`; ctx.shadowBlur = isH ? 9 : 4;
      ctx.stroke(); ctx.shadowBlur = 0;

      // Center label
      ctx.fillStyle = isH ? `rgba(${acRGB},0.92)` : "rgba(255,255,255,0.80)";
      ctx.font = `bold ${isH ? 5.2 : 4.8}px monospace`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.shadowColor = `rgba(${hsl(hue)},0.8)`; ctx.shadowBlur = isH ? 5 : 2;
      ctx.fillText(isH ? "PERSONA" : "P·AI", cx, cy);
      ctx.shadowBlur = 0;
    }

    draw();
    return () => { cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 46, height: 46, display: "block", cursor: "pointer" }}
    />
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
interface QuantumPersona3DProps {
  onOpenPersonaManager?: () => void;
}

export function QuantumPersona3D({ onOpenPersonaManager }: QuantumPersona3DProps) {
  const { state } = useStore();
  const [hover, setHover] = useState(false);
  const [open,  setOpen]  = useState(false);

  const activePersona = state.activePersona ?? "default";
  const PERSONA_COLORS: Record<string, string> = {
    general:    "#22c55e",
    uncensored: "#f59e0b",
    security:   "#e21227",
    specialist: "#6366f1",
    mastero:    "#a78bfa",
  };
  const activeColor = PERSONA_COLORS[activePersona] ?? "#a78bfa";

  function handleClick() {
    setOpen(o => !o);
    if (onOpenPersonaManager) onOpenPersonaManager();
  }

  return (
    <motion.div
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="relative flex-shrink-0 rounded-full cursor-pointer select-none"
      style={{
        width: 46, height: 46,
        boxShadow: hover || open
          ? `0 0 22px ${activeColor}66, 0 0 44px ${activeColor}28, 0 0 8px ${activeColor}44`
          : `0 0 10px ${activeColor}28`,
        border: `1px solid ${hover || open ? activeColor+"77" : activeColor+"2a"}`,
        borderRadius: "50%",
        background: "rgba(3,3,10,0.88)",
        transition: "box-shadow 0.22s, border-color 0.22s",
      }}
      whileHover={{ scale: 1.09, y: -1.5 }}
      whileTap={{ scale: 0.90 }}
      transition={{ type: "spring", stiffness: 520, damping: 26 }}
      title={`مدير الشخصيات — ${activePersona}`}
      aria-label="مدير الشخصيات"
    >
      <QuantumBrain3D open={open} hover={hover} activeColor={activeColor} />

      {/* Pulsing active indicator */}
      <motion.div
        className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full"
        style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}` }}
        animate={{ opacity: [1, 0.35, 1], scale: [1, 1.35, 1] }}
        transition={{ duration: 1.9, repeat: Infinity }}
      />

      {/* Hover tooltip */}
      <motion.div
        initial={{ opacity: 0, y: 5, scale: 0.88 }}
        animate={{ opacity: hover ? 1 : 0, y: hover ? 0 : 5, scale: hover ? 1 : 0.88 }}
        transition={{ duration: 0.16 }}
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap"
        style={{ fontSize: 8, fontWeight: 900, color: activeColor, letterSpacing: "0.12em", textShadow: `0 0 10px ${activeColor}` }}
      >
        PERSONA
      </motion.div>
    </motion.div>
  );
}
