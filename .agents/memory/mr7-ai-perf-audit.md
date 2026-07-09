---
name: mr7-ai performance audit (July 2026)
description: Durable lessons from the comprehensive performance/stability audit and fix session.
---

## SSE + Compression (CRITICAL)

**Rule:** Never apply `compression()` middleware globally on a server with SSE routes. Compression buffers output, which stalls real-time token delivery.

**Fix:** Gate the compression filter to skip when `req.headers['accept']` or `res.getHeader('content-type')` includes `text/event-stream`.

```typescript
filter: (req, res) => {
  const accept = req.headers['accept'] ?? '';
  const ct = res.getHeader('content-type') as string ?? '';
  if (accept.includes('text/event-stream') || ct.includes('text/event-stream')) return false;
  return compression.filter(req, res);
},
```

## Vite Manual Chunks — Do NOT group lazy-loaded modals

**Rule:** Do not force `components/modals/` into a single chunk in `manualChunks`. All modals are already `lazy()` in App.tsx, so Vite splits them correctly by dynamic import. Adding a `app-modals` rule collapses them into one huge 11MB chunk.

**Safe rules:** vendor splits (react, framer, three, radix, tanstack, lucide, wouter, xterm, monaco) and `app-3d` for Three.js components.

## OSINT Cache Pattern

LRU in-memory cache for email/IP/domain lookups added to `artifacts/api-server/src/routes/osint.ts`. 5-min TTL, 500-entry max, keyed by sha256(type:value). Cache MISS does the expensive external API chain; HIT returns immediately with `X-Cache: HIT` header.

## DB Pool Optimization

`pg` Pool config for this server: `max: 20, min: 2, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000, maxUses: 7500`. Prevents connection exhaustion under load.

## WebSocket Heartbeat (mux.ts)

Idle WS connections drop without a heartbeat. Added `setInterval(() => ws.ping(), 25_000)` with `clearInterval` on `close`/`error` events.

## LRU Cache in ai-tools.ts

Original cache used sort-based O(n log n) eviction. Fixed to proper O(1) Map insertion-order LRU: `delete(key); map.set(key, val)` on get; `delete(oldest key)` on overflow.

## SQL vs JS aggregation

SQL window function `SUM(col) OVER ()` is faster than JS `.reduce()` for aggregating across all rows in a single query. Used in organizations.ts usage endpoint.

## QueryClient defaults (TanStack Query)

Optimal defaults for this app: `staleTime: 60_000, gcTime: 300_000, retry: 1, refetchOnWindowFocus: false, refetchOnReconnect: 'always'`.
