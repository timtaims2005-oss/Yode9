// ─────────────────────────────────────────────────────────────────────────────
//  TOOLS REGISTRY — سجل الأدوات الديناميكي المتوافق مع Anthropic tool_use
//  يختلف عن ToolRegistry.ts الموجود — هذا النظام الجديد يدعم الـ tool_use
//  الحقيقي لـ Anthropic API وحلقات الأدوات المتعددة المتوازية/المتسلسلة.
//  قاعدة: لا حذف، لا تعديل للكود القائم — إضافة فقط.
// ─────────────────────────────────────────────────────────────────────────────

// ── نوع تعريف الأداة ──────────────────────────────────────────────────────────
export type ToolDefinition = {
  moduleId: string;      // معرّف فريد للأداة (snake_case)
  name: string;          // الاسم المعروض للمستخدم
  description: string;   // وصف دقيق ما تفعله الأداة (يُقرأ بالنموذج)
  inputSchema: {         // JSON Schema متوافق مع صيغة Anthropic tools
    type: "object";
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required?: string[];
  };
  execute: (input: Record<string, unknown>) => Promise<unknown>;
  category?: "arsenal" | "navigation" | "system" | "files" | "memory" | "osint" | "ai";
  confirmRequired?: boolean; // هل يحتاج تأكيد المستخدم قبل التنفيذ؟
};

// ── السجل الداخلي ─────────────────────────────────────────────────────────────
const _registry = new Map<string, ToolDefinition>();

export function registerTool(def: ToolDefinition): void {
  _registry.set(def.moduleId, def);
}

export function getRegisteredTools(): ToolDefinition[] {
  return Array.from(_registry.values());
}

export function getToolByModuleId(moduleId: string): ToolDefinition | undefined {
  return _registry.get(moduleId);
}

export function getToolCount(): number {
  return _registry.size;
}

export function getToolsByCategory(category: ToolDefinition["category"]): ToolDefinition[] {
  return getRegisteredTools().filter(t => t.category === category);
}

