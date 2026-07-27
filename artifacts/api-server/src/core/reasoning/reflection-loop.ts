import { assessRequestSafety } from "../agentic/safety";
import type { AgenticRequest, PluginResult } from "../agentic/types";
import type { Reflection, ReasoningResult } from "./types";
import { ReActPlanner } from "./react-planner";

export class ReflectionLoop {
  constructor(private readonly planner = new ReActPlanner()) {}

  async run(
    request: AgenticRequest,
    execute: (request: AgenticRequest) => Promise<readonly PluginResult[]>,
  ): Promise<ReasoningResult> {
    const plan = await this.planner.plan(request);
    const safety = assessRequestSafety(request);
    if (!safety.allowed) {
      return {
        plan,
        pluginResults: [],
        reflection: {
          passed: false,
          summary: safety.reason,
          concerns: [safety.reason],
          nextAction: "blocked",
        },
      };
    }
    const pluginResults = await execute(request);
    const concerns = pluginResults.flatMap((result) => result.blockedActions);
    const reflection: Reflection = {
      passed: true,
      summary: `Reviewed ${pluginResults.length} defensive simulation result(s).`,
      concerns,
      nextAction: "complete",
    };
    return { plan, pluginResults, reflection };
  }
}

export default ReflectionLoop;
