import { assessRequestSafety } from "../agentic/safety";
import type { AgenticRequest } from "../agentic/types";
import type { Planner, ReActPlan, ReasoningStep } from "./types";

export class ReActPlanner {
  async plan(request: AgenticRequest): Promise<ReActPlan> {
    const safety = assessRequestSafety(request);
    if (!safety.allowed) {
      return {
        goal: request.intent,
        steps: [],
        mode: request.mode,
        blockedActions: [safety.reason],
      };
    }
    const plugins = request.requestedPlugins ?? [];
    const steps: ReasoningStep[] = [
      {
        index: 0,
        thought: "Constrain the request to the explicit authorized scope.",
        action: "validate-scope",
        observation: safety.reason,
      },
      {
        index: 1,
        thought: "Gather defensive telemetry without active interaction.",
        action: plugins.length > 0 ? `simulate-plugins:${plugins.join(",")}` : "simulate-review",
        observation: "No exploit delivery, credential attack, shell, destructive payload, or network probing is permitted.",
      },
      {
        index: 2,
        thought: "Review findings and communicate blocked actions.",
        action: "reflect",
        observation: "Results remain advisory and in-memory.",
      },
    ];
    return { goal: request.intent, steps, mode: request.mode, blockedActions: [] };
  }

  asPlanner(): Planner {
    return (request: AgenticRequest): Promise<ReActPlan> => this.plan(request);
  }
}

export default ReActPlanner;
