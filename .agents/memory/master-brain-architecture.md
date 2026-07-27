---
name: Master Brain architecture
description: Unified brain orchestrator above the ten-layer AI infrastructure.
---

The Master Brain is an opt-in orchestration layer that composes sensory ingestion, environment state, world simulation, tree-of-thought planning, DAG decomposition, protocol/tool execution, human approval, episodic/semantic/procedural memory, evolution logging, bidirectional guardrails, TEE abstraction, and bounded healing.

**Why:** The existing infrastructure already exposes specialized capabilities; a composition layer provides one stable pipeline without rewriting or coupling legacy callers.

**How to apply:** New autonomous entry points should use the Master Brain orchestrator and inject production protocol, model, storage, approval, and enclave providers. Keep sensitive execution fail-closed and keep retries bounded.