---
name: TopBar floating panel portal rule
description: Why every draggable/floating TopBar panel must render via createPortal to document.body
---

Rule: any floating/draggable panel launched from a TopBar icon button must be rendered through `createPortal(<panel/>, document.body)`, never as a plain nested JSX element inside the button's own wrapper div.

**Why:** the TopBar header applies `backdropFilter: blur(...)` to itself, and the inner toolbar row is `overflow-hidden` (it's a horizontally scrollable strip). A CSS `backdrop-filter`/`filter` on an ancestor creates a new containing block for `position: fixed` descendants — so a `position: fixed` panel nested under the header no longer escapes to the viewport, it becomes contained within the header's box, and any `overflow-hidden` ancestor between the panel and that containing block clips it away. The panel's open-state toggles correctly and no error is thrown, but it's invisibly clipped — looks exactly like "the button doesn't do anything."

This was the root cause of a real bug (`AIQuickSetupButton.tsx` panel not appearing) — most sibling components (`ProviderHealthBadge3D`, `QuantumPersona3D`, `PersonaSwitcher3D`, and other TopBar panels) already used `createPortal(..., document.body)` correctly; `AIQuickSetupButton` was the one outlier that rendered its panel as a plain nested `motion.div`.

**How to apply:** when adding or auditing any new TopBar-launched floating/draggable window, confirm it wraps its `AnimatePresence`/panel JSX in `createPortal(<>...</>, document.body)`. Grep sibling TopBar components for the `createPortal` pattern to copy exactly. A stale/off-screen persisted drag position (from `useDraggable`, saved in localStorage) is a separate, secondary bug that can compound this — `useDraggable` now re-clamps position to the current viewport on mount — but the portal is the primary fix for "panel doesn't appear at all."
