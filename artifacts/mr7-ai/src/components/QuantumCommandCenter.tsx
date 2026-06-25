import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HyperDimension4D } from "./HyperDimension4D";
import { QuantumThreatOracle } from "./QuantumThreatOracle";
import { NeuralVoiceCommander } from "./NeuralVoiceCommander";
import { HoloTimeline4D } from "./HoloTimeline4D";
import { AIBattleStation } from "./AIBattleStation";
import { SystemNexus4D } from "./SystemNexus4D";
import { CyberMatrix4D } from "./CyberMatrix4D";

type Panel = "threats" | "voice" | "timeline" | "battle" | "nexus" | "hyper";

interface PanelConfig {
  id: Panel;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const PANELS: PanelConfig[] = [
  { id:"threats",  label:"Quantum Threats",  icon:"◈", color:"#e21227", description:"AI-powered threat prediction" },
  { id:"voice",    label:"Neural Voice",     icon:"◉", color:"#00e5ff", description:"Voice command interface" },
  { id:"timeline", label:"4D Timeline",      icon:"▣", color:"#a78bfa", description:"Holographic event timeline" },
  { id:"battle",   label:"AI Battle",        icon:"⚔", color:"#f59e0b", description:"Multi-model comparison" },
  { id:"nexus",    label:"System Nexus",     icon:"⬡", color:"#10b981", description:"4D system monitoring" },
  { id:"hyper",    label:"Hyperdimension",   icon:"⬟", color:"#ff7800", description:"4D visualization" },
];

const LIVE_STATS = [
  { label: "THREATS/SEC", getValue: () => (Math.random() * 20 + 5).toFixed(1), color: "#e21227" },
  { label: "AI OPS/SEC",  getValue: () => Math.floor(Math.random() * 50000 + 10000).toLocaleString(), color: "#00e5ff" },
  { label: "NODES LIVE",  getValue: () => Math.floor(Math.random() * 50 + 200).toString(), color: "#10b981" },
  { label: "UPTIME",      getValue: () => "99.97%", color: "#a78bfa" },
];

export function QuantumCommandCenter() {
  const [activePanel, setActivePanel] = useState<Panel>("threats");
  const [stats, setStats] = useState<string[]>(LIVE_STATS.map(s => s.getValue()));
  const [collapsed, setCollapsed] = useState(false);
  const [glitching, setGlitching] = useState(false);
  const tickRef = useRef(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setStats(LIVE_STATS.map(s => s.getValue()));
      tickRef.current++;
      if (tickRef.current % 15 === 0) {
        setGlitching(true);
        setTimeout(() => setGlitching(false), 200);
      }
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  const renderPanel = useCallback(() => {
    switch (activePanel) {
      case "threats":  return <QuantumThreatOracle />;
      case "voice":    return <NeuralVoiceCommander />;
      case "timeline": return <HoloTimeline4D />;
      case "battle":   return <AIBattleStation />;
      case "nexus":    return <SystemNexus4D />;
      case "hyper":    return (
        <div className="rounded-xl border border-orange-900/40 bg-black/70 backdrop-blur-md p-6 flex flex-col items-center gap-4">
          <div className="text-xs font-bold tracking-[0.15em] text-orange-400">HYPERDIMENSION 4D ENGINE</div>
          <HyperDimension4D size={320} accentColor="#ff7800" secondaryColor="#e21227" speed={0.6} />
          <div className="text-center">
            <div className="text-[11px] text-gray-400 font-mono">TRUE 4D TESSERACT PROJECTION</div>
            <div className="text-[10px] text-gray-600 font-mono mt-1">6-plane rotation • Real 4D mathematics • GPU accelerated</div>
          </div>
          <div className="grid grid-cols-3 gap-3 w-full text-center">
            {[["DIMENSIONS","4D → 2D"],["ROTATION PLANES","6"],["VERTICES","16"]].map(([l,v]) => (
              <div key={l} className="rounded-lg border border-orange-900/20 p-2">
                <div className="text-sm font-bold font-mono text-orange-400">{v}</div>
                <div className="text-[9px] text-gray-500 font-mono">{l}</div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }, [activePanel]);

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      <div className="flex-shrink-0 rounded-xl border border-white/8 bg-black/80 backdrop-blur-md overflow-hidden"
        style={{ boxShadow: "0 0 60px rgba(226,18,39,0.08)" }}>

        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
          <div className={`text-sm font-bold tracking-[0.2em] ${glitching ? "text-red-300" : "text-white"} font-mono transition-colors`}
            style={{ textShadow: glitching ? "0 0 20px #e21227" : "none" }}>
            ◈ QUANTUM COMMAND CENTER v4.0
          </div>
          <div className="ml-auto flex items-center gap-3">
            {LIVE_STATS.map((s, i) => (
              <div key={s.label} className="text-right hidden sm:block">
                <div className="text-[11px] font-bold font-mono" style={{ color: s.color }}>{stats[i]}</div>
                <div className="text-[9px] text-gray-600 font-mono">{s.label}</div>
              </div>
            ))}
            <button onClick={() => setCollapsed(c => !c)}
              className="text-gray-600 hover:text-white transition-colors text-xs font-mono">
              {collapsed ? "▼" : "▲"}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
              className="overflow-hidden">
              <div className="flex gap-1 p-2 overflow-x-auto">
                {PANELS.map(p => (
                  <button key={p.id} onClick={() => setActivePanel(p.id)}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono transition-all"
                    style={{
                      background: activePanel === p.id ? p.color + "18" : "transparent",
                      border: `1px solid ${activePanel === p.id ? p.color + "55" : "transparent"}`,
                      color: activePanel === p.id ? p.color : "#555",
                      boxShadow: activePanel === p.id ? `0 0 12px ${p.color}30` : "none",
                    }}>
                    <span style={{ filter: activePanel === p.id ? `drop-shadow(0 0 4px ${p.color})` : "none" }}>{p.icon}</span>
                    <span className="hidden sm:inline">{p.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <AnimatePresence mode="wait">
          <motion.div key={activePanel}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2 }}>
            {renderPanel()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
