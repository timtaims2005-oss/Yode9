import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, Network, Activity, Package, BarChart3, X, Monitor,
  Layers, Radar, Wifi, Cpu, Shield
} from "lucide-react";
import { CyberGlobeWidget } from "./CyberGlobeWidget";
import { InteractiveGlobeWidget } from "./InteractiveGlobeWidget";
import { NetworkTopologyWidget } from "./NetworkTopologyWidget";
import { NetworkTrafficPanel } from "./NetworkTrafficPanel";
import { NetworkPacketInspector } from "./NetworkPacketInspector";
import { ModelBenchmarkPanel } from "./ModelBenchmarkPanel";

/* ══════════════════════════════════════════════════════════════════
   CYBER WIDGETS DOCK
   A single futuristic 3D button that opens a full holographic
   overlay containing all 6 cyber-intelligence panels.
══════════════════════════════════════════════════════════════════ */

const PANELS = [
  { id: "globe-threat", label: "GLOBAL THREAT MAP", icon: Globe, color: "#e21227", desc: "Live attack origins" },
  { id: "globe-map",    label: "GLOBAL MAP",         icon: Radar,  color: "#3b82f6", desc: "Interactive 3D globe" },
  { id: "topology",     label: "NET TOPOLOGY",        icon: Network,color: "#a855f7", desc: "Network graph" },
  { id: "traffic",      label: "TRAFFIC ANALYZER",   icon: Activity,color: "#22c55e", desc: "Real-time packets" },
  { id: "packets",      label: "PACKET INSPECTOR",   icon: Package, color: "#f59e0b", desc: "Wireshark-style" },
  { id: "benchmark",    label: "MODEL BENCHMARK",    icon: BarChart3,color: "#06b6d4", desc: "LLM leaderboard" },
];

