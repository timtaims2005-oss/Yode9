import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, Clock, Network, Shield, AlertTriangle, BarChart3,
  DollarSign, Brain, Globe, Lock, Zap, Eye,
  Activity, Cpu, Radio, ChevronDown, ChevronUp,
  Layers, Target, TrendingUp,
} from "lucide-react";

export interface PanelDef {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string;
  glow: string;
  category: "system" | "security" | "network" | "intel" | "performance";
}

export const PANEL_DEFS: PanelDef[] = [
  // — SYSTEM —
  { id: "sysmon",    label: "Sys Monitor",      shortLabel: "SYS",    icon: Monitor,      color: "#10b981", glow: "rgba(16,185,129,0.35)",  category: "system"      },
  { id: "idle",      label: "Idle Tracker",      shortLabel: "IDLE",   icon: Clock,        color: "#f472b6", glow: "rgba(244,114,182,0.35)", category: "system"      },
  { id: "perf",      label: "Performance",       shortLabel: "PERF",   icon: BarChart3,    color: "#3b82f6", glow: "rgba(59,130,246,0.35)",  category: "performance" },
  { id: "cost",      label: "Cost Dashboard",    shortLabel: "COST",   icon: DollarSign,   color: "#f59e0b", glow: "rgba(245,158,11,0.35)",  category: "performance" },
  { id: "gpu",       label: "GPU / CPU Load",    shortLabel: "GPU",    icon: Cpu,          color: "#06b6d4", glow: "rgba(6,182,212,0.35)",   category: "performance" },
  // — SECURITY —
  { id: "threat",    label: "Threat Feed",       shortLabel: "THREAT", icon: AlertTriangle,color: "#e21227", glow: "rgba(226,18,39,0.35)",   category: "security"    },
  { id: "secDash",   label: "Security Dash",     shortLabel: "SEC",    icon: Shield,       color: "#8b5cf6", glow: "rgba(139,92,246,0.35)",  category: "security"    },
  { id: "cisa",      label: "CISA Live",         shortLabel: "CISA",   icon: Lock,         color: "#e21227", glow: "rgba(226,18,39,0.35)",   category: "security"    },
  { id: "anomaly",   label: "Anomaly Log",       shortLabel: "ANOM",   icon: Eye,          color: "#fb923c", glow: "rgba(251,146,60,0.35)",  category: "security"    },
  { id: "dedup",     label: "Dedup Visualizer",  shortLabel: "DEDUP",  icon: Layers,       color: "#22d3ee", glow: "rgba(34,211,238,0.35)",  category: "security"    },
  // — NETWORK —
  { id: "netTopo",   label: "Network Topology",  shortLabel: "NET",    icon: Network,      color: "#00e5ff", glow: "rgba(0,229,255,0.35)",   category: "network"     },
  { id: "threatMap", label: "Threat World Map",  shortLabel: "MAP",    icon: Globe,        color: "#e21227", glow: "rgba(226,18,39,0.35)",   category: "network"     },
  { id: "liveOps",   label: "Live Ops",          shortLabel: "OPS",    icon: Activity,     color: "#a3e635", glow: "rgba(163,230,53,0.35)",  category: "network"     },
  { id: "radio",     label: "Prefetch Intel",    shortLabel: "PFETCH", icon: Radio,        color: "#c084fc", glow: "rgba(192,132,252,0.35)", category: "network"     },
  // — INTEL —
  { id: "ctxMem",    label: "Context Memory",    shortLabel: "MEM",    icon: Brain,        color: "#f472b6", glow: "rgba(244,114,182,0.35)", category: "intel"       },
  { id: "threatIntel",label: "Threat Intel",     shortLabel: "INTEL",  icon: Target,       color: "#e21227", glow: "rgba(226,18,39,0.35)",   category: "intel"       },
  { id: "sysHUD",    label: "System HUD",        shortLabel: "HUD",    icon: Zap,          color: "#facc15", glow: "rgba(250,204,21,0.35)",  category: "intel"       },
  { id: "dbStats",   label: "Stream Metrics",    shortLabel: "STREAM", icon: TrendingUp,   color: "#34d399", glow: "rgba(52,211,153,0.35)",  category: "intel"       },
];

const CATEGORY_ORDER = ["system", "security", "network", "intel", "performance"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  system: "SYS", security: "SEC", network: "NET", intel: "INTEL", performance: "PERF",
};
const CATEGORY_COLORS: Record<string, string> = {
  system: "#10b981", security: "#e21227", network: "#00e5ff", intel: "#f472b6", performance: "#3b82f6",
};

interface ChatPanelBarProps {
  openPanels: Set<string>;
  onTogglePanel: (id: string) => void;
}

