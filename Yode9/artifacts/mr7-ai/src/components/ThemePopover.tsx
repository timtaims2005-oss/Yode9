import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Palette, Check } from "lucide-react";
import { useStore, ACCENT_OPTIONS } from "@/lib/store";

export function ThemePopover() {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const activeAccent = ACCENT_OPTIONS.find(a => a.id === state.themeAccent) || ACCENT_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <>
      {/* Trigger button */}
      <motion.button
        ref={btnRef}
        onClick={() => setOpen(o => !o)}
        className="relative flex-shrink-0 flex items-center justify-center rounded-xl"
        style={{
          width: 40, height: 40,
          background: open
            ? "radial-gradient(circle at 40% 40%, rgba(139,92,246,0.22), rgba(0,0,0,0.92))"
            : "radial-gradient(circle at 40% 40%, rgba(139,92,246,0.08), rgba(0,0,0,0.80))",
          border: `1px solid rgba(139,92,246,${open ? 0.55 : 0.22})`,
          boxShadow: open
            ? "0 0 24px rgba(139,92,246,0.40), 0 0 48px rgba(139,92,246,0.14), inset 0 0 12px rgba(139,92,246,0.08)"
            : "0 0 10px rgba(139,92,246,0.15)",
        }}
        whileHover={{ scale: 1.08, y: -1 }}
        whileTap={{ scale: 0.92 }}
        aria-label="اللون المميّز"
      >
        {/* Idle pulse ring */}
        <motion.span className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ border: "1px solid rgba(139,92,246,0.18)", margin: "-4px" }}
          animate={{ opacity: [0.18, 0.45, 0.18], scale: [1, 1.06, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }} />

        <Palette className="w-4 h-4" style={{ color: open ? "#a78bfa" : "rgba(255,255,255,0.55)", filter: open ? "drop-shadow(0 0 6px rgba(139,92,246,0.8))" : "none" }} />
      </motion.button>

      {/* External floating panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            initial={{ opacity: 0, y: -12, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "fixed",
              right: 104,
              top: 60,
              zIndex: 9999,
              width: 300,
              background: "linear-gradient(160deg, rgba(6,4,16,0.99) 0%, rgba(4,2,12,0.99) 100%)",
              border: "1px solid rgba(139,92,246,0.30)",
              borderRadius: 18,
              boxShadow: "0 0 80px rgba(139,92,246,0.18), 0 24px 80px rgba(0,0,0,0.94), inset 0 1px 0 rgba(167,139,250,0.12)",
              backdropFilter: "blur(40px)",
              overflow: "hidden",
            }}
          >
            {/* Top glow line */}
            <div className="h-px w-full" style={{ background: "linear-gradient(90deg,transparent,#8b5cf6,#c084fc,transparent)" }} />

            {/* Scan sweep */}
            <motion.div className="absolute inset-x-0 top-0 h-full pointer-events-none"
              style={{ background: "linear-gradient(180deg,rgba(139,92,246,0.05),transparent 30%)" }}
              animate={{ opacity: [0.6, 0.25, 0.6] }} transition={{ duration: 3.5, repeat: Infinity }} />

            {/* Corner brackets */}
            <span className="absolute top-2 left-2 w-3 h-3 border-t border-l pointer-events-none" style={{ borderColor: "rgba(139,92,246,0.55)" }} />
            <span className="absolute top-2 right-2 w-3 h-3 border-t border-r pointer-events-none" style={{ borderColor: "rgba(139,92,246,0.55)" }} />
            <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l pointer-events-none" style={{ borderColor: "rgba(139,92,246,0.25)" }} />
            <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r pointer-events-none" style={{ borderColor: "rgba(139,92,246,0.25)" }} />

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(139,92,246,0.18)", border: "1px solid rgba(139,92,246,0.40)" }}>
                  <Palette className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
                </div>
                <div>
                  <div className="text-[8px] font-black tracking-[0.4em] uppercase" style={{ color: "rgba(139,92,246,0.60)" }}>VISUAL THEME</div>
                  <div className="text-[13px] font-black" style={{ color: "rgba(255,255,255,0.90)" }}>لون النظام</div>
                </div>
              </div>
              <motion.button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}
                whileHover={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}
                whileTap={{ scale: 0.92 }}
              >×</motion.button>
            </div>

            <div className="mx-4 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.25),transparent)" }} />

            {/* Active accent display */}
            <div className="px-4 pt-3 pb-2 relative z-10">
              <div className="text-[8px] font-black tracking-[0.3em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.22)" }}>اللون النشط</div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <span className={`w-6 h-6 rounded-lg ${activeAccent.swatch}`} style={{ boxShadow: "0 0 12px rgba(255,255,255,0.2)" }} />
                <span className="text-[12px] font-black capitalize" style={{ color: "rgba(255,255,255,0.80)" }}>{activeAccent.label}</span>
                <motion.span className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{ background: "#a78bfa", boxShadow: "0 0 6px #8b5cf6" }}
                  animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
              </div>
            </div>

            {/* Color grid */}
            <div className="px-4 pb-4 relative z-10">
              <div className="text-[8px] font-black tracking-[0.3em] uppercase mb-2.5" style={{ color: "rgba(255,255,255,0.18)" }}>اختر لوناً</div>
              <div className="grid grid-cols-5 gap-2">
                {ACCENT_OPTIONS.map((a, i) => {
                  const isActive = state.themeAccent === a.id;
                  return (
                    <motion.button
                      key={a.id}
                      onClick={() => { dispatch({ type: "SET_ACCENT", accent: a.id }); }}
                      className="relative aspect-square rounded-xl overflow-hidden"
                      style={{
                        border: isActive ? "2px solid rgba(255,255,255,0.6)" : "1px solid rgba(255,255,255,0.08)",
                        boxShadow: isActive ? "0 0 16px rgba(255,255,255,0.25), inset 0 0 10px rgba(255,255,255,0.08)" : "none",
                      }}
                      whileHover={{ scale: 1.08, borderColor: "rgba(255,255,255,0.35)" }}
                      whileTap={{ scale: 0.92 }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.03 }}
                      title={a.label}
                      aria-label={a.label}
                    >
                      <span className={`absolute inset-1 rounded-lg ${a.swatch}`} />
                      {isActive && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                            <Check className="w-3.5 h-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                          </motion.div>
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="h-px w-full" style={{ background: "linear-gradient(90deg,transparent,rgba(139,92,246,0.35),transparent)" }} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
