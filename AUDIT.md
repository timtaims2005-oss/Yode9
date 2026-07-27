# Security & Feature Audit Log

---

## Setup & Isolation Pass (Current)

### Task 7 — Voice WebSocket routes ISOLATED (not removed)

Code for the live-voice pipeline is fully preserved but disconnected from the running server:

- **`artifacts/api-server/src/index.ts`**
  - `handleVoiceSocket` and `verifyVoiceToken` imports commented out (`[TASK-7 ISOLATED]`)
  - `voiceWss` WebSocket server and `voiceRateBuckets` map commented out
  - `/api/voice-live` upgrade handler preserved in a block comment
- **`artifacts/api-server/src/app.ts`**
  - `voiceTokenRouter` import and `app.use("/api", voiceTokenRouter)` commented out

Re-enable by removing the `[TASK-7 ISOLATED]` comment wrappers and the surrounding block comment.
Build confirmed clean after isolation: `pnpm run build` ✅

### Infrastructure fixes
- `pnpm install --recursive` run to restore all workspace `node_modules`
- Both `artifacts/api-server` and `artifacts/mr7-ai` workflows now RUNNING
- `GET /api/health` returns `{"status":"ok"}`

---

## Tasks implemented in this changeset (Tasks 4–7)

Tasks 1–3 (Guardrails, Version History, Extended Thinking) were already implemented
before this changeset and are not claimed here.

---

### Task 4 — Unified file attachment pipeline
- **Fixed**: `artifacts/api-server/src/lib/document-extract.ts` — broken `pdf-parse`
  import (`{ PDFParse }` → dynamic `import("pdf-parse")`) that prevented PDF extraction
- **New endpoint**: `POST /api/chat/extract` in `artifacts/api-server/src/routes/chat.ts`
  — accepts multipart file upload, returns `{ kind, text, truncated }` (50,000 char cap)
- **Frontend**: `artifacts/mr7-ai/src/components/ChatView.tsx` `handleFile()` — PDF /
  Word / Excel now POSTed to `/api/chat/extract` for proper server-side extraction;
  plain text files still read client-side via `file.text()`

### Task 5 — Web search resilience (Brave Search fallback)
- **File**: `artifacts/api-server/src/lib/ai/tool-orchestrator-v2.ts` `web_search` handler
- After all 10 SearXNG public instances fail, checks `BRAVE_SEARCH_API_KEY` env var and
  calls Brave Search API as fallback
- Logs which source was used (`source` field in return value); unified `{ results, source }`
  shape regardless of provider
- No behaviour change when `BRAVE_SEARCH_API_KEY` is not set (throws same error as before)

### Task 6 — Evals system
- **Scenarios**: `evals/scenarios.json` — 20 test scenarios across 7 categories:
  `chat`, `tool_call`, `tool_loop`, `artifact`, `guardrail`, `thinking`, `utility`
- **Runner**: `evals/run.ts` — buffered SSE parser (handles JSON spanning chunk
  boundaries), JSON endpoint support, per-category + overall summary, coloured output
- **Script**: `pnpm run evals` in root `package.json` — exits 0 if all pass, 1 on failure

### Task 7 — Live voice WebSocket
- **Server handler**: `artifacts/api-server/src/interfaces/ws/VoiceWebSocket.ts`
  — WebSocket at `/api/voice-live`; receives binary audio chunks, auto-flushes after
  600 ms of silence to OpenAI Whisper STT, streams LLM reply + sentence-chunked TTS
  audio back; max 10 MB audio buffer per flush
- **Token issuance**: `POST /api/voice-live/token` (`artifacts/api-server/src/routes/voice-token.ts`)
  — issues a short-lived (2-min TTL) HMAC-SHA256-signed token. Browsers cannot set custom
  headers on WebSocket connections, so auth uses a signed query parameter instead.
  Token issuer has its own IP-based rate limit (10/min).
- **Token library**: `artifacts/api-server/src/lib/voice-token.ts` — `issueVoiceToken()` /
  `verifyVoiceToken()` using `SESSION_SECRET`, `crypto.timingSafeEqual`, `randomBytes(8)` per-token id
- **Auth gate** (added after review): upgrade handler in `artifacts/api-server/src/index.ts`
  verifies the HMAC-signed `?token=` query param via `verifyVoiceToken()`. No connection
  metadata (remoteAddress, x-forwarded-for) is used as auth. Rejects with HTTP 401 on
  missing/invalid/expired token.
- **Rate limit** (added after review): per-token-id sliding-window bucket — max 5 voice
  upgrades per 60 s, keyed to the token's unique random id (not IP or key prefix)
- **Registered**: `artifacts/api-server/src/index.ts` — `voiceWss` WebSocket server +
  upgrade handler for `/api/voice-live`; in-process rate bucket map (`voiceRateBuckets`)
- **React hook**: `lib/integrations-openai-ai-react/src/audio/useWebSocketVoice.ts`
  — `useWebSocketVoice({ onUserTranscript, onAssistantText, onAudioChunk, onDone, onError })`
  hook using MediaRecorder → WS binary frames; exported from package index

## Security considerations
- Voice WebSocket requires either a valid `INTERNAL_API_KEY` token or a device-id; fully
  anonymous access is rejected
- Voice per-device rate limit prevents bulk abuse of the costly STT/LLM/TTS pipeline
- `document-extract.ts` caps extracted text at 50,000 characters to limit context-window
  stuffing attacks via large uploaded documents
- `BRAVE_SEARCH_API_KEY` is consumed only as a fallback; never logged or surfaced to clients
