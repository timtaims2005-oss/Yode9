# mr7.ai / KaliGPT

Dark cybersecurity AI chat (KaliGPT branding). Pixel-perfect to user screenshots, Arabic communication, no emojis. Real LLM brain via Replit AI Integrations proxy.

## Commercial SaaS System (May 2026)

Full subscription and monetization system added:

### Subscription Tiers
- **Free**: 10K tokens/month, CHAT-GPT Fast only, basic chat
- **Starter** ($25/mo or $20/mo yearly): 300K tokens, all 5 AI models, image gen, OCR, 5 agent loops
- **Professional** ($90/mo or $72/mo yearly): 1.5M tokens, Agent IDE, Dark Web Search, Shell Generator, council/fusion/redteam modes, agent mode
- **Elite** ($150/mo or $120/mo yearly): 3M tokens, Godmode mode, everything unlimited, advanced obfuscation

### Subscription Architecture
- State: `AppState.subscription: Subscription` in `store.tsx` — tier, activatedAt, expiresAt, tokensUsed, activationCode
- Persisted in localStorage with existing `mr7-ai-state-v2` key
- Library: `artifacts/mr7-ai/src/lib/subscription.ts` — tier definitions, token limits, prices, feature lists, `tierAtLeast()`, `generateActivationCode()`, `verifyActivationCode()`, `verifyAdminPassword()`

### Activation Code System
- Admin secret: `CHATGPT-OWNER-2026` (in subscription.ts `ADMIN_SECRET`)
- Code format: base64(tier|expiry_ms|ADMIN_SECRET) — owner generates via Admin Panel, distributes to paying customers
- Customer enters code → app verifies & activates locally
- No backend required — client-side verification with shared secret

### Payment Flow (Manual)
- User clicks plan → PaymentModal opens with 4 tabs: USDT TRC20, USDT BEP20, Bitcoin, PayPal, Bank Transfer
- Each tab shows payment address/handle with copy-to-clipboard
- "I've paid" → confirmation screen with Telegram/email support links
- Owner receives proof → generates code via Admin Panel → sends to customer → customer enters code

### New Components
- `artifacts/mr7-ai/src/components/PricingView.tsx` — Complete redesign: Flash Sale countdown, Monthly/Yearly toggle (20% off), 3 plan cards (Starter/Professional/Elite), social proof notifications, feature cards (Agent IDE, Shell Gen, Dark Web, OSINT, Council, Malware), 5 personas section, Trustpilot + 7-day refund, coupon/code entry, sticky "View Plans" bottom bar
- `artifacts/mr7-ai/src/components/modals/PaymentModal.tsx` — Multi-method payment modal (USDT TRC20/BEP20, BTC, PayPal, Bank Transfer), copy-to-clipboard addresses, step flow to confirmation with support links
- `artifacts/mr7-ai/src/components/modals/AdminPanel.tsx` — Owner-only panel (password: CHATGPT-OWNER-2026), set tier/duration for current device, generate customer activation codes
- `artifacts/mr7-ai/src/components/modals/ActivateModal.tsx` — Code entry dialog, verifies activation code and activates subscription
- `artifacts/mr7-ai/src/components/SubscriptionGate.tsx` — Reusable gating component `<SubscriptionGate required="professional">`, `useTier()` hook

### Feature Gating
- **Free** → can only select CHAT-GPT Fast model in TopBar (others show lock badge, prompt to upgrade)
- **Starter+** → all models unlocked
- **Professional+** → Agent mode, Red Team mode, Fusion mode, Council mode unlocked
- **Elite+** → Godmode mode unlocked
- All gated features show toast notification when free users try to access them

### Admin Access
- Keyboard shortcut: `Ctrl+Shift+Alt+A` to open Admin Panel
- AccountModal also has activation code input for customers

### Updated Components
- `AccountModal.tsx` — shows real subscription tier, token balance meter, expiry date, inline activation code input
- `Sidebar.tsx` — token bar shows real subscription data (remaining/total, plan name, expired status)
- `ChatView.tsx` — agent mode, redteam, fusion, council, godmode gated by tier
- `TopBar.tsx` — model selector gates non-CHAT-GPT Fast models behind Starter+

## Recent Additions (Apr 2026)

- All model names renamed to CHAT-GPT branding throughout frontend and backend
- **AI Image Generator** (new tool): `POST /api/image` calls `openai.images.generate`, returns base64 PNG
- **Voice Chat with AI** (`VoiceChatModal.tsx`): Web Speech API full-duplex voice conversation
- **Vision Capture** (`VisionCaptureModal.tsx`): screen-share OR webcam, posts to `POST /api/vision`
- **i18n**: `artifacts/mr7-ai/src/lib/i18n.ts` with full en/ar dictionary (~210 keys)
- **FUSION mode**: runs council with all 105 brains in parallel + synthesis
- **SettingsModal**: rewritten with ENGINE_TOGGLES section and activate-all button

