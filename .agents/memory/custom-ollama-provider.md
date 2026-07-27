---
name: Custom Ollama provider
description: Server-side custom-provider configuration and compatibility behavior for the ngrok-exposed Ollama model.
---

The configured Ollama endpoint is treated as an OpenAI-compatible custom provider. Keep its bearer credential in the server-side `CUSTOM_API_KEY` Secret; browser code must not receive or persist that credential.

**Why:** The provider is exposed through ngrok and requires both bearer authentication and `ngrok-skip-browser-warning: true`. The bridge accepts non-streaming chat completions but returns HTTP 500 for streaming requests.

**How to apply:** Use `CUSTOM_API_BASE_URL` and `CUSTOM_API_MODEL` for server configuration, attach the ngrok header to custom requests, and retry custom-provider streaming failures as a non-streaming completion while preserving the app's SSE response contract.