# Migrations

## Source of truth

At runtime, `artifacts/api-server/src/db.ts` calls `ensureAuthTables()` on startup,
which runs `CREATE TABLE IF NOT EXISTS` for every table the API server actually
queries (`users`, `sessions`, `subscriptions`, `conversations`, `messages`, etc.).
**That function is the live schema** the running app depends on — not the files
in this directory.

The Drizzle schema definitions under `lib/db/src/schema/` describe the same
tables for type-safe queries; keep both in sync when you change a column.

## SQL files in this directory

Numbered files (`001`–`004`, `009`) are applied via `./run.sh up`, tracked in a
`schema_migrations` table. They are **not** run automatically by the app —
apply them manually against `DATABASE_URL` if you need them.

- `001`–`004`: schema baseline, triggers, and column additions. Compatible
  with the tables `db.ts` creates.
- Numbers `005`–`008` were never added to this repo (intentional gap, not a
  missing/lost file).
- `009_ai_optimized_schema.sql`: adds `ai_conversations`, `ai_messages`,
  `ai_response_cache`, `ai_security_events`, `ai_performance_metrics`,
  `user_ai_preferences`. **Currently unused** — no application code reads or
  writes these tables yet. Treat it as a draft for a future analytics/caching
  layer; wire up real call sites before relying on it, and don't assume it's
  part of the active schema just because the file exists.

## Applying migrations

```sh
./migrations/run.sh up        # apply all pending
./migrations/run.sh status    # show what's applied
./migrations/run.sh down <version>   # rollback one migration
```