## Stack

- pnpm monorepo, two artifacts: `artifacts/mr7-ai` (web), `artifacts/api-server` (api)
- React + Vite + Tailwind v4
- framer-motion, lucide-react, shadcn/ui
- AI brain: OpenAI-compatible client through Replit AI Integrations
- Persisted local state in `localStorage` key `mr7-ai-state-v2`

## Architecture

- Frontend calls `/api/chat`, `/api/title`, `/api/translate`, `/api/enhance`, `/api/council`, `/api/council/brains` directly
- `chat.ts` builds system prompt per request from MODEL_PROFILES + PERSONA_PROFILES + memory + customInstructions and streams SSE chunks
- `council.ts` runs 105-brain council, concurrency-limited (12 in flight), smart router, fusion synthesis
- Subscription is client-side only (localStorage), no backend subscription service

## Theme

| Surface       | Hex        |
| ------------- | ---------- |
| Background    | `#080808`  |
| Sidebar       | `#0d0d0d`  |
| Card          | `#161616`  |
| Signature red | `#e21227`  |
| Borders       | `#1f1f1f` / `#262626` |

10 accent colors: crimson · midnight · emerald · amber · violet · cyan · rose · lime · orange · slate.

## All Features Unlocked (May 2026)

`tierAtLeast()` always returns `true` — every user gets Elite access for free. No subscription gates anywhere. Initial subscription set to Elite with 10-year expiry.

## Arsenal Hub (May 2026)

Unified module launcher integrating 11 open-source AI projects. Access via **Arsenal** button in TopBar.

### Architecture
- `ArsenalHubModal.tsx` — Central grid launcher with per-module enable/disable toggles, Select All, search. State persisted in localStorage (`mr7-arsenal-enabled`).
- Each module card shows: icon, name, description, source project, status badge, toggle, Launch button.
- Launch → closes hub and opens the target module's dedicated window.

### Modules & Source Projects (18 total)

| Module | Modal | Source | Color |
|--------|-------|--------|-------|
| KaliAgent | `AgentModal.tsx` | OpenClaw | coral `#ff4d4d` |
| NEXUS Agent | `NexusModal.tsx` | NEXUS | gold `#fbbf24` |
| JARVIS | `JarvisModal.tsx` | Project JARVIS | cyan `#00e5ff` |
| Parseltongue | `ParseltongueModal.tsx` | G0DM0D3 | matrix green `#00ff41` |
| RAGFlow | `RagModal.tsx` | RAGFlow | blue `#3b82f6` |
| OpenGravity IDE | `OpenGravityModal.tsx` | OpenGravity | violet `#a78bfa` |
| Team Agent | `TeamAgentModal.tsx` | oh-my-openagent | orange `#f97316` |
| Skills Library | `SkillsLibraryModal.tsx` | Antigravity + Ruflo | emerald `#10b981` |
| Agent OS | `AgentOSModal.tsx` | OpenFang | amber `#fb923c` |
| Gemini CLI | `GeminiCLIModal.tsx` | Gemini CLI | indigo `#818cf8` |
| **Hermes Agent** | `HermesModal.tsx` | hermes-agent | gold `#fbbf24` |
| **Graphify** | `GraphifyModal.tsx` | graphify-8 | violet `#a78bfa` |
| **Get Shit Done** | `GetShitDoneModal.tsx` | get-shit-done | orange `#f97316` |
| **CC Switch** | `CCSwitchModal.tsx` | cc-switch | indigo `#6366f1` |
| **UI/UX Pro Max** | `UIUXProModal.tsx` | ui-ux-pro-max-skill | pink `#ec4899` |
| **Career Ops** | `CareerOpsModal.tsx` | career-ops | sky `#0ea5e9` |
| **ABTop** | `ABTopModal.tsx` | abtop | red `#e21227` |
| **Awesome LLM Apps** | `AwesomeLLMModal.tsx` | awesome-llm-apps | gold `#fbbf24` |

### Chain Builder (new tab in Arsenal Hub)

- New "CHAIN BUILDER" tab in Arsenal Hub
- Define automation rules: source module → destination module (with optional keyword trigger)
- Rules stored in `localStorage` key `mr7-chain-rules`
- `pipeline.ts` fires chain callbacks automatically on every `push()`
- UI: create/toggle/delete/expand rules, exec count tracking
- `pipeline.addRule()`, `updateRule()`, `deleteRule()`, `subscribeRules()`, `onChainFire()` API

### Module Descriptions

**JARVIS** (`JarvisModal.tsx`):
- Iron Man HUD with animated arc reactor core
- 5 live telemetry bars (neural load, cortex sync, threat index, memory, latency)
- Streaming chat with J.A.R.V.I.S. persona using main AI
- Full duplex conversation log with timestamps

