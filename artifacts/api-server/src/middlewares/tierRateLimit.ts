/**
 * Tier-based rate limiter middleware.
 * Redis-backed sliding window per user (falls back to in-memory when Redis is absent).
 *
 * Limits (requests per minute):
 *   free        → 20 req/min
 *   starter     → 60 req/min
 *   professional→ 200 req/min
 *   elite       → 600 req/min
 *   anonymous   → 10 req/min
 */
import { type Request, type Response, type NextFunction } from "express";
import { rateLimitCheck } from "../lib/redis.js";

// ── In-memory fallback (used when Redis is not available) ─────────────────────
interface Window { timestamps: number[] }
const _windows = new Map<string, Window>();
const WINDOW_MS = 60_000;
setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, win] of _windows) {
    win.timestamps = win.timestamps.filter(t => t > cutoff);
    if (win.timestamps.length === 0) _windows.delete(key);
  }
}, 300_000);

const TIER_LIMITS: Record<string, number> = {
  free:         20,
  starter:      60,
  professional: 200,
  elite:        600,
  anonymous:    10,
};

const WINDOW_SECONDS = 60;

export function tierRateLimit(req: Request, res: Response, next: NextFunction): void {
  // EVALS_MODE=1 or loopback requests bypass all limiting
  const ip = req.ip ?? "";
  const isLocalhost = ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
  if (process.env.EVALS_MODE === "1" || isLocalhost) { next(); return; }

  const authUser = req.authUser;
  const tier     = (authUser?.subscription as string | undefined) ?? "anonymous";
  const userId   = authUser?.id ?? `ip:${req.ip}`;
  const limit    = TIER_LIMITS[tier] ?? TIER_LIMITS["anonymous"]!;

  // ── Redis-backed path ──────────────────────────────────────────────────────
  rateLimitCheck(`tier:${tier}:${userId}`, limit, WINDOW_SECONDS)
    .then(({ allowed, remaining, resetIn }) => {
      res.setHeader("X-RateLimit-Limit",     String(limit));
      res.setHeader("X-RateLimit-Remaining", String(remaining));
      res.setHeader("X-RateLimit-Reset",     String(Math.floor(Date.now() / 1000) + resetIn));
      res.setHeader("X-RateLimit-Tier",      tier);

      if (!allowed) {
        res.setHeader("Retry-After", resetIn);
        res.status(429).json({
          error: "Too many requests — slow down",
          tier,
          limit,
          retryAfter: resetIn,
          upgradeUrl: "/app#pricing",
        });
        return;
      }
      next();
    })
    .catch(() => {
      // ── In-memory fallback on Redis error ───────────────────────────────────
      const now    = Date.now();
      const cutoff = now - WINDOW_MS;
      let win = _windows.get(userId);
      if (!win) { win = { timestamps: [] }; _windows.set(userId, win); }
      win.timestamps = win.timestamps.filter(t => t > cutoff);

      if (win.timestamps.length >= limit) {
        const oldest = win.timestamps[0]!;
        const retryAfter = Math.ceil((oldest + WINDOW_MS - now) / 1000);
        res.status(429).json({ error: "Too many requests — slow down", tier, limit, retryAfter });
        return;
      }
      win.timestamps.push(now);
      res.setHeader("X-RateLimit-Limit",     String(limit));
      res.setHeader("X-RateLimit-Remaining", String(limit - win.timestamps.length));
      res.setHeader("X-RateLimit-Reset",     String(Math.ceil((now + WINDOW_MS) / 1000)));
      next();
    });
}
