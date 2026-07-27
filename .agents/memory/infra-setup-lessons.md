---
name: Infrastructure Setup Lessons
description: Key lessons from setting up the mr7-ai monorepo — Clerk, R3F types, TypeScript fixes, workflow startup
---

# Infrastructure Setup Lessons

## Clerk Middleware — guard with CLERK_SECRET_KEY check
The API server (`artifacts/api-server/src/app.ts`) must wrap `clerkMiddleware()` in a `if (process.env.CLERK_SECRET_KEY)` guard. Without it the server crashes with "Missing Clerk Secret Key" on every request, even in development.

**Why:** `@clerk/express` v2 throws synchronously inside the middleware on every request when no key is set.

**How to apply:** Always gate Clerk middleware on the env var; emit a WARN log when skipped.

## R3F JSX types — ambient `declare module` shadows React
In `r3f-primitives.d.ts`:
- File MUST have `export {}` at the end (making it a module, not a global file)
- Without `export {}`, `declare module 'react' {...}` inside the file creates an AMBIENT MODULE DECLARATION that *replaces* the real React module, breaking all React imports (useState, useEffect etc. disappear)
- With `export {}`, the same syntax becomes a proper module augmentation that merges with React types

**Why:** TypeScript distinguishes script files (no import/export) from module files (has import/export). In script files, `declare module 'X'` creates a new ambient module; in module files it augments an existing one.

## SpeechRecognition global types
Multiple lib files (OmnixAbsolute.ts, OmnixAbsoluteUnified.ts, OmnixVoiceGesture.ts) use `SpeechRecognition` directly. Place declarations in `artifacts/mr7-ai/src/speech-recognition.d.ts` as a pure AMBIENT file (no export) so the types are available globally without imports.

## API server build pattern
The API server uses esbuild (`node ./build.mjs`) — not tsc. Build is always required before `pnpm start`. TypeScript errors in source files do NOT prevent the esbuild bundle from succeeding.

## @react-three/fiber JSX elements in React 19
R3F v9.6.1's own `three-types.d.ts` augments `react`, `react/jsx-runtime`, and `react/jsx-dev-runtime` with `ThreeElements`. This augmentation failed to apply (possibly due to `ThreeToJSXElements<ThreeExports>` type resolution). Workaround: declare the primitives explicitly in `r3f-primitives.d.ts` (module file with `export {}`).
