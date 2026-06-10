import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Activity, Monitor, Clock, Thermometer, Cpu, Wifi, Shield, Zap, ChevronLeft, Radio } from "lucide-react";
import { SysMonitorWidget } from "./SysMonitorWidget";
import { IdleWidget } from "./IdleWidget";

/* ═══════════════════════════════════════════════════════════════════
   NETWORK ACTIVITY FULL PAGE — OIDLE + SYS MONITOR
   Ultra futuristic dual-panel cybersecurity HUD
═══════════════════════════════════════════════════════════════════ */

function HUDScanBackground() {
  const cvRef  = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tkRef  = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let W = window.innerWidth, H = window.innerHeight;
    cv.width = W; cv.height = H;

    const cvEl = cv;
    function resize() {
      W = window.innerWidth; H = window.innerHeight;
      cvEl.width = W; cvEl.height = H;
    }
    window.addEventListener("resize", resize);

    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.4 + 0.3,
      color: ["#00e5ff", "#a855f7", "#10b981", "#e21227", "#f59e0b"][Math.floor(Math.random() * 5)],
      alpha: Math.random() * 0.5 + 0.1,
    }));

    const hexGrid: { x: number; y: number; phase: number; size: number }[] = [];
    const hexS = 52;
    for (let row = 0; row < Math.ceil(H / hexS) + 2; row++) {
      for (let col = 0; col < Math.ceil(W / (hexS * 1.73)) + 2; col++) {
        hexGrid.push({
          x: col * hexS * 1.73 + (row % 2) * hexS * 0.865,
          y: row * hexS * 1.5,
          phase: Math.random() * Math.PI * 2,
          size: hexS * 0.48,
        });
      }
    }

    const dataStreams = Array.from({ length: 8 }, (_, i) => ({
      x: (i / 7) * W,
      y: Math.random() * H,
      speed: 1.2 + Math.random() * 2,
      len: 60 + Math.random() * 120,
      color: ["#00e5ff", "#a855f7", "#10b981"][Math.floor(Math.random() * 3)],
    }));

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const t = (tkRef.current += 0.01);
      ctx.clearRect(0, 0, W, H);

      const bg = ctx.createRadialGradient(W * 0.5, H * 0.35, 0, W * 0.5, H * 0.5, Math.max(W, H));
      bg.addColorStop(0, "rgba(4,6,24,1)");
      bg.addColorStop(0.45, "rgba(2,3,14,1)");
      bg.addColorStop(1, "rgba(0,1,6,1)");
      ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

      [
        { x: 0, y: 0, c: "rgba(226,18,39,0.05)" },
        { x: W, y: 0, c: "rgba(0,229,255,0.04)" },
        { x: W * 0.5, y: 0, c: "rgba(168,85,247,0.04)" },
        { x: 0, y: H, c: "rgba(16,185,129,0.03)" },
        { x: W, y: H, c: "rgba(59,130,246,0.03)" },
      ].forEach(({ x, y, c }) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, W * 0.5);
        g.addColorStop(0, c); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      });

      hexGrid.forEach(h => {
        const alpha = (Math.sin(t * 0.6 + h.phase) + 1) / 2 * 0.06 + 0.01;
        ctx.strokeStyle = `rgba(0,229,255,${alpha})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
          const x = h.x + h.size * Math.cos(a);
          const y = h.y + h.size * Math.sin(a);
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
      });

      dataStreams.forEach(s => {
        s.y += s.speed;
        if (s.y > H + s.len) s.y = -s.len;
        const g = ctx.createLinearGradient(s.x, s.y - s.len, s.x, s.y);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(1, s.color + "60");
        ctx.fillStyle = g;
        ctx.fillRect(s.x - 0.6, s.y - s.len, 1.2, s.len);
        ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = s.color + "cc"; ctx.fill();
      });

      particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color; ctx.globalAlpha = p.alpha; ctx.fill();
        particles.slice(i + 1, i + 4).forEach(q => {
          const d = Math.hypot(p.x - q.x, p.y - q.y);
          if (d < 80) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = p.color; ctx.lineWidth = 0.3;
            ctx.globalAlpha = (1 - d / 80) * 0.08; ctx.stroke();
          }
        });
      });
      ctx.globalAlpha = 1;

      const scanY = ((t * 30) % H);
      const sg = ctx.createLinearGradient(0, scanY - 6, 0, scanY + 6);
      sg.addColorStop(0, "rgba(0,229,255,0)");
      sg.addColorStop(0.5, "rgba(0,229,255,0.04)");
      sg.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, scanY - 6, W, 12);
    }

    draw();
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas ref={cvRef}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }}
    />
  );
}

function LiveMetricBar({ label, value, color, icon: Icon }: { label: string; value: number; color: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "4px 0" }}>
      <Icon style={{ width: "10px", height: "10px", color, flexShrink: 0 }} />
      <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "1px", width: "52px", flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: "3px", background: "rgba(255,255,255,0.06)", borderRadius: "2px", overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{
            height: "100%", borderRadius: "2px",
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 6px ${color}`,
          }}
        />
      </div>
      <motion.span
        key={Math.round(value / 5)}
        initial={{ opacity: 0.5 }}
        animate={{ opacity: 1 }}
        style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 700, color, width: "28px", textAlign: "right", flexShrink: 0 }}
      >{Math.round(value)}%</motion.span>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("en-US", { hour12: false }));
  const [date, setDate] = useState(() => new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
  useEffect(() => {
    const iv = setInterval(() => {
      setTime(new Date().toLocaleTimeString("en-US", { hour12: false }));
      setDate(new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
    }, 1000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ textAlign: "right" }}>
      <motion.div
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1, repeat: Infinity }}
        style={{ fontSize: "16px", fontFamily: "monospace", fontWeight: 900, color: "#00e5ff", letterSpacing: "2px", textShadow: "0 0 20px rgba(0,229,255,0.5)" }}
      >{time}</motion.div>
      <div style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "1px" }}>{date}</div>
    </div>
  );
}

