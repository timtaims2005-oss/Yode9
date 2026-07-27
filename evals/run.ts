/**
 * Evals runner — Task 6
 *
 * Sends every scenario in scenarios.json to the live API and checks the response
 * against acceptance criteria (keywords, length, tool-call expectation, block expectation).
 *
 * Usage:
 *   pnpm run evals                  # uses default http://localhost:5000
 *   API_BASE=https://… pnpm run evals
 *
 * Exit code 0 if all pass, non-zero otherwise.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ────────────────────────────────────────────────────────────────────
const API_BASE = (process.env["API_BASE"] ?? "http://localhost:5000").replace(/\/$/, "");
const TIMEOUT_MS = 60_000;
// Inter-scenario delay prevents Groq free-tier TPM exhaustion across sequential requests.
// 5 s is safe for llama-3.1-8b-instant free tier (30 RPM / 20k TPM limit)
const INTER_SCENARIO_DELAY_MS = 5_000;

// ── Types ─────────────────────────────────────────────────────────────────────
interface Scenario {
  id: string;
  category: string;
  description: string;
  endpoint?: string; // optional custom endpoint, defaults to /api/chat
  request: Record<string, unknown>;
  accept: {
    keywords?: string[];
    blockKeywords?: string[];
    shouldNotContain?: string[];
    minLength?: number;
    maxLength?: number;
    expectToolCall?: boolean;
    expectBlocked?: boolean;
    jsonKey?: string; // for non-streaming JSON endpoints
  };
}

interface EvalResult {
  id: string;
  category: string;
  description: string;
  passed: boolean;
  failReason?: string;
  responsePreview?: string;
  durationMs: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function checkKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((k) => lower.includes(k.toLowerCase()));
}

function checkNoneOf(text: string, forbidden: string[]): boolean {
  const lower = text.toLowerCase();
  return !forbidden.some((k) => lower.includes(k.toLowerCase()));
}

// ── SSE line parser (buffered — handles JSON spanning chunk boundaries) ────────
/**
 * RFC 8895 SSE uses double-newline to delimit events.
 * Network chunks may split an event mid-line or mid-JSON.
 * This parser accumulates raw bytes, splits on full lines,
 * and only hands a `data:` line to JSON.parse once it ends
 * with a newline — so a fragmented JSON payload is never
 * parsed prematurely.
 */
class SSEParser {
  private buf = "";
  private readonly onEvent: (data: Record<string, unknown>) => void;

  constructor(onEvent: (data: Record<string, unknown>) => void) {
    this.onEvent = onEvent;
  }

  push(chunk: string): void {
    this.buf += chunk;
    // Process all complete lines (terminated by \n)
    let idx: number;
    while ((idx = this.buf.indexOf("\n")) !== -1) {
      const line = this.buf.slice(0, idx).replace(/\r$/, "");
      this.buf = this.buf.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const raw = line.slice(5).trim();
      if (!raw || raw === "[DONE]") continue;
      try {
        const parsed = JSON.parse(raw) as Record<string, unknown>;
        this.onEvent(parsed);
      } catch {
        // Incomplete JSON (shouldn't happen after buffering, but skip gracefully)
      }
    }
  }

  /** Flush any remaining buffer at stream end */
  flush(): void {
    const line = this.buf.trim();
    this.buf = "";
    if (!line.startsWith("data:")) return;
    const raw = line.slice(5).trim();
    if (!raw || raw === "[DONE]") return;
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      this.onEvent(parsed);
    } catch { /* ignore */ }
  }
}