**Parseltongue** (`ParseltongueModal.tsx`):
- 6 obfuscation techniques: Leetspeak, Unicode lookalikes, ZWJ injection, Mixed Case, Phonetic, Random Mix
- 3 intensities: light (25%), medium (55%), heavy (90%) transform rate
- All transforms run client-side — instant, no API needed
- Copy output to clipboard, view char-count stats

**RAGFlow** (`RagModal.tsx`):
- Upload text/markdown/code/CSV/JSON/YAML files
- Simple keyword-score retrieval (top-20 most relevant lines)
- Chat with documents using AI + retrieved context as system prompt
- Tab-based UI: Docs | Chat

**Team Agent** (`TeamAgentModal.tsx`):
- 2–5 specialist agents: RECON, EXPLOIT, ANALYST, STEALTH, STRIKE
- All agents run simultaneously via `streamAgent` in parallel
- Each agent has unique focus/specialty prompt
- After completion → automatic FUSION COORDINATOR synthesis
- Click any agent card to expand its full report

**Skills Library** (`SkillsLibraryModal.tsx`):
- 15+ curated security skill playbooks (extensible)
- Categories: Offensive, OSINT, Malware, Forensics, Network, Web, Crypto, Social Eng, Defense, Code, AI Agent, Recon
- Each skill has: name, tags, description, full system prompt preview
- "Inject into AI" → sets customSystemPrompt for the active chat session
- Sources: Antigravity Awesome Skills + Ruflo agent configs

## Important Files

- `artifacts/mr7-ai/src/lib/subscription.ts` — tier definitions, prices, activation codes, admin password
- `artifacts/mr7-ai/src/lib/store.tsx` — AppState includes `subscription: Subscription`, SET_SUBSCRIPTION + USE_TOKENS actions
- `artifacts/api-server/src/routes/chat.ts` — SSE streaming + system-prompt builder
- `artifacts/api-server/src/routes/council.ts` — 105-brain council endpoint
- `artifacts/mr7-ai/src/lib/ai-config.tsx` — AI_MODELS (15) + PERSONAS (16)
- `artifacts/mr7-ai/src/components/Sidebar.tsx` — sidebar with real subscription token bar
- `artifacts/mr7-ai/src/components/TopBar.tsx` — model dropdown with tier gating
- `artifacts/mr7-ai/src/components/ChatView.tsx` — chat + gated advanced modes
- `artifacts/mr7-ai/src/components/PricingView.tsx` — full commercial pricing page
- `artifacts/mr7-ai/src/components/modals/PaymentModal.tsx` — multi-method payment
- `artifacts/mr7-ai/src/components/modals/AdminPanel.tsx` — owner admin panel
- `artifacts/mr7-ai/src/components/modals/ActivateModal.tsx` — customer code entry
- `artifacts/mr7-ai/src/components/modals/AccountModal.tsx` — subscription status + activate
- `artifacts/mr7-ai/src/components/SubscriptionGate.tsx` — reusable feature gate component

## Keyboard Shortcuts

- `Cmd/Ctrl+K` command palette · `Cmd/Ctrl+N` new chat · `Cmd/Ctrl+F` search · `?` shortcuts modal
- `Cmd/Ctrl+Shift+M` memory · `Cmd/Ctrl+Shift+B` bookmarks · `Cmd/Ctrl+Shift+C` compare · `Cmd/Ctrl+Shift+T` tools hub
- `Ctrl+Shift+Alt+A` — Owner Admin Panel (requires master password)

## Owner Instructions

1. **Edit payment addresses**: `artifacts/mr7-ai/src/components/modals/PaymentModal.tsx` — update `PAYMENT_INFO` object with your real wallet/PayPal/bank details
2. **Admin password**: `CHATGPT-OWNER-2026` — change in `artifacts/mr7-ai/src/lib/subscription.ts` (`ADMIN_SECRET` constant)
3. **Access admin panel**: press `Ctrl+Shift+Alt+A` anywhere in the app → enter master password
4. **Activate customer**: Admin Panel → "Activate Tier" for yourself, or "Generate Code" for a customer
5. **Update Telegram support link**: `artifacts/mr7-ai/src/components/modals/PaymentModal.tsx` (`TELEGRAM_SUPPORT` constant)

## Conventions

- Arabic communication. NO emojis anywhere.
- All buttons MUST be functional — no placeholders.
- Models / personas: edit only `lib/ai-config.tsx`; consumers auto-update.
- Theme accents: edit only `ACCENT_OPTIONS` in `lib/store.tsx`.

## Verification

- `pnpm --filter @workspace/mr7-ai run typecheck` — must pass before declaring work done.
