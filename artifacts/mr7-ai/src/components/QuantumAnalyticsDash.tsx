import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NeuralParticleField4D } from "./NeuralParticleField4D";

interface DataPoint { t: number; v: number; }
interface SeriesData { label: string; color: string; points: DataPoint[]; }

function Sparkline({ series, width = 120, height = 36 }: { series: SeriesData; width?: number; height?: number }) {
  const pts = series.points;
  if (pts.length < 2) return null;
  const min = Math.min(...pts.map(p => p.v));
  const max = Math.max(...pts.map(p => p.v));
  const range = max - min || 1;
  const toX = (i: number) => (i / (pts.length - 1)) * width;
  const toY = (v: number) => height - ((v - min) / range) * (height - 6) - 3;
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.v).toFixed(1)}`).join(" ");
  const fill = `${d} L ${toX(pts.length-1).toFixed(1)} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${series.label}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={series.color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={series.color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fill} fill={`url(#grad-${series.label})`} />
      <path d={d} stroke={series.color} strokeWidth="1.5" fill="none"
        style={{ filter: `drop-shadow(0 0 3px ${series.color})` }} />
      <circle cx={toX(pts.length-1)} cy={toY(pts[pts.length-1].v)} r="2.5"
        fill={series.color} style={{ filter: `drop-shadow(0 0 4px ${series.color})` }} />
    </svg>
  );
}

const MAX_PTS = 30;

export function QuantumAnalyticsDash() {
  const [open, setOpen] = useState(false);
  const [series, setSeries] = useState<SeriesData[]>([
    { label: "THREATS/MIN", color: "#e21227", points: Array.from({length:MAX_PTS},(_,i)=>({t:i,v:10+Math.random()*40})) },
    { label: "AI OPS",      color: "#00e5ff", points: Array.from({length:MAX_PTS},(_,i)=>({t:i,v:50+Math.random()*40})) },
    { label: "LATENCY ms",  color: "#f59e0b", points: Array.from({length:MAX_PTS},(_,i)=>({t:i,v:5+Math.random()*20})) },
    { label: "BLOCKED/S",   color: "#10b981", points: Array.from({length:MAX_PTS},(_,i)=>({t:i,v:20+Math.random()*60})) },
  ]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setTick(t => t + 1);
      setSeries(prev => prev.map((s, si) => {
        const last = s.points[s.points.length - 1];
        const next: DataPoint = {
          t: last.t + 1,
          v: Math.max(0, last.v + (Math.random() - 0.48) * (si === 2 ? 4 : 12)),
        };
        return { ...s, points: [...s.points.slice(-(MAX_PTS-1)), next] };
      }));
    }, 800);
    return () => clearInterval(iv);
  }, []);

  const latestVal = useCallback((s: SeriesData) =>
    s.points[s.points.length - 1]?.v.toFixed(1) ?? "–", []);
  const deltaVal = useCallback((s: SeriesData) => {
    const pts = s.points;
    if (pts.length < 2) return "0";
    const d = pts[pts.length-1].v - pts[pts.length-2].v;
    return `${d >= 0 ? "+" : ""}${d.toFixed(1)}`;
  }, []);

  return (
    <div className="fixed bottom-20 left-4 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
            className="mb-3 w-80 rounded-2xl border border-cyan-900/40 bg-black/92 backdrop-blur-xl overflow-hidden"
            style={{ boxShadow: "0 0 60px rgba(0,229,255,0.1), inset 0 0 40px rgba(0,0,0,0.6)" }}>

            <div className="relative h-28 overflow-hidden border-b border-white/5">
              <NeuralParticleField4D
                className="absolute inset-0"
                accentColor="#00e5ff"
                particleCount={20}
                showTesseract={false}
                speed={0.4}
              />
              <div className="absolute inset-0 flex flex-col justify-center px-4">
                <div className="text-[10px] font-bold tracking-[0.2em] text-cyan-400 font-mono">
                  QUANTUM ANALYTICS 4D
                </div>
                <div className="text-[9px] text-cyan-700 font-mono mt-0.5">
                  TICK #{tick} · LIVE · {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="p-3 space-y-2.5">
              {series.map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between mb-0.5">
                      <span className="text-[9px] text-gray-600 font-mono">{s.label}</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xs font-bold font-mono" style={{ color: s.color }}>
                          {latestVal(s)}
                        </span>
                        <span className="text-[9px] font-mono text-gray-700">
                          {deltaVal(s)}
                        </span>
                      </div>
                    </div>
                    <Sparkline series={s} width={180} height={28} />
                  </div>
                </div>
              ))}
            </div>

            <div className="px-3 pb-3">
              <button onClick={() => setOpen(false)}
                className="w-full py-1.5 rounded-lg text-[10px] font-mono text-gray-600 border border-white/5 hover:text-white transition-colors">
                MINIMIZE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, rgba(0,229,255,0.2), rgba(0,0,0,0.8))",
          border: "2px solid rgba(0,229,255,0.4)",
          boxShadow: "0 0 20px rgba(0,229,255,0.3)",
        }}>
        <span className="text-lg" style={{ color: "#00e5ff", filter: "drop-shadow(0 0 6px #00e5ff)" }}>
          {open ? "✕" : "◉"}
        </span>
      </motion.button>
    </div>
  );
}
