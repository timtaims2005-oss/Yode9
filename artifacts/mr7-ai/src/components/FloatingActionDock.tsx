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

export function FloatingActionDock(props: DockHandlers) {
  const { state, dispatch } = useStore();
  const { t, rtl } = useT();
  const { toast } = useToast();
  const [collapsed, setCollapsed] = useState(false);
  const powerOn = state.settings.powerMode;

  function togglePower() {
    const next = !powerOn;
    dispatch({ type: "SET_SETTINGS", patch: { powerMode: next } });
    toast({ description: t(next ? "power.activated" : "power.deactivated") });
  }

  const items: { key: string; icon: typeof Plus; labelKey: Parameters<typeof t>[0]; onClick: () => void; accent?: string; style?: React.CSSProperties }[] = [
    { key: "new",        icon: Plus,           labelKey: "dock.newChat",   onClick: props.onNewChat,   accent: "text-primary" },
    { key: "agent",      icon: Bot,            labelKey: "dock.tools",     onClick: props.onAgent,     accent: "text-[#ff4d4d]", style: { color: "#ff4d4d" } },
    { key: "search",     icon: Search,         labelKey: "dock.search",    onClick: props.onSearch },
    { key: "memory",     icon: Brain,          labelKey: "dock.memory",    onClick: props.onMemory },
    { key: "bookmarks",  icon: Bookmark,       labelKey: "dock.bookmarks", onClick: props.onBookmarks },
    { key: "compare",    icon: ArrowLeftRight, labelKey: "dock.compare",   onClick: props.onCompare },
    { key: "tools",      icon: LayoutGrid,     labelKey: "dock.tools",     onClick: props.onTools, accent: "text-emerald-400" },
    { key: "settings",   icon: Settings,       labelKey: "dock.settings",  onClick: props.onSettings },
    { key: "help",       icon: HelpCircle,     labelKey: "dock.help",      onClick: props.onHelp },
  ];

  const sideClass = rtl ? "left-2" : "right-2";

  return (
    <div className={`fixed ${sideClass} top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-stretch gap-1.5 select-none`}>
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-9 h-7 rounded-lg bg-card/90 backdrop-blur-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent flex items-center justify-center transition-colors shadow-md"
        aria-label={collapsed ? t("dock.expand") : t("dock.collapse")}
        title={collapsed ? t("dock.expand") : t("dock.collapse")}
      >
        {collapsed
          ? (rtl ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />)
          : (rtl ? <ChevronLeft className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />)}
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, x: rtl ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: rtl ? -20 : 20 }}
            transition={{ duration: 0.16 }}
            className="flex flex-col items-stretch gap-1.5 bg-card/85 backdrop-blur-md border border-border rounded-2xl p-1.5 shadow-2xl"
          >
            <button
              onClick={togglePower}
              title={t(powerOn ? "power.tooltipOn" : "power.tooltipOff")}
              aria-label={t("power.title")}
              className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                powerOn
                  ? "bg-primary/20 border-primary/60 text-primary shadow-[0_0_15px_rgba(226,18,39,0.45)]"
                  : "bg-background/40 border-border text-muted-foreground hover:text-primary hover:border-primary/40"
              }`}
            >
              <Zap className={`w-4 h-4 ${powerOn ? "fill-current" : ""}`} />
              {powerOn && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary border border-card animate-pulse" />}
            </button>

            <div className="h-px bg-border my-0.5" />

            {items.map((it) => {
              const Icon = it.icon;
              return (
                <button
                  key={it.key}
                  onClick={it.onClick}
                  title={it.key === "agent" ? "KaliAgent — Autonomous AI Agent" : t(it.labelKey)}
                  aria-label={it.key === "agent" ? "KaliAgent" : t(it.labelKey)}
                  style={it.style}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center bg-background/40 border border-transparent hover:bg-accent hover:border-border transition-colors ${it.accent ?? "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="w-4 h-4" />
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
