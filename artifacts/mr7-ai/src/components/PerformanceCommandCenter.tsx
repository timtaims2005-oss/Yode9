/**
 * Performance Command Center — Full cyberpunk performance dashboard.
 * Live graphs of: FPS, latency, memory, thermal, battery.
 * Manual controls: FPS lock, quality mode, animation toggle.
 * Triggered from TopBar button.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Cpu, Wifi, Zap, Thermometer, Battery, Activity,
         ChevronUp, ChevronDown, RefreshCw, Shield, Gauge, Eye, Layers } from "lucide-react";
import { connectionMonitor, type ConnectionSnapshot } from "@/lib/connection-monitor";
import { adaptiveFPS, type AdaptiveState, type FPSTarget } from "@/lib/adaptive-fps";
import { memoryPressure, type PressureLevel } from "@/lib/memory-pressure";
import { thermalGuard } from "@/lib/thermal-guard";
import { networkResilience, type ResilienceState } from "@/lib/network-resilience";
import { frameScheduler } from "@/lib/frame-scheduler";

const RED    = "#e21227";
const GREEN  = "#22c55e";
const AMBER  = "#f59e0b";
const BLUE   = "#3b82f6";
const VIOLET = "#7c3aed";

function colorForValue(v: number, low: number, high: number, invert = false) {
  const pct = Math.min((v - low) / (high - low), 1);
  const bad = invert ? pct < 0.3 : pct > 0.7;
  const warn = invert ? pct < 0.5 : pct > 0.4;
  return bad ? RED : warn ? AMBER : GREEN;
}

function SparkLine({ data, color, height = 36, width = 120 }: {
  data: number[]; color: string; height?: number; width?: number;
}) {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg-${color.replace("#","")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.4} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {data.length > 1 && (
        <>
          <polyline
            points={`${points} ${width},${height} 0,${height}`}
            fill={`url(#sg-${color.replace("#","")})`}
            stroke="none"
          />
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Current value dot */}
          {data.length >= 2 && (() => {
            const lastPt = points.split(" ").pop()!.split(",");
            return (
              <circle
                cx={lastPt[0]} cy={lastPt[1]} r={2.5}
                fill={color}
                style={{ filter: `drop-shadow(0 0 4px ${color})` }}
              />
            );
          })()}
        </>
      )}
    </svg>
  );
}

function MetricCard({ title, value, unit, color, spark, children }: {
  title: string; value: string; unit?: string; color: string;
  spark?: number[]; children?: React.ReactNode;
}) {
  return (
    <div style={{
      background: "#0a0f1a",
      border: `1px solid ${color}28`,
      borderRadius: 8,
      padding: "10px 14px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}60, transparent)` }} />
      <div style={{ fontSize: 9, color: "#475569", letterSpacing: "0.12em", fontFamily: "monospace", textTransform: "uppercase" }}>{title}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontSize: 22, fontWeight: 700, fontFamily: "monospace", color, lineHeight: 1 }}>{value}</span>
        {unit && <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>{unit}</span>}
      </div>
      {spark && spark.length > 1 && <SparkLine data={spark} color={color} height={28} width={100} />}
      {children}
    </div>
  );
}

function FPSButton({ fps, current, onClick }: { fps: FPSTarget; current: FPSTarget; onClick: () => void }) {
  const active = fps === current;
  return (
    <button
      onClick={onClick}
      style={{
        padding: "4px 10px", borderRadius: 4,
        background: active ? `${RED}22` : "transparent",
        border: `1px solid ${active ? RED : "#1e293b"}`,
        color: active ? RED : "#475569",
        fontSize: 10, fontWeight: 700, fontFamily: "monospace",
        cursor: "pointer", transition: "all 0.15s",
        boxShadow: active ? `0 0 8px ${RED}30` : "none",
      }}
    >
      {fps}
    </button>
  );
}

const MAX_HISTORY = 60;

interface PerfCCProps {
  open: boolean;
  onClose: () => void;
}

