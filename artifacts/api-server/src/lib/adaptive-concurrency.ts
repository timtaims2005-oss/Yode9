/**
 * Adaptive Concurrency Controller v4.0
 * Dynamically adjusts concurrency limits based on response latency,
 * error rates, and system load. Implements AIMD and gradient descent.
 */

export interface ConcurrencyStats {
  current: number;
  min: number;
  max: number;
  inflight: number;
  avgLatencyMs: number;
  errorRate: number;
  throughput: number; // requests/sec
  state: "stable" | "probing" | "decreasing" | "recovering";
}

export class AdaptiveConcurrencyController {
  private limit: number;
  private readonly minLimit: number;
  private readonly maxLimit: number;
  private inflight = 0;
  private queue: Array<() => void> = [];
  private latencies: number[] = [];
  private errors = 0;
  private requests = 0;
  private lastAdjust = Date.now();
  private state: ConcurrencyStats["state"] = "stable";
  private readonly adjustIntervalMs: number;
  private _timer: ReturnType<typeof setInterval>;

  constructor(opts: { initial?: number; min?: number; max?: number; adjustIntervalMs?: number } = {}) {
    this.limit = opts.initial ?? 10;
    this.minLimit = opts.min ?? 2;
    this.maxLimit = opts.max ?? 200;
    this.adjustIntervalMs = opts.adjustIntervalMs ?? 5000;
    this._timer = setInterval(() => this.adjust(), this.adjustIntervalMs);
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    const start = Date.now();
    try {
      const result = await fn();
      this.recordLatency(Date.now() - start);
      return result;
    } catch (err) {
      this.errors++;
      throw err;
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    return new Promise(resolve => {
      if (this.inflight < this.limit) {
        this.inflight++;
        this.requests++;
        resolve();
      } else {
        this.queue.push(() => { this.inflight++; this.requests++; resolve(); });
      }
    });
  }

  private release(): void {
    this.inflight--;
    const next = this.queue.shift();
    if (next) next();
  }

  private recordLatency(ms: number): void {
    this.latencies.push(ms);
    if (this.latencies.length > 100) this.latencies.shift();
  }

  private adjust(): void {
    const avgLat = this.avgLatency();
    const errRate = this.requests > 0 ? this.errors / this.requests : 0;
    const throughput = this.requests / (this.adjustIntervalMs / 1000);

    this.errors = 0;
    this.requests = 0;
    this.lastAdjust = Date.now();

    if (errRate > 0.1 || avgLat > 5000) {
      this.limit = Math.max(this.minLimit, Math.floor(this.limit * 0.7));
      this.state = "decreasing";
    } else if (errRate < 0.01 && avgLat < 500 && this.inflight >= this.limit * 0.8) {
      this.limit = Math.min(this.maxLimit, this.limit + Math.ceil(this.limit * 0.1));
      this.state = "probing";
    } else if (errRate < 0.05) {
      this.state = "stable";
    } else {
      this.state = "recovering";
    }
  }

  private avgLatency(): number {
    if (this.latencies.length === 0) return 0;
    return this.latencies.reduce((a,b) => a+b, 0) / this.latencies.length;
  }

  stats(): ConcurrencyStats {
    const total = this.latencies.length;
    return {
      current: this.limit,
      min: this.minLimit,
      max: this.maxLimit,
      inflight: this.inflight,
      avgLatencyMs: Math.round(this.avgLatency()),
      errorRate: this.requests > 0 ? Math.round(this.errors / this.requests * 100) / 100 : 0,
      throughput: this.requests / (this.adjustIntervalMs / 1000),
      state: this.state,
    };
  }

  destroy(): void { clearInterval(this._timer); }
}

export const globalConcurrency = new AdaptiveConcurrencyController({
  initial: 20, min: 4, max: 100, adjustIntervalMs: 10000,
});