/* Neon pulse ring around the dock button */
function PulseRing({ color }: { color: string }) {
  return (
    <motion.div
      style={{
        position: "absolute", inset: "-6px", borderRadius: "50%",
        border: `1.5px solid ${color}`,
        pointerEvents: "none",
      }}
      animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.25, 1] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* Small spinning orbit ring */
function OrbitRing() {
  return (
    <motion.div
      style={{
        position: "absolute", inset: "-12px", borderRadius: "50%",
        border: "1px dashed rgba(0,200,255,0.3)",
        pointerEvents: "none",
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
    />
  );
}

/* ── The floating trigger button ── */
function DockButton({ onClick }: { onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1200);
    return () => clearInterval(id);
  }, []);

  const activeColor = PANELS[tick % PANELS.length].color;

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.5, type: "spring", damping: 18, stiffness: 200 }}
      whileTap={{ scale: 0.92 }}
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 95,
        width: "60px",
        height: "60px",
        borderRadius: "50%",
        border: `2px solid ${activeColor}60`,
        background: `radial-gradient(circle at 35% 35%, rgba(255,255,255,0.07) 0%, rgba(6,6,10,0.97) 70%)`,
        backdropFilter: "blur(20px)",
        boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 8px 40px rgba(0,0,0,0.8), 0 0 30px ${activeColor}22`,
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "2px",
        transition: "border-color 0.6s ease, box-shadow 0.6s ease",
      }}
    >
      <PulseRing color={activeColor} />
      <OrbitRing />

      {/* Top sheen */}
      <div style={{
        position: "absolute", top: 0, left: "15%", right: "15%", height: "40%",
        background: "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%)",
        borderRadius: "50% 50% 0 0",
        pointerEvents: "none",
      }} />

      {/* Icon cluster */}
      <motion.div
        animate={{ rotateY: hovered ? 180 : 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}
      >
        <Monitor style={{ width: "18px", height: "18px", color: activeColor, filter: `drop-shadow(0 0 6px ${activeColor})`, transition: "color 0.6s" }} />
        <span style={{
          fontSize: "6px", fontFamily: "monospace", fontWeight: 800,
          color: activeColor, letterSpacing: "1px",
          transition: "color 0.6s",
          textShadow: `0 0 8px ${activeColor}`,
        }}>HUD</span>
      </motion.div>

      {/* Scan line */}
      <motion.div
        style={{
          position: "absolute", left: 0, right: 0, height: "1px",
          background: `linear-gradient(90deg, transparent, ${activeColor}80, transparent)`,
          pointerEvents: "none",
          transition: "background 0.6s",
        }}
        animate={{ top: ["20%", "80%", "20%"] }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />

      {/* Tooltip */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, x: 10, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute", right: "70px", top: "50%", transform: "translateY(-50%)",
              background: "rgba(6,6,10,0.97)",
              border: `1px solid ${activeColor}40`,
              borderRadius: "8px",
              padding: "6px 12px",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              backdropFilter: "blur(16px)",
              boxShadow: `0 4px 20px rgba(0,0,0,0.6), 0 0 12px ${activeColor}18`,
            }}
          >
            <span style={{ fontSize: "10px", fontFamily: "monospace", color: "rgba(255,255,255,0.8)", fontWeight: 700, letterSpacing: "1px" }}>
              OPEN CYBER HUD
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ── Corner bracket decorations ── */
function CornerBrackets({ color }: { color: string }) {
  const style = (pos: React.CSSProperties): React.CSSProperties => ({
    position: "absolute", width: "20px", height: "20px",
    border: `2px solid ${color}60`,
    ...pos,
    pointerEvents: "none",
  });
  return (
    <>
      <div style={style({ top: 0, left: 0, borderRight: "none", borderBottom: "none" })} />
      <div style={style({ top: 0, right: 0, borderLeft: "none", borderBottom: "none" })} />
      <div style={style({ bottom: 0, left: 0, borderRight: "none", borderTop: "none" })} />
      <div style={style({ bottom: 0, right: 0, borderLeft: "none", borderTop: "none" })} />
    </>
  );
}

/* ── Widget card wrapper with 3D tilt on hover ── */
function WidgetCard({
  id, label, icon: Icon, color, desc, children,
}: {
  id: string; label: string; icon: any; color: string; desc: string; children: React.ReactNode;
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width - 0.5) * 12;
    const y = ((e.clientY - r.top) / r.height - 0.5) * -12;
    setTilt({ x, y });
  }
  function resetTilt() { setTilt({ x: 0, y: 0 }); }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={resetTilt}
      animate={{ rotateX: tilt.y, rotateY: tilt.x }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      style={{
        perspective: "800px",
        position: "relative",
        borderRadius: "12px",
        overflow: "hidden",
        border: `1px solid ${color}25`,
        background: `linear-gradient(135deg, rgba(6,6,10,0.98) 0%, rgba(12,12,22,0.96) 100%)`,
        boxShadow: `0 4px 30px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), 0 0 20px ${color}10`,
        minHeight: "200px",
        display: "flex",
        flexDirection: "column",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Top accent line */}
      <div style={{
        height: "2px",
        background: `linear-gradient(90deg, transparent, ${color}90, transparent)`,
        flexShrink: 0,
      }} />

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: "8px",
        padding: "8px 12px",
        borderBottom: `1px solid ${color}14`,
        background: `${color}06`,
        flexShrink: 0,
      }}>
        <Icon style={{ width: "13px", height: "13px", color, filter: `drop-shadow(0 0 5px ${color})`, flexShrink: 0 }} />
        <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 800, color, letterSpacing: "1.5px", flex: 1 }}>{label}</span>
        <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.5px" }}>{desc}</span>

        {/* Live dot */}
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          style={{ width: "5px", height: "5px", borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {children}
      </div>

      {/* Corner brackets */}
      <CornerBrackets color={color} />
    </motion.div>
  );
}

/* ── Main overlay ── */
function CyberHUDOverlay({ onClose }: { onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { const t = setTimeout(() => setLoaded(true), 100); return () => clearTimeout(t); }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(2,2,6,0.93)",
        backdropFilter: "blur(24px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* Scanline overlay */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.012) 2px, rgba(255,255,255,0.012) 4px)",
        zIndex: 0,
      }} />

      {/* Animated grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `linear-gradient(rgba(0,200,255,0.025) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(0,200,255,0.025) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      {/* Corner glow blobs */}
      <div style={{ position: "absolute", top: "-120px", left: "-120px", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(226,18,39,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "-120px", right: "-120px", width: "400px", height: "400px", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* ── Header ── */}
      <div style={{
        position: "relative", zIndex: 2,
        display: "flex", alignItems: "center", gap: "12px",
        padding: "14px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(6,6,10,0.7)",
        flexShrink: 0,
      }}>
        {/* Logo mark */}
        <div style={{
          width: "36px", height: "36px", borderRadius: "10px", flexShrink: 0,
          background: "linear-gradient(135deg, rgba(226,18,39,0.2), rgba(59,130,246,0.15))",
          border: "1px solid rgba(226,18,39,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 20px rgba(226,18,39,0.15)",
        }}>
          <Layers style={{ width: "18px", height: "18px", color: "#e21227", filter: "drop-shadow(0 0 6px #e21227)" }} />
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "13px", fontFamily: "monospace", fontWeight: 900, color: "#fff", letterSpacing: "3px" }}>
              CYBER HUD
            </span>
            <span style={{
              fontSize: "7px", fontFamily: "monospace", fontWeight: 700,
              color: "#22c55e", letterSpacing: "1px",
              padding: "2px 6px", borderRadius: "3px",
              background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)",
            }}>LIVE</span>
          </div>
          <div style={{ fontSize: "9px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "1px", marginTop: "1px" }}>
            6 INTELLIGENCE PANELS · REAL-TIME FEED
          </div>
        </div>

        {/* Panel indicators */}
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {PANELS.map(p => (
            <motion.div
              key={p.id}
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, delay: Math.random() * 2 }}
              style={{ width: "6px", height: "6px", borderRadius: "50%", background: p.color, boxShadow: `0 0 6px ${p.color}` }}
            />
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "34px", height: "34px", borderRadius: "8px",
            background: "rgba(226,18,39,0.08)",
            border: "1px solid rgba(226,18,39,0.2)",
            color: "rgba(255,255,255,0.5)",
            cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s",
            flexShrink: 0,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.2)"; (e.currentTarget as HTMLButtonElement).style.color = "#fff"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.5)"; }}
        >
          <X style={{ width: "16px", height: "16px" }} />
        </button>
      </div>

      {/* ── 6-panel grid ── */}
      <div style={{
        position: "relative", zIndex: 2,
        flex: 1,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(2, 1fr)",
        gap: "10px",
        padding: "12px",
        overflow: "hidden",
      }}>
        {loaded && (
          <>
            {/* Card 1 — Cyber Globe (Threat Map) */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.05, duration: 0.35, ease: "easeOut" }}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <WidgetCard id="globe-threat" label="GLOBAL THREAT MAP" icon={Globe} color="#e21227" desc="Live attack origins">
                <div style={{ position: "relative", height: "100%", minHeight: "180px", overflow: "hidden" }}>
                  <CyberGlobeWidget embedded />
                </div>
              </WidgetCard>
            </motion.div>

            {/* Card 2 — Interactive Globe */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.10, duration: 0.35, ease: "easeOut" }}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <WidgetCard id="globe-map" label="GLOBAL MAP" icon={Radar} color="#3b82f6" desc="Interactive 3D globe">
                <div style={{ position: "relative", height: "100%", minHeight: "180px", overflow: "hidden" }}>
                  <InteractiveGlobeWidget embedded />
                </div>
              </WidgetCard>
            </motion.div>

            {/* Card 3 — Network Topology */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.35, ease: "easeOut" }}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <WidgetCard id="topology" label="NET TOPOLOGY" icon={Network} color="#a855f7" desc="Network graph">
                <div style={{ position: "relative", height: "100%", minHeight: "180px", overflow: "hidden" }}>
                  <NetworkTopologyWidget embedded />
                </div>
              </WidgetCard>
            </motion.div>

            {/* Card 4 — Network Traffic */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.20, duration: 0.35, ease: "easeOut" }}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <WidgetCard id="traffic" label="TRAFFIC ANALYZER" icon={Activity} color="#22c55e" desc="Real-time packets">
                <div style={{ position: "relative", height: "100%", minHeight: "180px", overflow: "hidden" }}>
                  <NetworkTrafficPanel embedded />
                </div>
              </WidgetCard>
            </motion.div>

            {/* Card 5 — Packet Inspector */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.25, duration: 0.35, ease: "easeOut" }}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <WidgetCard id="packets" label="PACKET INSPECTOR" icon={Package} color="#f59e0b" desc="Wireshark-style">
                <div style={{ position: "relative", height: "100%", minHeight: "180px", overflow: "hidden" }}>
                  <NetworkPacketInspector embedded />
                </div>
              </WidgetCard>
            </motion.div>

            {/* Card 6 — Model Benchmark */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.30, duration: 0.35, ease: "easeOut" }}
              style={{ display: "flex", flexDirection: "column" }}
            >
              <WidgetCard id="benchmark" label="MODEL BENCHMARK" icon={BarChart3} color="#06b6d4" desc="LLM leaderboard">
                <div style={{ position: "relative", height: "100%", minHeight: "180px", overflow: "hidden" }}>
                  <ModelBenchmarkPanel embedded />
                </div>
              </WidgetCard>
            </motion.div>
          </>
        )}
      </div>

      {/* ── Footer status bar ── */}
      <div style={{
        position: "relative", zIndex: 2,
        display: "flex", alignItems: "center", gap: "16px",
        padding: "8px 20px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(6,6,10,0.6)",
        flexShrink: 0,
      }}>
        {[
          { icon: Wifi, label: "FEEDS", val: "6/6", color: "#22c55e" },
          { icon: Cpu, label: "LATENCY", val: "12ms", color: "#3b82f6" },
          { icon: Shield, label: "THREATS", val: "ACTIVE", color: "#e21227" },
        ].map(({ icon: Icon, label, val, color }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Icon style={{ width: "10px", height: "10px", color }} />
            <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "1px" }}>{label}</span>
            <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color, letterSpacing: "0.5px" }}>{val}</span>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.15)", letterSpacing: "1px" }}>
          ESC TO CLOSE · CTRL+SHIFT+H TO TOGGLE
        </span>
      </div>
    </motion.div>
  );
}

/* ── Public export ── */
export function CyberWidgetsDock() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setOpen(v => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <DockButton onClick={() => setOpen(true)} />
      <AnimatePresence>
        {open && <CyberHUDOverlay onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}
