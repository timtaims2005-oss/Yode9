---
name: Replit AI Integration
description: OpenAI client provisioning via Replit AI Integrations
---
Call setupReplitAIIntegrations({ providerSlug:"openai", providerUrlEnvVarName:"AI_INTEGRATIONS_OPENAI_BASE_URL", providerApiKeyEnvVarName:"AI_INTEGRATIONS_OPENAI_API_KEY" }) in code_execution to provision.
Client in lib/integrations-openai-ai-server/src/client.ts reads these env vars lazily.
Must restart API server after provisioning for new env vars to take effect.
**Why:** Avoids exposing real OpenAI keys; Replit proxies requests automatically
