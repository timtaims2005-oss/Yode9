---
name: mr7-ai streaming protocol
description: The /api/chat endpoint always streams SSE. All modals must use readChatText() or streamChat(), never resp.json().
---

## Rule
`/api/chat` **always** emits SSE format: `data: {"content":"..."}\n\n` then `data: {"done":true}\n\n`.
It never returns JSON directly, regardless of `stream: false` in the request body (server ignores that flag).

## How to apply
- Use `streamChat()` from `@/lib/chat-client` for real-time streaming UI updates.
- Use `readChatText(resp: Response)` from `@/lib/chat-client` for one-shot text extraction (no streaming UI needed).
- Never call `resp.json()` on a `/api/chat` response — it will fail because the body is SSE text.
- Parse chunks as: `const obj = JSON.parse(raw); const delta = obj.content ?? obj.choices?.[0]?.delta?.content ?? "";`

**Why:** Fixed in migration; 22+ modals had the broken `resp.json()` pattern causing silent failures.
