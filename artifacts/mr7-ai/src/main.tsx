import { createRoot } from "react-dom/client";
import { initSentry, captureException } from './lib/sentry';
import { renderBudget } from './lib/render-budget';
import { networkResilience } from './lib/network-resilience';
import { smartCache } from './lib/smart-cache';
import { circuitBreaker } from './lib/circuit-breaker';
import { Router, Switch, Route, useLocation } from "wouter";
import { ClerkProvider } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import App from "./App";
import LandingPage from "./pages/landing";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import PrivacyPage from "./pages/privacy";
import TermsPage from "./pages/terms";
import StatusPage from "./pages/StatusPage";
import FAQPage from "./pages/faq";
import ContactPage from "./pages/contact";
import RoadmapPage from "./pages/roadmap";
import NotFound from "./pages/not-found";
import CyberCommand4D from "./pages/CyberCommand4D";
import ArtifactPreviewPage from "./pages/ArtifactPreviewPage";
import EcosystemControlCenter from "./pages/EcosystemControlCenter";
import "./index.css";

// ── Clerk setup (verbatim — see clerk-auth skill) ─────────────────────────────
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// Empty in dev (intentional), auto-set in prod — do NOT gate on NODE_ENV
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

const clerkAppearance = {
  theme: dark,
  cssLayerName: "clerk" as const,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
    socialButtonsPlacement: "bottom" as const,
    socialButtonsVariant: "blockButton" as const,
  },
  variables: {
    colorPrimary: "#e21227",
    colorForeground: "#f0ecff",
    colorMutedForeground: "#7368a0",
    colorDanger: "#f87171",
    colorBackground: "#13112a",
    colorInput: "#1a1830",
    colorInputForeground: "#f0ecff",
    colorNeutral: "#252245",
    fontFamily: "system-ui, -apple-system, sans-serif",
    borderRadius: "10px",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "w-[440px] max-w-full overflow-hidden rounded-2xl shadow-2xl",
    card: "!bg-[#0c0b18] !border !border-[#252245] !shadow-none !rounded-2xl",
    footer: "!bg-[#0c0b18] !border-t !border-[#252245] !shadow-none !rounded-b-2xl",
    headerTitle: "text-[#f0ecff] font-bold",
    headerSubtitle: "text-[#7368a0]",
    socialButtonsBlockButtonText: "text-[#f0ecff]",
    formFieldLabel: "text-[#a09bc0]",
    footerActionLink: "text-[#e21227] hover:text-[#ff3c3c]",
    footerActionText: "text-[#7368a0]",
    dividerText: "text-[#7368a0]",
    identityPreviewEditButton: "text-[#e21227]",
    formFieldSuccessText: "text-[#34d399]",
    alertText: "text-[#f0ecff]",
    logoBox: "mb-2",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "!bg-[#1a1830] !border !border-[#252245] hover:!border-[#e21227] hover:!bg-[#1a1830]",
    formButtonPrimary: "!bg-[#e21227] hover:!bg-[#ff3c3c] !text-white !font-bold !shadow-lg",
    formFieldInput: "!bg-[#1a1830] !border-[#252245] !text-[#f0ecff] focus:!border-[#e21227]",
    footerAction: "bg-transparent",
    dividerLine: "!bg-[#252245]",
    alert: "!bg-[#1a1830] !border-[#252245]",
    otpCodeFieldInput: "!bg-[#1a1830] !border-[#252245] !text-[#f0ecff]",
    formFieldRow: "gap-3",
    main: "gap-5",
  },
};

// ── ClerkProvider wrapper (needs wouter's setLocation hook) ───────────────────
function ClerkRouterAdapter({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      afterSignOutUrl={basePath || "/"}
      localization={{
        signIn: { start: { title: "مرحباً بعودتك", subtitle: "سجّل دخولك للوصول إلى MR7 AI" } },
        signUp: { start: { title: "إنشاء حساب جديد", subtitle: "انضم إلى MR7 AI اليوم" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      {children}
    </ClerkProvider>
  );
}

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
    captureException(e.error ?? e.message, { type: "uncaught" });
    if (import.meta.env.DEV) {
      console.error("[KaliGPT Error Monitor]", e.message, e.error);
    }
  });

  window.addEventListener("unhandledrejection", (e: PromiseRejectionEvent) => {
    const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
    const stack = e.reason instanceof Error ? e.reason.stack : undefined;
    record("unhandledrejection", msg, stack);
    captureException(e.reason, { type: "unhandledrejection" });
    if (import.meta.env.DEV) {
      console.error("[KaliGPT Promise Monitor]", e.reason);
    }
  });
}

// ── PWA Service Worker registration ──────────────────────────────────────────
// IMPORTANT: only ever register in production builds. Registering the SW in
// dev causes it to cache-first-serve stale JS/HTML bundles, so code fixes
// (e.g. button handlers) silently fail to appear until a hard cache purge —
// this previously masked real bug fixes during development.
function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) {
    // Defensively unregister any SW left over from earlier dev sessions and
    // clear its caches so local testing always reflects the latest code.
    navigator.serviceWorker.getRegistrations().then(regs => {
      regs.forEach(reg => reg.unregister());
    });
    if ("caches" in window) {
      caches.keys().then(keys => keys.forEach(k => caches.delete(k)));
    }
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then(reg => {
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
        console.warn("[KaliGPT SW] Registration failed:", err);
      });
  });
}

// Boot monitors before React renders
initSentry();
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
  <Router base={basePath}>
    <ClerkRouterAdapter>
      <Switch>
        {/* Public routes — always accessible */}
        <Route path="/" component={LandingPage} />
        <Route path="/privacy" component={PrivacyPage} />
        <Route path="/terms" component={TermsPage} />
        <Route path="/status" component={StatusPage} />
        <Route path="/faq" component={FAQPage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/roadmap" component={RoadmapPage} />
        <Route path="/artifact-preview" component={ArtifactPreviewPage} />
        {/* Auth routes — required by Clerk; /*? matches OAuth sub-paths */}
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        {/* Protected routes */}
        <Route path="/app" component={App} />
        <Route path="/ecosystem" component={EcosystemControlCenter} />
        <Route path="/cyber4d" component={CyberCommand4D} />
        <Route component={NotFound} />
      </Switch>
    </ClerkRouterAdapter>
  </Router>
);

// ── Performance & resilience systems ─────────────────────────────────────────
// Only real, functionally-used systems are initialised (drive OfflineQueueBanner /
// PerformanceCommandCenter UI). The rest of the "performance theater" modules
// (jank-detector RAF loop, boot-orchestrator's 14-module cascade, 16ms schedulers,
// mousemove/click speculative-prefetch listeners, IndexedDB pattern-learning caches)
// were pure overhead with no functional benefit — they ran continuously on the main
// thread and were disabled to eliminate lag/jank and improve responsiveness.
// renderBudget is self-initialising (no init() — use renderBudget.track() per component)
void renderBudget; // imported for side-effect bundling
networkResilience.init();
smartCache.init();
circuitBreaker.init();

import { operationModeEngine } from "./lib/operation-mode-engine";
operationModeEngine.init();
