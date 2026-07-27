// ─────────────────────────────────────────────────────────────────────────────
//  TOOL EXECUTION PIPELINE — Master Safe Execution Module (Integration Layer)
//  يجمع: Schema Validation + Approval Gate + Memory Recording + Tool Router
//  مبني فوق toolsRegistry.ts دون تعديله — إضافة خالصة.
// ─────────────────────────────────────────────────────────────────────────────

import {
  executeTool,
  getToolByModuleId,
  getRegisteredTools,
  parseToolCalls,
  onToolActivity,
  type ParsedToolCall,
} from "./toolsRegistry";
import { validateToolInput, buildSelfHealingErrorMessage, recordValidationResult } from "./schemaValidator";
import { requestApproval, assessRisk, executeWithApproval } from "./approvalGate";
import { STM, LTM } from "./agentMemory";
import { getFilteredAnthropicToolsParam, buildFilteredToolsSystemBlock } from "./toolRouter";

// ── نوع نتيجة التنفيذ الآمن ──────────────────────────────────────────────────
export type SafeToolResult = {
  toolId: string;
  toolName: string;
  ok: boolean;
  result: unknown;
  validationPassed: boolean;
  approvalStatus: string;
  selfHealed: boolean;
  durationMs: number;
};

// ── تنفيذ آمن لأداة واحدة (Validation → Approval → Execute → Memory) ─────────
export async function executeToolSafe(
  toolId: string,
  rawInput: Record<string, unknown>,
  opts: {
    skipValidation?: boolean;
    skipApproval?: boolean;
    conversationId?: string;
  } = {},
): Promise<SafeToolResult> {
  const t0 = Date.now();
  const tool = getToolByModuleId(toolId);

  if (!tool) {
    return {
      toolId,
      toolName: toolId,
      ok: false,
      result: `❌ Unknown tool: "${toolId}". Check the tool registry.`,
      validationPassed: false,
      approvalStatus: "tool_not_found",
      selfHealed: false,
      durationMs: Date.now() - t0,
    };
  }

  // ── 1. Schema Validation ──────────────────────────────────────────────────
  let validationPassed = true;
  let inputToUse = { ...rawInput };
  let selfHealed = false;

  if (!opts.skipValidation) {
    const validation = validateToolInput(tool, rawInput, { selfHeal: true });
    validationPassed = validation.valid;
    selfHealed = validation.selfHealAttempted ?? false;

    recordValidationResult(toolId, validation, validation.valid || selfHealed);

    if (!validation.valid && !selfHealed) {
      const errMsg = buildSelfHealingErrorMessage(tool, rawInput, validation);
      return {
        toolId,
        toolName: tool.name,
        ok: false,
        result: errMsg,
        validationPassed: false,
        approvalStatus: "validation_failed",
        selfHealed: false,
        durationMs: Date.now() - t0,
      };
    }

    if (selfHealed && validation.healedInput) {
      inputToUse = validation.healedInput;
    }
  }

  // ── 2. Approval Gate ──────────────────────────────────────────────────────
  let approvalStatus = "auto_approved";

  if (!opts.skipApproval) {
    const { approved, reason } = await requestApproval(tool, inputToUse);
    approvalStatus = reason;

    if (!approved) {
      return {
        toolId,
        toolName: tool.name,
        ok: false,
        result: `🚫 Execution blocked: ${reason}`,
        validationPassed,
        approvalStatus: reason,
        selfHealed,
        durationMs: Date.now() - t0,
      };
    }
  }

  // ── 3. Execute ────────────────────────────────────────────────────────────
  const { ok, result, toolName } = await executeTool(toolId, inputToUse);
  const durationMs = Date.now() - t0;

  // ── 4. Memory Recording ───────────────────────────────────────────────────
  STM.recordTool({
    toolId,
    toolName: tool.name,
    input: inputToUse,
    output: result,
    ok,
    ts: Date.now(),
    conversationId: opts.conversationId,
  });

  LTM.recordToolExecution({
    toolId,
    toolName: tool.name,
    input: inputToUse,
    ok,
    ts: Date.now(),
    conversationId: opts.conversationId,
  });

  return {
    toolId,
    toolName,
    ok,
    result,
    validationPassed,
    approvalStatus,
    selfHealed,
    durationMs,
  };
}

// ── تنفيذ متوازي آمن ──────────────────────────────────────────────────────────
export async function executeToolsSafeParallel(
  calls: Array<{ toolId: string; input: Record<string, unknown> }>,
  opts: Parameters<typeof executeToolSafe>[2] = {},
): Promise<SafeToolResult[]> {
  return Promise.all(calls.map(({ toolId, input }) => executeToolSafe(toolId, input, opts)));
}

