/**
 * Performance HUD v4 — Cyberpunk system monitor
 *
 * Shows: FPS live graph · Screen Hz · CPU cores & load · GPU name ·
 *        Battery (level + charging) · Thermal state · Adaptive FPS target ·
 *        Memory heap · DPR · WebGL2 · OffscreenCanvas
 *
 * Toggle: Ctrl+Shift+P
 * Draggable: mousedown on header
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { frameScheduler }          from "@/lib/frame-scheduler";
import { memoryPressure, type PressureLevel } from "@/lib/memory-pressure";
import { thermalGuard, type ThermalState }    from "@/lib/thermal-guard";
import { adaptiveFPS, type AdaptiveState }    from "@/lib/adaptive-fps";
import {
  getDetectedRefreshRate,
  supportsOffscreenCanvas,
  supportsWebGL2,
} from "@/lib/adaptive-quality";

/* ── Colour helpers ────────────────────────────────────────────────────── */
function fpsColor(fps: number)      { return fps >= 55 ? "#00ff88" : fps >= 35 ? "#fbbf24" : "#e21227"; }
function thermalColor(s: ThermalState) {
  return ({ nominal: "#00ff88", fair: "#fbbf24", serious: "#f97316", critical: "#e21227" })[s];
}
function pressureColor(p: PressureLevel) {
  return ({ nominal: "#00ff88", moderate: "#fbbf24", critical: "#e21227" })[p];
}
function battColor(lvl: number | null, chg: boolean | null) {
  if (chg) return "#00e5ff";
  if (lvl === null) return "#555";
  return lvl > 50 ? "#00ff88" : lvl > 20 ? "#fbbf24" : "#e21227";
}
function loadColor(pct: number)     { return pct < 60 ? "#00ff88" : pct < 85 ? "#fbbf24" : "#e21227"; }

/* ── GPU renderer string (WebGL debug extension) ─────────────────────── */
function detectGPU(): { name: string; vendor: string } {
  try {
    const c  = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    if (!gl) return { name: "Unknown", vendor: "Unknown" };
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    if (!dbg) return { name: "WebGL OK", vendor: "GPU OK" };
    const full = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string ?? "GPU";
    const ven  = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)   as string ?? "";
    // Truncate long names (e.g. full OpenGL driver string)
    const short = full.replace(/\(R\)|\(TM\)|OpenGL|Engine|Graphics|Adapter/gi, "").trim().slice(0, 40);
    return { name: short, vendor: ven.split(" ")[0] ?? ven };
  } catch {
    return { name: "n/a", vendor: "n/a" };
  }
}

/* ── Ring gauge component ────────────────────────────────────────────── */
function Ring({ value, max, label, color, size = 56 }: {
  value: number; max: number; label: string; color: string; size?: number;
}) {
  const pct = Math.min(value / max, 1);
  const r   = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1a1a1a" strokeWidth={5} />
        <circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.3s" }}
        />
        <text
          x={size/2} y={size/2 + 1}
          textAnchor="middle" dominantBaseline="middle"
          fill={color} fontSize={12} fontFamily="monospace" fontWeight={700}
          style={{ transform: "rotate(90deg)", transformOrigin: `${size/2}px ${size/2}px` }}
        >
          {value}
        </text>
      </svg>
      <span style={{ color: "#555", fontSize: 9, letterSpacing: 0.5 }}>{label}</span>
    </div>
  );
}

/* ── Bar metric ──────────────────────────────────────────────────────── */
function Bar({ label, value, max, unit = "", color, note }: {
  label: string; value: number; max: number; unit?: string; color: string; note?: string;
}) {
  const pct = Math.min(value / max, 1) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ color: "#555", fontSize: 10 }}>{label}</span>
        <span style={{ color, fontSize: 10, fontWeight: 600 }}>
          {Number.isFinite(value) ? value.toFixed(value < 10 ? 1 : 0) : "—"}{unit}
          {note && <span style={{ color: "#444", fontWeight: 400, marginLeft: 4 }}>{note}</span>}
        </span>
      </div>
      <div style={{ height: 3, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color,
          borderRadius: 2, transition: "width 0.4s, background 0.4s",
        }} />
      </div>
    </div>
  );
}

