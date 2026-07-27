// ─────────────────────────────────────────────────────────────────────────────
//  MULTI-AGENT ORCHESTRATION ENGINE (System 3)
//  Planner Agent → Executor Agents (parallel/serial DAG) → Reviewer Agent
//  قاعدة: لا حذف، لا تعديل للكود القائم — إضافة فقط.
// ─────────────────────────────────────────────────────────────────────────────

import { executeTool, getRegisteredTools } from "./toolsRegistry";
import { routeTools } from "./toolRouter";
import { validateToolInput } from "./schemaValidator";

// ── أنواع الوكلاء ──────────────────────────────────────────────────────────────
export type AgentRole = "planner" | "executor" | "reviewer" | "synthesizer";

export type AgentNodeStatus =
  | "pending"
  | "running"
  | "done"
  | "error"
  | "skipped"
  | "waiting_approval";

export type AgentNode = {
  id: string;
  role: AgentRole;
  label: string;
  description: string;
  toolId?: string;           // أداة محددة لتنفيذها (للمنفذين)
  input?: Record<string, unknown>;
  output?: unknown;
  status: AgentNodeStatus;
  error?: string;
  deps: string[];            // معرّفات العُقد التي يجب أن تنتهي أولاً
  startedAt?: number;
  finishedAt?: number;
  retries: number;
  maxRetries: number;
};

export type DAGPlan = {
  id: string;
  goal: string;
  nodes: AgentNode[];
  createdAt: number;
  status: "planning" | "executing" | "reviewing" | "done" | "error";
  summary?: string;
  tokensUsed?: number;
};

export type OrchestrationEvent =
  | { type: "plan_created"; plan: DAGPlan }
  | { type: "node_start"; nodeId: string; label: string }
  | { type: "node_done"; nodeId: string; output: unknown }
  | { type: "node_error"; nodeId: string; error: string }
  | { type: "node_retry"; nodeId: string; attempt: number }
  | { type: "plan_done"; plan: DAGPlan; summary: string }
  | { type: "plan_error"; error: string }
  | { type: "review_start" }
  | { type: "review_done"; verdict: ReviewVerdict };

export type ReviewVerdict = {
  passed: boolean;
  issues: string[];
  suggestions: string[];
  score: number; // 0–10
};

// ── أحداث التنسيق للـ UI ─────────────────────────────────────────────────────
type OrchestrationListener = (e: OrchestrationEvent) => void;
const _orchListeners: OrchestrationListener[] = [];

export function onOrchestrationEvent(fn: OrchestrationListener): () => void {
  _orchListeners.push(fn);
  return () => {
    const i = _orchListeners.indexOf(fn);
    if (i >= 0) _orchListeners.splice(i, 1);
  };
}

function _emit(e: OrchestrationEvent): void {
  _orchListeners.forEach((fn) => { try { fn(e); } catch { /* ignore */ } });
}

// ── بناء خطة DAG من مهمة مركّبة ─────────────────────────────────────────────
export function buildDAGPlan(goal: string, userMessage: string): DAGPlan {
  const planId = `dag-${Date.now()}`;
  const tools = routeTools(userMessage, goal, { maxTools: 8 });

  // Planner Node
  const plannerNode: AgentNode = {
    id: `${planId}-planner`,
    role: "planner",
    label: "Planner Agent",
    description: `Analyze task: "${goal.slice(0, 100)}"`,
    status: "pending",
    deps: [],
    retries: 0,
    maxRetries: 2,
  };

  // Executor Nodes — واحد لكل أداة مُرشَّحة
  const executorNodes: AgentNode[] = tools.slice(0, 5).map((routed, i) => ({
    id: `${planId}-exec-${i}`,
    role: "executor" as AgentRole,
    label: `Executor: ${routed.tool.name}`,
    description: routed.tool.description.slice(0, 100),
    toolId: routed.tool.moduleId,
    input: {},
    status: "pending" as AgentNodeStatus,
    deps: [`${planId}-planner`],
    retries: 0,
    maxRetries: 3,
  }));

  // Reviewer Node
  const reviewerNode: AgentNode = {
    id: `${planId}-reviewer`,
    role: "reviewer",
    label: "Reviewer Agent",
    description: "Validate and verify all executor outputs",
    status: "pending",
    deps: executorNodes.map((n) => n.id),
    retries: 0,
    maxRetries: 1,
  };

  // Synthesizer Node
  const synthNode: AgentNode = {
    id: `${planId}-synth`,
    role: "synthesizer",
    label: "Synthesizer Agent",
    description: "Merge results into coherent final answer",
    status: "pending",
    deps: [`${planId}-reviewer`],
    retries: 0,
    maxRetries: 1,
  };

  return {
    id: planId,
    goal,
    nodes: [plannerNode, ...executorNodes, reviewerNode, synthNode],
    createdAt: Date.now(),
    status: "planning",
  };
}

