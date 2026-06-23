import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

const INTERNAL_KEY = process.env.INTERNAL_API_KEY;

if (!INTERNAL_KEY) {
  logger.warn(
    "INTERNAL_API_KEY is not set — protected routes will reject all requests without a key. " +
    "Set INTERNAL_API_KEY to enable access.",
  );
}

export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  // If no key configured, allow access in development (warn only)
  // In production (NODE_ENV=production), always require the key
  if (!INTERNAL_KEY) {
    if (process.env.NODE_ENV === "production") {
      res.status(503).json({
        error: "Service misconfigured — INTERNAL_API_KEY not set on server.",
      });
      return;
    }
    // Development: pass through with warning
    next();
    return;
  }

  const header = req.headers["x-internal-key"];
  if (!header || header !== INTERNAL_KEY) {
    res.status(403).json({ error: "Forbidden — invalid or missing API key." });
    return;
  }

  next();
}
