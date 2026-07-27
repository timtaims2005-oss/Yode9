// ─────────────────────────────────────────────────────────────────────────────
//  CHAT PIPELINE — Master Smart Pipeline (Integration of All 6 Systems)
//  يجمع الأنظمة الستة في منظومة واحدة متكاملة عالية الأداء.
//
//  System 1: Tool Router (filtered tools per query)
//  System 2: Schema Validation & Self-Healing
//  System 3: Multi-Agent Orchestration (DAG)
//  System 4: Multi-Layer Memory (STM + LTM)
//  System 5: Human-in-the-Loop Approval
//  System 6: ChatView + SkillsEngine Integration
//
//  قاعدة: لا حذف، لا تعديل للكود القائم — إضافة خالصة.
// ─────────────────────────────────────────────────────────────────────────────

import { buildFilteredToolsSystemBlock, type ToolRouterOptions } from "./toolRouter";
import { buildFullMemoryContext, STM, LTM } from "./agentMemory";
import { processResponseSafe } from "./toolExecution";
import { streamChat, type ChatRequest, type ChatMessage } from "./chat-client";
import { matchUserSkills, buildUserSkillsAddendum } from "./skillsEngine";
import { buildDAGPlan, executeDAGPlan, type OrchestrationEvent } from "./multiAgentOrchestrator";
import { configureApprovalGate } from "./approvalGate";

// ── أنواع Pipeline ─────────────────────────────────────────────────────────────

export type PipelineOptions = {
  /** عدد أقصى للأدوات المُرشَّحة لكل رسالة (افتراضي: 12) */
  maxFilteredTools?: number;
  /** تضمين ذاكرة STM في System Prompt */
  includeSTM?: boolean;
  /** تضمين ذاكرة LTM في System Prompt */
  includeLTM?: boolean;
  /** تفعيل Auto-Skills */
  autoSkills?: boolean;
  /** تفعيل التحقق من المدخلات (Schema Validation) */
  validateTools?: boolean;
  /** تفعيل Approval Gate للأدوات الحساسة */
  approvalGate?: boolean;
  /** معرّف المحادثة للـ STM/LTM */
  conversationId?: string;
  /** Adds an explicit ecosystem orchestration context without replacing legacy chat. */
  ecosystemContext?: boolean;
};

export type PipelineResult = {
  fullText: string;
  hasCalls: boolean;
  callCount: number;
  successCount: number;
  filteredToolCount: number;
  totalToolCount: number;
  stmSnapshot: ReturnType<typeof STM.getState>;
};

export type SmartChatRequest = ChatRequest & {
  userMessage: string;
  pipelineOpts?: PipelineOptions;
};

// ── بناء System Prompt الذكي الشامل ──────────────────────────────────────────

export function buildSmartSystemPrompt(
  userMessage: string,
  basePrompt: string,
  opts: PipelineOptions = {},
): {
  prompt: string;
  filteredToolCount: number;
  totalToolCount: number;
  activeSkillNames: string[];
} {
  const {
    maxFilteredTools = 12,
    includeSTM = true,
    includeLTM = true,
    autoSkills = true,
  } = opts;

  let prompt = basePrompt;
  const activeSkillNames: string[] = [];

  // ── 1. Auto-Skills (System 6) ─────────────────────────────────────────────
  if (autoSkills && userMessage.trim()) {
    try {
      const matchedSkills = matchUserSkills(userMessage, 3);
      if (matchedSkills.length > 0) {
        const skillsAdd = buildUserSkillsAddendum(matchedSkills);
        prompt += skillsAdd;
        activeSkillNames.push(...matchedSkills.map((s) => s.name));
      }
    } catch { /* ignore */ }
  }

  // ── 2. Long-Term Memory Context (System 4 — LTM) ─────────────────────────
  if (includeLTM) {
    try {
      const ltmBlock = LTM.buildContextBlock({ includeFacts: true, includePrefs: true });
      if (ltmBlock) prompt += `\n\n${ltmBlock}`;
    } catch { /* ignore */ }
  }

  // ── 3. Short-Term Memory Context (System 4 — STM) ─────────────────────────
  if (includeSTM) {
    try {
      const stmBlock = STM.buildContextBlock();
      if (stmBlock) prompt += `\n\n${stmBlock}`;
    } catch { /* ignore */ }
  }

  // ── 4. Filtered Tools System Block (System 1 — Tool Router) ───────────────
  const routerOptions: ToolRouterOptions = { maxTools: maxFilteredTools };
  const { block, toolCount, totalCount } = buildFilteredToolsSystemBlock(
    userMessage,
    "",
    routerOptions,
  );

  let filteredToolCount = toolCount;
  let totalToolCount = totalCount;

  if (block) {
    prompt += block;
  } else if (totalCount > 0) {
    // Fallback: أرسل أعلى الأدوات المناسبة للسياق
    const fallback = buildFilteredToolsSystemBlock("general assistant", "", { maxTools: maxFilteredTools });
    if (fallback.block) prompt += fallback.block;
    filteredToolCount = fallback.toolCount;
    totalToolCount = fallback.totalCount;
  }

  return { prompt, filteredToolCount, totalToolCount, activeSkillNames };
}

