/**
 * predictive-prerender.ts
 * Detects hover/touch-start on buttons and pre-loads the likely next component
 * before the user clicks — making modals and pages appear instantly.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

type LazyFactory = () => Promise<{ default: React.ComponentType<unknown> }>;

interface PreloadEntry {
  key: string;
  factory: LazyFactory;
  loadedAt: number | null;
  module: { default: React.ComponentType<unknown> } | null;
}

// ── State ─────────────────────────────────────────────────────────────────────

const registry = new Map<string, PreloadEntry>();
let currentlyLoading: string | null = null; // only one at a time
let currentLoadPromise: Promise<void> | null = null;
let initialized = false;

// ── Core ──────────────────────────────────────────────────────────────────────

async function load(key: string): Promise<void> {
  const entry = registry.get(key);
  if (!entry || entry.module) return; // already loaded or unknown
  if (currentlyLoading === key) return; // in-flight

  currentlyLoading = key;
  currentLoadPromise = (async () => {
    try {
      entry.module = await entry.factory();
      entry.loadedAt = Date.now();
      if (import.meta.env.DEV) {
        console.debug(`[predictive-prerender] preloaded: ${key}`);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn(`[predictive-prerender] failed to preload ${key}:`, err);
      }
    } finally {
      currentlyLoading = null;
      currentLoadPromise = null;
    }
  })();

  return currentLoadPromise;
}

function handlePointerOver(event: PointerEvent): void {
  const target = (event.target as HTMLElement).closest('[data-preload]') as HTMLElement | null;
  if (!target) return;

  const key = target.dataset.preload;
  if (!key || !registry.has(key)) return;

  // Debounce: only trigger after 50ms of hover (saves load on fast mouse moves)
  const handle = setTimeout(() => load(key), 50);
  target.addEventListener('pointerout', () => clearTimeout(handle), { once: true });
}

function handleTouchStart(event: TouchEvent): void {
  // On mobile: fire immediately on touchstart (before touchend)
  const target = (event.target as HTMLElement).closest('[data-preload]') as HTMLElement | null;
  if (!target) return;

  const key = target.dataset.preload;
  if (key && registry.has(key)) load(key);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Register a component factory under a key.
 * Attach `data-preload="key"` to any button/trigger element.
 *
 * @example
 * predictivePrerender.register('settings', () => import('../components/SettingsModal'));
 */
function register(key: string, factory: LazyFactory): void {
  if (registry.has(key)) return;
  registry.set(key, { key, factory, loadedAt: null, module: null });
}

/**
 * Get the already-loaded module (or null if not yet loaded).
 * Useful for bypassing React.lazy when the module is ready.
 */
function getLoaded(key: string): PreloadEntry['module'] {
  return registry.get(key)?.module ?? null;
}

/**
 * Manually trigger preload for a key (e.g., from keyboard shortcut).
 */
function preload(key: string): Promise<void> {
  return load(key);
}

function init(): void {
  if (initialized) return;
  initialized = true;

  // Pointer events cover mouse + stylus; touch for mobile
  document.addEventListener('pointerover', handlePointerOver, { passive: true });
  document.addEventListener('touchstart', handleTouchStart, { passive: true });

  if (import.meta.env.DEV) {
    console.debug('[predictive-prerender] init');
  }
}

function destroy(): void {
  document.removeEventListener('pointerover', handlePointerOver);
  document.removeEventListener('touchstart', handleTouchStart);
  initialized = false;
}

function getStats() {
  const entries = [...registry.values()];
  return {
    registered: entries.length,
    loaded: entries.filter(e => e.module !== null).length,
    currentlyLoading,
  };
}

export const predictivePrerender = { init, destroy, register, getLoaded, preload, getStats };
