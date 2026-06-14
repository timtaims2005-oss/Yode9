import { getDetectedRefreshRate } from "./adaptive-quality";

/**
 * RAF-based render batcher with delta-time tracking.
 * Batches rapid state updates to one per animation frame.
 * Exposes lastDeltaMs for consumers that need smooth animation.
 */
export function createRAFBatcher<T>(
  onFlush: (latest: T, deltaMs: number) => void,
): { push: (val: T) => void; flush: (latest: T) => void; cancel: () => void; lastDeltaMs: number } {
  let rafId: number | null = null;
  let pending: T | null = null;
  let lastFrameTime = 0;
  let lastDeltaMs = 16.67;

  function flush(latest: T) {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    pending = null;
    onFlush(latest, lastDeltaMs);
  }

  function push(val: T) {
    pending = val;
    if (rafId !== null) return;
    rafId = requestAnimationFrame((ts: number) => {
      rafId = null;
      const now = ts;
      if (lastFrameTime > 0) {
        const raw = now - lastFrameTime;
        /* Clamp to [1ms, 100ms] to avoid spikes on tab-wake */
        lastDeltaMs = Math.max(1, Math.min(100, raw));
      }
      lastFrameTime = now;
      if (pending !== null) { const p = pending; pending = null; onFlush(p, lastDeltaMs); }
    });
  }

  function cancel() {
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
    pending = null;
  }

  const batcher = { push, flush, cancel, lastDeltaMs };
  return batcher;
}

/**
 * Delta-time normalised callback runner.
 * Ensures visual speed is identical at 60, 120, 144, 240 fps.
 * normFactor = (actualDeltaMs / targetFrameMs) — multiply velocity values by this.
 */
export function getDeltaNorm(deltaMs: number): number {
  const targetMs = 1000 / getDetectedRefreshRate();
  return Math.max(0.05, Math.min(4, deltaMs / targetMs));
}

/**
 * Throttle any function to fire at most once per minMs window.
 * Uses performance.now() for precision.
 */
export function createThrottle<T extends unknown[]>(
  fn: (...args: T) => void,
  minMs: number,
): { call: (...args: T) => void; flush: (...args: T) => void } {
  let last = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function call(...args: T) {
    const now = performance.now();
    if (now - last >= minMs) { last = now; fn(...args); return; }
    if (timer) return;
    timer = setTimeout(() => {
      timer = null; last = performance.now(); fn(...args);
    }, minMs - (now - last));
  }

  function flush(...args: T) {
    if (timer) { clearTimeout(timer); timer = null; }
    last = performance.now(); fn(...args);
  }

  return { call, flush };
}
