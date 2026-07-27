import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  iconColor?: string;
  children: React.ReactNode;
  headerRight?: React.ReactNode;
  zIndex?: number;
}

export function ModalShell({
  open,
  onClose,
  title,
  subtitle,
  icon,
  iconColor = "#e21227",
  children,
  headerRight,
  zIndex = 50,
}: ModalShellProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence mode="wait">
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="modal-shell-backdrop"
            className="fixed inset-0"
            style={{ zIndex: zIndex - 1, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Floating Modal */}
          <motion.div
            key="modal-shell"
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex }}
          >
            <motion.div
              className="relative flex flex-col overflow-hidden pointer-events-auto"
              style={{
                width: "clamp(340px, 40vw, 560px)",
                maxHeight: "88dvh",
                borderRadius: "18px",
                backdropFilter: "blur(40px)",
                background: "linear-gradient(160deg, rgba(8,2,16,0.97) 0%, rgba(4,1,10,0.97) 100%)",
                border: `1px solid ${iconColor}30`,
                boxShadow: `0 0 80px ${iconColor}14, 0 24px 64px rgba(0,0,0,0.95)`,
              }}
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Top accent line */}
              <div
                className="absolute inset-x-0 top-0 h-px pointer-events-none z-10"
                style={{ background: `linear-gradient(90deg, transparent, ${iconColor}, rgba(255,255,255,0.3), ${iconColor}, transparent)` }}
              />

              {/* ── Header ── */}
              <div
                className="flex items-center justify-between border-b shrink-0"
                style={{ padding: "12px 16px 10px", borderColor: "#1a1a1a" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
                    style={{
                      background: `${iconColor}18`,
                      borderColor: `${iconColor}30`,
                    }}
                  >
                    {icon}
                  </div>
                  <div>
                    <h2 className="text-[15px] font-black text-foreground">{title}</h2>
                    {subtitle && (
                      <p className="text-[10px] text-muted-foreground font-mono">{subtitle}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {headerRight}
                  <button
                    onClick={onClose}
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#1f1f1f] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ── Content ── */}
              <div className="flex-1 overflow-y-auto">
                {children}
              </div>

              {/* Bottom glow */}
              <div
                className="absolute inset-x-0 bottom-0 h-px pointer-events-none"
                style={{ background: `linear-gradient(90deg, transparent, ${iconColor}60, transparent)` }}
              />
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

interface ModalShellSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalShellSection({ children, className = "" }: ModalShellSectionProps) {
  return (
    <div className={`p-4 space-y-3 ${className}`}>
      {children}
    </div>
  );
}
