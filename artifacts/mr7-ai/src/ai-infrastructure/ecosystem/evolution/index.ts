import type { JsonValue } from "../../types";

export type FlywheelRecord = { id: string; input: string; output: string; success: boolean; feedback?: string; metadata?: Record<string, JsonValue> };
export class AutomatedDataFlywheel {
  private readonly records: FlywheelRecord[] = [];
  capture(record: FlywheelRecord): void { if (record.input.trim() && record.output.trim()) this.records.push({ ...record }); }
  dataset(): FlywheelRecord[] { return this.records.filter((record) => record.success || record.feedback); }
  size(): number { return this.records.length; }
}

export type FineTuneJob = { id: string; adapter: "lora" | "dpo"; examples: number; status: "queued" | "running" | "completed" | "failed" };
export class OnTheFlyFineTuner {
  private readonly jobs: FineTuneJob[] = [];
  queue(input: Omit<FineTuneJob, "status">): FineTuneJob { const job = { ...input, status: "queued" as const }; this.jobs.push(job); return job; }
  list(): FineTuneJob[] { return [...this.jobs]; }
}

export class SyntheticDataGenerator {
  generate(prompt: string, perspectives: string[]): Array<{ input: string; output: string; label: "synthetic" }> {
    return perspectives.map((perspective) => ({ input: prompt, output: perspective, label: "synthetic" as const }));
  }
}