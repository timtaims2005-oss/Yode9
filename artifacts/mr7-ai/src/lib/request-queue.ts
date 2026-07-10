type Priority = "high" | "normal" | "low";

type QueuedTask<T> = {
  id: string;
  fn: () => Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
  priority: Priority;
  ts: number;
  label: string;
};

const PRIORITY_WEIGHT: Record<Priority, number> = { high: 0, normal: 1, low: 2 };
const MAX_CONCURRENT = 3;
const QUEUE_TIMEOUT_MS = 120_000;

class RequestQueue {
  private queue: QueuedTask<unknown>[] = [];
  private running = 0;
  private totalCompleted = 0;
  private totalFailed = 0;
  private subscribers = new Set<() => void>();

  subscribe(cb: () => void) {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  private notify() { this.subscribers.forEach((cb) => cb()); }

  stats() {
    return {
      queued: this.queue.length,
      running: this.running,
      totalCompleted: this.totalCompleted,
      totalFailed: this.totalFailed,
    };
  }

  enqueue<T>(
    fn: () => Promise<T>,
    opts: { priority?: Priority; label?: string } = {},
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const task: QueuedTask<T> = {
        id,
        fn,
        resolve,
        reject,
        priority: opts.priority ?? "normal",
        ts: Date.now(),
        label: opts.label ?? "task",
      };

      const timeoutId = setTimeout(() => {
        const idx = this.queue.indexOf(task as QueuedTask<unknown>);
        if (idx !== -1) {
          this.queue.splice(idx, 1);
          reject(new Error(`Queue timeout after ${QUEUE_TIMEOUT_MS}ms`));
          this.totalFailed++;
          this.notify();
        }
      }, QUEUE_TIMEOUT_MS);

      const origResolve = task.resolve;
      const origReject = task.reject;
      task.resolve = (v: T) => { clearTimeout(timeoutId); origResolve(v); };
      task.reject = (e: unknown) => { clearTimeout(timeoutId); origReject(e); };

      this.queue.push(task as QueuedTask<unknown>);
      this.queue.sort((a, b) => {
        const pw = PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
        return pw !== 0 ? pw : a.ts - b.ts;
      });
      this.notify();
      this.drain();
    });
  }

  private drain() {
    while (this.running < MAX_CONCURRENT && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.running++;
      this.notify();
      task.fn().then(
        (v) => { task.resolve(v as never); this.running--; this.totalCompleted++; this.notify(); this.drain(); },
        (e) => { task.reject(e); this.running--; this.totalFailed++; this.notify(); this.drain(); },
      );
    }
  }
}

export const requestQueue = new RequestQueue();