// ── Smart Stream Chat (الدالة الرئيسية للـ Pipeline) ─────────────────────────

/**
 * streamChatWithPipeline — نسخة محسّنة من streamChat تستخدم:
 * 1. أدوات مُصفَّاة ديناميكياً (System 1)
 * 2. سياق الذاكرة (System 4)
 * 3. Auto-Skills (System 6)
 * 4. تنفيذ آمن للأدوات (System 2 + 5)
 * 5. تسجيل تلقائي في STM/LTM (System 4)
 */
export async function streamChatWithPipeline(
  req: SmartChatRequest,
  onChunk: (text: string) => void,
  onToolCall?: (toolId: string, result: unknown, ok: boolean) => void,
  signal?: AbortSignal,
): Promise<PipelineResult> {
  const { userMessage, pipelineOpts = {} } = req;
  const { validateTools = true, approvalGate: useApproval = true } = pipelineOpts;

  // ── بناء System Prompt الذكي ───────────────────────────────────────────────
  const basePrompt = req.customSystemPrompt ?? "";
  const { prompt, filteredToolCount, totalToolCount } = buildSmartSystemPrompt(
    userMessage,
    basePrompt,
    pipelineOpts,
  );

  // ── تعطيل enableTools لمنع إرسال كل الأدوات من streamChat ────────────────
  // نحن نُرسل الأدوات المُصفَّاة بدلاً منها في customSystemPrompt
  const smartReq: ChatRequest = {
    ...req,
    customSystemPrompt: pipelineOpts.ecosystemContext
      ? `${prompt}\n\nEcosystem context: use governed planning, memory recall, human approval for sensitive actions, and fail-closed execution.`
      : prompt,
    enableTools: false, // لا ترسل buildToolsSystemBlock() (كل الأدوات)
  };

  // ── التدفق ────────────────────────────────────────────────────────────────
  let fullText = "";
  const wrappedOnChunk = (chunk: string) => {
    fullText += chunk;
    onChunk(chunk);
  };

  await streamChat(smartReq, wrappedOnChunk, signal);

  // ── تنفيذ الأدوات بشكل آمن (System 2 + 5) ────────────────────────────────
  let hasCalls = false;
  let callCount = 0;
  let successCount = 0;

  if (fullText) {
    let toolError: unknown;
    try {
      const safeResult = await processResponseSafe(fullText, {
        skipValidation: !validateTools,
        skipApproval: !useApproval,
        conversationId: pipelineOpts.conversationId,
      });

      hasCalls = safeResult.hasCalls;
      callCount = safeResult.calls.length;
      successCount = safeResult.results.filter((r) => r.ok).length;

      // إشعار المستدعي بنتائج الأدوات
      if (onToolCall && safeResult.results.length > 0) {
        for (const result of safeResult.results) {
          onToolCall(result.toolId, result.result, result.ok);
        }
      }
    } catch (err) {
      toolError = err;
      console.error("[ChatPipeline] Tool execution error:", err);
    }
    void toolError; // acknowledged — error already logged, do not rethrow to avoid breaking stream
  }

  // ── تسجيل في STM (System 4) ───────────────────────────────────────────────
  try {
    STM.incrementMessageCount();
    STM.setContext("lastUserMessage", userMessage.slice(0, 200));
    STM.setContext("lastToolCallCount", callCount);
    STM.setContext("lastFilteredTools", filteredToolCount);
  } catch (err) {
    console.warn("[ChatPipeline] STM recording failed:", err);
  }

  return {
    fullText,
    hasCalls,
    callCount,
    successCount,
    filteredToolCount,
    totalToolCount,
    stmSnapshot: STM.getState(),
  };
}

// ── Multi-Agent Pipeline (System 3 + 1 + 2 + 4 + 5) ─────────────────────────

/**
 * runMultiAgentPipeline — يشغّل مهمة مركّبة عبر DAG من الوكلاء المتخصصين
 * مع التحقق من المدخلات والموافقة البشرية وتسجيل الذاكرة.
 */
