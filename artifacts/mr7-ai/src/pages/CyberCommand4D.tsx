import { Suspense, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HyperDimension4D } from "@/components/HyperDimension4D";
import { QuantumThreatOracle } from "@/components/QuantumThreatOracle";
import { NeuralVoiceCommander } from "@/components/NeuralVoiceCommander";
import { HoloTimeline4D } from "@/components/HoloTimeline4D";
import { AIBattleStation } from "@/components/AIBattleStation";
import { SystemNexus4D } from "@/components/SystemNexus4D";
import { CyberMatrix4D } from "@/components/CyberMatrix4D";
import { Holographic4DPanel, ScanlineOverlay } from "@/components/Holographic4DPanel";
import { QuantumDashboard4D } from "@/components/QuantumDashboard4D";
import { PentestLiveConsole } from "@/components/PentestLiveConsole";
import { QuantumVulnTracker } from "@/components/QuantumVulnTracker";
import { QuantumNetworkTopology } from "@/components/QuantumNetworkTopology";

const SECTIONS = [
  { id: "overview",  label: "◈ Overview",       icon: "◈" },
  { id: "dashboard", label: "◉ Dashboard",       icon: "◉" },
  { id: "threats",   label: "⬡ Threats",         icon: "⬡" },
  { id: "network",   label: "▣ Network",          icon: "▣" },
  { id: "pentest",   label: "◆ Pentest",          icon: "◆" },
  { id: "voice",     label: "⬟ Voice CMD",        icon: "⬟" },
  { id: "timeline",  label: "⊙ Timeline",         icon: "⊙" },
  { id: "battle",    label: "⚔ AI Battle",        icon: "⚔" },
  { id: "nexus",     label: "⬢ Nexus",            icon: "⬢" },
];

function LiveCounter({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-lg font-bold font-mono" style={{ color, textShadow: `0 0 12px ${color}80` }}>
        {value}
      </div>
      <div className="text-[9px] text-gray-500 font-mono tracking-wider">{label}</div>
    </div>
  );
}

