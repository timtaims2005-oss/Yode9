/**
 * layout-pipeline.ts
 * Prevents layout thrashing by batching all DOM reads before all DOM writes,
 * applied in a single requestAnimationFrame. 
 * API: layoutPipeline.read(fn) / layoutPipeline.write(fn)
 */

// ── Types ─────────────────────────────────────────────────────────────────────

type ReadFn = () => void;
type WriteFn = () => void;

// ── State ─────────────────────────────────────────────────────────────────────

const readQueue: ReadFn[] = [];
const writeQueue: WriteFn[] = [];
let rafPending = false;
let frameCount = 0;
let totalReadTime = 0;
let totalWriteTime = 0;

// ── RAF flush ─────────────────────────────────────────────────────────────────

function flush(): void {
  rafPending = false;
  frameCount++;

  // Phase 1: all reads (getBoundingClientRect, offsetWidth, etc.)
  const r0 = performance.now();
  const reads = readQueue.splice(0);
  for (const fn of reads) {
    try { fn(); } catch (err) { console.warn('[layout-pipeline] read error:', err); }
  }
  const readTime = performance.now() - r0;
  totalReadTime += readTime;

  // Phase 2: all writes (style mutations, class changes, etc.)
  const w0 = performance.now();
  const writes = writeQueue.splice(0);
  for (const fn of writes) {
    try { fn(); } catch (err) { console.warn('[layout-pipeline] write error:', err); }
  }
  const writeTime = performance.now() - w0;
  totalWriteTime += writeTime;

  if (import.meta.env.DEV && (readTime + writeTime) > 8) {
    console.debug(
      `[layout-pipeline] frame ${frameCount}` +
      ` | reads=${reads.length} (${readTime.toFixed(1)}ms)` +
      ` | writes=${writes.length} (${writeTime.toFixed(1)}ms)`
    );
  }

  // If more work was queued during this frame, schedule another flush
  if (readQueue.length > 0 || writeQueue.length > 0) {
    scheduleFlush();
  }
}

function scheduleFlush(): void {
  if (rafPending) return;
  rafPending = true;
  requestAnimationFrame(flush);
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Schedule a DOM read. Will execute before any writes in the same frame.
 * Use for: getBoundingClientRect, offsetWidth, scrollTop, etc.
 */
function read(fn: ReadFn): void {
  readQueue.push(fn);
  scheduleFlush();
}

/**
 * Schedule a DOM write. Will execute after all reads in the same frame.
 * Use for: style.transform, classList, setAttribute, etc.
 */
function write(fn: WriteFn): void {
  writeQueue.push(fn);
  scheduleFlush();
}

/**
 * Schedule a read followed immediately by a write that depends on it.
 * The write is guaranteed to run in the same frame as the read.
 */
function measure(readFn: () => WriteFn | void): void {
  read(() => {
    const writeFn = readFn();
    if (typeof writeFn === 'function') write(writeFn);
  });
}

function getStats() {
  return {
    pendingReads: readQueue.length,
    pendingWrites: writeQueue.length,
    frameCount,
    avgReadMs: frameCount > 0 ? totalReadTime / frameCount : 0,
    avgWriteMs: frameCount > 0 ? totalWriteTime / frameCount : 0,
  };
}

export const layoutPipeline = { read, write, measure, getStats };
