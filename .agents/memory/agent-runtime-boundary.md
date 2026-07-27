---
name: Agent Runtime Boundary
description: Architectural constraint for extending the tool-calling and multi-agent runtime
---

New integrations for tool routing, memory, skills, approvals, and multi-agent execution should be exposed through an additive runtime boundary rather than rewriting legacy registry, chat, or UI paths.

**Why:** The project contains many Arsenal modules and established UI/event bridges; preserving those paths avoids regressions while allowing new surfaces to opt into the unified pipeline.

**How to apply:** Put new orchestration helpers and request-scoped streaming adapters in the additive runtime layer. Keep existing `toolsRegistry`, chat client, ChatView, and skill/file UI behavior backward-compatible.