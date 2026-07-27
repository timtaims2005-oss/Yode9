/**
 * Short-lived signed voice-session tokens for /api/voice-live authentication.
 *
 * Format:  base64url(JSON payload) + "." + base64url(HMAC-SHA256 signature)
 * Payload: { sub: "voice", iat: <unix-s>, exp: <iat+TTL>, id: <random 8-hex> }
 *
 * Signed with SESSION_SECRET (required env var), so tokens cannot be forged
 * or reused across restarts with a different secret.
 *
 * TTL is intentionally short (2 minutes) — the token is only used once to
 * open the WebSocket; the connection itself is long-lived.
 */

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const SECRET = process.env["SESSION_SECRET"] ?? "";
const TTL_S  = 120; // 2 minutes — enough for page-load → WS-open, short enough to limit replay

if (!SECRET) {
  // Warn at module load — will become an error at token-issue time
  console.warn("[voice-token] SESSION_SECRET is not set; voice token issuance will fail");
}

export interface VoiceTokenPayload {
  sub: "voice";
  iat: number;   // issued-at (Unix seconds)
  exp: number;   // expiry   (Unix seconds)
  id:  string;   // per-token unique id — used as rate-limit key
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(data: string): string {
  if (!SECRET) throw new Error("SESSION_SECRET not set — cannot issue voice tokens");
  return b64url(createHmac("sha256", SECRET).update(data).digest());
}

/** Issue a new signed voice token. Throws if SESSION_SECRET is missing. */
export function issueVoiceToken(): { token: string; payload: VoiceTokenPayload } {
  const now = Math.floor(Date.now() / 1000);
  const payload: VoiceTokenPayload = {
    sub: "voice",
    iat: now,
    exp: now + TTL_S,
    id:  randomBytes(8).toString("hex"),
  };
  const data = b64url(Buffer.from(JSON.stringify(payload)));
  const sig  = sign(data);
  return { token: `${data}.${sig}`, payload };
}

export type VerifyResult =
  | { ok: true;  payload: VoiceTokenPayload; id: string }
  | { ok: false; reason: string };

/** Verify a voice token. Returns the payload on success or a failure reason. */
export function verifyVoiceToken(token: string): VerifyResult {
  if (!SECRET) return { ok: false, reason: "SERVER_MISCONFIGURED" };

  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "MALFORMED" };

  const [data, sig] = parts as [string, string];

  // Constant-time signature comparison
  const expected = sign(data);
  try {
    if (!timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(expected, "base64url"))) {
      return { ok: false, reason: "INVALID_SIGNATURE" };
    }
  } catch {
    return { ok: false, reason: "INVALID_SIGNATURE" };
  }

  let payload: VoiceTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf-8")) as VoiceTokenPayload;
  } catch {
    return { ok: false, reason: "MALFORMED_PAYLOAD" };
  }

  if (payload.sub !== "voice") return { ok: false, reason: "WRONG_SUBJECT" };

  const now = Math.floor(Date.now() / 1000);
  if (now > payload.exp) return { ok: false, reason: "EXPIRED" };
  if (now < payload.iat - 10) return { ok: false, reason: "ISSUED_IN_FUTURE" };

  return { ok: true, payload, id: payload.id };
}
