---
name: Voice STT Groq
description: VoiceWebSocket.ts uses Groq Whisper for STT; TTS is intentionally disabled
---

## Rule
`VoiceWebSocket.ts` uses the `openai` npm SDK pointed at `https://api.groq.com/openai/v1` (via `baseURL` override) with `GROQ_API_KEY`. STT model: `whisper-large-v3`. LLM: `llama-3.1-8b-instant`.

TTS is intentionally disabled — Groq does not offer a TTS API. The browser should use `window.speechSynthesis` (Web Speech API) for voice output. A provider decision is needed before enabling server-side TTS.

**Why:** Original code used OpenAI Whisper + TTS-1. Replaced with Groq to avoid requiring OPENAI_API_KEY. Groq's Whisper endpoint is OpenAI-compatible.

**How to apply:** If Groq adds TTS, add it here. Otherwise use ElevenLabs, Azure TTS, or Google TTS as the server-side TTS provider.

## Confirmed working
Groq Whisper API tested: `POST https://api.groq.com/openai/v1/audio/transcriptions` with `whisper-large-v3` model. Returns "." for a pure sine-wave tone (correct — no speech content).
