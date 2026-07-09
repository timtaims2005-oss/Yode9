/**
 * OfflineQueueBanner — Smart connection status banner.
 * Appears when offline/poor, shows queued request count,
 * reconnection countdown, and manual retry button.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { connectionMonitor, type ConnectionSnapshot } from "@/lib/connection-monitor";
import { networkResilience, type ResilienceState } from "@/lib/network-resilience";
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle, Clock, Database } from "lucide-react";

const Q_ICON = {
  excellent: <Wifi size={13} />,
  good:      <Wifi size={13} />,
  fair:      <AlertTriangle size={13} />,
  poor:      <WifiOff size={13} />,
  offline:   <WifiOff size={13} />,
};

const Q_LABEL: Record<string, string> = {
  excellent: "Excellent",
  good:      "Good",
  fair:      "Fair",
  poor:      "Poor",
  offline:   "Offline",
};

const Q_COLOR: Record<string, string> = {
  excellent: "#22c55e",
  good:      "#3b82f6",
  fair:      "#f59e0b",
  poor:      "#ef4444",
  offline:   "#6b7280",
};

const RECONNECT_INTERVAL = 12;

export function OfflineQueueBanner() {
  const [conn,       setConn]       = useState<ConnectionSnapshot | null>(null);
  const [resilience, setResilience] = useState<ResilienceState | null>(null);
  const [countdown,  setCountdown]  = useState(RECONNECT_INTERVAL);
  const [replaying,  setReplaying]  = useState(false);
  const [lastResult, setLastResult] = useState<"success" | "fail" | null>(null);
  const countRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const u1 = connectionMonitor.subscribe(setConn);
    const u2 = networkResilience.subscribe(setResilience);
    return () => { u1(); u2(); };
  }, []);

  const visible = conn && (conn.quality === "poor" || conn.quality === "offline" || conn.quality === "fair");

  useEffect(() => {
    if (!visible) { setCountdown(RECONNECT_INTERVAL); return; }
    if (countRef.current) clearInterval(countRef.current);
    setCountdown(RECONNECT_INTERVAL);
    countRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          void handleRetry();
          return RECONNECT_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countRef.current) clearInterval(countRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleRetry = useCallback(async () => {
    if (replaying) return;
    setReplaying(true);
    setLastResult(null);
    try {
      const results = await networkResilience.replayQueue();
      const allOk = results.every(r => r.success);
      setLastResult(results.length === 0 ? "success" : allOk ? "success" : "fail");
    } catch {
      setLastResult("fail");
    } finally {
      setReplaying(false);
      setCountdown(RECONNECT_INTERVAL);
    }
  }, [replaying]);

  if (!conn) return null;

  const color = Q_COLOR[conn.quality] ?? "#6b7280";
  const queuedCount = resilience?.queued ?? 0;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="offline-banner"
          initial={{ y: -52, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{   y: -52, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 99999,
            height: 36,
            background: `linear-gradient(90deg, rgba(2,8,18,0.97) 0%, ${color}14 50%, rgba(2,8,18,0.97) 100%)`,
            borderBottom: `1px solid ${color}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
          }}
        >
          {/* Left: status */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <motion.div
              style={{ color, display: "flex", alignItems: "center" }}
              animate={{ opacity: conn.quality === "offline" ? [1, 0.3] : 1 }}
              transition={{ duration: 0.8, repeat: conn.quality === "offline" ? Infinity : 0 }}
            >
              {Q_ICON[conn.quality]}
            </motion.div>

            <span style={{ color, fontWeight: 700, letterSpacing: "0.08em" }}>
              {Q_LABEL[conn.quality].toUpperCase()}
            </span>

            <span style={{ color: "#475569", fontSize: 10 }}>·</span>

            <span style={{ color: "#94a3b8", fontSize: 10 }}>
              {conn.quality === "offline" ? "No internet" : `${conn.latencyMs}ms · ${conn.effectiveType}`}
            </span>

            {/* Queue indicator */}
            {queuedCount > 0 && (
              <>
                <span style={{ color: "#475569", fontSize: 10 }}>·</span>
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#f59e0b" }}>
                  <Database size={10} />
                  <span style={{ fontSize: 10 }}>{queuedCount} request{queuedCount > 1 ? "s" : ""} queued</span>
                </div>
              </>
            )}
          </div>

          {/* Center: animated bar */}
          <div style={{ flex: 1, margin: "0 16px", height: 1, overflow: "hidden", position: "relative" }}>
            <motion.div
              style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(90deg, transparent, ${color}60, transparent)`,
              }}
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
            />
            <div style={{ position: "absolute", inset: 0, background: `${color}20` }} />
          </div>

          {/* Right: countdown + retry */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Result flash */}
            <AnimatePresence>
              {lastResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  style={{
                    color: lastResult === "success" ? "#22c55e" : "#ef4444",
                    display: "flex", alignItems: "center", gap: 4, fontSize: 10,
                  }}
                >
                  <CheckCircle size={11} />
                  <span>{lastResult === "success" ? "Synced" : "Failed"}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Countdown */}
            {!replaying && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#64748b", fontSize: 10 }}>
                <Clock size={10} />
                <span>retry in {countdown}s</span>
              </div>
            )}

            {/* Retry button */}
            <button
              onClick={() => void handleRetry()}
              disabled={replaying}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "3px 10px", borderRadius: 4,
                background: replaying ? "#1e293b" : `${color}18`,
                border: `1px solid ${color}40`,
                color: replaying ? "#475569" : color,
                fontSize: 10, fontWeight: 700, fontFamily: "monospace",
                cursor: replaying ? "not-allowed" : "pointer",
                letterSpacing: "0.05em",
                transition: "all 0.2s",
              }}
            >
              <motion.div
                animate={{ rotate: replaying ? 360 : 0 }}
                transition={{ duration: 0.8, repeat: replaying ? Infinity : 0, ease: "linear" }}
              >
                <RefreshCw size={10} />
              </motion.div>
              {replaying ? "RETRYING…" : "RETRY NOW"}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
