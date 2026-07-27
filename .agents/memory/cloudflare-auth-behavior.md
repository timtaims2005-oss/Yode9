---
name: Cloudflare Workers AI auth behavior
description: Which endpoints work vs. fail with an inference-only API token; how to fix the fallback path.
---

## Cloudflare API Token Endpoint Permissions

**Key finding:** A Cloudflare Workers AI token may have inference-only scope.

- `/ai/run/{model}` + `stream: true` → **WORKS**
- `/ai/run/{model}` + `stream: false` → **401 Authentication error**
- `/ai/v1/chat/completions` (OpenAI-compatible) → **401 Authentication error**
- `/ai/models/search` → **403 Forbidden** (requires catalog permission)

**Why:** Cloudflare scopes tokens granularly; the typical Workers AI token only covers streaming inference.

**How to apply:**
- `streamCompletion` Path 2.5: always use `stream: true` + `/ai/run/{model}` — this path works.
- `callCloudflareFallback` (tool-orchestrator): use same path, collect SSE chunks into full text response.
- `fetchCloudflareModels`: fall back to static list on 403 instead of throwing.
- Do NOT use `/ai/v1/chat/completions` with a basic inference token.
