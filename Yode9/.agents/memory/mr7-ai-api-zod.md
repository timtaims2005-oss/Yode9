---
name: mr7-ai api-zod pre-existing TypeCheck error
description: health.ts TypeCheck fails due to api-zod dist not built; pre-existing, doesn't affect runtime
---

## Rule
The error `src/routes/health.ts: Output file '/home/runner/workspace/lib/api-zod/dist/index.d.ts' has not been built` is pre-existing and does NOT block the API server from running (esbuild builds and runs fine). Only tsc type-checking fails on this file.

**Why:** `@workspace/api-zod` has no `build` script and its dist is not generated. This was present before any recent changes.

**How to apply:** When running `pnpm --filter @workspace/api-server run typecheck`, one error about health.ts is expected and acceptable. Focus on ensuring no *new* errors appear in other route files.