// ── SSE collector ─────────────────────────────────────────────────────────────
async function collectSSE(
  url: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ text: string; toolCalls: string[]; blocked: boolean }> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => `HTTP ${res.status}`);
      return { text: errText, toolCalls: [], blocked: res.status === 403 };
    }

    const reader = res.body?.getReader();
    if (!reader) return { text: "", toolCalls: [], blocked: false };

    let full = "";
    const toolCalls: string[] = [];
    let blocked = false;
    const decoder = new TextDecoder();

    const parser = new SSEParser((parsed) => {
      if (parsed["content"]) full += String(parsed["content"]);
      if (parsed["tool_call"]) toolCalls.push(String((parsed["tool_call"] as any)?.tool ?? "unknown"));
      if (parsed["error"]) full += `[ERROR: ${parsed["error"]}]`;
      if (typeof parsed["content"] === "string") {
        const c = parsed["content"] as string;
        if (/guardrailBlocked|رفض.*تنفيذ|تم رفض/i.test(c)) blocked = true;
      }
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.flush();

    return { text: full, toolCalls, blocked };
  } finally {
    clearTimeout(tid);
  }
}

// ── JSON endpoint collector ───────────────────────────────────────────────────
async function callJsonEndpoint(
  url: string,
  body: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ data: Record<string, unknown> | null; blocked: boolean }> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json() as Record<string, unknown>;
    return { data, blocked: res.status === 403 };
  } catch {
    return { data: null, blocked: false };
  } finally {
    clearTimeout(tid);
  }
}

// ── Evaluate one scenario ─────────────────────────────────────────────────────
async function evalScenario(scenario: Scenario): Promise<EvalResult> {
  const start = Date.now();
  const { id, category, description, accept, endpoint } = scenario;

  try {
    const isJsonEndpoint = !!endpoint;
    const url = `${API_BASE}${endpoint ?? "/api/chat"}`;

    let text = "";
    let toolCalls: string[] = [];
    let blocked = false;

    if (isJsonEndpoint) {
      const { data, blocked: b } = await callJsonEndpoint(url, scenario.request, TIMEOUT_MS);
      blocked = b;
      const key = accept.jsonKey ?? "text";
      text = data ? String(data[key] ?? JSON.stringify(data)) : "";
    } else {
      const result = await collectSSE(url, scenario.request, TIMEOUT_MS);
      text = result.text;
      toolCalls = result.toolCalls;
      blocked = result.blocked;
    }

    const preview = text.slice(0, 200).replace(/\n/g, " ");

    // ── Check: expectBlocked ──
    if (accept.expectBlocked === true && !blocked && !checkKeywords(text, accept.blockKeywords ?? ["رفض", "blocked"])) {
      return { id, category, description, passed: false, failReason: "Expected request to be blocked but it wasn't", responsePreview: preview, durationMs: Date.now() - start };
    }
    if (accept.expectBlocked === false && blocked) {
      return { id, category, description, passed: false, failReason: "Request was blocked but should have been allowed", responsePreview: preview, durationMs: Date.now() - start };
    }

    // ── Check: length ──
    if (accept.minLength !== undefined && text.length < accept.minLength) {
      return { id, category, description, passed: false, failReason: `Response too short: ${text.length} chars (min ${accept.minLength})`, responsePreview: preview, durationMs: Date.now() - start };
    }
    if (accept.maxLength !== undefined && text.length > accept.maxLength) {
      return { id, category, description, passed: false, failReason: `Response too long: ${text.length} chars (max ${accept.maxLength})`, responsePreview: preview, durationMs: Date.now() - start };
    }

    // ── Check: keywords ──
    if (accept.keywords && accept.keywords.length > 0) {
      if (!checkKeywords(text, accept.keywords)) {
        return { id, category, description, passed: false, failReason: `Missing expected keywords (any of): ${accept.keywords.join(", ")}`, responsePreview: preview, durationMs: Date.now() - start };
      }
    }

    // ── Check: shouldNotContain ──
    if (accept.shouldNotContain && !checkNoneOf(text, accept.shouldNotContain)) {
      return { id, category, description, passed: false, failReason: `Response contains forbidden content: ${accept.shouldNotContain.join(", ")}`, responsePreview: preview, durationMs: Date.now() - start };
    }

    // ── Check: expectToolCall ──
    if (accept.expectToolCall && toolCalls.length === 0) {
      return { id, category, description, passed: false, failReason: "Expected at least one tool call but none was made", responsePreview: preview, durationMs: Date.now() - start };
    }

    return { id, category, description, passed: true, responsePreview: preview, durationMs: Date.now() - start };
  } catch (err) {
    return {
      id,
      category,
      description,
      passed: false,
      failReason: `Exception: ${err instanceof Error ? err.message : String(err)}`,
      durationMs: Date.now() - start,
    };
  }
}

