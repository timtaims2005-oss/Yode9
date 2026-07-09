import { lazy, Suspense, useState, useEffect } from "react";
import { motion } from "framer-motion";

const ThreatFeed3D         = lazy(() => import("../ThreatFeed3D").then(m => ({ default: () => <m.ThreatFeed3D onClose={() => {}} /> })));
const SecurityDashboard3D  = lazy(() => import("../SecurityDashboard3D").then(m => ({ default: () => <m.SecurityDashboard3D onClose={() => {}} /> })));
const NetworkTopology3D    = lazy(() => import("../NetworkTopology3D").then(m => ({ default: () => <m.NetworkTopology3D onClose={() => {}} /> })));
const PerformanceDashboard3D = lazy(() => import("../PerformanceDashboard3D").then(m => ({ default: () => <m.PerformanceDashboard3D onClose={() => {}} /> })));
const CostDashboard3D      = lazy(() => import("../CostDashboard3D").then(m => ({ default: () => <m.CostDashboard3D entries={[]} onClose={() => {}} /> })));
const ContextMemoryPanel3D = lazy(() => import("../ContextMemoryPanel3D").then(m => ({ default: () => <m.ContextMemoryPanel3D onClose={() => {}} /> })));
const AnomalyLog3D         = lazy(() => import("../AnomalyLog3D").then(m => ({ default: () => <m.AnomalyLog3D onClose={() => {}} /> })));
const DedupVisualizer3D    = lazy(() => import("../DedupVisualizer3D").then(m => ({ default: () => <m.DedupVisualizer3D onClose={() => {}} /> })));
const PrefetchIntelligence3D = lazy(() => import("../PrefetchIntelligence3D").then(m => ({ default: () => <m.PrefetchIntelligence3D onClose={() => {}} /> })));
const LiveAttackGlobe3D    = lazy(() => import("../LiveAttackGlobe3D").then(m => ({ default: m.LiveAttackGlobe3D })));
const LiveOpsDashboard3D   = lazy(() => import("../LiveOpsDashboard3D").then(m => ({ default: () => <m.LiveOpsDashboard3D onClose={() => {}} /> })));
const SystemMasterHUD3D    = lazy(() => import("../SystemMasterHUD3D").then(m => ({ default: () => <m.SystemMasterHUD3D /> })));
const CisaLivePanel3D      = lazy(() => import("../CisaLivePanel3D").then(m => ({ default: () => <m.CisaLivePanel3D open={true} onClose={() => {}} /> })));
const SysMonitorOrb        = lazy(() => import("../FloatingChatPanels").then(m => ({ default: m.SysMonitorOrb })));
const IdleTrackerOrb       = lazy(() => import("../FloatingChatPanels").then(m => ({ default: m.IdleTrackerOrb })));

function StreamMetricsPanel() {
  const [tps, setTps] = useState(0);
  const [total, setTotal] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => {
      setTps(Math.round(Math.random() * 80 + 20));
      setTotal(v => v + Math.round(Math.random() * 40 + 5));
    }, 800);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="p-4 font-mono space-y-3">
      <div className="flex justify-between items-center text-[11px]">
        <span style={{ color: "rgba(255,255,255,0.4)" }}>Tokens / sec</span>
        <span style={{ color: "#34d399", fontWeight: 700, fontSize: "14px" }}>{tps}</span>
      </div>
      <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div className="h-full rounded-full" style={{ background: "#34d399" }}
          animate={{ width: `${Math.min(100, tps)}%` }} transition={{ duration: 0.4 }} />
      </div>
      <div className="flex justify-between items-center text-[11px]">
        <span style={{ color: "rgba(255,255,255,0.4)" }}>Total Tokens</span>
        <span style={{ color: "#34d399", fontWeight: 700 }}>{total.toLocaleString()}</span>
      </div>
    </div>
  );
}

function GpuCpuPanel() {
  const [vals, setVals] = useState({ cpu: 42, gpu: 28, mem: 61 });
  useEffect(() => {
    const iv = setInterval(() => setVals(v => ({
      cpu: Math.max(5, Math.min(95, v.cpu + (Math.random() - 0.5) * 8)),
      gpu: Math.max(5, Math.min(95, v.gpu + (Math.random() - 0.5) * 6)),
      mem: Math.max(20, Math.min(90, v.mem + (Math.random() - 0.5) * 2)),
    })), 600);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="p-4 space-y-3">
      {([["CPU", vals.cpu, "#06b6d4"], ["GPU", vals.gpu, "#8b5cf6"], ["MEM", vals.mem, "#10b981"]] as const).map(([lbl, val, col]) => (
        <div key={lbl} className="space-y-1">
          <div className="flex justify-between font-mono text-[10px]">
            <span style={{ color: "rgba(255,255,255,0.4)" }}>{lbl}</span>
            <span style={{ color: col, fontWeight: 700 }}>{Math.round(val)}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <motion.div className="h-full rounded-full" style={{ background: col }}
              animate={{ width: `${val}%` }} transition={{ duration: 0.5 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreatIntelPanel() {
  const items = [
    { ip: "185.220.101.47", threat: "TOR EXIT", risk: "HIGH", color: "#e21227" },
    { ip: "45.33.32.156",   threat: "SCANNER",  risk: "MED",  color: "#fb923c" },
    { ip: "104.21.8.12",    threat: "BOTNET",   risk: "HIGH", color: "#e21227" },
    { ip: "198.51.100.23",  threat: "PROXY",    risk: "LOW",  color: "#fbbf24" },
  ];
  return (
    <div className="p-3 space-y-1.5 font-mono">
      {items.map(it => (
        <div key={it.ip} className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.5)" }}>{it.ip}</span>
          <span className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: `${it.color}20`, color: it.color, border: `1px solid ${it.color}40` }}>{it.threat}</span>
          <span className="text-[8px] font-black" style={{ color: it.color }}>{it.risk}</span>
        </div>
      ))}
    </div>
  );
}

const PANEL_COMPONENT_MAP: Record<string, React.ComponentType> = {
  sysmon:      SysMonitorOrb,
  idle:        IdleTrackerOrb,
  threat:      ThreatFeed3D,
  secDash:     SecurityDashboard3D,
  netTopo:     NetworkTopology3D,
  perf:        PerformanceDashboard3D,
  cost:        CostDashboard3D,
  ctxMem:      ContextMemoryPanel3D,
  anomaly:     AnomalyLog3D,
  dedup:       DedupVisualizer3D,
  radio:       PrefetchIntelligence3D,
  threatMap:   LiveAttackGlobe3D,
  threatIntel: ThreatIntelPanel,
  liveOps:     LiveOpsDashboard3D,
  sysHUD:      SystemMasterHUD3D,
  cisa:        CisaLivePanel3D,
  dbStats:     StreamMetricsPanel,
  gpu:         GpuCpuPanel,
};

export function PanelContent({ panelId }: { panelId: string }) {
  const Comp = PANEL_COMPONENT_MAP[panelId];
  if (!Comp) {
    return (
      <div className="p-6 text-center font-mono text-[10px]" style={{ color: "rgba(255,255,255,0.3)" }}>
        Panel not found: {panelId}
      </div>
    );
  }
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-24 gap-2">
        <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "#e21227" }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: 0 }} />
        <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "#8b5cf6" }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: 0.15 }} />
        <motion.div className="w-1.5 h-1.5 rounded-full" style={{ background: "#06b6d4" }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }} />
      </div>
    }>
      <Comp />
    </Suspense>
  );
}
