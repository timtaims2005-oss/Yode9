/**
 * boot-orchestrator.ts
 * Starts all performance libs in prioritised layers, each layer completing
 * before the next begins. Logs timing for every layer.
 */

// ── Layer definitions ─────────────────────────────────────────────────────────
// Each layer is a list of [name, importFn] pairs.
// Libs are imported lazily so Layer 0 never waits on unused bundles.

type InitFn = () => void | Promise<void>;

interface LayerTask {
  name: string;
  // Returns any module shape — we introspect it at runtime
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  init: () => Promise<any>;
}

const LAYER_0: LayerTask[] = [
  {
    name: 'frameScheduler',
    init: () => import('./frame-scheduler'),
  },
  {
    name: 'gpuLayerManager',
    init: () => import('./gpu-layer-manager'),
  },
  {
    name: 'paintOptimizer',
    init: () => import('./paint-optimizer'),
  },
];

const LAYER_1: LayerTask[] = [
  {
    name: 'memoryPressure',
    init: () => import('./memory-pressure'),
  },
  {
    name: 'thermalGuard',
    init: () => import('./thermal-guard'),
  },
  {
    name: 'connectionQuality',
    init: () => import('./connection-quality'),
  },
  {
    name: 'workerPool',
    init: () => import('./worker-pool'),
  },
];

const LAYER_2: LayerTask[] = [
  {
    name: 'prefetchEngine',
    init: () => import('./prefetch-engine'),
  },
  {
    name: 'contextMemory',
    init: () => import('./context-memory'),
  },
  {
    name: 'securityLayer',
    init: () => import('./security-layer'),
  },
  {
    name: 'idleQueue',
    init: () => import('./idle-queue'),
  },
];

const LAYER_3: LayerTask[] = [
  {
    name: 'highPerfEngine',
    init: () => import('./high-perf-engine'),
  },
  {
    name: 'webVitals',
    init: () => import('./web-vitals-monitor'),
  },
  {
    name: 'anomalyDetector',
    init: () => import('./anomaly-detector'),
  },
];

// ── Runner ────────────────────────────────────────────────────────────────────

async function runLayer(
  layerIndex: number,
  tasks: LayerTask[]
): Promise<void> {
  const label = `[boot-orchestrator] Layer ${layerIndex}`;
  const t0 = performance.now();
  console.debug(`${label} — starting (${tasks.length} tasks)`);

  await Promise.all(
    tasks.map(async task => {
      const taskT0 = performance.now();
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod: any = await task.init();
        // Try common export names: named export matching task.name, then .init(), then default
        const candidate =
          mod[task.name] ??
          mod[task.name.replace(/([A-Z])/g, c => c.toLowerCase())] ??
          mod.default ??
          mod;
        const initFn: InitFn | undefined =
          typeof candidate === 'function'
            ? candidate
            : typeof candidate?.init === 'function'
            ? candidate.init.bind(candidate)
            : undefined;
        if (typeof initFn === 'function') {
          await initFn();
        }
        if (import.meta.env.DEV) {
          console.debug(
            `  ✓ ${task.name} (${(performance.now() - taskT0).toFixed(1)}ms)`
          );
        }
      } catch (err) {
        // Non-fatal: one lib failing must not block the layer
        console.warn(`  ✗ ${task.name} failed:`, err);
      }
    })
  );

  console.debug(`${label} — done in ${(performance.now() - t0).toFixed(1)}ms`);
}

// ── Public API ────────────────────────────────────────────────────────────────

async function start(): Promise<void> {
  const t0 = performance.now();
  console.debug('[boot-orchestrator] starting');

  // Layer 0 — immediate, before first React paint
  await runLayer(0, LAYER_0);

  // Layer 1 — after first render (100ms delay so React paints first)
  await new Promise<void>(resolve =>
    setTimeout(async () => {
      await runLayer(1, LAYER_1);
      resolve();
    }, 100)
  );

  // Layer 2 — after UI is visible (500ms)
  await new Promise<void>(resolve =>
    setTimeout(async () => {
      await runLayer(2, LAYER_2);
      resolve();
    }, 500)
  );

  // Layer 3 — idle time
  await new Promise<void>(resolve => {
    const run = async () => {
      await runLayer(3, LAYER_3);
      resolve();
    };
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => run(), { timeout: 5000 });
    } else {
      setTimeout(run, 2000);
    }
  });

  console.debug(
    `[boot-orchestrator] all layers done in ${(performance.now() - t0).toFixed(1)}ms`
  );
}

export const bootOrchestrator = { start };
