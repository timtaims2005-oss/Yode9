---
name: Yode9 / MR7 AI Project
description: Full project imported from github.com/timtaims2005-oss/Yode9 — stack, artifact layout, env vars needed.
---

# MR7 AI Project — Imported from Yode9

## Artifacts
- `artifacts/api-server` — Express 5 backend, ID `3B4_FFSkEVBkAeYMFRJ2e`, port 8080, path `/api`
- `artifacts/mr7-ai` — React 19 + Vite frontend, ID `artifacts/mr7-ai`, port 22938, path `/`
- `artifacts/mobile` — Expo (React Native) app, ID `artifacts/mobile`, port 18115, path `/mobile/`
- `artifacts/mockup-sandbox` — Design canvas, ID `XegfDyZt7HqfW2Bb8Ghoy`, path `/__mockup`

## Shared libs
- `lib/db` — Drizzle ORM schema (PostgreSQL + pgvector)
- `lib/api-spec` — OpenAPI spec + Orval codegen
- `lib/api-client-react` — generated React Query hooks
- `lib/api-zod` — generated Zod schemas
- `lib/integrations-openai-ai-react` — OpenAI React client helpers
- `lib/integrations-openai-ai-server` — OpenAI server helpers

## Key env vars needed (set in secrets)
- `DATABASE_URL` — PostgreSQL (already provisioned by Replit)
- `CLERK_SECRET_KEY` / `CLERK_PUBLISHABLE_KEY` — Clerk auth
- `OPENAI_API_KEY` — OpenAI
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — Stripe payments
- `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` — R2 storage (optional)
- `SENTRY_DSN` — error tracking (optional)

**Why:** imported project relies on many third-party services; missing keys produce warnings but app still starts.

## Import notes
- Files copied from /tmp/yode9-import excluding .git, .local, node_modules, attached_assets
- .replit-artifact/artifact.toml for mr7-ai and mobile are NEW (platform-assigned IDs), not from source repo
- api-server and mockup-sandbox kept original artifact IDs (same as workspace)
