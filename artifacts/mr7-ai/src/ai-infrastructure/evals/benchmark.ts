import { InfrastructureError, type ModelRequest, type ModelResponse } from "../types";

export type EvalCase = { id: string; request: ModelRequest; expected: string; tags?: string[] };
export type EvalScore = { id: string; relevance: number; coherence: number; groundedness: number; passed: boolean; notes?: string };
export type EvalJudge = (input: { expected: string; actual: ModelResponse; request: ModelRequest }) => Promise<Omit<EvalScore, "id" | "passed">>;

const lexicalJudge: EvalJudge = async ({ expected, actual }) => {
  const expectedWords = new Set(expected.toLowerCase().split(/\W+/).filter(Boolean));
  const actualText = actual.text.toLowerCase();
  const overlap = [...expectedWords].filter((word) => actualText.includes(word)).length / Math.max(1, expectedWords.size);
  return { relevance: overlap, coherence: actual.text.trim().length > 0 ? 1 : 0, groundedness: overlap };
};

export async function runBenchmark(
  cases: EvalCase[],
  execute: (request: ModelRequest) => Promise<ModelResponse>,
  judge: EvalJudge = lexicalJudge,
  minimumScore = 0.95,
): Promise<{ scores: EvalScore[]; average: number; passed: boolean }> {
  const scores: EvalScore[] = [];
  for (const testCase of cases) {
    const actual = await execute(testCase.request);
    const judged = await judge({ expected: testCase.expected, actual, request: testCase.request });
    const average = (judged.relevance + judged.coherence + judged.groundedness) / 3;
    scores.push({ id: testCase.id, ...judged, passed: average >= minimumScore });
  }
  const average = scores.length ? scores.reduce((sum, score) => sum + (score.relevance + score.coherence + score.groundedness) / 3, 0) / scores.length : 0;
  return { scores, average, passed: average >= minimumScore };
}

export function assertBenchmarkPassed(result: { passed: boolean; average: number }): void {
  if (!result.passed) throw new InfrastructureError(`Benchmark score ${result.average.toFixed(3)} is below the required threshold.`, "EVAL_FAILED", result);
}
