/**
 * Background Job Queue — BullMQ
 * ──────────────────────────────
 * Manages heavy tasks off the request path:
 *   • ai-generation   — long-running AI completions
 *   • s3-upload       — large file uploads to S3/R2
 *   • webhook-dispatch — reliable webhook delivery with retries
 *   • email-send       — transactional email delivery
 *
 * Falls back to a lightweight in-process executor when REDIS_URL is not set
 * (dev/local environments), so the server never crashes on missing Redis.
 *
 * Usage:
 *   import { jobQueue, addJob, registerWorker } from "./queue.js";
 *   await addJob("ai-generation", { prompt, model, userId });
 */

import { logger } from "./logger.js";

// ── Job type definitions ───────────────────────────────────────────────────────
export type QueueName =
  | "ai-generation"
  | "s3-upload"
  | "webhook-dispatch"
  | "email-send"
  | "deep-search";

export interface JobData {
  "ai-generation": {
    prompt: string;
    model: string;
    userId: string;
    sessionId?: string;
    maxTokens?: number;
  };
  "s3-upload": {
    localPath: string;
    s3Key: string;
    bucket?: string;
    contentType?: string;
    userId?: string;
  };
  "webhook-dispatch": {
    url: string;
    payload: Record<string, unknown>;
    secret?: string;
    eventType: string;
    webhookId?: string;
  };
  "email-send": {
    to: string;
    subject: string;
    html: string;
    text?: string;
    from?: string;
  };
  "deep-search": {
    query: string;
    type: "email" | "username" | "phone" | "fullname";
    userId: string;
    jobId: string;
  };
}

export type JobResult = { ok: true; data?: unknown } | { ok: false; error: string };

// ── In-process executor (fallback when Redis is unavailable) ──────────────────
type Handler<N extends QueueName> = (data: JobData[N]) => Promise<JobResult>;
const _fallbackHandlers = new Map<QueueName, Handler<QueueName>>();
let _bullmqReady = false;

// ── BullMQ queues & workers (lazy-loaded) ─────────────────────────────────────
let _queues: Map<QueueName, import("bullmq").Queue> | null = null;
let _workers: Map<QueueName, import("bullmq").Worker> | null = null;

