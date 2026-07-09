import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, AlertCircle, Info, CheckCircle, X, Trash2, Shield } from "lucide-react";
import { useStore } from "@/lib/store";

function timeAgo(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `${m}د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}س`;
  return `${Math.floor(h / 24)}ي`;
}

const NOTIF_COLORS: Record<string, string> = {
  info:    "#00e5ff",
  success: "#22c55e",
  warning: "#f59e0b",
  error:   "#e21227",
};
const NOTIF_ICONS: Record<string, typeof Info> = {
  info:    Info,
  success: CheckCircle,
  warning: AlertCircle,
  error:   AlertCircle,
};

export function NotificationsPanel() {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const unread = state.notifications.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    dispatch({ type: "MARK_NOTIFS_READ" });
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, dispatch]);

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
            ? "radial-gradient(circle at 40% 40%, rgba(226,18,39,0.22), rgba(0,0,0,0.92))"
            : "radial-gradient(circle at 40% 40%, rgba(226,18,39,0.08), rgba(0,0,0,0.80))",
          border: `1px solid rgba(226,18,39,${open ? 0.55 : 0.22})`,
          boxShadow: open
            ? "0 0 24px rgba(226,18,39,0.40), 0 0 48px rgba(226,18,39,0.14), inset 0 0 12px rgba(226,18,39,0.08)"
            : "0 0 10px rgba(226,18,39,0.15)",
        }}
        whileHover={{ scale: 1.08, y: -1 }}
        whileTap={{ scale: 0.92 }}
        aria-label="الإشعارات"
      >
        {/* Idle pulse ring */}
        <motion.span className="absolute inset-0 rounded-xl pointer-events-none"
          style={{ border: "1px solid rgba(226,18,39,0.18)", margin: "-4px" }}
          animate={{ opacity: [0.18, 0.45, 0.18], scale: [1, 1.06, 1] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }} />

        <motion.div
          animate={unread > 0 ? { rotate: [-8, 8, -6, 6, 0] } : {}}
          transition={{ duration: 0.5, repeat: unread > 0 ? Infinity : 0, repeatDelay: 3 }}
        >
          <Bell className="w-4 h-4" style={{ color: open ? "#e21227" : "rgba(255,255,255,0.60)", filter: open ? "drop-shadow(0 0 6px rgba(226,18,39,0.8))" : "none" }} />
        </motion.div>

        {/* Unread badge */}
        {unread > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
            className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[8px] font-black px-1"
            style={{ background: "linear-gradient(135deg, #e21227, #ff4455)", color: "#fff", boxShadow: "0 0 10px rgba(226,18,39,0.7), 0 0 20px rgba(226,18,39,0.3)" }}
          >
            {unread > 9 ? "9+" : unread}
          </motion.span>
        )}
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
              right: 60,
              top: 60,
              zIndex: 9999,
              width: 340,
              maxHeight: "80vh",
              background: "linear-gradient(160deg, rgba(8,4,12,0.99) 0%, rgba(4,2,8,0.99) 100%)",
              border: "1px solid rgba(226,18,39,0.28)",
              borderRadius: 18,
              boxShadow: "0 0 80px rgba(226,18,39,0.14), 0 0 40px rgba(226,18,39,0.06), 0 24px 80px rgba(0,0,0,0.94), inset 0 1px 0 rgba(226,18,39,0.12)",
              backdropFilter: "blur(40px)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Top glow line */}
            <div className="h-px w-full flex-shrink-0" style={{ background: "linear-gradient(90deg,transparent,#e21227,rgba(255,100,100,0.5),transparent)" }} />

            {/* Scan sweep */}
            <motion.div className="absolute inset-x-0 top-0 h-full pointer-events-none"
              style={{ background: "linear-gradient(180deg,rgba(226,18,39,0.04),transparent 30%)" }}
              animate={{ opacity: [0.7, 0.3, 0.7] }} transition={{ duration: 3, repeat: Infinity }} />

            {/* Corner brackets */}
            <span className="absolute top-2 left-2 w-3 h-3 border-t border-l pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.55)" }} />
            <span className="absolute top-2 right-2 w-3 h-3 border-t border-r pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.55)" }} />
            <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.25)" }} />
            <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r pointer-events-none" style={{ borderColor: "rgba(226,18,39,0.25)" }} />

            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0 relative z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.35)" }}>
                  <Shield className="w-3.5 h-3.5" style={{ color: "#e21227" }} />
                </div>
                <div>
                  <div className="text-[8px] font-black tracking-[0.4em] uppercase" style={{ color: "rgba(226,18,39,0.5)" }}>INTEL FEED</div>
                  <div className="text-[13px] font-black" style={{ color: "rgba(255,255,255,0.90)" }}>
                    الإشعارات
                    {state.notifications.length > 0 && (
                      <span className="ml-2 text-[9px] font-mono" style={{ color: "rgba(255,255,255,0.3)" }}>
                        {state.notifications.length} إجمالي
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {state.notifications.length > 0 && (
                  <motion.button
                    onClick={() => dispatch({ type: "CLEAR_NOTIFICATIONS" })}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.30)" }}
                    whileHover={{ background: "rgba(226,18,39,0.12)", color: "#e21227", borderColor: "rgba(226,18,39,0.35)" }}
                    whileTap={{ scale: 0.92 }}
                    title="مسح الكل"
                  >
                    <Trash2 className="w-3 h-3" />
                  </motion.button>
                )}
                <motion.button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[13px] font-bold"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.35)" }}
                  whileHover={{ background: "rgba(226,18,39,0.12)", color: "#e21227" }}
                  whileTap={{ scale: 0.92 }}
                >×</motion.button>
              </div>
            </div>

            <div className="mx-4 h-px flex-shrink-0" style={{ background: "linear-gradient(90deg,transparent,rgba(226,18,39,0.25),transparent)" }} />

            {/* Notification list */}
            <div className="overflow-y-auto flex-1 relative z-10" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(226,18,39,0.3) transparent" }}>
              {state.notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <Bell className="w-5 h-5" style={{ color: "rgba(255,255,255,0.18)" }} />
                  </div>
                  <p className="text-[11px] font-mono" style={{ color: "rgba(255,255,255,0.22)" }}>لا توجد إشعارات</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {state.notifications.map((n, i) => {
                    const type = (n as any).type || "info";
                    const color = NOTIF_COLORS[type] || "#00e5ff";
                    const Icon = NOTIF_ICONS[type] || Info;
                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-start gap-2.5 p-2.5 rounded-xl relative overflow-hidden"
                        style={{
                          background: n.read ? "rgba(255,255,255,0.025)" : `${color}0d`,
                          border: `1px solid ${n.read ? "rgba(255,255,255,0.05)" : color + "28"}`,
                        }}
                      >
                        {!n.read && (
                          <motion.div className="absolute inset-x-0 top-0 h-px pointer-events-none"
                            style={{ background: `linear-gradient(90deg,transparent,${color},transparent)` }}
                            animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} />
                        )}
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
                          <Icon className="w-3 h-3" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-bold leading-tight" style={{ color: "rgba(255,255,255,0.88)" }}>{n.title}</div>
                          <div className="text-[10px] mt-0.5 leading-snug" style={{ color: "rgba(255,255,255,0.40)" }}>{n.body}</div>
                          <div className="text-[8px] font-mono mt-1" style={{ color: "rgba(255,255,255,0.22)" }}>{timeAgo(n.ts)}</div>
                        </div>
                        {!n.read && (
                          <motion.span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1.5"
                            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
                            animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="h-px w-full flex-shrink-0" style={{ background: "linear-gradient(90deg,transparent,rgba(226,18,39,0.35),transparent)" }} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
