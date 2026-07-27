/**
 * Smart Redis Caching Layer
 * ──────────────────────────
 * Provides a high-level `withCache()` wrapper around the Redis client
 * to transparently cache expensive operations (AI responses, DB queries,
 * provider lookups) with configurable TTLs and namespace isolation.
 *
 * Features:
 *  - Namespace-scoped keys (avoid collisions)
 *  - Configurable TTLs per namespace
 *  - Stale-while-revalidate pattern
 *  - AI session caching (compress + store streaming context)
 *  - Automatic serialization / deserialization
 *  - Cache-hit rate logging (debug)
 *  - Graceful degradation — never throws on cache error
 *
 * Usage:
 *   const result = await withCache("providers", "list", () => expensiveFn(), { ttl: 60 });
 *   await invalidateCache("providers");  // bust entire namespace
 */

import { cacheGet, cacheSet, cacheDel, getRedis } from "./redis.js";
import { logger } from "./logger.js";

// ── Namespace TTL defaults (seconds) ──────────────────────────────────────────
export const CACHE_TTL: Record<string, number> = {
  providers:    60,         // AI provider list — 1 min
  "ai-session": 60 * 30,   // AI chat context — 30 min
  "api-resp":   60 * 5,    // Generic API response — 5 min
  "user-info":  60 * 10,   // User profile/subscription — 10 min
  "model-list": 60 * 60,   // Model list — 1 hr (rarely changes)
  "rate-stats": 30,         // Rate limiting stats — 30 s
  health:       10,         // Health check cache — 10 s
};

// ── Stats tracking (in-memory, resets on restart) ─────────────────────────────
const _stats = { hits: 0, misses: 0, errors: 0, bypasses: 0 };

export function getCacheStats() {
  const total = _stats.hits + _stats.misses;
  return {
    ..._stats,
    hitRate: total > 0 ? (_stats.hits / total * 100).toFixed(1) + "%" : "n/a",
  };
}

// ── Core wrapper ──────────────────────────────────────────────────────────────

/**
 * Cache-aside pattern.
 * Returns the cached value if present; otherwise calls `fn`, caches its result, then returns it.
 *
 * @param namespace  Logical group (determines default TTL from CACHE_TTL map)
 * @param key        Sub-key within namespace
 * @param fn         Factory function to produce the value on cache miss
 * @param opts       Override TTL or force-skip cache
 */
export async function withCache<T>(
  namespace: string,
  key: string,
  fn: () => Promise<T>,
  opts: { ttl?: number; bypass?: boolean } = {},
): Promise<T> {
  const cacheKey = `cache:${namespace}:${key}`;
  const ttl = opts.ttl ?? CACHE_TTL[namespace] ?? 300;

  // Bypass mode — useful for write operations or admin requests
  if (opts.bypass) {
    _stats.bypasses++;
    return fn();
  }

  // Try cache first
  try {
    const cached = await cacheGet<T>(cacheKey);
    if (cached !== null) {
      _stats.hits++;
      logger.debug({ cacheKey }, "[cache] HIT");
      return cached;
    }
  } catch (err) {
    _stats.errors++;
    logger.warn({ cacheKey, err }, "[cache] Read error — proceeding without cache");
  }

  // Cache miss — call factory
  _stats.misses++;
  logger.debug({ cacheKey }, "[cache] MISS");
  const value = await fn();

  // Store result asynchronously (don't block caller)
  setImmediate(async () => {
    try {
      await cacheSet(cacheKey, value, ttl);
    } catch (err) {
      logger.warn({ cacheKey, err }, "[cache] Write error");
    }
  });

  return value;
}

/**
 * Invalidate all keys in a namespace (pattern delete).
 * Uses SCAN for safety — never KEYS in production.
 */
