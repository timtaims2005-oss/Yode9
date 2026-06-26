import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HyperDimension4D } from "./HyperDimension4D";
import { CyberMatrix4D } from "./CyberMatrix4D";
import { useLocation } from "wouter";

interface WidgetMetric {
  label: string;
  value: string;
  color: string;
  delta?: string;
}

const METRIC_POOL: WidgetMetric[] = [
  { label: "THREAT LEVEL", value: "ELEVATED", color: "#e21227", delta: "+12%" },
  { label: "AI INFERENCE", value: "18.4 TOPS", color: "#00e5ff", delta: "+5%" },
  { label: "NODES ACTIVE", value: "247", color: "#10b981", delta: "stable" },
  { label: "BLOCKED/SEC", value: "0", color: "#a78bfa", delta: "0" },
  { label: "CVE ALERTS", value: "3 NEW", color: "#ff7800", delta: "↑" },
  { label: "UPTIME", value: "99.97%", color: "#10b981", delta: "ok" },
];

export function Quantum4DWidget() {
  const [expanded, setExpanded] = useState(false);
  const [metrics, setMetrics] = useState(METRIC_POOL);
  const [tick, setTick] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [, navigate] = useLocation();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTick(t => t + 1);
      setPulse(true);
      setTimeout(() => setPulse(false), 300);
      setMetrics(prev => prev.map(m => {
        if (m.label === "AI INFERENCE") {
          const v = (14 + Math.random() * 8).toFixed(1);
          return { ...m, value: `${v} TOPS` };
        }
        if (m.label === "NODES ACTIVE") {
          return { ...m, value: (240 + Math.floor(Math.random() * 20)).toString() };
        }
        if (m.label === "BLOCKED/SEC") {
          const v = Math.floor(Math.random() * 80 + 20);
          return { ...m, value: v.toString() };
        }
        return m;
      }));
    }, 2500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const goTo4D = useCallback(() => {
    navigate("/cyber4d");
  }, [navigate]);

  return (
    <div className="fixed bottom-20 right-4 z-50" style={{ userSelect: "none" }}>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className="mb-3 w-72 rounded-[18px] border border-red-900/40 bg-black/90 backdrop-blur-xl overflow-hidden"
            style={{ boxShadow: "0 0 60px rgba(226,18,39,0.2), inset 0 0 40px rgba(0,0,0,0.5)" }}>

            <div className="relative h-40 overflow-hidden">
              <CyberMatrix4D accentColor="#e21227" density={0.3} className="absolute inset-0" />
              <div className="absolute inset-0 flex items-center justify-center">
                <HyperDimension4D size={120} accentColor="#e21227" secondaryColor="#00e5ff" speed={0.5} />
              </div>
              <div className="absolute top-2 left-3 right-3 flex items-center justify-between">
                <span className="text-[10px] font-bold tracking-[0.2em] text-red-400 font-mono">4D QUANTUM ENGINE</span>
                <span className="text-[9px] text-red-600/60 font-mono">
                  {pulse ? "● SYNC" : "○ LIVE"}
                </span>
              </div>
            </div>

            <div className="p-3 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                {metrics.slice(0, 4).map(m => (
                  <div key={m.label} className="rounded-lg bg-white/3 border border-white/5 px-2 py-1.5">
                    <div className="text-[9px] text-gray-600 font-mono">{m.label}</div>
                    <div className="text-xs font-bold font-mono" style={{ color: m.color }}>{m.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-1.5 mt-2">
                <button onClick={goTo4D}
                  className="flex-1 py-2 rounded-lg text-[11px] font-bold font-mono transition-all"
                  style={{ background: "rgba(226,18,39,0.15)", border: "1px solid rgba(226,18,39,0.4)", color: "#e21227",
                    boxShadow: "0 0 12px rgba(226,18,39,0.2)" }}>
                  ◈ OPEN 4D CENTER
                </button>
                <button onClick={() => setExpanded(false)}
                  className="px-3 py-2 rounded-lg text-[11px] text-gray-600 border border-white/5 hover:text-white transition-colors">
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setExpanded(e => !e)}
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
        className="relative w-14 h-14 rounded-full flex items-center justify-center overflow-hidden"
        style={{
          background: "linear-gradient(135deg, rgba(226,18,39,0.9), rgba(0,0,0,0.8))",
          border: "2px solid rgba(226,18,39,0.6)",
          boxShadow: pulse
            ? "0 0 30px rgba(226,18,39,0.8), inset 0 0 20px rgba(226,18,39,0.2)"
            : "0 0 20px rgba(226,18,39,0.4), inset 0 0 10px rgba(226,18,39,0.1)",
        }}>
        <div className="absolute inset-0 rounded-full border border-red-500/30"
          style={{ animation: "ping 2s cubic-bezier(0,0,0.2,1) infinite", opacity: 0.4 }} />
        <span className="text-xl relative z-10"
          style={{ filter: "drop-shadow(0 0 8px #e21227)" }}>
          {expanded ? "✕" : "◈"}
        </span>
        {!expanded && (
          <div className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border border-black"
            style={{ boxShadow: "0 0 6px #e21227", animation: "pulse 1.5s infinite" }} />
        )}
      </motion.button>
    </div>
  );
}
