/**
 * Quantum Rate Limiter v4.0
 * Token bucket + sliding window hybrid with per-IP, per-user,
 * per-endpoint bucketing and adaptive burst allowance.
 */

interface BucketState {
  tokens: number;
  lastRefill: number;
  requestCount: number;
  windowStart: number;
  blocked: boolean;
  blockedUntil: number;
  violations: number;
}

interface RateLimitConfig {
  tokensPerSec: number;
  maxBurst: number;
  windowMs: number;
  maxPerWindow: number;
  blockDurationMs: number;
  maxViolations: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  tokensPerSec: 10,
  maxBurst: 30,
  windowMs: 60 * 1000,
  maxPerWindow: 200,
  blockDurationMs: 60 * 1000,
  maxViolations: 5,
};

export class QuantumRateLimiter {
  private buckets = new Map<string, BucketState>();
  private readonly configs = new Map<string, RateLimitConfig>();
  private cleanupTimer: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  configureEndpoint(endpoint: string, config: Partial<RateLimitConfig>): void {
    this.configs.set(endpoint, { ...DEFAULT_CONFIG, ...config });
  }

  check(key: string, endpoint = "default"): { allowed: boolean; remaining: number; resetMs: number; retryAfterMs?: number } {
    const config = this.configs.get(endpoint) ?? DEFAULT_CONFIG;
    const now = Date.now();
    const bucketKey = `${endpoint}:${key}`;

    let state = this.buckets.get(bucketKey);
    if (!state) {
      state = {
        tokens: config.maxBurst,
        lastRefill: now,
        requestCount: 0,
        windowStart: now,
        blocked: false,
        blockedUntil: 0,
        violations: 0,
      };
    }

    if (state.blocked && now < state.blockedUntil) {
      return { allowed: false, remaining: 0, resetMs: state.blockedUntil - now, retryAfterMs: state.blockedUntil - now };
    }
    if (state.blocked && now >= state.blockedUntil) {
      state.blocked = false;
    }

    const elapsed = (now - state.lastRefill) / 1000;
    state.tokens = Math.min(config.maxBurst, state.tokens + elapsed * config.tokensPerSec);
    state.lastRefill = now;

    if (now - state.windowStart > config.windowMs) {
      state.requestCount = 0;
      state.windowStart = now;
    }

    const allowed = state.tokens >= 1 && state.requestCount < config.maxPerWindow;

    if (allowed) {
      state.tokens -= 1;
      state.requestCount++;
    } else {
      state.violations++;
      if (state.violations >= config.maxViolations) {
        state.blocked = true;
        const backoff = config.blockDurationMs * Math.min(state.violations, 10);
        state.blockedUntil = now + backoff;
      }
    }

    this.buckets.set(bucketKey, state);
    const remaining = Math.min(
      Math.floor(state.tokens),
      config.maxPerWindow - state.requestCount
    );
    const resetMs = config.windowMs - (now - state.windowStart);

    return { allowed, remaining: Math.max(0, remaining), resetMs };
  }

  reset(key: string, endpoint = "default"): void {
    this.buckets.delete(`${endpoint}:${key}`);
  }

  stats(): { totalBuckets: number; blocked: number; violations: number } {
    let blocked = 0, violations = 0;
    const now = Date.now();
    for (const state of this.buckets.values()) {
      if (state.blocked && now < state.blockedUntil) blocked++;
      violations += state.violations;
    }
    return { totalBuckets: this.buckets.size, blocked, violations };
  }

  private cleanup(): void {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000;
    for (const [key, state] of this.buckets.entries()) {
      if (now - state.lastRefill > maxAge) this.buckets.delete(key);
    }
  }

  destroy(): void { clearInterval(this.cleanupTimer); }
}

export const globalQuantumLimiter = new QuantumRateLimiter();

globalQuantumLimiter.configureEndpoint("auth", { tokensPerSec: 1, maxBurst: 5, maxPerWindow: 20, blockDurationMs: 300000, maxViolations: 3 });
globalQuantumLimiter.configureEndpoint("api", { tokensPerSec: 20, maxBurst: 60, maxPerWindow: 500, blockDurationMs: 30000 });
globalQuantumLimiter.configureEndpoint("upload", { tokensPerSec: 2, maxBurst: 5, maxPerWindow: 30 });
globalQuantumLimiter.configureEndpoint("stream", { tokensPerSec: 5, maxBurst: 10, maxPerWindow: 100 });
