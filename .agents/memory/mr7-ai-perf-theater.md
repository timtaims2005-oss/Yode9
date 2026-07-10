---
name: mr7-ai performance-theater modules
description: main.tsx previously booted many decorative "performance" libraries that added real main-thread overhead with no functional payoff; how to tell real vs decorative before touching init() calls.
---

The app's `main.tsx` used to call `.init()`/`.start()`/`.connect()` on ~15 self-styled
"performance/resilience" modules under `src/lib/` (names like jank-detector,
boot-orchestrator, quantum-scheduler, zero-copy-buffer, speculative-execution,
neural-prefetch, cognitive-cache, turbo-gc, scheduler-coordinator,
paint-synchronizer, network-multiplexer). Despite the impressive naming, most
were self-contained decorative systems:

- jank-detector ran a `requestAnimationFrame` loop purely to log frame drops.
- boot-orchestrator lazily imported and initialised 14 more decorative modules
  in layered `setTimeout`/`requestIdleCallback` waves (frame-scheduler,
  gpu-layer-manager, memory-pressure, thermal-guard, worker-pool, etc).
- quantum-scheduler ran a 16ms `setInterval` "tick" for a fake virtual-worker queue.
- speculative-execution / neural-prefetch attached global `mousemove`,
  `mouseenter`, `scroll`, and `click` listeners to "predict" navigation.
- cognitive-cache intercepted every `fetch()` call for ML-style pattern learning.

None of these were imported anywhere else in the codebase (verified via grep for
`from '.../<module>'`), so none of the app's real functionality depended on their
loops running. They were pure continuous CPU/main-thread cost for a cosmetic
console-log narrative.

**Why:** the user explicitly reported the app felt laggy/slow and wanted smoothness;
`refresh_all_logs`/screenshots showed constant `[jank-detector] Long Task` and
`Frame drop` warnings on every boot, self-inflicted by this exact stack.

**How to apply:** before deciding whether a `lib/*.ts` "systemX.init()" call in
main.tsx is safe to disable, grep the whole `src/` tree for other imports of that
module path. If it's only imported in main.tsx, it's decorative and safe to stop
calling. If it's imported by a real UI component (e.g. `smart-cache`,
`circuit-breaker`, and `network-resilience` are read by `OfflineQueueBanner.tsx`
and `PerformanceCommandCenter.tsx`), keep it — those are real, low-overhead, and
drive actual UI/state.
