---
name: Multi-provider Claude Code
description: ClaudeCodeModal accepts keys from 5 AI providers, auto-detects from key prefix
---
Providers: Anthropic (sk-ant-), OpenAI (sk-), Gemini (AIza), Groq (gsk_), OpenRouter (sk-or-)
Storage: cc-api-key-v3 (key), cc-provider-v3 (provider ID) in localStorage
Backend: /api/claude-code/stream normalizes all providers to Anthropic SSE format for unified frontend parsing
Verification: /api/claude-code/verify-key checks the key against each provider's models endpoint
**Why:** User wanted universal key support without changing frontend SSE parser
