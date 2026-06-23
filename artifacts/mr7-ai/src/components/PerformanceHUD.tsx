/**
 * PerformanceHUD — Real-time GPU/CPU/FPS/Memory overlay.
 * Toggle: Ctrl+Shift+P
 * Shows: FPS graph, frame variance, memory heap, worker threads, thermal state,
 *        dropped frames, GPU layer count, paint frequency.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { frameScheduler } from "@/lib/frame-scheduler";
import { memoryPressure, type PressureLevel } from "@/lib/memory-pressure";
import { thermalGuard, type ThermalState } from "@/lib/thermal-guard";
import { workerPool } from "@/lib/worker-pool";
import { gpuLayerManager } from "@/lib/gpu-layer-manager";
import { idleQueue } from "@/lib/idle-queue";

const FPS_HISTORY = 60;
const BAR_W = 3;
const BAR_GAP = 1;

function fpsColor(fps: number): string {
  if (fps >= 55) return "#00ff88";
  if (fps >= 40) return "#fbbf24";
  return "#e21227";
}

function thermalColor(state: ThermalState): string {
  const map: Record<ThermalState, string> = {
    nominal: "#00ff88", fair: "#fbbf24", serious: "#f97316", critical: "#e21227",
  };
  return map[state];
}

function pressureColor(p: PressureLevel): string {
  const map: Record<PressureLevel, string> = { nominal: "#00ff88", moderate: "#fbbf24", critical: "#e21227" };
  return map[p];
}

interface HUDStats {
  fps: number;
  dropped: number;
  memUsed: number;
  memTotal: number;
  memPressure: PressureLevel;
  thermal: ThermalState;
  fpsJitter: number;
  workers: number;
  gpuLayers: number;
  idleQueue: number;
}

export function PerformanceHUD() {
  const [visible, setVisible] = useState(false);
  const [stats, setStats] = useState<HUDStats>({
    fps: 60, dropped: 0, memUsed: 0, memTotal: 0, memPressure: "nominal",
    thermal: "nominal", fpsJitter: 0, workers: 0, gpuLayers: 0, idleQueue: 0,
  });
  const fpsHistRef = useRef<number[]>(Array(FPS_HISTORY).fill(60));
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const rafRef     = useRef<number | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef   = useRef(0);

  // Keyboard toggle Ctrl+Shift+P
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        setVisible(v => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // FPS sampler — independent RAF loop
  useEffect(() => {
    if (!visible) return;
    const tick = (now: number) => {
      rafRef.current = requestAnimationFrame(tick);
      if (lastTimeRef.current === 0) { lastTimeRef.current = now; return; }
      const delta = now - lastTimeRef.current;
      lastTimeRef.current = now;
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 30) frameTimesRef.current.shift();
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); lastTimeRef.current = 0; };
  }, [visible]);

  // Stats aggregator — runs on frameScheduler
  useEffect(() => {
    if (!visible) return;
    const unsubFPS = frameScheduler.onMetrics((fps, dropped) => {
      fpsHistRef.current.push(fps);
      if (fpsHistRef.current.length > FPS_HISTORY) fpsHistRef.current.shift();

      const times = frameTimesRef.current;
      const avg = times.length ? times.reduce((a, b) => a + b, 0) / times.length : 16.67;
      const jitter = times.length
        ? Math.sqrt(times.reduce((s, t) => s + (t - avg) ** 2, 0) / times.length)
        : 0;

      const mem = memoryPressure.currentStats;
      setStats(s => ({
        ...s,
        fps,
        dropped,
        fpsJitter: Math.round(jitter * 10) / 10,
        memUsed: mem.heapUsedMB,
        memTotal: mem.heapLimitMB,
        memPressure: mem.pressure,
        workers: workerPool.workerCount,
        gpuLayers: gpuLayerManager.layerCount,
        idleQueue: idleQueue.size,
      }));
    });

    const unsubMem = memoryPressure.onStats((m) =>
      setStats(s => ({ ...s, memUsed: m.heapUsedMB, memTotal: m.heapLimitMB, memPressure: m.pressure }))
    );

    const unsubThermal = thermalGuard.onMetrics((m) =>
      setStats(s => ({ ...s, thermal: m.state, fps: m.fps || s.fps }))
    );

    return () => { unsubFPS(); unsubMem(); unsubThermal(); };
  }, [visible]);

  // Canvas FPS graph
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Background
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, width, height);

    // 60fps line
    ctx.strokeStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.moveTo(0, height * (1 - 60 / 120));
    ctx.lineTo(width, height * (1 - 60 / 120));
    ctx.stroke();

    // Bars
    const hist = fpsHistRef.current;
    hist.forEach((fps, i) => {
      const barH = (fps / 120) * height;
      const x = i * (BAR_W + BAR_GAP);
      ctx.fillStyle = fpsColor(fps);
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x, height - barH, BAR_W, barH);
    });
    ctx.globalAlpha = 1;
  }, []);

  useEffect(() => {
    if (!visible) return;
    const id = setInterval(drawGraph, 200);
    return () => clearInterval(id);
  }, [visible, drawGraph]);

  if (!visible) return null;

  const { fps, dropped, memUsed, memTotal, memPressure, thermal, fpsJitter, workers, gpuLayers, idleQueue: idleCount } = stats;
  const canvasW = FPS_HISTORY * (BAR_W + BAR_GAP);

  return (
    <div
      style={{
        position: "fixed", bottom: 48, right: 12, zIndex: 99999,
        background: "rgba(8,8,8,0.92)", border: "1px solid #262626",
        borderRadius: 8, padding: "10px 12px", minWidth: 220,
        fontFamily: "monospace", fontSize: 11, color: "#a0a0a0",
        backdropFilter: "blur(8px)", boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
        userSelect: "none",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: "#e21227", fontWeight: 700, letterSpacing: 1 }}>PERF HUD</span>
        <span style={{ color: "#444", fontSize: 10 }}>Ctrl+Shift+P</span>
      </div>

      {/* FPS Graph */}
      <canvas
        ref={canvasRef}
        width={canvasW}
        height={48}
        style={{ display: "block", borderRadius: 4, marginBottom: 8, width: "100%", height: 48 }}
      />

      {/* Metrics grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
        <Metric label="FPS" value={`${fps}`} color={fpsColor(fps)} />
        <Metric label="Jitter" value={`${fpsJitter}ms`} color={fpsJitter > 8 ? "#f97316" : "#a0a0a0"} />
        <Metric label="Drops" value={`${dropped}`} color={dropped > 5 ? "#e21227" : "#a0a0a0"} />
        <Metric label="Thermal" value={thermal} color={thermalColor(thermal)} />
        <Metric
          label="Heap"
          value={memTotal ? `${memUsed}/${memTotal}MB` : `${memUsed}MB`}
          color={pressureColor(memPressure)}
        />
        <Metric label="Pressure" value={memPressure} color={pressureColor(memPressure)} />
        <Metric label="GPU Layers" value={`${gpuLayers}/${gpuLayerManager.budget}`} color="#a0a0a0" />
        <Metric label="Workers" value={`${workers}`} color={workers > 0 ? "#00ff88" : "#444"} />
        <Metric label="Idle Q" value={`${idleCount}`} color="#a0a0a0" />
        <Metric label="RAF Tasks" value="—" color="#a0a0a0" />
      </div>

      {/* Thermal bar */}
      <div style={{ marginTop: 8, height: 3, borderRadius: 2, background: "#1a1a1a", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 2,
          background: thermalColor(thermal),
          width: thermal === "nominal" ? "20%" : thermal === "fair" ? "50%" : thermal === "serious" ? "80%" : "100%",
          transition: "width 0.4s, background 0.4s",
        }} />
      </div>
      <div style={{ marginTop: 2, fontSize: 9, color: "#444", textAlign: "right" }}>CPU THERMAL</div>
    </div>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
      <span style={{ color: "#555", fontSize: 10 }}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  );
}
