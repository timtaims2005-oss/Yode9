import { createRoot } from "react-dom/client";
import { Router, Switch, Route } from "wouter";
import App from "./App";
import LandingPage from "./pages/landing";
import PrivacyPage from "./pages/privacy";
import TermsPage from "./pages/terms";
import FAQPage from "./pages/faq";
import ContactPage from "./pages/contact";
import RoadmapPage from "./pages/roadmap";
import NotFound from "./pages/not-found";
import "./index.css";

const INTERNAL_KEY = import.meta.env.VITE_INTERNAL_KEY as string | undefined;

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
      <Route component={NotFound} />
    </Switch>
  </Router>
);
