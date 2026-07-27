import type { JsonValue } from "../types";

export type InteractionRecord = {
  id: string;
  input: string;
  output: string;
  outcome: "success" | "failure" | "uncertain";
  metadata?: Record<string, JsonValue>;
  createdAt: number;
};

export type SyntheticCase = { id: string; prompt: string; expectedRisk: "low" | "medium" | "high"; sourceId: string };
export type Adapter = { id: string; domains: string[]; attach(): Promise<void>; detach(): Promise<void> };
export type WorldAction = { id: string; description: string; risk: number; apply?: () => Promise<unknown> };
export type WorldPrediction = { actionId: string; predictedRisk: number; warnings: string[]; safe: boolean };

export class DataFlywheel {
  private readonly interactions: InteractionRecord[] = [];
  private readonly synthetic: SyntheticCase[] = [];
  capture(record: InteractionRecord): void { this.interactions.push(record); }
  generateEdgeCases(limit = 10): SyntheticCase[] {
    const cases = this.interactions.slice(-limit).map((item, index) => ({
      id: `synthetic-${item.id}-${index}`,
      prompt: `${item.input}\n[edge-case: ambiguous, partial, and adversarial variants]`,
      expectedRisk: item.outcome === "failure" ? "high" : "medium",
      sourceId: item.id,
    } as SyntheticCase));
    this.synthetic.push(...cases);
    return cases;
  }
  filterGroundTruth(predicate: (record: InteractionRecord) => boolean): InteractionRecord[] {
    return this.interactions.filter(predicate);
  }
  getSnapshot(): { interactions: InteractionRecord[]; synthetic: SyntheticCase[] } {
    return { interactions: [...this.interactions], synthetic: [...this.synthetic] };
  }
}

export class LoRAAdapterRouter {
  private active: Adapter | undefined;
  constructor(private readonly adapters: Adapter[] = []) {}
  register(adapter: Adapter): void { this.adapters.push(adapter); }
  async route(domain: string): Promise<Adapter | undefined> {
    const next = this.adapters.find((adapter) => adapter.domains.includes(domain));
    if (this.active?.id !== next?.id) {
      if (this.active) await this.active.detach();
      if (next) await next.attach();
      this.active = next;
    }
    return this.active;
  }
  async detach(): Promise<void> { if (this.active) await this.active.detach(); this.active = undefined; }
  getActive(): string | undefined { return this.active?.id; }
}

export class WorldModel {
  async simulate(actions: WorldAction[]): Promise<WorldPrediction[]> {
    return actions.map((action) => ({
      actionId: action.id,
      predictedRisk: Math.max(0, Math.min(1, action.risk)),
      warnings: action.risk > 0.7 ? ["High predicted impact; human approval recommended."] : [],
      safe: action.risk < 0.7,
    }));
  }
  async dryRun(action: WorldAction): Promise<WorldPrediction> {
    return (await this.simulate([action]))[0];
  }
}
