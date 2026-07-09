---
name: mr7-ai personal-api migration
description: All routes now use personal API (getPersonalOpenAI/callOnce) instead of Replit OpenAI SDK; model name constants; max_tokens fix
---

## Rule
Never import `{ openai } from "@workspace/integrations-openai-ai-server"` in any route. Use `getPersonalOpenAI()` or `callOnce()` from `../lib/ai-providers`.

## What changed
- All 8 routes (chat.ts, autotune.ts, context.ts, council.ts, godmode.ts, agent.ts, osint.ts, image.ts, vision.ts) migrated away from Replit OpenAI SDK
- `callOnce(messages, maxTokens)` — convenience wrapper for non-streaming calls via personal API
- `getPersonalOpenAI()` — returns OpenAI-compatible client pointed at personal API (default: `https://f48e9a0302b427.lhr.life/v1`, configurable via `PERSONAL_API_BASE_URL` env)
- `PERSONAL_DEFAULT_MODEL` — env `PERSONAL_DEFAULT_MODEL` ?? `"gpt-3.5-turbo"`
- Default provider in store.tsx: `"personal"`, default model: `"gpt-3.5-turbo"`

**Why:** User wants full independence from Replit's paid API; all traffic should route through their own localtunnel-proxied OpenAI-compatible endpoint.

**How to apply:** Any new route that calls an LLM must import from `../lib/ai-providers` and use `getPersonalOpenAI()` or `callOnce()`. Use `max_tokens` not `max_completion_tokens` (some personal APIs don't support the newer param name).
