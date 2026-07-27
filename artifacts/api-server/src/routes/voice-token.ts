/**
 * POST /api/voice-live/token
 * ──────────────────────────
 * Issues a short-lived HMAC-signed voice session token.
 * The token is passed as ?token=<value> when the browser opens the
 * /api/voice-live WebSocket — browsers cannot set custom headers on WS
 * connections, but they can set query parameters.
 *
 * Rate limit: 10 token issues per device per minute (light — the token
 * endpoint itself is cheap; the expensive path is the WS upgrade).
 *
 * No authentication is required to issue a token by default, so the
 * frontend can call this before the WS open without requiring a login.
 * If REQUIRE_AUTH_FOR_VOICE=true is set, valid session required.
 */

import { Router, type IRouter } from "express";
import { issueVoiceToken } from "../lib/voice-token.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// Simple in-process rate limiter: 10 token issues per IP per minute
const issueBuckets = new Map<string, { count: number; windowStart: number }>();
const ISSUE_WINDOW_MS   = 60_000;
const ISSUE_MAX_PER_MIN = 10;

router.post("/voice-live/token", (req, res) => {
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
    ?? req.socket.remoteAddress
    ?? "unknown";

  // Rate limit the token-issue endpoint by IP
  const now = Date.now();
  if (!issueBuckets.has(ip)) issueBuckets.set(ip, { count: 0, windowStart: now });
  const bucket = issueBuckets.get(ip)!;
  if (now - bucket.windowStart > ISSUE_WINDOW_MS) { bucket.count = 0; bucket.windowStart = now; }
  if (bucket.count >= ISSUE_MAX_PER_MIN) {
    res.status(429).json({ error: "Too many token requests — try again shortly" });
    return;
  }
  bucket.count += 1;

  try {
    const { token, payload } = issueVoiceToken();
    logger.info({ sub: payload.sub, id: payload.id, exp: payload.exp }, "[voice-token] issued");
    res.json({ token, expiresAt: payload.exp * 1000 }); // expiresAt in ms for JS Date
  } catch (err) {
    logger.error({ err }, "[voice-token] issue failed");
    res.status(503).json({ error: "Voice tokens unavailable — SESSION_SECRET not configured" });
  }
});

export default router;
