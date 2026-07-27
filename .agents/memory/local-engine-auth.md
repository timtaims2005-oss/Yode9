---
name: Local Engine API Key Auth
description: How optional API key authentication works for local model engine endpoints (Ollama, local-engines, local-proxy).
---

# Local Engine API Key Authentication

## Rule
All `/api/ollama/*`, `/api/local-engines/*`, `/api/local-proxy/*` endpoints are protected by `localEngineAuth` middleware when `LOCAL_ENGINE_API_KEY` env secret is set. Auth is disabled (pass-through) when the secret is not configured.

**Why:** Prevents unauthorized access to local model execution infrastructure. Timing-safe comparison prevents key oracle attacks.

## How to apply
- Backend secret: `LOCAL_ENGINE_API_KEY` (Replit Secret)
- Frontend env var: `VITE_OLLAMA_API_KEY` (shared env)
- Both must match (currently both: rayan1212)

## Architecture
- Middleware: `artifacts/api-server/src/lib/local-engine-auth.ts`
  - Accepts: `Authorization: Bearer <key>` OR `X-API-Key: <key>`
  - Returns 401 JSON `{ error, code, hint }` on failure
  - Uses constant-time comparison (`safeEqual`) against timing attacks
- Applied via `router.use(localEngineAuth)` at top of all 3 route files
- Frontend wrapper: `artifacts/mr7-ai/src/lib/localEngineClient.ts`
  - `localFetch(url, init?)` — drop-in fetch replacement, auto-attaches key for local engine URLs
  - `getLocalEngineHeaders()` — returns headers object for manual spreading
  - All 7 consumer files updated to use `localFetch` (34 total call sites)

## Consumer files updated
- OllamaHub3D.tsx (14 calls)
- LocalEngineHubModal.tsx (3 calls)
- LocalAIModelNexus.tsx (2 calls)
- LocalAIWindow.tsx (9 calls)
- TopBar.tsx (3 calls)
- LocalModelModal.tsx (2 calls)
- chat-client.ts (1 call)
