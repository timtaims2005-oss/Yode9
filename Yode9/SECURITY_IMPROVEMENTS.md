# Security Improvements

Comprehensive security hardening applied across the MR7.AI / KaliGPT platform.

---

## 1. Server-Side Subscription Verification

**Problem:** The previous implementation performed activation code verification on the client, exposing the `ADMIN_SECRET` in the browser bundle.

**Fix:** All subscription verification now happens server-side in `artifacts/api-server/src/lib/subscription-verify.ts`.

- The `ADMIN_SECRET` never leaves the server
- Activation codes are verified via `POST /api/subscriptions/verify`
- Admin password verification via `POST /api/subscriptions/verify-admin`
- Code generation via `POST /api/subscriptions/generate` (admin-only)
- Client-side `subscription.ts` exports proxy functions that call the server API
- Backward-compatible alias `verifyActivationCode` maintained for existing imports

**Files:**
- `/artifacts/api-server/src/lib/subscription-verify.ts`
- `/artifacts/api-server/src/routes/subscriptions.ts`
- `/artifacts/mr7-ai/src/lib/subscription.ts`

---

## 2. Internal API Key Authentication (`internalAuth`)

**Problem:** The `internalAuth` middleware previously allowed requests through without a key if none was configured, even in production.

**Fix:** The middleware now enforces strict behavior:
- In **production** (`NODE_ENV=production`): Returns `503` if `INTERNAL_API_KEY` is not set
- In **development**: Passes through with a warning logged
- All protected routes (cloud chats, providers, subscriptions, shell) require a valid `X-Internal-Key` header
- Constant-time comparison is not needed here since the key is a shared secret, but the check is strict

**Files:**
- `/artifacts/api-server/src/middlewares/internalAuth.ts`

---

## 3. Environment Variable Validation at Startup

**Problem:** Missing or insecure environment variables could cause silent failures or security gaps at runtime.

**Fix:** `validateEnv()` runs before the server starts and:
- Checks all required variables (`DATABASE_URL`)
- Warns about insecure defaults for `SESSION_SECRET`
- Warns if `INTERNAL_API_KEY` is missing
- Exits with `process.exit(1)` if critical variables are absent

**Files:**
- `/artifacts/api-server/src/lib/env.ts`

---

## 4. Constant-Time Comparison for Secrets

**Problem:** String comparison using `===` is vulnerable to timing attacks, allowing attackers to deduce secret values character by character.

**Fix:** All secret comparisons use `crypto.timingSafeEqual()`:
- `verifyAdminPassword()` uses constant-time buffer comparison
- `verifyActivationCode()` uses constant-time comparison for the embedded secret
- Length checks are performed before comparison to avoid information leakage

**Files:**
- `/artifacts/api-server/src/lib/subscription-verify.ts`

---

## 5. WebSocket Terminal Authentication

**Problem:** The WebSocket terminal endpoint was accessible without authentication.

**Fix:** WebSocket connections now require valid session authentication before granting terminal access.

**Files:**
- `/artifacts/api-server/src/routes/shell.ts`

---

## 6. Cloud Chats & Providers Protection

**Problem:** Cloud chat storage and provider configuration endpoints were unprotected.

**Fix:** Both route groups are now gated behind `internalAuth` middleware:
- `POST /api/cloud-chats/*` requires `X-Internal-Key`
- `GET/POST /api/providers/*` requires `X-Internal-Key`

**Files:**
- `/artifacts/api-server/src/routes/cloud-chats.ts`
- `/artifacts/api-server/src/routes/providers.ts`

---

## 7. CORS Hardening in Production

**Problem:** CORS was permissive, allowing any origin in production.

**Fix:** Production CORS is restricted to `ALLOWED_ORIGINS` environment variable. If not set, only same-origin requests are allowed.

**Files:**
- `/artifacts/api-server/src/app.ts`

---

## 8. Safe Math Evaluation (No `new Function()`)

**Problem:** `new Function()` was used for mathematical expression evaluation, which is a code injection vector.

**Fix:** Replaced with a safe recursive-descent parser that only handles arithmetic operations (+, -, *, /, parentheses). No arbitrary code execution is possible.

**Files:**
- `/artifacts/mr7-ai/src/components/chat/ChatInput.tsx`

---

## 9. Zod Validation on All Routes

**Problem:** API routes accepted arbitrary input without validation, risking injection attacks and unexpected behavior.

**Fix:** All routes now use Zod schemas for request body and query parameter validation:
- Subscription routes: `verifySchema`, `statusSchema`, `useTokensSchema`, `generateSchema`
- Input is rejected with `400` if validation fails
- Type-safe parsing ensures only valid data reaches business logic

**Files:**
- `/artifacts/api-server/src/routes/subscriptions.ts`
- `/artifacts/api-server/src/middlewares/validateBody.ts`

---

## 10. Database Security

**Problem:** No structured storage for subscriptions, audit logs, or API keys.

**Fix:** PostgreSQL schema with:
- Parameterized queries (no SQL injection)
- Activation code hashes stored (not plaintext codes)
- Audit log table for tracking security events
- API key hash storage (keys are never stored in plaintext)
- Session table with expiration for automatic cleanup

**Files:**
- `/artifacts/api-server/src/db.ts`
- `/lib/db/src/schema/subscriptions.ts`
- `/lib/db/src/schema/audit-logs.ts`
- `/lib/db/src/schema/api-keys.ts`
- `/lib/db/src/schema/cloud-chats.ts`

---

## 11. Subscription Token Deduction (Atomic)

**Problem:** Token usage tracking was not atomic, risking race conditions.

**Fix:** `POST /api/subscriptions/use-tokens` uses a single SQL statement with `ON CONFLICT ... DO UPDATE SET tokens_used = tokens_used + $2` for atomic increment.

**Files:**
- `/artifacts/api-server/src/routes/subscriptions.ts`

---

## Summary Table

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | Client-side ADMIN_SECRET exposure | Critical | Fixed |
| 2 | internalAuth bypass in production | High | Fixed |
| 3 | Missing env validation | Medium | Fixed |
| 4 | Timing attacks on secrets | Medium | Fixed |
| 5 | Unauthenticated WebSocket terminal | High | Fixed |
| 6 | Unprotected cloud chats/providers | High | Fixed |
| 7 | Permissive CORS | Medium | Fixed |
| 8 | `new Function()` code injection | Critical | Fixed |
| 9 | Missing input validation | High | Fixed |
| 10 | No structured DB security | Medium | Fixed |
| 11 | Non-atomic token deduction | Low | Fixed |
