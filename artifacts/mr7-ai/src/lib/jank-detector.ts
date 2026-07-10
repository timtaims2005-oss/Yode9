/**
 * jank-detector.ts
 * Real-time performance monitor: detects Long Tasks (>50ms) and frame drops,
 * emits warnings via eventBus, and suggests the likely offending component.
 */

import { eventBus } from './event-bus';

// ── Browser type augmentation ─────────────────────────────────────────────────
// PerformanceLongTaskTiming is not in all TS lib versions

interface TaskAttributionTiming {
  containerType?: string;
  containerName?: string;
  containerSrc?: string;
  containerId?: string;
}

interface PerformanceLongTaskTiming extends PerformanceEntry {
  attribution: TaskAttributionTiming[];
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LongTask {
  startTime: number;
  duration: number;
  attribution: string;
}

interface FrameDrop {
  timestamp: number;
  droppedFrames: number;
  expectedInterval: number;
  actualInterval: number;
}

interface JankReport {
  longTasks: LongTask[];
  frameDrops: FrameDrop[];
  totalJankEvents: number;
  worstOffender: string | null;
  avgFrameTime: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LONG_TASK_THRESHOLD = 50;    // ms
const FRAME_DROP_THRESHOLD = 32;   // ms — 2× 60fps frame budget
const MAX_LOG_SIZE = 100;
const TARGET_FRAME_MS = 16.67;     // 60fps

// Known component names mapped from PerformanceLongTaskTiming attribution
const COMPONENT_HINTS: Record<string, string> = {
  'self': 'Main thread (unknown component)',
  'same-origin': 'Same-origin script',
  'cross-origin-ancestor': 'Cross-origin iframe',
};

// ── State ─────────────────────────────────────────────────────────────────────

const longTaskLog: LongTask[] = [];
const frameDropLog: FrameDrop[] = [];
let rafHandle = 0;
let lastFrameTime = 0;
const frameIntervals: number[] = [];
let observer: PerformanceObserver | null = null;
let running = false;

// Offender tracking: componentName → jank count
const offenderMap = new Map<string, number>();

// ── Helpers ───────────────────────────────────────────────────────────────────

function pushLog<T>(log: T[], entry: T): void {
  log.push(entry);
  if (log.length > MAX_LOG_SIZE) log.shift();
}

function getAttribution(entry: PerformanceEntry): string {
  const lt = entry as PerformanceLongTaskTiming;
  if (lt.attribution && lt.attribution.length > 0) {
    const attr = lt.attribution[0];
    return COMPONENT_HINTS[attr.containerType ?? 'self'] ??
      attr.containerName ?? attr.containerType ?? 'Unknown';
  }
  return 'Unknown';
}

function bumpOffender(name: string): void {
  offenderMap.set(name, (offenderMap.get(name) ?? 0) + 1);
}

function worstOffender(): string | null {
  if (offenderMap.size === 0) return null;
  let max = 0;
  let worst: string | null = null;
  for (const [name, count] of offenderMap) {
    if (count > max) { max = count; worst = name; }
  }
  return worst;
}

// ── Long Task Observer ────────────────────────────────────────────────────────

function startLongTaskObserver(): void {
  if (!('PerformanceObserver' in window)) return;

  try {
    observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.duration < LONG_TASK_THRESHOLD) continue;

        const attribution = getAttribution(entry);
        const task: LongTask = {
          startTime: entry.startTime,
          duration: entry.duration,
          attribution,
        };

        pushLog(longTaskLog, task);
        bumpOffender(attribution);

        if (import.meta.env.DEV) {
          console.warn(
            `[jank-detector] Long Task ${entry.duration.toFixed(1)}ms — ${attribution}`
          );
        }

        eventBus.emit('jank:long-task', {
          duration: entry.duration,
          attribution,
          worstOffender: worstOffender(),
        });
      }
    });

    observer.observe({ type: 'longtask', buffered: true });
  } catch {
    // longtask not supported in this browser — skip silently
  }
}

// ── Frame Drop Monitor ────────────────────────────────────────────────────────

function frameLoop(ts: number): void {
  if (!running) return;

  if (lastFrameTime > 0) {
    const interval = ts - lastFrameTime;
    frameIntervals.push(interval);
    if (frameIntervals.length > 60) frameIntervals.shift();

    if (interval > FRAME_DROP_THRESHOLD) {
      const droppedFrames = Math.round(interval / TARGET_FRAME_MS) - 1;
      const drop: FrameDrop = {
        timestamp: ts,
        droppedFrames,
        expectedInterval: TARGET_FRAME_MS,
        actualInterval: interval,
      };

      pushLog(frameDropLog, drop);

      if (import.meta.env.DEV) {
        console.warn(
          `[jank-detector] Frame drop — ${droppedFrames} frames` +
            ` (${interval.toFixed(1)}ms gap)`
        );
      }

      eventBus.emit('jank:frame-drop', {
        droppedFrames,
        intervalMs: interval,
        worstOffender: worstOffender(),
      });
    }
  }

  lastFrameTime = ts;
  rafHandle = requestAnimationFrame(frameLoop);
}

// ── Public API ────────────────────────────────────────────────────────────────

function init(): void {
  if (running) return;
  running = true;
  startLongTaskObserver();
  rafHandle = requestAnimationFrame(frameLoop);

  if (import.meta.env.DEV) {
    console.debug('[jank-detector] started');
  }
}

function stop(): void {
  running = false;
  cancelAnimationFrame(rafHandle);
  observer?.disconnect();
  observer = null;
}

function getReport(): JankReport {
  const avgFrame =
    frameIntervals.length > 0
      ? frameIntervals.reduce((a, b) => a + b, 0) / frameIntervals.length
      : TARGET_FRAME_MS;

  return {
    longTasks: [...longTaskLog],
    frameDrops: [...frameDropLog],
    totalJankEvents: longTaskLog.length + frameDropLog.length,
    worstOffender: worstOffender(),
    avgFrameTime: avgFrame,
  };
}

function clearLogs(): void {
  longTaskLog.length = 0;
  frameDropLog.length = 0;
  offenderMap.clear();
}

export const jankDetector = { init, stop, getReport, clearLogs };
