---
name: mr7-ai deployment and workflow quirks
description: How production build/serve works for mr7-ai monorepo, and shadow workflow behavior after complete_project_import
---

## Production deployment (autoscale)

- Frontend (`artifacts/mr7-ai`) uses `vite preview` (`pnpm run serve`) in production, NOT `vite dev`.
- `vite.config.ts` `server.proxy` (dev) is a SEPARATE config block from `preview.proxy` (production `vite preview`). The `/api` → `localhost:8080` proxy must be duplicated into `preview.proxy` or the deployed frontend cannot reach the API server at all.
- API server (`artifacts/api-server`) has no `dist/` until built; its `dev` script runs build+start together, but `start` alone fails with MODULE_NOT_FOUND if `dist/index.mjs` doesn't exist yet.
- Since autoscale takes one run command, both processes are started via a single `bash -c "... & ..."` command in the deploy config.

**Why:** the app is a two-process monorepo (separate frontend + API artifacts) with no single unified server, so both the workflow config and the deploy config need explicit multi-process wiring that isn't automatic.

## Shadow workflows after complete_project_import

Calling `complete_project_import` can register artifacts (web/api/design kind) and auto-create NEW workflows named like `artifacts/<dir>: <label>` that shadow/duplicate the existing `.replit`-defined named workflows (e.g. "Start application", "API Server"), sometimes on different ports and causing port conflicts / stale 400s.

**How to apply:** after `complete_project_import`, re-check workflow list and restart the *original* `.replit`-named workflows (source of truth is the `.replit` file itself, which is not auto-edited) rather than the new shadow ones. Kill stray processes holding the target port if a restart fails with "failing tasks".
