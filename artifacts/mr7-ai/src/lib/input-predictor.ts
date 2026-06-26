/**
 * input-predictor.ts
 * Predicts what the user is about to send and pre-loads relevant context.
 * Features: adaptive debounce, automatic stale-request cancellation,
 * typing-speed-aware scheduling.
 */

import { eventBus } from './event-bus';

// ── Types ─────────────────────────────────────────────────────────────────────

type PredictCallback = (draft: string) => void | Promise<void>;

interface TypingStats {
  lastKeystrokeAt: number;
  keystrokeIntervals: number[]; // last N intervals (ms)
  avgInterval: number;          // ms between keystrokes
  wpm: number;                  // words per minute estimate
}

// ── Constants ─────────────────────────────────────────────────────────────────

const WINDOW_SIZE = 10;       // keystrokes to average
const BASE_DEBOUNCE = 300;    // ms — floor debounce
const MAX_DEBOUNCE = 1200;    // ms — ceiling debounce
const MIN_CHARS_TO_PREDICT = 8; // don't pre-load for tiny inputs

// ── State ─────────────────────────────────────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let abortController: AbortController | null = null;
let onPredictCallback: PredictCallback | null = null;
let currentDraft = '';

const typingStats: TypingStats = {
  lastKeystrokeAt: 0,
  keystrokeIntervals: [],
  avgInterval: 200,
  wpm: 0,
};

// ── Typing speed tracking ─────────────────────────────────────────────────────

function recordKeystroke(): void {
  const now = performance.now();
  const interval = now - (typingStats.lastKeystrokeAt || now);
  typingStats.lastKeystrokeAt = now;

  if (interval > 0 && interval < 3000) {
    typingStats.keystrokeIntervals.push(interval);
    if (typingStats.keystrokeIntervals.length > WINDOW_SIZE) {
      typingStats.keystrokeIntervals.shift();
    }
    typingStats.avgInterval =
      typingStats.keystrokeIntervals.reduce((a, b) => a + b, 0) /
      typingStats.keystrokeIntervals.length;

    // Rough WPM: ~5 chars per word, intervals in ms
    const charsPerMs = 1 / typingStats.avgInterval;
    typingStats.wpm = Math.round(charsPerMs * 60_000 / 5);
  }
}

/** Debounce delay adapts to typing speed: fast typist → shorter delay. */
function getAdaptiveDebounce(): number {
  const { avgInterval } = typingStats;
  // Map interval 50–500ms → debounce MAX–BASE
  const clamped = Math.max(50, Math.min(500, avgInterval));
  const t = (clamped - 50) / 450;
  return Math.round(BASE_DEBOUNCE + t * (MAX_DEBOUNCE - BASE_DEBOUNCE));
}

// ── Core prediction ───────────────────────────────────────────────────────────

function cancelPending(): void {
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

async function runPrediction(draft: string): Promise<void> {
  if (!onPredictCallback) return;
  if (draft.length < MIN_CHARS_TO_PREDICT) return;

  // Create a fresh abort controller for this prediction run
  abortController = new AbortController();

  try {
    // Emit event so other systems can react (e.g., critical-path, render-budget)
    eventBus.emit('input:predict-start', { draft, wpm: typingStats.wpm });

    await onPredictCallback(draft);

    eventBus.emit('input:predict-done', { draft });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      // Silently cancelled — user kept typing
    } else if (import.meta.env.DEV) {
      console.warn('[input-predictor] prediction error:', err);
    }
  } finally {
    abortController = null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Call this on every keystroke with the current draft text.
 * Automatically cancels previous pending prediction when user keeps typing.
 */
function onInput(draft: string): void {
  recordKeystroke();
  currentDraft = draft;

  // Cancel any in-flight prediction immediately
  cancelPending();

  if (draft.trim().length < MIN_CHARS_TO_PREDICT) return;

  const delay = getAdaptiveDebounce();
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    runPrediction(draft);
  }, delay);
}

/** Register the callback that will actually pre-load context. */
function onPredict(cb: PredictCallback): void {
  onPredictCallback = cb;
}

/** Call when the user submits (sends) their message. */
function onSubmit(): void {
  cancelPending();
  eventBus.emit('input:submit', { draft: currentDraft, wpm: typingStats.wpm });
  currentDraft = '';
}

/** Call when the input is cleared or the chat is reset. */
function reset(): void {
  cancelPending();
  currentDraft = '';
  typingStats.keystrokeIntervals.length = 0;
  typingStats.avgInterval = 200;
  typingStats.wpm = 0;
}

function getTypingStats() {
  return { ...typingStats, adaptiveDebounceMs: getAdaptiveDebounce() };
}

export const inputPredictor = {
  onInput,
  onPredict,
  onSubmit,
  reset,
  cancelPending,
  getTypingStats,
};
