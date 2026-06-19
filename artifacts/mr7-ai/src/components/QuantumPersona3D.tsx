import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { PERSONA_PRESETS } from "./modals/PersonaEditorModal";

// ── QUANTUM PERSONA 3D — Maximum Quality Neural Brain Orb v3 ──────────────────
// 88-node fibonacci sphere + DNA helix spine + 8 orbital rings
// Neural cortex regions + quantum entanglement beams + synaptic storms
// Consciousness wave propagation + chromatic aberration + depth sorting
// DPR×2 (max 4) for ultra-sharp rendering

function QuantumBrain3D({ open, hover, activeColor }: { open: boolean; hover: boolean; activeColor: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);
  const openRef   = useRef(open);
  const hoverRef  = useRef(hover);
  const colorRef  = useRef(activeColor);
  const burstRef  = useRef(0);
  const stormRef  = useRef(0);
  const waveRef   = useRef<{ r: number; a: number; phase: number }[]>([]);

  useEffect(() => { openRef.current  = open;        }, [open]);
  useEffect(() => { colorRef.current = activeColor; }, [activeColor]);
  useEffect(() => {
    hoverRef.current = hover;
    if (hover) {
      burstRef.current = tRef.current;
      stormRef.current = tRef.current;
      waveRef.current.push({ r: 0, a: 1, phase: tRef.current });
    }
  }, [hover]);

  useEffect(() => {
    const cvEl = canvasRef.current;
    if (!cvEl) return;
    const cv: HTMLCanvasElement = cvEl;
    const ctx = cv.getContext("2d", { alpha: true })!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

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
    function parseColor(hex: string) {
      const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
      return `${r},${g},${b}`;
    }

    // ── Neural cortex regions ─────────────────────────────────────────────────
    // 4 lobes: frontal (red), parietal (violet), temporal (cyan), occipital (green)
    function getCortexColor(phi: number, theta: number): string {
      const nt = ((theta % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
      if (phi < Math.PI * 0.40) return "226,18,39";        // frontal — crimson
      if (phi > Math.PI * 0.70) return "34,197,94";        // occipital — green
      if (nt < Math.PI) return "167,139,250";              // parietal — violet
      return "0,229,255";                                   // temporal — cyan
    }

    // ── 88 Fibonacci sphere neural nodes ──────────────────────────────────────
    type NNode = {
      x0: number; y0: number; z0: number;
      phi: number; theta: number;
      r: number; hOff: number; connections: number[];
      firePhase: number; fireSpd: number; cortex: string;
    };
    const NODE_COUNT = 88;
    const nodes: NNode[] = Array.from({ length: NODE_COUNT }, (_, i) => {
      const phi   = Math.acos(1 - 2*(i+0.5)/NODE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      return {
        x0: Math.sin(phi)*Math.cos(theta),
        y0: Math.cos(phi),
        z0: Math.sin(phi)*Math.sin(theta),
        phi, theta,
        r:  0.48 + (i % 5) * 0.10,
        hOff: (i / NODE_COUNT) * 360,
        connections: [],
        firePhase: Math.random() * Math.PI * 2,
        fireSpd:   0.8 + Math.random() * 1.8,
        cortex: getCortexColor(phi, theta),
      };
    });

    // Connect nearby nodes (threshold 0.78, max 5 connections each)
    for (let i = 0; i < NODE_COUNT; i++) {
      for (let j = i+1; j < NODE_COUNT; j++) {
        if (nodes[i].connections.length >= 5) break;
        const dx=nodes[i].x0-nodes[j].x0, dy=nodes[i].y0-nodes[j].y0, dz=nodes[i].z0-nodes[j].z0;
        if (Math.sqrt(dx*dx+dy*dy+dz*dz) < 0.78 && nodes[j].connections.length < 5) {
          nodes[i].connections.push(j);
          nodes[j].connections.push(i);
        }
      }
    }

    // ── Quantum entanglement pairs (antipodal nodes) ──────────────────────────
    const ENTANGLE_PAIRS: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const ni = Math.floor(Math.random() * NODE_COUNT);
      let bestJ = 0, bestDot = 2;
      for (let j = 0; j < NODE_COUNT; j++) {
        if (j === ni) continue;
        const dot = nodes[ni].x0*nodes[j].x0 + nodes[ni].y0*nodes[j].y0 + nodes[ni].z0*nodes[j].z0;
        if (dot < bestDot) { bestDot = dot; bestJ = j; }
      }
      ENTANGLE_PAIRS.push([ni, bestJ]);
    }

    // ── DNA double helix (14 base pairs) ─────────────────────────────────────
    const DNA_PAIRS = 14;

    // ── 8 orbital rings ───────────────────────────────────────────────────────
    type OrbRing = { r: number; tX: number; tY: number; tZ: number; speed: number; hOff: number; nodeCount: number; glowMult: number };
    const ORB_RINGS: OrbRing[] = [
      { r: 13.5, tX:  0.28, tY:  0.12, tZ: 0.05, speed:  0.028, hOff:   0, nodeCount: 5, glowMult: 1.4 },
      { r: 16.5, tX: -0.48, tY:  0.42, tZ: 0.15, speed: -0.021, hOff:  45, nodeCount: 6, glowMult: 1.2 },
      { r: 19.5, tX:  0.68, tY: -0.52, tZ: 0.30, speed:  0.015, hOff:  90, nodeCount: 7, glowMult: 1.0 },
      { r: 21.5, tX: -0.20, tY:  0.65, tZ: 0.50, speed: -0.019, hOff: 135, nodeCount: 4, glowMult: 1.1 },
      { r: 23.5, tX:  0.55, tY: -0.25, tZ: 0.70, speed:  0.011, hOff: 180, nodeCount: 8, glowMult: 0.9 },
      { r: 25.0, tX: -0.38, tY:  0.58, tZ: 0.20, speed: -0.009, hOff: 225, nodeCount: 5, glowMult: 0.8 },
      { r: 26.5, tX:  0.72, tY: -0.40, tZ: 0.45, speed:  0.007, hOff: 270, nodeCount: 3, glowMult: 0.7 },
      { r: 28.0, tX: -0.30, tY:  0.20, tZ: 0.80, speed: -0.005, hOff: 315, nodeCount: 4, glowMult: 0.6 },
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
    function spawnSignals(isStorm: boolean) {
      const spawnRate = isStorm ? 0.12 : 0.022;
      nodes.forEach((n, ni) => {
        if (n.connections.length > 0 && Math.random() < spawnRate) {
          const nj = n.connections[Math.floor(Math.random() * n.connections.length)];
          signals.push({ ni, nj, t: 0, spd: 0.010 + Math.random() * 0.025, hOff: n.hOff });
        }
      });
      while (signals.length > 55) signals.shift();
    }

    // ── Background stars ──────────────────────────────────────────────────────
    const STARS = Array.from({ length: 70 }, () => ({
      x: Math.random()*SIZE, y: Math.random()*SIZE,
      r: 0.15 + Math.random()*0.55, a: 0.08+Math.random()*0.6, va: 0.008+Math.random()*0.03,
    }));

    // ── Consciousness wave rings ───────────────────────────────────────────────
    const waves = waveRef.current;

    // ── Main draw loop ────────────────────────────────────────────────────────
    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const isH = hoverRef.current;
      const isO = openRef.current;
      tRef.current += isH ? 0.032 : 0.018;
      const t = tRef.current;

      ctx.clearRect(0, 0, SIZE, SIZE);

      const hue     = (t * (isH ? 26 : 12)) % 360;
      const acRGB   = parseColor(colorRef.current);
      const isStorm = isH && (t - stormRef.current) < 1.8;
      const gRX     = Math.sin(t*0.22)*0.32 + 0.10;
      const gRY     = t * (isH ? 0.42 : 0.22);
      const gRZ     = Math.sin(t*0.29)*0.18;

      // ── Stars ───────────────────────────────────────────────────────────────
      STARS.forEach(s => {
        const a = s.a*(0.45+Math.sin(t*s.va+s.x)*0.55);
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
      });

      // ── Outer corona aura ───────────────────────────────────────────────────
      const coronaR = R_BRAIN + (isH ? 19 : 14);
      const corona  = ctx.createRadialGradient(cx, cy, R_BRAIN*0.65, cx, cy, coronaR);
      corona.addColorStop(0,   `rgba(${acRGB},${isO ? 0.28 : isH ? 0.22 : 0.13})`);
      corona.addColorStop(0.3, `rgba(${hsl(hue+60)},${isO ? 0.14 : 0.07})`);
      corona.addColorStop(0.6, `rgba(${hsl(hue+120)},0.03)`);
      corona.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, coronaR, 0, Math.PI*2);
      ctx.fillStyle = corona; ctx.fill();

      // ── Storm chromatic aberration ──────────────────────────────────────────
      if (isStorm) {
        const stormAge = t - stormRef.current;
        const intensity = Math.max(0, 1 - stormAge / 1.8);
        for (let ca = 0; ca < 3; ca++) {
          const off = (ca - 1) * intensity * 1.2;
          const caColor = ca === 0 ? "255,0,80" : ca === 1 ? "0,255,136" : "0,136,255";
          ctx.beginPath(); ctx.arc(cx + off, cy, coronaR * 0.88, 0, Math.PI*2);
          ctx.strokeStyle = `rgba(${caColor},${0.08 * intensity})`; ctx.lineWidth = 1.5; ctx.stroke();
        }
      }

      // ── 5 pulsing aura rings ────────────────────────────────────────────────
      for (let pr = 0; pr < 5; pr++) {
        const pulse = (Math.sin(t*(1.8+pr*0.4) + pr*1.1) + 1) / 2;
        const rr    = R_BRAIN + 1.5 + pr*2.6 + pulse*3.2;
        ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${hsl(hue+pr*72)},${(0.22-pr*0.04)*(1-pulse*0.35)*(isStorm?1.6:1)})`;
        ctx.lineWidth   = 0.7 - pr*0.12; ctx.stroke();
      }

      // ── Consciousness wave rings ────────────────────────────────────────────
      for (let wi = waves.length - 1; wi >= 0; wi--) {
        const w = waves[wi];
        w.r += 0.55;
        const age = t - w.phase;
        w.a = Math.max(0, 1 - age * 0.6);
        if (w.a <= 0) { waves.splice(wi, 1); continue; }
        ctx.beginPath(); ctx.arc(cx, cy, R_BRAIN + w.r, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(${acRGB},${w.a * 0.4})`; ctx.lineWidth = 1.2; ctx.stroke();
      }

      // ── Hover energy burst ──────────────────────────────────────────────────
      if (isH && (t - burstRef.current) < 3.0) {
        for (let bi = 0; bi < 18; bi++) {
          const bp   = ((t*0.65 + bi*11.5) % 72) / 72;
          const bRad = R_BRAIN + 1 + bp * 18;
          ctx.beginPath(); ctx.arc(cx, cy, bRad, 0, Math.PI*2);
          ctx.strokeStyle = `rgba(${hsl(hue+bi*20)},${(1-bp)*0.32})`;
          ctx.lineWidth   = 0.5; ctx.stroke();
        }
      }

      // ── DNA double helix (along Y axis) ────────────────────────────────────
      const dnaH = R_BRAIN * 1.9;
      for (let p = 0; p < DNA_PAIRS; p++) {
        const yFrac  = (p / (DNA_PAIRS - 1)) - 0.5;
        const yRaw   = yFrac * dnaH * 2;
        const phase  = (p / DNA_PAIRS) * Math.PI * 2;
        const twist  = t * 0.55 + phase;
        const dnaR   = 3.5 + Math.sin(phase) * 0.8;

        for (let strand = 0; strand < 2; strand++) {
          const a = twist + strand * Math.PI;
          let [x, y, z] = [dnaR * Math.cos(a), yRaw, dnaR * Math.sin(a)];
          [x,y,z] = rotX(x,y,z, gRX);
          [x,y,z] = rotY(x,y,z, gRY);
          [x,y,z] = rotZ(x,y,z, gRZ);
          const { px, py, sc } = proj(x*R_BRAIN/14, y*R_BRAIN/14, z*R_BRAIN/14);
          const alpha = 0.5 + (z+50)/160;
          const baseHue = strand === 0 ? hue : hue + 180;
          ctx.beginPath(); ctx.arc(px, py, sc * 1.1, 0, Math.PI*2);
          ctx.fillStyle = `rgba(${hsl(baseHue)},${alpha * (isH ? 0.85 : 0.55)})`; ctx.fill();

          // Base pair connector
          if (p < DNA_PAIRS - 1) {
            const a2 = twist + Math.PI * 2 / DNA_PAIRS + strand * Math.PI;
            let [x2,y2,z2] = [dnaR * Math.cos(a2), yRaw + dnaH*2/(DNA_PAIRS-1), dnaR * Math.sin(a2)];
            [x2,y2,z2] = rotX(x2,y2,z2, gRX);
            [x2,y2,z2] = rotY(x2,y2,z2, gRY);
            [x2,y2,z2] = rotZ(x2,y2,z2, gRZ);
            const p2 = proj(x2*R_BRAIN/14, y2*R_BRAIN/14, z2*R_BRAIN/14);
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(p2.px, p2.py);
            ctx.strokeStyle = `rgba(${hsl(baseHue+30)},${alpha * 0.20})`; ctx.lineWidth = 0.5; ctx.stroke();
          }
        }

        // Cross base-pair link
        const a1 = twist, a2 = twist + Math.PI;
        let [bx1,by1,bz1] = [dnaR*Math.cos(a1), yRaw, dnaR*Math.sin(a1)];
        let [bx2,by2,bz2] = [dnaR*Math.cos(a2), yRaw, dnaR*Math.sin(a2)];
        [bx1,by1,bz1] = rotX(bx1,by1,bz1,gRX); [bx1,by1,bz1] = rotY(bx1,by1,bz1,gRY); [bx1,by1,bz1] = rotZ(bx1,by1,bz1,gRZ);
        [bx2,by2,bz2] = rotX(bx2,by2,bz2,gRX); [bx2,by2,bz2] = rotY(bx2,by2,bz2,gRY); [bx2,by2,bz2] = rotZ(bx2,by2,bz2,gRZ);
        const bp1 = proj(bx1*R_BRAIN/14, by1*R_BRAIN/14, bz1*R_BRAIN/14);
        const bp2 = proj(bx2*R_BRAIN/14, by2*R_BRAIN/14, bz2*R_BRAIN/14);
        ctx.beginPath(); ctx.moveTo(bp1.px, bp1.py); ctx.lineTo(bp2.px, bp2.py);
        const pairHue = (p / DNA_PAIRS) * 360;
        ctx.strokeStyle = `rgba(${hsl(pairHue)},0.18)`; ctx.lineWidth = 0.5; ctx.stroke();
      }

      // ── 8 orbital rings + particles ────────────────────────────────────────
      const sortedOrb: Array<{ px: number; py: number; sc: number; zd: number; ri: number; ai: number; col: string }> = [];
      orbParticles.forEach((op, _pi) => {
        const ring = ORB_RINGS[op.ring];
        op.angle += ring.speed * (isH ? 1.5 : 1.0);
        const { px, py, sc, zd } = xfOrb(ring.r, op.angle, ring, gRX, gRY, gRZ);

        op.trail.unshift({ x: px, y: py });
        if (op.trail.length > 9) op.trail.pop();

        sortedOrb.push({ px, py, sc, zd, ri: op.ring, ai: _pi, col: hsl(hue + ring.hOff) });
      });

      // Draw orbital ring paths
      ORB_RINGS.forEach((ring, ri) => {
        const pts: Array<[number, number]> = [];
        const STEPS = 48;
        for (let s = 0; s < STEPS; s++) {
          const a = (s / STEPS) * Math.PI * 2;
          const { px, py, zd } = xfOrb(ring.r, a, ring, gRX, gRY, gRZ);
          pts.push([px, py]);
        }
        ctx.beginPath();
        pts.forEach(([px, py], i) => i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py));
        ctx.closePath();
        const alpha = 0.06 + ri * 0.012;
        ctx.strokeStyle = `rgba(${hsl(hue + ring.hOff)},${alpha * ring.glowMult})`; ctx.lineWidth = 0.6; ctx.stroke();
      });

      // Draw particles (depth-sorted)
      sortedOrb.sort((a, b) => a.zd - b.zd).forEach(({ px, py, sc, ri, col }) => {
        const op = orbParticles[ri];
        // Trail
        op.trail.forEach((tp, i) => {
          if (i === 0) return;
          ctx.beginPath(); ctx.arc(tp.x, tp.y, sc * 1.0 * (1 - i/op.trail.length), 0, Math.PI*2);
          ctx.fillStyle = `rgba(${col},${(0.25 - i*0.028)*ORB_RINGS[ri].glowMult})`; ctx.fill();
        });
        const pr = sc * 2.4 * ORB_RINGS[ri].glowMult;
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI*2);
        ctx.fillStyle = `rgba(${col},0.92)`; ctx.fill();
        // Glow
        const og = ctx.createRadialGradient(px, py, 0, px, py, pr * 3);
        og.addColorStop(0, `rgba(${col},0.35)`); og.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(px, py, pr * 3, 0, Math.PI*2);
        ctx.fillStyle = og; ctx.fill();
      });

      // ── Brain sphere — depth-sorted node rendering ──────────────────────────
      spawnSignals(isStorm);

      type DrawNode = { x: number; y: number; z: number; sc: number; ni: number };
      const drawNodes: DrawNode[] = nodes.map((n, ni) => {
        let [x,y,z] = [n.x0*R_BRAIN, n.y0*R_BRAIN, n.z0*R_BRAIN];
        [x,y,z] = rotX(x,y,z, gRX);
        [x,y,z] = rotY(x,y,z, gRY);
        [x,y,z] = rotZ(x,y,z, gRZ);
        const { px, py, sc } = proj(x, y, z);
        return { x: px, y: py, z, sc, ni };
      });

      // Draw edges (connections)
      drawNodes.forEach(dn => {
        const n = nodes[dn.ni];
        n.connections.forEach(ji => {
          const dj = drawNodes[ji];
          const depthAlpha = (dn.z + dj.z > 0) ? 0.04 : 0.025;
          const pulse = Math.sin(t * n.fireSpd + n.firePhase) * 0.5 + 0.5;
          ctx.beginPath(); ctx.moveTo(dn.x, dn.y); ctx.lineTo(dj.x, dj.y);
          ctx.strokeStyle = `rgba(${n.cortex},${depthAlpha + pulse * 0.05})`; ctx.lineWidth = 0.45; ctx.stroke();
        });
      });

      // ── Quantum entanglement beams ──────────────────────────────────────────
      ENTANGLE_PAIRS.forEach(([ni, nj], ei) => {
        const a = drawNodes[ni], b = drawNodes[nj];
        const entPhase = Math.sin(t * 1.2 + ei * 0.8) * 0.5 + 0.5;
        if (entPhase > 0.2) {
          const grad = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
          grad.addColorStop(0,   `rgba(${hsl(hue+ei*45)},0.0)`);
          grad.addColorStop(0.3, `rgba(${hsl(hue+ei*45)},${entPhase * 0.22})`);
          grad.addColorStop(0.5, `rgba(255,255,255,${entPhase * 0.12})`);
          grad.addColorStop(0.7, `rgba(${hsl(hue+ei*45+90)},${entPhase * 0.22})`);
          grad.addColorStop(1,   `rgba(${hsl(hue+ei*45+90)},0.0)`);
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = grad; ctx.lineWidth = 0.6 + entPhase * 0.5; ctx.stroke();
        }
      });

      // ── Signal pulses ───────────────────────────────────────────────────────
      signals.forEach((sig, si) => {
        sig.t += sig.spd * (isStorm ? 2.2 : 1.0);
        if (sig.t >= 1.0) { signals.splice(si, 1); return; }
        const a = drawNodes[sig.ni], b = drawNodes[sig.nj];
        const px = a.x + (b.x - a.x) * sig.t;
        const py = a.y + (b.y - a.y) * sig.t;
        const grd = ctx.createRadialGradient(px, py, 0, px, py, 3.5);
        grd.addColorStop(0, `rgba(255,255,255,0.95)`);
        grd.addColorStop(0.3, `rgba(${hsl(sig.hOff)},0.7)`);
        grd.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(px, py, 3.5, 0, Math.PI*2);
        ctx.fillStyle = grd; ctx.fill();
      });

      // Draw nodes (depth-sorted front-to-back)
      drawNodes.sort((a, b) => a.z - b.z).forEach(dn => {
        const n = nodes[dn.ni];
        const fire = Math.sin(t * n.fireSpd + n.firePhase) * 0.5 + 0.5;
        const alpha = 0.45 + fire * 0.45 + (isStorm ? fire * 0.4 : 0);
        const nr    = (n.r + (isStorm ? fire * 0.6 : 0)) * dn.sc * 6.5;

        // Glow halo
        const ng = ctx.createRadialGradient(dn.x, dn.y, 0, dn.x, dn.y, nr * 2.8);
        ng.addColorStop(0, `rgba(${n.cortex},${alpha * 0.4})`);
        ng.addColorStop(1, "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(dn.x, dn.y, nr * 2.8, 0, Math.PI*2);
        ctx.fillStyle = ng; ctx.fill();

        // Node dot
        ctx.beginPath(); ctx.arc(dn.x, dn.y, Math.max(0.4, nr), 0, Math.PI*2);
        ctx.fillStyle = `rgba(${n.cortex},${alpha})`; ctx.fill();
      });

      // ── Brain sphere outline ────────────────────────────────────────────────
      const sphereGrad = ctx.createRadialGradient(cx - R_BRAIN*0.3, cy - R_BRAIN*0.3, 0, cx, cy, R_BRAIN * 1.15);
      sphereGrad.addColorStop(0,   `rgba(${acRGB},${isO ? 0.22 : isH ? 0.16 : 0.08})`);
      sphereGrad.addColorStop(0.55, `rgba(${hsl(hue+120)},0.04)`);
      sphereGrad.addColorStop(1,   "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, R_BRAIN * 1.15, 0, Math.PI*2);
      ctx.fillStyle = sphereGrad; ctx.fill();

      // Outer ring
      ctx.beginPath(); ctx.arc(cx, cy, R_BRAIN * 1.15, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(${acRGB},${isH ? 0.40 : 0.18})`; ctx.lineWidth = 0.7; ctx.stroke();

      // ── Center core ────────────────────────────────────────────────────────
      const coreR = 2.8 + (isStorm ? 1.2 : 0);
      const core  = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      core.addColorStop(0, `rgba(255,255,255,${isH ? 0.95 : 0.70})`);
      core.addColorStop(0.4, `rgba(${acRGB},0.80)`);
      core.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI*2);
      ctx.fillStyle = core; ctx.fill();

      // Storm burst flare
      if (isStorm) {
        const age = t - stormRef.current;
        const flare = Math.max(0, 1 - age / 1.8);
        for (let f = 0; f < 12; f++) {
          const fa = (f / 12) * Math.PI * 2;
          const fl = (R_BRAIN * 0.6 + Math.random() * R_BRAIN * 0.8) * flare;
          ctx.beginPath(); ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(fa)*fl, cy + Math.sin(fa)*fl);
          ctx.strokeStyle = `rgba(${acRGB},${flare * 0.22})`; ctx.lineWidth = 0.8; ctx.stroke();
        }
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: 46, height: 46, display: "block", imageRendering: "auto", borderRadius: "50%" }}
    />
  );
}

// ── Main export ────────────────────────────────────────────────────────────────
interface QuantumPersona3DProps {
  onOpenPersonaManager?: () => void;
}

const PERSONA_CAT_COLORS: Record<string, string> = {
  general:    "#22c55e",
  uncensored: "#f59e0b",
  security:   "#e21227",
  specialist: "#6366f1",
  mastero:    "#a78bfa",
};

export function QuantumPersona3D({ onOpenPersonaManager }: QuantumPersona3DProps) {
  const { state, dispatch } = useStore();
  const [hover, setHover] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const activePersona = state.activePersona ?? "default";
  const activePresetId = state.settings?.activePersonaPreset ?? "default";
  const activePreset = PERSONA_PRESETS.find(p => p.id === activePresetId) ?? PERSONA_PRESETS[0];
  const activeColor = PERSONA_CAT_COLORS[activePersona] ?? PERSONA_CAT_COLORS[activePreset?.category ?? ""] ?? "#a78bfa";

  useEffect(() => {
    if (!showPanel) return;
    const h = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setShowPanel(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [showPanel]);

  useEffect(() => {
    if (!showPanel) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setShowPanel(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [showPanel]);

  const topPresets = PERSONA_PRESETS.slice(0, 10);

  return (
    <div ref={panelRef} className="relative flex-shrink-0">
      <motion.div
        onClick={() => setShowPanel(o => !o)}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className="relative flex-shrink-0 rounded-full cursor-pointer select-none flex items-center justify-center"
        style={{
          width: 44, height: 44,
          boxShadow: hover || showPanel
            ? `0 0 28px ${activeColor}90, 0 0 56px ${activeColor}40, 0 0 12px ${activeColor}60, inset 0 0 10px ${activeColor}20`
            : `0 0 16px ${activeColor}40, 0 0 32px ${activeColor}18`,
          border: `2px solid ${hover || showPanel ? activeColor + "aa" : activeColor + "40"}`,
          borderRadius: "50%",
          background: `radial-gradient(circle at 38% 38%, ${activeColor}25, rgba(3,3,10,0.96))`,
          transition: "box-shadow 0.22s, border-color 0.22s",
        }}
        whileHover={{ scale: 1.10, y: -2 }}
        whileTap={{ scale: 0.88 }}
        transition={{ type: "spring", stiffness: 540, damping: 24 }}
        title={`شخصية AI — ${activePreset?.nameAr ?? activePersona}`}
        aria-label="شخصية AI"
      >
        <QuantumBrain3D open={showPanel} hover={hover} activeColor={activeColor} />

        {/* Active indicator — dual ring pulse */}
        <motion.div
          className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full"
          style={{ background: activeColor, boxShadow: `0 0 10px ${activeColor}` }}
          animate={{ opacity: [1, 0.30, 1], scale: [1, 1.45, 1] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border"
          style={{ borderColor: activeColor + "60" }}
          animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.8, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: 0.4 }}
        />

        {/* Hover tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 5, scale: 0.88 }}
          animate={{ opacity: hover && !showPanel ? 1 : 0, y: hover && !showPanel ? 0 : 5, scale: hover && !showPanel ? 1 : 0.88 }}
          transition={{ duration: 0.16 }}
          className="absolute -bottom-7 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap"
          style={{ fontSize: 8, fontWeight: 900, color: activeColor, letterSpacing: "0.12em", textShadow: `0 0 12px ${activeColor}` }}
        >
          PERSONA
        </motion.div>
      </motion.div>

      {/* ── FLOATING PERSONA PANEL ── */}
      <AnimatePresence>
        {showPanel && (
          <>
            <motion.div
              className="fixed inset-0 z-[9988]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ background: "rgba(0,0,0,0.50)", backdropFilter: "blur(3px)" }}
              onClick={() => setShowPanel(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -12 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "fixed",
                top: "5vh",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 9989,
                width: "clamp(320px, 38vw, 480px)",
                maxHeight: "82vh",
                background: "linear-gradient(160deg, rgba(4,2,14,0.99) 0%, rgba(2,1,8,0.99) 60%, rgba(6,2,16,0.99) 100%)",
                border: `1px solid ${activeColor}40`,
                borderRadius: 20,
                boxShadow: `0 0 120px ${activeColor}20, 0 0 50px ${activeColor}10, 0 32px 80px rgba(0,0,0,0.96), inset 0 1px 0 ${activeColor}18`,
                backdropFilter: "blur(40px)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Top accent */}
              <div className="h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${activeColor}, transparent)` }} />
              {/* Corner brackets */}
              <span className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 pointer-events-none rounded-tl" style={{ borderColor: `${activeColor}70` }} />
              <span className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 pointer-events-none rounded-tr" style={{ borderColor: `${activeColor}70` }} />
              <span className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 pointer-events-none rounded-bl" style={{ borderColor: `${activeColor}40` }} />
              <span className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 pointer-events-none rounded-br" style={{ borderColor: `${activeColor}40` }} />

              {/* Header */}
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${activeColor}12` }}>
                <div>
                  <div className="text-[10px] font-black tracking-[0.28em] uppercase font-mono" style={{ color: `${activeColor}cc` }}>QUANTUM PERSONA</div>
                  <div className="text-sm font-bold text-white mt-0.5">اختر شخصية AI</div>
                </div>
                <div className="flex items-center gap-2">
                  <motion.div className="w-2 h-2 rounded-full" style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}` }}
                    animate={{ opacity: [0.5, 1], scale: [0.9, 1.1] }} transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse" }} />
                  <span className="text-[8px] font-mono mr-1" style={{ color: `${activeColor}80` }}>LIVE</span>
                  <motion.button onClick={() => setShowPanel(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center ml-2"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
                    whileHover={{ background: "rgba(255,255,255,0.12)" }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </motion.button>
                </div>
              </div>

              {/* Active persona card */}
              <div className="mx-4 mt-3 mb-2 rounded-2xl p-3 flex items-center gap-3"
                style={{ background: `${activeColor}10`, border: `1px solid ${activeColor}28` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${activeColor}18`, border: `1px solid ${activeColor}30` }}>
                  <QuantumBrain3D open={true} hover={false} activeColor={activeColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-bold tracking-widest uppercase mb-0.5" style={{ color: `${activeColor}80` }}>{activePreset?.category ?? activePersona} · نشط</div>
                  <div className="text-sm font-black text-white truncate">{activePreset?.nameAr ?? activePersona}</div>
                  <div className="text-[10px] text-white/40 truncate mt-0.5">{activePreset?.descAr?.slice(0, 42) ?? "الشخصية الافتراضية"}…</div>
                </div>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: activeColor, boxShadow: `0 0 8px ${activeColor}` }} />
              </div>

              {/* Presets grid */}
              <div className="px-4 pb-1">
                <div className="text-[8px] font-bold tracking-[0.22em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.28)" }}>تبديل سريع</div>
                <div className="grid grid-cols-2 gap-1.5 max-h-[40vh] overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: `${activeColor}30 transparent` }}>
                  {topPresets.map(preset => {
                    const pc = PERSONA_CAT_COLORS[preset.category] ?? "#a78bfa";
                    const isActive = preset.id === activePresetId;
                    const Icon = preset.icon;
                    return (
                      <motion.button
                        key={preset.id}
                        onClick={() => {
                          dispatch({ type: "SET_SETTINGS", patch: { activePersonaPreset: preset.id } } as Parameters<typeof dispatch>[0]);
                          setShowPanel(false);
                        }}
                        className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left"
                        style={{
                          background: isActive ? `${pc}1e` : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isActive ? pc + "45" : "rgba(255,255,255,0.07)"}`,
                          boxShadow: isActive ? `0 0 14px ${pc}25` : "none",
                        }}
                        whileHover={{ scale: 1.02, background: `${pc}12` }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: `${pc}20`, border: `1px solid ${pc}30` }}>
                          <Icon className="w-3.5 h-3.5" style={{ color: `${pc}e0` }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold truncate" style={{ color: isActive ? pc : "rgba(255,255,255,0.65)" }}>
                            {preset.nameAr.slice(0, 14)}
                          </div>
                          <div className="text-[8px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.28)" }}>
                            {preset.category}
                          </div>
                        </div>
                        {isActive && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pc, boxShadow: `0 0 6px ${pc}` }} />}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="px-4 py-3 flex gap-2 mt-1" style={{ borderTop: `1px solid ${activeColor}10` }}>
                {onOpenPersonaManager && (
                  <motion.button
                    onClick={() => { setShowPanel(false); onOpenPersonaManager(); }}
                    className="flex-1 rounded-xl py-2.5 text-[10px] font-black tracking-wider flex items-center justify-center gap-1.5"
                    style={{
                      background: "linear-gradient(135deg, rgba(226,18,39,0.18), rgba(226,18,39,0.08))",
                      border: "1px solid rgba(226,18,39,0.35)",
                      color: "#e21227",
                    }}
                    whileHover={{ scale: 1.02, boxShadow: "0 0 24px rgba(226,18,39,0.25)" }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                    مدير الشخصيات
                  </motion.button>
                )}
              </div>

              {/* Bottom stripe */}
              <div className="h-px" style={{ background: `linear-gradient(90deg, transparent, ${activeColor}50, transparent)` }} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
