import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Thermometer, Clock, X, Minimize2, Maximize2,
  AlertTriangle, Activity, Cpu, MemoryStick,
} from "lucide-react";
import { trafficBus } from "@/lib/trafficBus";

/* ══════════════════════════════════════════════════════════════════════
   FLOATING CHAT PANELS  — Draggable 3D mini panels on chat screen
   ▸ SYS MONITOR orb  (green) — CPU · MEM · NET gauges
   ▸ IDLE TRACKER orb (pink)  — session time · activity heatmap
   ▸ Both are draggable, collapsible, with 3D tilt on hover
   ▸ Persist position in localStorage
══════════════════════════════════════════════════════════════════════ */

const SYS_POS_KEY  = "fp-sys-pos-v1";
const IDLE_POS_KEY = "fp-idle-pos-v1";

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function getSavedPos(key: string, defaultX: number, defaultY: number) {
  try {
    const s = localStorage.getItem(key);
    if (s) return JSON.parse(s) as { x: number; y: number };
  } catch {}
  return { x: defaultX, y: defaultY };
}

/* ── useDraggablePanel hook ─────────────────────────────────────── */
function useDraggablePanel(storageKey: string, dx: number, dy: number) {
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
        const nx = clamp(d.spx + dx2, 0, window.innerWidth  - 200);
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
        const nx = clamp(d.spx + dx2, 0, window.innerWidth  - 200);
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

  const wasMoved = useCallback(() => dragRef.current.moved, []);
  return { pos, onMouseDown, onTouchStart, wasMoved };
}

/* ── Live system metrics ────────────────────────────────────────── */
function useMetrics() {
  const cpuR = useRef(34); const memR = useRef(61); const netR = useRef(40);
  const tkR  = useRef(0);
  const [m, setM] = useState({ cpu: 34, mem: 61, net: 40 });
  useEffect(() => {
    const iv = setInterval(() => {
      tkR.current += 1;
      const noise = () => (Math.random() - 0.5) * 7;
      cpuR.current = clamp(lerp(cpuR.current, clamp(cpuR.current + noise() + Math.sin(tkR.current * 0.07) * 10, 8, 95), 0.2), 8, 95);
      memR.current = clamp(lerp(memR.current, clamp(memR.current + (Math.random() - 0.48) * 2, 38, 90), 0.05), 38, 90);
      netR.current = clamp(lerp(netR.current, clamp(Math.random() * 80 + 8, 5, 95), 0.3), 5, 95);
      setM({ cpu: Math.round(cpuR.current), mem: Math.round(memR.current), net: Math.round(netR.current) });
    }, 500);
    return () => clearInterval(iv);
  }, []);
  return m;
}

/* ── Arc gauge mini canvas ────────────────────────────────────── */
function ArcMini({ value, color, label }: { value: number; color: string; label: string }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const tkRef  = useRef(0);

  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const S = 52; cv.width = S; cv.height = S;
    const CX = S / 2, CY = S / 2 + 4, R = 18;

    function draw() {
      rafRef.current = requestAnimationFrame(draw);
      const t = (tkRef.current += 0.02);
      ctx.clearRect(0, 0, S, S);

      const start = Math.PI * 0.75;
      const sweep = Math.PI * 1.5;

      ctx.beginPath();
      ctx.arc(CX, CY, R, start, start + sweep);
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.stroke();

      const fill = start + sweep * (value / 100);
      const grd = ctx.createLinearGradient(CX - R, CY, CX + R, CY);
      grd.addColorStop(0, color + "66");
      grd.addColorStop(1, color);
      ctx.beginPath();
      ctx.arc(CX, CY, R, start, fill);
      ctx.strokeStyle = grd;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.stroke();

      /* Center dot pulse */
      const pulse = 0.5 + Math.sin(t * 2.5) * 0.3;
      ctx.beginPath();
      ctx.arc(CX, CY - 2, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = color + Math.round(pulse * 255).toString(16).padStart(2, "0");
      ctx.fill();

      /* Value text */
      ctx.font = `bold 9px monospace`;
      ctx.textAlign = "center";
      ctx.fillStyle = color;
      ctx.fillText(`${value}`, CX, CY + 2);

      /* Label */
      ctx.font = "6px monospace";
      ctx.fillStyle = "rgba(255,255,255,0.28)";
      ctx.fillText(label, CX, CY + 14);
    }

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [value, color, label]);

  return <canvas ref={cvRef} width={52} height={52} style={{ width: "52px", height: "52px", display: "block" }} />;
}

