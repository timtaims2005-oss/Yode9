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
    const DPR  = window.devicePixelRatio || 1;
    const SIZE = size;
    cv.width  = SIZE * DPR;
    cv.height = SIZE * DPR;
    ctx.scale(DPR, DPR);
    const cx = SIZE / 2, cy = SIZE / 2;
    const [cr, cg, cb] = color;
    const scale = SIZE / 36;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      tRef.current += 0.04;
      const t = tRef.current;
      ctx.clearRect(0, 0, SIZE, SIZE);

      // outer glow
      const glowP = pulse ? 0.5 + Math.sin(t * 3) * 0.3 : 0.2;
      const halo = ctx.createRadialGradient(cx, cy, 6 * scale, cx, cy, SIZE / 2);
      halo.addColorStop(0,   `rgba(${cr},${cg},${cb},${glowP})`);
      halo.addColorStop(0.5, `rgba(${cr},${cg},${cb},${glowP * 0.3})`);
      halo.addColorStop(1,   `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath(); ctx.arc(cx, cy, SIZE / 2, 0, Math.PI * 2);
      ctx.fillStyle = halo; ctx.fill();

      // rotating ring
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.6);
      ctx.beginPath();
      ctx.ellipse(0, 0, 14 * scale, 4 * scale, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.35)`;
      ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-t * 0.4);
      ctx.beginPath();
      ctx.ellipse(0, 0, 10 * scale, 3.5 * scale, Math.PI / 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.22)`;
      ctx.lineWidth = 0.6; ctx.stroke();
      ctx.restore();

      // sphere body
      const SR = 8 * scale;
      const diff = ctx.createRadialGradient(cx - SR * 0.3, cy - SR * 0.35, 0, cx, cy, SR);
      diff.addColorStop(0,    `rgba(${Math.min(cr+80,255)},${Math.min(cg+80,255)},${Math.min(cb+80,255)},0.9)`);
      diff.addColorStop(0.45, `rgba(${cr},${cg},${cb},0.8)`);
      diff.addColorStop(1,    `rgba(${Math.round(cr*0.3)},${Math.round(cg*0.3)},${Math.round(cb*0.3)},0.6)`);
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${Math.round(cr*0.1)},${Math.round(cg*0.1)},${Math.round(cb*0.1)},0.95)`;
      ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = diff; ctx.fill();

      // specular
      const spec = ctx.createRadialGradient(cx - SR * 0.4, cy - SR * 0.45, 0, cx, cy, SR);
      spec.addColorStop(0,   "rgba(255,255,255,0.7)");
      spec.addColorStop(0.3, "rgba(255,255,255,0.15)");
      spec.addColorStop(1,   "rgba(255,255,255,0)");
      ctx.beginPath(); ctx.arc(cx, cy, SR, 0, Math.PI * 2);
      ctx.fillStyle = spec; ctx.fill();

      // orbiting particle
      const pa = t * 1.4;
      const px = cx + Math.cos(pa) * 13 * scale;
      const py = cy + Math.sin(pa) * 4 * scale;
      const pr = 3 * scale;
      const pGlow = ctx.createRadialGradient(px, py, 0, px, py, pr);
      pGlow.addColorStop(0, `rgba(255,255,255,0.9)`);
      pGlow.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = pGlow; ctx.fill();
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
  const { state } = useStore();
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

  return (
    <div ref={ref} className="relative flex-shrink-0">
      {/* Main trigger button */}
      <motion.button
        onClick={() => setShowPanel(v => !v)}
        className="relative flex items-center gap-1 px-1 sm:gap-1.5 sm:px-2 py-0.5 rounded-xl transition-all"
        style={{
          background: showPanel || isCustomActive
            ? `rgba(${cr},${cg},${cb},0.12)`
            : "rgba(255,255,255,0.04)",
          border: `1px solid rgba(${cr},${cg},${cb},${showPanel || isCustomActive ? 0.45 : 0.18})`,
          boxShadow: showPanel || isCustomActive
            ? `0 0 18px rgba(${cr},${cg},${cb},0.25), inset 0 1px 0 rgba(255,255,255,0.06)`
            : "inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        aria-label="محوّل الشخصيات"
        title={`الشخصية النشطة: ${activePreset.nameAr}`}
      >
        {/* HUD corner accents */}
        <span className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l pointer-events-none"
          style={{ borderColor: `rgba(${cr},${cg},${cb},0.5)` }} />
        <span className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r pointer-events-none"
          style={{ borderColor: `rgba(${cr},${cg},${cb},0.5)` }} />

        <PersonaOrb color={color} pulse={isCustomActive} size={22} />

        <div className="hidden sm:flex flex-col items-start leading-none gap-0.5">
          <span style={{ fontSize: "7px", fontWeight: 800, letterSpacing: "0.25em", color: `rgba(${cr},${cg},${cb},0.7)`, fontFamily: "monospace" }}>
            PERSONA
          </span>
          <span className="text-[10px] font-black truncate max-w-[64px]" style={{ color: `rgba(${cr},${cg},${cb},0.95)` }}>
            {activePreset.nameAr.slice(0, 10)}
          </span>
        </div>

        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 hidden sm:block"
          style={{ color: `rgba(${cr},${cg},${cb},0.5)` }}>
          <path d={showPanel ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
        </svg>
      </motion.button>

      {/* 3D Quick-Pick Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.94, rotateX: -8 }}
            animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
            exit={{ opacity: 0, y: -8, scale: 0.94, rotateX: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50"
            style={{
              width: 280,
              background: "rgba(7,7,12,0.97)",
              border: `1px solid rgba(${cr},${cg},${cb},0.25)`,
              borderRadius: 16,
              boxShadow: `0 0 40px rgba(${cr},${cg},${cb},0.15), 0 8px 32px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)`,
              backdropFilter: "blur(20px)",
              transformStyle: "preserve-3d",
              perspective: 800,
            }}
          >
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
                        setShowPanel(false);
                        onOpenPersonaEditor();
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
              style={{ background: `linear-gradient(90deg, transparent, rgba(${cr},${cg},${cb},0.2), transparent)` }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
