import type { JsonValue } from "../../types";
import { executeConfidential, type EnclaveProvider } from "../../resilience";

export type SecurityPolicy = {
  blockedInputPatterns?: RegExp[];
  blockedOutputPatterns?: RegExp[];
  requireApprovalForSensitive?: boolean;
};
export type SecurityCheck = { allowed: boolean; reasons: string[] };

export class BiDirectionalGuardrails {
  constructor(private readonly policy: SecurityPolicy = {}) {}
  checkInput(value: string): SecurityCheck {
    const reasons = (this.policy.blockedInputPatterns ?? [/ignore\s+previous\s+instructions/i])
      .filter((pattern) => pattern.test(value))
      .map((pattern) => `Input matched ${pattern}`);
    return { allowed: reasons.length === 0, reasons };
  }
  checkOutput(value: string): SecurityCheck {
    const reasons = (this.policy.blockedOutputPatterns ?? [])
      .filter((pattern) => pattern.test(value))
      .map((pattern) => `Output matched ${pattern}`);
    return { allowed: reasons.length === 0, reasons };
  }
}

export class TEEHardwareEnclave {
  constructor(private readonly provider: EnclaveProvider) {}
  isAvailable(): boolean { return this.provider.isAvailable(); }
  execute<T>(operation: () => Promise<T>): Promise<T> { return executeConfidential(this.provider, operation); }
}

export class SelfHealingEngine {
  constructor(private readonly maxAttempts = 3) {}
  async isolateAndRecover<T>(
    operation: (attempt: number) => Promise<T>,
    recover: (error: unknown, attempt: number) => Promise<void>,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try { return await operation(attempt); } catch (error) {
        lastError = error;
        if (attempt < this.maxAttempts) await recover(error, attempt);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

export function serializeSecurityState(state: Record<string, JsonValue>): string {
  return JSON.stringify(state);
}
