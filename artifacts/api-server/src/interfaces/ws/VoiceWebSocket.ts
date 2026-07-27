/**
 * Task 7 — Live Voice WebSocket (Groq backend)
 * ══════════════════════════════════════════════════════════════════════════════
 * Endpoint: ws://…/api/voice-live
 *
 * Protocol:
 *   Browser → Server  (binary frames)   Raw audio chunks (PCM/webm/wav/mp3)
 *   Server  → Browser (text JSON frames):
 *     { type: "user_transcript", text: string }  — partial STT result
 *     { type: "assistant_text",  text: string }  — model reply chunk
 *     { type: "done" }                           — exchange complete
 *     { type: "error",           message: string }
 *
 * NOTE: TTS is intentionally disabled — Groq does not currently offer a
 * text-to-speech API. The recommended approach is to use the Web Speech API
 * (speechSynthesis) on the browser side. A provider decision is needed before
 * enabling server-side TTS.
 *
 * Flow:
 *   1. Browser streams audio chunks as binary WebSocket frames.
 *   2. After 600ms of silence (no new chunks), server flushes buffered audio
 *      to Groq Whisper (whisper-large-v3) for transcription.
 *   3. If transcript is non-empty, server streams a chat completion via Groq
 *      (llama-3.1-8b-instant), forwarding text chunks to the browser as
 *      { type: "assistant_text" }.
 *   4. When the text stream finishes, { type: "done" } is sent.
 *
 * Latency target: < 2 s from end of user speech to start of AI text.
 */

import type { WebSocket } from "ws";
import OpenAI from "openai";
import { logger } from "../../lib/logger.js";

const SILENCE_THRESHOLD_MS = 600;   // ms of no new audio → flush to STT
const MAX_AUDIO_BUFFER_BYTES = 10 * 1024 * 1024; // 10 MB safety cap

// ── Groq client (lazy, reuses openai SDK with Groq base URL) ─────────────────
let _groq: OpenAI | null = null;
function getGroq(): OpenAI {
  if (_groq) return _groq;
  const apiKey = process.env["GROQ_API_KEY"] ?? "";
  if (!apiKey) throw new Error("GROQ_API_KEY not set — voice WebSocket unavailable");
  _groq = new OpenAI({
    apiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });
  return _groq;
}

// ── Send helpers ──────────────────────────────────────────────────────────────
function send(ws: WebSocket, payload: Record<string, unknown>): void {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(payload));
}

function sendError(ws: WebSocket, message: string): void {
  send(ws, { type: "error", message });
}

// ── STT: transcribe a Buffer via Groq Whisper ─────────────────────────────────
// Groq's transcription endpoint is OpenAI-compatible:
//   POST https://api.groq.com/openai/v1/audio/transcriptions
//   model: whisper-large-v3
//   Accepted formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
async function transcribeBuffer(buf: Buffer): Promise<string> {
  const groq = getGroq();
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const file = new File([ab], "audio.webm", { type: "audio/webm" });
  const result = await groq.audio.transcriptions.create({
    file,
    model: "whisper-large-v3",
    response_format: "text",
  });
  return typeof result === "string" ? result.trim() : (result as { text?: string }).text?.trim() ?? "";
}

// ── AI text generation (streaming via Groq llama-3.1-8b-instant) ──────────────
async function* generateTextStream(transcript: string): AsyncGenerator<string> {
  const groq = getGroq();
  const stream = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    stream: true,
    messages: [
      {
        role: "system",
        content:
          "You are a concise, helpful voice assistant. Reply conversationally in under 3 sentences unless the question genuinely needs more. Never use markdown symbols (no **, no #, no backticks) — plain spoken text only.",
      },
      { role: "user", content: transcript },
    ],
    max_tokens: 300,
  });

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}

// ── Per-connection handler ────────────────────────────────────────────────────
export function handleVoiceSocket(ws: WebSocket): void {
  let audioBuffer = Buffer.alloc(0);
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let processing = false;

  function resetSilenceTimer() {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => void flush(), SILENCE_THRESHOLD_MS);
  }

  async function flush() {
    if (processing || audioBuffer.length < 1000) {
      // Too short — likely noise; discard
      audioBuffer = Buffer.alloc(0);
      return;
    }
    processing = true;
    const buf = audioBuffer;
    audioBuffer = Buffer.alloc(0);

    try {
      // ── 1. STT via Groq Whisper ─────────────────────────────────────────────
      let transcript: string;
      try {
        transcript = await transcribeBuffer(buf);
      } catch (err) {
        sendError(ws, `STT failed: ${err instanceof Error ? err.message : String(err)}`);
        return;
      }
      if (!transcript) { send(ws, { type: "done" }); return; }
      send(ws, { type: "user_transcript", text: transcript });

      // ── 2. LLM text stream via Groq ─────────────────────────────────────────
      // NOTE: TTS is disabled — Groq does not offer a TTS API.
      // Browser should use Web Speech API (speechSynthesis) for voice output.
      for await (const chunk of generateTextStream(transcript)) {
        if (ws.readyState !== ws.OPEN) break;
        send(ws, { type: "assistant_text", text: chunk });
      }

      send(ws, { type: "done" });
    } catch (err) {
      logger.error({ err }, "[voice-ws] flush error");
      sendError(ws, err instanceof Error ? err.message : "Internal voice error");
    } finally {
      processing = false;
    }
  }

  ws.on("message", (data, isBinary) => {
    if (!isBinary) {
      // Text frame — could be a config message (e.g. { type: "start" })
      try {
        const msg = JSON.parse(data.toString()) as Record<string, unknown>;
        if (msg["type"] === "flush") void flush();
        if (msg["type"] === "cancel") {
          audioBuffer = Buffer.alloc(0);
          if (silenceTimer) clearTimeout(silenceTimer);
          processing = false;
        }
      } catch { /* ignore */ }
      return;
    }

    // Binary audio chunk
    if (audioBuffer.length + (data as Buffer).length > MAX_AUDIO_BUFFER_BYTES) {
      sendError(ws, "Audio buffer overflow — send shorter segments");
      audioBuffer = Buffer.alloc(0);
      return;
    }
    audioBuffer = Buffer.concat([audioBuffer, data as Buffer]);
    resetSilenceTimer();
  });

  ws.on("close", () => {
    if (silenceTimer) clearTimeout(silenceTimer);
  });

  ws.on("error", (err) => {
    logger.warn({ err }, "[voice-ws] connection error");
    if (silenceTimer) clearTimeout(silenceTimer);
  });
}
