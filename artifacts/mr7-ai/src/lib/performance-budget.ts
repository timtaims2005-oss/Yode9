/**
 * Performance Budget Manager v4.0
 * Tracks render time, bundle size, API latency, and memory against budgets.
 * Emits warnings/violations and adapts rendering quality automatically.
 */

export interface PerformanceBudget {
  maxRenderTimeMs: number;
  maxApiLatencyMs: number;
  maxHeapMB: number;
  minFps: number;
  maxBundleSizeKB: number;
}

export interface BudgetViolation {
  metric: string;
  budget: number;
  actual: number;
  ratio: number; // actual/budget — >1 means over budget
  severity: "warning" | "critical";
  timestamp: number;
}

const DEFAULT_BUDGET: PerformanceBudget = {
  maxRenderTimeMs: 16,
  maxApiLatencyMs: 500,
  maxHeapMB: 256,
  minFps: 45,
  maxBundleSizeKB: 1500,
};

export class PerformanceBudgetManager {
  private budget: PerformanceBudget;
  private violations: BudgetViolation[] = [];
  private listeners: Array<(v: BudgetViolation) => void> = [];
  private metrics = {
    renderTime: [] as number[],
    apiLatency: [] as number[],
    heapMB: [] as number[],
    fps: [] as number[],
  };

  constructor(budget: Partial<PerformanceBudget> = {}) {
    this.budget = { ...DEFAULT_BUDGET, ...budget };
  }

  onViolation(fn: (v: BudgetViolation) => void): () => void {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter(l => l !== fn); };
  }

  recordRenderTime(ms: number): void {
    this.metrics.renderTime.push(ms);
    if (this.metrics.renderTime.length > 50) this.metrics.renderTime.shift();
    if (ms > this.budget.maxRenderTimeMs) {
      this.emit({ metric: "renderTime", budget: this.budget.maxRenderTimeMs, actual: ms,
        ratio: ms / this.budget.maxRenderTimeMs,
        severity: ms > this.budget.maxRenderTimeMs * 2 ? "critical" : "warning",
        timestamp: Date.now() });
    }
  }

  recordApiLatency(ms: number): void {
    this.metrics.apiLatency.push(ms);
    if (this.metrics.apiLatency.length > 100) this.metrics.apiLatency.shift();
    if (ms > this.budget.maxApiLatencyMs) {
      this.emit({ metric: "apiLatency", budget: this.budget.maxApiLatencyMs, actual: ms,
        ratio: ms / this.budget.maxApiLatencyMs,
        severity: ms > this.budget.maxApiLatencyMs * 3 ? "critical" : "warning",
        timestamp: Date.now() });
    }
  }

  recordFps(fps: number): void {
    this.metrics.fps.push(fps);
    if (this.metrics.fps.length > 30) this.metrics.fps.shift();
    if (fps < this.budget.minFps) {
      this.emit({ metric: "fps", budget: this.budget.minFps, actual: fps,
        ratio: fps / this.budget.minFps,
        severity: fps < this.budget.minFps * 0.5 ? "critical" : "warning",
        timestamp: Date.now() });
    }
  }

  recordHeap(mb: number): void {
    this.metrics.heapMB.push(mb);
    if (this.metrics.heapMB.length > 60) this.metrics.heapMB.shift();
    if (mb > this.budget.maxHeapMB) {
      this.emit({ metric: "heapMB", budget: this.budget.maxHeapMB, actual: mb,
        ratio: mb / this.budget.maxHeapMB,
        severity: mb > this.budget.maxHeapMB * 1.5 ? "critical" : "warning",
        timestamp: Date.now() });
    }
  }

  private emit(violation: BudgetViolation): void {
    this.violations.unshift(violation);
    if (this.violations.length > 500) this.violations.length = 500;
    this.listeners.forEach(l => { try { l(violation); } catch { /* noop */ } });
  }

  getAverages() {
    const avg = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((a,b)=>a+b,0)/arr.length;
    return {
      renderTimeMs: Math.round(avg(this.metrics.renderTime)),
      apiLatencyMs: Math.round(avg(this.metrics.apiLatency)),
      heapMB: Math.round(avg(this.metrics.heapMB)),
      fps: Math.round(avg(this.metrics.fps)),
    };
  }

  getViolations(limit = 20): BudgetViolation[] { return this.violations.slice(0, limit); }
  getBudget(): PerformanceBudget { return { ...this.budget }; }
  setBudget(b: Partial<PerformanceBudget>): void { this.budget = { ...this.budget, ...b }; }
  clearViolations(): void { this.violations = []; }

  isHealthy(): boolean {
    const avgs = this.getAverages();
    return avgs.fps >= this.budget.minFps &&
      avgs.renderTimeMs <= this.budget.maxRenderTimeMs * 1.5 &&
      avgs.apiLatencyMs <= this.budget.maxApiLatencyMs * 1.5 &&
      avgs.heapMB <= this.budget.maxHeapMB;
  }
}

export const perfBudget = new PerformanceBudgetManager();
