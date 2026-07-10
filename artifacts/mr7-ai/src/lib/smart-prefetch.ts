/**
 * Smart Prefetch — predicts and pre-warms likely follow-up AI responses.
 * Uses message pattern analysis, conversation context, and idle time.
 * Stores pre-warmed responses in httpCache for instant delivery.
 */

import { httpCache } from "./http-cache";
import { idleQueue } from "./idle-queue";
import { connectionQuality } from "./connection-quality";

interface PrefetchRule {
  id: string;
  trigger: RegExp | string;
  prompt: string;
  ttlMs?: number;
  priority?: number;
}

// Common follow-up patterns in cybersecurity context
const PREFETCH_RULES: PrefetchRule[] = [
  {
    id: "explain-code",
    trigger: /```(python|bash|sh|javascript|typescript)/i,
    prompt: "Explain this code step by step",
    ttlMs: 60_000,
    priority: 10,
  },
  {
    id: "scan-followup",
    trigger: /nmap|masscan|zmap/i,
    prompt: "What are the next steps after this scan?",
    ttlMs: 120_000,
    priority: 8,
  },
  {
    id: "vuln-followup",
    trigger: /CVE-\d{4}-\d+/i,
    prompt: "How to exploit this vulnerability?",
    ttlMs: 120_000,
    priority: 9,
  },
  {
    id: "error-debug",
    trigger: /error:|exception:|traceback|stack trace/i,
    prompt: "How to fix this error?",
    ttlMs: 60_000,
    priority: 7,
  },
];

interface PrefetchConfig {
  model: string;
  provider?: string;
  apiKey?: string;
  apiBaseURL?: string;
}

class SmartPrefetch {
  private config: PrefetchConfig = { model: "gpt-4o-mini" };
  private pendingPrefetches = new Set<string>();
  private stats = { triggered: 0, hits: 0, skipped: 0 };

  configure(cfg: Partial<PrefetchConfig>) {
    this.config = { ...this.config, ...cfg };
  }

  /** Analyze a message and trigger prefetch if rules match */
  analyzeAndPrefetch(content: string, chatId: string) {
    // Skip on slow connections or save-data mode
    if (connectionQuality.isSlow || connectionQuality.current.saveData) {
      this.stats.skipped++;
      return;
    }

    for (const rule of PREFETCH_RULES) {
      const pattern = typeof rule.trigger === "string"
        ? new RegExp(rule.trigger, "i")
        : rule.trigger;
      if (!pattern.test(content)) continue;

      const cacheKey = `prefetch:${chatId}:${rule.id}`;
      if (this.pendingPrefetches.has(cacheKey)) continue;
      if (httpCache.get(cacheKey)) continue; // already cached

      this.pendingPrefetches.add(cacheKey);
      this.stats.triggered++;

      // Schedule during idle time
      idleQueue.add(`prefetch-${rule.id}-${chatId}`, async () => {
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              messages: [{ role: "user", content: rule.prompt }],
              model: this.config.model,
              provider: this.config.provider,
              stream: false,
              maxTokens: 500,
            }),
          });
          if (res.ok) {
            // Drain the SSE stream quickly
            const text = await res.text();
            const lastLine = text.split("\n").reverse().find(l => l.startsWith("data:"));
            if (lastLine) {
              try {
                const parsed = JSON.parse(lastLine.slice(5));
                if (parsed.content) {
                  httpCache.set(cacheKey, { content: parsed.content, prompt: rule.prompt }, rule.ttlMs ?? 60_000);
                }
              } catch { /* ignore */ }
            }
          }
        } catch { /* ignore network errors */ }
        finally {
          this.pendingPrefetches.delete(cacheKey);
        }
      }, 5000);
    }
  }

  /** Check if a prefetched response is available */
  getPrefetched(chatId: string, prompt: string): string | null {
    for (const rule of PREFETCH_RULES) {
      const cacheKey = `prefetch:${chatId}:${rule.id}`;
      const cached = httpCache.get<{ content: string; prompt: string }>(cacheKey);
      if (cached && cached.prompt.toLowerCase() === prompt.toLowerCase()) {
        this.stats.hits++;
        return cached.content;
      }
    }
    return null;
  }

  get stats_() { return { ...this.stats }; }
  get pendingCount() { return this.pendingPrefetches.size; }
}

export const smartPrefetch = new SmartPrefetch();
