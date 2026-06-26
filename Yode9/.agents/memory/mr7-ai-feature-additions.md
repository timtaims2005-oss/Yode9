---
name: mr7-ai feature additions
description: New services and routes added to api-server — gotchas and constraints
---

# New Services Added

**Lib files:** redis.ts, email.ts, storage.ts, vector-db.ts, telemetry.ts, feature-flags.ts, webhooks.ts, backup.ts

**Route files:** oauth.ts, upload.ts, vector.ts, webhooks-mgmt.ts, features.ts, backup.ts, email.ts

All wired in: app.ts (attackDetector middleware + oauthRouter + backup/featureflags init), routes/index.ts (all new routers).

# Key Constraints

**@opentelemetry/* peer deps:** `@sentry/node` v8+ requires `@opentelemetry/instrumentation` and friends at the package level even if Sentry is never initialized. Must install: `@opentelemetry/api @opentelemetry/instrumentation @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions` as direct dependencies.

**Why:** @sentry/node v8 uses OpenTelemetry internally; missing peer deps cause ERR_MODULE_NOT_FOUND at startup even with dynamic imports + early returns.

**Express 5 route params:** `:param(*)` is invalid in Express 5 / path-to-regexp v8. Use plain `:param` instead. Will throw `PathError: Missing parameter name` at startup (not build time).

**connect-redis@9 peer:** needs `redis@>=5` npm package, not ioredis. Since project already has PG-backed sessions, skip Redis sessions entirely — use ioredis only for caching/rate-limiting via lib/redis.ts.

**getPersonalOpenAI() can return null:** always null-check before calling `.embeddings.create()` etc.

**INTERNAL_API_KEY warning:** WARN at startup is expected in dev — all /api/* routes (except oauth, cisa, providers, subscriptions) go through internalAuth middleware. `/api/features` returning 401 is correct behavior.

**build.mjs externals:** `@opentelemetry/*`, `@sentry/*`, `@aws-sdk/*`, nodemailer, multer etc. are all already in the external list — they run from node_modules at runtime, not bundled.

**Attack detector skip list:** SKIP_ROUTES array in attack-detector.ts lists all AI/chat endpoints that contain intentional user content (prompts/code) — prevents false positives from blocking legitimate AI usage.