// ── بناء خطة مخصصة من خطوات محددة ─────────────────────────────────────────
export function buildCustomPlan(
  goal: string,
  steps: Array<{ label: string; toolId?: string; input?: Record<string, unknown>; deps?: string[] }>,
): DAGPlan {
  const planId = `custom-dag-${Date.now()}`;
  const nodes: AgentNode[] = steps.map((step, i) => ({
    id: `${planId}-step-${i}`,
    role: step.toolId ? "executor" : "planner",
    label: step.label,
    description: step.toolId ? `Execute tool: ${step.toolId}` : step.label,
    toolId: step.toolId,
    input: step.input ?? {},
    status: "pending",
    deps: step.deps ?? (i > 0 ? [`${planId}-step-${i - 1}`] : []),
    retries: 0,
    maxRetries: 3,
  }));

  return {
    id: planId,
    goal,
    nodes,
    createdAt: Date.now(),
    status: "planning",
  };
}

// ── التحقق من اكتمال تبعيات عُقدة ───────────────────────────────────────────
function depsCompleted(node: AgentNode, allNodes: AgentNode[]): boolean {
  return node.deps.every((depId) => {
    const depNode = allNodes.find((n) => n.id === depId);
    return depNode?.status === "done";
  });
}

// ── تنفيذ عُقدة Executor مع أداة ─────────────────────────────────────────────
async function executeNode(
  node: AgentNode,
  plan: DAGPlan,
  signal?: AbortSignal,
): Promise<void> {
  if (!node.toolId) {
    // Planner/Reviewer/Synthesizer — simulation بدون أداة فعلية
    node.status = "done";
    node.output = `${node.label} completed`;
    node.finishedAt = Date.now();
    return;
  }

  const tool = getRegisteredTools().find((t) => t.moduleId === node.toolId);
  if (!tool) {
    node.status = "error";
    node.error = `Tool "${node.toolId}" not found in registry`;
    node.finishedAt = Date.now();
    return;
  }

  // التحقق من المدخلات
  const inputToUse = node.input ?? {};
  const validation = validateToolInput(tool, inputToUse);

  // تجميع مخرجات العُقد السابقة كمدخلات إضافية
  const prevOutputs: Record<string, unknown> = {};
  for (const depId of node.deps) {
    const depNode = plan.nodes.find((n) => n.id === depId);
    if (depNode?.output) {
      prevOutputs[depId] = depNode.output;
    }
  }

  // استخدام المدخلات المُصلَحة إذا أمكن
  const finalInput = validation.selfHealAttempted
    ? { ...prevOutputs, ...(validation.healedInput ?? inputToUse) }
    : { ...prevOutputs, ...inputToUse };

  try {
    if (signal?.aborted) {
      node.status = "skipped";
      return;
    }
    const { ok, result } = await executeTool(node.toolId, finalInput);
    node.status = ok ? "done" : "error";
    node.output = result;
    if (!ok) node.error = typeof result === "string" ? result : JSON.stringify(result);
  } catch (err) {
    node.status = "error";
    node.error = err instanceof Error ? err.message : String(err);
  }
  node.finishedAt = Date.now();
}

// ── محرك تنفيذ DAG الرئيسي ───────────────────────────────────────────────────
export async function executeDAGPlan(
  plan: DAGPlan,
  onEvent?: (e: OrchestrationEvent) => void,
  signal?: AbortSignal,
): Promise<DAGPlan> {
  const emit = (e: OrchestrationEvent) => {
    _emit(e);
    onEvent?.(e);
  };

  plan.status = "executing";
  emit({ type: "plan_created", plan });

  const maxIterations = plan.nodes.length * 3;
  let iteration = 0;

  while (iteration < maxIterations) {
    iteration++;
    if (signal?.aborted) break;

    // إيجاد العُقد الجاهزة للتنفيذ (تبعياتها مكتملة وهي pending)
    const readyNodes = plan.nodes.filter(
      (n) => n.status === "pending" && depsCompleted(n, plan.nodes),
    );

    if (readyNodes.length === 0) {
      // تحقق من الانتهاء
      const allDone = plan.nodes.every((n) =>
        n.status === "done" || n.status === "skipped" || n.status === "error",
      );
      if (allDone) break;

      // وجود عُقد لا تزال تُنفَّذ — انتظر
      const running = plan.nodes.some((n) => n.status === "running");
      if (!running) break; // deadlock
      await new Promise<void>((r) => setTimeout(r, 100));
      continue;
    }

    // تنفيذ العُقد الجاهزة بالتوازي
    readyNodes.forEach((n) => {
      n.status = "running";
      n.startedAt = Date.now();
    });

    emit({ type: "node_start", nodeId: readyNodes[0].id, label: readyNodes[0].label });

    await Promise.all(
      readyNodes.map(async (node) => {
        emit({ type: "node_start", nodeId: node.id, label: node.label });
        try {
          await executeNode(node, plan, signal);
          if (node.status === "done") {
            emit({ type: "node_done", nodeId: node.id, output: node.output });
          } else if (node.status === "error") {
            emit({ type: "node_error", nodeId: node.id, error: node.error ?? "Unknown error" });
            // إعادة المحاولة
            if (node.retries < node.maxRetries) {
              node.retries++;
              node.status = "pending";
              emit({ type: "node_retry", nodeId: node.id, attempt: node.retries });
            }
          }
        } catch (err) {
          node.status = "error";
          node.error = err instanceof Error ? err.message : String(err);
          node.finishedAt = Date.now();
          emit({ type: "node_error", nodeId: node.id, error: node.error });
        }
      }),
    );
  }

  // مرحلة المراجعة
  const hasErrors = plan.nodes.some((n) => n.status === "error");
  emit({ type: "review_start" });
  const verdict = reviewPlan(plan);
  emit({ type: "review_done", verdict });

  plan.status = hasErrors ? "error" : "done";
  plan.summary = buildPlanSummary(plan);

  emit({ type: "plan_done", plan, summary: plan.summary });
  return plan;
}

