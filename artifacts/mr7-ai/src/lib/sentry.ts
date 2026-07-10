/**
 * Sentry — frontend error tracking
 * ─────────────────────────────────
 * Set VITE_SENTRY_DSN to enable. No-op (and no bundle cost beyond the
 * already-installed dependency) when unset, so local/dev builds stay quiet.
 */
import * as Sentry from "@sentry/react";

let initialized = false;

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) {
    if (import.meta.env.DEV) {
      console.info("[sentry] VITE_SENTRY_DSN not set — Sentry disabled");
    }
    return;
  }

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      release: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? "1.0.0",
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
      beforeSend(event) {
        if (event.request?.headers) {
          for (const key of ["Authorization", "Cookie", "authorization", "cookie"]) {
            delete event.request.headers[key];
          }
        }
        return event;
      },
    });
    initialized = true;
  } catch (err) {
    console.warn("[sentry] init failed", err);
  }
}

export function isSentryEnabled(): boolean {
  return initialized;
}

export function captureException(error: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.withScope((scope) => {
    if (context) scope.setExtras(context);
    Sentry.captureException(error);
  });
}