function PanelHeader({ title, subtitle, color, icon: Icon }: { title: string; subtitle: string; color: string; icon: React.ComponentType<{ style?: React.CSSProperties }> }) {
  return (
    <div style={{
      padding: "10px 14px 8px",
      borderBottom: `1px solid ${color}22`,
      display: "flex", alignItems: "center", gap: "10px", flexShrink: 0,
    }}>
      <div style={{
        width: "30px", height: "30px", borderRadius: "8px",
        background: `radial-gradient(circle, ${color}25, rgba(0,0,0,0.8))`,
        border: `1px solid ${color}35`,
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: `0 0 16px ${color}25, inset 0 1px 0 rgba(255,255,255,0.05)`,
      }}>
        <Icon style={{ width: "14px", height: "14px", color, filter: `drop-shadow(0 0 6px ${color})` }} />
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 900, color: "#fff", letterSpacing: "2.5px", textShadow: `0 0 14px ${color}80` }}>{title}</span>
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
            style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }}
          />
        </div>
        <div style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "1px" }}>{subtitle}</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
        {[color, "#e21227", "#22c55e"].map((c, i) => (
          <motion.div key={i}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.3 }}
            style={{ width: "4px", height: "4px", borderRadius: "50%", background: c, boxShadow: `0 0 5px ${c}` }}
          />
        ))}
      </div>
    </div>
  );
}