export function PerformanceCommandCenter({ open, onClose }: PerfCCProps) {
  const [conn,       setConn]      = useState<ConnectionSnapshot | null>(null);
  const [fpsState,   setFpsState]  = useState<AdaptiveState | null>(null);
  const [pressure,   setPressure]  = useState<PressureLevel>("nominal");
  const [resilience, setRes]       = useState<ResilienceState | null>(null);
  const [liveFps,    setLiveFps]   = useState(60);
  const [dropped,    setDropped]   = useState(0);

  const fpsHistory  = useRef<number[]>([]);
  const latHistory  = useRef<number[]>([]);
  const memHistory  = useRef<number[]>([]);

  const [fpsHist,  setFpsHist]  = useState<number[]>([]);
  const [latHist,  setLatHist]  = useState<number[]>([]);
  const [memHist,  setMemHist]  = useState<number[]>([]);
  const [fpsLocked, setFpsLocked] = useState<FPSTarget | null>(null);
  const [animOff,   setAnimOff]   = useState(false);

  const push = <T,>(arr: React.MutableRefObject<T[]>, val: T, setter: (v: T[]) => void) => {
    arr.current.push(val);
    if (arr.current.length > MAX_HISTORY) arr.current.shift();
    setter([...arr.current]);
  };

  useEffect(() => {
    if (!open) return;
    const u1 = connectionMonitor.subscribe(snap => {
      setConn(snap);
      push(latHistory, snap.latencyMs, setLatHist);
    });
    const u2 = adaptiveFPS.subscribe(s => setFpsState(s));
    const u3 = memoryPressure.onStats(stats => setPressure(stats.pressure));
    const u4 = networkResilience.subscribe(setRes);
    const u5 = frameScheduler.onMetrics((fps, dropped) => {
      setLiveFps(fps);
      setDropped(dropped);
      push(fpsHistory, fps, setFpsHist);
    });

    const memTimer = setInterval(() => {
      const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      if (mem) push(memHistory, Math.round(mem.usedJSHeapSize / 1048576), setMemHist);
    }, 1000);

    return () => { u1(); u2(); u3(); u4(); u5(); clearInterval(memTimer); };
  }, [open]);

  const handleFPSLock = useCallback((fps: FPSTarget) => {
    if (fpsLocked === fps) {
      adaptiveFPS.releaseOverride();
      setFpsLocked(null);
    } else {
      adaptiveFPS.forceTargetFPS(fps);
      setFpsLocked(fps);
    }
  }, [fpsLocked]);

  const handleToggleAnim = useCallback(() => {
    if (animOff) {
      adaptiveFPS.releaseOverride();
    } else {
      adaptiveFPS.forceTargetFPS(10);
    }
    setAnimOff(v => !v);
  }, [animOff]);

  const handleReset = useCallback(() => {
    adaptiveFPS.releaseOverride();
    setFpsLocked(null);
    setAnimOff(false);
  }, []);

  const latColor  = colorForValue(conn?.latencyMs ?? 0, 0, 500);
  const fpsColor2 = colorForValue(liveFps, 0, 60, true);
  const memColor  = colorForValue(memHist[memHist.length - 1] ?? 0, 0, 512);
  const pressColor = { nominal: GREEN, moderate: AMBER, critical: RED }[pressure] ?? GREEN;
  const connColor  = { excellent: GREEN, good: BLUE, fair: AMBER, poor: RED, offline: "#6b7280" }[conn?.quality ?? "offline"];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="perf-cc"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: "fixed", inset: 0, zIndex: 99990,
            background: "rgba(0,0,0,0.75)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0, y: 24 }}
            animate={{ scale: 1,    opacity: 1, y: 0 }}
            exit={{   scale: 0.88, opacity: 0, y: 24 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={e => e.stopPropagation()}
            style={{
              width: "min(880px, 96vw)",
              maxHeight: "90vh",
              background: "#06060a",
              border: "1px solid #1a2030",
              borderRadius: 14,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              fontFamily: "'JetBrains Mono', monospace",
              boxShadow: `0 0 60px ${RED}18, 0 0 120px rgba(0,0,0,0.8)`,
            }}
          >
            {/* Header */}
            <div style={{
              padding: "14px 20px",
              background: "#08090e",
              borderBottom: "1px solid #0f1521",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ color: RED, display: "flex" }}><Gauge size={16} /></div>
                <span style={{ color: "#e2e8f0", fontWeight: 700, fontSize: 13, letterSpacing: "0.08em" }}>
                  PERFORMANCE COMMAND CENTER
                </span>
                <span style={{
                  fontSize: 9, padding: "2px 7px", borderRadius: 99,
                  background: `${RED}18`, border: `1px solid ${RED}30`, color: RED,
                  letterSpacing: "0.1em",
                }}>LIVE</span>
              </div>
              <button onClick={onClose} style={{
                color: "#475569", background: "none", border: "none", cursor: "pointer",
                padding: 4, display: "flex", transition: "color 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "#e2e8f0")}
              onMouseLeave={e => (e.currentTarget.style.color = "#475569")}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div style={{ overflow: "auto", padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Row 1: Live metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                <MetricCard title="Live FPS" value={String(liveFps)} unit="fps" color={fpsColor2} spark={fpsHist}>
                  <div style={{ fontSize: 9, color: "#475569" }}>dropped: {dropped} frames</div>
                </MetricCard>

                <MetricCard title="Latency" value={String(conn?.latencyMs ?? "—")} unit="ms" color={latColor} spark={latHist}>
                  <div style={{ fontSize: 9, color: "#475569" }}>p95: {conn?.p95Ms ?? "—"}ms · {conn?.effectiveType ?? "—"}</div>
                </MetricCard>

                <MetricCard title="JS Heap" value={String(memHist[memHist.length - 1] ?? "—")} unit="MB" color={memColor} spark={memHist}>
                  <div style={{ fontSize: 9, color: pressColor }}>pressure: {pressure}</div>
                </MetricCard>

                <MetricCard title="Connection" value={Q_SHORT[conn?.quality ?? "offline"]} color={connColor}>
                  <div style={{ fontSize: 9, color: "#475569" }}>
                    {conn?.downlink ? `${conn.downlink.toFixed(1)} Mbps · ` : ""}
                    {conn?.packetLoss ? `loss: ${(conn.packetLoss * 100).toFixed(0)}%` : "no loss"}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                    <motion.div
                      style={{ width: 6, height: 6, borderRadius: "50%", background: connColor }}
                      animate={{ opacity: [1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                    <span style={{ fontSize: 9, color: connColor }}>{conn?.online ? "ONLINE" : "OFFLINE"}</span>
                  </div>
                </MetricCard>
              </div>

              {/* Row 2: Adaptive system */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>

                {/* FPS Control */}
                <div style={{
                  background: "#0a0f1a", border: "1px solid #0f1521", borderRadius: 8,
                  padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Zap size={12} color={RED} />
                    <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.1em" }}>FPS CONTROL</span>
                    {fpsLocked && (
                      <span style={{
                        fontSize: 8, padding: "1px 6px", borderRadius: 99,
                        background: `${AMBER}18`, color: AMBER, border: `1px solid ${AMBER}30`,
                      }}>LOCKED</span>
                    )}
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {([10, 15, 30, 60, 120, 144] as FPSTarget[]).map(fps => (
                      <FPSButton
                        key={fps} fps={fps}
                        current={fpsLocked ?? (fpsState?.targetFPS ?? 60)}
                        onClick={() => handleFPSLock(fps)}
                      />
                    ))}
                  </div>

                  <div style={{ fontSize: 9, color: "#334155" }}>
                    auto: {fpsState?.reason ?? "—"} · native: {fpsState?.nativeHz ?? "—"}Hz
                  </div>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      onClick={handleToggleAnim}
                      style={{
                        flex: 1, padding: "5px 8px", borderRadius: 4,
                        background: animOff ? `${AMBER}15` : "transparent",
                        border: `1px solid ${animOff ? AMBER : "#1e293b"}`,
                        color: animOff ? AMBER : "#475569",
                        fontSize: 9, cursor: "pointer", fontFamily: "monospace",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      }}
                    >
                      <Eye size={10} />
                      {animOff ? "ANIM OFF" : "ANIM ON"}
                    </button>
                    <button
                      onClick={handleReset}
                      style={{
                        flex: 1, padding: "5px 8px", borderRadius: 4,
                        background: "transparent", border: "1px solid #1e293b",
                        color: "#475569", fontSize: 9, cursor: "pointer", fontFamily: "monospace",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                      }}
                    >
                      <RefreshCw size={10} />
                      AUTO RESET
                    </button>
                  </div>
                </div>

                {/* System health */}
                <div style={{
                  background: "#0a0f1a", border: "1px solid #0f1521", borderRadius: 8,
                  padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Shield size={12} color={VIOLET} />
                    <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.1em" }}>SYSTEM HEALTH</span>
                  </div>

                  {[
                    { label: "Memory Pressure", value: pressure, color: pressColor },
                    { label: "Thermal State",   value: fpsState?.thermalState ?? "—", color: fpsState?.thermalState === "critical" ? RED : fpsState?.thermalState === "serious" ? AMBER : GREEN },
                    { label: "Battery",         value: fpsState?.batteryLevel !== null && fpsState?.batteryLevel !== undefined ? `${fpsState.batteryLevel}%${fpsState.batteryCharging ? " ⚡" : ""}` : "—", color: BLUE },
                    { label: "DPR",             value: fpsState?.dpr?.toFixed(1) ?? "—", color: "#94a3b8" },
                    { label: "Queued Requests", value: String(resilience?.queued ?? 0), color: (resilience?.queued ?? 0) > 0 ? AMBER : GREEN },
                    { label: "Replayed",        value: String(resilience?.totalReplayed ?? 0), color: GREEN },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      fontSize: 10, borderBottom: "1px solid #0d1117", paddingBottom: 4,
                    }}>
                      <span style={{ color: "#475569" }}>{label}</span>
                      <span style={{ color, fontWeight: 700 }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 3: Latency spark full-width */}
              <div style={{
                background: "#0a0f1a", border: "1px solid #0f1521", borderRadius: 8,
                padding: "12px 14px",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Activity size={12} color={BLUE} />
                    <span style={{ fontSize: 10, color: "#94a3b8", letterSpacing: "0.1em" }}>LATENCY HISTORY (60s)</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, fontSize: 9, color: "#475569" }}>
                    <span>avg: <span style={{ color: latColor }}>{conn?.latencyMs ?? "—"}ms</span></span>
                    <span>p95: <span style={{ color: AMBER }}>{conn?.p95Ms ?? "—"}ms</span></span>
                    <span>fails: <span style={{ color: conn?.consecutiveFails ? RED : GREEN }}>{conn?.consecutiveFails ?? 0}</span></span>
                  </div>
                </div>
                <SparkLine data={latHist.length > 0 ? latHist : [0]} color={BLUE} height={48} width={800} />
              </div>

            </div>

            {/* Footer */}
            <div style={{
              padding: "8px 18px",
              background: "#08090e",
              borderTop: "1px solid #0f1521",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              fontSize: 9, color: "#334155",
            }}>
              <span>KaliGPT · Performance Command Center v4.0</span>
              <div style={{ display: "flex", gap: 16 }}>
                <span>frame budget: {fpsState ? (1000 / fpsState.targetFPS).toFixed(1) : "—"}ms</span>
                <span>manual: {fpsLocked ? `${fpsLocked}fps` : "auto"}</span>
                <span>anim: {animOff ? "REDUCED" : "FULL"}</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const Q_SHORT: Record<string, string> = {
  excellent: "EXCELLENT",
  good:      "GOOD",
  fair:      "FAIR",
  poor:      "POOR",
  offline:   "OFFLINE",
};
