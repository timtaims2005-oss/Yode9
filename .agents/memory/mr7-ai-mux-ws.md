---
name: mr7-ai WebSocket Mux
description: /api/mux WS endpoint design and the infinite-reconnect bug fix
---

## Rule

The `network-multiplexer.ts` will loop forever reconnecting if the API server destroys the WebSocket socket (which was the default for unknown paths). Two fixes are required:

**Server-side**: Register `/api/mux` in `index.ts` upgrade handler → `muxWss.handleUpgrade(...)`. Handler in `routes/mux.ts` proxies each JSON message as a fetch to `http://127.0.0.1:${PORT}${req.url}` and returns JSON `{ id, status, headers, body }`.

**Client-side**: In `scheduleReconnect()`, add a max-retry guard:
```ts
if (reconnectAttempt >= RECONNECT_DELAY_MS.length) { useFallback(); return; }
```
Without this, after the retry delays are exhausted the code still calls `RECONNECT_DELAY_MS[Math.min(attempt, length-1)]` which always returns the last delay (16s), so reconnects continue indefinitely.

**Why:** The Replit Vite dev server proxy passes WebSocket upgrade requests through to the API server. Before the `/api/mux` handler existed, the server called `socket.destroy()` for any unknown WS path, causing an immediate close — not a timeout. The client's 5s deadline timer was never the trigger; the close event triggered `scheduleReconnect()` directly, bypassing `useFallback()`.

**How to apply:** Any time a new WebSocket path is needed, add it to `index.ts` upgrade handler AND ensure the client has a matching fallback/limit. Pattern: `muxWss`, `cisaWss`, `collabWss`, `wss` (terminal) all use `{ noServer: true }` WebSocketServer instances.
