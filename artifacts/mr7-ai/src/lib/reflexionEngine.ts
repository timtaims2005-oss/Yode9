/**
 * Deterministic Reflexion/Review layer.
 *
 * It provides a safe, model-agnostic review contract. A caller can inject an
 * LLM reviewer later, while the baseline checks remain available offline.
 */

export type ReflexionIssue = {
  severity: "info" | "warning" | "error";
  message: string;
  path?: string;
};

export type ReflexionVerdict = {
  passed: boolean;
  score: number;
  issues: ReflexionIssue[];
  suggestions: string[];
  attempts: number;
};

export type ReflexionContext = {
  toolId?: string;
  input?: Record<string, unknown>;
  output: unknown;
  expected?: string;
};

export type ReflexionReviewer = (
  context: ReflexionContext,
) => Promise<Pick<ReflexionVerdict, "passed" | "score" | "issues" | "suggestions">>;

function baselineReview(context: ReflexionContext): Pick<ReflexionVerdict, "passed" | "score" | "issues" | "suggestions"> {
  const issues: ReflexionIssue[] = [];
  const suggestions: string[] = [];
  if (context.output === undefined || context.output === null) {
    issues.push({ severity: "error", message: "Tool returned no output." });
    suggestions.push("Retry the tool or provide the missing input.");
  }
  if (typeof context.output === "string" && /error|failed|exception|invalid/i.test(context.output)) {
    issues.push({ severity: "warning", message: "Output contains a failure signal." });
    suggestions.push("Inspect the tool_result before presenting a final answer.");
  }
  return {
    passed: !issues.some((issue) => issue.severity === "error"),
    score: issues.length === 0 ? 1 : 0.5,
    issues,
    suggestions,
  };
}

export async function reviewToolResult(
  context: ReflexionContext,
  reviewer?: ReflexionReviewer,
): Promise<ReflexionVerdict> {
  const verdict = reviewer ? await reviewer(context) : baselineReview(context);
  return { ...verdict, attempts: 1 };
}

export async function runReflexionLoop(
  context: Omit<ReflexionContext, "output"> & { output?: unknown },
  retry?: (attempt: number, previous: ReflexionVerdict) => Promise<unknown>,
  options: { maxAttempts?: number; reviewer?: ReflexionReviewer } = {},
): Promise<{ output: unknown; verdict: ReflexionVerdict }> {
  const maxAttempts = Math.max(1, Math.min(options.maxAttempts ?? 2, 4));
  let output = context.output;
  let verdict = await reviewToolResult({ ...context, output }, options.reviewer);
  for (let attempt = 2; attempt <= maxAttempts && !verdict.passed && retry; attempt++) {
    output = await retry(attempt, verdict);
    verdict = { ...(await reviewToolResult({ ...context, output }, options.reviewer)), attempts: attempt };
  }
  return { output, verdict };
}
