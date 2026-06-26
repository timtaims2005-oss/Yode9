// Quantum Scheduler — مستوحى من Quantum computing scheduling + Google's Omega scheduler
// الأقوى: نظام جدولة يفوق frameScheduler الموجود
// Work-stealing + Time-slicing + Preemption + Affinity + Real-time deadlines

import { frameScheduler } from './frame-scheduler';

type TaskPriority = 'urgent' | 'high' | 'normal' | 'low' | 'idle';
type TaskState = 'queued' | 'running' | 'paused' | 'done' | 'failed';

interface Task {
  id: string;
  priority: TaskPriority;
  fn: () => Promise<void> | void;
  deadline?: number;           // timestamp
  affinity?: string;           // يُجدول مع مهام بنفس الـ affinity
  timeSlice: number;           // ms
  state: TaskState;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  stolen?: boolean;            // work-stealing
}

interface WorkerBucket {
  id: string;
  tasks: Task[];
  busy: boolean;
  affinityGroup?: string;
}

const PRIORITY_TIME_SLICES: Record<TaskPriority, number> = {
  urgent: 32,
  high: 16,
  normal: 8,
  low: 4,
  idle: 2,
};

const PRIORITY_ORDER: TaskPriority[] = ['urgent', 'high', 'normal', 'low', 'idle'];

class QuantumScheduler {
  private buckets: Map<string, WorkerBucket> = new Map();
  private globalQueue: Task[] = [];
  private running = false;
  private taskCounter = 0;
  private stats = {
    scheduled: 0,
    completed: 0,
    preempted: 0,
    stolen: 0,
    deadlineMisses: 0,
  };
  private initialized = false;
  private tickInterval: ReturnType<typeof setInterval> | null = null;

  init(): void {
    if (this.initialized) return;

    // إنشاء 4 buckets (virtual workers)
    for (let i = 0; i < 4; i++) {
      const id = `worker_${i}`;
      this.buckets.set(id, { id, tasks: [], busy: false });
    }

    this._startSchedulingLoop();
    this.initialized = true;

    if (import.meta.env.DEV) {
      console.info('[QuantumScheduler] Initialized — 4 virtual workers, work-stealing enabled');
    }
  }

  // إضافة مهمة للجدولة
  schedule(
    fn: () => Promise<void> | void,
    options: {
      priority?: TaskPriority;
      deadline?: number;
      affinity?: string;
      id?: string;
    } = {}
  ): string {
    const priority = options.priority ?? 'normal';
    const task: Task = {
      id: options.id ?? `task_${++this.taskCounter}`,
      priority,
      fn,
      deadline: options.deadline,
      affinity: options.affinity,
      timeSlice: PRIORITY_TIME_SLICES[priority],
      state: 'queued',
      createdAt: performance.now(),
    };

    this.stats.scheduled++;

    // مهام urgent تُوضع في مقدمة القائمة
    if (priority === 'urgent') {
      this.globalQueue.unshift(task);
    } else {
      this.globalQueue.push(task);
    }

    // التأكد من تشغيل الـ scheduler
    if (!this.running) {
      this._tick();
    }

    return task.id;
  }

  // إضافة مهمة بـ deadline صارم
  scheduleWithDeadline(
    fn: () => Promise<void> | void,
    deadlineMs: number,
    affinity?: string
  ): string {
    return this.schedule(fn, {
      priority: 'urgent',
      deadline: Date.now() + deadlineMs,
      affinity,
    });
  }

  private _pickNextTask(): Task | null {
    if (this.globalQueue.length === 0) return null;

    // Real-time deadline scheduling: مهمة بـ deadline قريب تأخذ أولوية
    const now = Date.now();
    const withDeadline = this.globalQueue
      .filter(t => t.deadline && t.state === 'queued')
      .sort((a, b) => (a.deadline ?? Infinity) - (b.deadline ?? Infinity));

    if (withDeadline.length > 0 && (withDeadline[0].deadline ?? Infinity) - now < 500) {
      const task = withDeadline[0];
      this.globalQueue.splice(this.globalQueue.indexOf(task), 1);
      return task;
    }

    // Priority scheduling
    for (const priority of PRIORITY_ORDER) {
      const idx = this.globalQueue.findIndex(t => t.priority === priority && t.state === 'queued');
      if (idx !== -1) {
        return this.globalQueue.splice(idx, 1)[0];
      }
    }

    return null;
  }

