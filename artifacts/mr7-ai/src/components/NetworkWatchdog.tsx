import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * NetworkWatchdog — Real-time connection monitor
 * · Tracks online/offline, RTT latency, downlink speed via navigator.connection
 * · Shows a cyber-styled alert banner on connection degradation
 * · Auto-hides when connection recovers
 * · Zero overhead when healthy
 */

type NetStatus = "good" | "slow" | "offline" | "recovering";

const RTT_WARN  = 200;
const RTT_BAD   = 500;
const DL_WARN   = 1;   // Mbps

export function NetworkWatchdog() {
  const [status, setStatus] = useState<NetStatus>("good");
  const [info, setInfo] = useState({ rtt: 0, dl: 0, type: "" });
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  function showBanner(s: NetStatus) {
    setStatus(s);
    setVisible(true);
    clearTimeout(hideTimer.current);
    if (s === "good" || s === "recovering") {
      hideTimer.current = setTimeout(() => setVisible(false), 3500);
    }
  }

  useEffect(() => {
    function checkNet() {
      const online = navigator.onLine;
      const nav = navigator as Navigator & {
        connection?: { rtt?: number; downlink?: number; effectiveType?: string };
      };
      const conn = nav.connection;
      const rtt  = conn?.rtt ?? 0;
      const dl   = conn?.downlink ?? 99;
      const type = conn?.effectiveType ?? "unknown";

      setInfo({ rtt, dl, type });

      if (!online) { showBanner("offline"); return; }
      if (rtt > RTT_BAD || dl < DL_WARN * 0.5) { showBanner("slow"); return; }
      if (rtt > RTT_WARN || dl < DL_WARN) { showBanner("slow"); return; }
    }

    checkNet();
    const id = setInterval(checkNet, 4000);

    function onOnline() {
      showBanner("recovering");
      setTimeout(checkNet, 500);
    }
    function onOffline() { showBanner("offline"); }
    function onConnChange() { checkNet(); }

    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    const nav = navigator as Navigator & { connection?: EventTarget };
    nav.connection?.addEventListener("change", onConnChange);

    return () => {
      clearInterval(id);
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
      nav.connection?.removeEventListener("change", onConnChange);
    };
  }, []);

  const cfg = {
    good:       { color: "#22c55e", label: "CONNECTION RESTORED",   icon: "◉" },
    recovering: { color: "#22c55e", label: "CONNECTION RECOVERED",  icon: "◉" },
    slow:       { color: "#fbbf24", label: "SLOW NETWORK DETECTED", icon: "⚠" },
    offline:    { color: "#e21227", label: "OFFLINE — NO SIGNAL",   icon: "✕" },
  }[status];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={status}
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
          style={{
            position: "fixed", top: 40, left: "50%", x: "-50%",
            zIndex: 99998,
            background: "rgba(2,8,16,0.95)",
            border: `1px solid ${cfg.color}44`,
            borderRadius: 8,
            padding: "8px 16px",
            display: "flex", alignItems: "center", gap: 10,
            backdropFilter: "blur(16px)",
            boxShadow: `0 0 20px ${cfg.color}22, 0 4px 24px rgba(0,0,0,0.5)`,
            fontFamily: "monospace",
            minWidth: 260,
          }}
        >
          <motion.span
            animate={{ opacity: status === "offline" ? [1, 0.2, 1] : 1 }}
            transition={{ duration: 0.8, repeat: status === "offline" ? Infinity : 0 }}
            style={{ color: cfg.color, fontSize: 14, fontWeight: 900, lineHeight: 1 }}
          >
            {cfg.icon}
          </motion.span>
          <div style={{ flex: 1 }}>
            <div style={{ color: cfg.color, fontSize: 9, fontWeight: 700, letterSpacing: 2 }}>
              {cfg.label}
            </div>
            {status !== "offline" && (info.rtt > 0 || info.dl > 0) && (
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 8, marginTop: 2 }}>
                RTT {info.rtt}ms · {info.dl.toFixed(1)} Mbps · {info.type.toUpperCase()}
              </div>
            )}
            {status === "offline" && (
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 8, marginTop: 2 }}>
                Waiting for connection...
              </div>
            )}
          </div>
          <button
            onClick={() => setVisible(false)}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 11, padding: 0 }}
          >✕</button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
