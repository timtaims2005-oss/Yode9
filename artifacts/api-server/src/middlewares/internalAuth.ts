/**
 * Internal Auth Guard — Thin Delegation Shim
 * ─────────────────────────────────────────────────────────────────────────────
 * This module now delegates entirely to the Unified Authentication Framework.
 * Since `unifiedAuth` is registered globally in app.ts (before any route), the
 * strategy has already been resolved by the time this guard runs.
 *
 * This guard simply enforces that the resolved strategy is "internal" (i.e. the
 * request carried a valid x-internal-key header). No re-verification is done —
 * the UAF already did that work with a timing-safe comparison.
 *
 * Usage (unchanged):
 *   import { internalAuth } from "../middlewares/internalAuth";
 *   app.use("/api/internal", internalAuth, myRouter);
 *
 * Migration path:
 *   Prefer `requireRole("system")` from unifiedAuthMiddleware for new code.
 *   This shim is kept for backward compatibility with existing route mounts.
 */

import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";

/**
 * Guard: allows only requests whose Unified Auth strategy resolved to "internal".
 *
 * Behavior mirrors the original internalAuth.ts:
 *   - In production: returns 403 if not internal.
 *   - In development + INTERNAL_API_KEY unset: passes through with a warning.
 *   - Always: returns 403 for invalid/missing keys (handled by UAF upstream).
 */
export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  const ctx = req.unifiedAuth;

  // UAF not yet initialised (defensive — should never happen with global registration)
  if (!ctx) {
    logger.error("[internalAuth] unifiedAuth context missing — UAF not registered globally?");
    res.status(500).json({ error: "Server misconfiguration — auth context unavailable." });
    return;
  }

  if (ctx.authStrategy === "internal") {
    // Fully authenticated internal service — pass through
    next();
    return;
  }

  // Development bypass when INTERNAL_API_KEY is not configured
  if (!process.env.INTERNAL_API_KEY && process.env.NODE_ENV !== "production") {
    logger.warn(
      { path: req.path, method: req.method, strategy: ctx.authStrategy },
      "[internalAuth] INTERNAL_API_KEY not set — bypassing in dev mode",
    );
    next();
    return;
  }

  // Production or key configured but strategy didn't resolve to internal
  res.status(403).json({
    error:  "Forbidden — this endpoint requires an internal service key.",
    hint:   "Set the x-internal-key header with a valid INTERNAL_API_KEY value.",
    method: ctx.authStrategy, // tells caller which strategy was detected instead
  });
}

export default internalAuth;
