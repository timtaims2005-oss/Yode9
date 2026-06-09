---
name: mr7-ai drag fix
description: Why React 18 setState breaks smooth drag and the correct fix for fixed-position floating widgets
---

## Rule
Never use `setPos` inside `window/document.addEventListener("mousemove", ...)` for drag in React 18. Instead, use a `useDraggable` hook that directly mutates `el.style.left/top` during drag and calls `setPos` only on mouseup.

**Why:** React 18 batches ALL setState calls by default — including those inside native event listeners — and flushes them asynchronously. This makes `mousemove` updates visible only after a microtask delay, causing janky or invisible drag motion even though state is updating correctly.

**How to apply:**
- Hook lives at `src/hooks/useDraggable.ts`
- Pattern: `const { pos, rootRef, onDragMouseDown, onDragTouchStart } = useDraggable("storage-key", defaultPos)`
- Add `ref={rootRef as any}` to the `motion.div` root
- Add `onMouseDown={onDragMouseDown} onTouchStart={onDragTouchStart}` to drag strip AND header
- The hook uses `document.addEventListener` (not window), supports touch events, and saves to localStorage on mouseup
- Applied to: CyberGlobeWidget, InteractiveGlobeWidget, NetworkTopologyWidget, NetworkTrafficPanel, NetworkPacketInspector, ModelBenchmarkPanel
- All z-indices set to 96 (above LiveThreatTicker at 90, below modals at 200+)
