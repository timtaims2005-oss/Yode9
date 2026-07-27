/**
 * Subscription-Tier Rate Limiter
 * ───────────────────────────────
 * Applies different request quotas based on the user's active subscription
 * plan fetched from the `user_subscriptions` DB table.
 *
 * Tier quotas (requests per minute for OSINT/deep-search endpoints):
 *   free        →  10 req/min   (rate-limited)
 *   pro         →  60 req/min
 *   enterprise  → 200 req/min
 *   internal    → Unlimited (service-to-service)
 *
 * Falls back to the authAwareRateLimit strategy quotas when no DB record
 * is found, so the system never blocks legitimate users due to a DB error.
 *
 * Usage:
 *   router.use(tieredRateLimit());
 *   router.use(tieredRateLimit({ windowSeconds: 60, endpoint: "deep-search" }));
 */

import type { Request, Response, NextFunction } from "express";
import { rateLimitCheck } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { pool } from "../db.js";

// ── Tier configuration ────────────────────────────────────────────────────────

type SubscriptionPlan = "free" | "starter" | "pro" | "enterprise" | "elite";

interface TieredRateLimitOptions {
  /** Sliding window size in seconds (default: 60) */
  windowSeconds?: number;
  /** Key prefix for Redis buckets (default: "tier-rl") */
  keyPrefix?: string;
  /** Per-plan quota overrides (requests per window) */
  planOverrides?: Partial<Record<SubscriptionPlan, number>>;
  /** Error message on 429 */
  message?: string;
  /** Endpoint label for logging */
  endpoint?: string;
}

/** Default quotas per plan (requests per 60-second window) */
const DEFAULT_PLAN_LIMITS: Record<SubscriptionPlan, number> = {
  free:       10,
  starter:    30,
  pro:        60,
  enterprise: 200,
  elite:      300,
};

/** Fallback by auth strategy when no DB record found */
const FALLBACK_LIMITS: Record<string, number> = {
  internal:   Infinity,
  cloudflare: 200,
  api_key:    60,
  jwt:        30,
  clerk:      20,
  oidc:       20,
  anonymous:  5,
};

// ── Subscription plan lookup (cached per user in Redis 10 min) ────────────────

async function getUserPlan(userId: string): Promise<SubscriptionPlan | null> {
  if (!userId) return null;

  // Redis short-cache (10 min) to avoid hitting DB on every request
  const { cacheGet, cacheSet } = await import("../lib/redis.js");
  const cacheKey = `user-plan:${userId}`;
  const cached = await cacheGet<SubscriptionPlan>(cacheKey);
  if (cached) return cached;

  try {
    const result = await pool.query<{ plan: string; status: string }>(
      `SELECT plan, status
       FROM user_subscriptions
       WHERE user_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId],
    );
    const row = result.rows[0];
    if (!row) return null;

    const plan = row.plan as SubscriptionPlan;
    // Cache plan for 10 minutes
    await cacheSet(cacheKey, plan, 600).catch(() => {});
    return plan;
  } catch (err) {
    logger.debug({ err, userId }, "[tiered-rl] DB lookup failed — falling back");
    return null;
  }
}

// ── Middleware factory ────────────────────────────────────────────────────────

export function tieredRateLimit(opts: TieredRateLimitOptions = {}) {
  const {
    windowSeconds = 60,
    keyPrefix     = "tier-rl",
    planOverrides = {},
    message       = "Rate limit exceeded. Upgrade your plan for higher limits.",
    endpoint      = "default",
  } = opts;

  const planLimits: Record<SubscriptionPlan, number> = {
    ...DEFAULT_PLAN_LIMITS,
    ...planOverrides,
  };

  return async function tieredRateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    // ── Resolve authenticated user from Unified Auth ──────────────────────────
    const unified = (req as Request & { unifiedAuth?: { userId?: string; strategy?: string } }).unifiedAuth;
    const userId   = unified?.userId ?? "";
    const strategy = unified?.strategy ?? "anonymous";

    // Internal service-to-service — always allow
    if (strategy === "internal") { next(); return; }

    // ── Look up subscription plan ─────────────────────────────────────────────
    let limit: number;
    if (userId) {
      const plan = await getUserPlan(userId);
      if (plan && planLimits[plan] !== undefined) {
        limit = planLimits[plan];
      } else {
        // No active subscription → treat as free
        limit = planLimits.free;
      }
    } else {
      // Anonymous — use fallback strategy limits
      limit = FALLBACK_LIMITS[strategy] ?? 5;
    }

    // Unlimited tier — skip Redis check
    if (!isFinite(limit)) { next(); return; }

    // ── Redis sliding-window check ────────────────────────────────────────────
    const ip = req.ip ?? req.socket?.remoteAddress ?? "unknown";
    const identity = userId || ip;
    const bucketKey = `${keyPrefix}:${endpoint}:${identity}`;

    try {
      const { allowed, remaining, resetIn } = await rateLimitCheck(
        bucketKey,
        limit,
        windowSeconds,
      );

      res.setHeader("X-RateLimit-Limit", limit);
      res.setHeader("X-RateLimit-Remaining", Math.max(0, remaining));
      res.setHeader("X-RateLimit-Reset", Math.floor(Date.now() / 1000) + resetIn);

      if (!allowed) {
        logger.warn({ userId, strategy, endpoint, limit }, "[tiered-rl] Rate limit exceeded");
        res.setHeader("Retry-After", resetIn);
        res.status(429).json({
          error: message,
          retryAfter: resetIn,
          limit,
          upgrade: limit <= planLimits.free
            ? "Upgrade to Pro for 6× more requests per minute."
            : undefined,
        });
        return;
      }

      next();
    } catch {
      // On Redis error, fail open — never block legitimate traffic
      next();
    }
  };
}

/** Pre-configured limiter for deep-search & OSINT endpoints */
export const deepSearchTieredLimit = tieredRateLimit({
  windowSeconds: 60,
  keyPrefix:     "tier-rl",
  endpoint:      "deep-search",
  planOverrides: {
    free:       5,
    starter:    20,
    pro:        60,
    enterprise: 200,
    elite:      400,
  },
});

/** Pre-configured limiter for general OSINT routes */
export const osintTieredLimit = tieredRateLimit({
  windowSeconds: 60,
  keyPrefix:     "tier-rl",
  endpoint:      "osint",
  planOverrides: {
    free:       15,
    starter:    40,
    pro:        120,
    enterprise: 500,
    elite:      1000,
  },
});