// ── تحويل السجل إلى صيغة Anthropic tools param ────────────────────────────────
export type AnthropicToolParam = {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export function getAnthropicToolsParam(): AnthropicToolParam[] {
  return getRegisteredTools().map((def) => ({
    name: def.moduleId,
    description: def.description,
    input_schema: {
      type: "object" as const,
      properties: def.inputSchema.properties ?? {},
      required: def.inputSchema.required ?? [],
    },
  }));
}

// ── نظام أحداث نشاط الأدوات للـ UI ──────────────────────────────────────────
export type ToolActivityEvent = {
  toolId: string;
  toolName: string;
  status: "running" | "done" | "error";
  result?: string;
  ts: number;
};

type ToolActivityListener = (e: ToolActivityEvent) => void;
const _activityListeners: ToolActivityListener[] = [];

export function onToolActivity(fn: ToolActivityListener): () => void {
  _activityListeners.push(fn);
  return () => {
    const i = _activityListeners.indexOf(fn);
    if (i >= 0) _activityListeners.splice(i, 1);
  };
}

function _emitActivity(e: ToolActivityEvent) {
  _activityListeners.forEach((fn) => { try { fn(e); } catch { /* ignore */ } });
}

// ── مستمع تأكيد العمليات الحساسة ──────────────────────────────────────────────
type ConfirmListener = (toolId: string, description: string) => Promise<boolean>;
let _confirmListener: ConfirmListener = async (_id, desc) => {
  return window.confirm(`Arsenal Tool: ${desc}`);
};

export function setConfirmListener(fn: ConfirmListener): void {
  _confirmListener = fn;
}

// ── تنفيذ أداة واحدة مع إطلاق أحداث النشاط ────────────────────────────────────
export async function executeTool(
  toolId: string,
  input: Record<string, unknown>,
): Promise<{ ok: boolean; result: unknown; toolName: string }> {
  const def = _registry.get(toolId);
  if (!def) {
    return { ok: false, result: `Unknown tool: ${toolId}`, toolName: toolId };
  }

  // تحقق من التأكيد للأدوات الحساسة
  if (def.confirmRequired) {
    const confirmed = await _confirmListener(toolId, def.description);
    if (!confirmed) {
      return { ok: false, result: "User cancelled operation.", toolName: def.name };
    }
  }

  _emitActivity({ toolId, toolName: def.name, status: "running", ts: Date.now() });

  try {
    const result = await def.execute(input);
    const resultStr = typeof result === "string" ? result : JSON.stringify(result);
    _emitActivity({ toolId, toolName: def.name, status: "done", result: resultStr, ts: Date.now() });
    return { ok: true, result, toolName: def.name };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    _emitActivity({ toolId, toolName: def.name, status: "error", result: errMsg, ts: Date.now() });
    return { ok: false, result: errMsg, toolName: def.name };
  }
}

// ── تنفيذ أدوات متعددة بالتوازي ───────────────────────────────────────────────
export async function executeToolsParallel(
  calls: Array<{ toolId: string; input: Record<string, unknown> }>,
): Promise<Array<{ toolId: string; ok: boolean; result: unknown; toolName: string }>> {
  return Promise.all(calls.map(async ({ toolId, input }) => {
    const { ok, result, toolName } = await executeTool(toolId, input);
    return { toolId, ok, result, toolName };
  }));
}

// ── تنفيذ أدوات بالتسلسل (مخرجات أداة → مدخلات الأداة التالية) ──────────────
export async function executeToolsChain(
  chain: Array<{ toolId: string; inputBuilder: (prevResult: unknown) => Record<string, unknown> }>,
): Promise<Array<{ toolId: string; ok: boolean; result: unknown }>> {
  const results: Array<{ toolId: string; ok: boolean; result: unknown }> = [];
  let prevResult: unknown = null;

  for (const step of chain) {
    const input = step.inputBuilder(prevResult);
    const { ok, result } = await executeTool(step.toolId, input);
    results.push({ toolId: step.toolId, ok, result });
    prevResult = result;
    if (!ok) break; // أوقف السلسلة عند الفشل
  }

  return results;
}

// ── تحليل نداءات الأدوات من نص رد النموذج ────────────────────────────────────
export type ParsedToolCall = {
  toolId: string;
  input: Record<string, unknown>;
  rawBlock: string;
  callIndex: number;
};

export function parseToolCalls(text: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = [];
  // صيغة <tool_call>{"name":"...","input":{...}}</tool_call>
  const re1 = /<tool_call>([\s\S]*?)<\/tool_call>/g;
  // صيغة ```json\n{"name":"...","input":{...}}\n```
  const re2 = /```(?:json)?\s*\n?\s*\{[\s\S]*?"(?:name|tool_name|toolId)"[\s\S]*?\}\s*\n?```/g;

  let m: RegExpExecArray | null;
  let idx = 0;

  while ((m = re1.exec(text)) !== null) {
    try {
      const raw = m[1].trim();
      const parsed = JSON.parse(raw);
      const toolId = parsed.name ?? parsed.tool_name ?? parsed.toolId ?? "";
      if (toolId) {
        calls.push({
          toolId,
          input: parsed.input ?? parsed.parameters ?? parsed.params ?? parsed.args ?? {},
          rawBlock: m[0],
          callIndex: idx++,
        });
      }
    } catch { /* skip malformed */ }
  }

  if (calls.length === 0) {
    while ((m = re2.exec(text)) !== null) {
      try {
        const raw = m[0].replace(/```(?:json)?/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(raw);
        const toolId = parsed.name ?? parsed.tool_name ?? parsed.toolId ?? "";
        if (toolId) {
          calls.push({ toolId, input: parsed.input ?? {}, rawBlock: m[0], callIndex: idx++ });
        }
      } catch { /* skip */ }
    }
  }

  return calls;
}

// ── بناء System Block يصف الأدوات للنموذج ────────────────────────────────────
export function buildToolsSystemBlock(): string {
  const tools = getRegisteredTools();
  if (tools.length === 0) return "";

  const arsenalTools = tools.filter((t) => t.category === "arsenal").slice(0, 80);
  const navTools = tools.filter((t) => t.category === "navigation");
  const sysTools = tools.filter((t) => t.category === "system" || t.category === "files" || t.category === "memory");
  const aiTools = tools.filter((t) => t.category === "ai");

  const formatList = (list: ToolDefinition[]) =>
    list.map((t) => `  • **${t.moduleId}**: ${t.description.slice(0, 120)}`).join("\n");

  return `\n\n[ARSENAL DYNAMIC TOOL-CALLING SYSTEM — ${tools.length} TOOLS ACTIVE]
You have real-time access to ${tools.length} tools. To invoke a tool, emit this exact XML block in your response:

<tool_call>
{"name": "tool_id", "input": {"param1": "value1", "param2": "value2"}}
</tool_call>

RULES:
- You can call multiple tools in a single response (they run in parallel)
- Chain tools: use output from one as input to another
- Always wait for <tool_result> blocks before continuing
- Never fabricate tool results — always call the real tool

ARSENAL HUB MODULES (${arsenalTools.length} available):
${formatList(arsenalTools)}

NAVIGATION & UI CONTROLS (${navTools.length} available):
${formatList(navTools)}

SYSTEM & FILES (${sysTools.length} available):
${formatList(sysTools)}

AI UTILITIES (${aiTools.length} available):
${formatList(aiTools)}

Call tools proactively whenever they would help the user accomplish their goal.`;
}

// ── تنفيذ أدوات من نص رد النموذج وإعادة النتائج ──────────────────────────────
export async function processResponseForToolCalls(text: string): Promise<{
  hasCalls: boolean;
  calls: ParsedToolCall[];
  resultsBlock: string;
  cleanedText: string;
}> {
  const calls = parseToolCalls(text);
  if (calls.length === 0) {
    return { hasCalls: false, calls: [], resultsBlock: "", cleanedText: text };
  }

  // تنفيذ جميع الأدوات بالتوازي
  const execResults = await executeToolsParallel(
    calls.map((c) => ({ toolId: c.toolId, input: c.input })),
  );

  const resultParts = execResults.map((r) =>
    `<tool_result>\n{"tool": "${r.toolId}", "ok": ${r.ok}, "result": ${JSON.stringify(r.result)}}\n</tool_result>`,
  );

  // إزالة كتل <tool_call> من النص لإرجاعه نظيفاً
  let cleanedText = text;
  for (const call of calls) {
    cleanedText = cleanedText.replace(call.rawBlock, "").trim();
  }

  return {
    hasCalls: true,
    calls,
    resultsBlock: resultParts.join("\n"),
    cleanedText,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  ADDITIONS — Tool Router Integration Helpers (System 1 bridge)
//  إضافة خالصة — لا تعديل للكود القائم.
// ─────────────────────────────────────────────────────────────────────────────

/** Quick wrapper: get filtered tools param for a given user message */
export async function getFilteredToolsForMessage(
  userMessage: string,
  maxTools = 10,
): Promise<ReturnType<typeof getAnthropicToolsParam>> {
  try {
    const { getFilteredAnthropicToolsParam } = await import("./toolRouter");
    return getFilteredAnthropicToolsParam(userMessage, "", { maxTools });
  } catch {
    return getAnthropicToolsParam();
  }
}

/** Validate + execute with schema healing (System 2 bridge) */
export async function validateAndExecuteTool(
  toolId: string,
  rawInput: Record<string, unknown>,
): Promise<{ ok: boolean; result: unknown; selfHealed: boolean }> {
  try {
    const { validateToolInput } = await import("./schemaValidator");
    const tool = getToolByModuleId(toolId);
    if (!tool) return { ok: false, result: `Unknown tool: ${toolId}`, selfHealed: false };
    const validation = validateToolInput(tool, rawInput, { selfHeal: true });
    const inputToUse = validation.selfHealAttempted && validation.healedInput ? validation.healedInput : rawInput;
    const { ok, result } = await executeTool(toolId, inputToUse);
    return { ok, result, selfHealed: validation.selfHealAttempted ?? false };
  } catch {
    return executeTool(toolId, rawInput).then(({ ok, result }) => ({ ok, result, selfHealed: false }));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  ADDITIONS — Full Pipeline Integration (Systems 1-5 bridge)
//  إضافة خالصة — لا تعديل للكود القائم.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * processResponseSafeEnhanced — معالجة رد النموذج عبر Pipeline الكامل:
 * System 2: Schema Validation + Self-Healing
 * System 5: Human-in-the-Loop Approval Gate
 * System 4: STM + LTM Memory Recording
 * يُعيد كتلة tool_result منسَّقة مع metadata كامل.
 */
export async function processResponseSafeEnhanced(
  text: string,
  opts: {
    skipValidation?: boolean;
    skipApproval?: boolean;
    conversationId?: string;
    onToolResult?: (toolId: string, ok: boolean, result: unknown, durationMs: number) => void;
  } = {},
): Promise<{
  hasCalls: boolean;
  calls: ParsedToolCall[];
  resultsBlock: string;
  cleanedText: string;
  totalDurationMs: number;
  successCount: number;
  failCount: number;
  selfHealedCount: number;
}> {
  const calls = parseToolCalls(text);
  const t0 = Date.now();

  if (calls.length === 0) {
    return {
      hasCalls: false, calls: [], resultsBlock: "", cleanedText: text,
      totalDurationMs: 0, successCount: 0, failCount: 0, selfHealedCount: 0,
    };
  }

  try {
    const { executeToolsSafeParallel } = await import("./toolExecution");
    const results = await executeToolsSafeParallel(
      calls.map((c) => ({ toolId: c.toolId, input: c.input })),
      {
        skipValidation: opts.skipValidation ?? false,
        skipApproval: opts.skipApproval ?? false,
        conversationId: opts.conversationId,
      },
    );

    const resultParts: string[] = [];
    let successCount = 0;
    let failCount = 0;
    let selfHealedCount = 0;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const call = calls[i];
      const badges: string[] = [];
      if (r.selfHealed) { badges.push("auto-corrected"); selfHealedCount++; }
      if (!r.validationPassed) badges.push("validation-issue");
      if (r.ok) successCount++; else failCount++;
      const badgeStr = badges.length > 0 ? `, "badges": [${badges.map((b) => `"${b}"`).join(",")}]` : "";
      resultParts.push(
        `<tool_result>\n{"tool":"${call.toolId}","ok":${r.ok},"result":${JSON.stringify(r.result)},"duration_ms":${r.durationMs}${badgeStr}}\n</tool_result>`,
      );
      opts.onToolResult?.(r.toolId, r.ok, r.result, r.durationMs);
    }

    let cleanedText = text;
    for (const call of calls) {
      cleanedText = cleanedText.replace(call.rawBlock, "").trim();
    }

    return {
      hasCalls: true, calls, resultsBlock: resultParts.join("\n"), cleanedText,
      totalDurationMs: Date.now() - t0, successCount, failCount, selfHealedCount,
    };
  } catch {
    // Fallback to basic processResponseForToolCalls
    const basic = await processResponseForToolCalls(text);
    return {
      ...basic,
      totalDurationMs: Date.now() - t0,
      successCount: basic.calls.length,
      failCount: 0,
      selfHealedCount: 0,
    };
  }
}

/**
 * getToolsByQuery — يُعيد الأدوات المُصفَّاة دلالياً لرسالة المستخدم (System 1)
 * Convenience wrapper around toolRouter without circular imports.
 */
export async function getToolsByQuery(
  userMessage: string,
  maxTools = 12,
): Promise<AnthropicToolParam[]> {
  try {
    const { getFilteredAnthropicToolsParam } = await import("./toolRouter");
    return getFilteredAnthropicToolsParam(userMessage, "", { maxTools });
  } catch {
    return getAnthropicToolsParam().slice(0, maxTools);
  }
}

/**
 * buildSmartToolsBlock — يبني System Block ذكي مُصفَّى (System 1 + 4)
 * يجمع: الأدوات المُرشَّحة + سياق STM/LTM
 */
export async function buildSmartToolsBlock(
  userMessage: string,
  maxTools = 12,
): Promise<string> {
  try {
    const { buildFilteredToolsSystemBlock } = await import("./toolRouter");
    const { block } = buildFilteredToolsSystemBlock(userMessage, "", { maxTools });
    return block;
  } catch {
    return buildToolsSystemBlock();
  }
}
