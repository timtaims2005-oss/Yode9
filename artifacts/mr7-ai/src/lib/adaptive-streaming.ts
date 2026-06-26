/**
 * adaptive-streaming.ts
 * Optimises AI response streaming: auto-tunes chunk size, pauses 3D
 * components during active streaming, and prioritises text rendering.
 */

import { eventBus } from './event-bus';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StreamSession {
  id: string;
  startTime: number;
  bytesReceived: number;
  chunksReceived: number;
  avgChunkInterval: number; // ms between chunks
  lastChunkTime: number;
}

interface AdaptiveStreamingConfig {
  minChunkSize: number;   // bytes
  maxChunkSize: number;   // bytes
  targetFps: number;      // fps during streaming
  pause3DThreshold: number; // chunks/sec that triggers 3D pause
}

// ── State ─────────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: AdaptiveStreamingConfig = {
  minChunkSize: 64,
  maxChunkSize: 4096,
  targetFps: 30,
  pause3DThreshold: 10,
};

let config = { ...DEFAULT_CONFIG };
let activeSession: StreamSession | null = null;
let is3DPaused = false;
let streamingActive = false;

// Sliding window of chunk intervals (last 20)
const intervalWindow: number[] = [];
const WINDOW_SIZE = 20;

// ── Core logic ────────────────────────────────────────────────────────────────

function recordChunk(bytes: number): void {
  const now = performance.now();

  if (!activeSession) return;

  const interval = now - activeSession.lastChunkTime;
  activeSession.lastChunkTime = now;
  activeSession.bytesReceived += bytes;
  activeSession.chunksReceived += 1;

  intervalWindow.push(interval);
  if (intervalWindow.length > WINDOW_SIZE) intervalWindow.shift();

  activeSession.avgChunkInterval =
    intervalWindow.reduce((a, b) => a + b, 0) / intervalWindow.length;

  // Throttle 3D if chunks arrive faster than threshold
  const chunksPerSec = 1000 / (activeSession.avgChunkInterval || 1);
  if (chunksPerSec >= config.pause3DThreshold && !is3DPaused) {
    pause3D();
  }
}

/** Recommended chunk size based on current network & render performance. */
function getOptimalChunkSize(): number {
  if (!activeSession || intervalWindow.length < 3) return 512;

  const avgInterval = activeSession.avgChunkInterval;
  const frameTime = 1000 / config.targetFps; // ms per frame at target fps

  // If chunks arrive faster than one frame → keep them small so UI can paint
  if (avgInterval < frameTime) return config.minChunkSize;

  // If chunks are slow → accumulate larger chunks to reduce paint calls
  if (avgInterval > frameTime * 4) return config.maxChunkSize;

  // Interpolate between min and max
  const t = (avgInterval - frameTime) / (frameTime * 3);
  return Math.round(
    config.minChunkSize + t * (config.maxChunkSize - config.minChunkSize)
  );
}

function pause3D(): void {
  if (is3DPaused) return;
  is3DPaused = true;
  eventBus.emit('3d:pause', { reason: 'streaming' });
}

function resume3D(): void {
  if (!is3DPaused) return;
  is3DPaused = false;
  eventBus.emit('3d:resume', { reason: 'streaming-done' });
}

// ── Public API ────────────────────────────────────────────────────────────────

function startSession(id: string): void {
  const now = performance.now();
  activeSession = {
    id,
    startTime: now,
    bytesReceived: 0,
    chunksReceived: 0,
    avgChunkInterval: 100,
    lastChunkTime: now,
  };
  intervalWindow.length = 0;
  streamingActive = true;

  // Boost text-rendering priority
  eventBus.emit('render:priority', { mode: 'streaming' });
}

function endSession(): void {
  if (!activeSession) return;

  const elapsed = performance.now() - activeSession.startTime;
  const throughput = (activeSession.bytesReceived / elapsed) * 1000; // bytes/sec

  if (import.meta.env.DEV) {
    console.debug(
      `[adaptive-streaming] session ${activeSession.id} done` +
        ` | ${activeSession.chunksReceived} chunks` +
        ` | ${(activeSession.bytesReceived / 1024).toFixed(1)} KB` +
        ` | ${throughput.toFixed(0)} B/s`
    );
  }

  activeSession = null;
  streamingActive = false;
  intervalWindow.length = 0;

  resume3D();
  eventBus.emit('render:priority', { mode: 'normal' });
}

function configure(overrides: Partial<AdaptiveStreamingConfig>): void {
  config = { ...config, ...overrides };
}

function isStreaming(): boolean {
  return streamingActive;
}

function getStats() {
  return activeSession
    ? {
        id: activeSession.id,
        elapsedMs: performance.now() - activeSession.startTime,
        bytesReceived: activeSession.bytesReceived,
        chunksReceived: activeSession.chunksReceived,
        avgChunkIntervalMs: activeSession.avgChunkInterval,
        optimalChunkSize: getOptimalChunkSize(),
        is3DPaused,
      }
    : null;
}

export const adaptiveStreaming = {
  startSession,
  endSession,
  recordChunk,
  getOptimalChunkSize,
  configure,
  isStreaming,
  getStats,
};
