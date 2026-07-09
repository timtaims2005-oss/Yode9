import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Monitor, X, Minimize2, Maximize2, Terminal,
  Wifi, AlertTriangle, Shield, Zap, Globe, Lock,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════════
   FLOATING NETWORK INTRUSION PANEL
   ▸ Real-time streamed threat events (port scans, brute-force, CVEs)
   ▸ Color-coded severity: CRITICAL/HIGH/MEDIUM/LOW/INFO
   ▸ 3D draggable panel with tilt effect
   ▸ Terminal-style log feed
   ▸ Persist position in localStorage
══════════════════════════════════════════════════════════════════ */

const NET_POS_KEY = "fp-net-pos-v1";

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

interface ThreatEvent {
  id: string;
  ts: string;
  severity: Severity;
  type: string;
  src: string;
  detail: string;
  port?: number;
}

const SEV_COLOR: Record<Severity, string> = {
  CRITICAL: "#e21227",
  HIGH:     "#f97316",
  MEDIUM:   "#f59e0b",
  LOW:      "#10b981",
  INFO:     "#00e5ff",
};

const EVENT_POOL: Array<Omit<ThreatEvent, "id" | "ts">> = [
  { severity: "CRITICAL", type: "CVE-EXPLOIT",   src: "185.220.101.47", detail: "CVE-2024-3400 PAN-OS RCE attempt",        port: 443  },
  { severity: "CRITICAL", type: "BRUTE-FORCE",   src: "91.108.4.33",    detail: "SSH brute-force — 1284 attempts/min",    port: 22   },
  { severity: "CRITICAL", type: "SQL-INJECTION",  src: "103.21.244.20",  detail: "Union-based SQLi in /api/users",         port: 3306 },
  { severity: "HIGH",     type: "PORT-SCAN",      src: "45.95.168.124",  detail: "SYN scan: 1024 ports in 0.4s",          port: 80   },
  { severity: "HIGH",     type: "CVE-EXPLOIT",   src: "198.235.24.79",  detail: "CVE-2023-44487 HTTP/2 DoS exploit",     port: 8080 },
  { severity: "HIGH",     type: "XSS-ATTEMPT",   src: "162.158.92.6",   detail: "Reflected XSS payload in ?q= param",    port: 80   },
  { severity: "HIGH",     type: "BRUTE-FORCE",   src: "77.88.55.66",    detail: "RDP credential stuffing — 320 req/min", port: 3389 },
  { severity: "HIGH",     type: "DNS-TUNNELING",  src: "185.156.72.28",  detail: "Anomalous DNS TXT record exfiltration", port: 53   },
  { severity: "MEDIUM",   type: "PORT-SCAN",      src: "91.211.246.12",  detail: "Stealth scan detected on UDP range",    port: 161  },
  { severity: "MEDIUM",   type: "BOTNET-C2",      src: "45.142.120.37",  detail: "C2 beacon pattern — 30s heartbeat",     port: 4444 },
  { severity: "MEDIUM",   type: "MITM-ATTEMPT",   src: "10.0.0.15",      detail: "ARP spoofing on local subnet",          port: 0    },
  { severity: "MEDIUM",   type: "FUZZING",        src: "172.245.16.14",  detail: "HTTP header fuzzing — 800 req/s",       port: 443  },
  { severity: "LOW",      type: "RECON",          src: "66.249.66.200",  detail: "Googlebot mimicking crawler detected",  port: 80   },
  { severity: "LOW",      type: "PORT-SCAN",      src: "185.180.143.81", detail: "Banner grab on port 21, 25, 110",       port: 25   },
  { severity: "INFO",     type: "GEO-BLOCK",      src: "223.197.120.44", detail: "Request blocked — CN/RU geo-fence",     port: 443  },
  { severity: "INFO",     type: "TLS-ALERT",      src: "192.168.1.1",    detail: "Weak cipher negotiation: RC4 attempt",  port: 443  },
  { severity: "INFO",     type: "AUTH-FAIL",      src: "204.76.30.44",   detail: "Admin panel 401 — bad token",           port: 8443 },
];

