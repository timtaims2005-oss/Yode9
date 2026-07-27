import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { HyperDimension4D } from "./HyperDimension4D";

interface NodeMetric {
  id: string;
  name: string;
  type: "cpu" | "mem" | "net" | "gpu" | "disk" | "ai";
  value: number;
  max: number;
  trend: number[];
  status: "nominal" | "warning" | "critical";
}

const TYPE_CONFIG = {
  cpu:  { label: "CPU",  icon: "⬡", color: "#00e5ff", unit: "%" },
  mem:  { label: "RAM",  icon: "◈", color: "#a78bfa", unit: "%" },
  net:  { label: "NET",  icon: "◉", color: "#10b981", unit: "Gb/s" },
  gpu:  { label: "GPU",  icon: "▣", color: "#f59e0b", unit: "%" },
  disk: { label: "DISK", icon: "▤", color: "#e21227", unit: "MB/s" },
  ai:   { label: "AI",   icon: "⬟", color: "#ff7800", unit: "TOPS" },
};

function RadialGauge({ value, max, color, size = 80 }: { value: number; max: number; color: string; size?: number }) {
  const pct = Math.min(value / max, 1);
  const r = size / 2 - 8;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const filled = arc * pct;
  const offset = circ * 0.125;

  return (
    <svg width={size} height={size} className="rotate-[135deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.05)"
        strokeWidth={6} strokeDasharray={`${arc} ${circ - arc}`} strokeDashoffset={-offset} strokeLinecap="round" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color}
        strokeWidth={6} strokeDasharray={`${filled} ${circ - filled}`} strokeDashoffset={-offset} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 0.4s ease" }} />
    </svg>
  );
}

function SparkLine({ data, color, width = 80, height = 24 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - (v / max) * height}`).join(" ");
  return (
    <svg width={width} height={height}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  );
}

export function SystemNexus4D() {
  const [metrics, setMetrics] = useState<NodeMetric[]>([
    { id:"cpu",  name:"Processor", type:"cpu",  value:42, max:100, trend:[30,35,42,38,45,42], status:"nominal" },
    { id:"mem",  name:"Memory",    type:"mem",  value:67, max:100, trend:[55,60,65,67,62,67], status:"warning" },
    { id:"net",  name:"Network",   type:"net",  value:3.2, max:10, trend:[1,2,3.2,2.8,3.5,3.2], status:"nominal" },
    { id:"gpu",  name:"GPU Core",  type:"gpu",  value:28, max:100, trend:[20,25,28,22,30,28], status:"nominal" },
    { id:"disk", name:"Storage",   type:"disk", value:420, max:1000, trend:[200,350,420,380,450,420], status:"nominal" },
    { id:"ai",   name:"AI Engine", type:"ai",   value:18.4, max:24, trend:[12,15,18,17,19,18.4], status:"nominal" },
  ]);
  const [totalOps, setTotalOps] = useState(0);
  const tickRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current++;
      setMetrics(prev => prev.map(m => {
        const delta = (Math.random() - 0.45) * (m.max * 0.08);
        const newVal = Math.max(m.max * 0.05, Math.min(m.max * 0.95, m.value + delta));
        const trend = [...m.trend.slice(-11), newVal];
        const pct = newVal / m.max;
        const status = pct > 0.85 ? "critical" : pct > 0.65 ? "warning" : "nominal";
        return { ...m, value: newVal, trend, status };
      }));
      setTotalOps(o => o + Math.floor(Math.random() * 50000));
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const criticalCount = metrics.filter(m => m.status === "critical").length;
  const warningCount = metrics.filter(m => m.status === "warning").length;

  return (
    <div className="rounded-xl border border-cyan-900/30 bg-black/70 backdrop-blur-md overflow-hidden"
      style={{ boxShadow: "0 0 40px rgba(0,229,255,0.06), inset 0 0 60px rgba(0,0,0,0.4)" }}>

      <div className="flex items-center gap-3 px-4 py-3 border-b border-cyan-900/20">
        <div className="w-2 h-2 rounded-full bg-cyan-400" style={{ boxShadow: "0 0 8px #00e5ff", animation: "pulse 2s infinite" }} />
        <span className="text-xs font-bold tracking-[0.15em] text-cyan-400">SYSTEM NEXUS 4D</span>
        <div className="flex gap-2 ml-auto">
          {criticalCount > 0 && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400">{criticalCount} CRIT</span>}
          {warningCount > 0 && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/15 border border-yellow-500/30 text-yellow-400">{warningCount} WARN</span>}
          <span className="text-[10px] font-mono text-cyan-700">{(totalOps / 1e6).toFixed(2)}M OPS</span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex gap-4 mb-4">
          <div className="flex-shrink-0">
            <HyperDimension4D size={120} accentColor="#00e5ff" secondaryColor="#a78bfa" speed={0.3} />
          </div>
          <div className="flex-1 grid grid-cols-2 gap-2">
            {metrics.slice(0, 4).map(m => {
              const cfg = TYPE_CONFIG[m.type];
              const pct = m.value / m.max;
              return (
                <motion.div key={m.id} className="rounded-lg border p-2 relative"
                  style={{
                    borderColor: m.status === "critical" ? "#e2122744" : m.status === "warning" ? "#ffd00044" : cfg.color + "22",
                    background: m.status === "critical" ? "rgba(226,18,39,0.05)" : "rgba(0,0,0,0.3)",
                  }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-mono" style={{ color: cfg.color }}>{cfg.icon} {cfg.label}</span>
                    <span className="text-[10px] font-bold font-mono"
                      style={{ color: m.status === "critical" ? "#e21227" : m.status === "warning" ? "#ffd000" : "#fff" }}>
                      {m.value.toFixed(m.value < 10 ? 1 : 0)}{cfg.unit}
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-white/5 mb-1">
                    <motion.div animate={{ width: `${pct * 100}%` }} transition={{ duration: 0.4 }}
                      className="h-full rounded-full"
                      style={{ background: m.status === "critical" ? "#e21227" : m.status === "warning" ? "#ffd000" : cfg.color,
                        boxShadow: `0 0 4px ${cfg.color}60` }} />
                  </div>
                  <SparkLine data={m.trend} color={cfg.color} width={80} height={18} />
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {metrics.slice(4).map(m => {
            const cfg = TYPE_CONFIG[m.type];
            const pct = m.value / m.max;
            return (
              <div key={m.id} className="rounded-lg border border-white/5 p-2 flex flex-col items-center gap-1">
                <div className="relative w-[60px] h-[60px]">
                  <RadialGauge value={m.value} max={m.max} color={cfg.color} size={60} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[9px] font-bold font-mono" style={{ color: cfg.color }}>
                      {(pct * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-gray-400">{cfg.label}</span>
                <span className="text-[10px] font-mono text-white">{m.value.toFixed(1)}{cfg.unit}</span>
              </div>
            );
          })}
          <div className="rounded-lg border border-white/5 p-2 col-span-1">
            <div className="text-[9px] text-gray-500 font-mono mb-1">AI INFERENCE RATE</div>
            <div className="text-lg font-bold font-mono text-orange-400" style={{ textShadow: "0 0 10px #ff780080" }}>
              {(metrics.find(m=>m.type==="ai")?.value ?? 0).toFixed(1)} <span className="text-xs">TOPS</span>
            </div>
            <SparkLine data={metrics.find(m=>m.type==="ai")?.trend ?? []} color="#ff7800" width={60} height={20} />
          </div>
        </div>
      </div>
    </div>
  );
}
