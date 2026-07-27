// ─────────────────────────────────────────────────────────────────────────────
//  AGENT TASK RUNNER — Smart Task Decomposition & Multi-Agent Dispatch (System 3+)
//  يحلل تعقيد المهمة ويقرر: تنفيذ مباشر أم DAG متعدد الوكلاء.
//  مبني فوق multiAgentOrchestrator.ts و chatPipeline.ts — إضافة خالصة.
// ─────────────────────────────────────────────────────────────────────────────

import {
  buildDAGPlan,
  buildCustomPlan,
  executeDAGPlan,
  recordPlan,
  type DAGPlan,
  type OrchestrationEvent,
} from "./multiAgentOrchestrator";
import { routeTools } from "./toolRouter";
import { STM, LTM } from "./agentMemory";

// ── مستويات تعقيد المهام ─────────────────────────────────────────────────────

export type TaskComplexity = "simple" | "moderate" | "complex" | "multi-step";

export type TaskAnalysis = {
  complexity: TaskComplexity;
  suggestedAgentCount: number;
  needsMultiAgent: boolean;
  detectedSteps: string[];
  estimatedTools: number;
  reasoning: string;
};

// ── مؤشرات التعقيد ────────────────────────────────────────────────────────────

const COMPLEXITY_INDICATORS = {
  multiStep: [
    /first.*then|step \d|phase \d|next.*after|finally|lastly/i,
    /و(?:بعد ذلك|ثم|أخيراً)|خطوة \d|المرحلة \d/,
    /chain|pipeline|workflow|sequence|orchestrat/i,
    /multiple|several|various|different.*tasks/i,
  ],
  parallel: [
    /simultaneously|at the same time|in parallel|concurrently/i,
    /بالتوازي|في نفس الوقت|متزامن/,
    /both.*and.*also|multiple.*simultaneously/i,
  ],
  crossDomain: [
    /security.*code|code.*security|osint.*analyze|scan.*report/i,
    /search.*write|research.*build|analyze.*deploy/i,
    /recon.*exploit|gather.*attack/i,
  ],
  research: [
    /research|investigate|analyze|study|compare|evaluate/i,
    /بحث|تحليل|دراسة|مقارنة|تقييم/,
    /find.*information|gather.*data|look.*up/i,
  ],
};

// ── تحليل تعقيد المهمة ────────────────────────────────────────────────────────

export function analyzeTaskComplexity(userMessage: string): TaskAnalysis {
  const msg = userMessage.toLowerCase();
  const words = msg.split(/\s+/);
  const wordCount = words.length;

  let complexityScore = 0;
  const detectedSteps: string[] = [];

  // فحص مؤشرات التعقيد
  let isMultiStep = false;
  let isParallel = false;
  let isCrossDomain = false;

  for (const pattern of COMPLEXITY_INDICATORS.multiStep) {
    if (pattern.test(msg)) { complexityScore += 3; isMultiStep = true; break; }
  }
  for (const pattern of COMPLEXITY_INDICATORS.parallel) {
    if (pattern.test(msg)) { complexityScore += 2; isParallel = true; break; }
  }
  for (const pattern of COMPLEXITY_INDICATORS.crossDomain) {
    if (pattern.test(msg)) { complexityScore += 3; isCrossDomain = true; break; }
  }
  for (const pattern of COMPLEXITY_INDICATORS.research) {
    if (pattern.test(msg)) { complexityScore += 1; break; }
  }

  // فحص عدد الأفعال
  const actionVerbs = msg.match(/\b(?:scan|analyze|build|create|deploy|search|write|fix|test|run|execute|generate|download|upload|check|monitor|track|report)\b/g) ?? [];
  if (actionVerbs.length > 1) complexityScore += actionVerbs.length;

  // فحص طول الرسالة
  if (wordCount > 50) complexityScore += 2;
  if (wordCount > 100) complexityScore += 3;

  // اقتراح خطوات من الرسالة
  const stepMatches = msg.match(/(?:first|then|next|after|finally|step \d)[^.!?]{5,80}/gi) ?? [];
  detectedSteps.push(...stepMatches.slice(0, 5));

  // تقدير عدد الأدوات المطلوبة
  const routedTools = routeTools(userMessage, "", { maxTools: 20 });
  const estimatedTools = Math.min(routedTools.length, 15);

  // تحديد مستوى التعقيد
  let complexity: TaskComplexity;
  let suggestedAgentCount: number;
  let reasoning: string;

  if (complexityScore <= 1) {
    complexity = "simple";
    suggestedAgentCount = 1;
    reasoning = "Single straightforward request — direct execution";
  } else if (complexityScore <= 3) {
    complexity = "moderate";
    suggestedAgentCount = 2;
    reasoning = "Moderate task with some sub-steps — planner + executor";
  } else if (complexityScore <= 6) {
    complexity = "complex";
    suggestedAgentCount = 3;
    reasoning = isParallel
      ? "Complex parallel task — multiple executor agents"
      : isCrossDomain
      ? "Cross-domain task — specialized agents per domain"
      : "Multi-step task — planner, executors, reviewer";
  } else {
    complexity = "multi-step";
    suggestedAgentCount = Math.min(5, 2 + Math.floor(complexityScore / 3));
    reasoning = isMultiStep
      ? "Complex multi-step workflow — full DAG execution"
      : "High-complexity request — multi-agent orchestration recommended";
  }

  const needsMultiAgent = complexity === "complex" || complexity === "multi-step";

  return {
    complexity,
    suggestedAgentCount,
    needsMultiAgent,
    detectedSteps,
    estimatedTools,
    reasoning,
  };
}

