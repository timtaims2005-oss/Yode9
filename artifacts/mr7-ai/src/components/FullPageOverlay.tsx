import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface FullPageOverlayProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  color?: string;
  icon?: React.ReactNode;
}

export function FullPageOverlay({
  open, onClose, children, className = "",
  title = "WINDOW", subtitle, color = "#e21227", icon,
}: FullPageOverlayProps) {
  const hexColor = color.startsWith("#") ? color : "#e21227";

  // Escape key
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="fpo-backdrop"
            className="fixed inset-0"
            style={{ zIndex: 9988, background: "rgba(0,0,0,0.80)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={onClose}
          />

          {/* Floating Modal */}
          <motion.div
            key="fpo-modal"
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 9990 }}
          >
            <motion.div
              className={`relative flex flex-col overflow-hidden pointer-events-auto ${className}`}
              style={{
                width: "clamp(340px, 40vw, 560px)",
                maxHeight: "88dvh",
                borderRadius: "18px",
                backdropFilter: "blur(40px)",
                background: "linear-gradient(160deg, rgba(8,2,16,0.97) 0%, rgba(4,1,10,0.97) 100%)",
                border: `1px solid ${hexColor}30`,
                boxShadow: `0 0 80px ${hexColor}14, 0 24px 64px rgba(0,0,0,0.95)`,
              }}
              initial={{ opacity: 0, scale: 0.95, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 18 }}
              transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Top accent line */}
              <div className="absolute inset-x-0 top-0 h-[2px] pointer-events-none z-10"
                style={{ background: `linear-gradient(90deg,transparent,${hexColor},rgba(255,255,255,0.35),${hexColor},transparent)` }} />

              {/* Bottom scan line */}
              <div className="absolute inset-x-0 bottom-0 h-px pointer-events-none z-10"
                style={{ background: `linear-gradient(90deg,transparent,${hexColor}60,transparent)` }} />

              {/* Close button — top right */}
              <button
                onClick={onClose}
                className="absolute top-3 right-3 z-50 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#1f1f1f] text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Modal content */}
              <div className="relative flex flex-col flex-1 overflow-hidden z-10">
                {children}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
