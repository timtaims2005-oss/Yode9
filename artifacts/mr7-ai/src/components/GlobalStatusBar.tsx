import { useEffect, useState, useRef } from "react";
import { subscribePerfState, startPerfEngine } from "@/lib/perf144";
import type { PerfState } from "@/lib/perf144";
import { motion, AnimatePresence } from "framer-motion";

/** Always-on bottom status bar: live FPS · memory · network · uptime · threat level */
export function GlobalStatusBar() {
  const [perf, setPerf] = useState<PerfState | null>(null);
  const [uptime, setUptime] = useState(0);
  const [threatPulse, setThreatPulse] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startPerfEngine();
    const unsub = subscribePerfState(setPerf);
    return () => { unsub(); };
  }, []);

  // Uptime counter
  useEffect(() => {
    const id = setInterval(() => {
      setUptime(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Random threat pulse
  useEffect(() => {
    const id = setInterval(() => {
      setThreatPulse(Math.random() > 0.7);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  function fmtUptime(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;
  }

  const fps = perf?.fps ?? 0;
  const fpsCol = fps >= 120 ? "#22c55e" : fps >= 60 ? "#fbbf24" : fps > 0 ? "#e21227" : "#334155";
  const memMB  = perf?.memMB ?? 0;
  const netType = perf?.netType ?? "—";
  const frameMs = perf?.frameMs ?? 0;
  const frameBudget144 = 6.94;
  const budgetPct = Math.min((frameMs / frameBudget144) * 100, 100);
  const budgetCol = frameMs <= frameBudget144 ? "#22c55e" : frameMs <= 16.7 ? "#fbbf24" : "#e21227";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: 22,
        zIndex: 9998,
        background: "rgba(2,8,16,0.88)",
        borderTop: "1px solid rgba(0,229,255,0.10)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        paddingLeft: 12,
        paddingRight: 12,
        gap: 0,
        userSelect: "none",
        fontFamily: "monospace",
        fontSize: 9,
      }}
    >
      {/* KaliGPT label */}
      <span style={{ color: "#e21227", fontWeight: 800, letterSpacing: 1.5, marginRight: 10, fontSize: 8 }}>
        KALIGPT
      </span>

      <Divider />

      {/* FPS */}
      <Metric label="FPS" value={fps > 0 ? `${fps}` : "—"} color={fpsCol} glow />

      <Divider />

      {/* 144Hz target */}
      <span style={{ color: "rgba(0,229,255,0.6)", fontSize: 8 }}>⚡144Hz</span>

      <Divider />

      {/* Frame budget bar */}
      <span style={{ color: "rgba(255,255,255,0.3)", marginRight: 4 }}>FRAME</span>
      <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginRight: 6 }}>
        <motion.div
          animate={{ width: `${budgetPct}%` }}
          transition={{ duration: 0.2 }}
          style={{ height: "100%", background: budgetCol, borderRadius: 2 }}
        />
      </div>
      <span style={{ color: budgetCol, fontSize: 8, marginRight: 8 }}>{frameMs}ms</span>

      <Divider />

      {/* Memory */}
      {memMB > 0 && (
        <>
          <Metric label="MEM" value={`${memMB}MB`} color="#a78bfa" />
          <Divider />
        </>
      )}

      {/* Network */}
      <Metric label="NET" value={netType.toUpperCase()} color="#22d3ee" />

      <Divider />

      {/* RTT */}
      {(perf?.rtt ?? 0) > 0 && (
        <>
          <Metric label="RTT" value={`${perf!.rtt}ms`} color={perf!.rtt < 50 ? "#22c55e" : "#fbbf24"} />
          <Divider />
        </>
      )}

      {/* Uptime */}
      <Metric label="UP" value={fmtUptime(uptime)} color="rgba(255,255,255,0.4)" />

      <Divider />

      {/* GPU status */}
      <span style={{ color: "#00e5ff", fontSize: 8 }}>◉ GPU</span>

      <Divider />

      {/* WebGL particle badge */}
      <span style={{ color: "#a78bfa", fontSize: 8 }}>WebGL·5K</span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Threat level */}
      <AnimatePresence>
        {threatPulse && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: [1, 0.4, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, repeat: 2 }}
            style={{ color: "#e21227", fontSize: 8, marginRight: 8, fontWeight: 700 }}
          >
            ⚠ THREAT DETECTED
          </motion.span>
        )}
      </AnimatePresence>

      {/* ONLINE indicator */}
      <motion.span
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{ color: "#22c55e", fontSize: 8 }}
      >
        ● ONLINE
      </motion.span>
    </div>
  );
}

function Metric({ label, value, color, glow }: { label: string; value: string; color: string; glow?: boolean }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 3, marginRight: 8 }}>
      <span style={{ color: "rgba(255,255,255,0.28)", fontSize: 8 }}>{label}</span>
      <span style={{
        color,
        fontWeight: 700,
        fontSize: 9,
        textShadow: glow ? `0 0 6px ${color}` : undefined,
      }}>{value}</span>
    </span>
  );
}

function Divider() {
  return <span style={{ color: "rgba(255,255,255,0.08)", margin: "0 8px 0 0" }}>│</span>;
}
