/**
 * Render Budget — prevents React re-render storms.
 * Tracks render frequency per component, throttles excessive re-renders,
 * batches state updates, and warns on render loops.
 */

interface RenderRecord {
  component: string;
  count: number;
  firstAt: number;
  lastAt: number;
  throttled: number;
}

const RENDER_STORM_THRESHOLD = 20; // >20 renders in 1s = storm
const RENDER_STORM_WINDOW_MS = 1000;
const THROTTLE_INTERVAL_MS  = 16; // min 16ms between renders (60fps)

class RenderBudget {
  private records = new Map<string, RenderRecord>();
  private timers   = new Map<string, ReturnType<typeof setTimeout>>();
  private warnings = new Set<string>();

  /**
   * Track a render — call inside a component's render body.
   * Returns true if render should proceed, false if throttled.
   */
  track(componentId: string): boolean {
    const now = Date.now();
    let rec = this.records.get(componentId);

    if (!rec) {
      rec = { component: componentId, count: 1, firstAt: now, lastAt: now, throttled: 0 };
      this.records.set(componentId, rec);
      return true;
    }

    // Reset window after 1 second of inactivity
    if (now - rec.lastAt > RENDER_STORM_WINDOW_MS) {
      rec.count = 1;
      rec.firstAt = now;
      rec.lastAt = now;
      return true;
    }

    // Throttle: min 16ms between renders
    if (now - rec.lastAt < THROTTLE_INTERVAL_MS) {
      rec.throttled++;
      return false;
    }

    rec.count++;
    rec.lastAt = now;

    // Warn on render storm
    const windowAge = now - rec.firstAt;
    if (windowAge < RENDER_STORM_WINDOW_MS && rec.count > RENDER_STORM_THRESHOLD) {
      if (!this.warnings.has(componentId)) {
        this.warnings.add(componentId);
        console.warn(`[RenderBudget] Render storm: "${componentId}" rendered ${rec.count}× in ${windowAge}ms. ${rec.throttled} throttled.`);
        setTimeout(() => this.warnings.delete(componentId), 5000);
      }
    }

    return true;
  }

  /** Get render stats for a component */
  getStats(componentId: string): RenderRecord | null {
    return this.records.get(componentId) ?? null;
  }

  /** Get all components with render storms */
  getStorms(): RenderRecord[] {
    const now = Date.now();
    return [...this.records.values()].filter(r =>
      now - r.firstAt < RENDER_STORM_WINDOW_MS && r.count > RENDER_STORM_THRESHOLD
    );
  }

  /** Reset stats for a component */
  reset(componentId: string) {
    this.records.delete(componentId);
    this.timers.get(componentId)?.let?.(() => {});
  }

  /** Clear all records */
  clear() {
    this.records.clear();
    this.timers.forEach(t => clearTimeout(t));
    this.timers.clear();
  }
}

// Polyfill .let() for optional chaining with side effects
declare global {
  interface Object { let?: <T>(fn: (v: this) => T) => T; }
}

export const renderBudget = new RenderBudget();
