# Yode9 Monorepo

pnpm monorepo containing the mr7.ai web app, the pentest-lab platform, and the shared API server, plus supporting infrastructure (monitoring, backups, CI).

## Monitoring alerts → Telegram

Alertmanager forwards alerts to the API server, which relays them to a Telegram chat.

Endpoints (in `artifacts/api-server/src/routes/webhooks-alerts.ts`):
- `POST /api/webhooks/alerts` — generic receiver, splits alerts by `severity` label
- `POST /api/webhooks/alerts/critical` — sent to Telegram immediately
- `POST /api/webhooks/alerts/warning` — batched and flushed every 5 minutes (one message per batch instead of one per alert)

### Setup

1. Create a bot with [@BotFather](https://t.me/BotFather) on Telegram (`/newbot`) and copy the bot token.
2. Get the target chat ID (personal chat or group) by messaging the bot, then visiting `https://api.telegram.org/bot<TOKEN>/getUpdates` and reading `message.chat.id`.
3. Add two secrets to the project (Replit → Secrets, never commit these):
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_ALERT_CHAT_ID`
4. (Optional) Set `WEBHOOK_TOKEN` if you want the `/api/webhooks/alerts` generic endpoint to require the bearer token Alertmanager sends (see `infrastructure/monitoring/alertmanager/alertmanager.yml`).

Without the two Telegram secrets set, the endpoints still respond `200 OK` and log a warning — they never crash Alertmanager's delivery loop, they just drop the message until configured.

### Manual test

```bash
curl -X POST http://localhost:8080/api/webhooks/alerts/critical \
  -H "Content-Type: application/json" \
  -d '{"status":"firing","alerts":[{"status":"firing","labels":{"alertname":"APIDown","service":"mr7-api","severity":"critical"},"annotations":{"summary":"API is down"}}]}'
```

## Domain setup

See [`DOMAIN_SETUP.md`](./DOMAIN_SETUP.md) for connecting a custom domain (e.g. `mr7.ai`) to this project's deployment, including DNS records and optional Cloudflare CDN layering.

## Backup restore drill

See the "Restore drill" section in this README (below) — run it periodically to confirm your automated backups are actually restorable.

### Running the restore drill manually

```bash
./scripts/restore-backup-test.sh
```

This script:
1. Downloads/locates the latest backup produced by the `db-backup.yml` GitHub Actions workflow.
2. Spins up a temporary/test database (never touches production).
3. Restores the backup into it.
4. Verifies: table count matches expectations, `users` table has a plausible non-zero row count, and no errors were emitted during restore.
5. Tears down the temporary database and prints a pass/fail summary.

It can also be triggered manually from GitHub Actions: **Actions → Backup Restore Drill → Run workflow** (`workflow_dispatch`, not run automatically on push, since it takes longer than a normal CI job). Check the run's logs for the verification summary.
