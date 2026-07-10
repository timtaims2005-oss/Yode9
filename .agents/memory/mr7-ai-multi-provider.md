---
name: mr7-ai multi-provider AI
description: How the multi-provider AI system works — env vars, store state, backend routing
---

## Architecture

- `artifacts/api-server/src/lib/ai-providers.ts` — unified provider factory
  - `streamCompletion(provider, model, messages, temp)` — async generator, works for all providers
  - Anthropic uses native SDK (`@anthropic-ai/sdk`); others use OpenAI SDK with different `baseURL`
  - `getAvailableProviders()` — reads env vars, returns list with `available: bool`
  - `invalidateProviderCache()` — clears cached clients (call after adding new env vars)

- `artifacts/api-server/src/routes/providers.ts` — `GET /api/providers`, `POST /api/providers/reload`
  - Registered in `app.ts` BEFORE `internalAuth` so frontend can access without API key

- `artifacts/api-server/src/routes/chat.ts` — accepts `provider` + `providerModel` in request body
  - Default: `provider="openai"`, `providerModel="gpt-5.4"`

## Frontend State

- `store.tsx` — `AppState.activeProvider: ProviderName`, `AppState.activeProviderModel: string`
- Action: `{ type: "SET_PROVIDER", provider, providerModel? }`
- `ChatView.tsx` passes `provider` + `providerModel` in every `streamChat()` call
- `ProviderSettingsModal.tsx` — UI for selecting provider + model, shows env var instructions

## Provider Env Vars

| Provider | Env Var |
|----------|---------|
| OpenAI | `OPENAI_API_KEY` |
| Anthropic | `ANTHROPIC_API_KEY` |
| Groq | `GROQ_API_KEY` |
| Gemini | `GEMINI_API_KEY` |
| OpenRouter | `OPENROUTER_API_KEY` |
| Custom | `CUSTOM_API_KEY` + `CUSTOM_API_BASE_URL` |

**Why:** User wanted to use different AI providers beyond just OpenAI. All OpenAI-compatible providers (Groq, Gemini, OpenRouter, Custom) use the OpenAI SDK with different baseURLs. Anthropic uses its native SDK but we wrap it into the same SSE chunk format.

**How to apply:** To add a new provider, add entry in `PROVIDER_CONFIGS` in `ai-providers.ts` and add the env var.
