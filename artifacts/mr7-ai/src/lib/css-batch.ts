/**
 * CSS Variable Batch Updater — coalesces multiple CSS variable mutations
 * into a single style recalculation per frame.
 * Prevents cascading layout/paint when many vars change simultaneously.
 */

type CSSVarMap = Record<string, string>;

class CSSBatchUpdater {
  private pending: CSSVarMap = {};
  private rafId: number | null = null;
  private target: HTMLElement | null = null;
  private flushCount = 0;
  private varCount = 0;

  /** Set target element (defaults to document.documentElement) */
  setTarget(el: HTMLElement) { this.target = el; }

  /** Queue a CSS variable update */
  set(name: string, value: string) {
    if (!name.startsWith("--")) name = `--${name}`;
    this.pending[name] = value;
    this.varCount++;
    this.schedule();
  }

  /** Queue multiple CSS variables at once */
  setMany(vars: CSSVarMap) {
    for (const [k, v] of Object.entries(vars)) {
      const name = k.startsWith("--") ? k : `--${k}`;
      this.pending[name] = v;
      this.varCount++;
    }
    this.schedule();
  }

  /** Force immediate flush (use sparingly) */
  flush() {
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.applyPending();
  }

  get pendingCount() { return Object.keys(this.pending).length; }
  get totalFlushes() { return this.flushCount; }
  get totalVarsSet() { return this.varCount; }

  private schedule() {
    if (this.rafId !== null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.applyPending();
    });
  }

  private applyPending() {
    const el = this.target ?? document.documentElement;
    const vars = this.pending;
    this.pending = {};
    if (Object.keys(vars).length === 0) return;
    for (const [name, value] of Object.entries(vars)) {
      el.style.setProperty(name, value);
    }
    this.flushCount++;
  }
}

export const cssBatch = new CSSBatchUpdater();

/**
 * Reactive CSS variables — apply theme/accent/color changes without thrashing.
 * Example: applyThemeVars({ primary: "#e21227", radius: "8px" })
 */
export function applyThemeVars(vars: CSSVarMap, el?: HTMLElement) {
  if (el) cssBatch.setTarget(el);
  cssBatch.setMany(vars);
}
