/**
 * JWT Authentication Middleware — Compatibility Shim
 * ─────────────────────────────────────────────────────────────────────────────
 * All authentication logic has been consolidated into the Unified Auth Framework
 * at `middlewares/unifiedAuthMiddleware.ts`.
 *
 * This file re-exports the legacy API so that existing routes (user-auth.ts,
 * api-keys.ts, chat.ts, etc.) continue to work without any changes.
 *
 * Migration guide:
 *   Old: import { jwtAuth, requireAuth, requireAdmin, checkTokenQuota } from "../middlewares/jwtAuth"
 *   New: import { unifiedAuth, requireUnifiedAuth, requireRole, requireTokenQuota } from "../middlewares/unifiedAuthMiddleware"
 */

// ── Re-export crypto helpers (not part of auth framework — kept here) ─────────
export { verifyJwtRsa as verifyJwt } from "../lib/crypto.js";
export { signAccessToken, signRefreshToken } from "../lib/crypto.js";

// ── Re-export unified auth guards under legacy names ──────────────────────────
export {
  unifiedAuth as jwtAuth,
  requireUnifiedAuth as requireAuth,
  requireAdmin,
  requireTokenQuota as checkTokenQuota,
  // New API also available from this shim
  unifiedAuth,
  requireUnifiedAuth,
  requireRole,
  requirePermission,
  requireTier,
  requireTokenQuota,
  requireAuthAndQuota,
  authSummary,
} from "./unifiedAuthMiddleware.js";

// ── AuthUser interface — re-exported for backward compat ──────────────────────
export type { UnifiedAuthContext as AuthUser } from "./unifiedAuthMiddleware.js";

// ── signJwt — backward-compatible wrapper ─────────────────────────────────────
import { signAccessToken } from "../lib/crypto.js";

/**
 * @deprecated Use signAccessToken() from lib/crypto.ts directly.
 * Kept for backward compatibility — signs with RSA-2048 (RS256).
 */
export function signJwt(payload: Record<string, unknown>, _expiresIn?: string): string {
  const { sub, email, role, tier, ...rest } = payload;
  return signAccessToken({
    sub:   String(sub   ?? ""),
    email: String(email ?? ""),
    role:  String(role  ?? "user"),
    tier:  String(tier  ?? "free"),
    ...rest,
  } as Parameters<typeof signAccessToken>[0]);
}
