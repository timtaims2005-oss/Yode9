import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HolographicThreatMap } from "./HolographicThreatMap";
import { AIInsightPanel } from "./AIInsightPanel";
import { CyberTerminalStream } from "./CyberTerminalStream";
import { QuantumVulnTracker } from "./QuantumVulnTracker";
import { QuantumNetworkTopology } from "./QuantumNetworkTopology";
import { NeuralParticleField4D } from "./NeuralParticleField4D";
import { useQuantumMetrics, formatUptime } from "@/hooks/useQuantumMetrics";
import { useThreatStats } from "@/hooks/useThreatIntel";

type Tab = "overview" | "threats" | "network" | "console" | "insights";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "overview",  label: "Overview",  icon: "◈" },
  { id: "threats",   label: "Threats",   icon: "◉" },
  { id: "network",   label: "Network",   icon: "⬡" },
  { id: "console",   label: "Terminal",  icon: "▣" },
  { id: "insights",  label: "AI Intel",  icon: "◆" },
];

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="rounded-xl border p-3 relative overflow-hidden"
      style={{ borderColor: `${color}20`, background: `linear-gradient(135deg, ${color}08, transparent)` }}>
      <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-5"
        style={{ background: color, transform: "translate(30%,-30%)" }} />
      <div className="text-[9px] text-gray-600 font-mono tracking-wider mb-1">{label}</div>
      <div className="text-lg font-bold font-mono leading-none" style={{ color }}>
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sub && <div className="text-[9px] text-gray-700 font-mono mt-0.5">{sub}</div>}
    </div>
  );
}

export function QuantumDashboard4D() {
  const [tab, setTab] = useState<Tab>("overview");
  const metrics = useQuantumMetrics(2000);
  const { data: threats } = useThreatStats();

  return (
    <div className="flex flex-col h-full bg-black/60 backdrop-blur-xl">
      <div className="relative h-16 overflow-hidden border-b border-red-900/20 flex-shrink-0">
        <NeuralParticleField4D className="absolute inset-0" accentColor="#e21227"
          particleCount={15} showTesseract={false} speed={0.3} />
        <div className="absolute inset-0 flex items-center justify-between px-4">
          <div>
            <div className="text-sm font-bold font-mono text-white tracking-wider">
              QUANTUM CYBER <span className="text-red-500">DASHBOARD</span>
            </div>
            <div className="text-[9px] text-gray-600 font-mono">
              4D EDITION · v4.0 · UPTIME: {formatUptime(metrics.uptimeMs)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[10px] font-mono">
              <span className="text-gray-600">FPS</span>
              <span className="text-green-400 ml-1">{metrics.fps}</span>
            </div>
            <div className="text-[10px] font-mono">
              <span className="text-gray-600">LAT</span>
              <span className={`ml-1 ${metrics.networkLatencyMs < 50 ? "text-green-400" : metrics.networkLatencyMs < 200 ? "text-yellow-400" : "text-red-500"}`}>
                {metrics.networkLatencyMs}ms
              </span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" style={{animation:"pulse 2s infinite"}} />
              <span className="text-[9px] text-green-400 font-mono">LIVE</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex border-b border-white/5 flex-shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex-1 py-2 text-[10px] font-mono flex items-center justify-center gap-1 transition-all relative"
            style={{
              color: tab === t.id ? "#e21227" : "#4b5563",
              background: tab === t.id ? "rgba(226,18,39,0.05)" : "transparent",
            }}>
            <span style={{ filter: tab === t.id ? "drop-shadow(0 0 4px #e21227)" : "none" }}>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
            {tab === t.id && (
              <motion.div layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-px"
                style={{ background: "#e21227", boxShadow: "0 0 8px #e21227" }} />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }}
            className="h-full">

            {tab === "overview" && (
              <div className="h-full overflow-y-auto p-3 space-y-3">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <MetricCard label="THREATS TOTAL" value={threats?.total ?? 247} color="#e21227"
                    sub={`${threats?.critical ?? 3} critical`} />
                  <MetricCard label="BLOCKED 24H" value={threats?.blockedLast24h ?? 1293} color="#10b981"
                    sub="auto-blocked" />
                  <MetricCard label="AI SCORE" value={threats?.avgScore ?? 34} color="#00e5ff"
                    sub="avg threat score" />
                  <MetricCard label="JS HEAP" value={`${metrics.heapUsedMB}MB`} color="#a78bfa"
                    sub={`${metrics.jsHeapPct}% used`} />
                  <MetricCard label="NETWORK" value={`${metrics.networkLatencyMs}ms`} color="#f59e0b"
                    sub="api latency" />
                  <MetricCard label="GPU TIER" value={metrics.gpuTier.toUpperCase()} color="#ff7800"
                    sub="render engine" />
                </div>
                <div className="rounded-xl border border-white/5 overflow-hidden" style={{ height: 220 }}>
                  <Suspense fallback={<div className="h-full flex items-center justify-center text-gray-700 text-xs font-mono">Loading...</div>}>
                    <HolographicThreatMap />
                  </Suspense>
                </div>
              </div>
            )}

            {tab === "threats" && (
              <Suspense fallback={<div className="h-full flex items-center justify-center text-gray-700 text-xs font-mono">Loading...</div>}>
                <QuantumVulnTracker className="h-full" />
              </Suspense>
            )}

            {tab === "network" && (
              <Suspense fallback={<div className="h-full flex items-center justify-center text-gray-700 text-xs font-mono">Loading...</div>}>
                <QuantumNetworkTopology className="h-full" />
              </Suspense>
            )}

            {tab === "console" && (
              <Suspense fallback={<div className="h-full flex items-center justify-center text-gray-700 text-xs font-mono">Loading...</div>}>
                <CyberTerminalStream className="h-full" />
              </Suspense>
            )}

            {tab === "insights" && (
              <Suspense fallback={<div className="h-full flex items-center justify-center text-gray-700 text-xs font-mono">Loading...</div>}>
                <AIInsightPanel />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
