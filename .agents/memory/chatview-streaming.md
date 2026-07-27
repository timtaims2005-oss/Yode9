---
name: ChatView streaming improvements
description: Performance throttle and background notifications added to ChatView.tsx
---

## Streaming Throttle (Phase 2.5)
Added `lastRenderMsRef` — only dispatch `PATCH_MSG` when `Date.now() - lastRenderMsRef.current >= 32ms`. This halves React re-renders (30fps vs 60fps) without visible smoothness loss. The `setLiveTokens`/`setLiveTps` updates were already inside the `buf !== streamLastRef.current` guard.

## Background Notifications (Phase 2.8)
Added to the `finally` block after `setStreaming(false)`:
- If elapsed > 2s AND page hidden: update `document.title` with `(1)` badge, cleared on `visibilitychange`
- If elapsed > 5s: show `toast()` in-app ("long task")
- If page hidden: request/use `Notification` API

**Why:** Users miss responses during long generations. Title badge works even without notification permission. Toast covers in-app case.

Added refs: `streamStartTimeRef`, `bgNotifSentRef`, `lastRenderMsRef` to ChatView.tsx.