function OverviewSection() {
  const [counters, setCounters] = useState({
    threats: 847, blocked: 1293, ai_ops: 94821, uptime: "99.97%",
    nodes: 247, latency: "12ms",
  });

  useEffect(() => {
    const iv = setInterval(() => {
      setCounters(c => ({
        ...c,
        threats: c.threats + Math.floor(Math.random() * 3),
        blocked: c.blocked + Math.floor(Math.random() * 5),
        ai_ops: c.ai_ops + Math.floor(Math.random() * 500),
        nodes: 240 + Math.floor(Math.random() * 20),
        latency: `${8 + Math.floor(Math.random() * 10)}ms`,
      }));
    }, 2000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="col-span-2 md:col-span-1 rounded-xl border border-red-900/30 bg-black/60 backdrop-blur-md p-4 flex flex-col items-center justify-center gap-4"
          style={{ boxShadow: "0 0 40px rgba(226,18,39,0.08)" }}>
          <HyperDimension4D size={180} accentColor="#e21227" secondaryColor="#00e5ff" speed={0.5} />
          <div className="text-center">
            <div className="text-[10px] font-bold tracking-[0.2em] text-red-400 font-mono">4D HYPERCUBE ENGINE</div>
            <div className="text-[9px] text-gray-600 font-mono">True 4D → 2D Projection</div>
          </div>
        </div>

        <div className="rounded-xl border border-cyan-900/30 bg-black/60 backdrop-blur-md p-4">
          <div className="text-[10px] font-bold tracking-[0.15em] text-cyan-400 font-mono mb-4">LIVE STATS</div>
          <div className="grid grid-cols-2 gap-3">
            <LiveCounter label="THREATS" value={counters.threats.toLocaleString()} color="#e21227" />
            <LiveCounter label="BLOCKED" value={counters.blocked.toLocaleString()} color="#10b981" />
            <LiveCounter label="AI OPS" value={`${(counters.ai_ops/1000).toFixed(1)}K`} color="#00e5ff" />
            <LiveCounter label="NODES" value={counters.nodes.toString()} color="#a78bfa" />
            <LiveCounter label="UPTIME" value={counters.uptime} color="#10b981" />
            <LiveCounter label="LATENCY" value={counters.latency} color="#f59e0b" />
          </div>
        </div>

        <div className="rounded-xl border border-purple-900/30 bg-black/60 backdrop-blur-md p-4">
          <div className="text-[10px] font-bold tracking-[0.15em] text-purple-400 font-mono mb-3">DIMENSION STATUS</div>
          {[
            { dim: "X — Threat Space",   pct: 78, color: "#e21227" },
            { dim: "Y — Defense Layer",  pct: 94, color: "#10b981" },
            { dim: "Z — AI Cognition",   pct: 86, color: "#00e5ff" },
            { dim: "W — Hyper-Intel",    pct: 71, color: "#a78bfa" },
          ].map(d => (
            <div key={d.dim} className="mb-2">
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-gray-400">{d.dim}</span>
                <span style={{ color: d.color }}>{d.pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${d.pct}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full rounded-full"
                  style={{ background: d.color, boxShadow: `0 0 6px ${d.color}60` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <QuantumThreatOracle />
        <SystemNexus4D />
      </div>
    </div>
  );
}

export default function CyberCommand4D() {
  const [section, setSection] = useState("overview");
  const [glitch, setGlitch] = useState(false);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBooted(true), 800);
    const glitchInterval = setInterval(() => {
      setGlitch(true);
      setTimeout(() => setGlitch(false), 120);
    }, 8000);
    return () => { clearTimeout(timer); clearInterval(glitchInterval); };
  }, []);

  const renderSection = () => {
    switch (section) {
      case "overview":  return <OverviewSection />;
      case "dashboard": return <div style={{ height: "calc(100vh - 180px)" }}><QuantumDashboard4D /></div>;
      case "threats":   return <div style={{ height: "calc(100vh - 180px)" }}><QuantumVulnTracker className="h-full" /></div>;
      case "network":   return <div style={{ height: "calc(100vh - 180px)" }}><QuantumNetworkTopology className="h-full" /></div>;
      case "pentest":   return <div style={{ height: "calc(100vh - 180px)" }}><PentestLiveConsole className="h-full" /></div>;
      case "voice":     return <NeuralVoiceCommander />;
      case "timeline":  return <HoloTimeline4D />;
      case "battle":    return <AIBattleStation />;
      case "nexus":     return <SystemNexus4D />;
      default:          return <OverviewSection />;
    }
  };

  return (
    <div className="relative min-h-screen bg-black overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <CyberMatrix4D accentColor="#e21227" density={0.4} />
        <Holographic4DPanel intensity={0.25} />
        <ScanlineOverlay opacity={0.03} />
        <div className="absolute inset-0"
          style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(226,18,39,0.06) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <motion.header
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="flex-shrink-0 border-b border-red-900/20 bg-black/80 backdrop-blur-md">
          <div className="px-4 py-3 flex items-center gap-4">
            <motion.div
              animate={glitch ? { x: [-2, 2, -1, 0], filter: ["hue-rotate(0deg)", "hue-rotate(180deg)", "hue-rotate(0deg)"] } : {}}
              transition={{ duration: 0.12 }}
              className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"
                style={{ boxShadow: "0 0 8px #e21227", animation: "pulse 1.5s infinite" }} />
              <span className="text-sm font-bold tracking-[0.25em] text-white font-mono">
                QUANTUM CYBER COMMAND
              </span>
              <span className="text-[10px] text-red-600/60 font-mono hidden sm:inline">4D-EDITION v4.0</span>
            </motion.div>

            <div className="flex gap-1 ml-auto overflow-x-auto">
              {SECTIONS.map(s => (
                <button key={s.id} onClick={() => setSection(s.id)}
                  className="flex-shrink-0 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all"
                  style={{
                    background: section === s.id ? "rgba(226,18,39,0.15)" : "transparent",
                    border: `1px solid ${section === s.id ? "rgba(226,18,39,0.4)" : "transparent"}`,
                    color: section === s.id ? "#e21227" : "#555",
                    boxShadow: section === s.id ? "0 0 10px rgba(226,18,39,0.2)" : "none",
                  }}>
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.icon}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.header>

        <main className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {!booted ? (
              <motion.div key="boot" exit={{ opacity: 0 }}
                className="flex items-center justify-center h-64">
                <div className="text-center space-y-3">
                  <div className="text-red-400 font-mono text-sm animate-pulse">
                    INITIALIZING 4D ENGINE...
                  </div>
                  <div className="flex gap-1 justify-center">
                    {[...Array(8)].map((_,i) => (
                      <div key={i} className="w-1 h-6 rounded-full bg-red-500/30"
                        style={{ animation: `pulse 0.8s ${i*0.1}s infinite alternate` }} />
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div key={section}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}>
                <Suspense fallback={<div className="text-red-400 font-mono text-sm p-8 text-center animate-pulse">LOADING MODULE...</div>}>
                  {renderSection()}
                </Suspense>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <footer className="flex-shrink-0 border-t border-white/5 px-4 py-2 flex items-center gap-4">
          <div className="flex gap-3 text-[9px] font-mono text-gray-700">
            {["4D ENGINE: ACTIVE", "QUANTUM CORE: ONLINE", "NEURAL NET: READY", "HOLO LAYER: GPU"].map(s => (
              <span key={s} className="flex items-center gap-1">
                <span className="text-green-700">●</span> {s}
              </span>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
