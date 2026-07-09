---
name: mr7-ai cloud sync
description: How cloud chat history sync works — deviceId, PostgreSQL table, debounced push
---

## Architecture

- DB table: `cloud_chats (device_id PRIMARY KEY, chats_json JSONB, updated_at TIMESTAMP)`
- API: `GET /api/cloud-chats?deviceId=xxx` → `{chats, updatedAt}`, `POST /api/cloud-chats` → `{deviceId, chats}`
- Both routes are PUBLIC (registered before `internalAuth` in app.ts)

## Frontend

- `cloud-sync.ts` — `getDeviceId()`, `fetchCloudChats()`, `pushCloudChats()`, `schedulePush()` (3s debounce)
- `store.tsx` StoreProvider: on mount → load localStorage → fetch cloud (server wins) → set `hydratedRef.current = true`
- On every state change → `schedulePush(state.chats)` only if `hydratedRef.current = true` (avoids pushing before hydration)
- deviceId stored in `localStorage` key `mr7-device-id`

**Why:** User wanted chats synced to PostgreSQL. No auth required — uses a persistent deviceId per browser. Server-side data always wins on load (freshest version from any device).

**How to apply:** The sync is automatic — no UI needed. If auth is added later, replace deviceId with userId in the POST body.