// ── تشغيل مهمة ذكية ──────────────────────────────────────────────────────────

export type TaskRunResult = {
  mode: "direct" | "multi-agent";
  plan?: DAGPlan;
  summary: string;
  success: boolean;
  complexity: TaskComplexity;
  toolsExecuted: number;
  durationMs: number;
};

export type TaskRunOptions = {
  forceMultiAgent?: boolean;
  forceDirect?: boolean;
  maxAgents?: number;
  signal?: AbortSignal;
  onEvent?: (e: OrchestrationEvent) => void;
  onComplexityAnalyzed?: (analysis: TaskAnalysis) => void;
};

/**
 * runSmartTask — يحلل المهمة ويختار التنفيذ المناسب:
 * - simple/moderate: تنفيذ مباشر عبر أدوات مُصفَّاة
 * - complex/multi-step: DAG من وكلاء متخصصين
 */
export async function runSmartTask(
  goal: string,
  userMessage: string,
  opts: TaskRunOptions = {},
): Promise<TaskRunResult> {
  const t0 = Date.now();
  const { forceMultiAgent, forceDirect, maxAgents = 5, signal, onEvent, onComplexityAnalyzed } = opts;

  // ── تحليل التعقيد ─────────────────────────────────────────────────────────
  const analysis = analyzeTaskComplexity(userMessage);
  onComplexityAnalyzed?.(analysis);

  const useMultiAgent = forceMultiAgent || (!forceDirect && analysis.needsMultiAgent);

  // ── تسجيل في STM ──────────────────────────────────────────────────────────
  STM.setContext("activeTaskGoal", goal.slice(0, 100));
  STM.setContext("activeTaskComplexity", analysis.complexity);

  if (!useMultiAgent) {
    // ── المهمة بسيطة: لا تحتاج وكلاء متعددين ────────────────────────────
    // success=false لأن لا أدوات نُفِّذت — يجب توجيهها عبر callModel العادي
    STM.clearContext("activeTaskGoal");
    return {
      mode: "direct",
      summary: `Task is ${analysis.complexity} — route through standard chat pipeline, no multi-agent needed.`,
      success: false,          // لم تُنفَّذ أدوات فعلية هنا
      complexity: analysis.complexity,
      toolsExecuted: 0,
      durationMs: Date.now() - t0,
    };
  }

  // ── تنفيذ متعدد الوكلاء ───────────────────────────────────────────────────
  const agentCount = Math.min(analysis.suggestedAgentCount, maxAgents);

  let plan: DAGPlan;
  if (analysis.detectedSteps.length > 0) {
    // بناء خطة مخصصة من الخطوات المكتشفة
    const steps = analysis.detectedSteps.slice(0, agentCount).map((step) => ({
      label: step.slice(0, 60),
      input: { goal, step },
    }));
    plan = buildCustomPlan(goal, steps);
  } else {
    // خطة DAG تلقائية
    plan = buildDAGPlan(goal, userMessage);
  }

  recordPlan(plan);

  const executed = await executeDAGPlan(plan, onEvent, signal);

  // ── تسجيل في LTM ─────────────────────────────────────────────────────────
  const doneNodes = executed.nodes.filter((n) => n.status === "done");
  const toolsExecuted = doneNodes.filter((n) => n.toolId).length;

  try {
    if (toolsExecuted > 0) {
      LTM.addUserFact(
        `Multi-agent task executed: "${goal.slice(0, 60)}" (${toolsExecuted} tools, ${analysis.complexity})`,
        0.6,
        "agent-task-runner",
      );
    }
  } catch { /* ignore */ }

  STM.clearContext("activeTaskGoal");

  return {
    mode: "multi-agent",
    plan: executed,
    summary: executed.summary ?? `Completed ${doneNodes.length}/${executed.nodes.length} steps.`,
    success: executed.status === "done",
    complexity: analysis.complexity,
    toolsExecuted,
    durationMs: Date.now() - t0,
  };
}

