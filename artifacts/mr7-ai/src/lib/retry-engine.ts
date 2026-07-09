export type RetryConfig = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  retryOn?: (err: unknown) => boolean;
};

export type RetryStats = {
  totalAttempts: number;
  totalSuccesses: number;
  totalFailures: number;
  totalRetries: number;
};

const DEFAULT_RETRY_ON = (err: unknown): boolean => {
  if (err instanceof DOMException && err.name === "AbortError") return false;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("401") || msg.includes("403") || msg.includes("api key")) return false;
  }
  return true;
};

class RetryEngine {
  private stats: RetryStats = { totalAttempts: 0, totalSuccesses: 0, totalFailures: 0, totalRetries: 0 };

  getStats(): RetryStats { return { ...this.stats }; }

  async withRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig = {},
    signal?: AbortSignal,
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelayMs = 800,
      maxDelayMs = 8000,
      backoffFactor = 2,
      retryOn = DEFAULT_RETRY_ON,
    } = config;

    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      this.stats.totalAttempts++;
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      try {
        const result = await fn();
        this.stats.totalSuccesses++;
        return result;
      } catch (err) {
        lastErr = err;
        if (attempt === maxAttempts || !retryOn(err)) {
          this.stats.totalFailures++;
          throw err;
        }
        this.stats.totalRetries++;
        const delay = Math.min(baseDelayMs * Math.pow(backoffFactor, attempt - 1), maxDelayMs);
        const jitter = delay * 0.2 * Math.random();
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, delay + jitter);
          signal?.addEventListener("abort", () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); }, { once: true });
        });
      }
    }
    this.stats.totalFailures++;
    throw lastErr;
  }
}

export const retryEngine = new RetryEngine();
