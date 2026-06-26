import { createRoot } from "react-dom/client";
import { renderBudget } from './lib/render-budget';
import { networkResilience } from './lib/network-resilience';
import { smartCache } from './lib/smart-cache';
import { jankDetector } from './lib/jank-detector';
import { bootOrchestrator } from './lib/boot-orchestrator';
import { schedulerCoordinator } from './lib/scheduler-coordinator';
import { paintSynchronizer } from './lib/paint-synchronizer';
import { networkMultiplexer } from './lib/network-multiplexer';
import { cognitiveCache } from './lib/cognitive-cache';
import { zeroCopyBuffer } from './lib/zero-copy-buffer';
import { circuitBreaker } from './lib/circuit-breaker';
import { turboGC } from './lib/turbo-gc';
import { quantumScheduler } from './lib/quantum-scheduler';
import { speculativeExecution } from './lib/speculative-execution';
import { neuralPrefetch } from './lib/neural-prefetch';
import { Router, Switch, Route } from "wouter";
import App from "./App";
import LandingPage from "./pages/landing";
import PrivacyPage from "./pages/privacy";
import TermsPage from "./pages/terms";
import FAQPage from "./pages/faq";
import ContactPage from "./pages/contact";
import RoadmapPage from "./pages/roadmap";
import NotFound from "./pages/not-found";
import CyberCommand4D from "./pages/CyberCommand4D";
import "./index.css";

const INTERNAL_KEY = import.meta.env.VITE_INTERNAL_KEY as string | undefined;

// ── Error monitor — captures unhandled errors and promise rejections ──────────
function initErrorMonitor() {
  const MAX_ERRORS = 50;
  const errorLog: Array<{ ts: number; type: string; message: string; stack?: string }> = [];

  function record(type: string, message: string, stack?: string) {
    errorLog.push({ ts: Date.now(), type, message, stack });
    if (errorLog.length > MAX_ERRORS) errorLog.shift();
    // Expose for debugging console: window.__kaliErrors
    (window as unknown as Record<string, unknown>).__kaliErrors = errorLog;
  }

  window.addEventListener("error", (e: ErrorEvent) => {
    record("uncaught", e.message, e.error?.stack);
    if (import.meta.env.DEV) {
      console.error("[KaliGPT Error Monitor]", e.message, e.error);
    }
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
    const stack = e.reason instanceof Error ? e.reason.stack : undefined;
    record("unhandledrejection", msg, stack);
    if (import.meta.env.DEV) {
      console.error("[KaliGPT Promise Monitor]", e.reason);
    }
  });
}

// ── PWA Service Worker registration ──────────────────────────────────────────
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then(reg => {
        if (import.meta.env.DEV) console.info("[KaliGPT SW] Registered:", reg.scope);
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              // New SW installed — post update event for in-app banner
              window.dispatchEvent(new CustomEvent("kali:sw-update-ready"));
            }
          });
        });
      })
      .catch(err => {
        if (import.meta.env.DEV) console.warn("[KaliGPT SW] Registration failed:", err);
      });
  });
}

// Boot monitors before React renders
initErrorMonitor();
registerServiceWorker();

// ── Global CSRF + internal-key fetch interceptor ─────────────────────────────
// All non-GET requests to /api/* automatically receive:
//   - X-CSRF-Token header (fetched & cached from GET /api/csrf-token)
//   - X-Internal-Key header (if VITE_INTERNAL_KEY is set)
// ─────────────────────────────────────────────────────────────────────────────
let _csrfToken: string | null = null;
let _csrfFetching: Promise<string | null> | null = null;

async function fetchCsrfToken(): Promise<string | null> {
  if (_csrfToken) return _csrfToken;
  if (_csrfFetching) return _csrfFetching;
  _csrfFetching = (async () => {
    try {
      const res = await fetch("/api/csrf-token", { credentials: "include" });
      if (!res.ok) return null;
      const { token } = await res.json();
      _csrfToken = token as string;
      return _csrfToken;
    } catch {
      return null;
    } finally {
      _csrfFetching = null;
    }
  })();
  return _csrfFetching;
}

// Refresh CSRF token every 20 minutes (server session TTL is 7 days, but
// tokens should be rotated periodically for better security)
setInterval(() => { _csrfToken = null; }, 20 * 60 * 1000);

const _nativeFetch = window.fetch.bind(window);

window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const url = typeof input === "string" ? input
    : input instanceof URL ? input.href
    : (input as Request).url;

  const isApi = url.startsWith("/api/") || url.includes(location.origin + "/api/");
  const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (isApi && isMutating) {
    const headers = new Headers(init?.headers);
    // Inject internal key if present
    if (INTERNAL_KEY && !headers.has("x-internal-key")) {
      headers.set("x-internal-key", INTERNAL_KEY);
    }
    // Inject CSRF token (skip the csrf-token endpoint itself to avoid infinite loop)
    if (!url.includes("/api/csrf-token") && !url.includes("/api/stripe/webhook")) {
      const csrf = await fetchCsrfToken();
      if (csrf) headers.set("x-csrf-token", csrf);
    }
    return _nativeFetch(input, { ...init, headers, credentials: "include" });
  }

  if (isApi && INTERNAL_KEY) {
    const headers = new Headers(init?.headers);
    if (!headers.has("x-internal-key")) headers.set("x-internal-key", INTERNAL_KEY);
    return _nativeFetch(input, { ...init, headers });
  }

  return _nativeFetch(input, init);
};

// Pre-warm the CSRF token before any user interaction
fetchCsrfToken().catch(() => {});

createRoot(document.getElementById("root")!).render(
  <Router>
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/app" component={App} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/faq" component={FAQPage} />
      <Route path="/contact" component={ContactPage} />
      <Route path="/roadmap" component={RoadmapPage} />
      <Route path="/cyber4d" component={CyberCommand4D} />
      <Route component={NotFound} />
    </Switch>
  </Router>
);

// ── Performance & resilience systems ─────────────────────────────────────────
// renderBudget is self-initialising (no init() — use renderBudget.track() per component)
void renderBudget; // imported for side-effect bundling
networkResilience.init();
smartCache.init();
jankDetector.init();
bootOrchestrator.start();
schedulerCoordinator.init();
paintSynchronizer.init();
networkMultiplexer.connect();
cognitiveCache.init();

// ── Advanced performance systems ──────────────────────────────────────────────
zeroCopyBuffer.init();
circuitBreaker.init();
turboGC.init();
quantumScheduler.init();
speculativeExecution.init();
neuralPrefetch.init();
