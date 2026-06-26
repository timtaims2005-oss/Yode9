/**
 * perf144 — Global 144fps Performance Engine
 * Measures real FPS, frame-time budget, memory, and network quality.
 * All canvas animation loops should derive their delta-time from this module.
 */

export const TARGET_FPS = 144;
export const TARGET_FRAME_MS = 1000 / TARGET_FPS; // ~6.94ms

// ── Rolling FPS store (shared across the app) ─────────────────────────────
type PerfListener = (state: PerfState) => void;

export interface PerfState {
  fps: number;
  frameMs: number;
  memMB: number;
  memLimit: number;
  netType: string;
  netDownlink: number;
  rtt: number;
  budgetOk: boolean;
  targetFps: number;
  history: number[];  // last 60 fps samples
}

const HISTORY_LEN = 60;
const listeners = new Set<PerfListener>();
let rafHandle = 0;
let lastTs = 0;
const frameTimes: number[] = [];
const fpsHistory: number[] = Array(HISTORY_LEN).fill(0);
let running = false;

function getNetInfo() {
  const nav = navigator as Navigator & {
    connection?: { effectiveType?: string; downlink?: number; rtt?: number };
  };
  const c = nav.connection;
  return {
    netType: c?.effectiveType ?? "unknown",
    netDownlink: c?.downlink ?? 0,
    rtt: c?.rtt ?? 0,
  };
}

function getMemInfo() {
  const p = performance as Performance & {
    memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number };
  };
  if (!p.memory) return { memMB: 0, memLimit: 0 };
  return {
    memMB: Math.round(p.memory.usedJSHeapSize / 1048576),
    memLimit: Math.round(p.memory.jsHeapSizeLimit / 1048576),
  };
}

function tick(ts: number) {
  if (lastTs) {
    const dt = ts - lastTs;
    frameTimes.push(dt);
    if (frameTimes.length > HISTORY_LEN) frameTimes.shift();
  }
  lastTs = ts;

  // Compute FPS from rolling window
  const avgMs = frameTimes.length
    ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length
    : 16.67;
  const fps = Math.min(Math.round(1000 / avgMs), 999);
  fpsHistory.push(fps);
  if (fpsHistory.length > HISTORY_LEN) fpsHistory.shift();

  const frameMs = Math.round(avgMs * 10) / 10;
  const { memMB, memLimit } = getMemInfo();
  const { netType, netDownlink, rtt } = getNetInfo();

  const state: PerfState = {
    fps,
    frameMs,
    memMB,
    memLimit,
    netType,
    netDownlink,
    rtt,
    budgetOk: avgMs <= TARGET_FRAME_MS * 1.5,
    targetFps: TARGET_FPS,
    history: [...fpsHistory],
  };

  listeners.forEach((fn) => fn(state));
  rafHandle = requestAnimationFrame(tick);
}

export function startPerfEngine() {
  if (running) return;
  running = true;
  rafHandle = requestAnimationFrame(tick);
}

export function stopPerfEngine() {
  running = false;
  cancelAnimationFrame(rafHandle);
}

export function subscribePerfState(fn: PerfListener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Delta-time helper for canvas loops ────────────────────────────────────
/**
 * Wraps requestAnimationFrame with accurate delta-time.
 * Callback receives `dt` in seconds (capped at 0.05s to prevent spiral of death).
 * Returns cancel function.
 */
export function createLoop(callback: (dt: number, ts: number) => void): () => void {
  let handle = 0;
  let prev = 0;

  function frame(ts: number) {
    const dt = prev ? Math.min((ts - prev) / 1000, 0.05) : 1 / TARGET_FPS;
    prev = ts;
    callback(dt, ts);
    handle = requestAnimationFrame(frame);
  }

  handle = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(handle);
}
