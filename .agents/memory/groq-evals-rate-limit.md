---
name: Groq evals rate limiting
description: Why tool-calling scenarios fail in the full evals sequence but pass individually
---

## Rule
When running all 20 evals sequentially, the 7 heavy chat scenarios exhaust the Groq free-tier TPM budget (~6000–20000 TPM/min depending on model). Once exhausted, all subsequent tool-calling scenarios fail with the cascade error "كل مزودي النموذج مشغولين" because all 4 fallback providers (Groq/OpenRouter/Gemini/Cloudflare) are either rate-limited or unconfigured.

**Why:** Groq free tier: llama-3.1-8b-instant = 30 RPM / 20000 TPM. Heavy chat scenarios (security-explain, osint-concepts) can generate 1000–2500 tokens each, exhausting the per-minute budget.

**How to apply:**
- Test tool-calling scenarios individually (not in the full sequence) to confirm they work.
- Use `EVALS_MODE=1` to prefer the 8b model.
- Inter-scenario delay of 5s is insufficient for the full 20-scenario run; 15s is safer but may exceed shell timeout.
- The failures are infrastructure artifacts, not functional bugs.
