/**
 * Local Engine API Key Authentication Middleware
 *
 * Guards all /api/ollama/*, /api/local-engines/*, and /api/local-proxy/*
 * routes with an optional service key.
 *
 * Configuration (server-side):
 *   LOCAL_ENGINE_API_KEY=<your-key>   — Replit Secret
 *
 * If LOCAL_ENGINE_API_KEY is NOT set → every request passes through
 * (backward-compatible for local dev without the secret).
 *
 * If LOCAL_ENGINE_API_KEY IS set → the request must supply it via:
 *   • Authorization: Bearer <key>
 *   • X-API-Key: <key>
 *
 * Returns 401 JSON on failure; never leaks the expected key in the response.
 */
import type { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

// Resolved once at startup — never changes at runtime.
const CONFIGURED_KEY = (process.env.LOCAL_ENGINE_API_KEY ?? "").trim();
const AUTH_ENABLED   = CONFIGURED_KEY.length > 0;

if (AUTH_ENABLED) {
  logger.info("[local-engine-auth] API key protection ENABLED — all local engine endpoints require Authorization.");
} else {
  logger.warn("[local-engine-auth] LOCAL_ENGINE_API_KEY not set — local engine endpoints are publicly accessible. Set the secret to enable protection.");
}

/** Constant-time string comparison to prevent timing attacks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Extract the bearer token from Authorization or X-API-Key headers. */
function extractKey(req: Request): string | null {
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  const xApiKey = req.headers["x-api-key"];
  if (typeof xApiKey === "string" && xApiKey.trim()) {
    return xApiKey.trim();
  }
  return null;
}

/**
 * Express middleware — attach to local-engine routers.
 *
 * Usage:
 *   import { localEngineAuth } from "../lib/local-engine-auth";
 *   router.use(localEngineAuth);
 */
export function localEngineAuth(req: Request, res: Response, next: NextFunction): void {
  // If no key is configured, auth is disabled — pass through.
  if (!AUTH_ENABLED) {
    next();
    return;
  }

  const provided = extractKey(req);

  if (!provided) {
    logger.warn({ path: req.path, ip: req.ip }, "[local-engine-auth] Rejected: missing key");
    res.status(401).json({
      error:  "Unauthorized",
      code:   "MISSING_API_KEY",
      hint:   "Supply your API key via: Authorization: Bearer <key>  or  X-API-Key: <key>",
    });
    return;
  }

  if (!safeEqual(provided, CONFIGURED_KEY)) {
    logger.warn({ path: req.path, ip: req.ip }, "[local-engine-auth] Rejected: invalid key");
    res.status(401).json({
      error: "Unauthorized",
      code:  "INVALID_API_KEY",
      hint:  "The provided API key does not match LOCAL_ENGINE_API_KEY.",
    });
    return;
  }

  next();
}
