/**
 * Redis-backed sliding-window rate limiter middleware
 * ─────────────────────────────────────────────────────
 * Uses the rateLimitCheck helper from lib/redis (which falls back to the
 * in-memory InMemoryCache when REDIS_URL is not set, so it is always safe).
 *
 * Usage:
 *   app.use("/api/osint", redisRateLimit({ limit: 60, windowSeconds: 60 }));
 *   app.use("/api/chat",  redisRateLimit({ limit: 30, windowSeconds: 60, keyPrefix: "chat" }));
 */

import { type Request, type Response, type NextFunction } from "express";
import { rateLimitCheck } from "../lib/redis.js";

interface RedisRateLimitOptions {
  /** Max requests allowed in the window */
  limit: number;
  /** Window size in seconds */
  windowSeconds: number;
  /** Optional key prefix (defaults to the route path) */
  keyPrefix?: string;
  /** Custom key extractor — defaults to IP address */
  keyExtractor?: (req: Request) => string;
  /** Message returned on 429 */
  message?: string;
}

export function redisRateLimit(opts: RedisRateLimitOptions) {
  const {
    limit,
    windowSeconds,
    keyPrefix,
    keyExtractor,
    message = "Too many requests — slow down.",
  } = opts;

  return async function redisRateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    // In development all traffic arrives from the same reverse-proxy IP, so
    // every request shares one bucket and innocuous bursts fire 429 immediately.
    // Skip all Redis-backed rate limiting outside of production.
    if (process.env.NODE_ENV !== "production") { next(); return; }

    try {
      const identity = keyExtractor
        ? keyExtractor(req)
        : (req.ip ?? req.socket?.remoteAddress ?? "unknown");

      const prefix = keyPrefix ?? req.path.replace(/[^a-z0-9]/gi, "_").slice(0, 32);
      const bucketKey = `rl:${prefix}:${identity}`;

      const { allowed, remaining, resetIn } = await rateLimitCheck(
        bucketKey,
        limit,
        windowSeconds,
      );

      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", Math.floor(Date.now() / 1000) + resetIn);

      if (!allowed) {
        res.setHeader("Retry-After", resetIn);
        res.status(429).json({ error: message, retryAfter: resetIn });
        return;
      }

      next();
    } catch {
      // On Redis error, fail open (allow request) to avoid blocking users
      next();
    }
  };
}

/** Pre-configured limiters for common use-cases */
export const osintLimiter   = redisRateLimit({ limit: 60,  windowSeconds: 60,  keyPrefix: "osint" });
export const cveSearchLimiter = redisRateLimit({ limit: 120, windowSeconds: 60, keyPrefix: "cve" });
export const aiChatLimiter  = redisRateLimit({ limit: 40,  windowSeconds: 60,  keyPrefix: "chat" });
export const authLimiter    = redisRateLimit({ limit: 10,  windowSeconds: 900, keyPrefix: "auth" });
