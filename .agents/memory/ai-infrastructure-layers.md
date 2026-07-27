---
name: AI infrastructure layers
description: Additive six-layer infrastructure boundary for safety, tracing, evals, prompts, gateway, and runtime memory.
---

The production AI infrastructure is intentionally implemented as an opt-in `ai-infrastructure` layer above the existing MR7 chat, tools, skills, approval, memory, and orchestration paths. It must not replace legacy callers.

**Why:** The application has many established AI surfaces and tool integrations; wrapping them preserves compatibility while allowing new entry points to adopt enterprise controls incrementally.

**How to apply:** New agent entry points should use the infrastructure pipeline or runtime adapter. Keep provider credentials out of durable memory, enforce input/output guardrails, record traces, and fail closed on budget, timeout, schema, or safety violations.