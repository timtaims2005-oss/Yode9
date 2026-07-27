---
name: Clerk Auth setup for mr7-ai
description: Replit-managed Clerk provisioned; app.ts wiring details; dev key warning is normal.
---

# Clerk Auth — mr7-ai

**Status:** Replit-managed Clerk provisioned (`setupClerkWhitelabelAuth()` called, `appId: app_3GekSxRISuUSzescMS9E3vgqjzM`).

**Secrets set automatically:** `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`.

**Frontend (`artifacts/mr7-ai/src/main.tsx`):** Already correctly wired — `publishableKeyFromHost`, `clerkProxyUrl`, `ClerkProvider` with dark-red theme, Arabic localization, `/sign-in/*?` and `/sign-up/*?` routes.

**Backend (`artifacts/api-server/src/app.ts`):** `@clerk/express` and `@clerk/shared` installed. Wired:
1. `app.use(CLERK_PROXY_PATH, clerkProxyMiddleware())` — before body parsers
2. `app.use(clerkMiddleware(...))` — after body parsers, using `publishableKeyFromHost` + `getClerkProxyHost`

**Why:** Clerk proxy must stream raw bytes before `express.json()` buffers the body.

**Dev key warning** ("Clerk has been loaded with development keys") is expected and normal — do NOT treat as an error. Replit auto-swaps to live keys on publish.

**NOT configured (optional):** `REDIS_URL` (session falls back to PostgreSQL — fine), `ADMIN_SECRET`, `INTERNAL_API_KEY`, `ALLOWED_ORIGINS`.
