import React from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDraggable } from "@/hooks/useDraggable";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { PERSONA_PRESETS } from "./modals/PersonaEditorModal";
import { PlanetOrb } from "./PlanetOrb";

// ── QUANTUM PERSONA 3D — Maximum Quality Neural Brain Orb v3 ──────────────────
// 88-node fibonacci sphere + DNA helix spine + 8 orbital rings
// Neural cortex regions + quantum entanglement beams + synaptic storms
// Consciousness wave propagation + chromatic aberration + depth sorting
// DPR×2 (max 4) for ultra-sharp rendering

// ── Futuristic persona planet orb (clean single-hue design) ──────────────────
function QuantumBrain3D({ open, hover, activeColor }: { open: boolean; hover: boolean; activeColor: string }) {
  const r = parseInt(activeColor.slice(1, 3), 16) || 226;
  const g = parseInt(activeColor.slice(3, 5), 16) || 18;
  const b = parseInt(activeColor.slice(5, 7), 16) || 39;
  return (
    <PlanetOrb
      size={46}
      color={[r, g, b]}
      hover={hover}
      open={open}
      moonCount={3}
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
  const [qpTab, setQpTab] = useState<"neural"|"matrix"|"sync"|"config">("neural");
  const [qpSearch, setQpSearch] = useState("");
  const clickOutRef = useRef<HTMLDivElement>(null);
  const { pos: dragPos, rootRef: panelRef, onDragMouseDown: onPanelDragDown, resetPos: resetPanelPos } = useDraggable("mr7-qp3d-win", { x: Math.max(8, (window.innerWidth - 560) / 2), y: 50 });
  const { toast } = useToast();

  const activePersona = state.activePersona ?? "default";
  const activePresetId = state.settings?.activePersonaPreset ?? "default";
  const activePreset = PERSONA_PRESETS.find(p => p.id === activePresetId) ?? PERSONA_PRESETS[0];
  const activeColor = state.settings.orbColors?.persona || PERSONA_CAT_COLORS[activePersona] || PERSONA_CAT_COLORS[activePreset?.category ?? ""] || "#a78bfa";

  useEffect(() => {
    if (!showPanel) return;
    const h = (e: MouseEvent) => {
      if (clickOutRef.current && !clickOutRef.current.contains(e.target as Node)) setShowPanel(false);
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
        <div
          className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 rounded-full pulse-dot"
          style={{ background: activeColor, boxShadow: `0 0 10px ${activeColor}`, animationDuration: "1.8s" }}
        />
        <div
          className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border ring-pulse"
          style={{ borderColor: activeColor + "60", animationDelay: "0.4s" }}
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

      {showPanel && (
        <motion.button
          onClick={() => { resetPanelPos(); toast({ description: "تمت إعادة نافذة الشخصية إلى موضعها الافتراضي" }); }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.7 }}
          className="absolute flex items-center justify-center rounded-full"
          style={{
            width: 20, height: 20,
            top: -4, right: -4,
            background: "rgba(10,10,16,0.95)",
            border: `1px solid ${activeColor}70`,
            color: activeColor,
          }}
          whileHover={{ scale: 1.15, borderColor: activeColor }}
          whileTap={{ scale: 0.9 }}
          aria-label="إعادة ضبط موضع نافذة الشخصية"
          title="إعادة ضبط الموضع"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
            <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.89" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <path d="M13.5 2.5v3.2h-3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.button>
      )}

      {/* ── FLOATING PERSONA PANEL — QUANTUM v5 — Draggable Window ── */}
      {createPortal(<AnimatePresence>
        {showPanel && (
            <motion.div
              ref={panelRef}
              initial={{ opacity: 0, scale: 0.88, y: -20, rotateX: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.90, y: -14, rotateX: 6 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "fixed", top: dragPos.y, left: dragPos.x,
                zIndex: 9989,
                width: "clamp(360px, 44vw, 560px)", maxHeight: "88vh",
                background: "linear-gradient(160deg, rgba(3,1,12,0.99) 0%, rgba(2,1,8,0.99) 60%, rgba(4,1,14,0.99) 100%)",
                border: `1px solid ${activeColor}45`,
                borderRadius: 22,
                boxShadow: `0 0 140px ${activeColor}25, 0 0 60px ${activeColor}10, 0 40px 100px rgba(0,0,0,0.97), inset 0 1px 0 ${activeColor}20, inset 0 0 80px ${activeColor}03`,
                backdropFilter: "blur(44px)",
                overflow: "hidden", display: "flex", flexDirection: "column",
              }}>

              {/* Animated scan line — CSS */}
              <span className="absolute inset-x-0 h-px pointer-events-none z-20 window-scan-line"
                style={{ background: `linear-gradient(90deg,transparent,${activeColor}80,transparent)` }} />

              {/* Corner brackets */}
              <span className="absolute top-3 left-3 w-5 h-5 border-t-2 border-l-2 pointer-events-none" style={{ borderColor: `${activeColor}80` }} />
              <span className="absolute top-3 right-3 w-5 h-5 border-t-2 border-r-2 pointer-events-none" style={{ borderColor: `${activeColor}80` }} />
              <span className="absolute bottom-3 left-3 w-5 h-5 border-b-2 border-l-2 pointer-events-none" style={{ borderColor: `${activeColor}45` }} />
              <span className="absolute bottom-3 right-3 w-5 h-5 border-b-2 border-r-2 pointer-events-none" style={{ borderColor: `${activeColor}45` }} />

              {/* Top accent */}
              <div className="h-[2px]" style={{ background: `linear-gradient(90deg,transparent,${activeColor},#ffffff33,${activeColor},transparent)` }} />

              {/* Header — drag handle */}
              <div className="px-4 pt-3 pb-[10px] flex items-center justify-between cursor-move select-none" style={{ borderBottom: `1px solid ${activeColor}14` }} onMouseDown={onPanelDragDown}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${activeColor}18`, border: `1px solid ${activeColor}35` }}>
                    <QuantumBrain3D open={true} hover={false} activeColor={activeColor} />
                  </div>
                  <div>
                    <div className="text-[8px] font-black tracking-[0.30em] uppercase font-mono" style={{ color: `${activeColor}90` }}>QUANTUM PERSONA · v5.0</div>
                    <div className="text-sm font-black text-white mt-0.5">{activePreset?.nameAr ?? activePersona}</div>
                    <div className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.32)" }}>{activePreset?.category?.toUpperCase() ?? "GENERAL"} · نشط</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: activeColor, boxShadow: `0 0 10px ${activeColor}`, animationDuration: "1.1s" }} />
                    <span className="text-[6px] font-black font-mono mt-0.5" style={{ color: `${activeColor}70` }}>LIVE</span>
                  </div>
                  <motion.button onClick={() => setShowPanel(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center ml-1"
                    style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
                    whileHover={{ background: "rgba(255,60,60,0.15)", color: "#ff4444", borderColor: "rgba(255,60,60,0.3)" }}>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
                  </motion.button>
                </div>
              </div>

              {/* Tab bar */}
              <div className="flex px-4 gap-0.5 pt-2 pb-0" style={{ borderBottom: `1px solid ${activeColor}10` }}>
                {([
                  { id: "neural", label: "NEURAL" },
                  { id: "matrix", label: "MATRIX" },
                  { id: "sync",   label: "SYNC"   },
                  { id: "config", label: "CONFIG" },
                ] as const).map(tab => {
                  const isActive = qpTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => setQpTab(tab.id)}
                      className="px-3 py-1.5 text-[8px] font-black tracking-widest uppercase rounded-t-lg transition-all font-mono"
                      style={{
                        color: isActive ? activeColor : "rgba(255,255,255,0.30)",
                        background: isActive ? `${activeColor}12` : "transparent",
                        borderBottom: isActive ? `2px solid ${activeColor}` : "2px solid transparent",
                      }}>
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* ── NEURAL TAB ── */}
              {qpTab === "neural" && (
                <div className="p-4 space-y-3 overflow-y-auto" style={{ maxHeight: "calc(88vh - 160px)", scrollbarWidth: "thin", scrollbarColor: `${activeColor}25 transparent` }}>
                  {/* Active card */}
                  <div className="rounded-2xl p-3 flex items-center gap-3"
                    style={{ background: `${activeColor}0d`, border: `1px solid ${activeColor}28` }}>
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `${activeColor}18`, border: `1px solid ${activeColor}35` }}>
                      <QuantumBrain3D open={true} hover={true} activeColor={activeColor} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[8px] font-bold tracking-widest uppercase" style={{ color: `${activeColor}75` }}>{activePreset?.category ?? "general"} · نشط</div>
                      <div className="text-base font-black text-white truncate">{activePreset?.nameAr ?? activePersona}</div>
                      <div className="text-[9px] text-white/40 mt-0.5 line-clamp-2">{activePreset?.descAr ?? "الشخصية الافتراضية"}</div>
                    </div>
                  </div>
                  {/* Neural metrics */}
                  <div className="text-[7px] font-bold tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.28)" }}>مؤشرات الدماغ</div>
                  {[
                    { label: "الأمن السيبراني", pct: 95, color: "#e21227" },
                    { label: "دقة الاستدلال",    pct: 90, color: activeColor },
                    { label: "تحليل الكود",       pct: 87, color: "#22c55e" },
                    { label: "OSINT",               pct: 82, color: "#f59e0b" },
                    { label: "الإبداع",             pct: 74, color: "#a78bfa" },
                  ].map(m => (
                    <div key={m.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] font-mono" style={{ color: "rgba(255,255,255,0.45)" }}>{m.label}</span>
                        <span className="text-[8px] font-black font-mono" style={{ color: m.color }}>{m.pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                        <motion.div className="h-full rounded-full"
                          initial={{ width: 0 }} animate={{ width: `${m.pct}%` }}
                          transition={{ duration: 0.9, ease: "easeOut" }}
                          style={{ background: `linear-gradient(90deg,${m.color}66,${m.color})`, boxShadow: `0 0 6px ${m.color}44` }} />
                      </div>
                    </div>
                  ))}
                  {/* Quick switch */}
                  <div className="text-[7px] font-bold tracking-[0.25em] uppercase pt-1" style={{ color: "rgba(255,255,255,0.28)" }}>تبديل سريع</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {topPresets.map(preset => {
                      const pc = PERSONA_CAT_COLORS[preset.category] ?? "#a78bfa";
                      const isActive = preset.id === activePresetId;
                      const Icon = preset.icon;
                      return (
                        <motion.button key={preset.id}
                          onClick={() => { dispatch({ type: "SET_SETTINGS", patch: { activePersonaPreset: preset.id } } as Parameters<typeof dispatch>[0]); setShowPanel(false); }}
                          className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left relative overflow-hidden"
                          style={{
                            background: isActive ? `${pc}1e` : "rgba(255,255,255,0.025)",
                            border: `1px solid ${isActive ? pc+"45" : "rgba(255,255,255,0.07)"}`,
                            boxShadow: isActive ? `0 0 14px ${pc}25` : "none",
                          }}
                          whileHover={{ scale: 1.02, background: `${pc}12` }} whileTap={{ scale: 0.97 }}>
                          {isActive && <div className="absolute left-0 inset-y-0 w-0.5 rounded-full pulse-dot" style={{ background: pc, animationDuration: "1.5s" }} />}
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: `${pc}20`, border: `1px solid ${pc}35` }}>
                            {(Icon ? React.createElement(Icon, { className: "w-3 h-3", style: { color: `${pc}ee` } }) : null)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold truncate" style={{ color: isActive ? pc : "rgba(255,255,255,0.65)" }}>{preset.nameAr.slice(0,14)}</div>
                            <div className="text-[7px] font-mono" style={{ color: "rgba(255,255,255,0.28)" }}>{preset.category}</div>
                          </div>
                          {isActive && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: pc, boxShadow: `0 0 6px ${pc}` }} />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── MATRIX TAB — all presets ── */}
              {qpTab === "matrix" && (
                <div className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight: "calc(88vh - 160px)", scrollbarWidth: "thin", scrollbarColor: `${activeColor}25 transparent` }}>
                  <div className="relative mb-2">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3" style={{ color: `${activeColor}55` }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                    <input type="text" value={qpSearch} onChange={e => setQpSearch(e.target.value)}
                      placeholder="بحث في المصفوفة..."
                      className="w-full pl-7 pr-3 py-1.5 text-[9px] font-mono rounded-xl outline-none"
                      style={{ background: "rgba(0,0,0,0.4)", border: `1px solid ${activeColor}${qpSearch ? "55" : "22"}`, color: "rgba(255,255,255,0.85)" }}
                      dir="rtl" />
                    {qpSearch && <button onClick={() => setQpSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>✕</button>}
                  </div>
                  {/* Category pills */}
                  <div className="flex gap-1 flex-wrap mb-2">
                    {(["general","security","uncensored","specialist"] as const).map(cat => {
                      const catColor = PERSONA_CAT_COLORS[cat] ?? "#a78bfa";
                      const count = PERSONA_PRESETS.filter(p => p.category === cat).length;
                      return (
                        <div key={cat} className="flex items-center gap-1 px-2 py-0.5 rounded-full"
                          style={{ background: `${catColor}15`, border: `1px solid ${catColor}30` }}>
                          <div className="w-1.5 h-1.5 rounded-full" style={{ background: catColor }} />
                          <span className="text-[7px] font-black font-mono uppercase" style={{ color: catColor }}>{cat} · {count}</span>
                        </div>
                      );
                    })}
                  </div>
                  {/* All presets */}
                  <div className="space-y-1">
                    {PERSONA_PRESETS.filter(p => !qpSearch || p.nameAr.includes(qpSearch) || p.category.includes(qpSearch)).map(preset => {
                      const pc = PERSONA_CAT_COLORS[preset.category] ?? "#a78bfa";
                      const isActive = preset.id === activePresetId;
                      const Icon = preset.icon;
                      return (
                        <motion.button key={preset.id}
                          onClick={() => { dispatch({ type: "SET_SETTINGS", patch: { activePersonaPreset: preset.id } } as Parameters<typeof dispatch>[0]); setShowPanel(false); }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left relative overflow-hidden"
                          style={{
                            background: isActive ? `${pc}14` : "rgba(255,255,255,0.02)",
                            border: `1px solid ${isActive ? pc+"40" : "rgba(255,255,255,0.05)"}`,
                          }}
                          whileHover={{ background: `${pc}0c`, borderColor: `${pc}28` }} whileTap={{ scale: 0.98 }}>
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                            style={{ background: `${pc}18`, border: `1px solid ${pc}30` }}>
                            {(Icon ? React.createElement(Icon, { className: "w-4 h-4", style: { color: `${pc}ee` } }) : null)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold" style={{ color: isActive ? pc : "rgba(255,255,255,0.72)" }}>{preset.nameAr}</div>
                            <div className="text-[8px] mt-0.5 line-clamp-1" style={{ color: "rgba(255,255,255,0.28)" }}>{preset.descAr?.slice(0,55) ?? "—"}…</div>
                          </div>
                          {isActive && <motion.div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ background: pc, boxShadow: `0 0 8px ${pc}` }} />}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── SYNC TAB ── */}
              {qpTab === "sync" && (
                <div className="p-4 space-y-3">
                  <div className="rounded-2xl p-3 text-center" style={{ background: `${activeColor}08`, border: `1px solid ${activeColor}20` }}>
                    <div className="text-2xl mb-1">⚡</div>
                    <div className="text-xs font-black text-white mb-0.5">مزامنة الشخصيات</div>
                    <div className="text-[9px]" style={{ color: "rgba(255,255,255,0.35)" }}>شخصيتك محفوظة محلياً في المتصفح</div>
                  </div>
                  {[
                    { icon: "📤", label: "تصدير الإعدادات", desc: "حفظ إعدادات الشخصية كملف JSON", action: () => { const data = JSON.stringify({ persona: activePresetId, settings: {} }, null, 2); const b = new Blob([data], {type: "application/json"}); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = "kaligpt-persona.json"; a.click(); URL.revokeObjectURL(u); } },
                    { icon: "🔄", label: "إعادة ضبط", desc: "العودة للشخصية الافتراضية", action: () => { dispatch({ type: "SET_SETTINGS", patch: { activePersonaPreset: "default" } } as Parameters<typeof dispatch>[0]); setShowPanel(false); } },
                  ].map(item => (
                    <motion.button key={item.label} onClick={item.action}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left"
                      style={{ background: "rgba(255,255,255,0.03)", border: `1px solid rgba(255,255,255,0.07)` }}
                      whileHover={{ background: `${activeColor}10`, borderColor: `${activeColor}28` }} whileTap={{ scale: 0.97 }}>
                      <span className="text-xl">{item.icon}</span>
                      <div>
                        <div className="text-[10px] font-bold" style={{ color: activeColor }}>{item.label}</div>
                        <div className="text-[8px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>{item.desc}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

              {/* ── CONFIG TAB ── */}
              {qpTab === "config" && (
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "إجمالي الشخصيات", value: PERSONA_PRESETS.length, color: activeColor },
                      { label: "فئات متاحة",       value: 4, color: "#a78bfa" },
                      { label: "أمنية",              value: PERSONA_PRESETS.filter(p=>p.category==="security").length, color: "#e21227" },
                      { label: "بلا قيود",           value: PERSONA_PRESETS.filter(p=>p.category==="uncensored").length, color: "#f59e0b" },
                    ].map(s => (
                      <div key={s.label} className="rounded-xl p-2.5 text-center"
                        style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="text-[18px] font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                        <div className="text-[7px] mt-0.5 uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.30)" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {onOpenPersonaManager && (
                    <motion.button onClick={() => { setShowPanel(false); onOpenPersonaManager!(); }}
                      className="w-full rounded-xl py-2.5 text-[10px] font-black tracking-wider flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg,rgba(226,18,39,0.18),rgba(226,18,39,0.08))", border: "1px solid rgba(226,18,39,0.35)", color: "#e21227" }}
                      whileHover={{ scale: 1.02, boxShadow: "0 0 24px rgba(226,18,39,0.25)" }} whileTap={{ scale: 0.97 }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                      </svg>
                      مدير الشخصيات الكامل
                    </motion.button>
                  )}
                </div>
              )}

              {/* Bottom stripe */}
              <div className="h-px" style={{ background: `linear-gradient(90deg,transparent,${activeColor}60,transparent)` }} />
            </motion.div>
        )}
      </AnimatePresence>, document.body)}
    </div>
  );
}
