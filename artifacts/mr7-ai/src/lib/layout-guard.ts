/**
 * Layout Guard — prevents layout thrashing by batching DOM reads and writes.
 * Inspired by FastDOM. Forces all reads before any writes in each frame.
 * Prevents forced synchronous layouts that cause jank spikes.
 */

type ReadTask = () => void;
type WriteTask = () => void;

class LayoutGuard {
  private reads: ReadTask[] = [];
  private writes: WriteTask[] = [];
  private rafId: number | null = null;
  private running = false;

  /** Queue a DOM read (layout query) — runs before all writes */
  read(fn: ReadTask) {
    this.reads.push(fn);
    this.schedule();
  }

  /** Queue a DOM write (style/class mutation) — runs after all reads */
  write(fn: WriteTask) {
    this.writes.push(fn);
    this.schedule();
  }

  /** Measure an element without triggering layout thrash — queued read */
  measure<T>(fn: () => T): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.read(() => {
        try { resolve(fn()); } catch (e) { reject(e); }
      });
    });
  }

  /** Mutate DOM safely — queued write */
  mutate(fn: WriteTask): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.write(() => {
        try { fn(); resolve(); } catch (e) { reject(e); }
      });
    });
  }

  /** Clear all pending tasks */
  clear() {
    this.reads = [];
    this.writes = [];
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  private schedule() {
    if (this.rafId !== null || this.running) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.flush();
    });
  }

  private flush() {
    this.running = true;
    // Phase 1: all reads
    let reads = this.reads.splice(0);
    let writes = this.writes.splice(0);

    for (const r of reads) {
      try { r(); } catch (e) { console.warn("[LayoutGuard] read error:", e); }
    }
    // Phase 2: all writes
    for (const w of writes) {
      try { w(); } catch (e) { console.warn("[LayoutGuard] write error:", e); }
    }
    // If new tasks added during flush, schedule another frame
    if (this.reads.length > 0 || this.writes.length > 0) {
      this.schedule();
    }
    this.running = false;
  }
}

export const layoutGuard = new LayoutGuard();

/**
 * ResizeObserver pool — reuse a single observer for all elements.
 * Avoids creating hundreds of individual ResizeObserver instances.
 */
type ResizeCallback = (entry: ResizeObserverEntry) => void;

class ResizeObserverPool {
  private observer: ResizeObserver | null = null;
  private callbacks = new Map<Element, ResizeCallback>();

  private getObserver(): ResizeObserver {
    if (!this.observer) {
      this.observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.callbacks.get(entry.target)?.(entry);
        }
      });
    }
    return this.observer;
  }

  observe(el: Element, cb: ResizeCallback) {
    this.callbacks.set(el, cb);
    this.getObserver().observe(el);
    return () => this.unobserve(el);
  }

  unobserve(el: Element) {
    this.callbacks.delete(el);
    this.observer?.unobserve(el);
  }
}

export const resizePool = new ResizeObserverPool();