// ── Format helpers ────────────────────────────────────────────────────────────
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    chat: "💬 Chat",
    tool_call: "🔧 Tool Call",
    tool_loop: "🔄 Tool Loop",
    artifact: "🎨 Artifact",
    guardrail: "🛡 Guardrail",
    thinking: "🧠 Thinking",
    utility: "⚙️  Utility",
  };
  return map[cat] ?? cat;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const scenariosPath = join(__dirname, "scenarios.json");
  const scenarios: Scenario[] = JSON.parse(readFileSync(scenariosPath, "utf-8"));

  console.log(`\n${BOLD}╔══════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}║         mr7-ai Eval Suite — ${scenarios.length} scenarios          ║${RESET}`);
  console.log(`${BOLD}╚══════════════════════════════════════════════════╝${RESET}`);
  console.log(`${DIM}API: ${API_BASE}${RESET}\n`);

  const results: EvalResult[] = [];

  // Run in series to avoid overwhelming the server (and to keep output ordered).
  // A small inter-scenario delay prevents Groq free-tier TPM exhaustion.
  for (let i = 0; i < scenarios.length; i++) {
    const scenario = scenarios[i];
    if (i > 0) await new Promise((r) => setTimeout(r, INTER_SCENARIO_DELAY_MS));
    process.stdout.write(`  ${DIM}[${scenario.id}]${RESET} ${scenario.description}… `);
    const result = await evalScenario(scenario);
    results.push(result);
    if (result.passed) {
      console.log(`${GREEN}✔ PASS${RESET} ${DIM}(${result.durationMs}ms)${RESET}`);
    } else {
      console.log(`${RED}✘ FAIL${RESET} ${DIM}(${result.durationMs}ms)${RESET}`);
      console.log(`      ${YELLOW}↳ ${result.failReason}${RESET}`);
      if (result.responsePreview) {
        console.log(`      ${DIM}Response preview: ${result.responsePreview.slice(0, 120)}${RESET}`);
      }
    }
  }

  // ── Summary by category ───────────────────────────────────────────────────
  const passed = results.filter((r) => r.passed);
  const failed = results.filter((r) => !r.passed);
  const categories = [...new Set(results.map((r) => r.category))];

  console.log(`\n${BOLD}────── Results by category ──────────────────────────${RESET}`);
  for (const cat of categories) {
    const catResults = results.filter((r) => r.category === cat);
    const catPassed = catResults.filter((r) => r.passed).length;
    const marker = catPassed === catResults.length ? GREEN : catPassed === 0 ? RED : YELLOW;
    console.log(`  ${marker}${categoryLabel(cat)}: ${catPassed}/${catResults.length}${RESET}`);
  }

  console.log(`\n${BOLD}────── Overall ──────────────────────────────────────${RESET}`);
  const pct = Math.round((passed.length / results.length) * 100);
  const overallColor = passed.length === results.length ? GREEN : passed.length > results.length * 0.7 ? YELLOW : RED;
  console.log(`  ${overallColor}${BOLD}${passed.length}/${results.length} passed (${pct}%)${RESET}\n`);

  if (failed.length > 0) {
    console.log(`${RED}Failed scenarios:${RESET}`);
    for (const r of failed) {
      console.log(`  • ${r.id} — ${r.failReason}`);
    }
    console.log();
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Evals runner crashed:", err);
  process.exit(2);
});
