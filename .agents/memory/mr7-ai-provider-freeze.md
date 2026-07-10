---
name: mr7-ai provider freeze fix
description: Root cause and fix for model selection causing app freeze; personal provider dead URL; AbortController timeout pattern
---

# Provider Freeze Fix

## Root Cause
The `personal` provider in `ai-providers.ts` defaulted to `https://f48e9a0302b427.lhr.life/v1` — a dead temporary tunnel URL. When no PERSONAL_API_KEY/URL was set, all providers (including fallback for missing API keys) routed to this dead URL, causing `await client.chat.completions.create()` to hang indefinitely with no timeout.

## Fix Applied
- `getPersonalKey()` now checks: `PERSONAL_API_KEY` → `OPENAI_API_KEY` (Replit integration) → "no-key"
- `getPersonalBase()` now checks: `PERSONAL_API_BASE_URL` → `https://api.openai.com/v1` (never dead URL)
- All `streamCompletion()` calls wrapped in 60-second `AbortController` timeout — yields `{ error: "Request timed out..." }` instead of hanging
- `callOnce()` has 30-second timeout
- `getPersonalOpenAI()` now always creates a fresh client (no cache) using the helper functions

**Why:** The lhr.life tunnel was a temporary dev tunnel, not a permanent endpoint. Replit AI integration provides `OPENAI_API_KEY` reliably.

**How to apply:** Never hardcode a tunnel URL as a default — always use official API endpoints or env vars with proper fallbacks. Always add AbortController timeouts to all AI API calls.

## Backend providers.ts
`getAvailableProviders` was renamed to `listProviders` in the rewrite — providers.ts imports it as `import { listProviders as getAvailableProviders }`.
