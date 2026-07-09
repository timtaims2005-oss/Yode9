import { useState } from "react";
import { Plus, Search, Brain, Bookmark, ArrowLeftRight, LayoutGrid, Settings, HelpCircle, Zap, ChevronRight, ChevronLeft, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { useToast } from "@/hooks/use-toast";

export type DockHandlers = {
  onNewChat: () => void;
  onSearch: () => void;
  onMemory: () => void;
  onBookmarks: () => void;
  onCompare: () => void;
  onTools: () => void;
  onSettings: () => void;
  onHelp: () => void;
  onAgent: () => void;
};

const ITEM_COLORS: Record<string, string> = {
  new:       "#e21227",
  agent:     "#ff4d4d",
  search:    "#3b82f6",
  memory:    "#a78bfa",
  bookmarks: "#f59e0b",
  compare:   "#22c55e",
  tools:     "#10b981",
  settings:  "#64748b",
  help:      "#06b6d4",
};

const ITEM_META: Record<string, { desc: string; shortcut?: string }> = {
  new:       { desc: "محادثة جديدة",     shortcut: "Ctrl+N" },
  agent:     { desc: "KaliAgent المستقل", shortcut: undefined },
  search:    { desc: "بحث في المحادثات",  shortcut: "Ctrl+F" },
  memory:    { desc: "ذاكرة الذكاء",      shortcut: "Ctrl+Shift+M" },
  bookmarks: { desc: "المفضلة",           shortcut: "Ctrl+Shift+B" },
  compare:   { desc: "مقارنة النماذج",    shortcut: "Ctrl+Shift+C" },
  tools:     { desc: "مركز الأدوات",      shortcut: "Ctrl+Shift+T" },
  settings:  { desc: "الإعدادات",         shortcut: undefined },
  help:      { desc: "اختصارات لوحة المفاتيح", shortcut: "?" },
};

function DockTooltip3D({ label, desc, shortcut, color, side }: {
  label: string; desc: string; shortcut?: string; color: string; side: "left" | "right";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === "left" ? 8 : -8, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: side === "left" ? 8 : -8, scale: 0.88 }}
      transition={{ duration: 0.13 }}
      style={{
        position: "absolute",
        [side]: "calc(100% + 8px)",
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 999,
        pointerEvents: "none",
        minWidth: 130,
      }}
    >
      {/* Glassmorphism card */}
      <div style={{
        background: "linear-gradient(135deg, rgba(8,8,16,0.97) 0%, rgba(14,14,24,0.97) 100%)",
        border: `1px solid ${color}35`,
        borderRadius: 10,
        padding: "7px 10px",
        backdropFilter: "blur(24px)",
        boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 20px ${color}18, inset 0 1px 0 rgba(255,255,255,0.05)`,
        position: "relative",
        overflow: "hidden",
      }}>
        {/* top glow line */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "1px",
          background: `linear-gradient(90deg, transparent, ${color}60, transparent)`,
        }} />
        {/* dot indicator */}
        <div style={{
          position: "absolute", top: 6, right: 6,
          width: 5, height: 5, borderRadius: "50%",
          background: color,
          boxShadow: `0 0 6px ${color}`,
          animation: "none",
        }} />
        <div style={{ color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: 800, marginBottom: 2, letterSpacing: "0.03em" }}>
          {label}
        </div>
        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, lineHeight: 1.4 }}>{desc}</div>
        {shortcut && (
          <div style={{
            marginTop: 5, display: "inline-flex", alignItems: "center", gap: 3,
            background: `${color}12`, border: `1px solid ${color}25`,
            borderRadius: 5, padding: "2px 6px",
          }}>
            <span style={{ color, fontSize: 8, fontFamily: "monospace", fontWeight: 700 }}>{shortcut}</span>
          </div>
        )}
        {/* corner accent */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "1px",
          background: `linear-gradient(90deg, transparent, ${color}25, transparent)`,
        }} />
      </div>
      {/* Pointer arrow */}
      <div style={{
        position: "absolute",
        top: "50%",
        [side === "left" ? "right" : "left"]: -5,
        transform: "translateY(-50%)",
        width: 0, height: 0,
        borderTop: "5px solid transparent",
        borderBottom: "5px solid transparent",
        [side === "left" ? "borderLeft" : "borderRight"]: `5px solid ${color}35`,
      }} />
    </motion.div>
  );
}

export function FloatingActionDock(props: DockHandlers) {
  const { state, dispatch } = useStore();
  const { t, rtl } = useT();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const powerOn = state.settings.powerMode;

  function togglePower() {
    const next = !powerOn;
    dispatch({ type: "SET_SETTINGS", patch: { powerMode: next } });
    toast({ description: t(next ? "power.activated" : "power.deactivated") });
  }

  const items: { key: string; icon: typeof Plus; labelKey: Parameters<typeof t>[0]; onClick: () => void }[] = [
    { key: "new",        icon: Plus,           labelKey: "dock.newChat",   onClick: props.onNewChat   },
    { key: "agent",      icon: Bot,            labelKey: "dock.tools",     onClick: props.onAgent     },
    { key: "search",     icon: Search,         labelKey: "dock.search",    onClick: props.onSearch    },
    { key: "memory",     icon: Brain,          labelKey: "dock.memory",    onClick: props.onMemory    },
    { key: "bookmarks",  icon: Bookmark,       labelKey: "dock.bookmarks", onClick: props.onBookmarks },
    { key: "compare",    icon: ArrowLeftRight, labelKey: "dock.compare",   onClick: props.onCompare   },
    { key: "tools",      icon: LayoutGrid,     labelKey: "dock.tools",     onClick: props.onTools     },
    { key: "settings",   icon: Settings,       labelKey: "dock.settings",  onClick: props.onSettings  },
    { key: "help",       icon: HelpCircle,     labelKey: "dock.help",      onClick: props.onHelp      },
  ];

  const sideClass = rtl ? "left-2" : "right-2";

  return (
    <div className={`fixed ${sideClass} top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-stretch gap-1.5 select-none`}>
      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(v => !v)}
        aria-label={collapsed ? t("dock.expand") : t("dock.collapse")}
        title={collapsed ? t("dock.expand") : t("dock.collapse")}
        style={{
          width: "36px", height: "28px", borderRadius: "8px",
          background: "rgba(10,10,18,0.9)",
          border: "1px solid rgba(255,255,255,0.08)",
          backdropFilter: "blur(16px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          color: "rgba(255,255,255,0.3)",
          transition: "all 0.2s ease",
        }}
      >
        {collapsed
          ? (rtl ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />)
          : (rtl ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: rtl ? -20 : 20, scale: 0.92 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: rtl ? -20 : 20, scale: 0.92 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "stretch",
              gap: "5px",
              background: "linear-gradient(180deg, rgba(8,8,16,0.97) 0%, rgba(10,10,20,0.97) 100%)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: "16px",
              padding: "8px 6px",
              backdropFilter: "blur(24px)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(226,18,39,0.06), 0 0 32px rgba(226,18,39,0.03)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top scan line accent */}
            <div style={{
              position: "absolute", top: 0, left: 0, right: 0, height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.5) 50%, transparent)",
              pointerEvents: "none",
            }} />

            {/* Power button */}
            <div style={{ position: "relative" }}>
              {powerOn && (
                <>
                  {[1, 2].map(i => (
                    <motion.div
                      key={i}
                      animate={{ scale: [1, 1.8 + i * 0.4], opacity: [0.5, 0] }}
                      transition={{ duration: 1.5 + i * 0.3, repeat: Infinity, ease: "easeOut", delay: i * 0.4 }}
                      style={{
                        position: "absolute", inset: 0, borderRadius: "12px",
                        border: "1px solid rgba(226,18,39,0.5)",
                        pointerEvents: "none",
                      }}
                    />
                  ))}
                </>
              )}
              <button
                onClick={togglePower}
                title={t(powerOn ? "power.tooltipOn" : "power.tooltipOff")}
                aria-label={t("power.title")}
                style={{
                  position: "relative",
                  width: "36px", height: "36px", borderRadius: "12px",
                  border: powerOn ? "1px solid rgba(226,18,39,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  background: powerOn
                    ? "linear-gradient(135deg, rgba(226,18,39,0.2), rgba(160,10,26,0.12))"
                    : "rgba(255,255,255,0.03)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  boxShadow: powerOn ? "0 0 20px rgba(226,18,39,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" : "none",
                  transition: "all 0.3s ease",
                  color: powerOn ? "#e21227" : "rgba(255,255,255,0.3)",
                }}
              >
                <Zap className={`w-4 h-4 ${powerOn ? "fill-current" : ""}`} />
                {powerOn && (
                  <span style={{
                    position: "absolute", top: "-2px", right: "-2px",
                    width: "7px", height: "7px", borderRadius: "50%",
                    background: "#e21227", border: "1.5px solid rgba(8,8,16,0.9)",
                    boxShadow: "0 0 6px #e21227",
                    animation: "neonFlicker 2s ease-in-out infinite",
                  }} />
                )}
              </button>
            </div>

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "2px 0" }} />

            {/* Action items */}
            {items.map((it) => {
              const Icon = it.icon;
              const color = ITEM_COLORS[it.key] ?? "rgba(255,255,255,0.3)";
              const isHovered = hovered === it.key;
              const meta = ITEM_META[it.key];
              const label = it.key === "agent" ? "KaliAgent" : t(it.labelKey);
              const tooltipSide = rtl ? "right" : "left";

              return (
                <div key={it.key} style={{ position: "relative" }}>
                  <motion.button
                    onClick={it.onClick}
                    onMouseEnter={() => setHovered(it.key)}
                    onMouseLeave={() => setHovered(null)}
                    aria-label={label}
                    whileHover={{ scale: 1.08 }}
                    whileTap={{ scale: 0.92 }}
                    style={{
                      width: "36px", height: "36px", borderRadius: "11px",
                      border: isHovered ? `1px solid ${color}35` : "1px solid transparent",
                      background: isHovered
                        ? `linear-gradient(135deg, ${color}14, ${color}08)`
                        : "rgba(255,255,255,0.02)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: "pointer",
                      color: isHovered ? color : "rgba(255,255,255,0.3)",
                      boxShadow: isHovered ? `0 0 16px ${color}25, inset 0 1px 0 rgba(255,255,255,0.06)` : "none",
                      transition: "color 0.2s ease, background 0.2s ease, border 0.2s ease, box-shadow 0.2s ease",
                      position: "relative",
                      overflow: "hidden",
                    }}
                  >
                    {/* Shimmer on hover */}
                    {isHovered && (
                      <motion.div
                        initial={{ x: "-100%", opacity: 0 }}
                        animate={{ x: "200%", opacity: [0, 0.3, 0] }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                        style={{
                          position: "absolute", top: 0, left: 0,
                          width: "50%", height: "100%",
                          background: `linear-gradient(90deg, transparent, ${color}20, transparent)`,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    <Icon style={{ width: "16px", height: "16px" }} />
                  </motion.button>
                  {/* 3D Glassmorphism Tooltip */}
                  <AnimatePresence>
                    {isHovered && meta && (
                      <DockTooltip3D
                        label={label}
                        desc={meta.desc}
                        shortcut={meta.shortcut}
                        color={color}
                        side={tooltipSide}
                      />
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Bottom scan line accent */}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.2) 50%, transparent)",
              pointerEvents: "none",
            }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
