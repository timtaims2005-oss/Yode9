/**
 * SystemHealthBar — Real-time system health indicator (bottom-left strip)
 * Shows: connection latency | FPS | memory | active requests | rate limit
 */
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { connectionMonitor, type ConnectionSnapshot } from "@/lib/connection-monitor";
import { perfMonitor, type PerfSnapshot } from "@/lib/perf-monitor";
import { rateLimiter } from "@/lib/rate-limiter";
import { abortRegistry } from "@/lib/abort-registry";

const Q_COLOR: Record<string, string> = {
  excellent: "#22c55e",
  good:      "#3b82f6",
  fair:      "#f59e0b",
  poor:      "#ef4444",
  offline:   "#6b7280",
};

function Dot({ color, pulse }: { color: string; pulse?: boolean }) {
  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: color,
        boxShadow: `0 0 6px ${color}`,
        display: "inline-block",
      }} />
      {pulse && (
        <motion.span
          style={{
            position: "absolute", inset: -2,
            borderRadius: "50%",
            border: `1px solid ${color}`,
          }}
          animate={{ scale: [1, 1.8], opacity: [0.7, 0] }}
          transition={{ duration: 1.4, repeat: Infinity }}
        />
      )}
    </span>
  );
}

function Pill({ label, value, color, title }: { label: string; value: string; color: string; title?: string }) {
  return (
    <span
      title={title}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: "2px 7px", borderRadius: 99,
        background: `${color}10`,
        border: `1px solid ${color}20`,
        fontSize: 9, fontFamily: "monospace", fontWeight: 700,
        letterSpacing: "0.06em",
        cursor: "default",
        userSelect: "none",
      }}
    >
      <span style={{ color: `${color}88` }}>{label}</span>
      <span style={{ color }}>{value}</span>
    </span>
  );
}

export function SystemHealthBar() {
  const [conn,  setConn]  = useState<ConnectionSnapshot | null>(null);
  const [perf,  setPerf]  = useState<PerfSnapshot | null>(null);
  const [rl,    setRl]    = useState<Record<string, { remaining: number; queue: number }>>({});
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const unsub1 = connectionMonitor.subscribe(setConn);
    const unsub2 = perfMonitor.subscribe(setPerf);
    const id = setInterval(() => {
      setRl(rateLimiter.summary());
      setActive(abortRegistry.activeCount);
    }, 2000);
    return () => { unsub1(); unsub2(); clearInterval(id); };
  }, []);

  const toggleExpand = useCallback(() => setExpanded(v => !v), []);

  if (!conn && !perf) return null;

  const qColor  = Q_COLOR[conn?.quality ?? "offline"];
  const latency = conn ? `${Math.round(conn.latencyMs)}ms` : "—";
  const fps     = perf ? `${perf.fps}` : "—";
  const memPct  = perf ? `${Math.round(perf.memoryPct * 100)}%` : "—";
  const memOk   = perf ? perf.memoryPct < 0.75 : true;
  const fpsOk   = perf ? !perf.fpsDrop : true;

  return (
    <div
      style={{
        position: "fixed", bottom: 0, left: 0,
        zIndex: 9000,
        display: "flex", alignItems: "flex-end",
        pointerEvents: "none",
      }}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        transition={{ delay: 2, duration: 0.4 }}
        style={{ pointerEvents: "auto" }}
      >
        {/* Main bar */}
        <div
          onClick={toggleExpand}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "4px 10px",
            background: "rgba(4,6,9,0.88)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderBottom: "none",
            borderLeft: "none",
            borderRadius: "0 8px 0 0",
            backdropFilter: "blur(12px)",
            cursor: "pointer",
            userSelect: "none",
          }}
        >
          {/* Connection */}
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Dot color={qColor} pulse={conn?.quality === "excellent"} />
            <span style={{ fontSize: 9, fontFamily: "monospace", color: qColor, fontWeight: 700 }}>
              {latency}
            </span>
          </span>

          <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.08)" }} />

          {/* FPS */}
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>FPS</span>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: fpsOk ? "#22c55e" : "#ef4444", fontWeight: 700 }}>
              {fps}
            </span>
          </span>

          <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.08)" }} />

          {/* Memory */}
          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "0.05em" }}>MEM</span>
            <span style={{ fontSize: 9, fontFamily: "monospace", color: memOk ? "#3b82f6" : "#f59e0b", fontWeight: 700 }}>
              {memPct}
            </span>
          </span>

          {active > 0 && (
            <>
              <span style={{ width: 1, height: 10, background: "rgba(255,255,255,0.08)" }} />
              <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <motion.span
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ fontSize: 8, fontFamily: "monospace", color: "#a78bfa", letterSpacing: "0.05em" }}
                >
                  REQ
                </motion.span>
                <span style={{ fontSize: 9, fontFamily: "monospace", color: "#a78bfa", fontWeight: 700 }}>
                  {active}
                </span>
              </span>
            </>
          )}

          <span style={{
            fontSize: 7, color: "rgba(255,255,255,0.2)",
            fontFamily: "monospace", marginLeft: 2,
          }}>
            {expanded ? "▼" : "▲"}
          </span>
        </div>

        {/* Expanded panel */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{
                padding: "8px 10px",
                background: "rgba(4,6,9,0.96)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderBottom: "none",
                borderLeft: "none",
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                <span style={{ fontSize: 8, fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "0.2em" }}>
                  SYSTEM HEALTH
                </span>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  <Pill label="PING"  value={latency}          color={qColor}    title="Network latency" />
                  <Pill label="CONN"  value={conn?.quality.toUpperCase() ?? "—"} color={qColor} title="Connection quality" />
                  <Pill label="FPS"   value={fps}              color={fpsOk  ? "#22c55e" : "#ef4444"} title="Frames per second" />
                  <Pill label="MEM"   value={`${Math.round(perf?.memoryMB ?? 0)} MB`} color={memOk ? "#3b82f6" : "#f59e0b"} title="JS heap usage" />
                  <Pill label="REQ"   value={`${active} active`}  color="#a78bfa" title="In-flight requests" />
                  <Pill label="TPS"   value={`${Math.round(perf?.tps ?? 0)}/s`} color="#00e5ff" title="Tokens per second" />
                  <Pill label="TOTAL" value={`${perf?.totalTokens?.toLocaleString() ?? 0} tok`} color="#f59e0b" title="Total tokens this session" />
                  {conn?.effectiveType && conn.effectiveType !== "unknown" && (
                    <Pill label="NET"  value={conn.effectiveType.toUpperCase()} color="#6b7280" title="Effective connection type" />
                  )}
                  {conn?.downlink ? (
                    <Pill label="BW" value={`${conn.downlink.toFixed(1)} Mbps`} color="#22c55e" title="Estimated bandwidth" />
                  ) : null}
                </div>

                {/* Rate limiter summary */}
                {Object.keys(rl).length > 0 && (
                  <>
                    <span style={{ fontSize: 7, fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.15em", marginTop: 2 }}>
                      RATE LIMITS
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {Object.entries(rl).map(([prov, { remaining, queue }]) => (
                        <Pill
                          key={prov}
                          label={prov.toUpperCase()}
                          value={`${remaining}t${queue > 0 ? ` Q${queue}` : ""}`}
                          color={remaining > 3 ? "#22c55e" : remaining > 0 ? "#f59e0b" : "#ef4444"}
                          title={`${prov}: ${remaining} tokens remaining, ${queue} queued`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
