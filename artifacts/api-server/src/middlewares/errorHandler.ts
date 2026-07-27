/**
 * Global Error Handler Middleware
 * ─────────────────────────────────
 * Must be registered LAST in Express (after all routes).
 * Catches any error passed via next(err) or thrown inside async route handlers
 * wrapped with express-async-errors / express 5.
 *
 * Security rules enforced here:
 *  1. Never send stack traces to clients.
 *  2. Never send raw DB errors (postgres codes, relation names, etc.).
 *  3. Never send internal file system paths.
 *  4. Operational errors (4xx) keep their message; programmer errors (5xx) get generic text.
 *  5. The full error is always logged server-side with a correlation ID.
 */

import type { ErrorRequestHandler } from "express";
import { logger } from "../lib/logger.js";
import { ZodError } from "zod";

// Postgres error codes that indicate an operational failure the client may retry
const PG_OPERATIONAL_CODES = new Set(["23505", "23503", "23502", "23514"]); // unique, FK, not-null, check

/**
 * Classify the error and return a safe client-facing message + HTTP status.
 * Never expose internal details.
 */
function classify(err: unknown): { status: number; message: string } {
  // ── Zod validation errors ──────────────────────────────────────────────────
  if (err instanceof ZodError) {
    return {
      status: 400,
      message: "Validation failed.",
    };
  }

  // ── Known operational errors thrown by our own code ───────────────────────
  if (err instanceof Error) {
    // Postgres errors have a .code property
    const pgCode = (err as NodeJS.ErrnoException & { code?: string }).code ?? "";

    if (PG_OPERATIONAL_CODES.has(pgCode)) {
      if (pgCode === "23505") return { status: 409, message: "Conflict — this resource already exists." };
      if (pgCode === "23503") return { status: 422, message: "Reference not found — related record missing." };
      return { status: 422, message: "Database constraint violation." };
    }

    // Rate-limit errors from our own tier limiter
    if (err.message.includes("Too many requests") || (err as { status?: number }).status === 429) {
      return { status: 429, message: "Too many requests — slow down." };
    }

    // Multer file errors are safe to surface
    if (err.message.startsWith("File type not allowed")) {
      return { status: 400, message: err.message };
    }
    if (err.message.startsWith("File too large")) {
      return { status: 413, message: err.message };
    }

    // Express body-parser JSON parse errors
    if ((err as { type?: string }).type === "entity.parse.failed") {
      return { status: 400, message: "Invalid JSON in request body." };
    }

    // HTTP status already attached (e.g. createError())
    const attachedStatus = (err as { status?: number; statusCode?: number }).status
      ?? (err as { status?: number; statusCode?: number }).statusCode;
    if (attachedStatus && attachedStatus >= 400 && attachedStatus < 500) {
      // 4xx: safe to relay a sanitised version of the message
      return {
        status: attachedStatus,
        message: sanitizeMessage(err.message),
      };
    }
  }

  // ── Unknown / programmer errors → generic 500 ─────────────────────────────
  return { status: 500, message: "An unexpected error occurred. Please try again." };
}

/**
 * Strip file paths, stack lines, and DB relation names from a message
 * before it is allowed to reach the client.
 */
function sanitizeMessage(msg: string): string {
  return msg
    .replace(/\/[a-z0-9_\-/.]+\.(ts|js|mjs|cjs)/gi, "[file]")   // file paths
    .replace(/\bat\s+.+:\d+:\d+/g, "")                            // stack frames
    .replace(/\brelation\s+"[^"]+"/g, "[table]")                  // postgres relation names
    .replace(/\bcolumn\s+"[^"]+"/g, "[column]")                   // postgres column names
    .trim();
}

export const globalErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // Always log the full error server-side
  const correlationId = (req as { id?: string }).id ?? "unknown";
  logger.error(
    { err, correlationId, method: req.method, url: req.url?.split("?")[0] },
    "[error-handler] Unhandled error"
  );

  if (res.headersSent) {
    // Can't send another response; just end the stream
    res.end();
    return;
  }

  const { status, message } = classify(err);
  res.status(status).json({ error: message, correlationId });
};