async function initBullMQ(): Promise<boolean> {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) return false;

  try {
    const { Queue, Worker } = await import("bullmq");

    // Parse Redis URL into ioredis connection options
    const url = new URL(redisUrl);
    const connection = {
      host: url.hostname,
      port: Number(url.port) || 6379,
      password: url.password || undefined,
      tls: url.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: null, // required by BullMQ
    };

    _queues = new Map();
    _workers = new Map();

    const queueNames: QueueName[] = [
      "ai-generation",
      "s3-upload",
      "webhook-dispatch",
      "email-send",
      "deep-search",
    ];

    for (const name of queueNames) {
      // Create queue
      _queues.set(
        name,
        new Queue(name, {
          connection,
          defaultJobOptions: {
            attempts: name === "webhook-dispatch" ? 5 : 3,
            backoff: { type: "exponential", delay: 2000 },
            removeOnComplete: { count: 500, age: 60 * 60 * 24 }, // keep 500 or 24h
            removeOnFail: { count: 200, age: 60 * 60 * 24 * 7 }, // keep 7 days
          },
        }),
      );

      // Create worker that delegates to registered handlers
      _workers.set(
        name,
        new Worker(
          name,
          async (job) => {
            const handler = _fallbackHandlers.get(name);
            if (!handler) {
              logger.warn({ queue: name, jobId: job.id }, "[queue] No handler registered — skipping");
              return { ok: false, error: "No handler registered" };
            }
            logger.info({ queue: name, jobId: job.id, attempt: job.attemptsMade + 1 }, "[queue] Processing job");
            const result = await handler(job.data as JobData[QueueName]);
            if (!result.ok) {
              logger.warn({ queue: name, jobId: job.id, error: (result as { ok: false; error: string }).error }, "[queue] Job failed");
              throw new Error((result as { ok: false; error: string }).error);
            }
            return result;
          },
          {
            connection,
            concurrency: name === "ai-generation" ? 4 : 8,
            limiter: name === "ai-generation"
              ? { max: 10, duration: 1000 }   // max 10 AI jobs/s globally
              : undefined,
          },
        ),
      );

      _workers.get(name)!.on("failed", (job, err) => {
        logger.error({ queue: name, jobId: job?.id, err }, "[queue] Job permanently failed");
      });

      _workers.get(name)!.on("completed", (job) => {
        logger.debug({ queue: name, jobId: job.id }, "[queue] Job completed");
      });
    }

    _bullmqReady = true;
    logger.info("[queue] BullMQ initialized with Redis backend");
    return true;
  } catch (err) {
    logger.warn({ err }, "[queue] BullMQ init failed — using in-process fallback");
    return false;
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Register a handler for a queue. Must be called at startup.
 * Works in both BullMQ and fallback modes.
 */
export function registerWorker<N extends QueueName>(
  name: N,
  handler: Handler<N>,
): void {
  _fallbackHandlers.set(name, handler as Handler<QueueName>);
  logger.debug({ queue: name }, "[queue] Handler registered");
}

/**
 * Enqueue a background job.
 * Falls back to immediate in-process execution if BullMQ is unavailable.
 */
export async function addJob<N extends QueueName>(
  name: N,
  data: JobData[N],
  opts: { priority?: number; delay?: number; jobId?: string } = {},
): Promise<{ jobId: string | null; mode: "bullmq" | "inprocess" }> {
  // Try BullMQ first
  if (_queues?.has(name)) {
    try {
      const job = await _queues.get(name)!.add(name, data, {
        priority: opts.priority,
        delay: opts.delay,
        jobId: opts.jobId,
      });
      logger.debug({ queue: name, jobId: job.id }, "[queue] Job enqueued (BullMQ)");
      return { jobId: job.id ?? null, mode: "bullmq" };
    } catch (err) {
      logger.warn({ queue: name, err }, "[queue] BullMQ enqueue failed — falling back to in-process");
    }
  }

  // Fallback: run immediately in-process (don't block caller)
  const handler = _fallbackHandlers.get(name);
  if (handler) {
    setImmediate(async () => {
      try {
        await handler(data as JobData[QueueName]);
      } catch (err) {
        logger.error({ queue: name, err }, "[queue] In-process job error");
      }
    });
  }

  return { jobId: null, mode: "inprocess" };
}

/**
 * Get queue statistics for health checks.
 */
export async function getQueueStats(): Promise<
  Record<QueueName, { waiting: number; active: number; completed: number; failed: number; mode: string } | { error: string }>
> {
  const stats: Record<string, unknown> = {};
  const queues: QueueName[] = ["ai-generation", "s3-upload", "webhook-dispatch", "email-send"];

  for (const name of queues) {
    const q = _queues?.get(name);
    if (!q) {
      stats[name] = { mode: "inprocess", waiting: 0, active: 0, completed: 0, failed: 0 };
      continue;
    }
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        q.getWaitingCount(),
        q.getActiveCount(),
        q.getCompletedCount(),
        q.getFailedCount(),
      ]);
      stats[name] = { mode: "bullmq", waiting, active, completed, failed };
    } catch (err) {
      stats[name] = { error: String(err) };
    }
  }

  return stats as Record<QueueName, { waiting: number; active: number; completed: number; failed: number; mode: string } | { error: string }>;
}

/**
 * Gracefully shut down all queues and workers.
 */
export async function shutdownQueue(): Promise<void> {
  if (_workers) {
    await Promise.all([..._workers.values()].map((w) => w.close()));
  }
  if (_queues) {
    await Promise.all([..._queues.values()].map((q) => q.close()));
  }
  logger.info("[queue] BullMQ shut down");
}

export function isQueueReady(): boolean {
  return _bullmqReady;
}

// ── Auto-init on module load ───────────────────────────────────────────────────
initBullMQ().catch(() => {});