function randEvent(): ThreatEvent {
  const pool = EVENT_POOL[Math.floor(Math.random() * EVENT_POOL.length)];
  const now  = new Date();
  const ts   = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}:${String(now.getSeconds()).padStart(2,"0")}.${String(now.getMilliseconds()).padStart(3,"0").slice(0,2)}`;
  return { ...pool, id: `${Date.now()}-${Math.random()}`, ts };
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

function getSavedPos(key: string, dx: number, dy: number) {
  try {
    const s = localStorage.getItem(key);
    if (s) return JSON.parse(s) as { x: number; y: number };
  } catch {}
  return { x: dx, y: dy };
}

function useDraggable(storageKey: string, dx: number, dy: number) {
  const [pos, setPos] = useState(() => getSavedPos(storageKey, dx, dy));
  const posRef  = useRef(pos);
  const dragRef = useRef({ active: false, sx: 0, sy: 0, spx: 0, spy: 0, moved: false });

  useEffect(() => { posRef.current = pos; }, [pos]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const d = dragRef.current;
    d.active = true; d.moved = false;
    d.sx = e.clientX; d.sy = e.clientY;
    d.spx = posRef.current.x; d.spy = posRef.current.y;
    function onMove(ev: MouseEvent) {
      const dx2 = ev.clientX - d.sx, dy2 = ev.clientY - d.sy;
      if (!d.moved && (Math.abs(dx2) > 4 || Math.abs(dy2) > 4)) d.moved = true;
      if (d.moved) {
        const nx = clamp(d.spx + dx2, 0, window.innerWidth  - 260);
        const ny = clamp(d.spy + dy2, 0, window.innerHeight - 120);
        posRef.current = { x: nx, y: ny };
        setPos({ x: nx, y: ny });
      }
    }
    function onUp() {
      d.active = false;
      localStorage.setItem(storageKey, JSON.stringify(posRef.current));
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [storageKey]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const d = dragRef.current;
    d.active = true; d.moved = false;
    d.sx = touch.clientX; d.sy = touch.clientY;
    d.spx = posRef.current.x; d.spy = posRef.current.y;
    function onMove(ev: TouchEvent) {
      const tt = ev.touches[0];
      const dx2 = tt.clientX - d.sx, dy2 = tt.clientY - d.sy;
      if (!d.moved && (Math.abs(dx2) > 4 || Math.abs(dy2) > 4)) d.moved = true;
      if (d.moved) {
        const nx = clamp(d.spx + dx2, 0, window.innerWidth  - 260);
        const ny = clamp(d.spy + dy2, 0, window.innerHeight - 120);
        posRef.current = { x: nx, y: ny };
        setPos({ x: nx, y: ny });
      }
    }
    function onEnd() {
      d.active = false;
      localStorage.setItem(storageKey, JSON.stringify(posRef.current));
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    }
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, [storageKey]);

  return { pos, onMouseDown, onTouchStart };
}

/* ── Mini terminal scanline canvas ─────────────────────────────── */
function TerminalScanline({ active }: { active: boolean }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const cvEl = cv;
    let t = 0;
    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const W = cvEl.width, H = cvEl.height;
      ctx.clearRect(0, 0, W, H);
      if (!active) return;
      t += 0.025;
      const y = ((t * 60) % H);
      const g = ctx.createLinearGradient(0, y - 6, 0, y + 6);
      g.addColorStop(0, "rgba(0,229,255,0)");
      g.addColorStop(0.5, "rgba(0,229,255,0.06)");
      g.addColorStop(1, "rgba(0,229,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 6, W, 12);
    }
    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [active]);
  return (
    <canvas ref={cvRef} width={260} height={300}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }} />
  );
}

/* ── Severity badge ─────────────────────────────────────────────── */
function SevBadge({ sev }: { sev: Severity }) {
  const color = SEV_COLOR[sev];
  return (
    <span style={{
      fontSize: "6px", fontFamily: "monospace", fontWeight: 900,
      letterSpacing: "0.8px", padding: "1px 4px", borderRadius: "3px",
      background: color + "18", border: `1px solid ${color}44`, color,
      flexShrink: 0,
    }}>
      {sev.slice(0, 4)}
    </span>
  );
}

/* ── Threat type icon ────────────────────────────────────────────── */
function TypeIcon({ type }: { type: string }) {
  const map: Record<string, React.ReactNode> = {
    "PORT-SCAN":    <Wifi style={{ width: "7px", height: "7px" }} />,
    "BRUTE-FORCE":  <Lock style={{ width: "7px", height: "7px" }} />,
    "CVE-EXPLOIT":  <Zap  style={{ width: "7px", height: "7px" }} />,
    "SQL-INJECTION": <Terminal style={{ width: "7px", height: "7px" }} />,
    "XSS-ATTEMPT":  <Globe style={{ width: "7px", height: "7px" }} />,
    "DNS-TUNNELING": <Globe style={{ width: "7px", height: "7px" }} />,
    "BOTNET-C2":    <AlertTriangle style={{ width: "7px", height: "7px" }} />,
    "MITM-ATTEMPT": <Shield style={{ width: "7px", height: "7px" }} />,
    "FUZZING":      <Zap style={{ width: "7px", height: "7px" }} />,
    "RECON":        <Wifi style={{ width: "7px", height: "7px" }} />,
    "GEO-BLOCK":    <Globe style={{ width: "7px", height: "7px" }} />,
    "TLS-ALERT":    <Lock style={{ width: "7px", height: "7px" }} />,
    "AUTH-FAIL":    <Shield style={{ width: "7px", height: "7px" }} />,
  };
  return <span style={{ color: "rgba(255,255,255,0.25)", flexShrink: 0 }}>{map[type] ?? <AlertTriangle style={{ width: "7px", height: "7px" }} />}</span>;
}

/* ── Stats counters bar ─────────────────────────────────────────── */
function StatsBar({ events }: { events: ThreatEvent[] }) {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 } as Record<Severity, number>;
  events.forEach(e => { counts[e.severity] = (counts[e.severity] || 0) + 1; });
  return (
    <div style={{ display: "flex", gap: "5px", padding: "4px 8px", borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0, background: "rgba(0,0,0,0.2)" }}>
      {(["CRITICAL","HIGH","MEDIUM","LOW","INFO"] as Severity[]).map(s => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: "2px", flex: 1, justifyContent: "center" }}>
          <span style={{ fontSize: "5.5px", fontFamily: "monospace", color: SEV_COLOR[s], letterSpacing: "0.3px" }}>{s.slice(0,4)}</span>
          <span style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 900, color: SEV_COLOR[s], textShadow: `0 0 6px ${SEV_COLOR[s]}` }}>{counts[s] || 0}</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   NETWORK INTRUSION PANEL
══════════════════════════════════════════════════════════════════ */
function NetworkIntrusionPanel({ onClose }: { onClose: () => void }) {
  const { pos, onMouseDown, onTouchStart } = useDraggable(
    NET_POS_KEY,
    typeof window !== "undefined" ? Math.max(0, window.innerWidth - 290) : 800,
    120,
  );
  const [collapsed, setCollapsed] = useState(false);
  const [hov, setHov] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [events, setEvents] = useState<ThreatEvent[]>(() => {
    const init: ThreatEvent[] = [];
    for (let i = 0; i < 6; i++) init.push(randEvent());
    return init.reverse();
  });
  const [paused, setPaused] = useState(false);
  const [filter, setFilter] = useState<Severity | "ALL">("ALL");
  const [critFlash, setCritFlash] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  /* Stream new events */
  useEffect(() => {
    if (paused) return;
    const minMs = 800, maxMs = 3200;
    function schedule() {
      const delay = minMs + Math.random() * (maxMs - minMs);
      return setTimeout(() => {
        const ev = randEvent();
        setEvents(prev => {
          const next = [ev, ...prev].slice(0, 80);
          return next;
        });
        if (ev.severity === "CRITICAL") {
          setCritFlash(true);
          setTimeout(() => setCritFlash(false), 600);
        }
        timerRef.current = schedule();
      }, delay);
    }
    timerRef.current = schedule();
    return () => clearTimeout(timerRef.current);
  }, [paused]);

  /* Auto-scroll to top on new event */
  useEffect(() => {
    if (listRef.current && !paused) {
      listRef.current.scrollTop = 0;
    }
  }, [events.length, paused]);

  function handleMouseMove(e: React.MouseEvent) {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setTilt({
      x: ((e.clientX - r.left) / r.width  - 0.5) * 14,
      y: ((e.clientY - r.top)  / r.height - 0.5) * -14,
    });
  }

  const filtered = filter === "ALL" ? events : events.filter(e => e.severity === filter);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.75, y: 24 }}
      animate={{
        opacity: 1, scale: 1, y: 0,
        rotateX: tilt.y, rotateY: tilt.x,
        boxShadow: hov
          ? "0 16px 70px rgba(0,0,0,0.98), 0 0 40px rgba(226,18,39,0.18), 0 0 0 1px rgba(226,18,39,0.32)"
          : critFlash
          ? "0 8px 40px rgba(0,0,0,0.92), 0 0 50px rgba(226,18,39,0.38), 0 0 0 1px rgba(226,18,39,0.5)"
          : "0 8px 40px rgba(0,0,0,0.92), 0 0 20px rgba(0,229,255,0.08), 0 0 0 1px rgba(0,229,255,0.12)",
      }}
      exit={{ opacity: 0, scale: 0.75, y: 24 }}
      transition={{ type: "spring", damping: 24, stiffness: 210 }}
      style={{
        position: "fixed",
        left: pos.x, top: pos.y,
        width: "270px",
        zIndex: 90,
        transformStyle: "preserve-3d",
        perspective: "700px",
        userSelect: "none",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setTilt({ x: 0, y: 0 }); }}
      onMouseMove={handleMouseMove}
    >
      <div style={{
        background: "linear-gradient(148deg, rgba(2,6,14,0.99) 0%, rgba(4,8,18,0.99) 55%, rgba(2,5,12,0.99) 100%)",
        border: "1px solid rgba(0,229,255,0.18)",
        borderRadius: "14px",
        overflow: "hidden",
        backdropFilter: "blur(32px)",
        position: "relative",
      }}>
        {/* Scanline overlay */}
        <TerminalScanline active={!collapsed} />

        {/* Critical flash overlay */}
        <AnimatePresence>
          {critFlash && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute", inset: 0, zIndex: 2, pointerEvents: "none",
                background: "rgba(226,18,39,0.08)",
                borderRadius: "14px",
                border: "1px solid rgba(226,18,39,0.55)",
              }}
            />
          )}
        </AnimatePresence>

        {/* Top gradient accent */}
        <motion.div
          animate={{
            opacity: critFlash ? 1 : hov ? 1 : 0.55,
            scaleX: hov ? 1 : 0.6,
          }}
          style={{
            height: "2px",
            background: critFlash
              ? "linear-gradient(90deg, transparent, #e21227cc, #e21227, #e21227cc, transparent)"
              : "linear-gradient(90deg, transparent, #00e5ffaa, #00e5ff, #00e5ffaa, transparent)",
            transformOrigin: "center",
            position: "relative", zIndex: 3,
          }}
        />

        {/* Header — drag handle */}
        <div
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          style={{
            display: "flex", alignItems: "center", gap: "6px",
            padding: "7px 9px",
            borderBottom: collapsed ? "none" : "1px solid rgba(0,229,255,0.08)",
            background: "linear-gradient(90deg, rgba(0,229,255,0.06), transparent)",
            cursor: "grab",
            position: "relative", zIndex: 3,
          }}
        >
          <motion.div
            animate={{
              opacity: paused ? [0.4, 0.7, 0.4] : [0.7, 1, 0.7],
              filter: paused
                ? ["drop-shadow(0 0 3px #f59e0b)", "drop-shadow(0 0 8px #f59e0b)", "drop-shadow(0 0 3px #f59e0b)"]
                : ["drop-shadow(0 0 4px #00e5ff)", "drop-shadow(0 0 10px #00e5ff)", "drop-shadow(0 0 4px #00e5ff)"],
            }}
            transition={{ duration: 1.6, repeat: Infinity }}
          >
            <Monitor style={{ width: "12px", height: "12px", color: paused ? "#f59e0b" : "#00e5ff", flexShrink: 0 }} />
          </motion.div>

          <span style={{
            fontSize: "7.5px", fontFamily: "monospace", fontWeight: 900,
            color: "#00e5ff", letterSpacing: "2px", flex: 1,
            textShadow: "0 0 10px rgba(0,229,255,0.6)",
          }}>
            NET INTRUSION
          </span>

          {/* Live/Paused indicator */}
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: paused ? 3 : 1, repeat: Infinity }}
            style={{
              width: "4px", height: "4px", borderRadius: "50%",
              background: paused ? "#f59e0b" : "#22c55e",
              boxShadow: `0 0 6px ${paused ? "#f59e0b" : "#22c55e"}`,
            }}
          />

          {/* Pause/Resume */}
          <button
            onClick={() => setPaused(v => !v)}
            title={paused ? "Resume" : "Pause"}
            style={{
              width: "17px", height: "17px", borderRadius: "4px",
              background: paused ? "rgba(245,158,11,0.15)" : "rgba(0,229,255,0.08)",
              border: `1px solid ${paused ? "rgba(245,158,11,0.35)" : "rgba(0,229,255,0.2)"}`,
              color: paused ? "#f59e0b" : "rgba(255,255,255,0.4)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              fontSize: "8px", fontFamily: "monospace",
            }}
          >
            {paused ? "▶" : "⏸"}
          </button>

          <button
            onClick={() => setCollapsed(v => !v)}
            style={{
              width: "17px", height: "17px", borderRadius: "4px",
              background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.15)",
              color: "rgba(255,255,255,0.35)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
          >
            {collapsed
              ? <Maximize2 style={{ width: "7px", height: "7px" }} />
              : <Minimize2 style={{ width: "7px", height: "7px" }} />}
          </button>

          <button
            onClick={onClose}
            style={{
              width: "17px", height: "17px", borderRadius: "4px",
              background: "rgba(226,18,39,0.07)", border: "1px solid rgba(226,18,39,0.2)",
              color: "rgba(255,255,255,0.3)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.28)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.07)"; }}
          >
            <X style={{ width: "7px", height: "7px" }} />
          </button>
        </div>

        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: "hidden", position: "relative", zIndex: 2 }}
            >
              {/* Stats bar */}
              <StatsBar events={events} />

              {/* Filter chips */}
              <div style={{
                display: "flex", gap: "3px", padding: "4px 7px",
                borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0,
                overflowX: "auto",
              }}>
                {(["ALL","CRITICAL","HIGH","MEDIUM","LOW","INFO"] as Array<Severity | "ALL">).map(s => (
                  <button
                    key={s}
                    onClick={() => setFilter(s)}
                    style={{
                      fontSize: "5.5px", fontFamily: "monospace", fontWeight: 900,
                      letterSpacing: "0.5px", padding: "2px 5px", borderRadius: "3px", flexShrink: 0,
                      cursor: "pointer",
                      background: filter === s
                        ? (s === "ALL" ? "rgba(0,229,255,0.2)" : SEV_COLOR[s as Severity] + "22")
                        : "rgba(255,255,255,0.03)",
                      border: filter === s
                        ? `1px solid ${s === "ALL" ? "#00e5ff" : SEV_COLOR[s as Severity]}55`
                        : "1px solid rgba(255,255,255,0.06)",
                      color: filter === s
                        ? (s === "ALL" ? "#00e5ff" : SEV_COLOR[s as Severity])
                        : "rgba(255,255,255,0.25)",
                      transition: "all 0.15s",
                    }}
                  >
                    {s === "ALL" ? "ALL" : s.slice(0, 4)}
                  </button>
                ))}
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: "5.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.12)", flexShrink: 0, alignSelf: "center" }}>
                  {filtered.length} EVT
                </span>
              </div>

              {/* Event list */}
              <div
                ref={listRef}
                style={{
                  height: "220px",
                  overflowY: "auto",
                  overflowX: "hidden",
                  padding: "4px 6px",
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(0,229,255,0.15) transparent",
                }}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {filtered.map((ev, idx) => (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, x: -12, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      layout={false}
                      style={{ marginBottom: "2px" }}
                    >
                      <div style={{
                        display: "flex", alignItems: "flex-start", gap: "4px",
                        padding: "4px 5px",
                        borderRadius: "5px",
                        background: idx === 0 && !paused
                          ? `${SEV_COLOR[ev.severity]}09`
                          : "rgba(255,255,255,0.015)",
                        border: idx === 0 && !paused
                          ? `1px solid ${SEV_COLOR[ev.severity]}20`
                          : "1px solid rgba(255,255,255,0.03)",
                        transition: "background 0.3s",
                      }}>
                        <TypeIcon type={ev.type} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "3px", marginBottom: "1.5px" }}>
                            <SevBadge sev={ev.severity} />
                            <span style={{ fontSize: "6.5px", fontFamily: "monospace", fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.5px" }}>
                              {ev.type}
                            </span>
                            <span style={{ fontSize: "5.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.18)", marginLeft: "auto", flexShrink: 0 }}>
                              {ev.ts}
                            </span>
                          </div>
                          <div style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.28)", lineHeight: 1.35, marginBottom: "1px" }}>
                            {ev.detail}
                          </div>
                          <div style={{ display: "flex", gap: "6px" }}>
                            <span style={{ fontSize: "5.5px", fontFamily: "monospace", color: SEV_COLOR[ev.severity] + "88" }}>
                              SRC: {ev.src}
                            </span>
                            {ev.port && ev.port > 0 && (
                              <span style={{ fontSize: "5.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.15)" }}>
                                :{ev.port}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {filtered.length === 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100px", flexDirection: "column", gap: "6px" }}>
                    <Shield style={{ width: "20px", height: "20px", color: "#10b981", filter: "drop-shadow(0 0 8px #10b981)" }} />
                    <span style={{ fontSize: "8px", fontFamily: "monospace", color: "rgba(255,255,255,0.2)", letterSpacing: "1.5px" }}>NO EVENTS</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "4px 8px",
                borderTop: "1px solid rgba(255,255,255,0.04)",
                background: "rgba(0,0,0,0.25)",
              }}>
                <motion.div animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ width: "3px", height: "3px", borderRadius: "50%", background: paused ? "#f59e0b" : "#22c55e", boxShadow: `0 0 5px ${paused ? "#f59e0b" : "#22c55e"}` }} />
                <span style={{ fontSize: "5.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.18)", letterSpacing: "1px" }}>
                  {paused ? "FEED PAUSED" : "LIVE FEED ACTIVE"}
                </span>
                <div style={{ flex: 1 }} />
                <button
                  onClick={() => setEvents([])}
                  style={{
                    fontSize: "5.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.18)",
                    cursor: "pointer", background: "none", border: "none", letterSpacing: "0.5px",
                    padding: "2px 4px",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#e21227"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,0.18)"; }}
                >
                  CLEAR
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Corner brackets */}
        <div style={{ position: "absolute", top: 5, left: 5, width: 9, height: 9, borderTop: "1px solid rgba(0,229,255,0.35)", borderLeft: "1px solid rgba(0,229,255,0.35)", pointerEvents: "none", zIndex: 4 }} />
        <div style={{ position: "absolute", bottom: 5, right: 5, width: 9, height: 9, borderBottom: "1px solid rgba(0,229,255,0.35)", borderRight: "1px solid rgba(0,229,255,0.35)", pointerEvents: "none", zIndex: 4 }} />
        <div style={{ position: "absolute", top: 5, right: 5, width: 9, height: 9, borderTop: "1px solid rgba(0,229,255,0.18)", borderRight: "1px solid rgba(0,229,255,0.18)", pointerEvents: "none", zIndex: 4 }} />
        <div style={{ position: "absolute", bottom: 5, left: 5, width: 9, height: 9, borderBottom: "1px solid rgba(0,229,255,0.18)", borderLeft: "1px solid rgba(0,229,255,0.18)", pointerEvents: "none", zIndex: 4 }} />
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   3D NETWORK MONITOR BUTTON  (like screenshot — circular, monitor icon,
   dashed cyan ring, red ring)
══════════════════════════════════════════════════════════════════ */
const BTN_POS_KEY = "fp-netbtn-pos-v1";

function NetworkMonitorButton({ onClick, active }: { onClick: () => void; active: boolean }) {
  const [pos, setPos] = useState(() => getSavedPos(BTN_POS_KEY,
    typeof window !== "undefined" ? Math.max(4, window.innerWidth - 180) : 800,
    480,
  ));
  const posRef  = useRef(pos);
  const dragRef = useRef({ active: false, sx: 0, sy: 0, spx: 0, spy: 0, moved: false });
  const [hovered, setHovered] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const btnRef = useRef<HTMLDivElement>(null);

  useEffect(() => { posRef.current = pos; }, [pos]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const d = dragRef.current;
    d.active = true; d.moved = false;
    d.sx = e.clientX; d.sy = e.clientY;
    d.spx = posRef.current.x; d.spy = posRef.current.y;
    function onMove(ev: MouseEvent) {
      const dx2 = ev.clientX - d.sx, dy2 = ev.clientY - d.sy;
      if (!d.moved && (Math.abs(dx2) > 4 || Math.abs(dy2) > 4)) d.moved = true;
      if (d.moved) {
        const nx = clamp(d.spx + dx2, 4, window.innerWidth - 84);
        const ny = clamp(d.spy + dy2, 4, window.innerHeight - 84);
        posRef.current = { x: nx, y: ny };
        setPos({ x: nx, y: ny });
      }
    }
    function onUp() {
      d.active = false;
      localStorage.setItem(BTN_POS_KEY, JSON.stringify(posRef.current));
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const d = dragRef.current;
    d.active = true; d.moved = false;
    d.sx = touch.clientX; d.sy = touch.clientY;
    d.spx = posRef.current.x; d.spy = posRef.current.y;
    function onMove(ev: TouchEvent) {
      const tt = ev.touches[0];
      const dx2 = tt.clientX - d.sx, dy2 = tt.clientY - d.sy;
      if (!d.moved && (Math.abs(dx2) > 4 || Math.abs(dy2) > 4)) d.moved = true;
      if (d.moved) {
        const nx = clamp(d.spx + dx2, 4, window.innerWidth - 84);
        const ny = clamp(d.spy + dy2, 4, window.innerHeight - 84);
        posRef.current = { x: nx, y: ny };
        setPos({ x: nx, y: ny });
      }
    }
    function onEnd() {
      d.active = false;
      localStorage.setItem(BTN_POS_KEY, JSON.stringify(posRef.current));
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    }
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onEnd);
  }, []);

  const handleClick = useCallback(() => {
    if (!dragRef.current.moved) onClick();
  }, [onClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const el = btnRef.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setTilt({
      x: ((e.clientX - r.left) / r.width  - 0.5) * 22,
      y: ((e.clientY - r.top)  / r.height - 0.5) * -22,
    });
  }, []);

  return (
    <div
      ref={btnRef}
      style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 94, cursor: "grab", userSelect: "none" }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); }}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1, rotateX: tilt.y, rotateY: tilt.x }}
        transition={{ delay: 0.9, type: "spring", damping: 18, stiffness: 190 }}
        whileTap={{ scale: 0.88 }}
        style={{ width: "70px", height: "70px", position: "relative", transformStyle: "preserve-3d", perspective: "320px" }}
      >
        {/* Outermost dashed cyan ring — rotating */}
        <motion.div
          style={{ position: "absolute", inset: "-14px", borderRadius: "50%", border: "1px dashed rgba(0,229,255,0.4)", pointerEvents: "none" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        />

        {/* Counter-rotating dashed ring */}
        <motion.div
          style={{ position: "absolute", inset: "-8px", borderRadius: "50%", border: "1px dashed rgba(0,229,255,0.2)", pointerEvents: "none" }}
          animate={{ rotate: -360 }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
        />

        {/* Red ring */}
        <motion.div
          style={{ position: "absolute", inset: "-3px", borderRadius: "50%", border: "1.5px solid rgba(226,18,39,0.55)", pointerEvents: "none" }}
          animate={{
            boxShadow: active
              ? ["0 0 10px rgba(226,18,39,0.6)", "0 0 24px rgba(226,18,39,0.9)", "0 0 10px rgba(226,18,39,0.6)"]
              : ["0 0 6px rgba(226,18,39,0.3)", "0 0 14px rgba(226,18,39,0.5)", "0 0 6px rgba(226,18,39,0.3)"],
          }}
          transition={{ duration: active ? 1.0 : 2.5, repeat: Infinity }}
        />

        {/* Inner cyan ring */}
        <motion.div
          style={{ position: "absolute", inset: "3px", borderRadius: "50%", border: "1px solid rgba(0,229,255,0.22)", pointerEvents: "none" }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.2, repeat: Infinity }}
        />

        {/* Main circle body */}
        <motion.div
          animate={{
            boxShadow: hovered
              ? "0 0 0 0 transparent, inset 0 0 30px rgba(0,229,255,0.18), 0 8px 40px rgba(0,229,255,0.22)"
              : active
              ? "0 0 0 0 transparent, inset 0 0 20px rgba(0,229,255,0.12), 0 4px 24px rgba(0,229,255,0.16)"
              : "0 0 0 0 transparent, inset 0 0 14px rgba(0,229,255,0.07), 0 2px 16px rgba(0,0,0,0.7)",
          }}
          transition={{ duration: 0.3 }}
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: "radial-gradient(circle at 35% 30%, rgba(0,229,255,0.18) 0%, rgba(0,60,80,0.5) 40%, rgba(0,0,0,0.92) 100%)",
            border: "1px solid rgba(0,229,255,0.28)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: "2px",
          }}
        >
          <motion.div
            animate={{
              filter: active
                ? ["drop-shadow(0 0 6px #00e5ff)", "drop-shadow(0 0 14px #00e5ff)", "drop-shadow(0 0 6px #00e5ff)"]
                : ["drop-shadow(0 0 4px #00e5ff)", "drop-shadow(0 0 10px #00e5ff)", "drop-shadow(0 0 4px #00e5ff)"],
              scale: hovered ? 1.15 : 1,
            }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            <Monitor style={{ width: "22px", height: "22px", color: "#00e5ff" }} />
          </motion.div>
          <span style={{
            fontSize: "5.5px", fontFamily: "monospace", fontWeight: 900,
            color: "rgba(0,229,255,0.7)", letterSpacing: "1.2px",
            textShadow: "0 0 8px rgba(0,229,255,0.6)",
          }}>
            {active ? "LIVE" : "NET"}
          </span>
        </motion.div>

        {/* Live pulse ring when active */}
        <AnimatePresence>
          {active && (
            <motion.div
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
              style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: "1px solid rgba(0,229,255,0.6)",
                pointerEvents: "none",
              }}
            />
          )}
        </AnimatePresence>

        {/* Hover tooltip */}
        <AnimatePresence>
          {hovered && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.9 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "absolute", bottom: "calc(100% + 10px)", left: "50%",
                transform: "translateX(-50%)",
                whiteSpace: "nowrap",
                fontSize: "7px", fontFamily: "monospace", fontWeight: 700,
                color: "#00e5ff", letterSpacing: "1.2px",
                background: "rgba(0,4,10,0.95)",
                padding: "3px 8px", borderRadius: "5px",
                border: "1px solid rgba(0,229,255,0.28)",
                boxShadow: "0 4px 16px rgba(0,0,0,0.8)",
                pointerEvents: "none",
              }}
            >
              {active ? "HIDE INTRUSION LOG" : "NET INTRUSION LOG"}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PUBLIC EXPORT — combined controller
══════════════════════════════════════════════════════════════════ */
const VIS_KEY = "fp-net-visible-v1";

export function FloatingNetworkPanel() {
  const [visible, setVisible] = useState(() => {
    try { return localStorage.getItem(VIS_KEY) !== "0"; } catch { return true; }
  });

  function toggle() {
    setVisible(v => {
      localStorage.setItem(VIS_KEY, v ? "0" : "1");
      return !v;
    });
  }

  return (
    <>
      <NetworkMonitorButton onClick={toggle} active={visible} />
      <AnimatePresence>
        {visible && <NetworkIntrusionPanel onClose={toggle} />}
      </AnimatePresence>
    </>
  );
}
