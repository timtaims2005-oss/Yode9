/**
 * Frame Scheduler — RAF-based cooperative task scheduler.
 * Splits work into 16.67ms slices (60fps budget), yields to browser on overrun,
 * tracks dropped frames, prioritizes urgent vs. idle tasks.
 */

export type SchedulerPriority = "urgent" | "normal" | "low" | "idle";

interface Task {
  id: string;
  fn: () => void | Promise<void>;
  priority: SchedulerPriority;
  deadline?: number;
  created: number;
}

const PRIORITY_ORDER: Record<SchedulerPriority, number> = {
  urgent: 0, normal: 1, low: 2, idle: 3,
};

const FRAME_BUDGET_MS = 14; // leave 2-3ms for browser paint

class FrameScheduler {
  private queue: Task[] = [];
  private rafId: number | null = null;
  private droppedFrames = 0;
  private totalFrames = 0;
  private lastFrameTime = 0;
  private fps = 60;
  private listeners = new Set<(fps: number, dropped: number) => void>();

  schedule(id: string, fn: () => void | Promise<void>, priority: SchedulerPriority = "normal", deadline?: number) {
    const existing = this.queue.findIndex(t => t.id === id);
    if (existing >= 0) { this.queue.splice(existing, 1); }
    this.queue.push({ id, fn, priority, deadline, created: performance.now() });
    this.queue.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
    this.ensureLoop();
  }

  cancel(id: string) {
    this.queue = this.queue.filter(t => t.id !== id);
  }

  onMetrics(cb: (fps: number, dropped: number) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  get currentFPS() { return this.fps; }
  get droppedFrameCount() { return this.droppedFrames; }

  private ensureLoop() {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    this.rafId = null;
    this.totalFrames++;

    // FPS tracking
    if (this.lastFrameTime > 0) {
      const delta = now - this.lastFrameTime;
      const instantFPS = 1000 / delta;
      this.fps = this.fps * 0.9 + instantFPS * 0.1; // EMA smoothing
      if (delta > 33.3) this.droppedFrames++; // > 30fps threshold = drop
    }
    this.lastFrameTime = now;

    // Emit metrics every 60 frames (~1s)
    if (this.totalFrames % 60 === 0) {
      this.listeners.forEach(cb => cb(Math.round(this.fps), this.droppedFrames));
    }

    // Run tasks within budget
    const deadline = now + FRAME_BUDGET_MS;
    while (this.queue.length > 0 && performance.now() < deadline) {
      const task = this.queue.shift()!;
      // Skip expired tasks
      if (task.deadline && performance.now() > task.deadline) continue;
      try {
        const result = task.fn();
        if (result instanceof Promise) { result.catch(() => {}); }
      } catch (e) {
        console.warn("[FrameScheduler] task error:", e);
      }
    }

    // Continue loop if tasks remain
    if (this.queue.length > 0) {
      this.rafId = requestAnimationFrame(this.loop);
    }
  };
}

export const frameScheduler = new FrameScheduler();