/* ── Activity sparkline canvas ────────────────────────────────── */
function ActivitySparkline({ data, color }: { data: number[]; color: string }) {
  const cvRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = cvRef.current; if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = cv.offsetWidth || 160, H = 28;
    cv.width = W; cv.height = H;

    ctx.clearRect(0, 0, W, H);

    if (data.length < 2) return;
    const step = W / (data.length - 1);
    const max  = Math.max(...data, 1);

    const grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, color + "44");
    grd.addColorStop(1, "transparent");

    ctx.beginPath();
    data.forEach((v, i) => {
      const x = i * step, y = H - (v / max) * H * 0.88;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo((data.length - 1) * step, H);
    ctx.lineTo(0, H);
    ctx.closePath();
    ctx.fillStyle = grd;
    ctx.fill();

    ctx.beginPath();
    data.forEach((v, i) => {
      const x = i * step, y = H - (v / max) * H * 0.88;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [data, color]);

  return <canvas ref={cvRef} style={{ width: "100%", height: "28px", display: "block" }} />;
}

/* ══════════════════════════════════════════════════════════════════
   SYS MONITOR FLOATING PANEL
══════════════════════════════════════════════════════════════════ */
function SysMonitorPanel({ onClose }: { onClose: () => void }) {
  const { pos, onMouseDown, onTouchStart } = useDraggablePanel(
    SYS_POS_KEY,
    typeof window !== "undefined" ? window.innerWidth - 220 : 900,
    120,
  );
  const [collapsed, setCollapsed] = useState(false);
  const [hov, setHov] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const metrics = useMetrics();
  const cpuHot = metrics.cpu > 70;

  function handleMouseMove(e: React.MouseEvent) {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setTilt({
      x: ((e.clientX - r.left) / r.width  - 0.5) * 16,
      y: ((e.clientY - r.top)  / r.height - 0.5) * -16,
    });
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.7, y: 20 }}
      animate={{
        opacity: 1, scale: 1, y: 0,
        rotateX: tilt.y, rotateY: tilt.x,
        boxShadow: hov
          ? "0 12px 60px rgba(0,0,0,0.95), 0 0 30px rgba(16,185,129,0.18), 0 0 0 1px rgba(16,185,129,0.3)"
          : "0 6px 32px rgba(0,0,0,0.88), 0 0 0 1px rgba(16,185,129,0.15)",
      }}
      exit={{ opacity: 0, scale: 0.7, y: 20 }}
      transition={{ type: "spring", damping: 22, stiffness: 200 }}
      style={{
        position: "fixed",
        left: pos.x, top: pos.y,
        width: "195px",
        zIndex: 88,
        transformStyle: "preserve-3d",
        perspective: "600px",
        userSelect: "none",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setTilt({ x: 0, y: 0 }); }}
      onMouseMove={handleMouseMove}
    >
      <div style={{
        background: "linear-gradient(148deg, rgba(4,10,16,0.98) 0%, rgba(6,14,22,0.98) 60%, rgba(3,8,14,0.99) 100%)",
        border: "1px solid rgba(16,185,129,0.28)",
        borderRadius: "14px",
        overflow: "hidden",
        backdropFilter: "blur(28px)",
      }}>
        {/* Top accent */}
        <motion.div
          animate={{ scaleX: hov ? 1 : 0.5, opacity: hov ? 1 : 0.6 }}
          style={{ height: "2px", background: "linear-gradient(90deg, transparent, #10b981cc, #10b981, transparent)", transformOrigin: "center" }}
        />

        {/* Header */}
        <div
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "7px 9px",
            borderBottom: collapsed ? "none" : "1px solid rgba(16,185,129,0.1)",
            background: "linear-gradient(90deg, rgba(16,185,129,0.08), transparent)",
            cursor: "grab",
          }}
        >
          <motion.div
            animate={{ opacity: [0.7, 1, 0.7], filter: ["drop-shadow(0 0 4px #10b981)", "drop-shadow(0 0 10px #10b981)", "drop-shadow(0 0 4px #10b981)"] }}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            <Thermometer style={{ width: "12px", height: "12px", color: "#10b981", flexShrink: 0 }} />
          </motion.div>
          <span style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 900, color: "#10b981", letterSpacing: "2px", flex: 1, textShadow: "0 0 10px rgba(16,185,129,0.5)" }}>
            SYS MONITOR
          </span>
          <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
            style={{ width: "4px", height: "4px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e" }} />
          <button
            onClick={() => setCollapsed(v => !v)}
            style={{ width: "16px", height: "16px", borderRadius: "4px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            {collapsed
              ? <Maximize2 style={{ width: "7px", height: "7px" }} />
              : <Minimize2 style={{ width: "7px", height: "7px" }} />}
          </button>
          <button
            onClick={onClose}
            style={{ width: "16px", height: "16px", borderRadius: "4px", background: "rgba(226,18,39,0.08)", border: "1px solid rgba(226,18,39,0.2)", color: "rgba(255,255,255,0.35)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.25)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.08)"; }}
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
              style={{ overflow: "hidden" }}
            >
              <div style={{ padding: "8px" }}>
                {/* 3 arc gauges */}
                <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "8px" }}>
                  <ArcMini value={metrics.cpu} color={cpuHot ? "#e21227" : "#00e5ff"} label="CPU%" />
                  <ArcMini value={metrics.mem} color="#10b981" label="MEM%" />
                  <ArcMini value={metrics.net} color="#a855f7" label="NET%" />
                </div>

                {/* Status row */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 3px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  {[
                    { icon: Cpu,         label: "CPU", val: `${metrics.cpu}%`, color: cpuHot ? "#e21227" : "#00e5ff" },
                    { icon: MemoryStick, label: "MEM", val: `${metrics.mem}%`, color: "#10b981" },
                    { icon: Activity,    label: "NET", val: `${metrics.net}%`, color: "#a855f7" },
                  ].map(({ icon: Icon, label, val, color }) => (
                    <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1px" }}>
                      <Icon style={{ width: "8px", height: "8px", color }} />
                      <span style={{ fontSize: "5.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>{label}</span>
                      <span style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 700, color, textShadow: `0 0 6px ${color}` }}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Alert if CPU hot */}
                <AnimatePresence>
                  {cpuHot && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "5px", padding: "4px 6px", borderRadius: "6px", background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.25)" }}
                    >
                      <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.7, repeat: Infinity }}>
                        <AlertTriangle style={{ width: "8px", height: "8px", color: "#e21227" }} />
                      </motion.div>
                      <span style={{ fontSize: "6.5px", fontFamily: "monospace", color: "#e21227", fontWeight: 700, letterSpacing: "0.5px" }}>HIGH CPU LOAD</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Corner brackets */}
        <div style={{ position: "absolute", top: 4, left: 4, width: 8, height: 8, borderTop: "1px solid rgba(16,185,129,0.4)", borderLeft: "1px solid rgba(16,185,129,0.4)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 4, right: 4, width: 8, height: 8, borderBottom: "1px solid rgba(16,185,129,0.4)", borderRight: "1px solid rgba(16,185,129,0.4)", pointerEvents: "none" }} />
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   IDLE TRACKER FLOATING PANEL
══════════════════════════════════════════════════════════════════ */
function IdleTrackerPanel({ onClose }: { onClose: () => void }) {
  const { pos, onMouseDown, onTouchStart } = useDraggablePanel(
    IDLE_POS_KEY,
    typeof window !== "undefined" ? window.innerWidth - 220 : 900,
    340,
  );
  const [collapsed, setCollapsed] = useState(false);
  const [hov, setHov] = useState(false);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const ref = useRef<HTMLDivElement>(null);

  const [elapsed, setElapsed] = useState(0);
  const [isIdle,  setIsIdle]  = useState(false);
  const [actData, setActData] = useState<number[]>(Array(32).fill(0));
  const startRef   = useRef(Date.now());
  const lastActRef = useRef(Date.now());
  const actCur     = useRef(0);

  useEffect(() => {
    function onAct(delta: number) { actCur.current += delta; lastActRef.current = Date.now(); }
    const mm = () => onAct(1), kd = () => onAct(3), cl = () => onAct(2);
    document.addEventListener("mousemove", mm);
    document.addEventListener("keydown", kd);
    document.addEventListener("click", cl);
    return () => { document.removeEventListener("mousemove", mm); document.removeEventListener("keydown", kd); document.removeEventListener("click", cl); };
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
      setIsIdle(Date.now() - lastActRef.current > 5000);
      const lvl = Math.min(100, actCur.current * 3);
      actCur.current = 0;
      setActData(prev => [...prev.slice(1), lvl]);
    }, 500);
    return () => clearInterval(iv);
  }, []);

  function handleMouseMove(e: React.MouseEvent) {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    setTilt({
      x: ((e.clientX - r.left) / r.width  - 0.5) * 16,
      y: ((e.clientY - r.top)  / r.height - 0.5) * -16,
    });
  }

  const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
  const s = elapsed / 1000;
  const timeStr = `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
  const activityNow = actData[actData.length - 1] ?? 0;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, scale: 0.7, y: 20 }}
      animate={{
        opacity: 1, scale: 1, y: 0,
        rotateX: tilt.y, rotateY: tilt.x,
        boxShadow: hov
          ? "0 12px 60px rgba(0,0,0,0.95), 0 0 30px rgba(244,114,182,0.18), 0 0 0 1px rgba(244,114,182,0.3)"
          : "0 6px 32px rgba(0,0,0,0.88), 0 0 0 1px rgba(244,114,182,0.15)",
      }}
      exit={{ opacity: 0, scale: 0.7, y: 20 }}
      transition={{ type: "spring", damping: 22, stiffness: 200 }}
      style={{
        position: "fixed",
        left: pos.x, top: pos.y,
        width: "195px",
        zIndex: 88,
        transformStyle: "preserve-3d",
        perspective: "600px",
        userSelect: "none",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setTilt({ x: 0, y: 0 }); }}
      onMouseMove={handleMouseMove}
    >
      <div style={{
        background: "linear-gradient(148deg, rgba(4,10,16,0.98) 0%, rgba(6,12,22,0.98) 60%, rgba(3,8,14,0.99) 100%)",
        border: "1px solid rgba(244,114,182,0.28)",
        borderRadius: "14px",
        overflow: "hidden",
        backdropFilter: "blur(28px)",
      }}>
        {/* Top accent */}
        <motion.div
          animate={{ scaleX: hov ? 1 : 0.5, opacity: hov ? 1 : 0.6 }}
          style={{ height: "2px", background: "linear-gradient(90deg, transparent, #f472b6cc, #f472b6, transparent)", transformOrigin: "center" }}
        />

        {/* Header — drag handle */}
        <div
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
          style={{
            display: "flex", alignItems: "center", gap: "7px",
            padding: "7px 9px",
            borderBottom: collapsed ? "none" : "1px solid rgba(244,114,182,0.1)",
            background: "linear-gradient(90deg, rgba(244,114,182,0.08), transparent)",
            cursor: "grab",
          }}
        >
          <motion.div
            animate={{ opacity: isIdle ? [0.4, 0.8, 0.4] : [0.7, 1, 0.7], filter: [`drop-shadow(0 0 4px #f472b6)`, `drop-shadow(0 0 10px #f472b6)`, `drop-shadow(0 0 4px #f472b6)`] }}
            transition={{ duration: isIdle ? 2.5 : 1.4, repeat: Infinity }}
          >
            <Clock style={{ width: "12px", height: "12px", color: "#f472b6", flexShrink: 0 }} />
          </motion.div>
          <span style={{ fontSize: "8px", fontFamily: "monospace", fontWeight: 900, color: "#f472b6", letterSpacing: "2px", flex: 1, textShadow: "0 0 10px rgba(244,114,182,0.5)" }}>
            IDLE TRACK
          </span>
          <motion.div
            animate={{ opacity: [1, 0.3, 1], background: isIdle ? "#f59e0b" : "#f472b6" }}
            transition={{ duration: isIdle ? 2 : 1.2, repeat: Infinity }}
            style={{ width: "4px", height: "4px", borderRadius: "50%", boxShadow: `0 0 6px ${isIdle ? "#f59e0b" : "#f472b6"}` }}
          />
          <button
            onClick={() => setCollapsed(v => !v)}
            style={{ width: "16px", height: "16px", borderRadius: "4px", background: "rgba(244,114,182,0.1)", border: "1px solid rgba(244,114,182,0.2)", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            {collapsed
              ? <Maximize2 style={{ width: "7px", height: "7px" }} />
              : <Minimize2 style={{ width: "7px", height: "7px" }} />}
          </button>
          <button
            onClick={onClose}
            style={{ width: "16px", height: "16px", borderRadius: "4px", background: "rgba(226,18,39,0.08)", border: "1px solid rgba(226,18,39,0.2)", color: "rgba(255,255,255,0.35)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.25)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(226,18,39,0.08)"; }}
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
              style={{ overflow: "hidden" }}
            >
              <div style={{ padding: "8px" }}>
                {/* Session timer */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "8px", padding: "6px", borderRadius: "8px", background: "rgba(244,114,182,0.05)", border: "1px solid rgba(244,114,182,0.1)" }}>
                  <span style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "1.5px", marginBottom: "2px" }}>SESSION TIME</span>
                  <motion.span
                    animate={{ textShadow: ["0 0 12px rgba(244,114,182,0.6)", "0 0 22px rgba(244,114,182,0.9)", "0 0 12px rgba(244,114,182,0.6)"] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                    style={{ fontSize: "16px", fontFamily: "monospace", fontWeight: 900, color: "#f472b6", letterSpacing: "2px" }}
                  >{timeStr}</motion.span>
                  <span style={{ fontSize: "6px", fontFamily: "monospace", color: isIdle ? "#f59e0b" : "#22c55e", letterSpacing: "1px", marginTop: "2px", fontWeight: 700 }}>
                    {isIdle ? "IDLE" : "ACTIVE"}
                  </span>
                </div>

                {/* Activity sparkline */}
                <div style={{ marginBottom: "6px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                    <span style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)", letterSpacing: "1px" }}>ACTIVITY</span>
                    <span style={{ fontSize: "7px", fontFamily: "monospace", color: "#f472b6", fontWeight: 700 }}>{Math.round(activityNow)}%</span>
                  </div>
                  <ActivitySparkline data={actData} color="#f472b6" />
                </div>

                {/* Stats row */}
                <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "5px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                    <span style={{ fontSize: "5.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.22)" }}>AI CALLS</span>
                    <span style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color: "#22c55e", textShadow: "0 0 6px #22c55e" }}>{trafficBus.history.length}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px", alignItems: "flex-end" }}>
                    <span style={{ fontSize: "5.5px", fontFamily: "monospace", color: "rgba(255,255,255,0.22)" }}>STATUS</span>
                    <span style={{ fontSize: "7px", fontFamily: "monospace", fontWeight: 700, color: isIdle ? "#f59e0b" : "#22c55e" }}>
                      {isIdle ? "IDLE" : "ONLINE"}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Corner brackets */}
        <div style={{ position: "absolute", top: 4, left: 4, width: 8, height: 8, borderTop: "1px solid rgba(244,114,182,0.4)", borderLeft: "1px solid rgba(244,114,182,0.4)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 4, right: 4, width: 8, height: 8, borderBottom: "1px solid rgba(244,114,182,0.4)", borderRight: "1px solid rgba(244,114,182,0.4)", pointerEvents: "none" }} />
      </div>
    </motion.div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CONTENT-ONLY ORBS — for use inside FloatingWindow hub
══════════════════════════════════════════════════════════════════ */
export function SysMonitorOrb() {
  const metrics = useMetrics();
  const cpuHot = metrics.cpu > 70;
  return (
    <div style={{ padding: "12px" }}>
      <div style={{ display: "flex", justifyContent: "space-around", marginBottom: "10px" }}>
        <ArcMini value={metrics.cpu} color={cpuHot ? "#e21227" : "#00e5ff"} label="CPU%" />
        <ArcMini value={metrics.mem} color="#10b981" label="MEM%" />
        <ArcMini value={metrics.net} color="#a855f7" label="NET%" />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 4px", borderTop: "1px solid rgba(255,255,255,0.06)", marginTop: "4px" }}>
        {[
          { label: "CPU", val: `${metrics.cpu}%`, color: cpuHot ? "#e21227" : "#00e5ff" },
          { label: "MEM", val: `${metrics.mem}%`, color: "#10b981" },
          { label: "NET", val: `${metrics.net}%`, color: "#a855f7" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
            <span style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "1px" }}>{label}</span>
            <span style={{ fontSize: "13px", fontFamily: "monospace", fontWeight: 900, color, textShadow: `0 0 10px ${color}` }}>{val}</span>
          </div>
        ))}
      </div>
      {cpuHot && (
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", padding: "5px 8px", borderRadius: "6px", background: "rgba(226,18,39,0.1)", border: "1px solid rgba(226,18,39,0.25)" }}>
          <AlertTriangle style={{ width: "10px", height: "10px", color: "#e21227" }} />
          <span style={{ fontSize: "8px", fontFamily: "monospace", color: "#e21227", fontWeight: 700, letterSpacing: "0.5px" }}>HIGH CPU LOAD</span>
        </div>
      )}
    </div>
  );
}

