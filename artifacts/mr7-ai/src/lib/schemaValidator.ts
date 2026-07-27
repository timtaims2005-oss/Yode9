// ─────────────────────────────────────────────────────────────────────────────
//  SCHEMA VALIDATOR — Input Validation & Self-Healing (System 2)
//  يتحقق من مدخلات الأداة قبل التنفيذ ويُعيد رسائل خطأ تُمكّن النموذج
//  من تصحيح نفسه تلقائياً (Self-Correction Loop).
//  قاعدة: لا حذف، لا تعديل للكود القائم — إضافة فقط.
// ─────────────────────────────────────────────────────────────────────────────

import type { ToolDefinition } from "./toolsRegistry";

// ── أنواع التحقق ──────────────────────────────────────────────────────────────
export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  selfHealAttempted?: boolean;
  healedInput?: Record<string, unknown>;
};

export type ValidationError = {
  field: string;
  code: "REQUIRED" | "WRONG_TYPE" | "INVALID_ENUM" | "TOO_SHORT" | "TOO_LONG" | "UNKNOWN_FIELD";
  message: string;
  expected?: string;
  got?: string;
};

export type ValidationWarning = {
  field: string;
  message: string;
};

// ── JS type resolver ──────────────────────────────────────────────────────────
function getJsType(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

// ── محاولة التحويل التلقائي للنوع ────────────────────────────────────────────
function coerceValue(value: unknown, expectedType: string): { ok: boolean; value: unknown } {
  const t = getJsType(value);
  if (t === expectedType) return { ok: true, value };

  switch (expectedType) {
    case "string":
      if (t === "number" || t === "boolean") return { ok: true, value: String(value) };
      break;
    case "number":
      if (t === "string") {
        const n = Number(value);
        if (!isNaN(n)) return { ok: true, value: n };
      }
      break;
    case "boolean":
      if (t === "string") {
        const v = (value as string).toLowerCase();
        if (v === "true" || v === "1" || v === "yes") return { ok: true, value: true };
        if (v === "false" || v === "0" || v === "no") return { ok: true, value: false };
      }
      if (t === "number") return { ok: true, value: Boolean(value) };
      break;
    case "array":
      if (t === "string") {
        try {
          const parsed = JSON.parse(value as string);
          if (Array.isArray(parsed)) return { ok: true, value: parsed };
        } catch { /* ignore */ }
        // wrap single value in array
        return { ok: true, value: [value] };
      }
      break;
    case "object":
      if (t === "string") {
        try {
          const parsed = JSON.parse(value as string);
          if (typeof parsed === "object" && !Array.isArray(parsed)) return { ok: true, value: parsed };
        } catch { /* ignore */ }
      }
      break;
  }
  return { ok: false, value };
}

// ── التحقق الرئيسي من مدخلات الأداة ─────────────────────────────────────────
export function validateToolInput(
  tool: ToolDefinition,
  input: Record<string, unknown>,
  options: { selfHeal?: boolean; strict?: boolean } = {},
): ValidationResult {
  const { selfHeal = true, strict = false } = options;
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];
  let healedInput = { ...input };
  let selfHealAttempted = false;

  const schema = tool.inputSchema;
  const properties = schema.properties ?? {};
  const required = schema.required ?? [];

  // 1) فحص الحقول المطلوبة
  for (const field of required) {
    if (!(field in input) || input[field] === null || input[field] === undefined || input[field] === "") {
      const propDef = properties[field];
      errors.push({
        field,
        code: "REQUIRED",
        message: `Required field "${field}" is missing or empty.`,
        expected: propDef?.type ?? "any",
        got: "undefined",
      });
      // محاولة توليد قيمة افتراضية بسيطة
      if (selfHeal && propDef) {
        selfHealAttempted = true;
        switch (propDef.type) {
          case "string": healedInput[field] = ""; break;
          case "number": healedInput[field] = 0; break;
          case "boolean": healedInput[field] = false; break;
          case "array": healedInput[field] = []; break;
          case "object": healedInput[field] = {}; break;
        }
        suggestions.push(`Field "${field}" was defaulted to empty ${propDef.type}. Please provide the actual value.`);
      }
    }
  }

  // 2) فحص أنواع الحقول الموجودة
  for (const [field, value] of Object.entries(input)) {
    if (value === null || value === undefined) continue;
    const propDef = properties[field];

    if (!propDef) {
      if (strict) {
        errors.push({ field, code: "UNKNOWN_FIELD", message: `Unknown field "${field}" not in schema.`, got: String(value) });
      } else {
        warnings.push({ field, message: `Field "${field}" is not defined in schema but will be passed through.` });
      }
      continue;
    }

    const actualType = getJsType(value);
    const expectedType = propDef.type;

    if (expectedType && actualType !== expectedType) {
      // محاولة التحويل التلقائي
      if (selfHeal) {
        const coerced = coerceValue(value, expectedType);
        if (coerced.ok) {
          selfHealAttempted = true;
          healedInput[field] = coerced.value;
          warnings.push({ field, message: `Auto-coerced "${field}" from ${actualType} to ${expectedType}.` });
        } else {
          errors.push({
            field,
            code: "WRONG_TYPE",
            message: `Field "${field}" has wrong type: expected ${expectedType}, got ${actualType}.`,
            expected: expectedType,
            got: actualType,
          });
        }
      } else {
        errors.push({
          field,
          code: "WRONG_TYPE",
          message: `Field "${field}" has wrong type: expected ${expectedType}, got ${actualType}.`,
          expected: expectedType,
          got: actualType,
        });
      }
    }

    // فحص enum إذا وُجد
    if (propDef.enum && !propDef.enum.includes(String(healedInput[field] ?? value))) {
      errors.push({
        field,
        code: "INVALID_ENUM",
        message: `Field "${field}" must be one of: ${propDef.enum.join(", ")}. Got "${value}".`,
        expected: propDef.enum.join(" | "),
        got: String(value),
      });
      suggestions.push(`Valid values for "${field}": ${propDef.enum.join(", ")}`);
    }
  }

  // 3) اقتراح تصحيح ذاتي
  if (errors.length > 0) {
    suggestions.push(
      `Tool "${tool.moduleId}" requires: { ${required.map((r) => `${r}: ${properties[r]?.type ?? "any"}`).join(", ")} }`,
    );
    suggestions.push(`Tool description: ${tool.description.slice(0, 200)}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    selfHealAttempted,
    healedInput,
  };
}

// ── بناء رسالة خطأ مُفصَّلة للنموذج (Self-Healing tool_result) ──────────────
export function buildSelfHealingErrorMessage(
  tool: ToolDefinition,
  input: Record<string, unknown>,
  validation: ValidationResult,
): string {
  const lines: string[] = [
    `❌ Tool "${tool.moduleId}" failed schema validation.`,
    "",
    "ERRORS:",
    ...validation.errors.map((e) => `  • [${e.code}] ${e.message}`),
  ];

  if (validation.warnings.length > 0) {
    lines.push("", "WARNINGS:", ...validation.warnings.map((w) => `  ⚠ ${w.message}`));
  }

  if (validation.suggestions.length > 0) {
    lines.push("", "HOW TO FIX:", ...validation.suggestions.map((s) => `  → ${s}`));
  }

  if (validation.selfHealAttempted && validation.healedInput) {
    const diffFields = Object.keys(validation.healedInput).filter(
      (k) => JSON.stringify(validation.healedInput![k]) !== JSON.stringify(input[k]),
    );
    if (diffFields.length > 0) {
      lines.push(
        "",
        "AUTO-CORRECTION APPLIED:",
        `  Fields adjusted: ${diffFields.join(", ")}`,
        "  You may retry with the corrected values or provide proper values.",
      );
    }
  }

  lines.push("", "Please retry the tool call with corrected input parameters.");
  return lines.join("\n");
}

// ── التحقق + التنفيذ الذاتي المُحسَّن ────────────────────────────────────────
export async function validateAndExecute(
  tool: ToolDefinition,
  rawInput: Record<string, unknown>,
): Promise<{ ok: boolean; result: unknown; validation: ValidationResult }> {
  const validation = validateToolInput(tool, rawInput);

  if (!validation.valid && !validation.selfHealAttempted) {
    const errMsg = buildSelfHealingErrorMessage(tool, rawInput, validation);
    return { ok: false, result: errMsg, validation };
  }

  const inputToUse = validation.selfHealAttempted ? (validation.healedInput ?? rawInput) : rawInput;

  try {
    const result = await tool.execute(inputToUse);
    return { ok: true, result, validation };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    // هل الخطأ يشير إلى معامل مفقود؟ أضف سياق التصحيح الذاتي
    const enriched =
      errMsg.includes("required") || errMsg.includes("undefined") || errMsg.includes("null")
        ? `${errMsg}\n\n[Self-Heal Hint] Ensure all required params are present: ${(tool.inputSchema.required ?? []).join(", ")}`
        : errMsg;
    return { ok: false, result: enriched, validation };
  }
}

// ── مُدير تاريخ أخطاء التحقق للمحادثة ──────────────────────────────────────
const _validationHistory: Array<{
  toolId: string;
  ts: number;
  errors: ValidationError[];
  fixed: boolean;
}> = [];

export function recordValidationResult(
  toolId: string,
  validation: ValidationResult,
  fixed: boolean,
): void {
  _validationHistory.push({
    toolId,
    ts: Date.now(),
    errors: validation.errors,
    fixed,
  });
  // احتفظ بآخر 50 سجل فقط
  if (_validationHistory.length > 50) _validationHistory.shift();
}

export function getValidationHistory(): typeof _validationHistory {
  return [..._validationHistory];
}

export function getToolErrorRate(toolId: string): number {
  const relevant = _validationHistory.filter((h) => h.toolId === toolId);
  if (relevant.length === 0) return 0;
  const errorCount = relevant.filter((h) => h.errors.length > 0).length;
  return errorCount / relevant.length;
}
