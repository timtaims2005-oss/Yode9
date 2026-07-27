/**
 * paint-synchronizer.ts
 * Collects all CSS mutations and canvas draw calls from every component and
 * applies them in one requestAnimationFrame in the correct order:
 *   1. DOM reads  2. State calcs  3. DOM writes  4. Canvas draws  5. CSS vars
 * Prevents interleaved read/write layout thrashing.
 */

// ── Types ─────────────────────────────────────────────────────────────────────

type ReadFn    = () => void;
type WriteFn   = () => void;
type DrawFn    = () => void;
type CssVarFn  = () => void;

interface FrameQueues {
  reads:   ReadFn[];
  writes:  WriteFn[];
  draws:   DrawFn[];
  cssVars: CssVarFn[];
}

interface PaintTiming {
  frame: number;
  reads: number;
  writes: number;
  draws: number;
  cssVars: number;
  totalMs: number;
}

// ── State ─────────────────────────────────────────────────────────────────────

const queues: FrameQueues = {
  reads:   [],
  writes:  [],
  draws:   [],
  cssVars: [],
};

let rafHandle = 0;
let rafPending = false;
let frameIndex = 0;
const timingHistory: PaintTiming[] = [];
const MAX_HISTORY = 60;

// ── RAF flush ─────────────────────────────────────────────────────────────────

function flush(): void {
  rafPending = false;
  const t0 = performance.now();

  // Snapshot and clear queues atomically before executing
  const reads   = queues.reads.splice(0);
  const writes  = queues.writes.splice(0);
  const draws   = queues.draws.splice(0);
  const cssVars = queues.cssVars.splice(0);

  // 1. DOM reads
  const t1 = performance.now();
  for (const fn of reads)   { try { fn(); } catch (e) { console.warn('[paint-sync] read:', e); } }

  // 2. (State calculations happen inside reads — no explicit phase needed)

  // 3. DOM writes
  const t2 = performance.now();
  for (const fn of writes)  { try { fn(); } catch (e) { console.warn('[paint-sync] write:', e); } }

  // 4. Canvas draws
  const t3 = performance.now();
  for (const fn of draws)   { try { fn(); } catch (e) { console.warn('[paint-sync] draw:', e); } }

  // 5. CSS custom properties
  const t4 = performance.now();
  for (const fn of cssVars) { try { fn(); } catch (e) { console.warn('[paint-sync] css-var:', e); } }

  const totalMs = performance.now() - t0;

  const timing: PaintTiming = {
    frame: ++frameIndex,
    reads:   performance.now() - t1,
    writes:  t3 - t2,
    draws:   t4 - t3,
    cssVars: performance.now() - t4,
    totalMs,
  };

  timingHistory.push(timing);
  if (timingHistory.length > MAX_HISTORY) timingHistory.shift();

  if (import.meta.env.DEV && totalMs > 8) {
    console.debug(
      `[paint-synchronizer] frame ${frameIndex}` +
      ` | R:${timing.reads.toFixed(1)} W:${timing.writes.toFixed(1)}` +
      ` D:${timing.draws.toFixed(1)} V:${timing.cssVars.toFixed(1)}` +
      ` | total ${totalMs.toFixed(1)}ms`
    );
  }

  // Re-schedule if more work was queued during this frame
  if (queues.reads.length || queues.writes.length || queues.draws.length || queues.cssVars.length) {
    schedule();
  }
}

function schedule(): void {
  if (rafPending) return;
  rafPending = true;
  rafHandle = requestAnimationFrame(flush);
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Schedule a DOM read (getBoundingClientRect, offsetWidth, etc.) */
function read(fn: ReadFn): void   { queues.reads.push(fn);   schedule(); }

/** Schedule a DOM write (style mutations, className, setAttribute) */
function write(fn: WriteFn): void { queues.writes.push(fn);  schedule(); }

/** Schedule a canvas draw call (ctx.drawImage, scene.render, etc.) */
function draw(fn: DrawFn): void   { queues.draws.push(fn);   schedule(); }

/** Schedule a CSS custom property update (element.style.setProperty) */
function cssVar(fn: CssVarFn): void { queues.cssVars.push(fn); schedule(); }

function init(): void {
  if (import.meta.env.DEV) {
    console.debug('[paint-synchronizer] init');
  }
}

function destroy(): void {
  cancelAnimationFrame(rafHandle);
  rafPending = false;
  queues.reads.length = 0;
  queues.writes.length = 0;
  queues.draws.length = 0;
  queues.cssVars.length = 0;
}

function getStats() {
  const recent = timingHistory.slice(-10);
  const avgTotal = recent.length
    ? recent.reduce((a, b) => a + b.totalMs, 0) / recent.length
    : 0;
  return {
    frameIndex,
    pending: {
      reads: queues.reads.length,
      writes: queues.writes.length,
      draws: queues.draws.length,
      cssVars: queues.cssVars.length,
    },
    avgFrameMs: avgTotal,
    history: timingHistory,
  };
}

export const paintSynchronizer = { init, destroy, read, write, draw, cssVar, getStats };
