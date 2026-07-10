---
name: KaliGPT Stack Overview
description: Monorepo architecture, ports, auth, and workflow restart requirements.
---

# KaliGPT Stack Overview

**Why:** Needed for any new dev to understand the system topology and key gotchas.

## Architecture

- `artifacts/mr7-ai/` — React + Vite frontend (port 5000)
- `artifacts/api-server/` — Express API server (port 8080, built with esbuild)
- `artifacts/pentest-lab/` — Python FastAPI pentest tools (port 8000)

## Auth

- Replit OIDC via `setupReplitAuth(app)` in `artifacts/api-server/src/routes/auth.ts`
- No Supabase, Firebase, or Clerk — purely Replit Auth

## Critical: API rebuild required

The API server is NOT hot-reloaded. After any TypeScript changes to `artifacts/api-server/src/`:
1. Must restart the "Start application" workflow
2. Build runs `node ./build.mjs` → `dist/index.mjs` (esbuild)
3. Only then do API changes take effect

## Route registration order in app.ts

1. Public routes (health, CISA, OAuth, providers, subscriptions)
2. Threat intel routes (public GET)
3. `internalAuth` middleware block (all others)

## Workflow command

```
python3 scripts/launch-ollama.py & PORT=8080 pnpm --filter @workspace/api-server run dev & PORT=5000 BASE_PATH=/ pnpm --filter @workspace/mr7-ai run dev
```

## How to apply: Always restart workflow after API changes. Frontend uses Vite HMR.
