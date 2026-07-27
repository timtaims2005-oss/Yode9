import { assessRequestSafety } from "../agentic/safety";
import type { AgenticRequest, PluginResult } from "../agentic/types";
import type { Reflection, ReasoningResult } from "./types";
import { ReActPlanner } from "./react-planner";

const MAX_SELF_HEAL_RETRIES = 3;
const MIN_CONFIDENCE_THRESHOLD = 0.5;

interface ExecutionAttempt {
  readonly attempt: number;
  readonly success: boolean;
  readonly errorMessage?: string;
  readonly resultCount: number;
  readonly mutated: boolean;
}

function calculateConfidence(results: readonly PluginResult[]): number {
  if (results.length === 0) return 0;
  const simulated = results.filter((r) => r.status === "simulated").length;
  const total = results.length;
  const simulatedRatio = simulated / total;
  // Confidence increases with more successful simulations and richer findings
  const avgFindings = results.reduce((sum, r) => sum + r.findings.length, 0) / total;
  const findingBonus = Math.min(0.15, avgFindings * 0.02);
  return Math.min(0.98, parseFloat((simulatedRatio * 0.85 + findingBonus).toFixed(3)));
}

function synthesizeReflection(
  results: readonly PluginResult[],
  attempts: readonly ExecutionAttempt[],
  confidence: number,
): Reflection {
  const concerns = results.flatMap((r) => r.blockedActions);
  const totalFindings = results.reduce((sum, r) => sum + r.findings.length, 0);
  const highFindings = results.flatMap((r) => r.findings).filter((f) => f.severity === "high").length;
  const retryCount = attempts.filter((a) => a.mutated).length;

  if (confidence < MIN_CONFIDENCE_THRESHOLD) {
    return {
      passed: false,
      summary:
        `Low confidence (${(confidence * 100).toFixed(1)}%) after ${attempts.length} attempt(s). ` +
        `${totalFindings} total findings, ${concerns.length} blocked actions.`,
      concerns,
      nextAction: "revise",
    };
  }

  const summary =
    `Reviewed ${results.length} plugin result(s) producing ${totalFindings} findings ` +
    `(${highFindings} high severity). ` +
    (retryCount > 0 ? `Self-healing loop applied ${retryCount} mutation(s). ` : "") +
    `Overall confidence: ${(confidence * 100).toFixed(1)}%. ` +
    (concerns.length > 0
      ? `${concerns.length} defensive actions blocked by safety control plane.`
      : "No safety violations detected.");

  return {
    passed: true,
    summary,
    concerns,
    nextAction: highFindings > 5 ? "revise" : "complete",
  };
}

function isRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  // Retry on transient errors; do not retry on safety blocks or schema violations
  const message = error.message.toLowerCase();
  const nonRetryable = ["blocked", "forbidden", "unauthorized", "schema validation", "safety"];
  return !nonRetryable.some((keyword) => message.includes(keyword));
}

/**
 * ReflectionLoop with self-healing: if execution fails or confidence is below
 * threshold, the loop inspects the error, mutates parameters via ReActPlanner,
 * and retries autonomously up to MAX_SELF_HEAL_RETRIES times.
 */
export class ReflectionLoop {
  private readonly planner: ReActPlanner;

  constructor(planner?: ReActPlanner) {
    this.planner = planner ?? new ReActPlanner();
  }

  async run(
    request: AgenticRequest,
    execute: (request: AgenticRequest) => Promise<readonly PluginResult[]>,
  ): Promise<ReasoningResult> {
    const safety = assessRequestSafety(request);

    if (!safety.allowed) {
      const plan = await this.planner.plan(request);
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

    const attempts: ExecutionAttempt[] = [];
    let currentRequest = request;
    let lastError: unknown = undefined;
    let pluginResults: readonly PluginResult[] = [];

    // Self-healing execution loop
    for (let attempt = 0; attempt <= MAX_SELF_HEAL_RETRIES; attempt++) {
      const isMutated = attempt > 0;

      try {
        pluginResults = await execute(currentRequest);

        attempts.push({
          attempt,
          success: true,
          resultCount: pluginResults.length,
          mutated: isMutated,
        });

        // Check confidence — if too low, mutate and retry
        const confidence = calculateConfidence(pluginResults);
        if (confidence < MIN_CONFIDENCE_THRESHOLD && attempt < MAX_SELF_HEAL_RETRIES) {
          currentRequest = this.planner.mutateForRetry(
            currentRequest,
            `Low confidence: ${confidence.toFixed(3)}`,
          );
          continue;
        }

        break; // Success with adequate confidence
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown execution error";

        attempts.push({
          attempt,
          success: false,
          errorMessage,
          resultCount: 0,
          mutated: isMutated,
        });

        lastError = error;

        if (!isRetryableError(error) || attempt >= MAX_SELF_HEAL_RETRIES) {
          break;
        }

        // Self-healing: inspect error, mutate parameters, retry
        currentRequest = this.planner.mutateForRetry(currentRequest, errorMessage);
      }
    }

    // If all retries exhausted with errors and no results
    if (pluginResults.length === 0 && lastError !== undefined) {
      const errorMsg = lastError instanceof Error ? lastError.message : "All execution attempts failed.";
      const plan = await this.planner.plan(request);
      return {
        plan,
        pluginResults: [],
        reflection: {
          passed: false,
          summary: `Execution failed after ${attempts.length} attempt(s): ${errorMsg}`,
          concerns: [errorMsg],
          nextAction: "blocked",
        },
      };
    }

    const finalRetryDepth = attempts.filter((a) => a.mutated).length;
    const plan = await this.planner.plan(currentRequest, finalRetryDepth);
    const confidence = calculateConfidence(pluginResults);
    const reflection = synthesizeReflection(pluginResults, attempts, confidence);

    return { plan, pluginResults: [...pluginResults], reflection };
  }
}

export default ReflectionLoop;
