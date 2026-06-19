import { useRef, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface DraggableWindowProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  color?: string;
  width?: number;
  defaultPos?: { x: number; y: number };
  children: React.ReactNode;
  icon?: React.ReactNode;
  badge?: string;
  minWidth?: number;
  statusDot?: string;
}

export function DraggableWindow({
  open, onClose, title, subtitle, color = "#00e5ff",
  width = 520, defaultPos, children, icon, badge, statusDot,
}: DraggableWindowProps) {
  const [pos, setPos] = useState(defaultPos ?? { x: Math.max(40, (window.innerWidth - width) / 2), y: 64 });
  const [minimized, setMinimized] = useState(false);
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });
  const windowRef = useRef<HTMLDivElement>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pos.x, py: pos.y };

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      const nx = Math.max(0, Math.min(window.innerWidth - (windowRef.current?.offsetWidth ?? width), dragStart.current.px + dx));
      const ny = Math.max(0, Math.min(window.innerHeight - 60, dragStart.current.py + dy));
      if (windowRef.current) {
        windowRef.current.style.left = nx + "px";
        windowRef.current.style.top = ny + "px";
      }
    };

    const onUp = (ev: MouseEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      const dx = ev.clientX - dragStart.current.mx;
      const dy = ev.clientY - dragStart.current.my;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - (windowRef.current?.offsetWidth ?? width), dragStart.current.px + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 60, dragStart.current.py + dy)),
      });
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [pos, width]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={windowRef}
          initial={{ opacity: 0, scale: 0.88, y: -16, rotateX: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, scale: 0.90, y: -12, rotateX: 4 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: "fixed",
            left: pos.x, top: pos.y,
            width, maxHeight: "88vh",
            zIndex: 9990,
            background: "linear-gradient(160deg, rgba(4,2,12,0.99) 0%, rgba(2,1,8,0.99) 60%, rgba(6,2,14,0.99) 100%)",
            border: `1px solid ${color}42`,
            borderRadius: 20,
            boxShadow: `0 0 130px ${color}20, 0 0 55px ${color}0a, 0 36px 90px rgba(0,0,0,0.97), inset 0 1px 0 ${color}18`,
            backdropFilter: "blur(40px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Animated scan line */}
          <motion.div className="absolute inset-x-0 h-px pointer-events-none z-20"
            style={{ background: `linear-gradient(90deg,transparent,${color}70,transparent)` }}
            animate={{ top: ["0%","100%","0%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }} />

          {/* Corner brackets */}
          <span className="absolute top-2.5 left-2.5 w-5 h-5 border-t-2 border-l-2 pointer-events-none z-10" style={{ borderColor: `${color}75` }} />
          <span className="absolute top-2.5 right-2.5 w-5 h-5 border-t-2 border-r-2 pointer-events-none z-10" style={{ borderColor: `${color}75` }} />
          <span className="absolute bottom-2.5 left-2.5 w-5 h-5 border-b-2 border-l-2 pointer-events-none z-10" style={{ borderColor: `${color}38` }} />
          <span className="absolute bottom-2.5 right-2.5 w-5 h-5 border-b-2 border-r-2 pointer-events-none z-10" style={{ borderColor: `${color}38` }} />

          {/* Top accent */}
          <div className="h-[2px]" style={{ background: `linear-gradient(90deg,transparent,${color},rgba(255,255,255,0.2),${color},transparent)` }} />

          {/* Title bar — drag handle */}
          <div
            className="flex items-center justify-between px-4 py-3 cursor-move select-none"
            style={{ borderBottom: `1px solid ${color}14`, background: `${color}06` }}
            onMouseDown={onMouseDown}
          >
            <div className="flex items-center gap-3">
              {icon && (
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                  {icon}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black tracking-wide text-white">{title}</span>
                  {badge && (
                    <span className="text-[7px] font-black px-1.5 py-0.5 rounded font-mono"
                      style={{ background: `${color}18`, border: `1px solid ${color}35`, color }}>
                      {badge}
                    </span>
                  )}
                  {statusDot && (
                    <motion.div className="w-1.5 h-1.5 rounded-full"
                      style={{ background: statusDot, boxShadow: `0 0 6px ${statusDot}` }}
                      animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.2, repeat: Infinity }} />
                  )}
                </div>
                {subtitle && <div className="text-[8px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.30)" }}>{subtitle}</div>}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Minimize */}
              <motion.button
                onClick={() => setMinimized(m => !m)}
                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold cursor-pointer"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
                whileHover={{ background: `${color}18`, color }}>
                {minimized ? "□" : "—"}
              </motion.button>
              {/* Close */}
              <motion.button
                onClick={onClose}
                className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] cursor-pointer"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)" }}
                whileHover={{ background: "rgba(255,50,50,0.15)", color: "#ff4444", borderColor: "rgba(255,50,50,0.30)" }}>
                ✕
              </motion.button>
            </div>
          </div>

          {/* Content — collapses when minimized */}
          <AnimatePresence>
            {!minimized && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="overflow-hidden flex-1"
                style={{ overflowY: "auto", scrollbarWidth: "thin", scrollbarColor: `${color}25 transparent` }}>
                {children}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom stripe */}
          <div className="h-px" style={{ background: `linear-gradient(90deg,transparent,${color}55,transparent)` }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
