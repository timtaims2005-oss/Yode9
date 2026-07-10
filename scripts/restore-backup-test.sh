#!/usr/bin/env bash
# ============================================================
# Restore Drill — verifies the latest automated backup is
# actually restorable, against a throwaway test database
# (NEVER touches production).
#
# Usage (local):
#   TEST_DATABASE_URL=postgres://user:pass@localhost:5432/restore_drill \
#     ./scripts/restore-backup-test.sh
#
# Usage (CI / GitHub Actions "Backup Restore Drill" workflow,
# triggered manually via workflow_dispatch):
#   Provide DATABASE_URL (source, read-only pg_dump) and
#   TEST_DATABASE_URL (a disposable Postgres service container).
#
# Backup source resolution (first match wins):
#   1. $BACKUP_FILE            — explicit path to a .sql.gz dump
#   2. S3 (AWS_* + AWS_S3_BACKUP_BUCKET set)   — downloads latest db-backups/*.sql.gz
#   3. Cloudflare R2 (R2_* set)                — downloads latest db-backups/*.sql.gz
#   4. Fallback: fresh pg_dump of $DATABASE_URL, treated as "latest backup"
#      (keeps the drill runnable even when no cloud backend is configured yet)
# ============================================================
set -euo pipefail

WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

TEST_DATABASE_URL="${TEST_DATABASE_URL:-}"
if [ -z "$TEST_DATABASE_URL" ]; then
  echo "❌ TEST_DATABASE_URL is not set. Point it at a disposable test database — never production." >&2
  exit 1
fi

echo "── Step 1/4: Locate latest backup ──────────────────────────"
DUMP_FILE="$WORKDIR/latest-backup.sql.gz"

if [ -n "${BACKUP_FILE:-}" ]; then
  echo "Using explicit BACKUP_FILE=$BACKUP_FILE"
  cp "$BACKUP_FILE" "$DUMP_FILE"

elif [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_S3_BACKUP_BUCKET:-}" ]; then
  echo "Fetching latest backup from S3 bucket: $AWS_S3_BACKUP_BUCKET"
  LATEST_KEY=$(aws s3api list-objects-v2 \
    --bucket "$AWS_S3_BACKUP_BUCKET" --prefix "db-backups/" \
    --query 'sort_by(Contents,&LastModified)[-1].Key' --output text)
  aws s3 cp "s3://$AWS_S3_BACKUP_BUCKET/$LATEST_KEY" "$DUMP_FILE"

elif [ -n "${R2_ACCESS_KEY_ID:-}" ] && [ -n "${R2_BACKUP_BUCKET:-}" ] && [ -n "${R2_ENDPOINT:-}" ]; then
  echo "Fetching latest backup from Cloudflare R2 bucket: $R2_BACKUP_BUCKET"
  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
    LATEST_KEY=$(aws s3api list-objects-v2 --endpoint-url "$R2_ENDPOINT" \
      --bucket "$R2_BACKUP_BUCKET" --prefix "db-backups/" \
      --query 'sort_by(Contents,&LastModified)[-1].Key' --output text)
  AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
    aws s3 cp "s3://$R2_BACKUP_BUCKET/$LATEST_KEY" "$DUMP_FILE" --endpoint-url "$R2_ENDPOINT"

elif [ -n "${DATABASE_URL:-}" ]; then
  echo "⚠️  No BACKUP_FILE / S3 / R2 configured — falling back to a fresh pg_dump of DATABASE_URL as the 'latest backup'."
  pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip -9 > "$DUMP_FILE"

else
  echo "❌ No backup source available. Set BACKUP_FILE, S3/R2 credentials, or DATABASE_URL." >&2
  exit 1
fi

echo "Backup size: $(du -h "$DUMP_FILE" | cut -f1)"

echo "── Step 2/4: Restore into disposable test database ─────────"
echo "Target: $(echo "$TEST_DATABASE_URL" | sed -E 's#(://[^:]+:)[^@]+#\1***#')"
gunzip -c "$DUMP_FILE" | psql "$TEST_DATABASE_URL" --quiet --set ON_ERROR_STOP=1 \
  2> "$WORKDIR/restore-errors.log" || {
    echo "❌ Restore failed — see errors below:" >&2
    cat "$WORKDIR/restore-errors.log" >&2
    exit 1
  }

# psql --set ON_ERROR_STOP=1 stops on the first hard error but pg_dump output
# can still emit harmless NOTICEs to stderr; only fail on actual ERROR lines.
if grep -qi "^psql:.*ERROR" "$WORKDIR/restore-errors.log" 2>/dev/null; then
  echo "❌ Restore completed with errors:" >&2
  cat "$WORKDIR/restore-errors.log" >&2
  exit 1
fi
echo "✅ Restore completed without errors"

echo "── Step 3/4: Verify schema & data ───────────────────────────"
TABLE_COUNT=$(psql "$TEST_DATABASE_URL" -tAc \
  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';")
echo "Tables found: $TABLE_COUNT"

MIN_TABLES="${MIN_EXPECTED_TABLES:-10}"
if [ "$TABLE_COUNT" -lt "$MIN_TABLES" ]; then
  echo "❌ Only $TABLE_COUNT tables restored (expected at least $MIN_TABLES)." >&2
  exit 1
fi

USERS_EXISTS=$(psql "$TEST_DATABASE_URL" -tAc \
  "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users');")
if [ "$USERS_EXISTS" != "t" ]; then
  echo "❌ 'users' table not found after restore." >&2
  exit 1
fi

USER_COUNT=$(psql "$TEST_DATABASE_URL" -tAc "SELECT COUNT(*) FROM users;")
echo "Users rows: $USER_COUNT"

MIN_USERS="${MIN_EXPECTED_USERS:-1}"
if [ "$USER_COUNT" -lt "$MIN_USERS" ]; then
  echo "❌ users table has $USER_COUNT rows — expected at least $MIN_USERS. Backup may be stale or empty." >&2
  exit 1
fi

echo "── Step 4/4: Cleanup ────────────────────────────────────────"
# WORKDIR is removed by the trap; the test database itself is left to the
# caller to drop (CI tears down its own disposable Postgres service).
echo ""
echo "✅ RESTORE DRILL PASSED"
echo "   tables:       $TABLE_COUNT (>= $MIN_TABLES expected)"
echo "   users rows:   $USER_COUNT (>= $MIN_USERS expected)"
echo "   restore log:  clean, no errors"
