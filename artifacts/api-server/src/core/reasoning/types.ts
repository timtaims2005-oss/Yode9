import type { AgenticRequest, PluginResult } from "../agentic/types";

export interface ReasoningStep {
  readonly index: number;
  readonly thought: string;
  readonly action: string;
  readonly observation: string;
}

export interface ReActPlan {
  readonly goal: string;
  readonly steps: readonly ReasoningStep[];
  readonly mode: "dry-run" | "simulation";
  readonly blockedActions: readonly string[];
}

export interface Reflection {
  readonly passed: boolean;
  readonly summary: string;
  readonly concerns: readonly string[];
  readonly nextAction: "complete" | "revise" | "blocked";
}

export interface ReasoningResult {
  readonly plan: ReActPlan;
  readonly pluginResults: readonly PluginResult[];
  readonly reflection: Reflection;
}

export type Planner = (request: AgenticRequest) => Promise<ReActPlan>;