// ── معالجة رد النموذج بتنفيذ آمن ────────────────────────────────────────────
export async function processResponseSafe(text: string, opts: {
  skipValidation?: boolean;
  skipApproval?: boolean;
  conversationId?: string;
} = {}): Promise<{
  hasCalls: boolean;
  calls: ParsedToolCall[];
  results: SafeToolResult[];
  resultsBlock: string;
  cleanedText: string;
}> {
  const calls = parseToolCalls(text);

  if (calls.length === 0) {
    return { hasCalls: false, calls: [], results: [], resultsBlock: "", cleanedText: text };
  }

  // تنفيذ بالتوازي مع الفلترة الآمنة
  const results = await executeToolsSafeParallel(
    calls.map((c) => ({ toolId: c.toolId, input: c.input })),
    opts,
  );

  // بناء كتلة النتائج للنموذج
  const resultParts = results.map((r, i) => {
    const call = calls[i];
    const badges: string[] = [];
    if (r.selfHealed) badges.push("auto-corrected");
    if (!r.validationPassed) badges.push("validation-failed");
    const badgeStr = badges.length > 0 ? ` [${badges.join(", ")}]` : "";
    return `<tool_result>\n{"tool": "${call.toolId}", "ok": ${r.ok}, "result": ${JSON.stringify(r.result)}, "duration_ms": ${r.durationMs}${badgeStr}}\n</tool_result>`;
  });

  // إزالة كتل <tool_call> من النص
  let cleanedText = text;
  for (const call of calls) {
    cleanedText = cleanedText.replace(call.rawBlock, "").trim();
  }

  return {
    hasCalls: true,
    calls,
    results,
    resultsBlock: resultParts.join("\n"),
    cleanedText,
  };
}

// ── حقن سياق الذاكرة في System Prompt ─────────────────────────────────────────
export function buildMemoryEnrichedSystemPrompt(
  basePrompt: string,
  userMessage: string,
  opts: { includeSTM?: boolean; includeLTM?: boolean; includeFilteredTools?: boolean; maxTools?: number } = {},
): string {
  const { includeSTM = true, includeLTM = true, includeFilteredTools = true, maxTools = 10 } = opts;

  let enhanced = basePrompt;

  // LTM context
  if (includeLTM) {
    const ltmBlock = LTM.buildContextBlock({ includeFacts: true, includePrefs: true });
    if (ltmBlock) enhanced += `\n\n${ltmBlock}`;
  }

  // STM context
  if (includeSTM) {
    const stmBlock = STM.buildContextBlock();
    if (stmBlock) enhanced += `\n\n${stmBlock}`;
  }

  // Filtered tools
  if (includeFilteredTools && userMessage) {
    const { block } = buildFilteredToolsSystemBlock(userMessage, "", { maxTools });
    if (block) enhanced += block;
  }

  return enhanced;
}

// ── تهيئة نظام الموافقة في toolsRegistry ─────────────────────────────────────
// يُستدعى مرة واحدة من ChatView لربط نظام الموافقة الجديد بـ toolsRegistry
export function initApprovalBridge(): void {
  // Override the default window.confirm with our new approvalGate system
  import("./toolsRegistry").then(({ setConfirmListener }) => {
    setConfirmListener(async (toolId, description) => {
      const tool = getToolByModuleId(toolId);
      if (!tool) return false;
      const { approved } = await requestApproval(tool, {});
      return approved;
    });
  }).catch(() => { /* ignore */ });
}

// ── إحصاءات التنفيذ الآمن ────────────────────────────────────────────────────
export function getExecutionStats(): {
  totalExecutions: number;
  successRate: number;
  topTools: Array<{ toolId: string; count: number; successRate: number }>;
  avgDuration: number;
} {
  const tools = LTM.getMostUsedTools(10);
  const history = LTM.getToolHistory(undefined, 100);
  const total = history.length;
  const successful = history.filter((h) => h.ok).length;

  return {
    totalExecutions: total,
    successRate: total > 0 ? successful / total : 0,
    topTools: tools,
    avgDuration: 0, // LTM doesn't track duration yet
  };
}

// ── re-exports للتسهيل ───────────────────────────────────────────────────────
export { getFilteredAnthropicToolsParam, buildFilteredToolsSystemBlock };
export { STM, LTM };
export { validateToolInput, buildSelfHealingErrorMessage };
export { requestApproval, assessRisk, configureApprovalGate } from "./approvalGate";
export { runMultiAgentTask, buildDAGPlan, executeDAGPlan } from "./multiAgentOrchestrator";
export { routeTools, getRouterStats } from "./toolRouter";
export { searchMemory, buildFullMemoryContext } from "./agentMemory";
