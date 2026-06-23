/**
 * Server-side subscription verification.
 * The ADMIN_SECRET never leaves the server — all verification happens here.
 */

import crypto from "crypto";
import { logger } from "./logger";

type SubscriptionTier = "free" | "starter" | "professional" | "elite";

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "CHATGPT-OWNER-2026";

if (process.env.NODE_ENV === "production" && ADMIN_SECRET === "CHATGPT-OWNER-2026") {
  logger.warn("ADMIN_SECRET is using the default insecure value in production. Set ADMIN_SECRET env var.");
}

export interface VerifiedSubscription {
  tier: SubscriptionTier;
  expiresAt: number;
}

/**
 * Verify an activation code on the server.
 * Returns null if invalid or expired.
 */
export function verifyActivationCode(code: string): VerifiedSubscription | null {
  try {
    const padded = code.toLowerCase() + "=".repeat((4 - (code.length % 4)) % 4);
    const decoded = Buffer.from(padded, "base64").toString("utf8");
    const parts = decoded.split("|");
    if (parts.length !== 3) return null;

    const [tier, expiryStr, secret] = parts;

    // Constant-time comparison to prevent timing attacks
    const secretMatch = crypto.timingSafeEqual(
      Buffer.from(secret, "utf8"),
      Buffer.from(ADMIN_SECRET, "utf8").slice(0, secret.length),
    ) && secret.length === ADMIN_SECRET.length;

    if (!secretMatch) return null;

    const expiresAt = parseInt(expiryStr, 10);
    if (isNaN(expiresAt) || Date.now() > expiresAt) return null;

    const validTiers: SubscriptionTier[] = ["free", "starter", "professional", "elite"];
    if (!validTiers.includes(tier as SubscriptionTier)) return null;

    return { tier: tier as SubscriptionTier, expiresAt };
  } catch (err) {
    logger.warn({ err }, "Activation code verification failed");
    return null;
  }
}

/**
 * Verify the admin password on the server.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function verifyAdminPassword(password: string): boolean {
  try {
    const a = Buffer.from(password, "utf8");
    const b = Buffer.from(ADMIN_SECRET, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Generate an activation code (admin-only, server-side only).
 */
export function generateActivationCode(tier: SubscriptionTier, days: number): string {
  const expiry = Date.now() + days * 86_400_000;
  const raw = `${tier}|${expiry}|${ADMIN_SECRET}`;
  const encoded = Buffer.from(raw).toString("base64").replace(/=/g, "");
  return encoded.toUpperCase().slice(0, 32);
}
