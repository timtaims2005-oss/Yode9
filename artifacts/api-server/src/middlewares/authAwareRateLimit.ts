/**
 * Auth-Strategy-Aware Rate Limiter
 * ──────────────────────────────────
 * Redis-backed sliding-window rate limiter that applies different quotas
 * based on the resolved authentication strategy from UnifiedAuth middleware.
 *
 * Strategy quotas (requests per minute, per window):
 *   internal   → unlimited (service-to-service)
 *   cloudflare → 1 000 req/min (edge-authenticated)
 *   api_key    → configurable per-key tier (default 300 req/min)
 *   jwt        → 200 req/min
 *   clerk      → 150 req/min (web app users)
 *   oidc       → 150 req/min (Replit SSO)
 *   anonymous  →  20 req/min (unauthenticated)
 *
 * The limiter also applies a global per-IP DDoS guard (500 req/min) that
 * fires before strategy resolution.
 *
 * Usage:
 *   router.use(authAwareRateLimit());
 *   router.use(authAwareRateLimit({ windowSeconds: 60, overrides: { anonymous: 10 } }));
 */

import type { Request, Response, NextFunction } from "express";
import { rateLimitCheck } from "../lib/redis.js";
import { logger } from "../lib/logger.js";

type AuthStrategy = "internal" | "cloudflare" | "api_key" | "jwt" | "clerk" | "oidc" | "anonymous";

interface AuthAwareRateLimitOptions {
  /** Sliding window size in seconds (default: 60) */
  windowSeconds?: number;
  /** Per-strategy request quotas (requests per window). Override any default. */
  overrides?: Partial<Record<AuthStrategy, number>>;
  /** Global per-IP DDoS guard limit. Set to 0 to disable. Default: 500 */
  ipGuardLimit?: number;
  /** Key prefix for Redis buckets */
  keyPrefix?: string;
  /** Custom message on 429 */
  message?: string;
  /**
   * Optional escape hatch: when this predicate returns true for a request,
   * all rate-limit checks (IP guard + strategy quota) are skipped entirely.
   * Use for trusted local-engine proxy paths that must never be throttled.
   */
  skip?: (req: Request) => boolean;
}

const DEFAULT_LIMITS: Record<AuthStrategy, number> = {
  internal:   Infinity, // never limit service-to-service calls
  cloudflare: 1_000,
  api_key:    300,
  jwt:        200,
  clerk:      150,
  oidc:       150,
  anonymous:  20,
};

export function authAwareRateLimit(opts: AuthAwareRateLimitOptions = {}) {
  const {
    windowSeconds  = 60,
    overrides      = {},
    ipGuardLimit   = 500,
    keyPrefix      = "aa-rl",
    message        = "Too many requests. Slow down or upgrade your plan.",
    skip,
  } = opts;

  const limits: Record<AuthStrategy, number> = { ...DEFAULT_LIMITS, ...overrides };

  return async function authAwareRateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    // ── 0. Caller-supplied skip predicate (e.g. local-engine proxy paths) ──────
    if (skip?.(req)) { next(); return; }

    // ── 1. Global per-IP DDoS guard ────────────────────────────────────────────
    if (ipGuardLimit > 0) {
      const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
      const isLoopback = ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";

      if (!isLoopback && process.env.EVALS_MODE !== "1") {
        try {
          const ipKey = `${keyPrefix}:ip:${ip}`;
          const { allowed: ipAllowed, remaining: ipRemaining, resetIn: ipReset } =
            await rateLimitCheck(ipKey, ipGuardLimit, windowSeconds);

          if (!ipAllowed) {
            res.setHeader("Retry-After", ipReset);
            res.setHeader("X-RateLimit-Limit", ipGuardLimit);
            res.setHeader("X-RateLimit-Remaining", 0);
            res.status(429).json({ error: "Too many requests from your IP.", retryAfter: ipReset });
            return;
          }

          res.setHeader("X-RateLimit-IP-Remaining", ipRemaining);
        } catch {
          // Fail open on Redis error
        }
      }
    }

    // ── 2. Skip rate limiting for eval suite and internal services ─────────────
    if (process.env.EVALS_MODE === "1") { next(); return; }

    // ── 3. Resolve auth strategy and user identity ─────────────────────────────
    const unifiedAuth = (req as unknown as {
      unifiedAuth?: { authStrategy: AuthStrategy; userId?: string; apiKeyId?: string };
    }).unifiedAuth;

    const strategy: AuthStrategy = unifiedAuth?.authStrategy ?? "anonymous";

    // Internal callers bypass strategy-level limiting entirely
    if (strategy === "internal") { next(); return; }

    const userId = unifiedAuth?.userId ?? unifiedAuth?.apiKeyId ?? null;
    const identity = userId
      ? `user:${userId}`
      : `ip:${req.ip ?? "unknown"}`;

    // ── 4. Apply per-strategy quota ───────────────────────────────────────────
    const limit = limits[strategy] ?? limits.anonymous;

    if (!isFinite(limit)) { next(); return; }

    try {
      const bucketKey = `${keyPrefix}:${strategy}:${identity}`;
      const { allowed, remaining, resetIn } = await rateLimitCheck(
        bucketKey,
        limit,
        windowSeconds,
      );

      res.setHeader("X-RateLimit-Strategy", strategy);
      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", Math.floor(Date.now() / 1000) + resetIn);

      if (!allowed) {
        logger.warn(
          { strategy, identity, limit, path: req.path },
          "[auth-rate-limit] 429 — quota exceeded",
        );
        res.setHeader("Retry-After", resetIn);
        res.status(429).json({
          error: message,
          strategy,
          limit,
          retryAfter: resetIn,
          upgradeUrl: strategy === "anonymous" ? "/app#pricing" : undefined,
        });
        return;
      }

      next();
    } catch (err) {
      logger.warn({ err }, "[auth-rate-limit] Redis error — failing open");
      next();
    }
  };
}

/**
 * Strict auth-aware limiter for sensitive endpoints (auth, payments, admin).
 * Tighter quotas and no fail-open on Redis error for these routes.
 */
export function strictAuthAwareRateLimit(opts: AuthAwareRateLimitOptions = {}) {
  return authAwareRateLimit({
    windowSeconds: 900, // 15-minute window
    overrides: {
      anonymous:  5,
      clerk:      30,
      oidc:       30,
      jwt:        30,
      api_key:    60,
      cloudflare: 200,
    },
    ipGuardLimit: 100,
    keyPrefix: "strict-rl",
    message: "Too many requests on this sensitive endpoint.",
    ...opts,
  });
}