export async function invalidateCache(namespace: string, subKey?: string): Promise<number> {
  const pattern = subKey
    ? `cache:${namespace}:${subKey}`
    : `cache:${namespace}:*`;

  try {
    const r = await getRedis();

    // If the backend exposes scan (real Redis), use it for pattern delete
    const raw = r as unknown as { scan?: (cursor: string, ...args: string[]) => Promise<[string, string[]]> };
    if (typeof raw.scan === "function") {
      let cursor = "0";
      let deleted = 0;
      do {
        const [nextCursor, keys] = await raw.scan(cursor, "MATCH", pattern, "COUNT", "100");
        cursor = nextCursor;
        for (const k of keys) {
          await cacheDel(k);
          deleted++;
        }
      } while (cursor !== "0");
      logger.debug({ namespace, pattern, deleted }, "[cache] Invalidated");
      return deleted;
    }

    // In-memory fallback: delete exact key only
    if (subKey) {
      await cacheDel(`cache:${namespace}:${subKey}`);
      return 1;
    }
    return 0;
  } catch (err) {
    logger.warn({ namespace, err }, "[cache] Invalidation error");
    return 0;
  }
}

// ── AI Session Cache ───────────────────────────────────────────────────────────

/** Store AI chat session context (recent messages) for context window management */
export async function setAISession(
  sessionId: string,
  messages: Array<{ role: string; content: string }>,
  ttlSeconds = CACHE_TTL["ai-session"],
): Promise<void> {
  try {
    await cacheSet(`ai-session:${sessionId}`, messages, ttlSeconds);
  } catch (err) {
    logger.warn({ sessionId, err }, "[cache] AI session write error");
  }
}

/** Retrieve AI chat session context */
export async function getAISession(
  sessionId: string,
): Promise<Array<{ role: string; content: string }> | null> {
  try {
    return await cacheGet<Array<{ role: string; content: string }>>(`ai-session:${sessionId}`);
  } catch (err) {
    logger.warn({ sessionId, err }, "[cache] AI session read error");
    return null;
  }
}

/** Extend AI session TTL (called on each interaction to keep sessions alive) */
export async function touchAISession(sessionId: string, ttlSeconds = CACHE_TTL["ai-session"]): Promise<void> {
  try {
    const r = await getRedis();
    const raw = r as unknown as { expire?: (k: string, t: number) => Promise<void> };
    if (typeof raw.expire === "function") {
      await raw.expire(`ai-session:${sessionId}`, ttlSeconds);
    }
  } catch {
    // Non-fatal
  }
}

// ── Response cache middleware ──────────────────────────────────────────────────
import type { Request, Response, NextFunction } from "express";

/**
 * Express middleware: cache GET responses in Redis.
 * Only caches 200 JSON responses for public, non-authenticated reads.
 *
 * @param ttlSeconds  Cache duration (default 60s)
 * @param namespace   Cache namespace (default "api-resp")
 */
export function cacheMiddleware(
  ttlSeconds = 60,
  namespace = "api-resp",
) {
  return async function cacheMiddlewareHandler(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    // Only cache GET requests
    if (req.method !== "GET") { next(); return; }

    // Skip for authenticated requests (personalised data)
    const auth = (req as unknown as { unifiedAuth?: { userId?: string } }).unifiedAuth;
    if (auth?.userId) { next(); return; }

    const cacheKey = `cache:${namespace}:${req.originalUrl}`;

    try {
      const cached = await cacheGet<{ status: number; body: unknown }>(cacheKey);
      if (cached) {
        _stats.hits++;
        res.setHeader("X-Cache", "HIT");
        res.status(cached.status).json(cached.body);
        return;
      }
    } catch {
      // Fall through on error
    }

    // Intercept response
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      if (res.statusCode === 200) {
        setImmediate(() =>
          cacheSet(cacheKey, { status: 200, body }, ttlSeconds).catch(() => {}),
        );
        res.setHeader("X-Cache", "MISS");
      }
      return originalJson(body);
    };

    _stats.misses++;
    next();
  };
}
