import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * HoloNotification — Global holographic notification system
 * Drop-in replacement for browser alerts / simple toast
 * Usage: window.holoNotify({ message, type, title, duration })
 */

export type HoloType = "success" | "error" | "warning" | "info" | "threat";

export interface HoloNote {
  id: number;
  message: string;
  title?: string;
  type: HoloType;
  duration?: number;
}

const CFG: Record<HoloType, { color: string; icon: string; border: string }> = {
  success: { color: "#22c55e", icon: "✓", border: "rgba(34,197,94,0.3)" },
  error:   { color: "#e21227", icon: "✕", border: "rgba(226,18,39,0.3)" },
  warning: { color: "#fbbf24", icon: "⚠", border: "rgba(251,191,36,0.3)" },
  info:    { color: "#00e5ff", icon: "ℹ", border: "rgba(0,229,255,0.3)" },
  threat:  { color: "#e21227", icon: "⚡", border: "rgba(226,18,39,0.5)" },
};

let _addNote: ((n: Omit<HoloNote, "id">) => void) | null = null;
let _uid = 0;

/** Call from anywhere — no React context needed */
export function holoNotify(n: Omit<HoloNote, "id">) {
  _addNote?.(n);
}

/** Mount once in App root */
export function HoloNotificationProvider() {
  const [notes, setNotes] = useState<HoloNote[]>([]);

  const add = useCallback((n: Omit<HoloNote, "id">) => {
    const id = ++_uid;
    setNotes(prev => [...prev.slice(-4), { ...n, id }]);
    const dur = n.duration ?? (n.type === "threat" ? 6000 : n.type === "error" ? 5000 : 3500);
    setTimeout(() => setNotes(prev => prev.filter(x => x.id !== id)), dur);
  }, []);

  useEffect(() => { _addNote = add; return () => { _addNote = null; }; }, [add]);

  return (
    <div style={{ position: "fixed", bottom: 32, right: 12, zIndex: 99997, display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
      <AnimatePresence mode="popLayout">
        {notes.map(note => {
          const c = CFG[note.type];
          const isTheat = note.type === "threat";
          return (
            <motion.div
              key={note.id}
              layout
              initial={{ x: 120, opacity: 0, scale: 0.85 }}
              animate={{ x: 0, opacity: 1, scale: 1 }}
              exit={{ x: 120, opacity: 0, scale: 0.85 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              style={{
                background: "rgba(2,8,18,0.96)",
                border: `1px solid ${c.border}`,
                borderLeft: `3px solid ${c.color}`,
                borderRadius: 8,
                padding: "10px 14px",
                minWidth: 220, maxWidth: 320,
                backdropFilter: "blur(20px)",
                boxShadow: `0 0 24px ${c.color}18, 0 8px 32px rgba(0,0,0,0.6)`,
                display: "flex", gap: 10, alignItems: "flex-start",
                fontFamily: "monospace",
              }}
            >
              {/* Icon */}
              <motion.div
                animate={isTheat ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.5, repeat: isTheat ? Infinity : 0 }}
                style={{
                  width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                  background: `${c.color}22`, border: `1px solid ${c.color}66`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: c.color, fontSize: 11, fontWeight: 900,
                  boxShadow: `0 0 8px ${c.color}44`,
                }}
              >
                {c.icon}
              </motion.div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                {note.title && (
                  <div style={{ color: c.color, fontSize: 9, fontWeight: 700, letterSpacing: 1.5, marginBottom: 2 }}>
                    {note.title}
                  </div>
                )}
                <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, lineHeight: 1.4 }}>
                  {note.message}
                </div>
              </div>

              {/* Dismiss */}
              <button
                onClick={() => setNotes(p => p.filter(x => x.id !== note.id))}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.15)", cursor: "pointer", fontSize: 10, padding: 0, flexShrink: 0 }}
              >✕</button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
