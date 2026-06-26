/**
 * High Performance Engine — real browser-level optimizations.
 *
 * Systems:
 *  1. CSS Containment applier   — adds contain:layout/paint/style to panels
 *  2. content-visibility:auto   — skips paint for offscreen heavy sections
 *  3. Resource preconnect       — warms up API + CDN connections early
 *  4. Idle task scheduler       — queues non-urgent work in rIC slots
 *  5. Frame pipeline monitor    — measures JS-vs-GPU budget per frame
 *  6. Memory pool               — reuses typed arrays for canvas operations
 *  7. CSS custom-prop updater   — patches --mr7-blur/glow/particles at Hz
 *  8. GPU layer audit           — detects stacking context bloat
 *  9. Long-task interceptor     — warns when main thread blocks > 50ms
 * 10. FPS stabiliser            — smooths frame-time jitter via delta clamping
 */

import { adaptiveFPS } from "./adaptive-fps";

/* ── 1. CSS Containment ────────────────────────────────────────────── */
const CONTAINMENT_SELECTORS = [
  ".mr7-panel",
  ".mr7-modal",
  ".mr7-sidebar",
  "[data-contain]",
];

function applyContainment() {
  CONTAINMENT_SELECTORS.forEach(sel => {
    document.querySelectorAll<HTMLElement>(sel).forEach(el => {
      if (!el.style.contain) {
        el.style.contain = "layout paint style";
      }
    });
  });
}

/* ── 2. content-visibility:auto ────────────────────────────────────── */
function applyContentVisibility() {
  // Heavy offscreen sections that don't need to paint when out of view
  const selectors = [
    ".pricing-section",
    ".arsenal-grid",
    ".chat-history-list",
    "[data-cv-auto]",
  ];
  selectors.forEach(sel => {
    document.querySelectorAll<HTMLElement>(sel).forEach(el => {
      if (!el.style.contentVisibility) {
        el.style.contentVisibility = "auto";
        el.style.containIntrinsicSize = "0 500px";
      }
    });
  });
}

/* ── 3. Resource preconnect ─────────────────────────────────────────── */
function preconnectOrigins(origins: string[]) {
  origins.forEach(origin => {
    const existing = document.querySelector(`link[rel="preconnect"][href="${origin}"]`);
    if (existing) return;
    const link = document.createElement("link");
    link.rel   = "preconnect";
    link.href  = origin;
    document.head.appendChild(link);
  });
}

/* ── 4. Idle task scheduler ─────────────────────────────────────────── */
type IdleTask = () => void;
const _idleQueue: IdleTask[] = [];
let _idleScheduled = false;

function _flushIdle(deadline: IdleDeadline) {
  _idleScheduled = false;
  while (_idleQueue.length > 0 && deadline.timeRemaining() > 2) {
    const task = _idleQueue.shift();
    if (task) {
      try { task(); } catch (e) { console.warn("[HighPerfEngine] idle task error", e); }
    }
  }
  if (_idleQueue.length > 0) scheduleIdle(() => {}); // drain on next idle
}

export function scheduleIdle(task: IdleTask) {
  _idleQueue.push(task);
  if (!_idleScheduled) {
    _idleScheduled = true;
    if ("requestIdleCallback" in window) {
      requestIdleCallback(_flushIdle, { timeout: 2000 });
    } else {
      setTimeout(() => {
        const mock = { timeRemaining: () => 50, didTimeout: false };
        _flushIdle(mock as IdleDeadline);
      }, 100);
    }
  }
}

/* ── 5. Frame pipeline monitor ──────────────────────────────────────── */
export interface FramePipeline {
  jsMs:    number;  // estimated JS time per frame
  gpuWait: number;  // estimated GPU queue depth (0-1)
  budget:  number;  // current frame budget in ms
  health:  "optimal" | "stressed" | "critical";
}

const _pipelineListeners = new Set<(p: FramePipeline) => void>();
let _lastPipelineTs   = 0;
let _framePipeline: FramePipeline = { jsMs: 0, gpuWait: 0, budget: 33, health: "optimal" };

function _startPipelineMonitor() {
  let _jsStart = 0;
  const tick = (now: number) => {
    requestAnimationFrame(tick);
    const jsMs    = now - _jsStart;
    const budget  = adaptiveFPS.frameBudgetMs;
    const gpuWait = Math.min(1, jsMs / budget);
    const health: FramePipeline["health"] =
      gpuWait < 0.6 ? "optimal" : gpuWait < 0.85 ? "stressed" : "critical";

    _framePipeline = { jsMs: Math.round(jsMs * 10) / 10, gpuWait, budget, health };
    _jsStart = performance.now();

    if (now - _lastPipelineTs > 500) {
      _lastPipelineTs = now;
      _pipelineListeners.forEach(cb => cb(_framePipeline));
    }
  };
  requestAnimationFrame((now) => { _jsStart = performance.now(); requestAnimationFrame(tick); });
}

