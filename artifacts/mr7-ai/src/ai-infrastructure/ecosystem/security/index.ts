import { checkInputGuardrails, checkOutputGuardrails, type GuardrailPolicy, type GuardrailResult } from "../../safety/guardrails";
import type { JsonValue } from "../../types";

export class BiDirectionalGuardrails {
  constructor(private readonly policy: GuardrailPolicy = {}) {}
  input(text: string): GuardrailResult { return checkInputGuardrails(text, this.policy); }
  output(text: string): GuardrailResult { return checkOutputGuardrails(text, this.policy); }
}

export type RedTeamCase = { id: string; input: string; expectedBlocked: boolean };
export class AutomatedRedTeamingScanner {
  scan(cases: RedTeamCase[]): { id: string; passed: boolean; blocked: boolean }[] {
    return cases.map((test) => ({ id: test.id, blocked: !this.input(test.input).allowed, passed: !this.input(test.input).allowed === test.expectedBlocked }));
  }
  private input(input: string): GuardrailResult { return checkInputGuardrails(input); }
}

export type TEECalculationProvider = { isAvailable(): boolean; execute<T>(operation: () => Promise<T>): Promise<T> };
export const unavailableTEE: TEECalculationProvider = { isAvailable: () => false, execute: async () => { throw new Error("TEE unavailable."); } };

export class DeterministicFallbackEngine {
  constructor(private readonly fallback: (error: unknown) => JsonValue, private readonly maxAttempts = 2) {}
  async run<T>(operation: (attempt: number) => Promise<T>): Promise<T | JsonValue> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try { return await operation(attempt); } catch (error) { lastError = error; }
    }
    return this.fallback(lastError);
  }
}