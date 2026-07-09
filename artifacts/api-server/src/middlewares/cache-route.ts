/**
 * cacheRoute — Declarative Redis-backed response cache middleware
 * ───────────────────────────────────────────────────────────────
 * Wraps any GET route with a Redis cache layer. Falls back to in-memory
 * when REDIS_URL is not set (safe in all environments).
 *
 * Usage:
 *   router.get("/cve/:id", cacheRoute({ ttl: 3600, keyFn: (req) => `cve:${req.params.id}` }), handler);
 *   router.get("/feed",    cacheRoute({ ttl: 300,  prefix: "feed" }), handler);
 */

import { type Request, type Response, type NextFunction } from "express";
import { cacheGet, cacheSet } from "../lib/redis.js";

interface CacheRouteOptions {
  /** TTL in seconds (default: 300 = 5 min) */
  ttl?: number;
  /** Key prefix — combined with the full URL path */
  prefix?: string;
  /** Custom key function — overrides prefix+path logic */
  keyFn?: (req: Request) => string;
  /** Don't cache when this returns true (e.g. bypass for auth'd users) */
  bypass?: (req: Request) => boolean;
}

/**
 * Scope: designed for simple GET → 200 JSON handlers only.
 * It intercepts res.json() and stores the body; on hit it replays with a 200.
 * Do NOT use on routes that may return non-200 success codes or binary bodies.
 */
export function cacheRoute(opts: CacheRouteOptions = {}) {
  const { ttl = 300, prefix, keyFn, bypass } = opts;

  return async function cacheRouteMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    // Only cache GET requests
    if (req.method !== "GET") { next(); return; }
    // Bypass check
    if (bypass && bypass(req)) { next(); return; }

    const cacheKey = keyFn
      ? keyFn(req)
      : `route:${prefix ?? ""}:${req.path}${req.query && Object.keys(req.query).length ? "?" + new URLSearchParams(req.query as Record<string, string>).toString() : ""}`;

    try {
      const hit = await cacheGet<unknown>(cacheKey);
      if (hit !== null) {
        res.setHeader("X-Cache", "HIT");
        res.setHeader("X-Cache-Key", cacheKey.slice(0, 80));
        res.json(hit);
        return;
      }
    } catch {
      // Cache read failure — fall through to handler
    }

    // Intercept res.json to cache the response
    const _json = res.json.bind(res);
    res.json = function (body: unknown) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheSet(cacheKey, body, ttl).catch(() => {});
      }
      res.setHeader("X-Cache", "MISS");
      return _json(body);
    };

    next();
  };
}

/** Pre-built cache config for common OSINT/CVE TTLs */
export const cveCache   = cacheRoute({ ttl: 3600,  prefix: "cve" });     // 1 hour — CVE data changes rarely
export const osintCache = cacheRoute({ ttl: 300,   prefix: "osint" });   // 5 min — OSINT enrichment
export const feedCache  = cacheRoute({ ttl: 1800,  prefix: "feed" });    // 30 min — threat feeds
