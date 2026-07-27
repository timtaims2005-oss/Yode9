---
name: Infrastructure Upgrade — Production-Ready Systems
description: Five new infrastructure layers added to artifacts/api-server in the full infra upgrade.
---

## What was built

### 1. BullMQ Job Queue (`src/lib/queue.ts`)
- Queues: `ai-generation`, `s3-upload`, `webhook-dispatch`, `email-send`
- Auto-inits from `REDIS_URL`; falls back to in-process `setImmediate` executor if Redis absent
- Worker concurrency: 4 for AI, 8 for others; AI jobs globally limited to 10/s
- `addJob(name, data, opts)` — enqueue; `registerWorker(name, handler)` — register handler
- `getQueueStats()` — used by `/api/health/queues`
- Graceful shutdown wired to `SIGTERM`/`SIGINT` in `index.ts` via `shutdownQueue()`

### 2. Smart Caching Layer (`src/lib/cache.ts`)
- `withCache(namespace, key, fn, { ttl?, bypass? })` — cache-aside pattern
- Namespaced TTLs: `providers`=60s, `ai-session`=30min, `api-resp`=5min, `user-info`=10min, `model-list`=1hr
- `setAISession` / `getAISession` / `touchAISession` — AI chat context caching
- `cacheMiddleware(ttlSeconds, namespace)` — Express middleware for public GET responses
- `invalidateCache(namespace, subKey?)` — SCAN-safe pattern delete
- `getCacheStats()` — hit/miss/error/hitRate counters

### 3. Auth-Strategy-Aware Rate Limiter (`src/middlewares/authAwareRateLimit.ts`)
- Strategy quotas (req/60s): internal=∞, cloudflare=1000, api_key=300, jwt=200, clerk/oidc=150, anonymous=20
- Global per-IP DDoS guard (500 req/min) fires before strategy resolution
- `strictAuthAwareRateLimit()` — tighter 900s window for auth/payment routes
- Mounted at `app.use("/api", authAwareRateLimit())` AFTER `unifiedAuth` middleware
- Reads `req.unifiedAuth.authStrategy` (set by unifiedAuthMiddleware)

### 4. Health Checks Enhancement (`src/routes/health.ts`)
- Added S3/R2 bucket check to `/api/health/status` (reads env: AWS_ACCESS_KEY_ID / CLOUDFLARE_R2_*)
- Added `job_queue` service check (BullMQ vs in-process)
- New endpoint: `GET /api/health/queues` — returns per-queue stats + cache hit rate

### 5. ESLint Strict Config (`eslint.config.js`)
- Uses `typescript-eslint` strict + stylistic rules
- Key rules: `no-floating-promises` ERROR, `require-await` ERROR, `return-await` ERROR
- Memory leak focus: `no-eval`, `no-unused-vars`, `no-empty` (no empty catch)
- `pnpm lint` / `pnpm lint:fix` scripts added to package.json

### 6. Sentry Performance (`src/lib/telemetry.ts`)
- `getSentryHandlers()` — exports `sentryRequestHandler`, `sentryTracingHandler`, `sentryErrorHandler`
- Returns no-ops when Sentry is not initialized (graceful)
- `tracesSampleRate`: 0.1 in prod, 1.0 in dev

### 7. tierRateLimit Redis Migration (`src/middlewares/tierRateLimit.ts`)
- Now uses `rateLimitCheck()` from lib/redis (Redis sliding window)
- Falls back to in-memory timestamp array on Redis error
- No API changes — same `tierRateLimit` export, same tier names

**Why:** All systems designed for zero-crash fallback — missing Redis/S3 = yellow, not red.
**How to apply:** Set `REDIS_URL` to activate BullMQ + Redis rate limiting; set S3 env vars for S3 health green status.
