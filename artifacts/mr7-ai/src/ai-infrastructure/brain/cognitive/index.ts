import type { JsonValue } from "../../types";

export type BrainWorldAction = { id: string; description: string; risk: number; payload?: JsonValue };
export type BrainWorldPrediction = { actionId: string; outcome: "safe" | "blocked" | "uncertain"; risk: number; warnings: string[] };
export type ThoughtPath = { id: string; steps: string[]; score: number; status: "open" | "rejected" | "selected" };
export type MicroTask = { id: string; description: string; dependsOn: string[] };
export type TaskDag = { goal: string; tasks: MicroTask[] };

export class WorldModelSimulator {
  async simulate(action: BrainWorldAction): Promise<BrainWorldPrediction> {
    const risk = Math.max(0, Math.min(1, action.risk));
    return {
      actionId: action.id,
      outcome: risk >= 0.8 ? "blocked" : risk >= 0.5 ? "uncertain" : "safe",
      risk,
      warnings: risk >= 0.5 ? ["Action requires additional verification."] : [],
    };
  }
}

export class DynamicTreeOfThought {
  async evaluate(paths: Array<{ steps: string[]; score?: number }>): Promise<ThoughtPath> {
    const candidates = paths.map((path, index) => ({
      id: `thought-${index + 1}`,
      steps: path.steps,
      score: path.score ?? 1 / Math.max(1, path.steps.length),
      status: "open" as const,
    }));
    const selected = [...candidates].sort((a, b) => b.score - a.score)[0];
    if (!selected) return { id: "thought-none", steps: [], score: 0, status: "rejected" };
    return { ...selected, status: "selected" };
  }
}

export class GoalDecompositor {
  decompose(goal: string, steps: string[] = ["analyze", "execute", "verify"]): TaskDag {
    const tasks = steps.map((description, index) => ({
      id: `task-${index + 1}`,
      description: `${description}: ${goal}`,
      dependsOn: index === 0 ? [] : [`task-${index}`],
    }));
    return { goal, tasks };
  }
}