export function ChatPanelBar({ openPanels, onTogglePanel }: ChatPanelBarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const grouped = CATEGORY_ORDER.map(cat => ({
    cat,
    panels: PANEL_DEFS.filter(p => p.category === cat),
  }));

  const openCount = openPanels.size;

  return (
    <div ref={barRef} className="relative flex-shrink-0" style={{ zIndex: 40 }}>
      {/* ── Top accent glow line ─────────────────────────────────── */}
      <div className="absolute top-0 inset-x-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.5) 30%, rgba(0,229,255,0.4) 70%, transparent)" }} />

      {/* ── Main bar ──────────────────────────────────────────────── */}
      <div
        className="relative flex items-center gap-0 overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(6,8,16,0.96) 0%, rgba(4,6,12,0.98) 100%)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          minHeight: collapsed ? "28px" : "auto",
        }}
      >
        {/* Scan line animation */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
            style={{
              position: "absolute", top: 0, bottom: 0, width: "30%",
              background: "linear-gradient(90deg, transparent, rgba(226,18,39,0.04), rgba(0,229,255,0.03), transparent)",
            }}
          />
        </div>

        {/* LEFT: KaliGPT label + open count */}
        <div className="flex items-center gap-2 pl-3 pr-2 flex-shrink-0 border-r"
          style={{ borderColor: "rgba(255,255,255,0.06)", height: collapsed ? "28px" : "36px" }}>
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: "#e21227", boxShadow: "0 0 6px #e21227" }}
          />
          <span className="font-mono font-black text-[9px] tracking-[0.25em] whitespace-nowrap"
            style={{ color: "rgba(226,18,39,0.8)" }}>PANELS</span>
          {openCount > 0 && (
            <span className="font-mono text-[8px] font-bold px-1.5 rounded"
              style={{ background: "rgba(226,18,39,0.15)", color: "#e21227", border: "1px solid rgba(226,18,39,0.3)" }}>
              {openCount}
            </span>
          )}
        </div>

        {/* CENTER: panel buttons (collapsed if bar is folded) */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center flex-1 overflow-x-auto gap-px px-1 py-1"
              style={{ scrollbarWidth: "none" }}
            >
              {grouped.map(({ cat, panels }) => (
                <div key={cat} className="flex items-center gap-px">
                  {/* Category separator label */}
                  <button
                    onClick={() => setActiveCategory(v => v === cat ? null : cat)}
                    className="flex items-center gap-1 px-2 h-6 rounded text-[7px] font-black tracking-widest font-mono flex-shrink-0 transition-all"
                    style={{
                      color: CATEGORY_COLORS[cat],
                      background: activeCategory === cat ? `${CATEGORY_COLORS[cat]}18` : "transparent",
                      border: `1px solid ${activeCategory === cat ? `${CATEGORY_COLORS[cat]}30` : "transparent"}`,
                    }}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>

                  {/* Panel buttons in this category */}
                  {panels.map(panel => {
                    const Icon = panel.icon;
                    const isOpen = openPanels.has(panel.id);
                    return (
                      <motion.button
                        key={panel.id}
                        onClick={() => onTogglePanel(panel.id)}
                        whileHover={{ scale: 1.05, y: -1 }}
                        whileTap={{ scale: 0.95 }}
                        className="relative flex items-center gap-1.5 px-2 h-6 rounded-md transition-all flex-shrink-0"
                        style={{
                          background: isOpen
                            ? `linear-gradient(135deg, ${panel.color}22, ${panel.color}0a)`
                            : "rgba(255,255,255,0.03)",
                          border: `1px solid ${isOpen ? `${panel.color}50` : "rgba(255,255,255,0.07)"}`,
                          boxShadow: isOpen ? `0 0 10px ${panel.glow}, inset 0 0 8px ${panel.color}08` : "none",
                        }}
                        title={panel.label}
                      >
                        {/* Active indicator dot */}
                        {isOpen && (
                          <motion.div
                            className="absolute top-0.5 right-0.5 w-1 h-1 rounded-full"
                            animate={{ opacity: [1, 0.4, 1] }}
                            transition={{ duration: 1.2, repeat: Infinity }}
                            style={{ background: panel.color, boxShadow: `0 0 4px ${panel.color}` }}
                          />
                        )}
                        <Icon
                          style={{
                            width: "9px", height: "9px",
                            color: isOpen ? panel.color : "rgba(255,255,255,0.4)",
                            filter: isOpen ? `drop-shadow(0 0 4px ${panel.color})` : "none",
                            flexShrink: 0,
                          }}
                        />
                        <span
                          className="font-mono font-bold text-[7.5px] tracking-wide whitespace-nowrap"
                          style={{ color: isOpen ? panel.color : "rgba(255,255,255,0.35)" }}
                        >
                          {panel.shortLabel}
                        </span>
                      </motion.button>
                    );
                  })}

                  {/* Category divider */}
                  <div className="w-px h-4 mx-0.5 flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* RIGHT: collapse toggle */}
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex items-center justify-center w-7 h-full flex-shrink-0 border-l transition-all"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.25)",
          }}
          onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
          onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.25)")}
          title={collapsed ? "Show panels" : "Hide panel bar"}
        >
          {collapsed
            ? <ChevronDown style={{ width: "10px", height: "10px" }} />
            : <ChevronUp style={{ width: "10px", height: "10px" }} />}
        </button>
      </div>

      {/* ── Bottom accent line ───────────────────────────────────── */}
      <div className="absolute bottom-0 inset-x-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.15) 50%, transparent)" }} />
    </div>
  );
}
