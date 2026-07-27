/**
 * Local Engine Client — authenticated fetch wrapper for all local model
 * engine endpoints (/api/ollama/*, /api/local-engines/*, /api/local-proxy/*).
 *
 * Configuration (frontend):
 *   VITE_OLLAMA_API_KEY=<your-key>   in .env / Replit Secrets
 *
 * If VITE_OLLAMA_API_KEY is not set → passes through unauthenticated
 * (backward-compatible when server auth is also disabled).
 *
 * Usage:
 *   import { localFetch, getLocalEngineHeaders } from "@/lib/localEngineClient";
 *
 *   // Drop-in fetch replacement (recommended):
 *   const res = await localFetch("/api/ollama/status");
 *
 *   // Or spread headers into an existing call:
 *   const res = await fetch("/api/ollama/pull", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json", ...getLocalEngineHeaders() },
 *     body: JSON.stringify({ model }),
 *   });
 */

const API_KEY = (import.meta.env.VITE_OLLAMA_API_KEY as string | undefined ?? "").trim();

// Ngrok base URL for the local model engine
const NGROK_BASE_URL = (import.meta.env.VITE_OLLAMA_BASE_URL as string | undefined ?? "https://230b-2003-cb-5f1b-adc8-9145-de1e-fa46-3351.ngrok-free.app").trim().replace(/\/$/, "");

/**
 * Returns auth + ngrok headers for local engine requests.
 */
export function getLocalEngineHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "ngrok-skip-browser-warning": "true",
  };
  if (API_KEY) headers["Authorization"] = `Bearer ${API_KEY}`;
  return headers;
}

/**
 * Returns the configured Ngrok base URL for the local engine.
 */
export function getLocalEngineBaseUrl(): string {
  return NGROK_BASE_URL;
}

/**
 * Returns the default local engine endpoint (v1-compatible).
 */
export function getLocalEngineV1Url(): string {
  return `${NGROK_BASE_URL}/v1`;
}

/**
 * Drop-in replacement for `fetch()` — automatically attaches the API key
 * for local engine endpoint URLs. For all other URLs it behaves identically
 * to the native fetch.
 */
export async function localFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;

  const isLocalEngineUrl =
    url.includes("/api/ollama/") ||
    url.includes("/api/local-engines/") ||
    url.includes("/api/local-proxy/");

  if (!isLocalEngineUrl || !API_KEY) {
    return fetch(input, init);
  }

  const existingHeaders = init?.headers
    ? (init.headers instanceof Headers
        ? Object.fromEntries(init.headers.entries())
        : (Array.isArray(init.headers)
            ? Object.fromEntries(init.headers)
            : (init.headers as Record<string, string>)))
    : {};

  return fetch(input, {
    ...init,
    headers: {
      ...existingHeaders,
      ...getLocalEngineHeaders(),
    },
  });
}