/* ── Badge ───────────────────────────────────────────────────────────── */
function Badge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span style={{
      padding: "1px 6px", borderRadius: 3, fontSize: 9, fontWeight: 600, letterSpacing: 0.4,
      background: ok ? "rgba(0,255,136,0.1)" : "rgba(255,255,255,0.05)",
      color: ok ? "#00ff88" : "#444",
      border: `1px solid ${ok ? "rgba(0,255,136,0.3)" : "#222"}`,
    }}>{label}</span>
  );
}

const FPS_HISTORY = 72;
const BAR_W = 3, BAR_GAP = 1;

export function PerformanceHUD() {
  const [visible, setVisible]   = useState(false);
  const [lowPower, setLowPower] = useState(false);
  const [adaptive, setAdaptive] = useState<AdaptiveState>(adaptiveFPS.state);

  const [stats, setStats] = useState({
    fps: 60, dropped: 0,
    memUsed: 0, memTotal: 0, memPressure: "nominal" as PressureLevel,
    thermal: "nominal" as ThermalState,
    fpsJitter: 0, cpuLoad: 0,
    gpuLayers: 0,
  });

  const fpsHistRef     = useRef<number[]>(Array(FPS_HISTORY).fill(60));
  const canvasRef      = useRef<HTMLCanvasElement>(null);
  const rafRef         = useRef<number | null>(null);
  const frameTimesRef  = useRef<number[]>([]);
  const lastTimeRef    = useRef(0);
  const gpuRef         = useRef(detectGPU());
  const hz             = getDetectedRefreshRate();
  const cores          = navigator.hardwareConcurrency ?? 1;
  const deviceMem      = (navigator as { deviceMemory?: number }).deviceMemory ?? null;
  const hasWebGL2      = supportsWebGL2();
  const hasOffscreen   = supportsOffscreenCanvas();

  /* drag state */
  const posRef  = useRef({ x: 12, y: 48 });
  const dragRef = useRef({ dragging: false, ox: 0, oy: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  /* ── keyboard toggle ─────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") { e.preventDefault(); setVisible(v => !v); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ── adaptive state subscription ─────────────────────────────────── */
  useEffect(() => { adaptiveFPS.subscribe(setAdaptive); }, []);

  /* ── FPS sampler (independent RAF) ───────────────────────────────── */
  useEffect(() => {
    if (!visible) return;
    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (!lastTimeRef.current) { lastTimeRef.current = now; return; }
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) frameTimesRef.current.shift();
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); lastTimeRef.current = 0; };
  }, [visible]);

  /* ── stats aggregator ────────────────────────────────────────────── */
  useEffect(() => {
    if (!visible) return;
    const unsub1 = frameScheduler.onMetrics((fps, dropped) => {
      fpsHistRef.current.push(fps);
      if (fpsHistRef.current.length > FPS_HISTORY) fpsHistRef.current.shift();

      const times = frameTimesRef.current;
      const avg   = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 16.67;
      const jitter = times.length
        ? Math.sqrt(times.reduce((s, t) => s + (t - avg) ** 2, 0) / times.length) : 0;

      // CPU load estimate: ratio of actual frame time vs expected (1/hz * 1000)
      const expectedMs = 1000 / hz;
      const cpuLoad    = Math.min(100, Math.round(((avg - expectedMs) / expectedMs) * 100 + 15));

      const mem = memoryPressure.currentStats;
      setStats(s => ({
        ...s, fps, dropped,
        fpsJitter: Math.round(jitter * 10) / 10,
        cpuLoad: Math.max(0, cpuLoad),
        memUsed: mem.heapUsedMB, memTotal: mem.heapLimitMB, memPressure: mem.pressure,
      }));
    });

    const unsub2 = memoryPressure.onStats(m =>
      setStats(s => ({ ...s, memUsed: m.heapUsedMB, memTotal: m.heapLimitMB, memPressure: m.pressure }))
    );
    const unsub3 = thermalGuard.onMetrics(m =>
      setStats(s => ({ ...s, thermal: m.state }))
    );
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [visible, hz]);

  /* ── Canvas FPS graph ────────────────────────────────────────────── */
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, 0, width, height);

    // Reference lines
    const refLines = [{ fps: hz, color: "rgba(0,229,255,0.15)" }, { fps: 30, color: "rgba(255,255,255,0.08)" }];
    refLines.forEach(({ fps: f, color }) => {
      const y = height * (1 - f / (hz * 1.1));
      ctx.strokeStyle = color;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    });

    // Bars
    fpsHistRef.current.forEach((fps, i) => {
      const barH = (fps / (hz * 1.1)) * height;
      const x    = i * (BAR_W + BAR_GAP);
      ctx.fillStyle   = fpsColor(fps);
      ctx.globalAlpha = 0.9;
      ctx.fillRect(x, height - barH, BAR_W, barH);
    });
    ctx.globalAlpha = 1;
  }, [hz]);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(drawGraph, 150);
    return () => clearInterval(id);
  }, [visible, drawGraph]);

  /* ── drag ────────────────────────────────────────────────────────── */
  const onHeaderDown = (e: React.MouseEvent) => {
    if (!panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    dragRef.current = { dragging: true, ox: e.clientX - rect.right, oy: e.clientY - rect.bottom };
    e.preventDefault();
  };
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging || !panelRef.current) return;
      const right  = window.innerWidth  - e.clientX - dragRef.current.ox;
      const bottom = window.innerHeight - e.clientY - dragRef.current.oy;
      posRef.current = { x: Math.max(4, right), y: Math.max(4, bottom) };
      panelRef.current.style.right  = posRef.current.x + "px";
      panelRef.current.style.bottom = posRef.current.y + "px";
    };
    const onUp = () => { dragRef.current.dragging = false; };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  if (!visible) return null;

  const { fps, dropped, memUsed, memTotal, memPressure, thermal, fpsJitter, cpuLoad } = stats;
  const { batteryLevel, batteryCharging, targetFPS, reason } = adaptive;
  const canvasW = FPS_HISTORY * (BAR_W + BAR_GAP);

  return (
    <div
      ref={panelRef}
      style={{
        position: "fixed",
        right: posRef.current.x, bottom: posRef.current.y,
        zIndex: 99999,
        background: "rgba(6,6,8,0.96)",
        border: "1px solid #1f1f1f",
        borderRadius: 10,
        padding: "10px 14px 12px",
        width: 268,
        fontFamily: "monospace",
        fontSize: 11,
        color: "#a0a0a0",
        backdropFilter: "blur(12px)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.8), 0 0 0 1px rgba(226,18,39,0.15)",
        userSelect: "none",
      }}
    >
      {/* ── Header (drag handle) ─────────────────────────────────────── */}
      <div
        onMouseDown={onHeaderDown}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: 10, cursor: "move", borderBottom: "1px solid #1a1a1a", paddingBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#e21227", boxShadow: "0 0 6px #e21227" }} />
          <span style={{ color: "#e21227", fontWeight: 700, letterSpacing: 1.5, fontSize: 10 }}>SYS PERF</span>
        </div>
        <span style={{ color: "#333", fontSize: 9 }}>Ctrl+Shift+P</span>
      </div>

      {/* ── Ring gauges row ─────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-around", marginBottom: 10 }}>
        <Ring value={fps}     max={hz}  label="FPS"    color={fpsColor(fps)}     size={60} />
        <Ring value={cpuLoad} max={100} label="CPU %"  color={loadColor(cpuLoad)} size={60} />
        <Ring
          value={memTotal ? Math.round(memUsed / memTotal * 100) : 0}
          max={100} label="MEM %" color={pressureColor(memPressure)} size={60}
        />
      </div>

      {/* ── FPS graph ───────────────────────────────────────────────── */}
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={46}
        style={{ display: "block", borderRadius: 4, marginBottom: 10, width: "100%", height: 46 }}
      />

      {/* ── System info ─────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px 0", marginBottom: 10 }}>
        {[
          ["Hz",    hz + " Hz",         "#00e5ff"],
          ["DPR",   adaptive.dpr.toFixed(1) + "×",  "#a78bfa"],
          ["Cores", cores + " / " + (deviceMem !== null ? deviceMem + "GB" : "—"),  "#fbbf24"],
          ["FPS↓",  dropped + " drops", dropped > 5 ? "#e21227" : "#444"],
          ["Jitter",fpsJitter + " ms",  fpsJitter > 8 ? "#f97316" : "#444"],
          ["Heap",  memTotal ? `${memUsed}/${memTotal}MB` : `${memUsed}MB`, pressureColor(memPressure)],
        ].map(([label, val, color]) => (
          <div key={label as string} style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#444", fontSize: 9 }}>{label}</span>
            <span style={{ color: color as string, fontSize: 10, fontWeight: 600 }}>{val}</span>
          </div>
        ))}
      </div>

      {/* ── GPU ────────────────────────────────────────────────────────── */}
      <div style={{
        background: "#0c0c0c", borderRadius: 5, padding: "5px 8px",
        marginBottom: 8, border: "1px solid #1a1a1a",
      }}>
        <div style={{ color: "#444", fontSize: 9, marginBottom: 2 }}>GPU</div>
        <div style={{ color: "#c0c0c0", fontSize: 10, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {gpuRef.current.name}
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
          <Badge label="WebGL2"      ok={hasWebGL2}    />
          <Badge label="OffCanvas"   ok={hasOffscreen} />
          <Badge label="HW accel"    ok={hasWebGL2}    />
        </div>
      </div>

      {/* ── Thermal bar ─────────────────────────────────────────────── */}
      <Bar
        label="Thermal"
        value={{ nominal: 1, fair: 2, serious: 3, critical: 4 }[thermal]}
        max={4}
        color={thermalColor(thermal)}
        note={thermal}
      />
      <div style={{ marginBottom: 6 }} />

      {/* ── Battery ─────────────────────────────────────────────────── */}
      <Bar
        label={batteryCharging ? "Battery ⚡" : "Battery"}
        value={batteryLevel ?? 100}
        max={100}
        unit="%"
        color={battColor(batteryLevel, batteryCharging)}
        note={batteryLevel === null ? "no API" : batteryCharging ? "charging" : ""}
      />
      <div style={{ marginBottom: 8 }} />

      {/* ── Memory heap ─────────────────────────────────────────────── */}
      <Bar
        label="Heap"
        value={memUsed}
        max={memTotal || 512}
        unit=" MB"
        color={pressureColor(memPressure)}
      />
      <div style={{ marginBottom: 8 }} />

      {/* ── Adaptive FPS target ─────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "#0c0c0c", borderRadius: 5, padding: "5px 8px",
        border: "1px solid #1a1a1a", marginBottom: 8,
      }}>
        <div>
          <div style={{ color: "#444", fontSize: 9 }}>ADAPTIVE TARGET</div>
          <div style={{ color: fpsColor(targetFPS), fontWeight: 700, fontSize: 14 }}>{targetFPS} FPS</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "#333", fontSize: 9 }}>reason</div>
          <div style={{ color: "#555", fontSize: 9 }}>{reason}</div>
        </div>
      </div>

      {/* ── Action buttons ──────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        <button
          onClick={() => {
            const forced = !lowPower;
            setLowPower(forced);
            forced ? adaptiveFPS.forceLowPower() : adaptiveFPS.releaseLowPower();
          }}
          style={{
            background: lowPower ? "rgba(226,18,39,0.15)" : "transparent",
            border: `1px solid ${lowPower ? "rgba(226,18,39,0.4)" : "#262626"}`,
            color: lowPower ? "#e21227" : "#555",
            borderRadius: 5, padding: "4px 0", fontSize: 9, cursor: "pointer",
            fontFamily: "monospace", letterSpacing: 0.5,
          }}
        >
          {lowPower ? "LOW POWER ON" : "LOW POWER"}
        </button>
        <button
          onClick={() => { try { (window as { gc?: () => void }).gc?.(); } catch {} }}
          style={{
            background: "transparent", border: "1px solid #262626",
            color: "#555", borderRadius: 5, padding: "4px 0", fontSize: 9,
            cursor: "pointer", fontFamily: "monospace", letterSpacing: 0.5,
          }}
        >
          FORCE GC
        </button>
      </div>
    </div>
  );
}
