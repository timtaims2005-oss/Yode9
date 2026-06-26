---
name: mr7-ai QR sync feature
description: QR code / share-link cross-device chat sync added to the app
---

## Architecture
- **Push**: `POST /api/cloud-chats?deviceId=<id>` saves chats JSON to PostgreSQL `cloud_chats` table
- **Pull**: `GET /api/cloud-chats?deviceId=<id>` reads them back
- **Share URL**: `/?sync=<deviceId>` — on app load, `useQRSyncImport()` hook detects this param, fetches the remote device's chats, and dispatches `IMPORT_CHATS`
- **QR code**: rendered via `https://api.qrserver.com/v1/create-qr-code/` image service (no npm package needed)
- **Modal**: `QRSyncModal.tsx` in `artifacts/mr7-ai/src/components/modals/`
- **Store action**: `IMPORT_CHATS` — merges new chats at the front without duplicating existing IDs
- **Entry point**: QrCode icon button in Sidebar bottom bar (next to the dots menu)

**Why:** User wanted cross-device sync without login. The localtunnel device ID approach means zero backend auth while still being functional.

**How to apply:** deviceId is stored in `localStorage("mr7-device-id")`. The hook `useQRSyncImport()` is called at the top of `AppContent` in App.tsx.
