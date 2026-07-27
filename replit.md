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

## OMNI-HACK — AI Pentest Platform (18 Phases)

All 18 pentest phases live under `artifacts/api-server/src/services/pentest/` and are registered in `index.ts` as `PENTEST_TOOL_REGISTRY`. Each service exports a class with a standard interface.

**API Routes** — all mounted at `/api/pentest-omni`:

| Endpoint | Phase | Tool |
|----------|-------|------|
| `GET /api/pentest-omni` | — | List all tools |
| `POST /api/pentest-omni/discover` | 1 | Network scan (nmap / TCP probe) |
| `POST /api/pentest-omni/osint` | 2 | DNS, WHOIS, subdomains, Shodan |
| `POST /api/pentest-omni/sqli` | 3 | SQL injection detection |
| `POST /api/pentest-omni/xss` | 4 | XSS scanning |
| `POST /api/pentest-omni/jwt` | 5 | JWT attack (none-alg, weak-secret, KID, alg-confusion) |
| `POST /api/pentest-omni/bruteforce` | 6 | SSH/FTP/HTTP brute-force |
| `POST /api/pentest-omni/hash` | 7 | Hash cracking (MD5/SHA/NTLM) |
| `POST /api/pentest-omni/exploit` | 8 | CVE lookup (NVD, CIRCL, ExploitDB) |
| `POST /api/pentest-omni/reverse-shell` | 9 | Payload generator (bash/python/php/nc/…) |
| `POST /api/pentest-omni/post-exploit` | 10 | Linux/Windows/macOS post-exploitation guide |
| `POST /api/pentest-omni/c2/start` | 11 | C2 server management |
| `POST /api/pentest-omni/fuzz` | 12 | Web directory/param fuzzer |
| `POST /api/pentest-omni/wireless` | 13 | Wireless attack command generation |
| `POST /api/pentest-omni/cloud` | 14 | AWS/Azure/GCP bucket & IAM enumeration |
| `POST /api/pentest-omni/tls` | 15 | TLS/certificate analysis |
| `POST /api/pentest-omni/mobile` | 16 | APK/IPA static analysis |
| `POST /api/pentest-omni/iot` | 17 | MQTT/CoAP/firmware testing |
| `POST /api/pentest-omni/ai` | 18 | Prompt injection & jailbreak testing |

Generic executor: `POST /api/pentest-omni/execute` `{ "tool": "<name>", "params": {...} }`

**AI Function Calling**: `getPentestFunctionDefinitions()` from `services/pentest/index.ts` returns OpenAI-compatible function definitions for all 18 tools. Inject into chat routes to enable the AI to call pentest tools autonomously.

Risk levels: `info | low | medium | high | critical` — critical tools require `requiresConfirmation: true`.

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

## Sovereign Agentic OS — Core Architecture

All agentic components live under `artifacts/api-server/src/core/` and the gateway at `artifacts/api-server/src/gateway/agentic-stream.ts`.

### Agentic Control Plane (`src/core/agentic/`)
| File | Class | Role |
|---|---|---|
| `swarm-orchestrator.ts` | `SwarmOrchestrator` | 4-persona swarm (Recon, Exploitation, Validator, Reporter) sharing a global ContextBus; runs plugins in DAG waves |
| `jetool-orchestrator.ts` | `JetoolOrchestrator` | Strict JSON Schema validation on I/O, dynamic parameter synthesis, pipeline artifact passing |
| `dag-workflow.ts` | `DagWorkflowEngine` | Dependency-aware DAG runner; topological sort with cycle detection |
| `context-bus.ts` | `ContextBus` | In-memory typed pub/sub bus shared across all personas and plugins |
| `safety.ts` | — | Forbidden-action allow/deny gate; blocks all active operations |

### Plugin Ecosystem (`src/core/plugins/`)
| Plugin | Capability |
|---|---|
| `HeroOrchestratorPlugin` | Builds decision graphs, allocates 4 agent personas, scores synthesis confidence |
| `OmniAuditPlugin` | OWASP Top 10 2021 attack-surface analysis across 5 surfaces with CVSS + CWE mapping |
| `JWTSecurityPlugin` | Algorithm risk analysis, 5 forge vectors (alg:none, RS→HS confusion, KID injection…), claim gap audit |
| `NetworkScannerPlugin` | 10 critical service profiles, 4 subnet zone assessments, topology risk vectors |
| `MonstakFuzzingPlugin` | 6 payload mutation strategies, 4 stress scenarios, stateful fuzzing state machine |

### Reasoning Engine (`src/core/reasoning/`)
| File | Class | Role |
|---|---|---|
| `react-planner.ts` | `ReActPlanner` | Multi-phase intent-aware planning; generates domain-specific step sequences; `mutateForRetry()` for self-healing |
| `reflection-loop.ts` | `ReflectionLoop` | Self-healing execution: up to 3 retry attempts, auto-mutates parameters on error or low confidence |

### High-Throughput Gateway (`src/gateway/agentic-stream.ts`)
- **POST `/api/v1/agentic/stream`** — start a job, returns `jobId`
- **GET `/api/v1/agentic/stream?jobId=...&stream=true`** — SSE telemetry stream
- **WebSocket** via `handleAgenticSocket()` — same job channel, WS protocol
- Each SSE/WS event carries: `node` (graph node to highlight), `level`, `source`, `message`, `latency`, `tokens`, `confidence` — consumed directly by the CognitiveControlCenter UI

### Cognitive Control Center UI (`src/components/cognitive_ui/`)
- `CognitiveControlCenter.tsx` — Interactive Thought Graph, Jetool Control Matrix (plugin toggles + autonomy mode + JSON schema editor), Cyber Telemetry Terminal
- Connects to `/api/v1/agentic/stream` via SSE with simulation fallback

## User Preferences

- Arabic-first UI for end-user-facing elements; backend code in English
- TypeScript must compile with 0 errors at all times (`npx tsc --noEmit` from `artifacts/api-server/`)
- Before running `tsc --noEmit` on api-server, build lib packages: `npx tsc --project tsconfig.json` in `lib/db/`, `lib/api-zod/`, and `lib/integrations-openai-ai-server/`
