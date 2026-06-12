export type PerfSnapshot = {
  fps: number;
  memoryMB: number;
  memoryPct: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  tps: number;
  totalTokens: number;
  totalRequests: number;
  cacheHitRate: number;
  queueDepth: number;
  activeRequests: number;
  sessionStartMs: number;
};

type Subscriber = (snap: PerfSnapshot) => void;

class PerfMonitor {
  private frameCount = 0;
  private lastFpsTime = performance.now();
  private fps = 60;
  private rafId = 0;

  private latencies: number[] = [];
  private tpsWindow: { ts: number; tokens: number }[] = [];
  private totalTokens = 0;
  private totalRequests = 0;
  private cacheHitRate = 0;
  private queueDepth = 0;
  private activeRequests = 0;
  private sessionStartMs = Date.now();

  private subscribers = new Set<Subscriber>();
  private running = false;

  start() {
    if (this.running) return;
    this.running = true;
    this.tick();
    setInterval(() => this.broadcast(), 500);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = () => {
    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.lastFpsTime;
    if (elapsed >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
    if (this.running) this.rafId = requestAnimationFrame(this.tick);
  };

  recordLatency(ms: number) {
    this.latencies.push(ms);
    if (this.latencies.length > 200) this.latencies.shift();
    this.totalRequests++;
  }

  recordTokens(count: number) {
    this.totalTokens += count;
    const now = Date.now();
    this.tpsWindow.push({ ts: now, tokens: count });
    this.tpsWindow = this.tpsWindow.filter((e) => now - e.ts < 5000);
  }

  updateCache(hitRate: number) { this.cacheHitRate = hitRate; }
  updateQueue(depth: number, active: number) { this.queueDepth = depth; this.activeRequests = active; }

  subscribe(cb: Subscriber) {
    this.subscribers.add(cb);
    return () => { this.subscribers.delete(cb); };
  }

  private broadcast() {
    const snap = this.snapshot();
    this.subscribers.forEach((cb) => cb(snap));
  }

  snapshot(): PerfSnapshot {
    const sorted = [...this.latencies].sort((a, b) => a - b);
    const avg = sorted.length > 0 ? sorted.reduce((a, b) => a + b, 0) / sorted.length : 0;
    const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1] : 0;

    const now = Date.now();
    const window5s = this.tpsWindow.filter((e) => now - e.ts < 5000);
    const windowTokens = window5s.reduce((a, e) => a + e.tokens, 0);
    const tps = window5s.length > 0 ? windowTokens / 5 : 0;

    let memoryMB = 0;
    let memoryPct = 0;
    const mem = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    if (mem) {
      memoryMB = mem.usedJSHeapSize / 1_048_576;
      memoryPct = mem.usedJSHeapSize / mem.jsHeapSizeLimit;
    }

    return {
      fps: this.fps,
      memoryMB,
      memoryPct,
      avgLatencyMs: avg,
      p95LatencyMs: p95,
      tps,
      totalTokens: this.totalTokens,
      totalRequests: this.totalRequests,
      cacheHitRate: this.cacheHitRate,
      queueDepth: this.queueDepth,
      activeRequests: this.activeRequests,
      sessionStartMs: this.sessionStartMs,
    };
  }
}

export const perfMonitor = new PerfMonitor();

if (typeof window !== "undefined") {
  perfMonitor.start();
}