// ── Reviewer Agent: تقييم نتائج التنفيذ ─────────────────────────────────────
function reviewPlan(plan: DAGPlan): ReviewVerdict {
  const doneNodes = plan.nodes.filter((n) => n.status === "done");
  const errorNodes = plan.nodes.filter((n) => n.status === "error");
  const totalNodes = plan.nodes.length;

  const issues: string[] = [];
  const suggestions: string[] = [];

  for (const errNode of errorNodes) {
    issues.push(`Node "${errNode.label}" failed: ${errNode.error}`);
    if (errNode.retries >= errNode.maxRetries) {
      suggestions.push(`Consider simplifying the task for "${errNode.label}" or providing more input context.`);
    }
  }

  const score = totalNodes > 0
    ? Math.round((doneNodes.length / totalNodes) * 10)
    : 0;

  return {
    passed: errorNodes.length === 0,
    issues,
    suggestions,
    score,
  };
}

// ── بناء ملخص الخطة ──────────────────────────────────────────────────────────
function buildPlanSummary(plan: DAGPlan): string {
  const doneNodes = plan.nodes.filter((n) => n.status === "done");
  const errorNodes = plan.nodes.filter((n) => n.status === "error");
  const results = doneNodes
    .filter((n) => n.output !== undefined)
    .map((n) => `**${n.label}**: ${typeof n.output === "string" ? n.output.slice(0, 200) : JSON.stringify(n.output).slice(0, 200)}`)
    .join("\n");

  return [
    `## Multi-Agent Execution Summary`,
    `**Goal:** ${plan.goal}`,
    `**Status:** ${errorNodes.length > 0 ? "Partial" : "Complete"} (${doneNodes.length}/${plan.nodes.length} nodes)`,
    results ? `\n**Results:**\n${results}` : "",
    errorNodes.length > 0 ? `\n**Errors:** ${errorNodes.map((n) => n.label).join(", ")}` : "",
  ].filter(Boolean).join("\n");
}

// ── خطط متوازية متعددة ────────────────────────────────────────────────────────
export async function executeParallelPlans(
  plans: DAGPlan[],
  signal?: AbortSignal,
): Promise<DAGPlan[]> {
  return Promise.all(plans.map((plan) => executeDAGPlan(plan, undefined, signal)));
}

// ── سجل الخطط المنفَّذة ──────────────────────────────────────────────────────
const _planHistory: DAGPlan[] = [];

export function recordPlan(plan: DAGPlan): void {
  _planHistory.push(plan);
  if (_planHistory.length > 20) _planHistory.shift();
}

export function getPlanHistory(): DAGPlan[] {
  return [..._planHistory];
}

export function getActivePlan(): DAGPlan | undefined {
  return _planHistory.find((p) => p.status === "executing" || p.status === "planning");
}

// ── تشغيل سريع: مهمة واحدة تُنفَّذ بالتوازي ──────────────────────────────────
export async function runMultiAgentTask(
  goal: string,
  userMessage: string,
  onEvent?: (e: OrchestrationEvent) => void,
  signal?: AbortSignal,
): Promise<{ summary: string; plan: DAGPlan }> {
  const plan = buildDAGPlan(goal, userMessage);
  recordPlan(plan);
  const executed = await executeDAGPlan(plan, onEvent, signal);
  return { summary: executed.summary ?? "Task completed.", plan: executed };
}
