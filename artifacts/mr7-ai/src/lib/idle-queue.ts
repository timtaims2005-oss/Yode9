/**
 * Idle Task Queue — schedules non-urgent work during browser idle periods.
 * Uses requestIdleCallback (with rIC polyfill via setTimeout).
 * Prevents main-thread congestion during user interaction.
 */

export type IdleTask = {
  id: string;
  fn: (deadline: IdleDeadline | null) => void;
  timeout?: number;
};

interface IdleDeadline {
  timeRemaining(): number;
  didTimeout: boolean;
}

const rIC: (cb: (d: IdleDeadline) => void, opts?: { timeout: number }) => number =
  typeof requestIdleCallback !== "undefined"
    ? requestIdleCallback.bind(window)
    : (cb, opts) => {
        const start = Date.now();
        return setTimeout(() => {
          cb({
            timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
            didTimeout: true,
          });
        }, opts?.timeout ?? 200) as unknown as number;
      };

const cIC: (id: number) => void =
  typeof cancelIdleCallback !== "undefined"
    ? cancelIdleCallback.bind(window)
    : clearTimeout.bind(window) as (id: number) => void;

class IdleQueue {
  private queue: IdleTask[] = [];
  private scheduled: number | null = null;
  private idMap = new Map<string, number>();

  add(id: string, fn: (deadline: IdleDeadline | null) => void, timeout = 2000) {
    if (this.idMap.has(id)) this.cancel(id);
    this.queue.push({ id, fn, timeout });
    this.scheduleNext();
  }

  cancel(id: string) {
    const handle = this.idMap.get(id);
    if (handle !== undefined) cIC(handle);
    this.idMap.delete(id);
    this.queue = this.queue.filter(t => t.id !== id);
  }

  clear() {
    this.idMap.forEach((h) => cIC(h));
    this.idMap.clear();
    this.queue = [];
    if (this.scheduled !== null) { cIC(this.scheduled); this.scheduled = null; }
  }

  get size() { return this.queue.length; }

  private scheduleNext() {
    if (this.scheduled !== null || this.queue.length === 0) return;
    const task = this.queue[0];
    this.scheduled = rIC((deadline) => {
      this.scheduled = null;
      const t = this.queue.shift();
      if (!t) return;
      this.idMap.delete(t.id);
      try { t.fn(deadline); } catch (e) { console.warn("[IdleQueue] task error:", e); }
      if (this.queue.length > 0) this.scheduleNext();
    }, { timeout: task.timeout ?? 2000 });
  }
}

export const idleQueue = new IdleQueue();
