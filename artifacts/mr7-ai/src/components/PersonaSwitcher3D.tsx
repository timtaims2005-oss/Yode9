import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { PERSONA_PRESETS, type PersonaPreset } from "./modals/PersonaEditorModal";

const CATEGORY_COLORS: Record<string, [number, number, number]> = {
  general:    [34,  197, 94 ],
  uncensored: [245, 158, 11 ],
  security:   [226, 18,  39 ],
  specialist: [99,  102, 241],
};

function PersonaOrb({ color, pulse, size = 24 }: { color: [number, number, number]; pulse: boolean; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef(0);
  const tRef      = useRef(0);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const DPR  = Math.min(window.devicePixelRatio || 1, 2);
    const SIZE = size;
    cv.width  = SIZE * DPR;
    cv.height = SIZE * DPR;
    ctx.scale(DPR, DPR);
    const cx = SIZE / 2, cy = SIZE / 2;
    const [cr, cg, cb] = color;
    const sc = SIZE / 44; // unified scale factor

    // ── Fibonacci sphere nodes ──
    const NODE_COUNT = Math.max(8, Math.round(size * 0.55));
    interface SphereNode { nx: number; ny: number; nz: number }
    const nodes: SphereNode[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < NODE_COUNT; i++) {
      const y2 = 1 - (i / (NODE_COUNT - 1)) * 2;
      const r2 = Math.sqrt(Math.max(0, 1 - y2 * y2));
      const phi = golden * i;
      nodes.push({ nx: Math.cos(phi) * r2, ny: y2, nz: Math.sin(phi) * r2 });
    }

    // ── Orbital particles ──
    const ORBIT_COUNT = 3;
    const orbitals = Array.from({ length: ORBIT_COUNT }, (_, i) => ({
      speed:  0.9 + i * 0.55,
      phase:  (i / ORBIT_COUNT) * Math.PI * 2,
      tiltX:  (i * 1.3),
      tiltZ:  (i * 0.8),
      radius: (0.72 + i * 0.14) * sc * 18,
    }));

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.028;
      const t = tRef.current;
      ctx.clearRect(0, 0, SIZE, SIZE);

      const SR = 9 * sc; // sphere radius
      const rotY = t * 0.45;
      const rotX = Math.sin(t * 0.18) * 0.28;
      const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX), sinX = Math.sin(rotX);

      // ── outer ambient halo ──
      const glowAlpha = pulse ? 0.40 + Math.sin(t * 2.8) * 0.22 : 0.20;
      const halo = ctx.createRadialGradient(cx, cy, SR * 0.4, cx, cy, SIZE * 0.54);
      halo.addColorStop(0,   `rgba(${cr},${cg},${cb},${glowAlpha})`);
      halo.addColorStop(0.45,`rgba(${cr},${cg},${cb},${glowAlpha * 0.28})`);
      halo.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, SIZE * 0.54, 0, Math.PI * 2);
      ctx.fillStyle = halo; ctx.fill();

      // ── corona ring ──
      if (pulse) {
        const coronaR = SR + 5 * sc + Math.sin(t * 2.1) * 1.5 * sc;
        ctx.beginPath(); ctx.arc(cx, cy, coronaR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${0.15 + Math.sin(t * 2.1) * 0.10})`;
        ctx.lineWidth = 1 * sc; ctx.stroke();
      }

      // ── project + sort sphere nodes ──
      interface Projected { sx: number; sy: number; sz: number; alpha: number }
      const projected: Projected[] = nodes.map(n => {
        // rotate Y
        const x1 = n.nx * cosY - n.nz * sinY;
        const z1 = n.nx * sinY + n.nz * cosY;
        // rotate X
        const y2 = n.ny * cosX - z1 * sinX;
        const z2 = n.ny * sinX + z1 * cosX;
        const alpha = (z2 + 1) / 2; // 0..1 depth
        return { sx: cx + x1 * SR, sy: cy + y2 * SR, sz: z2, alpha };
      });
      projected.sort((a, b) => a.sz - b.sz); // back-to-front

      // ── sphere body (dark glass) ──
      const body = ctx.createRadialGradient(cx - SR * 0.32, cy - SR * 0.38, 0, cx, cy, SR);
      body.addColorStop(0,    `rgba(${Math.min(cr+60,255)},${Math.min(cg+60,255)},${Math.min(cb+60,255)},0.18)`);
      body.addColorStop(0.5,  `rgba(${cr},${cg},${cb},0.09)`);
      body.addColorStop(1,    `rgba(${Math.round(cr*0.15)},${Math.round(cg*0.15)},${Math.round(cb*0.15)},0.85)`);
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(2,2,6,0.88)`; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = body; ctx.fill();

      // ── sphere border ──
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.38)`;
      ctx.lineWidth = 0.7 * sc; ctx.stroke();

      // ── neural connections between nearby nodes ──
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < Math.min(projected.length, i + 4); j++) {
          const a = projected[i], b = projected[j];
          const dx = a.sx - b.sx, dy = a.sy - b.sy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < SR * 1.1) {
            const depthAlpha = ((a.alpha + b.alpha) / 2) * 0.35;
            ctx.beginPath();
            ctx.moveTo(a.sx, a.sy);
            ctx.lineTo(b.sx, b.sy);
            ctx.strokeStyle = `rgba(${cr},${cg},${cb},${depthAlpha * (1 - dist / (SR * 1.1))})`;
            ctx.lineWidth = 0.4 * sc; ctx.stroke();
          }
        }
      }

      // ── neural nodes ──
      for (const p of projected) {
        const nr = (0.9 + p.alpha * 1.0) * sc;
        const nodeAlpha = 0.25 + p.alpha * 0.75;
        const ng = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, nr * 3);
        ng.addColorStop(0, `rgba(${Math.min(cr+120,255)},${Math.min(cg+120,255)},${Math.min(cb+120,255)},${nodeAlpha})`);
        ng.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.beginPath(); ctx.arc(p.sx, p.sy, nr * 3, 0, Math.PI * 2);
        ctx.fillStyle = ng; ctx.fill();
        ctx.beginPath(); ctx.arc(p.sx, p.sy, nr, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${nodeAlpha * 0.9})`; ctx.fill();
      }

      // ── specular highlight ──
      const spec = ctx.createRadialGradient(cx - SR * 0.38, cy - SR * 0.42, 0, cx - SR * 0.2, cy - SR * 0.2, SR * 0.75);
      spec.addColorStop(0,   "rgba(255,255,255,0.65)");
      spec.addColorStop(0.35,"rgba(255,255,255,0.12)");
      spec.addColorStop(1,   "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = spec; ctx.fill();

      // ── orbital rings (ellipse, tilted) ──
      const RING_CONFIGS = [
        { rx: 15 * sc, ry: 4.5 * sc, angle: t * 0.65,  alpha: 0.38, tilt: Math.PI * 0.12 },
        { rx: 12 * sc, ry: 3.5 * sc, angle: -t * 0.42, alpha: 0.24, tilt: Math.PI * 0.55 },
        { rx: 18 * sc, ry: 2.8 * sc, angle: t * 0.30,  alpha: 0.16, tilt: Math.PI * 0.30 },
      ];
      for (const ring of RING_CONFIGS) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(ring.angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, ring.rx, ring.ry, ring.tilt, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${ring.alpha})`;
        ctx.lineWidth = 0.65 * sc; ctx.stroke();
        ctx.restore();
      }

      // ── orbiting particles with trails ──
      for (const orb of orbitals) {
        const angle = t * orb.speed + orb.phase;
        const cosT = Math.cos(orb.tiltX), sinT = Math.sin(orb.tiltX);
        const cosZ = Math.cos(orb.tiltZ), sinZ = Math.sin(orb.tiltZ);
        const ox = Math.cos(angle) * orb.radius;
        const oy = Math.sin(angle) * orb.radius * 0.35;
        const px2 = cx + ox * cosZ - oy * sinZ;
        const py2 = cy + ox * sinT + oy * cosT;

        // trail
        for (let tr = 1; tr <= 5; tr++) {
          const ta = angle - tr * 0.15;
          const tax = Math.cos(ta) * orb.radius;
          const tay = Math.sin(ta) * orb.radius * 0.35;
          const tpx = cx + tax * cosZ - tay * sinZ;
          const tpy = cy + tax * sinT + tay * cosT;
          ctx.beginPath(); ctx.arc(tpx, tpy, (1.5 - tr * 0.2) * sc, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${(0.35 - tr * 0.06)})`;
          ctx.fill();
        }

        // particle core
        const pg = ctx.createRadialGradient(px2, py2, 0, px2, py2, 3 * sc);
        pg.addColorStop(0, "rgba(255,255,255,0.95)");
        pg.addColorStop(0.4, `rgba(${Math.min(cr+100,255)},${Math.min(cg+100,255)},${Math.min(cb+100,255)},0.7)`);
        pg.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.beginPath(); ctx.arc(px2, py2, 3 * sc, 0, Math.PI * 2);
        ctx.fillStyle = pg; ctx.fill();
      }

      // ── inner pulsing core ──
      const coreR = 2.8 * sc * (1 + Math.sin(t * 3.5) * 0.2);
      const coreG = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      coreG.addColorStop(0,   "rgba(255,255,255,0.9)");
      coreG.addColorStop(0.5, `rgba(${cr},${cg},${cb},0.6)`);
      coreG.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = coreG; ctx.fill();
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [color, pulse, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, imageRendering: "crisp-edges", flexShrink: 0 }}
    />
  );
}

