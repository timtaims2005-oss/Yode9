/**
 * Web Vitals Monitor — Real browser performance metrics.
 *
 * Collects (via PerformanceObserver):
 *  · LCP  – Largest Contentful Paint (load perception)
 *  · FCP  – First Contentful Paint   (first visible content)
 *  · CLS  – Cumulative Layout Shift  (visual stability)
 *  · INP  – Interaction to Next Paint (responsiveness, Chrome 96+)
 *  · TTFB – Time to First Byte        (server response)
 *  · LT   – Long Tasks (>50 ms JS blocks on main thread)
 *
 * Rating thresholds follow Google Core Web Vitals 2024 targets.
 */

export type VitalRating = "good" | "needs-improvement" | "poor";

export interface VitalEntry {
  name:   string;
  value:  number;
  unit:   string;
  rating: VitalRating;
  label:  string; // human-readable description
}

export interface WebVitalsSnapshot {
  lcp:       VitalEntry | null;
  fcp:       VitalEntry | null;
  cls:       VitalEntry | null;
  inp:       VitalEntry | null;
  ttfb:      VitalEntry | null;
  longTasks: number;           // count of long tasks (>50ms) since page load
  score:     number;           // 0-100 composite score
}

type Listener = (snap: WebVitalsSnapshot) => void;

/* ── rating helpers ──────────────────────────────────────────────────── */
function rateLCP(ms: number): VitalRating  { return ms <= 2500 ? "good" : ms <= 4000 ? "needs-improvement" : "poor"; }
function rateFCP(ms: number): VitalRating  { return ms <= 1800 ? "good" : ms <= 3000 ? "needs-improvement" : "poor"; }
function rateCLS(v:  number): VitalRating  { return v  <= 0.1  ? "good" : v  <= 0.25 ? "needs-improvement" : "poor"; }
function rateINP(ms: number): VitalRating  { return ms <= 200  ? "good" : ms <= 500  ? "needs-improvement" : "poor"; }
function rateTTFB(ms: number): VitalRating { return ms <= 800  ? "good" : ms <= 1800 ? "needs-improvement" : "poor"; }

function makeEntry(name: string, value: number, unit: string, rating: VitalRating, label: string): VitalEntry {
  return { name, value, unit, rating, label };
}

/* ── composite score (Google-style, higher = better) ─────────────────── */
function computeScore(snap: Partial<WebVitalsSnapshot>): number {
  const points: number[] = [];
  const add = (entry: VitalEntry | null | undefined) => {
    if (!entry) return;
    points.push(entry.rating === "good" ? 100 : entry.rating === "needs-improvement" ? 60 : 20);
  };
  add(snap.lcp); add(snap.fcp); add(snap.cls); add(snap.inp); add(snap.ttfb);
  if (!points.length) return 0;
  const raw = points.reduce((a, b) => a + b, 0) / points.length;
  const ltPenalty = Math.min(30, (snap.longTasks ?? 0) * 3);
  return Math.max(0, Math.round(raw - ltPenalty));
}

class WebVitalsMonitorClass {
  private _snap: WebVitalsSnapshot = {
    lcp: null, fcp: null, cls: null, inp: null, ttfb: null,
    longTasks: 0, score: 0,
  };
  private listeners  = new Set<Listener>();
  private observers: PerformanceObserver[] = [];
  private started    = false;

  start() {
    if (this.started || typeof window === "undefined" || !window.PerformanceObserver) return;
    this.started = true;

    // ── TTFB (Navigation Timing) ──────────────────────────────────────
    try {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (nav) {
        const ttfb = nav.responseStart - nav.requestStart;
        this._snap.ttfb = makeEntry("TTFB", Math.round(ttfb), "ms", rateTTFB(ttfb), "Time to First Byte");
      }
    } catch { /* ignore */ }

    // ── FCP ───────────────────────────────────────────────────────────
    this._observe("paint", (list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "first-contentful-paint") {
          const v = Math.round(entry.startTime);
          this._snap.fcp = makeEntry("FCP", v, "ms", rateFCP(v), "First Contentful Paint");
          this._emit();
        }
      }
    });

    // ── LCP ───────────────────────────────────────────────────────────
    this._observe("largest-contentful-paint", (list) => {
      const entries = list.getEntries();
      if (!entries.length) return;
      const last = entries[entries.length - 1];
      const v = Math.round(last.startTime);
      this._snap.lcp = makeEntry("LCP", v, "ms", rateLCP(v), "Largest Contentful Paint");
      this._emit();
    });

    // ── CLS ───────────────────────────────────────────────────────────
    let clsValue = 0;
    let clsSessionValue = 0;
    let clsSessionStart = 0;
    let clsMax = 0;
    this._observe("layout-shift", (list) => {
      for (const entry of list.getEntries()) {
        const ls = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
        if (!ls.hadRecentInput) {
          const now = ls.startTime;
          if (!clsSessionStart || now - clsSessionStart > 5000) {
            clsSessionStart = now;
            clsSessionValue = 0;
          }
          clsSessionValue += ls.value;
          clsValue = Math.max(clsValue, clsSessionValue);
          clsMax   = Math.max(clsMax, clsValue);
          const v  = Math.round(clsMax * 1000) / 1000;
          this._snap.cls = makeEntry("CLS", v, "", rateCLS(v), "Cumulative Layout Shift");
          this._emit();
        }
      }
    });

    // ── INP (Interaction to Next Paint, Chrome 96+) ───────────────────
    const inpTimes: number[] = [];
    this._observe("event", (list) => {
      for (const entry of list.getEntries()) {
        const ev = entry as PerformanceEntry & { processingEnd: number; processingStart: number };
        if (ev.processingEnd !== undefined) {
          const duration = Math.round(ev.processingEnd - entry.startTime);
          inpTimes.push(duration);
          inpTimes.sort((a, b) => b - a);
          if (inpTimes.length > 10) inpTimes.length = 10;
          // INP = high percentile of interaction delays
          const p98 = inpTimes[Math.floor(inpTimes.length * 0.02)] ?? inpTimes[0];
          this._snap.inp = makeEntry("INP", p98, "ms", rateINP(p98), "Interaction to Next Paint");
          this._emit();
        }
      }
    }, { durationThreshold: 16 });

    // ── Long Tasks (main-thread blocks >50ms) ─────────────────────────
    this._observe("longtask", (list) => {
      this._snap.longTasks += list.getEntries().length;
      this._emit();
    });

    this._emit();
  }

  private _observe(type: string, cb: (list: PerformanceObserverEntryList) => void, opts?: object) {
    try {
      const obs = new PerformanceObserver(cb);
      obs.observe({ type, buffered: true, ...(opts ?? {}) });
      this.observers.push(obs);
    } catch { /* type not supported in this browser */ }
  }

  private _emit() {
    this._snap.score = computeScore(this._snap);
    const snap = { ...this._snap };
    this.listeners.forEach(cb => cb(snap));
  }

  subscribe(cb: Listener) {
    this.listeners.add(cb);
    if (this._snap.score > 0 || this._snap.longTasks > 0) cb({ ...this._snap });
    return () => this.listeners.delete(cb);
  }

  get snapshot() { return { ...this._snap }; }

  destroy() {
    this.observers.forEach(o => { try { o.disconnect(); } catch { /* */ } });
    this.observers = [];
    this.started   = false;
  }
}

export const webVitals = new WebVitalsMonitorClass();

if (typeof window !== "undefined") {
  // Start after page load so we catch all LCP candidates
  if (document.readyState === "complete") {
    webVitals.start();
  } else {
    window.addEventListener("load", () => webVitals.start(), { once: true });
  }
}
