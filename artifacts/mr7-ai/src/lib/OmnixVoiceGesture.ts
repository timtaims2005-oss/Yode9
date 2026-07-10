// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX VOICE & GESTURE SYSTEM — النظام السادس: الأوامر الصوتية والنصية
//  يدعم العربية والإنجليزية — يتطابق مع قاموس الأوامر المطلق
//  يعمل مع Web Speech API الحقيقية
// ═══════════════════════════════════════════════════════════════════════════════

import { OMNIX_ABSOLUTE_REGISTRY, type AbsoluteCommand } from "./OmnixAbsoluteRegistry";
import { OMNIX_REGISTRY_MAP } from "./OmnixRegistry";
import { OmnixMemory } from "./OmnixMemory";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VoiceCommand {
  text: string;
  confidence: number;
  matchedCommandId: string | null;
  matchedLabel: string | null;
  args: Record<string, unknown>;
  lang: "ar" | "en" | "mixed";
  timestamp: number;
}

export interface GestureEvent {
  type: "swipe_left" | "swipe_right" | "swipe_up" | "swipe_down" | "pinch" | "spread" | "double_tap";
  commandId?: string;
  timestamp: number;
}

export type VoiceState = "idle" | "listening" | "processing" | "error";

type VoiceCommandCallback = (cmd: VoiceCommand) => void;
type TranscriptCallback = (text: string, isFinal: boolean) => void;
type StateChangeCallback = (state: VoiceState) => void;
type GestureCallback = (gesture: GestureEvent) => void;

// ── Arabic/English keyword → command type mapping ─────────────────────────────

const KEYWORD_MAP: Record<string, string[]> = {
  open: ["افتح", "فتح", "open", "show", "أظهر", "اظهر", "عرض"],
  close: ["أغلق", "اغلق", "غلق", "close", "hide", "أخف", "اخف", "اخفاء"],
  run: ["شغّل", "شغل", "تشغيل", "run", "execute", "نفّذ", "نفذ", "تنفيذ"],
  stop: ["وقف", "أوقف", "اوقف", "توقف", "stop", "halt", "إيقاف"],
  set_model: ["غيّر النموذج", "استخدم", "use model", "switch to", "بدّل إلى", "بدل النموذج"],
  change_theme: ["غيّر الثيم", "change theme", "بدّل الثيم", "ثيم", "theme"],
  set_temperature: ["اضبط الحرارة", "temperature", "حرارة", "درجة"],
  toggle: ["فعّل", "ألغ", "بدّل", "toggle", "switch"],
  search: ["ابحث", "بحث", "search", "find", "اقتراح"],
};

// ── Detect language ───────────────────────────────────────────────────────────

function detectLang(text: string): "ar" | "en" | "mixed" {
  const arabicCount = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latinCount = (text.match(/[a-zA-Z]/g) || []).length;
  if (arabicCount > 0 && latinCount > 0) return "mixed";
  if (arabicCount > latinCount) return "ar";
  return "en";
}

// ── Extract args from transcript ──────────────────────────────────────────────