// ── فحص سريع: هل المهمة تحتاج وكلاء متعددين؟ ────────────────────────────────

export function isMultiAgentTask(userMessage: string): boolean {
  return analyzeTaskComplexity(userMessage).needsMultiAgent;
}

// ── اقتراح خطة عمل للنموذج ────────────────────────────────────────────────────

export function buildPlannerSystemPrompt(goal: string, analysis: TaskAnalysis): string {
  return `\n\n[MULTI-AGENT PLANNER MODE]
Goal: ${goal.slice(0, 200)}
Complexity: ${analysis.complexity} (${analysis.suggestedAgentCount} agents recommended)
Reasoning: ${analysis.reasoning}
${analysis.detectedSteps.length > 0 ? `Detected steps:\n${analysis.detectedSteps.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}` : ""}
${analysis.estimatedTools > 0 ? `Estimated tools needed: ${analysis.estimatedTools}` : ""}

Instructions:
1. Break the task into ${analysis.suggestedAgentCount} clear sub-tasks
2. Assign each sub-task to a specialized agent role
3. Identify dependencies between sub-tasks
4. Use parallel execution where sub-tasks are independent
5. Use <tool_call> blocks to invoke tools for each sub-task
6. Report results clearly with structured output`;
}

// ── سجل المهام المنفَّذة للـ UI ───────────────────────────────────────────────

const _taskHistory: TaskRunResult[] = [];

export function recordTaskRun(result: TaskRunResult): void {
  _taskHistory.push(result);
  if (_taskHistory.length > 20) _taskHistory.shift();
}

export function getTaskHistory(): TaskRunResult[] {
  return [..._taskHistory];
}

export function getLastTask(): TaskRunResult | undefined {
  return _taskHistory[_taskHistory.length - 1];
}

// ── إحصاءات للـ UI ────────────────────────────────────────────────────────────

export function getTaskRunnerStats(): {
  totalTasks: number;
  multiAgentTasks: number;
  successRate: number;
  avgDurationMs: number;
  complexityDistribution: Record<TaskComplexity, number>;
} {
  const total = _taskHistory.length;
  const multiAgent = _taskHistory.filter((r) => r.mode === "multi-agent").length;
  const successful = _taskHistory.filter((r) => r.success).length;
  const avgDuration = total > 0
    ? _taskHistory.reduce((s, r) => s + r.durationMs, 0) / total
    : 0;

  const dist: Record<TaskComplexity, number> = {
    simple: 0, moderate: 0, complex: 0, "multi-step": 0,
  };
  for (const r of _taskHistory) {
    dist[r.complexity]++;
  }

  return {
    totalTasks: total,
    multiAgentTasks: multiAgent,
    successRate: total > 0 ? successful / total : 0,
    avgDurationMs: avgDuration,
    complexityDistribution: dist,
  };
}
