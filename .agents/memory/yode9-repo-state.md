---
name: Yode9 repo state
description: Branch topology and merge decisions for github.com/timtaims2005-oss/Yode9; check before assuming any branch is authoritative.
---

The repo has/had 4 branches with **unrelated git histories** (not just diverged — `git merge-base` returns nothing between most pairs): `main`, `feature/production-hardening-v2`, `feature/ultron-integration`, `timtaims2005-oss-patch-12sjsj`. Each is a separate snapshot re-import of the same underlying app at different points, not a normal feature branch.

`main` on its own was a near-empty pnpm scaffold (2 route files). The real app (125 route files) lived on `timtaims2005-oss-patch-12sjsj`. `feature/production-hardening-v2` had 13 additional route files not present in the patch branch (ab-tests, ai-tools, blog, browser, custom-gpts, darkweb-intelligence, execute, invoices, orchestrator, osint-intel, referrals, scheduled, tts), plus their supporting `services/`, `integrations/`, `types/`, `utils/` files.

**Merge approach used:** file-level copy (`git checkout <branch> -- <paths>`), not `git merge` — a real merge is not possible across unrelated histories without `--allow-unrelated-histories` and heavy conflict resolution. Took patch-12sjsj as the base for `artifacts/api-server` + `lib/`, then layered in the 13 extra route files (and their deps) from production-hardening-v2. Wired new routers into `routes/index.ts` manually.

**Why:** user explicitly asked to consolidate all branch work into `main` for continued OpenAPI documentation; a full deep merge of unrelated histories was not worth the risk/effort when the files are additive by name.

**Gotcha:** `git push` / `gitPush({})` fails with `NO_CREDENTIALS` — GitHub account is not connected to this Replit project's git identity. This has recurred across sessions. Work must be committed locally and the user must connect GitHub (Git pane → connect account) before any push can succeed. Don't assume a previous session's push succeeded just because commits exist locally.

**Gotcha:** `lib/api-spec/openapi.yaml` had only the scaffold's single `/healthz` path on every branch — a previously-claimed "297 documented paths" version was never committed anywhere retrievable (it lived only in a session's `/tmp` and was lost). Don't trust stale memory claims about documentation completeness without checking the actual file.
