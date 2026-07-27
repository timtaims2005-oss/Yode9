import type { CognitionPlan } from "../types";

export type ThoughtMode = "tree" | "graph" | "chain";
export class ReasoningEngine {
  reason(goal: string, mode: ThoughtMode = "tree"): CognitionPlan {
    const steps = goal.split(/\s+and\s+|\s+then\s+/i).map((step) => step.trim()).filter(Boolean);
    return { goal, steps: steps.length ? steps : [goal], risk: /delete|pay|credential|production/i.test(goal) ? 0.8 : 0.2, rationale: `${mode}-of-thought decomposition` };
  }
}

export type TwinState = Record<string, number | string | boolean>;
export class WorldDigitalTwinSimulator {
  simulate(state: TwinState, plan: CognitionPlan): { safe: boolean; probability: number; projectedState: TwinState; warnings: string[] } {
    const warnings = plan.risk > 0.7 ? ["High-risk action requires approval."] : [];
    return { safe: plan.risk < 0.8, probability: Math.max(0, 1 - plan.risk), projectedState: { ...state, lastPlan: plan.goal }, warnings };
  }
}

export class GoalDecompositionEngine {
  decompose(goal: string): CognitionPlan { return new ReasoningEngine().reason(goal, "graph"); }
}

export class GameTheoryNegotiator {
  negotiate(options: Array<{ agent: string; action: string; payoff: number; risk?: number }>): { winner?: string; action?: string; payoff: number; dissent: string[] } {
    const ranked = [...options].sort((a, b) => (b.payoff - (b.risk ?? 0)) - (a.payoff - (a.risk ?? 0)));
    return { winner: ranked[0]?.agent, action: ranked[0]?.action, payoff: ranked[0]?.payoff ?? 0, dissent: ranked.slice(1).map((item) => item.agent) };
  }
}