interface PersonaSwitcher3DProps {
  onOpenPersonaEditor: () => void;
  onOpenPersonaManager?: () => void;
}

export function PersonaSwitcher3D({ onOpenPersonaEditor, onOpenPersonaManager }: PersonaSwitcher3DProps) {
  const { state, dispatch } = useStore();
  const [showPanel, setShowPanel] = useState(false);
  const [hoverPreset, setHoverPreset] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const activePresetId = state.settings.activePersonaPreset ?? "default";
  const activePreset = PERSONA_PRESETS.find(p => p.id === activePresetId) ?? PERSONA_PRESETS[0];
  const color = CATEGORY_COLORS[activePreset.category] ?? [34, 197, 94];
  const [cr, cg, cb] = color;
  const isCustomActive = activePresetId !== "default";

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowPanel(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const topPresets = PERSONA_PRESETS.slice(0, 8);
  const btnRef2 = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });

  function openPanel() {
    if (btnRef2.current) {
      const r = btnRef2.current.getBoundingClientRect();
      setPanelPos({
        top: Math.min(r.bottom + 8, window.innerHeight - 460),
        left: Math.min(r.left - 120, window.innerWidth - 300),
      });
    }
    setShowPanel(v => !v);
  }

  // Escape key to close
  useEffect(() => {
    if (!showPanel) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setShowPanel(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [showPanel]);

  return (
    <div ref={ref} className="relative flex-shrink-0">
      {/* Main trigger button — circular 36px */}
      <motion.button
        ref={btnRef2}
        onClick={openPanel}
        className="relative flex items-center justify-center rounded-full transition-all"
        style={{
          width: 44, height: 44,
          background: showPanel || isCustomActive
            ? `radial-gradient(circle at 38% 38%, rgba(${cr},${cg},${cb},0.32), rgba(0,0,0,0.95))`
            : `radial-gradient(circle at 38% 38%, rgba(${cr},${cg},${cb},0.14), rgba(0,0,0,0.88))`,
          border: `2px solid rgba(${cr},${cg},${cb},${showPanel || isCustomActive ? 0.75 : 0.30})`,
          boxShadow: showPanel || isCustomActive
            ? `0 0 28px rgba(${cr},${cg},${cb},0.50), 0 0 60px rgba(${cr},${cg},${cb},0.18), inset 0 0 14px rgba(${cr},${cg},${cb},0.10)`
            : `0 0 16px rgba(${cr},${cg},${cb},0.22), 0 0 32px rgba(${cr},${cg},${cb},0.08)`,
        }}
        whileHover={{ scale: 1.10, y: -1 }}
        whileTap={{ scale: 0.90 }}
        aria-label="محوّل الشخصيات"
        title={`الشخصية النشطة: ${activePreset.nameAr}`}
      >
        <PersonaOrb color={color} pulse={isCustomActive} size={22} />
        {(showPanel || isCustomActive) && (
          <motion.span
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.35, 1] }}
            transition={{ duration: 2.2, repeat: Infinity }}
            style={{ border: `1px solid rgba(${cr},${cg},${cb},0.55)` }}
          />
        )}
      </motion.button>

      {/* 3D External Floating Window */}
      <AnimatePresence>
        {showPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[1994]"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowPanel(false)}
            />

          <motion.div
            initial={{ opacity: 0, scale: 0.93, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: -10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              top: panelPos.top,
              left: panelPos.left,
              zIndex: 1995,
              width: 300,
              background: "linear-gradient(160deg, rgba(5,3,14,0.99) 0%, rgba(3,2,9,0.99) 100%)",
              border: `1px solid rgba(${cr},${cg},${cb},0.30)`,
              borderRadius: 18,
              boxShadow: `0 0 80px rgba(${cr},${cg},${cb},0.18), 0 0 30px rgba(${cr},${cg},${cb},0.08), 0 24px 60px rgba(0,0,0,0.90), inset 0 1px 0 rgba(${cr},${cg},${cb},0.12)`,
              backdropFilter: "blur(32px)",
              transformStyle: "preserve-3d",
              perspective: 900,
              pointerEvents: "auto",
            }}
          >
            {/* Corner brackets */}
            <span className="absolute top-2 left-2 w-3 h-3 border-t border-l pointer-events-none" style={{ borderColor: `rgba(${cr},${cg},${cb},0.55)` }} />
            <span className="absolute top-2 right-2 w-3 h-3 border-t border-r pointer-events-none" style={{ borderColor: `rgba(${cr},${cg},${cb},0.55)` }} />
            <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l pointer-events-none" style={{ borderColor: `rgba(${cr},${cg},${cb},0.3)` }} />
            <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r pointer-events-none" style={{ borderColor: `rgba(${cr},${cg},${cb},0.3)` }} />
            {/* Header stripe */}
            <div className="h-[2px] w-full rounded-t-2xl"
              style={{ background: `linear-gradient(90deg, transparent, rgba(${cr},${cg},${cb},0.8), transparent)` }} />

            {/* Header */}
            <div className="px-3 pt-3 pb-2 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-black tracking-[0.3em] uppercase"
                  style={{ color: `rgba(${cr},${cg},${cb},0.7)` }}>
                  محوّل الشخصيات
                </div>
                <div className="text-white text-xs font-bold mt-0.5">اختر شخصية AI</div>
              </div>
              <div className="flex items-center gap-1">
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ background: `rgba(${cr},${cg},${cb},0.9)`, boxShadow: `0 0 8px rgba(${cr},${cg},${cb},0.8)` }}
                  animate={{ opacity: [0.6, 1], scale: [0.9, 1.1] }}
                  transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse" }}
                />
                <span className="text-[8px] font-mono" style={{ color: `rgba(${cr},${cg},${cb},0.6)` }}>LIVE</span>
              </div>
            </div>

            {/* Current persona card */}
            <div className="mx-3 mb-2 rounded-xl p-2.5 flex items-center gap-2.5"
              style={{
                background: `rgba(${cr},${cg},${cb},0.08)`,
                border: `1px solid rgba(${cr},${cg},${cb},0.2)`,
              }}>
              <PersonaOrb color={color} pulse={true} size={36} />
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-bold tracking-widest uppercase" style={{ color: `rgba(${cr},${cg},${cb},0.65)` }}>
                  {activePreset.category}
                </div>
                <div className="text-white text-xs font-bold truncate">{activePreset.nameAr}</div>
                <div className="text-[9px] text-white/40 truncate mt-0.5">{activePreset.descAr.slice(0, 36)}…</div>
              </div>
            </div>

            {/* Quick pick grid */}
            <div className="px-3 pb-2">
              <div className="text-[8px] font-bold tracking-widest uppercase mb-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>
                تبديل سريع
              </div>
              <div className="grid grid-cols-2 gap-1">
                {topPresets.map(preset => {
                  const pc = CATEGORY_COLORS[preset.category] ?? [34, 197, 94];
                  const isActive = preset.id === activePresetId;
                  const isHov = hoverPreset === preset.id;
                  const Icon = preset.icon;
                  return (
                    <motion.button
                      key={preset.id}
                      onMouseEnter={() => setHoverPreset(preset.id)}
                      onMouseLeave={() => setHoverPreset(null)}
                      onClick={() => {
                        dispatch({ type: "SET_SETTINGS", patch: { activePersonaPreset: preset.id } } as Parameters<typeof dispatch>[0]);
                        setShowPanel(false);
                      }}
                      className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left transition-all"
                      style={{
                        background: isActive
                          ? `rgba(${pc[0]},${pc[1]},${pc[2]},0.18)`
                          : isHov ? `rgba(${pc[0]},${pc[1]},${pc[2]},0.1)` : "rgba(255,255,255,0.03)",
                        border: `1px solid rgba(${pc[0]},${pc[1]},${pc[2]},${isActive ? 0.4 : isHov ? 0.25 : 0.1})`,
                        boxShadow: isActive ? `0 0 12px rgba(${pc[0]},${pc[1]},${pc[2]},0.2)` : "none",
                      }}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                        style={{ background: `rgba(${pc[0]},${pc[1]},${pc[2]},0.2)` }}>
                        <Icon className="w-3 h-3" style={{ color: `rgba(${pc[0]},${pc[1]},${pc[2]},0.9)` }} />
                      </div>
                      <span className="text-[10px] font-bold truncate" style={{ color: isActive ? `rgba(${pc[0]},${pc[1]},${pc[2]},0.95)` : "rgba(255,255,255,0.6)" }}>
                        {preset.nameAr.slice(0, 12)}
                      </span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full ml-auto flex-shrink-0"
                          style={{ background: `rgba(${pc[0]},${pc[1]},${pc[2]},0.9)` }} />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Open full editor / manager */}
            <div className="mx-3 mb-3 flex flex-col gap-1.5">
              {onOpenPersonaManager && (
                <motion.button
                  onClick={() => { setShowPanel(false); onOpenPersonaManager(); }}
                  className="w-full rounded-xl py-2 text-[11px] font-black tracking-wider flex items-center justify-center gap-2"
                  style={{
                    background: "linear-gradient(135deg, rgba(226,18,39,0.18), rgba(226,18,39,0.08))",
                    border: "1px solid rgba(226,18,39,0.35)",
                    color: "#e21227",
                    boxShadow: "0 0 16px rgba(226,18,39,0.12)",
                  }}
                  whileHover={{ scale: 1.02, boxShadow: "0 0 24px rgba(226,18,39,0.25)" }}
                  whileTap={{ scale: 0.97 }}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                    <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                  </svg>
                  مدير الشخصيات الكامل
                </motion.button>
              )}
              <motion.button
                onClick={() => { setShowPanel(false); onOpenPersonaEditor(); }}
                className="w-full rounded-xl py-1.5 text-[10px] font-black tracking-wider flex items-center justify-center gap-2"
                style={{
                  background: `rgba(${cr},${cg},${cb},0.08)`,
                  border: `1px solid rgba(${cr},${cg},${cb},0.22)`,
                  color: `rgba(${cr},${cg},${cb},0.8)`,
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" />
                  <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
                </svg>
                محرر الشخصيات
              </motion.button>
            </div>

            {/* Bottom stripe */}
            <div className="h-px w-full rounded-b-2xl"
              style={{ background: `linear-gradient(90deg, transparent, rgba(${cr},${cg},${cb},0.4), transparent)` }} />
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
