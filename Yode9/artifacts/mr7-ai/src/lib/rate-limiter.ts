/**
 * Client-side Rate Limiter — Token Bucket Algorithm
 * Prevents accidental API flooding. Configurable per-provider limits.
 * Queue-based: requests wait instead of failing hard.
 */

export type RateLimitConfig = {
  tokensPerSecond: number;   // replenishment rate
  bucketCapacity:  number;   // max burst
  maxQueueSize:    number;   // drop requests beyond this
};

const PROVIDER_DEFAULTS: Record<string, RateLimitConfig> = {
  openai:    { tokensPerSecond: 3,  bucketCapacity: 10, maxQueueSize: 20 },
  anthropic: { tokensPerSecond: 2,  bucketCapacity: 6,  maxQueueSize: 10 },
  groq:      { tokensPerSecond: 5,  bucketCapacity: 15, maxQueueSize: 30 },
  gemini:    { tokensPerSecond: 2,  bucketCapacity: 8,  maxQueueSize: 10 },
  openrouter:{ tokensPerSecond: 3,  bucketCapacity: 10, maxQueueSize: 20 },
  custom:    { tokensPerSecond: 10, bucketCapacity: 30, maxQueueSize: 50 },
  personal:  { tokensPerSecond: 10, bucketCapacity: 30, maxQueueSize: 50 },
  default:   { tokensPerSecond: 3,  bucketCapacity: 10, maxQueueSize: 20 },
};

type QueueEntry = { resolve: () => void; reject: (e: Error) => void; ts: number };

class TokenBucket {
  private tokens:   number;
  private lastRefil: number;
  private queue:    QueueEntry[] = [];
  private draining  = false;

  constructor(private cfg: RateLimitConfig) {
    this.tokens    = cfg.bucketCapacity;
    this.lastRefil = Date.now();
  }

  private refill() {
    const now     = Date.now();
    const elapsed = (now - this.lastRefil) / 1000;
    this.tokens   = Math.min(
      this.cfg.bucketCapacity,
      this.tokens + elapsed * this.cfg.tokensPerSecond,
    );
    this.lastRefil = now;
  }

  /** Returns remaining tokens (0–capacity) */
  remaining(): number {
    this.refill();
    return Math.max(0, this.tokens);
  }

  /** Acquire 1 token. Resolves when allowed, rejects if queue full. */
  async acquire(): Promise<void> {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    if (this.queue.length >= this.cfg.maxQueueSize) {
      throw new Error("RateLimit: قائمة الانتظار ممتلئة، حاول مجدداً بعد لحظة.");
    }
    return new Promise<void>((resolve, reject) => {
      this.queue.push({ resolve, reject, ts: Date.now() });
      if (!this.draining) this.drain();
    });
  }

  private drain() {
    this.draining = true;
    const tryNext = () => {
      if (!this.queue.length) { this.draining = false; return; }
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        const entry = this.queue.shift()!;
        // Drop entries older than 60 s
        if (Date.now() - entry.ts > 60_000) {
          entry.reject(new Error("RateLimit: انتهت مهلة الانتظار."));
        } else {
          entry.resolve();
        }
        setTimeout(tryNext, 0);
      } else {
        const waitMs = (1 - this.tokens) / this.cfg.tokensPerSecond * 1000;
        setTimeout(tryNext, Math.max(50, waitMs));
      }
    };
    tryNext();
  }

  updateConfig(cfg: Partial<RateLimitConfig>) {
    Object.assign(this.cfg, cfg);
    this.tokens = Math.min(this.tokens, this.cfg.bucketCapacity);
  }

  get queueDepth() { return this.queue.length; }
}

class RateLimiterRegistry {
  private buckets = new Map<string, TokenBucket>();

  private get(provider: string): TokenBucket {
    if (!this.buckets.has(provider)) {
      const cfg = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.default;
      this.buckets.set(provider, new TokenBucket({ ...cfg }));
    }
    return this.buckets.get(provider)!;
  }

  /** Wait for permission to make a request to the given provider. */
  async acquire(provider: string): Promise<void> {
    return this.get(provider).acquire();
  }

  /** How many tokens remain for this provider (0–capacity). */
  remaining(provider: string): number {
    return this.get(provider).remaining();
  }

  /** Queue depth for this provider. */
  queueDepth(provider: string): number {
    return this.get(provider).queueDepth;
  }

  /** Override defaults for a provider. */
  configure(provider: string, cfg: Partial<RateLimitConfig>) {
    this.get(provider).updateConfig(cfg);
  }

  /** Summary of all active buckets. */
  summary(): Record<string, { remaining: number; queue: number }> {
    const out: Record<string, { remaining: number; queue: number }> = {};
    for (const [k, b] of this.buckets) {
      out[k] = { remaining: Math.round(b.remaining()), queue: b.queueDepth };
    }
    return out;
  }
}

export const rateLimiter = new RateLimiterRegistry();
