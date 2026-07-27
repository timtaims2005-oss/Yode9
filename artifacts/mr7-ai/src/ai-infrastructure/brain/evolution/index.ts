import type { JsonValue } from "../../types";

export type SyntheticTrainingExample = {
  id: string;
  prompt: string;
  preferred: string;
  rejected?: string;
  metadata?: Record<string, JsonValue>;
};
export type AdapterTrainingJob = {
  id: string;
  adapterType: "lora" | "dpo";
  examples: SyntheticTrainingExample[];
  status: "queued" | "running" | "completed" | "failed";
};

export class SyntheticDataGenerator {
  generate(input: string, alternatives: string[] = []): SyntheticTrainingExample[] {
    return alternatives.map((preferred, index) => ({
      id: `synthetic-training-${Date.now()}-${index}`,
      prompt: input,
      preferred,
      rejected: alternatives[(index + 1) % alternatives.length],
    }));
  }
}

export class FineTuningAdapterOrchestrator {
  private readonly jobs = new Map<string, AdapterTrainingJob>();
  createJob(adapterType: "lora" | "dpo", examples: SyntheticTrainingExample[]): AdapterTrainingJob {
    const job = { id: `adapter-job-${Date.now()}`, adapterType, examples, status: "queued" as const };
    this.jobs.set(job.id, job);
    return job;
  }
  async run(jobId: string): Promise<AdapterTrainingJob> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Training job ${jobId} was not found.`);
    const running = { ...job, status: "running" as const };
    this.jobs.set(jobId, running);
    const completed = { ...running, status: "completed" as const };
    this.jobs.set(jobId, completed);
    return completed;
  }
  get(jobId: string): AdapterTrainingJob | undefined { return this.jobs.get(jobId); }
}
