---
name: Ecosystem control center UI
description: The eight-sector ecosystem is exposed through a dedicated protected-app route and sidebar entry.
---

The ecosystem UI lives as a dedicated `/ecosystem` control surface rather than a modal inside chat. It runs the real local TotalAutonomousEcosystemEngine, exposes sector status, execution traces, memory, tools/provider readiness, approvals, swarm results, and flywheel counts.

**Why:** The ecosystem needs a discoverable operational surface without increasing coupling or destabilizing the existing MR7 chat and modal system.

**How to apply:** Keep `/app` and existing modal paths unchanged. Add new ecosystem controls through the dedicated route and sidebar ECO entry; show unconfigured external providers explicitly as unavailable or provider-required.