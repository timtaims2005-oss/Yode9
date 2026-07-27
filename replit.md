# KaliGPT / MR7 AI — Defensive Intelligence Platform

## Project Overview

Full-stack AI-powered cybersecurity and penetration testing platform (KaliGPT v6.0). pnpm monorepo with 4 artifacts.

### Architecture
- **Frontend** (`artifacts/mr7-ai/`): React 19 + Vite + Tailwind CSS + Three.js, preview path `/`
- **API Server** (`artifacts/api-server/`): Node.js Express 5 + TypeScript + Drizzle ORM, port 8080, path `/api`
- **Mobile** (`artifacts/mobile/`): Expo (React Native), preview path `/mobile/`
- **Canvas** (`artifacts/mockup-sandbox/`): Vite mockup sandbox, preview path `/__mockup`

### Key Features
- Agentic stream gateway: `POST /api/v1/agentic/stream` (SwarmOrchestrator + JetoolOrchestrator)
- 5 Plugins: HeroOrchestrator, OmniAudit, JWTSecurity, NetworkScanner, MonstakFuzzing
- Cognitive Control Center UI with Thought Graph + live Telemetry
- 18-phase OMNI-HACK pentest platform
- OSINT / Deep Search / Threat Intelligence routes
- ReAct Planner + ReflectionLoop (self-healing, up to 3 retries)
- Local AI engine support (Ollama / Llamafile / llama.cpp / KoboldCPP / Nitro / LocalAI)

### Shared Libraries (`lib/`)
- `lib/db/` — Drizzle ORM schema + PostgreSQL
- `lib/api-zod/` — shared Zod validation
- `lib/api-client-react/` — React Query hooks
- `lib/ai-providers.ts` — multi-provider AI with circuit breaker

## Running the Project

### Workflows (start from Replit UI)
- **`artifacts/api-server: API Server`** — builds and starts the Express API on port 8080
- **`artifacts/mr7-ai: web`** — starts Vite dev server on port 22938

### Environment Variables (already configured)
| Variable | Value | Purpose |
|---|---|---|
| `DATABASE_URL` | runtime-managed | Replit PostgreSQL |
| `NODE_ENV` | `development` | dev mode |
| `LOCAL_AUTH_BYPASS` | `true` | skip Clerk auth for local testing |
| `LOCAL_MOCK_PROVIDER` | `false` | use the configured live AI provider |
| `AUTO_LAUNCH_OLLAMA` | `false` | don't auto-launch Ollama binary |
| `OLLAMA_HOST` | ngrok URL | remote Ollama via ngrok |
| `VITE_OLLAMA_BASE_URL` | ngrok URL | frontend Ollama endpoint |
| `CUSTOM_API_BASE_URL` | ngrok `/v1` URL | server-side OpenAI-compatible custom provider |
| `CUSTOM_API_MODEL` | `llama3.2` | default custom-provider model |

The `CUSTOM_API_KEY` Replit Secret authenticates the custom Ollama provider. It is intentionally kept server-side; the browser only sends the ngrok warning-bypass header. The provider test endpoint is `POST /api/providers/custom/test`.

### Optional Secrets (add to enable other live AI / auth)
- `GROQ_API_KEY` — Groq AI inference (llama-3.1-8b, llama-3.3-70b, mixtral)
- `CLERK_SECRET_KEY` + `CLERK_PUBLISHABLE_KEY` — full auth
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENROUTER_API_KEY` — other AI providers
- `STRIPE_SECRET_KEY` — payments
- `REDIS_URL` — BullMQ queues (falls back to in-memory without it)

## Development Notes
- Drizzle migrations: `lib/db/src/schema/` (new tables go here, not `artifacts/api-server/src/db.ts`)
- API server build: `pnpm --filter @workspace/api-server run build` (~2–3s, esbuild)
- TypeScript check: `pnpm run typecheck`
- The custom Ollama/ngrok bridge currently returns HTTP 500 for upstream streaming requests. The server automatically retries custom-provider and local-proxy completions non-streaming and emits the result through the app's SSE contract.

## User Preferences
- Prefer Groq for AI inference when a live key is available
- Use local/bypass auth in development
- Keep AUTO_LAUNCH_OLLAMA=false (Ollama served via ngrok externally)