function extractArgs(text: string, cmd: AbsoluteCommand): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  if (!cmd) return args;

  // Color extraction
  const colorMatch = text.match(/#[\da-fA-F]{3,8}|\b(red|green|blue|cyan|yellow|purple|orange|pink|white|black|أحمر|أخضر|أزرق|أصفر)\b/i);
  if (colorMatch) args.color = colorMatch[0];

  // Number extraction
  const numMatch = text.match(/\b(\d+(?:\.\d+)?)\b/);
  if (numMatch) args.value = parseFloat(numMatch[0]);

  // Quoted target extraction
  const quoteMatch = text.match(/["'"'](.+?)["'"']/);
  if (quoteMatch) args.target = quoteMatch[1];

  // Model name extraction
  const modelKeywords = ["gpt", "claude", "gemini", "groq", "llama", "deepseek", "grok", "mistral", "cohere"];
  for (const m of modelKeywords) {
    if (text.toLowerCase().includes(m)) { args.model = m; break; }
  }

  // Theme extraction
  const themeKeywords = ["space", "cyberpunk", "hacker", "earth", "dark", "light", "aurora", "فضاء", "هاكر"];
  for (const t of themeKeywords) {
    if (text.toLowerCase().includes(t)) { args.themeId = t; break; }
  }

  return args;
}

// ── Match text to registry command ────────────────────────────────────────────

function matchCommand(text: string): { cmd: AbsoluteCommand | null; args: Record<string, unknown> } {
  const lower = text.toLowerCase().trim();

  // 1. Exact alias match in ABSOLUTE_REGISTRY
  for (const cmd of OMNIX_ABSOLUTE_REGISTRY) {
    const allAliases = [cmd.id, cmd.name.toLowerCase(), cmd.nameAr, ...cmd.aliases.map((a) => a.toLowerCase())];
    for (const alias of allAliases) {
      if (lower.includes(alias.toLowerCase())) {
        return { cmd, args: extractArgs(text, cmd) };
      }
    }
  }

  // 2. Check OmnixRegistry (secondary registry)
  for (const [, cmd] of OMNIX_REGISTRY_MAP) {
    const names = [cmd.id, cmd.name.toLowerCase(), cmd.nameAr, ...(cmd.aliases || []).map((a: string) => a.toLowerCase())];
    for (const name of names) {
      if (lower.includes(name.toLowerCase())) {
        // Wrap into compatible AbsoluteCommand structure
        const wrapped: AbsoluteCommand = {
          id: cmd.id,
          name: cmd.name,
          nameAr: cmd.nameAr,
          description: cmd.description,
          descriptionAr: cmd.descriptionAr,
          category: cmd.category as AbsoluteCommand["category"],
          aliases: cmd.aliases || [],
          execute: (params, d) => {
            const r = cmd.execute(params, d);
            return { success: r.success, message: r.messageAr };
          },
        };
        return { cmd: wrapped, args: extractArgs(text, wrapped) };
      }
    }
  }

  // 3. Keyword fallback
  for (const [type, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) {
        const candidates = OMNIX_ABSOLUTE_REGISTRY.filter((c) =>
          c.category === type || c.id.startsWith(type)
        );
        if (candidates.length > 0) {
          return { cmd: candidates[0], args: extractArgs(text, candidates[0]) };
        }
      }
    }
  }

  return { cmd: null, args: {} };
}

// ── OmnixVoiceGesture Singleton ───────────────────────────────────────────────

class OmnixVoiceGestureClass {
  private static _instance: OmnixVoiceGestureClass;

  private _recognition: SpeechRecognition | null = null;
  private _state: VoiceState = "idle";
  private _isSupported = false;

  private _commandCallbacks = new Set<VoiceCommandCallback>();
  private _transcriptCallbacks = new Set<TranscriptCallback>();
  private _stateCallbacks = new Set<StateChangeCallback>();
  private _gestureCallbacks = new Set<GestureCallback>();

  private _history: VoiceCommand[] = [];
  private _gestureHistory: GestureEvent[] = [];

  // Touch tracking for gesture detection
  private _touchStart: { x: number; y: number; t: number } | null = null;
  private _gestureListenerAttached = false;

  private constructor() {
    this._initSpeechRecognition();
    this._initGestureDetection();
  }

  static getInstance(): OmnixVoiceGestureClass {
    if (!OmnixVoiceGestureClass._instance) {
      OmnixVoiceGestureClass._instance = new OmnixVoiceGestureClass();
    }
    return OmnixVoiceGestureClass._instance;
  }

  // ── Speech Recognition Init ────────────────────────────────────────────────

  private _initSpeechRecognition() {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.info("[OmnixVoice] Web Speech API not supported in this browser.");
      return;
    }

    this._isSupported = true;
    this._recognition = new SpeechRecognition();

    const r = this._recognition!;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 3;
    r.lang = "ar-SA";

    r.onstart = () => {
      this._setState("listening");
    };

    r.onresult = (event: SpeechRecognitionEvent) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const bestAlt = result[0];

        if (result.isFinal) {
          finalTranscript += bestAlt.transcript;
        } else {
          interimTranscript += bestAlt.transcript;
        }

        this._transcriptCallbacks.forEach((cb) =>
          cb(bestAlt.transcript, result.isFinal)
        );
      }

      if (finalTranscript.trim()) {
        this._setState("processing");
        this._processTranscript(finalTranscript.trim());
        this._setState("listening");
      }
    };

    r.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech" || event.error === "aborted") return;
      console.error("[OmnixVoice] Error:", event.error);
      this._setState("error");
      setTimeout(() => {
        if (this._state === "error") this._setState("idle");
      }, 2000);
    };

    r.onend = () => {
      if (this._state === "listening") {
        // Auto-restart if still supposed to be listening
        try { r.start(); } catch { this._setState("idle"); }
      } else {
        this._setState("idle");
      }
    };
  }

  // ── Process final transcript ───────────────────────────────────────────────

  private _processTranscript(text: string) {
    const lang = detectLang(text);
    const { cmd, args } = matchCommand(text);

    const voiceCmd: VoiceCommand = {
      text,
      confidence: cmd ? 0.92 : 0.4,
      matchedCommandId: cmd?.id ?? null,
      matchedLabel: cmd?.nameAr ?? null,
      args,
      lang,
      timestamp: Date.now(),
    };

    this._history.unshift(voiceCmd);
    if (this._history.length > 200) this._history.pop();

    // Record in persistent memory
    if (cmd) {
      OmnixMemory.recordAction({
        actionId: cmd.id,
        actionLabel: cmd.nameAr,
        params: { voiceText: text, confidence: voiceCmd.confidence, ...args },
        success: true,
      });
    }

    this._commandCallbacks.forEach((cb) => cb(voiceCmd));

    // Dispatch window event for any component to listen
    window.dispatchEvent(
      new CustomEvent("omnix:voice-command", { detail: voiceCmd })
    );
  }

  // ── Gesture Detection ──────────────────────────────────────────────────────

  private _initGestureDetection() {
    if (typeof window === "undefined" || this._gestureListenerAttached) return;
    this._gestureListenerAttached = true;

    const SWIPE_THRESHOLD = 60;
    const SWIPE_TIME_LIMIT = 400;

    window.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      this._touchStart = { x: t.clientX, y: t.clientY, t: Date.now() };
    }, { passive: true });

    window.addEventListener("touchend", (e) => {
      if (!this._touchStart) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this._touchStart.x;
      const dy = t.clientY - this._touchStart.y;
      const dt = Date.now() - this._touchStart.t;
      this._touchStart = null;

      if (dt > SWIPE_TIME_LIMIT) return;

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      let gestureType: GestureEvent["type"] | null = null;

      if (absDx > SWIPE_THRESHOLD && absDx > absDy * 1.5) {
        gestureType = dx > 0 ? "swipe_right" : "swipe_left";
      } else if (absDy > SWIPE_THRESHOLD && absDy > absDx * 1.5) {
        gestureType = dy > 0 ? "swipe_down" : "swipe_up";
      }

      if (gestureType) {
        this._fireGesture(gestureType);
      }
    }, { passive: true });

    // Double tap detection
    let lastTap = 0;
    window.addEventListener("touchend", () => {
      const now = Date.now();
      if (now - lastTap < 300) this._fireGesture("double_tap");
      lastTap = now;
    }, { passive: true });
  }

  private _fireGesture(type: GestureEvent["type"]) {
    const GESTURE_COMMAND_MAP: Partial<Record<GestureEvent["type"], string>> = {
      swipe_right: "toggle_sidebar",
      swipe_left: "toggle_search",
      swipe_up: "open_arsenal",
      swipe_down: "open_settings",
      double_tap: "fullscreen",
    };

    const gesture: GestureEvent = {
      type,
      commandId: GESTURE_COMMAND_MAP[type],
      timestamp: Date.now(),
    };

    this._gestureHistory.unshift(gesture);
    if (this._gestureHistory.length > 100) this._gestureHistory.pop();

    this._gestureCallbacks.forEach((cb) => cb(gesture));
    window.dispatchEvent(new CustomEvent("omnix:gesture", { detail: gesture }));
  }

  // ── State Management ───────────────────────────────────────────────────────

  private _setState(state: VoiceState) {
    if (this._state === state) return;
    this._state = state;
    this._stateCallbacks.forEach((cb) => cb(state));
    window.dispatchEvent(new CustomEvent("omnix:voice-state", { detail: { state } }));
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  get isSupported() { return this._isSupported; }
  get state() { return this._state; }
  get isListening() { return this._state === "listening"; }

  startListening(lang: "ar-SA" | "en-US" | "ar-SA,en-US" = "ar-SA,en-US") {
    if (!this._isSupported || !this._recognition) {
      console.warn("[OmnixVoice] Speech recognition not supported.");
      return false;
    }
    if (this._state === "listening") return true;

    try {
      // Try bilingual — fallback to ar-SA
      this._recognition.lang = lang;
      this._recognition.start();
      return true;
    } catch (e) {
      console.error("[OmnixVoice] Start failed:", e);
      this._setState("error");
      return false;
    }
  }

  stopListening() {
    if (!this._recognition) return;
    this._setState("idle");
    try { this._recognition.stop(); } catch { /* ignore */ }
  }

  toggleListening() {
    if (this._state === "listening") this.stopListening();
    else this.startListening();
  }

  /** Parse text directly without microphone */
  parseText(text: string): VoiceCommand {
    const lang = detectLang(text);
    const { cmd, args } = matchCommand(text);
    return {
      text,
      confidence: cmd ? 0.95 : 0.3,
      matchedCommandId: cmd?.id ?? null,
      matchedLabel: cmd?.nameAr ?? null,
      args,
      lang,
      timestamp: Date.now(),
    };
  }

  onCommandDetected(cb: VoiceCommandCallback): () => void {
    this._commandCallbacks.add(cb);
    return () => this._commandCallbacks.delete(cb);
  }

  onTranscript(cb: TranscriptCallback): () => void {
    this._transcriptCallbacks.add(cb);
    return () => this._transcriptCallbacks.delete(cb);
  }

  onStateChange(cb: StateChangeCallback): () => void {
    this._stateCallbacks.add(cb);
    return () => this._stateCallbacks.delete(cb);
  }

  onGesture(cb: GestureCallback): () => void {
    this._gestureCallbacks.add(cb);
    return () => this._gestureCallbacks.delete(cb);
  }

  getHistory(limit = 20): VoiceCommand[] {
    return this._history.slice(0, limit);
  }

  getGestureHistory(limit = 20): GestureEvent[] {
    return this._gestureHistory.slice(0, limit);
  }

  /** Change recognition language dynamically */
  setLanguage(lang: "ar-SA" | "en-US") {
    if (!this._recognition) return;
    const wasListening = this._state === "listening";
    if (wasListening) this.stopListening();
    this._recognition.lang = lang;
    if (wasListening) setTimeout(() => this.startListening(lang), 300);
  }
}

export const OmnixVoiceGesture = OmnixVoiceGestureClass.getInstance();
