/**
 * Telemetry — Sentry + OpenTelemetry
 * ─────────────────────────────────────
 * Error tracking (Sentry) and distributed tracing (OpenTelemetry).
 * Must be initialized BEFORE anything else in index.ts.
 *
 * Set SENTRY_DSN to enable Sentry.
 * Set OTEL_EXPORTER_OTLP_ENDPOINT to enable OpenTelemetry.
 */

import { logger } from "./logger.js";

let sentryInitialized = false;
let otelInitialized = false;

// ── Sentry ────────────────────────────────────────────────────────────────────
export async function initSentry(): Promise<void> {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info("[telemetry] SENTRY_DSN not set — Sentry disabled");
    return;
  }

  try {
    const Sentry = await import("@sentry/node");
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV ?? "development",
      release: process.env.APP_VERSION ?? "1.0.0",
      tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
      profilesSampleRate: 0.1,
      integrations: [
        Sentry.httpIntegration(),
        Sentry.expressIntegration(),
        Sentry.postgresIntegration(),
      ],
      beforeSend(event) {
        // Scrub sensitive data
        if (event.request?.data) {
          const data = event.request.data as Record<string, unknown>;
          for (const key of ["password", "apiKey", "token", "secret", "key"]) {
            if (data[key]) data[key] = "[REDACTED]";
          }
        }
        return event;
      },
    });
    sentryInitialized = true;
    logger.info("[telemetry] Sentry initialized");
  } catch (err) {
    logger.warn({ err }, "[telemetry] Sentry init failed");
  }
}

// ── OpenTelemetry ─────────────────────────────────────────────────────────────
export async function initOpenTelemetry(): Promise<void> {
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  if (!endpoint) {
    logger.info("[telemetry] OTEL_EXPORTER_OTLP_ENDPOINT not set — OpenTelemetry disabled");
    return;
  }

  try {
    const { NodeSDK } = await import("@opentelemetry/sdk-node");
    const { getNodeAutoInstrumentations } = await import("@opentelemetry/auto-instrumentations-node");
    const { OTLPTraceExporter } = await import("@opentelemetry/exporter-trace-otlp-http");
    const resourcesMod = await import("@opentelemetry/resources");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Resource = ((resourcesMod as any).Resource ?? (resourcesMod as any).default) as { new(attrs: Record<string, string>): unknown };
    const { SEMRESATTRS_SERVICE_NAME } = await import("@opentelemetry/semantic-conventions");

    const sdk = new NodeSDK({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resource: new Resource({ [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME ?? "mr7ai-api" }) as any,
      traceExporter: new OTLPTraceExporter({ url: endpoint }),
      instrumentations: [getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
      })],
    });

    sdk.start();

    process.on("SIGTERM", async () => {
      await sdk.shutdown();
    });

    otelInitialized = true;
    logger.info({ endpoint }, "[telemetry] OpenTelemetry initialized");
  } catch (err) {
    logger.warn({ err }, "[telemetry] OpenTelemetry init failed — package may not be installed");
  }
}

// ── Error capture ─────────────────────────────────────────────────────────────
export async function captureException(error: unknown, context?: Record<string, unknown>): Promise<void> {
  if (!sentryInitialized) return;
  try {
    const Sentry = await import("@sentry/node");
    Sentry.withScope((scope) => {
      if (context) {
        scope.setExtras(context);
      }
      Sentry.captureException(error);
    });
  } catch {
    // Non-fatal
  }
}

export async function captureMessage(message: string, level: "info" | "warning" | "error" = "info"): Promise<void> {
  if (!sentryInitialized) return;
  try {
    const Sentry = await import("@sentry/node");
    Sentry.captureMessage(message, level);
  } catch {
    // Non-fatal
  }
}

export function isSentryEnabled(): boolean { return sentryInitialized; }
export function isOtelEnabled(): boolean { return otelInitialized; }

/** Initialize all telemetry — call once at app startup */
export async function initTelemetry(): Promise<void> {
  await Promise.all([initSentry(), initOpenTelemetry()]);
}
