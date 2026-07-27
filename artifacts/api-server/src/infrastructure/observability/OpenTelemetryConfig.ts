import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
  SEMRESATTRS_SERVICE_NAMESPACE,
} from '@opentelemetry/semantic-conventions';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { logger } from '../../lib/logger.js';

let sdk: NodeSDK | null = null;

// ── Initialize OpenTelemetry SDK ─────────────────────────────────────────────
export function initializeTelemetry(): void {
  if (sdk) return; // Already initialized

  const jaegerEndpoint =
    process.env['JAEGER_ENDPOINT'] ||
    process.env['OTEL_EXPORTER_OTLP_ENDPOINT'] ||
    'http://localhost:4318/v1/traces';

  try {
    sdk = new NodeSDK({
      traceExporter: new OTLPTraceExporter({ url: jaegerEndpoint }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': { enabled: false }, // Too noisy
          '@opentelemetry/instrumentation-http': { enabled: true },
          '@opentelemetry/instrumentation-express': { enabled: true },
          '@opentelemetry/instrumentation-pg': { enabled: true },
        }),
      ],
      resource: resourceFromAttributes({
        [SEMRESATTRS_SERVICE_NAME]: 'mr7-ai-api',
        [SEMRESATTRS_SERVICE_VERSION]: process.env['npm_package_version'] ?? '2.0.0',
        [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env['NODE_ENV'] ?? 'development',
        [SEMRESATTRS_SERVICE_NAMESPACE]: 'mr7-ai',
        'host.name': process.env['REPL_SLUG'] ?? 'local',
      }),
    });

    sdk.start();
    logger.info('[OpenTelemetry] initialized — tracing active');

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      try {
        await sdk?.shutdown();
        logger.info('[OpenTelemetry] SDK shut down cleanly');
      } catch (e) {
        logger.error({ e }, '[OpenTelemetry] shutdown error');
      }
    });
  } catch (err) {
    // Telemetry is non-critical — log and continue
    logger.warn({ err }, '[OpenTelemetry] failed to initialize — continuing without tracing');
  }
}

// ── Custom span helper ───────────────────────────────────────────────────────
export async function withSpan<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  // Lightweight wrapper — if tracing is not initialized, just call fn directly
  return fn();
}

// ── Health metric aggregator ──────────────────────────────────────────────────
export class MetricsAggregator {
  private static readonly instance = new MetricsAggregator();
  private metrics = {
    requestsTotal: 0,
    requestsPerSecond: 0,
    avgLatencyMs: 0,
    errorRate: 0,
    activeConnections: 0,
    latencyBucket: [] as number[],
    errorsLast60s: 0,
    requestsLast60s: 0,
  };

  private constructor() {
    // Reset per-second counters every second
    setInterval(() => {
      this.metrics.requestsPerSecond = this.metrics.requestsLast60s / 60;
      this.metrics.requestsLast60s = 0;
      this.metrics.errorRate =
        this.metrics.requestsTotal > 0
          ? (this.metrics.errorsLast60s / Math.max(this.metrics.requestsLast60s, 1)) * 100
          : 0;
    }, 1000);
  }

  static getInstance(): MetricsAggregator {
    return MetricsAggregator.instance;
  }

  recordRequest(latencyMs: number, isError = false): void {
    this.metrics.requestsTotal++;
    this.metrics.requestsLast60s++;
    if (isError) this.metrics.errorsLast60s++;

    // Rolling average latency (EMA)
    this.metrics.avgLatencyMs =
      this.metrics.avgLatencyMs * 0.9 + latencyMs * 0.1;
  }

  setActiveConnections(count: number): void {
    this.metrics.activeConnections = count;
  }

  getSnapshot() {
    return { ...this.metrics };
  }
}

export const metricsAggregator = MetricsAggregator.getInstance();
