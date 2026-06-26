/**
 * micro-scheduler.ts
 * Splits heavy work into ≤4ms chunks using MessageChannel (10× faster than
 * setTimeout). Preserves execution order and keeps the main thread responsive.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

type Task = () => void | Promise<void>;

interface ScheduledBatch {
  tasks: Task[];
  resolve: () => void;
  reject: (err: unknown) => void;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CHUNK_BUDGET_MS = 4; // max ms per chunk
const TASK_WARN_MS = 5;    // warn if single task exceeds this

// ── MessageChannel scheduler ──────────────────────────────────────────────────

const { port1, port2 } = new MessageChannel();
const queue: ScheduledBatch[] = [];
let running = false;

async function drainQueue(): Promise<void> {
  if (running) return;
  running = true;

  while (queue.length > 0) {
    const batch = queue[0];
    const chunkStart = performance.now();

    while (batch.tasks.length > 0) {
      const elapsed = performance.now() - chunkStart;
      if (elapsed >= CHUNK_BUDGET_MS) {
        // Yield to browser — schedule next chunk via MessageChannel
        await new Promise<void>(r => {
          port1.onmessage = () => r();
          port2.postMessage(null);
        });
        break; // restart inner while in next tick
      }

      const task = batch.tasks.shift()!;
      const t0 = performance.now();
      try {
        await task();
      } catch (err) {
        console.warn('[micro-scheduler] task error:', err);
      }

      if (import.meta.env.DEV) {
        const took = performance.now() - t0;
        if (took > TASK_WARN_MS) {
          console.warn(`[micro-scheduler] slow task ${took.toFixed(1)}ms`);
        }
      }
    }

    if (batch.tasks.length === 0) {
      queue.shift();
      batch.resolve();
    }
  }

  running = false;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Schedule an array of tasks to run in order, chunked into ≤4ms slices.
 * Returns a Promise that resolves when all tasks complete.
 *
 * @example
 * await microScheduler.run(items.map(item => () => processItem(item)));
 */
function run(tasks: Task[]): Promise<void> {
  return new Promise((resolve, reject) => {
    queue.push({ tasks: [...tasks], resolve, reject });
    // Kick off via MessageChannel (microtask-like, faster than setTimeout(0))
    port2.postMessage(null);
    port1.onmessage = () => drainQueue();
    drainQueue();
  });
}

/**
 * Schedule a single async function to run in the micro-scheduler.
 */
function schedule(task: Task): Promise<void> {
  return run([task]);
}

/**
 * Break a large array into chunks and process each chunk in order,
 * yielding between chunks to keep the frame budget.
 */
async function processChunked<T>(
  items: T[],
  processor: (item: T) => void | Promise<void>,
  chunkSize = 50
): Promise<void> {
  const tasks: Task[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    tasks.push(async () => {
      for (const item of chunk) await processor(item);
    });
  }
  return run(tasks);
}

export const microScheduler = { run, schedule, processChunked };
