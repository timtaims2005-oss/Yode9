---
name: Cloudflare fallback guard
description: callCloudflareFallback must guard against missing credentials
---

## Rule
`callCloudflareFallback` in tool-orchestrator-v2.ts must check `ctx.accountId` and `ctx.apiToken` before making any fetch. Without the guard, an empty accountId produces a malformed Cloudflare URL (`/accounts/ai/run/...` instead of `/accounts/{ID}/ai/run/...`) which returns HTTP 404, becoming the "last error" in the cascade and misleading diagnosis.

**Why:** CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are not configured in this environment. The guard added throws immediately with a clear message instead of a confusing 404.

**How to apply:** Always add this guard when modifying the Cloudflare fallback. Model `@cf/meta/llama-3.1-8b-instruct` is the stable fallback (the 70b fp8-fast model path was removed by Cloudflare).