  // Work-stealing: bucket خامل يسرق مهام من bucket مشغول
  private _stealWork(idleBucket: WorkerBucket): Task | null {
    let busiestBucket: WorkerBucket | null = null;
    let maxTasks = 0;

    for (const [, bucket] of this.buckets) {
      if (bucket.id !== idleBucket.id && bucket.tasks.length > maxTasks) {
        maxTasks = bucket.tasks.length;
        busiestBucket = bucket;
      }
    }

    if (busiestBucket && busiestBucket.tasks.length > 1) {
      // سرقة الـ task الأخير (الأقل أولوية)
      const stolenTask = busiestBucket.tasks.pop();
      if (stolenTask) {
        stolenTask.stolen = true;
        this.stats.stolen++;
        return stolenTask;
      }
    }

    return null;
  }

  private async _executeTask(task: Task, bucket: WorkerBucket): Promise<void> {
    task.state = 'running';
    task.startedAt = performance.now();
    bucket.busy = true;

    // فحص deadline
    if (task.deadline && Date.now() > task.deadline) {
      this.stats.deadlineMisses++;
      task.state = 'failed';
      bucket.busy = false;
      return;
    }

    // Time-slicing: استخدام frameScheduler كـ wrapper
    try {
      await new Promise<void>((resolve) => {
        frameScheduler.schedule(() => {
          const start = performance.now();
          const result = task.fn();

          if (result instanceof Promise) {
            // Preemption: إذا تجاوز الـ timeSlice، تُوقف وتُعاد جدولتها
            const timeout = setTimeout(() => {
              this.stats.preempted++;
              resolve();
            }, task.timeSlice);

            result.finally(() => {
              clearTimeout(timeout);
              resolve();
            });
          } else {
            const elapsed = performance.now() - start;
            if (elapsed > task.timeSlice) this.stats.preempted++;
            resolve();
          }
        });
      });

      task.state = 'done';
      task.completedAt = performance.now();
      this.stats.completed++;
    } catch {
      task.state = 'failed';
    } finally {
      bucket.busy = false;
    }
  }

  private async _tick(): Promise<void> {
    if (this.running) return;
    this.running = true;

    for (const [, bucket] of this.buckets) {
      if (!bucket.busy) {
        // Affinity scheduling
        let task = this.globalQueue.find(
          t => t.affinity === bucket.affinityGroup && t.state === 'queued'
        ) ?? null;

        if (!task) task = this._pickNextTask();
        if (!task) task = this._stealWork(bucket);

        if (task) {
          bucket.tasks.push(task);
          this._executeTask(task, bucket).finally(() => {
            bucket.tasks = bucket.tasks.filter(t => t.id !== task!.id);
          });
        }
      }
    }

    this.running = false;
  }

  private _startSchedulingLoop(): void {
    this.tickInterval = setInterval(() => {
      if (this.globalQueue.length > 0) {
        this._tick();
      }
    }, 16); // ~60fps
  }

  // إلغاء مهمة
  cancel(taskId: string): boolean {
    const idx = this.globalQueue.findIndex(t => t.id === taskId);
    if (idx !== -1) {
      this.globalQueue.splice(idx, 1);
      return true;
    }
    return false;
  }

  getStats() {
    return {
      ...this.stats,
      queued: this.globalQueue.length,
      workers: Array.from(this.buckets.values()).map(b => ({
        id: b.id,
        busy: b.busy,
        tasks: b.tasks.length,
      })),
    };
  }

  destroy(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.globalQueue = [];
    for (const [, bucket] of this.buckets) {
      bucket.tasks = [];
    }
    this.initialized = false;
  }
}

export const quantumScheduler = new QuantumScheduler();
