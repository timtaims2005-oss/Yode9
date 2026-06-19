import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, TrendingUp, Zap, ChevronRight } from "lucide-react";
import { useStore } from "@/lib/store";

export function TokensPopover({ onUpgrade }: { onUpgrade: () => void }) {
  const { state } = useStore();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const sub = state.subscription;
  const TIER_LIMITS: Record<string, number> = {
    free: 10000,
    starter: 300000,
    professional: 1500000,
    elite: 3000000,
  };
  const totalTokens = TIER_LIMITS[sub.tier] || 10000;
  const usedTokens = sub.tokensUsed || 0;
  const remainingTokens = Math.max(0, totalTokens - usedTokens);
  const usedPct = Math.min(100, (usedTokens / totalTokens) * 100);
  const barColor = usedPct > 85 ? "#e21227" : usedPct > 60 ? "#f59e0b" : "#22c55e";

  const fmt = (n: number) => n >= 1000000 ? `${(n/1000000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}K` : `${n}`;

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
        className="relative flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
        style={{
          background: open
            ? "linear-gradient(135deg, rgba(251,191,36,0.18), rgba(0,0,0,0.90))"
            : "linear-gradient(135deg, rgba(251,191,36,0.08), rgba(0,0,0,0.80))",
          border: `1px solid rgba(251,191,36,${open ? 0.55 : 0.22})`,
          boxShadow: open
            ? "0 0 20px rgba(251,191,36,0.35), 0 0 40px rgba(251,191,36,0.12)"
            : "0 0 8px rgba(251,191,36,0.12)",
        }}
        whileHover={{ scale: 1.05, y: -0.5 }}
        whileTap={{ scale: 0.94 }}
        aria-label="الرموز المميّزة"
      >
        {/* Shimmer sweep */}
        <motion.span className="absolute inset-y-0 pointer-events-none"
          style={{ width: 36, background: "linear-gradient(90deg,transparent,rgba(251,191,36,0.18),transparent)" }}
          animate={{ x: ["-120%", "250%"] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }} />

        <motion.div
          animate={{ rotate: [0, 10, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 2 }}
        >
          <Coins className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#fbbf24", filter: "drop-shadow(0 0 4px rgba(251,191,36,0.7))" }} />
        </motion.div>
        <span className="text-[10px] font-black font-mono" style={{ color: "#fbbf24" }}>{fmt(remainingTokens)}</span>
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
              right: 150,
              top: 60,
              zIndex: 9999,
              width: 300,
              background: "linear-gradient(160deg, rgba(8,6,2,0.99) 0%, rgba(5,4,2,0.99) 100%)",
              border: "1px solid rgba(251,191,36,0.28)",
              borderRadius: 18,
              boxShadow: "0 0 80px rgba(251,191,36,0.12), 0 24px 80px rgba(0,0,0,0.94), inset 0 1px 0 rgba(251,191,36,0.10)",
              backdropFilter: "blur(40px)",
              overflow: "hidden",
            }}
          >
            {/* Top glow line */}
            <div className="h-px w-full" style={{ background: "linear-gradient(90deg,transparent,#fbbf24,rgba(255,200,50,0.5),transparent)" }} />

            {/* Corner brackets */}
            <span className="absolute top-2 left-2 w-3 h-3 border-t border-l pointer-events-none" style={{ borderColor: "rgba(251,191,36,0.55)" }} />
            <span className="absolute top-2 right-2 w-3 h-3 border-t border-r pointer-events-none" style={{ borderColor: "rgba(251,191,36,0.55)" }} />
            <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l pointer-events-none" style={{ borderColor: "rgba(251,191,36,0.25)" }} />
            <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r pointer-events-none" style={{ borderColor: "rgba(251,191,36,0.25)" }} />

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(251,191,36,0.18)", border: "1px solid rgba(251,191,36,0.40)" }}>
                  <Coins className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
                </div>
                <div>
                  <div className="text-[8px] font-black tracking-[0.4em] uppercase" style={{ color: "rgba(251,191,36,0.55)" }}>TOKEN USAGE</div>
                  <div className="text-[13px] font-black" style={{ color: "rgba(255,255,255,0.90)" }}>الرموز المميّزة</div>
                </div>
              </div>
              <motion.button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}
                whileHover={{ background: "rgba(251,191,36,0.12)", color: "#fbbf24" }}
                whileTap={{ scale: 0.92 }}
              >×</motion.button>
            </div>

            <div className="mx-4 h-px" style={{ background: "linear-gradient(90deg,transparent,rgba(251,191,36,0.22),transparent)" }} />

            {/* Main stats */}
            <div className="px-4 pt-3 pb-2 relative z-10">
              {/* Big remaining display */}
              <div className="text-center py-3 rounded-xl mb-3"
                style={{ background: "rgba(251,191,36,0.05)", border: "1px solid rgba(251,191,36,0.12)" }}>
                <div className="text-[9px] font-black tracking-[0.3em] uppercase mb-1" style={{ color: "rgba(251,191,36,0.45)" }}>المتبقي من الحصة</div>
                <motion.div
                  className="text-[28px] font-black font-mono leading-none"
                  style={{ color: barColor, textShadow: `0 0 20px ${barColor}60` }}
                  animate={{ textShadow: [`0 0 20px ${barColor}40`, `0 0 40px ${barColor}70`, `0 0 20px ${barColor}40`] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                >
                  {fmt(remainingTokens)}
                </motion.div>
                <div className="text-[9px] font-mono mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>
                  من أصل {fmt(totalTokens)}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[8px] font-bold tracking-wider uppercase" style={{ color: "rgba(255,255,255,0.28)" }}>نسبة الاستهلاك</span>
                  <span className="text-[9px] font-black font-mono" style={{ color: barColor }}>{usedPct.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: `linear-gradient(90deg,${barColor},${barColor}aa)`, boxShadow: `0 0 8px ${barColor}60` }}
                    initial={{ width: 0 }}
                    animate={{ width: `${usedPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: "المستخدم", value: fmt(usedTokens), icon: TrendingUp, color: "#f59e0b" },
                  { label: "خطة الاشتراك", value: sub.tier.toUpperCase(), icon: Zap, color: "#8b5cf6" },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="rounded-xl p-2.5 text-center"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Icon className="w-3 h-3 mx-auto mb-1" style={{ color }} />
                    <div className="text-[9px] uppercase tracking-wider mb-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>{label}</div>
                    <div className="text-[11px] font-black font-mono" style={{ color }}>{value}</div>
                  </div>
                ))}
              </div>

              {/* Upgrade button */}
              <motion.button
                onClick={() => { setOpen(false); onUpgrade(); }}
                className="w-full py-2.5 rounded-xl text-[11px] font-black tracking-wider uppercase flex items-center justify-center gap-2 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, rgba(217,70,239,0.15), rgba(139,92,246,0.15), rgba(99,102,241,0.15))",
                  border: "1px solid rgba(139,92,246,0.40)",
                  color: "#a78bfa",
                  boxShadow: "0 0 20px rgba(139,92,246,0.18)",
                }}
                whileHover={{ scale: 1.02, boxShadow: "0 0 30px rgba(139,92,246,0.30)" }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.span className="absolute inset-y-0 w-24 pointer-events-none"
                  style={{ background: "linear-gradient(90deg,transparent,rgba(167,139,250,0.15),transparent)" }}
                  animate={{ x: ["-150%", "400%"] }} transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }} />
                <Coins className="w-3.5 h-3.5" />
                احصل على المزيد من الرموز
                <ChevronRight className="w-3 h-3 ml-auto" />
              </motion.button>
            </div>

            <div className="h-px w-full" style={{ background: "linear-gradient(90deg,transparent,rgba(251,191,36,0.30),transparent)" }} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
