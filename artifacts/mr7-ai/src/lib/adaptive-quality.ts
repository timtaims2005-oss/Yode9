export type QualityLevel = "high" | "medium" | "low";

/** True when the user has requested less motion in OS settings */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function detect(): QualityLevel {
  if (typeof window === "undefined") return "high";
  if (prefersReducedMotion()) return "low";

  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8;
  const cores = navigator.hardwareConcurrency ?? 4;
  const dpr = window.devicePixelRatio ?? 1;
  const isMobile = /Mobi|Android|iPhone|iPad/.test(navigator.userAgent);

  const score = (mem >= 8 ? 3 : mem >= 4 ? 2 : 1)
    + (cores >= 8 ? 3 : cores >= 4 ? 2 : 1)
    + (dpr <= 1 ? 2 : dpr <= 2 ? 1 : 0)
    + (isMobile ? -2 : 0);

  if (score >= 7) return "high";
  if (score >= 4) return "medium";
  return "low";
}

let _cached: QualityLevel | null = null;

export function getQualityLevel(): QualityLevel {
  if (!_cached) _cached = detect();
  return _cached;
}

export function getCanvasConfig() {
  const q = getQualityLevel();
  const safeDpr = Math.min(window.devicePixelRatio || 1, 1.5);
  return {
    nodeCount:     q === "high" ? 20 : q === "medium" ? 12 : 6,
    particleCount: q === "high" ? 35 : q === "medium" ? 18 : 8,
    gridCols:      q === "high" ? 20 : q === "medium" ? 14 : 8,
    gridRows:      q === "high" ? 16 : q === "medium" ? 12 : 6,
    glitchEnabled: q === "high",
    beamEnabled:   q !== "low",
    dpr:           q === "high" ? safeDpr : 1,
    targetFps:     q === "high" ? Math.min(_detectedRefreshRate, 144) : 30,
    frameBudgetMs: q === "high" ? (1000 / Math.min(_detectedRefreshRate, 144)) : 33,
  };
}

export function getStreamFlushMs(): number {
  const q = getQualityLevel();
  return q === "high" ? 32 : q === "medium" ? 48 : 64;
}

/* ── Real display capability detection ──────────────────────────────────── */
let _detectedRefreshRate = 60;
let _offscreenCanvasSupport = false;
let _webgl2Support = false;
let _rateDetected = false;

export function getDetectedRefreshRate() { return _detectedRefreshRate; }
export function supportsOffscreenCanvas() { return _offscreenCanvasSupport; }
export function supportsWebGL2() { return _webgl2Support; }

/**
 * Detects real screen refresh rate from 12 consecutive RAF timestamps.
 * Also checks OffscreenCanvas and WebGL2 support.
 * Call once on app init — resolves in ~200ms.
 */
export function initDisplayCapabilities(): Promise<void> {
  if (typeof window === "undefined" || _rateDetected) return Promise.resolve();
  _offscreenCanvasSupport = typeof OffscreenCanvas !== "undefined";
  try { _webgl2Support = !!(document.createElement("canvas").getContext("webgl2")); } catch { _webgl2Support = false; }

  return new Promise<void>((resolve) => {
    const deltas: number[] = [];
    let last = 0;
    function frame(ts: number) {
      if (last > 0) deltas.push(ts - last);
      last = ts;
      if (deltas.length < 11) { requestAnimationFrame(frame); return; }
      const avgMs = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      const raw = Math.round(1000 / avgMs);
      _detectedRefreshRate = raw >= 220 ? 240 : raw >= 130 ? 144 : raw >= 110 ? 120 : 60;
      _rateDetected = true;
      resolve();
    }
    requestAnimationFrame(frame);
  });
}