function LiveStatsFooter() {
  const [stats, setStats] = useState({ cpu: 42, mem: 61, net: 34, threats: 3, uptime: 0 });
  const t = useRef(0);

  useEffect(() => {
    const startT = Date.now();
    const iv = setInterval(() => {
      t.current++;
      setStats({
        cpu: Math.round(Math.max(8, Math.min(95, 42 + Math.sin(t.current * 0.07) * 20 + (Math.random() - 0.5) * 8))),
        mem: Math.round(Math.max(35, Math.min(92, 61 + (Math.random() - 0.48) * 3))),
        net: Math.round(Math.max(5, Math.min(99, 34 + Math.sin(t.current * 0.12) * 15 + (Math.random() - 0.5) * 12))),
        threats: Math.floor(2 + Math.sin(t.current * 0.05) * 2 + Math.random() * 1.5),
        uptime: Date.now() - startT,
      });
    }, 800);
    return () => clearInterval(iv);
  }, []);

  const fmt = (ms: number) => {
    const s = ms / 1000;
    const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
    return `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
  };

  return (
    <div style={{
      position: "relative", zIndex: 10,
      display: "flex", alignItems: "center", gap: "20px",
      padding: "8px 20px",
      borderTop: "1px solid rgba(255,255,255,0.04)",
      background: "rgba(3,3,12,0.88)", backdropFilter: "blur(20px)",
      flexShrink: 0, overflowX: "auto",
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(0,229,255,0.3), transparent)" }} />
      {[
        { icon: Cpu, label: "CPU", val: `${stats.cpu}%`, color: stats.cpu > 70 ? "#e21227" : "#00e5ff" },
        { icon: Activity, label: "RAM", val: `${stats.mem}%`, color: "#a855f7" },
        { icon: Wifi, label: "NET", val: `${stats.net}%`, color: "#10b981" },
        { icon: Shield, label: "THREATS", val: String(stats.threats), color: stats.threats > 4 ? "#e21227" : "#f59e0b" },
        { icon: Zap, label: "SESSION", val: fmt(stats.uptime), color: "#3b82f6" },
      ].map(({ icon: Icon, label, val, color }) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 2, repeat: Infinity }}>
            <Icon style={{ width: "9px", height: "9px", color }} />
          </motion.div>
          <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "0.8px" }}>{label}</span>
          <motion.span
            key={val}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: 700, color, textShadow: `0 0 8px ${color}` }}
          >{val}</motion.span>
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.1)", letterSpacing: "1px" }}>ESC TO CLOSE</span>
    </div>
  );
}

export function NetworkActivityPage({ onClose }: { onClose: () => void }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 80);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => { clearTimeout(t); document.removeEventListener("keydown", onKey); };
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed", inset: 0, zIndex: 210,
        display: "flex", flexDirection: "column", overflow: "hidden",
      }}
    >
      <HUDScanBackground />

      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.006) 2px, rgba(255,255,255,0.006) 4px)",
      }} />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1,
        background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.55) 100%)",
      }} />

      {/* Header */}
      <div style={{
        position: "relative", zIndex: 10,
        display: "flex", alignItems: "center", gap: "14px",
        padding: "10px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        background: "rgba(3,3,14,0.92)", backdropFilter: "blur(28px)", flexShrink: 0,
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(168,85,247,0.6), rgba(0,229,255,0.4), rgba(168,85,247,0.6), transparent)" }} />

        <motion.button
          onClick={onClose}
          whileHover={{ x: -3 }}
          whileTap={{ scale: 0.95 }}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "6px 12px", borderRadius: "8px",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)",
            color: "rgba(255,255,255,0.5)", cursor: "pointer",
            fontSize: "9px", fontFamily: "monospace", fontWeight: 700, letterSpacing: "1px",
          }}
        >
          <ChevronLeft style={{ width: "11px", height: "11px" }} />
          BACK TO HUD
        </motion.button>

        <div style={{ width: "1px", height: "30px", background: "rgba(255,255,255,0.07)" }} />

        <motion.div
          animate={{ boxShadow: ["0 0 18px rgba(168,85,247,0.2)", "0 0 36px rgba(168,85,247,0.45)", "0 0 18px rgba(168,85,247,0.2)"] }}
          transition={{ duration: 2.5, repeat: Infinity }}
          style={{
            width: "38px", height: "38px", borderRadius: "12px",
            background: "radial-gradient(circle at 35% 35%, rgba(168,85,247,0.3), rgba(0,0,0,0.85))",
            border: "1px solid rgba(168,85,247,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Activity style={{ width: "18px", height: "18px", color: "#a855f7", filter: "drop-shadow(0 0 8px #a855f7)" }} />
        </motion.div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "14px", fontFamily: "monospace", fontWeight: 900, color: "#fff", letterSpacing: "3.5px", textShadow: "0 0 20px rgba(168,85,247,0.5)" }}>
              NETWORK ACTIVITY
            </span>
            <motion.span
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              style={{
                fontSize: "7px", fontFamily: "monospace", fontWeight: 700, color: "#22c55e",
                letterSpacing: "1px", padding: "2px 7px", borderRadius: "4px",
                background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.28)",
              }}
            >LIVE</motion.span>
          </div>
          <div style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "1.5px" }}>
            OIDLE TRACKER · SYS MONITOR · DUAL PANEL VIEW
          </div>
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {[
            { icon: Radio, color: "#22c55e", label: "FEEDS LIVE" },
            { icon: Shield, color: "#e21227", label: "THREATS ACTIVE" },
          ].map(({ icon: Icon, color, label }) => (
            <div key={label} style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px", borderRadius: "6px", background: `${color}0d`, border: `1px solid ${color}22` }}>
              <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.6, repeat: Infinity }}>
                <Icon style={{ width: "8px", height: "8px", color }} />
              </motion.div>
              <span style={{ fontSize: "7px", fontFamily: "monospace", color, letterSpacing: "0.8px" }}>{label}</span>
            </div>
          ))}
        </div>

        <LiveClock />

        <button
          onClick={onClose}
          style={{
            width: "34px", height: "34px", borderRadius: "9px",
            background: "rgba(226,18,39,0.07)", border: "1px solid rgba(226,18,39,0.2)",
            color: "rgba(255,255,255,0.4)", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(226,18,39,0.25)"; b.style.color = "#fff"; }}
          onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = "rgba(226,18,39,0.07)"; b.style.color = "rgba(255,255,255,0.4)"; }}
        >
          <X style={{ width: "14px", height: "14px" }} />
        </button>
      </div>

      {/* Dual panel body */}
      <div style={{
        position: "relative", zIndex: 5, flex: 1,
        display: "grid", gridTemplateColumns: "1fr 1fr",
        gap: "10px", padding: "10px",
        overflow: "hidden", minHeight: 0,
      }}>
        {/* OIDLE panel */}
        <AnimatePresence>
          {loaded && (
            <motion.div
              key="oidle"
              initial={{ opacity: 0, x: -30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: "flex", flexDirection: "column",
                borderRadius: "18px", overflow: "hidden",
                border: "1px solid rgba(244,114,182,0.2)",
                background: "rgba(4,6,22,0.96)",
                backdropFilter: "blur(24px)",
                boxShadow: "0 0 60px rgba(244,114,182,0.1), 0 0 0 1px rgba(255,255,255,0.025), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, #f472b6dd, #f472b6, transparent)" }} />
              <PanelHeader
                title="OIDLE TRACKER"
                subtitle="Session activity · Input monitoring · AI call rate"
                color="#f472b6"
                icon={Clock}
              />
              {/* Corner brackets */}
              <div style={{ position: "absolute", top: 12, left: 12, width: 10, height: 10, borderTop: "1.5px solid rgba(244,114,182,0.5)", borderLeft: "1.5px solid rgba(244,114,182,0.5)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: 12, right: 12, width: 10, height: 10, borderTop: "1.5px solid rgba(244,114,182,0.5)", borderRight: "1.5px solid rgba(244,114,182,0.5)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: 12, left: 12, width: 10, height: 10, borderBottom: "1.5px solid rgba(244,114,182,0.5)", borderLeft: "1.5px solid rgba(244,114,182,0.5)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: 12, right: 12, width: 10, height: 10, borderBottom: "1.5px solid rgba(244,114,182,0.5)", borderRight: "1.5px solid rgba(244,114,182,0.5)", pointerEvents: "none" }} />
              <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
                <IdleWidget embedded />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SYS MONITOR panel */}
        <AnimatePresence>
          {loaded && (
            <motion.div
              key="sysmon"
              initial={{ opacity: 0, x: 30, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: "flex", flexDirection: "column",
                borderRadius: "18px", overflow: "hidden",
                border: "1px solid rgba(16,185,129,0.2)",
                background: "rgba(3,8,20,0.96)",
                backdropFilter: "blur(24px)",
                boxShadow: "0 0 60px rgba(16,185,129,0.1), 0 0 0 1px rgba(255,255,255,0.025), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, #10b981dd, #10b981, transparent)" }} />
              <PanelHeader
                title="SYS MONITOR"
                subtitle="CPU · RAM · Disk · Network · Thermal readout"
                color="#10b981"
                icon={Thermometer}
              />
              <div style={{ position: "absolute", top: 12, left: 12, width: 10, height: 10, borderTop: "1.5px solid rgba(16,185,129,0.5)", borderLeft: "1.5px solid rgba(16,185,129,0.5)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", top: 12, right: 12, width: 10, height: 10, borderTop: "1.5px solid rgba(16,185,129,0.5)", borderRight: "1.5px solid rgba(16,185,129,0.5)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: 12, left: 12, width: 10, height: 10, borderBottom: "1.5px solid rgba(16,185,129,0.5)", borderLeft: "1.5px solid rgba(16,185,129,0.5)", pointerEvents: "none" }} />
              <div style={{ position: "absolute", bottom: 12, right: 12, width: 10, height: 10, borderBottom: "1.5px solid rgba(16,185,129,0.5)", borderRight: "1.5px solid rgba(16,185,129,0.5)", pointerEvents: "none" }} />
              <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
                <SysMonitorWidget embedded />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <LiveStatsFooter />
    </motion.div>
  );
}
