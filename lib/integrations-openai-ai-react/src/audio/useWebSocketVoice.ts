/**
 * Task 7 — useWebSocketVoice React hook
 * ══════════════════════════════════════
 * Provides real-time bidirectional voice conversation over a WebSocket
 * connection to /api/voice-live.
 *
 * Auth flow (automatic, no caller action required):
 *   1. hook calls POST /api/voice-live/token → gets a short-lived signed token
 *   2. hook opens WebSocket to /api/voice-live?token=<token>
 *   Browsers cannot set custom headers on WebSocket connections, so the
 *   token is passed as a query parameter, which browsers do allow.
 *
 * Usage:
 *   const voice = useWebSocketVoice({ onUserTranscript, onAssistantText, onAudioChunk });
 *   voice.start();   // fetches token, opens WS, starts mic recording
 *   voice.stop();    // sends remaining audio, closes stream
 *   voice.cancel();  // abort without sending
 *
 * Audio flow:
 *   Microphone → MediaRecorder (webm/opus) → WS binary frames → server
 *   Server STT → model → TTS → base64 mp3 chunks → browser audio
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "connecting" | "listening" | "processing" | "speaking" | "error";

export interface UseWebSocketVoiceOptions {
  /** Called with each partial user transcript from Whisper */
  onUserTranscript?: (text: string) => void;
  /** Called with each streaming text chunk from the LLM */
  onAssistantText?: (text: string) => void;
  /** Called with a base64-encoded mp3 audio chunk */
  onAudioChunk?: (base64: string) => void;
  /** Called when the full exchange is complete */
  onDone?: () => void;
  /** Called on WS or processing error */
  onError?: (message: string) => void;
  /**
   * Base URL for the token-issuance and WebSocket endpoints.
   * Defaults to '' (same origin). Override when the API server is on a
   * different host (e.g. in Expo apps).
   */
  apiBase?: string;
  /** MediaRecorder timeslice ms — how often audio is flushed to WS (default 200) */
  timesliceMs?: number;
}

export interface UseWebSocketVoiceResult {
  state: VoiceState;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
  fullTranscript: string;
  fullResponse: string;
}

function httpToWs(url: string): string {
  return url.replace(/^http:/, "ws:").replace(/^https:/, "wss:");
}

function buildWsUrl(apiBase: string, token: string): string {
  const base = apiBase.replace(/\/$/, "");
  if (base) return `${httpToWs(base)}/api/voice-live?token=${encodeURIComponent(token)}`;
  // Same-origin: infer ws/wss from page protocol
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/voice-live?token=${encodeURIComponent(token)}`;
}

/** Fetch a short-lived signed token from the backend. */
async function fetchVoiceToken(apiBase: string): Promise<string> {
  const base = apiBase.replace(/\/$/, "");
  const url = `${base}/api/voice-live/token`;
  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    throw new Error(
      typeof body["error"] === "string"
        ? body["error"]
        : `Token issuance failed (HTTP ${res.status})`
    );
  }
  const data = await res.json() as { token?: string };
  if (!data.token) throw new Error("Server did not return a voice token");
  return data.token;
}

export function useWebSocketVoice(options: UseWebSocketVoiceOptions = {}): UseWebSocketVoiceResult {
  const {
    onUserTranscript,
    onAssistantText,
    onAudioChunk,
    onDone,
    onError,
    apiBase = "",
    timesliceMs = 200,
  } = options;

  const [state, setState] = useState<VoiceState>("idle");
  const [fullTranscript, setFullTranscript] = useState("");
  const [fullResponse, setFullResponse] = useState("");

  const wsRef       = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef   = useRef<MediaStream | null>(null);
  const abortedRef  = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortedRef.current = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanup() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    wsRef.current?.close();
    wsRef.current = null;
  }

  const cancel = useCallback(() => {
    abortedRef.current = true;
    try { wsRef.current?.send(JSON.stringify({ type: "cancel" })); } catch { /* ignore */ }
    cleanup();
    setState("idle");
    setFullTranscript("");
    setFullResponse("");
  }, []);

  const stop = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    // Signal server to flush remaining audio buffer
    try { wsRef.current?.send(JSON.stringify({ type: "flush" })); } catch { /* ignore */ }
    setState("processing");
  }, []);

  const start = useCallback(async () => {
    if (state !== "idle" && state !== "error") return;
    abortedRef.current = false;
    setState("connecting");
    setFullTranscript("");
    setFullResponse("");

    // ── 1. Fetch a signed token ───────────────────────────────────────────
    let token: string;
    try {
      token = await fetchVoiceToken(apiBase);
    } catch (err) {
      setState("error");
      onError?.(
        `Voice auth failed: ${err instanceof Error ? err.message : String(err)}. ` +
        "Make sure SESSION_SECRET is set on the server."
      );
      return;
    }
    if (abortedRef.current) return;

    // ── 2. Microphone ─────────────────────────────────────────────────────
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (err) {
      setState("error");
      onError?.(`Microphone access denied: ${err instanceof Error ? err.message : String(err)}`);
      return;
    }
    if (abortedRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
    streamRef.current = stream;

    // ── 3. WebSocket (token in query param — browsers allow this) ─────────
    const wsUrl = buildWsUrl(apiBase, token);
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    await new Promise<void>((resolve, reject) => {
      ws.addEventListener("open",  () => resolve(),                                      { once: true });
      ws.addEventListener("error", () => reject(new Error("WebSocket connection failed")), { once: true });
    }).catch((err) => {
      cleanup();
      setState("error");
      onError?.(err instanceof Error ? err.message : String(err));
      throw err;
    });
    if (abortedRef.current) { cleanup(); return; }

    // ── 4. WS message handler ─────────────────────────────────────────────
    ws.addEventListener("message", (evt) => {
      if (typeof evt.data !== "string") return;
      try {
        const msg = JSON.parse(evt.data) as Record<string, unknown>;
        switch (msg["type"]) {
          case "user_transcript": {
            const t = String(msg["text"] ?? "");
            setFullTranscript(t);
            onUserTranscript?.(t);
            break;
          }
          case "assistant_text": {
            const chunk = String(msg["text"] ?? "");
            setFullResponse((prev) => prev + chunk);
            onAssistantText?.(chunk);
            setState("speaking");
            break;
          }
          case "audio": {
            onAudioChunk?.(String(msg["data"] ?? ""));
            break;
          }
          case "done": {
            setState("idle");
            onDone?.();
            break;
          }
          case "error": {
            setState("error");
            onError?.(String(msg["message"] ?? "Voice error"));
            break;
          }
        }
      } catch { /* ignore malformed */ }
    });

    ws.addEventListener("close", () => {
      if (!abortedRef.current) setState((s) => (s === "listening" || s === "processing" ? "idle" : s));
    });

    // ── 5. MediaRecorder → WS ─────────────────────────────────────────────
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "";
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    recorderRef.current = recorder;

    recorder.addEventListener("dataavailable", (evt) => {
      if (evt.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        ws.send(evt.data);
      }
    });

    recorder.start(timesliceMs);
    setState("listening");
  }, [state, apiBase, timesliceMs, onUserTranscript, onAssistantText, onAudioChunk, onDone, onError]);

  return { state, start, stop, cancel, fullTranscript, fullResponse };
}
