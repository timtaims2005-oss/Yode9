/**
 * Redis Service
 * ──────────────
 * ioredis client for:
 *  - Rate limiting (sliding window)
 *  - Session/response caching
 *  - Job queues (pub/sub)
 *  - Temporary data (OTP codes, password reset tokens)
 *
 * Falls back gracefully when REDIS_URL is not set (in-memory Map).
 */

import { logger } from "./logger.js";

type CacheBackend = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string): Promise<number>;
  expire(key: string, ttlSeconds: number): Promise<void>;
  publish(channel: string, message: string): Promise<void>;
  subscribe(channel: string, handler: (msg: string) => void): Promise<void>;
  quit(): Promise<void>;
};

// ── In-memory fallback (used when Redis is not configured) ────────────────────
class InMemoryCache implements CacheBackend {
  private store = new Map<string, { value: string; expires?: number }>();

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expires && entry.expires < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expires: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }

  async incr(key: string): Promise<number> {
    const entry = this.store.get(key);
    const current = entry ? parseInt(entry.value, 10) || 0 : 0;
    const next = current + 1;
    this.store.set(key, { value: String(next), expires: entry?.expires });
    return next;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      this.store.set(key, { value: entry.value, expires: Date.now() + ttlSeconds * 1000 });
    }
  }

  async publish(_channel: string, _message: string): Promise<void> {}
  async subscribe(_channel: string, _handler: (msg: string) => void): Promise<void> {}
  async quit(): Promise<void> { this.store.clear(); }
}

// ── Redis client (lazy init) ──────────────────────────────────────────────────
let _client: CacheBackend | null = null;

async function createRedisClient(): Promise<CacheBackend> {
  const url = process.env.REDIS_URL;
  if (!url) {
    logger.warn("[redis] REDIS_URL not set — using in-memory cache fallback. Not suitable for production.");
    return new InMemoryCache();
  }

  try {
    const { default: Redis } = await import("ioredis");
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      lazyConnect: true,
      enableReadyCheck: true,
    });

    await client.connect();

    client.on("error", (err) => {
      logger.error({ err }, "[redis] Connection error");
    });

    client.on("connect", () => {
      logger.info("[redis] Connected");
    });

    // Wrap ioredis in our interface
    const backend: CacheBackend = {
      get: (k) => client.get(k),
      set: async (k, v, ttl) => {
        if (ttl) await client.setex(k, ttl, v);
        else await client.set(k, v);
      },
      del: async (k) => { await client.del(k); },
      incr: (k) => client.incr(k),
      expire: async (k, ttl) => { await client.expire(k, ttl); },
      publish: async (ch, msg) => { await client.publish(ch, msg); },
      subscribe: async (ch, handler) => {
        const sub = client.duplicate();
        await sub.subscribe(ch);
        sub.on("message", (_ch, msg) => handler(msg));
      },
      quit: async () => { await client.quit(); },
    };

    logger.info("[redis] Client initialized with ioredis");
    return backend;
  } catch (err) {
    logger.error({ err }, "[redis] Failed to connect — falling back to in-memory cache");
    return new InMemoryCache();
  }
}

export async function getRedis(): Promise<CacheBackend> {
  if (!_client) {
    _client = await createRedisClient();
  }
  return _client;
}

// ── Utility helpers ───────────────────────────────────────────────────────────

/** Cache a value with optional TTL (seconds) */
export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  const r = await getRedis();
  await r.set(key, JSON.stringify(value), ttlSeconds);
}

/** Get cached value */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const r = await getRedis();
  const raw = await r.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

/** Delete cached value */
export async function cacheDel(key: string): Promise<void> {
  const r = await getRedis();
  await r.del(key);
}

/** Increment counter with optional TTL on first set */
export async function cacheIncr(key: string, ttlSeconds?: number): Promise<number> {
  const r = await getRedis();
  const val = await r.incr(key);
  if (val === 1 && ttlSeconds) {
    await r.expire(key, ttlSeconds);
  }
  return val;
}

/** Store OTP / password-reset token with short TTL */
export async function storeToken(key: string, value: string, ttlSeconds = 600): Promise<void> {
  const r = await getRedis();
  await r.set(`token:${key}`, value, ttlSeconds);
}

/** Retrieve and delete a one-time token */
export async function consumeToken(key: string): Promise<string | null> {
  const r = await getRedis();
  const val = await r.get(`token:${key}`);
  if (val) await r.del(`token:${key}`);
  return val;
}

/** Sliding-window rate limiter — returns { allowed, remaining, resetIn } */
export async function rateLimitCheck(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const r = await getRedis();
  const current = await r.incr(key);
  if (current === 1) {
    await r.expire(key, windowSeconds);
  }
  const remaining = Math.max(0, limit - current);
  return {
    allowed: current <= limit,
    remaining,
    resetIn: windowSeconds,
  };
}
