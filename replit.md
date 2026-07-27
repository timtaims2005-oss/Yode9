# KaliGPT / mr7-ai

Advanced cybersecurity AI assistant platform with pentest tools, OSINT, threat intelligence, code execution, and real-time voice — designed for security professionals.

## Current Status

| Artifact | Workflow | Status |
|---|---|---|
| API Server | `artifacts/api-server: API Server` | ✅ RUNNING (port `$PORT`, default 8080) |
| Frontend (Web) | `artifacts/mr7-ai: web` | ✅ RUNNING |
| Mobile (Expo) | `artifacts/mobile: expo` | ✅ RUNNING |

**Required secrets** — add these in the Secrets panel:
- `DATABASE_URL` — PostgreSQL connection string (required for DB-backed features)
- `CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY` — authentication
- `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + `STRIPE_PRO_PRICE_ID` + `STRIPE_ENTERPRISE_PRICE_ID` — payments
- `OPENAI_API_KEY` or `GROQ_API_KEY` or `OPENROUTER_API_KEY` — AI inference (at least one)

**Optional secrets** (enable specific features):
- `RESEND_API_KEY` — transactional email (activation, invoices)
- `SENTRY_DSN` — error tracking (Sentry auto-initialises when set)
- `HIBP_API_KEY` — HaveIBeenPwned breach lookup
- `NVD_API_KEY` — faster NIST CVE API access (works without key at 5 req/30s)
- `IPINFO_API_KEY` — IP geolocation enrichment
- `SHODAN_API_KEY` — full Shodan host details (Shodan InternetDB is always free)
- `GREYNOISE_API_KEY`, `VT_API_KEY`, `CENSYS_API_ID/SECRET`, `BINARYEDGE_API_KEY` — premium threat intel feeds
- `CLOUDFLARE_ACCOUNT_ID` + `R2_BUCKET_NAME` + `R2_ACCESS_KEY_ID` + `R2_SECRET_ACCESS_KEY` — file storage (falls back to local disk)

---

## Run & Operate

```bash
pnpm install                                         # install all workspace deps
pnpm --filter @workspace/api-server run dev          # API server (port $PORT / 8080)
pnpm --filter @workspace/mr7-ai run dev              # Web frontend (Vite)
pnpm --filter @workspace/mobile run dev              # Expo mobile app
pnpm --filter @workspace/api-server exec tsc --noEmit # TypeScript check (must be 0 errors)
pnpm --filter @workspace/db run push                 # push DB schema (dev only)
```

---

## Architecture

```
artifacts/
  api-server/      Express 5 + TypeScript backend
    src/routes/    ~80 route files (chat, OSINT, Stripe, upload, agent…)
    src/lib/       AI engine, Redis cache, storage, email, guardrails…
    src/services/  Third-party OSINT service wrappers (Shodan, VT, GreyNoise…)
    src/integrations/ Telegram monitor, Paste monitor, Blockchain analyzer…

  mr7-ai/          React 19 + Vite frontend
    src/components/modals/   Deep tool modals (PentestLab, DarkWeb, DeepSearch…)
    src/components/osint/    OSINT panels (NetworkIntel, ThreatIntel, Blockchain…)
    src/lib/chat-client.ts   Streaming AI client with tool-calling support

  mobile/          Expo (React Native) companion app
    app/(tabs)/    Chat, OSINT Scan, System Status screens
    app/(auth)/    Clerk sign-in / sign-up

lib/
  db/              Drizzle ORM schema (users, conversations, subscriptions…)
  api-zod/         Shared Zod validation schemas
```

## Stack

- **Monorepo**: pnpm workspaces, Node.js 20, TypeScript 5.9
- **Backend**: Express 5, Drizzle ORM, PostgreSQL + pgvector, Redis/BullMQ
- **AI**: OpenAI, Anthropic, Groq, OpenRouter — with tool-calling & structured outputs
- **Auth**: Clerk (web + mobile)
- **Payments**: Stripe (webhooks → DB, PDF invoice, email delivery)
- **Storage**: Cloudflare R2 / S3 / local disk (auto-detected)
- **Observability**: Sentry (via `SENTRY_DSN`), OpenTelemetry, pino logger

## Key API Routes (selection)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Streaming AI chat with tool-calling |
| POST | `/api/deep-search` | OSINT profile (email/username/phone/name) |
| GET | `/api/osint/dns/:target` | DNS enumeration (free, no key) |
| GET | `/api/osint/whois/:domain` | RDAP WHOIS (free, no key) |
| GET | `/api/osint/cve` | NIST NVD CVE search (free, no key) |
| GET | `/api/osint/hibp/:email` | HaveIBeenPwned breach check |
| GET | `/api/osint/shodan/ip/:ip` | Shodan InternetDB (free, no key) |
| GET | `/api/osint/crtsh/:domain` | Certificate transparency |
| GET | `/api/osint/ipinfo/:ip` | IP geolocation + ASN |
| POST | `/api/threat-intel/enrich` | AI-structured node enrichment |
| POST | `/api/threat-intel/analyze-chain` | Chain analysis (structured JSON) |
| GET | `/api/osint-intel/ip/:ip` | Multi-source IP intel |
| GET | `/api/osint-intel/domain/:domain` | Multi-source domain intel |
| POST | `/api/stripe/webhook` | Stripe webhook → DB subscription update |
| POST | `/api/upload` | File upload → R2/S3/local |
| GET | `/api/health` | Health check |

## User Preferences

- Arabic-first UI for end-user-facing elements; backend code in English
- TypeScript must compile with 0 errors at all times
