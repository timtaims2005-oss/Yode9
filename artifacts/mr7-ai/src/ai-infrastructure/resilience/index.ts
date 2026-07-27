import type { JsonValue } from "../types";

export type ReplaySnapshot = { id: string; sequence: number; state: JsonValue; event: string; timestamp: number };
export type RecoveryAction = "retry" | "fallback" | "reroute" | "manual";
export type HealingPlan = { action: RecoveryAction; reason: string; attempt: number; safe: boolean };
export type EnclaveProvider = { execute<T>(operation: () => Promise<T>): Promise<T>; isAvailable(): boolean };

export class DeterministicReplay {
  private readonly snapshots: ReplaySnapshot[] = [];
  checkpoint(event: string, state: JsonValue): ReplaySnapshot {
    const snapshot = { id: `snapshot-${this.snapshots.length + 1}`, sequence: this.snapshots.length, state: structuredClone(state), event, timestamp: Date.now() };
    this.snapshots.push(snapshot);
    return snapshot;
  }
  replay(fromSequence = 0): ReplaySnapshot[] { return this.snapshots.filter((snapshot) => snapshot.sequence >= fromSequence).map((snapshot) => structuredClone(snapshot)); }
  latest(): ReplaySnapshot | undefined { return this.snapshots.at(-1); }
  clear(): void { this.snapshots.length = 0; }
}

export class SelfHealingOrchestrator {
  constructor(private readonly maxAttempts = 3) {}
  plan(error: unknown, attempt: number, options: { canRetry?: boolean; hasFallback?: boolean; canReroute?: boolean } = {}): HealingPlan {
    if (attempt >= this.maxAttempts) return { action: "manual", reason: "Maximum automatic recovery attempts reached.", attempt, safe: false };
    if (options.canRetry !== false) return { action: "retry", reason: error instanceof Error ? error.message : String(error), attempt, safe: true };
    if (options.hasFallback) return { action: "fallback", reason: "Primary path failed; fallback is available.", attempt, safe: true };
    if (options.canReroute) return { action: "reroute", reason: "Network or provider route can be changed.", attempt, safe: true };
    return { action: "manual", reason: "No safe automatic recovery path is configured.", attempt, safe: false };
  }
  async run<T>(operation: (attempt: number) => Promise<T>, options?: { canRetry?: boolean; hasFallback?: boolean; canReroute?: boolean }): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try { return await operation(attempt); } catch (error) {
        lastError = error;
        if (this.plan(error, attempt, options).action === "manual") break;
      }
    }
    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

export const noOpEnclave: EnclaveProvider = {
  isAvailable: () => false,
  async execute<T>(operation: () => Promise<T>): Promise<T> { return operation(); },
};

export async function executeConfidential<T>(provider: EnclaveProvider, operation: () => Promise<T>): Promise<T> {
  if (!provider.isAvailable()) throw new Error("Confidential enclave is unavailable; refusing sensitive operation.");
  return provider.execute(operation);
}
