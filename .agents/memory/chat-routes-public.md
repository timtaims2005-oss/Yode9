---
name: Chat routes public mount
description: chatRouter registration order in app.ts
---

## Rule
`chatRouter` (from `routes/chat.ts`) must be imported and registered directly in `app.ts` BEFORE the `internalAuth` block. It must NOT be registered only via `routes/index.ts` (which is behind internalAuth).

**Why:** Routes `/api/chat`, `/api/chat/translate`, `/api/chat/enhance`, `/api/chat/extract`, `/api/title` are public-facing; they don't require INTERNAL_API_KEY. The `/chat/translate` and `/chat/enhance` paths were previously broken because they were only registered behind internalAuth.

**How to apply:** `routes/index.ts` has a comment noting chatRouter is handled in app.ts. Do not re-add chatRouter to routes/index.ts.
