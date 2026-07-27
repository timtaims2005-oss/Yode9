import type { JsonValue } from "../../types";
import { SelfHealingOrchestrator } from "../../resilience";

export type HierarchicalAgent = { id: string; role: "manager" | "worker" | "reviewer"; run(input: string): Promise<JsonValue> };
export class HierarchicalSwarmOrchestrator {
  constructor(private readonly agents: HierarchicalAgent[]) {}
  async execute(input: string): Promise<{ manager: JsonValue; workers: JsonValue[]; review?: JsonValue }> {
    const manager = this.agents.find((agent) => agent.role === "manager");
    const workers = this.agents.filter((agent) => agent.role === "worker");
    const managerResult = manager ? await manager.run(input) : { plan: input };
    const workerResults = await Promise.all(workers.map((agent) => agent.run(JSON.stringify(managerResult))));
    const reviewer = this.agents.find((agent) => agent.role === "reviewer");
    return { manager: managerResult, workers: workerResults, review: reviewer ? await reviewer.run(JSON.stringify(workerResults)) : undefined };
  }
}

export class SelfHealingInfrastructure {
  private readonly healer: SelfHealingOrchestrator;
  constructor(maxAttempts = 3) { this.healer = new SelfHealingOrchestrator(maxAttempts); }
  recover<T>(operation: (attempt: number) => Promise<T>): Promise<T> { return this.healer.run(operation); }
}