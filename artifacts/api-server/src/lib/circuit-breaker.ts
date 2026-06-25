/**
 * Circuit Breaker + Retry Engine
 * Prevents cascade failures by tracking error rates and cutting
 * connections to failing services automatically.
 */

import { logger } from "./logger";

type CircuitState = "closed" | "open" | "half-open";

interface CircuitConfig {
  failureThreshold?: number;
  successThreshold?: number;
  timeoutMs?: number;
  halfOpenRequests?: number;
}

interface CircuitStats {
  failures: number;
  successes: number;
  lastFailure: number;
  state: CircuitState;
  totalRequests: number;
  totalFailures: number;
}

class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private successes = 0;
  private lastFailure = 0;
  private halfOpenCount = 0;
  private totalRequests = 0;
  private totalFailures = 0;

  constructor(
    private name: string,
    private config: Required<CircuitConfig>,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.totalRequests++;

    if (this.state === "open") {
      const elapsed = Date.now() - this.lastFailure;
      if (elapsed < this.config.timeoutMs) {
        throw new Error(`Circuit breaker OPEN for "${this.name}" — retry after ${Math.ceil((this.config.timeoutMs - elapsed) / 1000)}s`);
      }
      this.state = "half-open";
      this.halfOpenCount = 0;
      logger.info({ circuit: this.name }, "Circuit breaker entering HALF-OPEN state");
    }

    if (this.state === "half-open") {
      if (this.halfOpenCount >= this.config.halfOpenRequests) {
        throw new Error(`Circuit breaker HALF-OPEN limit reached for "${this.name}"`);
      }
      this.halfOpenCount++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }

  private onSuccess(): void {
    this.failures = 0;
    this.successes++;
    if (this.state === "half-open") {
      if (this.successes >= this.config.successThreshold) {
        this.state = "closed";
        logger.info({ circuit: this.name }, "Circuit breaker CLOSED (recovered)");
      }
    }
  }

  private onFailure(err: Error): void {
    this.failures++;
    this.totalFailures++;
    this.lastFailure = Date.now();
    this.successes = 0;
    if (this.state === "half-open") {
      this.state = "open";
      logger.warn({ circuit: this.name, err: err.message }, "Circuit breaker re-opened from HALF-OPEN");
    } else if (this.failures >= this.config.failureThreshold) {
      this.state = "open";
      logger.warn({ circuit: this.name, failures: this.failures, err: err.message }, "Circuit breaker OPENED");
    }
  }

  stats(): CircuitStats {
    return {
      failures: this.failures,
      successes: this.successes,
      lastFailure: this.lastFailure,
      state: this.state,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
    };
  }

  reset(): void {
    this.state = "closed";
    this.failures = 0;
    this.successes = 0;
    logger.info({ circuit: this.name }, "Circuit breaker manually reset");
  }
}

class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  get(name: string, config: CircuitConfig = {}): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker(name, {
        failureThreshold: config.failureThreshold ?? 5,
        successThreshold: config.successThreshold ?? 2,
        timeoutMs:        config.timeoutMs ?? 30000,
        halfOpenRequests: config.halfOpenRequests ?? 3,
      }));
    }
    return this.breakers.get(name)!;
  }

  statsAll(): Record<string, CircuitStats> {
    const result: Record<string, CircuitStats> = {};
    for (const [name, breaker] of this.breakers.entries()) {
      result[name] = breaker.stats();
    }
    return result;
  }
}

export const circuitRegistry = new CircuitBreakerRegistry();

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    jitter?: boolean;
    shouldRetry?: (err: Error, attempt: number) => boolean;
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 500,
    maxDelayMs = 10000,
    jitter = true,
    shouldRetry = (_, attempt) => attempt < maxAttempts,
  } = options;

  let lastError: Error = new Error("Unknown error");

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === maxAttempts || !shouldRetry(lastError, attempt)) break;
      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
      const jitterMs = jitter ? Math.random() * delay * 0.3 : 0;
      await new Promise(r => setTimeout(r, delay + jitterMs));
    }
  }
  throw lastError;
}

export async function withCircuitAndRetry<T>(
  circuitName: string,
  fn: () => Promise<T>,
  circuitConfig?: CircuitConfig,
  retryOptions?: Parameters<typeof withRetry>[1],
): Promise<T> {
  const breaker = circuitRegistry.get(circuitName, circuitConfig);
  return breaker.execute(() => withRetry(fn, retryOptions));
}
