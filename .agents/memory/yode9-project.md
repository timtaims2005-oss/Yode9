---
name: Yode9 / KaliGPT project setup
description: Full setup notes for the KaliGPT MR7 AI cybersecurity monorepo imported from GitHub
---

# Yode9 / KaliGPT Project Setup

**Why:** Imported from GitHub; needed full Replit environment bootstrap.

## Artifacts & Workflows
- `artifacts/mr7-ai: web` — React 19 Vite frontend, port 22938 (managed workflow)
- `artifacts/api-server: API Server` — Express 5 API, port 8080 (managed workflow)
- `artifacts/mobile: expo` — Expo mobile, not started by default
- `artifacts/mockup-sandbox: Component Preview Server` — canvas sandbox, not started by default

## Key env vars already set
- `LOCAL_AUTH_BYPASS=true`, `LOCAL_MOCK_PROVIDER=true`, `NODE_ENV=development`
- `DATABASE_URL` runtime-managed (Replit PostgreSQL)
- `AUTO_LAUNCH_OLLAMA=false`; Ollama served externally via ngrok (`OLLAMA_HOST`, `VITE_OLLAMA_BASE_URL`)

## Port conflict fix
`artifacts/api-server/package.json` scripts.dev was updated to include `fuser -k 8080/tcp 2>/dev/null;` before build+start to avoid EADDRINUSE on restart.

## How to apply
If port 8080 EADDRINUSE appears despite the fix, run `fuser -k 8080/tcp` manually then restart the workflow.

## Pending secrets
- `GROQ_API_KEY` — for live AI (mock provider works without it)
- `CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY` — for real auth
