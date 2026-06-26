/**
 * Memory Pressure Monitor
 * Reads JS heap via performance.memory (Chrome), estimates via PerformanceObserver,
 * emits pressure levels, triggers registered cleanup callbacks on high pressure.
 * Prevents memory leaks by capping in-memory chat messages and clearing caches.
 */

export type PressureLevel = "nominal" | "moderate" | "critical";

interface MemoryStats {
  heapUsedMB: number;
  heapTotalMB: number;
  heapLimitMB: number;
  usagePct: number;
  pressure: PressureLevel;
}

type CleanupCallback = () => void;

const MODERATE_THRESHOLD = 0.65; // 65% heap
const CRITICAL_THRESHOLD = 0.85; // 85% heap
const POLL_INTERVAL_MS = 5000;

class MemoryPressureMonitor {
  private callbacks = new Map<string, CleanupCallback>();
  private listeners = new Set<(stats: MemoryStats) => void>();
  private stats: MemoryStats = {
    heapUsedMB: 0, heapTotalMB: 0, heapLimitMB: 0, usagePct: 0, pressure: "nominal",
  };
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastPressure: PressureLevel = "nominal";

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.poll(), POLL_INTERVAL_MS);
    this.poll(); // immediate first poll
  }

  stop() {
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }

  /** Register a cleanup callback triggered on memory pressure */
  registerCleanup(key: string, fn: CleanupCallback) {
    this.callbacks.set(key, fn);
    return () => this.callbacks.delete(key);
  }

  onStats(cb: (stats: MemoryStats) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  get currentStats() { return this.stats; }

  private poll() {
    const mem = (performance as unknown as { memory?: {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    } }).memory;

    let stats: MemoryStats;

    if (mem) {
      const used = mem.usedJSHeapSize / 1048576;
      const total = mem.totalJSHeapSize / 1048576;
      const limit = mem.jsHeapSizeLimit / 1048576;
      const pct = used / limit;
      stats = {
        heapUsedMB: Math.round(used * 10) / 10,
        heapTotalMB: Math.round(total * 10) / 10,
        heapLimitMB: Math.round(limit),
        usagePct: Math.round(pct * 100),
        pressure: pct >= CRITICAL_THRESHOLD ? "critical" : pct >= MODERATE_THRESHOLD ? "moderate" : "nominal",
      };
    } else {
      // Fallback: estimate from navigator.deviceMemory
      const deviceMem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;
      const estimatedLimit = deviceMem * 512; // rough estimate in MB
      stats = { heapUsedMB: 0, heapTotalMB: 0, heapLimitMB: estimatedLimit, usagePct: 0, pressure: "nominal" };
    }

    this.stats = stats;
    this.listeners.forEach(cb => cb(stats));

    // Trigger cleanups on pressure change
    if (stats.pressure !== this.lastPressure) {
      this.lastPressure = stats.pressure;
      if (stats.pressure === "moderate" || stats.pressure === "critical") {
        this.runCleanups(stats.pressure);
      }
    }
  }

  private runCleanups(level: PressureLevel) {
    console.info(`[MemoryPressure] ${level} — running ${this.callbacks.size} cleanup(s)`);
    for (const [key, fn] of this.callbacks) {
      try { fn(); } catch (e) { console.warn(`[MemoryPressure] cleanup "${key}" failed:`, e); }
    }
  }
}

export const memoryPressure = new MemoryPressureMonitor();
