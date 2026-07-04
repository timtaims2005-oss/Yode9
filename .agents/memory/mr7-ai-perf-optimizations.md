---
name: mr7-ai performance optimizations
description: Comprehensive performance improvements applied to the mr7.ai frontend — what was done and what patterns to follow for future canvas/animation/polling work.
---

## Key rules established

**Canvas DPR:** Never use `Math.min(window.devicePixelRatio * 2, 4)` — this renders at 4x and wastes 75% GPU fill rate. Always use `Math.min(window.devicePixelRatio, 2)` or `Math.min(window.devicePixelRatio || 1, 1.5)`.

**IntersectionObserver pattern for canvas:** Always add alongside `visibilitychange`:
```ts
let _intersecting = true;
function _onVis() { _paused = document.hidden || !_intersecting; }
const observer = new IntersectionObserver(([e]) => {
  _intersecting = e.isIntersecting;
  _paused = document.hidden || !_intersecting;
}, { threshold: 0 });
observer.observe(canvas); // use the actual canvas variable, not a generic name like cvEl
// cleanup: observer.disconnect()
```

**Store localStorage debounce:** `store.tsx` now debounces localStorage writes 300ms using `lsTimerRef`. Snapshot state in closure: `const snapState = state;` before the timeout.

**Polling intervals:** Notification polls changed from 30s → 120s. All polling useEffects should guard with `if (document.hidden) return;`. TopBar health ping is 60s.

**React.memo:** `HUDBtn` and `VDivider` in TopBar.tsx are now wrapped with `React.memo`. Future heavy presentational components in TopBar should also get `memo`.

**OmnixAbsoluteDashboard + NexusPanel:** Both repositioned to drop from TopBar (top:48px). OmnixAbsoluteDashboard uses `<>` Fragment inside `{open && (...)}` because it has two sibling `motion.div` elements. NexusPanel slides in from right. Both lost their full-screen backdrops.

**SystemMasterHUD3D:** Wrapped in a `position:fixed; top:48px; right:16px` container in App.tsx with a close button overlay.

**TopBar new props:** `onOpenSysPanel`, `onOpenNexusPanel`, `onOpenOmnixPanel` added to `TopBarProps` interface and destructuring. Three pill buttons SYS▼/NEXUS▼/OMNIX▼ appear at start of toolbar strip.

**main.tsx:** 11 dead perf-theater imports removed (jankDetector, bootOrchestrator, schedulerCoordinator, paintSynchronizer, networkMultiplexer, cognitiveCache, zeroCopyBuffer, turboGC, quantumScheduler, speculativeExecution, neuralPrefetch). Only real systems kept: networkResilience, smartCache, circuitBreaker, renderBudget.

**Why:** All these reduce main thread blocking, GPU overdraw, unnecessary network requests, and React re-render cascades.
