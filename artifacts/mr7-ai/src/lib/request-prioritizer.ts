/**
 * Request Prioritizer — queues API requests by urgency, respects concurrency limits.
 * Urgent (user-triggered) requests preempt background (prefetch/analytics) requests.
 * Integrates with connection quality to adjust concurrency dynamically.
 */

import { connectionQuality } from "./connection-quality";

export type RequestPriority = "critical" | "high" | "normal" | "low" | "background";

interface QueuedRequest<T = unknown> {
  id: string;
  priority: RequestPriority;
  execute: () => Promise<T>;
  resolve: (v: T) => void;
  reject:  (e: unknown) => void;
  enqueuedAt: number;
  timeout?: number;
}

const PRIORITY_WEIGHT: Record<RequestPriority, number> = {
  critical: 100, high: 75, normal: 50, low: 25, background: 0,
};

const CONCURRENCY_BY_GRADE: Record<string, number> = {
  excellent: 6, good: 4, fair: 2, poor: 1, offline: 0,
};

class RequestPrioritizer {
  private queue: QueuedRequest[] = [];
  private active = new Set<string>();
  private maxConcurrent = 4;
  private processed = 0;
  private dropped = 0;

  constructor() {
    // Adapt concurrency to connection quality
    connectionQuality.onMetrics(m => {
      this.maxConcurrent = CONCURRENCY_BY_GRADE[m.grade] ?? 4;
      this.drain();
    });
  }

  /** Enqueue a request with priority */
  enqueue<T>(
    id: string,
    execute: () => Promise<T>,
    priority: RequestPriority = "normal",
    timeoutMs?: number,
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Remove duplicate request with same id
      this.queue = this.queue.filter(r => r.id !== id);

      this.queue.push({
        id, priority, execute: execute as () => Promise<unknown>,
        resolve: resolve as (v: unknown) => void,
        reject, enqueuedAt: Date.now(), timeout: timeoutMs,
      });

      // Sort by priority (descending), then enqueue time (ascending)
      this.queue.sort((a, b) =>
        PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority] ||
        a.enqueuedAt - b.enqueuedAt
      );

      this.drain();
    });
  }

  /** Cancel a queued request */
  cancel(id: string): boolean {
    const idx = this.queue.findIndex(r => r.id === id);
    if (idx < 0) return false;
    const [req] = this.queue.splice(idx, 1);
    req.reject(new Error("Cancelled"));
    this.dropped++;
    return true;
  }

  /** Cancel all requests below given priority */
  cancelBelow(priority: RequestPriority): number {
    const threshold = PRIORITY_WEIGHT[priority];
    const toCancel = this.queue.filter(r => PRIORITY_WEIGHT[r.priority] < threshold);
    this.queue = this.queue.filter(r => PRIORITY_WEIGHT[r.priority] >= threshold);
    toCancel.forEach(r => { r.reject(new Error("Preempted")); this.dropped++; });
    return toCancel.length;
  }

  get queueLength() { return this.queue.length; }
  get activeCount() { return this.active.size; }
  get stats() { return { processed: this.processed, dropped: this.dropped, queued: this.queue.length, active: this.active.size }; }

  private drain() {
    while (this.active.size < this.maxConcurrent && this.queue.length > 0) {
      const req = this.queue.shift()!;
      this.active.add(req.id);

      // Apply optional timeout
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const cleanup = () => { this.active.delete(req.id); this.processed++; if (timeoutId) clearTimeout(timeoutId); this.drain(); };

      if (req.timeout) {
        timeoutId = setTimeout(() => {
          this.active.delete(req.id);
          req.reject(new Error(`Request timeout after ${req.timeout}ms`));
          this.drain();
        }, req.timeout);
      }

      req.execute()
        .then(v => { cleanup(); req.resolve(v); })
        .catch(e => { cleanup(); req.reject(e); });
    }
  }
}

export const requestPrioritizer = new RequestPrioritizer();
