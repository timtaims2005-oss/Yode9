---
name: Deep Search Integration
description: How /api/deep-search is wired end-to-end — API route, frontend modal, mobile screen
---

## Deep Search Route
- File: `artifacts/api-server/src/routes/deep-search.ts`
- Registered in `app.ts` after osintRouter with `osintLimiter` middleware
- Endpoint: `POST /api/deep-search` — accepts `{ query, type: "email"|"username"|"phone"|"fullname" }`
- Returns: `DeepSearchResult` with `breaches[]`, `socialProfiles[]`, `aiReport`, `riskScore`, `riskLevel`, `recommendations[]`
- Sources used: LeakCheck.io (needs API key for full results), GitHub API, crt.sh, RDAP, DNS

## Frontend Modal (DeepSearchModal.tsx)
- `runScan()` runs animation + real API call in parallel via `Promise.all` for best UX
- Real data stored in `realData: DeepSearchResult | null` state
- Breach records and social profiles: use real data when available, fall back to `BREACH_RECORDS`/`SOCIAL_PROFILES_DATA` constants
- Both arrays typed as `unknown[]` then cast to `any` inside `.map()` to handle differing shapes
- AI Report tab: shows `realData.aiReport` (pre-formatted Markdown string) when available; otherwise shows static mock summary

**Why:** The two data shapes (real API vs. mock constants) differ in fields like `.color`, `.tag`, `.details` — the `as any` pattern avoids TypeScript union conflicts while preserving fallback behavior.

## Mobile Scan Tab
- Screen: `artifacts/mobile/app/(tabs)/scan.tsx`
- Registered in `_layout.tsx` for both NativeTabLayout (NativeTabs.Trigger) and ClassicTabLayout (Tabs.Screen)
- Icon: `shield.lefthalf.filled` (iOS) / `crosshair` (Android)

## PentestLabProModal AI Streaming
- Already wired via `useArsenalStream` hook (line 281) — calls `POST /api/chat` with streaming
- No changes needed; AI tab auto-triggers when selected