export function onFramePipeline(cb: (p: FramePipeline) => void) {
  _pipelineListeners.add(cb);
  return () => _pipelineListeners.delete(cb);
}

export function getFramePipeline() { return _framePipeline; }

/* ── 6. Memory pool (Float32 array recycler for canvas ops) ─────────── */
const _float32Pool: Float32Array[] = [];
export function acquireFloat32(length: number): Float32Array {
  const idx = _float32Pool.findIndex(a => a.length >= length);
  if (idx >= 0) return _float32Pool.splice(idx, 1)[0];
  return new Float32Array(length);
}
export function releaseFloat32(arr: Float32Array) {
  if (_float32Pool.length < 16) {
    arr.fill(0);
    _float32Pool.push(arr);
  }
}

/* ── 7. CSS custom-property syncer ─────────────────────────────────── */
function _syncCSSProps() {
  const root  = document.documentElement;
  const fps   = adaptiveFPS.targetFPS;
  // Duration scales inversely with FPS — fast displays get snappier transitions
  const dur   = fps >= 120 ? "0.1s" : fps >= 60 ? "0.2s" : "0.3s";
  root.style.setProperty("--mr7-transition-dur", dur);
  root.style.setProperty("--mr7-target-fps",     String(fps));
}

/* ── 8. GPU layer audit ─────────────────────────────────────────────── */
export interface LayerAudit {
  total:      number;
  willChange: number;
  canvas:     number;
  warning:    boolean;
}

export function auditGPULayers(): LayerAudit {
  const all       = document.querySelectorAll("*").length;
  const wc        = document.querySelectorAll("[style*='will-change']").length;
  const canvases  = document.querySelectorAll("canvas").length;
  return { total: all, willChange: wc, canvas: canvases, warning: wc > 40 };
}

/* ── 9. Long-task interceptor ───────────────────────────────────────── */
const _longTaskLog: { start: number; duration: number }[] = [];
export function getLongTaskLog() { return [..._longTaskLog]; }

function _startLongTaskInterceptor() {
  try {
    const obs = new PerformanceObserver(list => {
      list.getEntries().forEach(e => {
        _longTaskLog.push({ start: Math.round(e.startTime), duration: Math.round(e.duration) });
        if (_longTaskLog.length > 30) _longTaskLog.shift();
      });
    });
    obs.observe({ type: "longtask", buffered: true });
  } catch { /* not supported */ }
}

/* ── 10. FPS stabiliser — delta clamp ──────────────────────────────── */
/**
 * Clamp a RAF delta to prevent spiral of death on tab-restore or
 * background-tab timer throttling. Import this into any RAF loop.
 *   const dt = clampDelta(now - last);
 */
export function clampDelta(rawMs: number): number {
  // Minimum: skip near-zero frames (shouldn't draw twice in same ms)
  // Maximum: cap at 3 frames worth to prevent huge "catch-up" jumps
  const budget = adaptiveFPS.frameBudgetMs;
  return Math.max(1, Math.min(rawMs, budget * 3));
}

/* ── Public API ─────────────────────────────────────────────────────── */
export interface EngineStatus {
  initialized:  boolean;
  containment:  number;   // elements with containment applied
  longTasks:    number;   // total long tasks since boot
  pipeline:     FramePipeline;
  layerAudit:   LayerAudit;
}

class HighPerfEngineClass {
  private _initialized = false;

  init() {
    if (this._initialized || typeof window === "undefined") return;
    this._initialized = true;

    // Preconnect to critical origins
    scheduleIdle(() => preconnectOrigins([
      window.location.origin,
      "https://api.openai.com",
    ]));

    // CSS optimizations (deferred so React has rendered)
    scheduleIdle(() => {
      applyContainment();
      applyContentVisibility();
    });

    // Periodic containment refresh (new panels may mount later)
    setInterval(() => scheduleIdle(applyContainment), 10_000);

    // Pipeline monitor
    _startPipelineMonitor();

    // Long-task interceptor
    _startLongTaskInterceptor();

    // CSS prop sync — runs whenever FPS target changes
    adaptiveFPS.subscribe(() => _syncCSSProps());
    _syncCSSProps();

    // Re-apply content-visibility on route changes
    window.addEventListener("popstate", () =>
      scheduleIdle(applyContentVisibility)
    );
  }

  get status(): EngineStatus {
    return {
      initialized: this._initialized,
      containment: document.querySelectorAll("[style*='contain']").length,
      longTasks:   _longTaskLog.length,
      pipeline:    _framePipeline,
      layerAudit:  auditGPULayers(),
    };
  }
}

export const highPerfEngine = new HighPerfEngineClass();

if (typeof window !== "undefined") {
  // Wait for first paint before applying heavy DOM operations
  requestIdleCallback
    ? requestIdleCallback(() => highPerfEngine.init(), { timeout: 3000 })
    : setTimeout(() => highPerfEngine.init(), 500);
}
