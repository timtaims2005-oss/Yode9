/**
 * scheduler-coordinator.ts
 * Central coordination layer between frameScheduler, idleQueue, and workerPool.
 * Prevents collisions, detects deadlocks, inherits priority, and stops starvation.
 */

import { eventBus } from './event-bus';

// ── Types ─────────────────────────────────────────────────────────────────────

type SchedulerName = 'frame' | 'idle' | 'worker' | 'micro';
type TaskPriority = 0 | 1 | 2 | 3; // 0 = highest

interface RegistryEntry {
  id: string;
  scheduler: SchedulerName;
  priority: TaskPriority;
  originalPriority: TaskPriority;
  enqueuedAt: number;
  dependsOn: string[]; // ids this task is waiting for
  label: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STARVATION_MS = 2000;     // promote priority after waiting this long
const STARVATION_CHECK_MS = 500; // how often to check for starvation
const MAX_REGISTRY_SIZE = 1000; // safety cap

// ── State ─────────────────────────────────────────────────────────────────────

const registry = new Map<string, RegistryEntry>();
let starvationTimer: ReturnType<typeof setInterval> | null = null;
let nextId = 1;

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateId(label: string): string {
  return `sched-${nextId++}-${label.slice(0, 12).replace(/\s+/g, '-')}`;
}

function hasCycle(startId: string, visited = new Set<string>()): boolean {
  if (visited.has(startId)) return true;
  visited.add(startId);
  const entry = registry.get(startId);
  if (!entry) return false;
  for (const depId of entry.dependsOn) {
    if (hasCycle(depId, new Set(visited))) return true;
  }
  return false;
}

// ── Starvation prevention ─────────────────────────────────────────────────────

function checkStarvation(): void {
  const now = Date.now();
  for (const entry of registry.values()) {
    const waiting = now - entry.enqueuedAt;
    if (waiting > STARVATION_MS && entry.priority > 0) {
      const prev = entry.priority;
      (entry.priority as number) -= 1;
      if (import.meta.env.DEV) {
        console.debug(
          `[scheduler-coordinator] starvation: ${entry.label}` +
          ` promoted ${prev} → ${entry.priority} (waited ${waiting}ms)`
        );
      }
      eventBus.emit('scheduler:priority-elevated', {
        id: entry.id,
        label: entry.label,
        priority: entry.priority,
      });
    }
  }
}

// ── Priority inheritance ──────────────────────────────────────────────────────

function inheritPriority(waitingId: string, blockedById: string): void {
  const waiting = registry.get(waitingId);
  const blocker = registry.get(blockedById);
  if (!waiting || !blocker) return;

  if (blocker.priority > waiting.priority) {
    // Waiting task is high priority — raise blocker temporarily
    if (import.meta.env.DEV) {
      console.debug(
        `[scheduler-coordinator] priority inheritance:` +
        ` ${blocker.label} raised ${blocker.priority} → ${waiting.priority}`
      );
    }
    (blocker.priority as number) = waiting.priority;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

function register(opts: {
  label: string;
  scheduler: SchedulerName;
  priority?: TaskPriority;
  dependsOn?: string[];
}): string {
  if (registry.size >= MAX_REGISTRY_SIZE) {
    // Evict oldest completed tasks first (they should have been unregistered)
    const oldest = [...registry.entries()].sort((a, b) => a[1].enqueuedAt - b[1].enqueuedAt)[0];
    if (oldest) registry.delete(oldest[0]);
  }

  const id = generateId(opts.label);
  const priority = (opts.priority ?? 2) as TaskPriority;

  // Cross-scheduler deduplication: same label on same scheduler → reuse
  for (const entry of registry.values()) {
    if (entry.label === opts.label && entry.scheduler === opts.scheduler) {
      return entry.id; // already queued
    }
  }

  const entry: RegistryEntry = {
    id,
    scheduler: opts.scheduler,
    priority,
    originalPriority: priority,
    enqueuedAt: Date.now(),
    dependsOn: opts.dependsOn ?? [],
    label: opts.label,
  };

  // Priority inheritance for dependencies
  for (const depId of entry.dependsOn) {
    inheritPriority(id, depId);
  }

  // Deadlock detection
  registry.set(id, entry);
  if (hasCycle(id)) {
    registry.delete(id);
    console.error(`[scheduler-coordinator] deadlock detected for task "${opts.label}"`);
    eventBus.emit('scheduler:deadlock', { label: opts.label });
    return '';
  }

  return id;
}

function unregister(id: string): void {
  registry.delete(id);
}

function init(): void {
  starvationTimer = setInterval(checkStarvation, STARVATION_CHECK_MS);
  if (import.meta.env.DEV) {
    console.debug('[scheduler-coordinator] init');
  }
}

function destroy(): void {
  if (starvationTimer) { clearInterval(starvationTimer); starvationTimer = null; }
  registry.clear();
}

function getStats() {
  return {
    registeredTasks: registry.size,
    byScheduler: {
      frame: [...registry.values()].filter(e => e.scheduler === 'frame').length,
      idle: [...registry.values()].filter(e => e.scheduler === 'idle').length,
      worker: [...registry.values()].filter(e => e.scheduler === 'worker').length,
      micro: [...registry.values()].filter(e => e.scheduler === 'micro').length,
    },
  };
}

export const schedulerCoordinator = { init, destroy, register, unregister, getStats };
