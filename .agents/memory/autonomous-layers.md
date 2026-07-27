---
name: Autonomous enterprise layers
description: Additive layers 7-10 for perception, metacognition, swarms, replay, healing, and confidential execution.
---

Layers 7-10 are exposed as provider-based, opt-in modules above the six-layer infrastructure and legacy runtime. Perception, embeddings, LoRA, swarm agents, replay, and enclave providers are replaceable interfaces; unavailable confidential execution fails closed.

**Why:** Real hardware, model adapters, and trusted execution environments vary by deployment, so the application must remain runnable with deterministic mocks while refusing sensitive enclave work when no TEE is configured.

**How to apply:** Use `executeAutonomousPipeline` for the Ultra-Stack path, inject production providers for live integrations, keep replay snapshots free of secrets, and retain bounded self-healing attempts.