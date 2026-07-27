/**
 * critical-path.ts
 * Identifies the 3 most important operations at any moment and grants them
 * maximum priority. Integrates with eventBus for state-driven switching.
 */

import { eventBus } from './event-bus';

// ── Types ─────────────────────────────────────────────────────────────────────

type AppMode = 'idle' | 'typing' | 'streaming' | 'loading';

interface CriticalTask {
  name: string;
  priority: number; // 0 = highest
  description: string;
}

// ── Priority tables per mode ──────────────────────────────────────────────────

const PRIORITY_TABLES: Record<AppMode, CriticalTask[]> = {
  typing: [
    { name: 'input-handler', priority: 0, description: 'Capture keystrokes without delay' },
    { name: 'debounce-scheduler', priority: 1, description: 'Smart debounce for predictions' },
    { name: 'render-input-ui', priority: 2, description: 'Paint textarea / input feedback' },
  ],
  streaming: [
    { name: 'text-renderer', priority: 0, description: 'Paint incoming AI tokens immediately' },
    { name: 'stream-reader', priority: 1, description: 'Read SSE chunks without back-pressure' },
    { name: 'scroll-anchor', priority: 2, description: 'Keep chat scroll pinned to bottom' },
  ],
  idle: [
    { name: 'prefetch-context', priority: 0, description: 'Pre-load likely next conversation context' },
    { name: 'cache-warm', priority: 1, description: 'Warm smart-cache with common queries' },
    { name: 'gc-idle', priority: 2, description: 'Run garbage collection-friendly cleanup' },
  ],
  loading: [
    { name: 'fetch-response', priority: 0, description: 'Receive model response data' },
    { name: 'loading-indicator', priority: 1, description: 'Keep spinner / skeleton visible' },
    { name: 'abort-watchdog', priority: 2, description: 'Watch for user cancel action' },
  ],
};

// ── State ─────────────────────────────────────────────────────────────────────

let currentMode: AppMode = 'idle';
let listeners: Array<(tasks: CriticalTask[], mode: AppMode) => void> = [];

// ── Core ──────────────────────────────────────────────────────────────────────

function setMode(mode: AppMode): void {
  if (mode === currentMode) return;
  const prev = currentMode;
  currentMode = mode;

  const tasks = PRIORITY_TABLES[mode];
  if (import.meta.env.DEV) {
    console.debug(`[critical-path] ${prev} → ${mode}`, tasks.map(t => t.name));
  }

  // Notify local listeners
  listeners.forEach(cb => cb(tasks, mode));

  // Notify global event bus
  eventBus.emit('critical-path:change', { mode, tasks });

  // During streaming: request 3D pause
  if (mode === 'streaming') {
    eventBus.emit('3d:pause', { reason: 'critical-path/streaming' });
  } else if (prev === 'streaming') {
    eventBus.emit('3d:resume', { reason: 'critical-path/streaming-done' });
  }
}

function getTopTasks(): CriticalTask[] {
  return PRIORITY_TABLES[currentMode].slice(0, 3);
}

function getMode(): AppMode {
  return currentMode;
}

function subscribe(
  cb: (tasks: CriticalTask[], mode: AppMode) => void
): () => void {
  listeners.push(cb);
  return () => { listeners = listeners.filter(l => l !== cb); };
}

// ── eventBus auto-wiring ──────────────────────────────────────────────────────

function init(): void {
  // Listen for app-state signals emitted by other modules
  eventBus.on('input:typing-start', () => setMode('typing'));
  eventBus.on('input:typing-stop', () => setMode('idle'));
  eventBus.on('input:submit', () => setMode('loading'));
  eventBus.on('stream:start', () => setMode('streaming'));
  eventBus.on('stream:end', () => setMode('idle'));
  eventBus.on('stream:error', () => setMode('idle'));

  if (import.meta.env.DEV) {
    console.debug('[critical-path] init — mode:', currentMode);
  }
}

export const criticalPath = { init, setMode, getMode, getTopTasks, subscribe };