export function IdleTrackerOrb() {
  const [elapsed, setElapsed] = useState(0);
  const [isIdle, setIsIdle] = useState(false);
  const [actData, setActData] = useState<number[]>(Array(32).fill(0));
  const startRef = useRef(Date.now());
  const lastActRef = useRef(Date.now());
  const actCur = useRef(0);

  useEffect(() => {
    const mm = () => { actCur.current += 1; lastActRef.current = Date.now(); };
    const kd = () => { actCur.current += 3; lastActRef.current = Date.now(); };
    document.addEventListener("mousemove", mm);
    document.addEventListener("keydown", kd);
    return () => { document.removeEventListener("mousemove", mm); document.removeEventListener("keydown", kd); };
  }, []);

  useEffect(() => {
    const iv = setInterval(() => {
      setElapsed(Date.now() - startRef.current);
      setIsIdle(Date.now() - lastActRef.current > 5000);
      const lvl = Math.min(100, actCur.current * 3);
      actCur.current = 0;
      setActData(prev => [...prev.slice(1), lvl]);
    }, 500);
    return () => clearInterval(iv);
  }, []);

  const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
  const s = elapsed / 1000;
  const timeStr = `${pad(s / 3600)}:${pad((s % 3600) / 60)}:${pad(s % 60)}`;
  const activityNow = actData[actData.length - 1] ?? 0;

  return (
    <div style={{ padding: "12px" }}>
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <div style={{ fontSize: "22px", fontFamily: "monospace", fontWeight: 900, color: "#f472b6", textShadow: "0 0 16px rgba(244,114,182,0.6)", letterSpacing: "2px" }}>{timeStr}</div>
        <div style={{ fontSize: "8px", fontFamily: "monospace", color: isIdle ? "#f59e0b" : "#22c55e", letterSpacing: "2px", marginTop: "3px", fontWeight: 700 }}>{isIdle ? "IDLE" : "ACTIVE"}</div>
      </div>
      <div style={{ marginBottom: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontSize: "7px", fontFamily: "monospace", color: "rgba(255,255,255,0.3)", letterSpacing: "1px" }}>ACTIVITY</span>
          <span style={{ fontSize: "9px", fontFamily: "monospace", color: "#f472b6", fontWeight: 700 }}>{Math.round(activityNow)}%</span>
        </div>
        <ActivitySparkline data={actData} color="#f472b6" />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "6px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div>
          <div style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>AI CALLS</div>
          <div style={{ fontSize: "11px", fontFamily: "monospace", fontWeight: 700, color: "#22c55e", textShadow: "0 0 8px #22c55e" }}>{trafficBus.history.length}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "6px", fontFamily: "monospace", color: "rgba(255,255,255,0.25)" }}>STATUS</div>
          <div style={{ fontSize: "9px", fontFamily: "monospace", fontWeight: 700, color: isIdle ? "#f59e0b" : "#22c55e" }}>{isIdle ? "IDLE" : "ONLINE"}</div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   PUBLIC EXPORT — renders both panels
══════════════════════════════════════════════════════════════════ */
const PANELS_KEY = "fp-visible-v1";

export function FloatingChatPanels() {
  const [showSys,  setShowSys]  = useState(() => {
    try { return JSON.parse(localStorage.getItem(PANELS_KEY) ?? "{}").sys  !== false; } catch { return true; }
  });
  const [showIdle, setShowIdle] = useState(() => {
    try { return JSON.parse(localStorage.getItem(PANELS_KEY) ?? "{}").idle !== false; } catch { return true; }
  });

  function persist(sys: boolean, idle: boolean) {
    localStorage.setItem(PANELS_KEY, JSON.stringify({ sys, idle }));
  }

  return (
    <AnimatePresence>
      {showSys  && <SysMonitorPanel  key="sys"  onClose={() => { setShowSys(false);  persist(false, showIdle); }} />}
      {showIdle && <IdleTrackerPanel key="idle" onClose={() => { setShowIdle(false); persist(showSys, false); }} />}
    </AnimatePresence>
  );
}