export async function runMultiAgentPipeline(
  goal: string,
  userMessage: string,
  onEvent?: (e: OrchestrationEvent) => void,
  signal?: AbortSignal,
): Promise<{ summary: string; success: boolean; toolsExecuted: number }> {
  // ── بناء خطة DAG (System 3) ───────────────────────────────────────────────
  const plan = buildDAGPlan(goal, userMessage);

  // ── تسجيل في STM ──────────────────────────────────────────────────────────
  STM.setContext("activePlanId", plan.id);
  STM.setContext("activePlanGoal", goal.slice(0, 100));

  // ── تنفيذ الخطة ───────────────────────────────────────────────────────────
  const executed = await executeDAGPlan(plan, onEvent, signal);

  // ── تسجيل النتائج في LTM ─────────────────────────────────────────────────
  const doneNodes = executed.nodes.filter((n) => n.status === "done");
  const toolsExecuted = doneNodes.filter((n) => n.toolId).length;

  try {
    LTM.addUserFact(
      `User ran multi-agent task: "${goal.slice(0, 80)}"`,
      0.6,
      "multi-agent-pipeline",
    );
  } catch (err) {
    console.warn("[ChatPipeline] LTM fact recording failed:", err);
  }

  STM.clearContext("activePlanId");

  return {
    summary: executed.summary ?? "Multi-agent task completed.",
    success: executed.status === "done",
    toolsExecuted,
  };
}

// ── تهيئة النظام الكامل ──────────────────────────────────────────────────────

let _pipelineInitialized = false;

/**
 * initSmartPipeline — تهيئة جميع الأنظمة الستة مرة واحدة.
 * استدعِها عند تشغيل التطبيق أو من useEffect في المكوّن الجذري.
 */
export function initSmartPipeline(opts: {
  approvalThreshold?: "low" | "medium" | "high";
  approvalEnabled?: boolean;
  autoApproveCategories?: string[];
} = {}): void {
  if (_pipelineInitialized) return;
  _pipelineInitialized = true;

  // ── ضبط بوابة الموافقة (System 5) ────────────────────────────────────────
  configureApprovalGate({
    enabled: opts.approvalEnabled ?? true,
    riskThreshold: opts.approvalThreshold ?? "high",
    autoApproveCategories: opts.autoApproveCategories ?? ["navigation", "arsenal", "ai"],
    timeoutMs: 60_000,
  });

  // ── تسجيل بداية الجلسة في STM (System 4) ─────────────────────────────────
  STM.incrementMessageCount();
  STM.setContext("pipelineVersion", "1.0.0");
  STM.setContext("pipelineStartedAt", Date.now());

  // ── ربط أحداث الأدوات تلقائياً بـ LTM ────────────────────────────────────
  // (يتم تلقائياً عند استيراد agentMemory.ts — hook موجود فيها)

  console.log("[ChatPipeline] ✅ Smart pipeline initialized — all 6 systems active.");
}

// ── إحصاءات Pipeline للـ UI ──────────────────────────────────────────────────

export type PipelineStats = {
  totalToolExecutions: number;
  sessionMessageCount: number;
  ltmFactsCount: number;
  ltmPrefsCount: number;
  topTools: Array<{ toolId: string; count: number; successRate: number }>;
  recentTools: Array<{ toolId: string; ok: boolean; ts: number }>;
};

export function getPipelineStats(): PipelineStats {
  const stmState = STM.getState();
  const ltmFacts = LTM.getUserFacts(0);
  const ltmPrefs = LTM.getAllPreferences();
  const topTools = LTM.getMostUsedTools(5);
  const recentTools = STM.getRecentTools(5).map((e) => ({
    toolId: e.toolId,
    ok: e.ok,
    ts: e.ts,
  }));

  return {
    totalToolExecutions: stmState.toolHistory.length,
    sessionMessageCount: stmState.messageCount,
    ltmFactsCount: ltmFacts.length,
    ltmPrefsCount: ltmPrefs.length,
    topTools,
    recentTools,
  };
}

// ── بناء سياق Pipeline الكامل للـ System Prompt ──────────────────────────────

export function buildPipelineContextBlock(userMessage: string, maxTools = 12): string {
  const { prompt } = buildSmartSystemPrompt(userMessage, "", {
    maxFilteredTools: maxTools,
    includeSTM: true,
    includeLTM: true,
    autoSkills: true,
  });
  return prompt;
}

// ── ضبط سريع للـ Pipeline من الـ UI ─────────────────────────────────────────

export function setPipelineApprovalMode(mode: "strict" | "balanced" | "permissive"): void {
  const configs = {
    strict:      { riskThreshold: "low" as const,  autoApproveCategories: [] },
    balanced:    { riskThreshold: "high" as const, autoApproveCategories: ["navigation", "arsenal", "ai"] },
    // permissive maps to "high" (max allowed) + broadest auto-approve list
    permissive:  { riskThreshold: "high" as const, autoApproveCategories: ["navigation", "arsenal", "ai", "osint", "files", "memory", "system"] },
  };
  configureApprovalGate(configs[mode]);
}

// ── re-exports للتسهيل ────────────────────────────────────────────────────────
export { buildFilteredToolsSystemBlock } from "./toolRouter";
export { buildFullMemoryContext, STM, LTM } from "./agentMemory";
export { processResponseSafe } from "./toolExecution";
export { buildDAGPlan, executeDAGPlan, runMultiAgentTask } from "./multiAgentOrchestrator";
export { validateToolInput, buildSelfHealingErrorMessage } from "./schemaValidator";
export { requestApproval, configureApprovalGate, assessRisk } from "./approvalGate";
