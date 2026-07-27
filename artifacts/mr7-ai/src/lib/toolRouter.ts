// ─────────────────────────────────────────────────────────────────────────────
//  TOOL ROUTER — Dynamic Semantic Tool Filtering (System 1)
//  يحلل رسالة المستخدم ويختار أفضل N أداة دلالياً بدلاً من إرسال كل الأدوات
//  قاعدة: لا حذف، لا تعديل للكود القائم — إضافة فقط.
// ─────────────────────────────────────────────────────────────────────────────

import { getRegisteredTools, type ToolDefinition, type AnthropicToolParam } from "./toolsRegistry";

// ── أنواع مساعدة ──────────────────────────────────────────────────────────────
export type ToolRouterOptions = {
  maxTools?: number;          // أقصى عدد أدوات (افتراضي: 10)
  minScore?: number;          // حد أدنى للنقاط (0–1، افتراضي: 0)
  forceInclude?: string[];    // معرّفات أدوات تُضاف دائماً بصرف النظر عن النقاط
  categories?: ToolDefinition["category"][]; // تصفية حسب الفئة أولاً
  debug?: boolean;            // طباعة نقاط التصفية للمطور
};

export type RoutedTool = {
  tool: ToolDefinition;
  score: number;
  matchedTerms: string[];
};

// ── قاموس الكلمات المفتاحية للفئات ───────────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  arsenal: ["arsenal", "module", "launch", "tool", "hub", "activate"],
  navigation: ["open", "navigate", "go to", "show", "page", "screen", "view", "اذهب", "افتح"],
  system: ["system", "config", "setting", "theme", "mode", "النظام", "الإعدادات"],
  files: ["file", "upload", "download", "create", "save", "write", "read", "ملف", "حفظ"],
  memory: ["remember", "recall", "memory", "store", "forget", "ذاكرة", "احفظ"],
  osint: ["osint", "scan", "recon", "intel", "threat", "domain", "ip", "hash", "اختراق", "فحص"],
  ai: ["ai", "model", "generate", "analyze", "predict", "توليد", "تحليل"],
};

// ── استخراج مصطلحات البحث من رسالة المستخدم ────────────────────────────────
function extractSearchTerms(text: string): string[] {
  const lower = text.toLowerCase();
  // استخراج الكلمات بدون stop words شائعة
  const stopWords = new Set([
    "the","a","an","is","are","was","were","be","been","being",
    "have","has","had","do","does","did","will","would","can","could",
    "should","may","might","shall","i","you","he","she","it","we","they",
    "me","him","her","us","them","my","your","his","its","our","their",
    "in","on","at","to","for","of","with","by","from","as","that","this",
    "and","or","but","not","so","if","then","when","where","who","what",
    "how","why","هل","في","من","على","مع","إلى","أن","هذا","التي","الذي",
  ]);
  const tokens = lower
    .replace(/[^a-z0-9\u0600-\u06ff\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !stopWords.has(t));
  return [...new Set(tokens)];
}

// ── حساب نقاط التطابق الدلالي لأداة واحدة ────────────────────────────────────
function scoreToolMatch(tool: ToolDefinition, terms: string[], contextTokens: string[]): number {
  const descLower = (tool.description + " " + tool.name + " " + (tool.moduleId ?? "")).toLowerCase();
  let score = 0;
  const matched: string[] = [];

  for (const term of terms) {
    if (descLower.includes(term)) {
      // وزن أعلى إذا الكلمة في الاسم أو معرّف الأداة
      const inName = (tool.name + " " + tool.moduleId).toLowerCase().includes(term);
      score += inName ? 3 : 1;
      matched.push(term);
    }
  }

  // bonus: تطابق فئة الأداة مع نية المستخدم
  if (tool.category) {
    const catKws = CATEGORY_KEYWORDS[tool.category] ?? [];
    for (const kw of catKws) {
      if (contextTokens.some((t) => t.includes(kw) || kw.includes(t))) {
        score += 2;
        break;
      }
    }
  }

  return score;
}

// ── محرك التوجيه الرئيسي ──────────────────────────────────────────────────────
export function routeTools(
  userMessage: string,
  conversationContext: string = "",
  options: ToolRouterOptions = {},
): RoutedTool[] {
  const {
    maxTools = 10,
    minScore = 0,
    forceInclude = [],
    categories,
    debug = false,
  } = options;

  const allTools = getRegisteredTools();
  if (allTools.length === 0) return [];

  // الدمج بين رسالة المستخدم وآخر 500 حرف من السياق
  const combinedText = userMessage + " " + conversationContext.slice(-500);
  const terms = extractSearchTerms(combinedText);
  const contextTokens = extractSearchTerms(combinedText);

  // تصفية حسب الفئة إذا حُددت
  const candidateTools = categories
    ? allTools.filter((t) => categories.includes(t.category))
    : allTools;

  // حساب النقاط لكل أداة
  const scored = candidateTools.map((tool) => {
    const score = scoreToolMatch(tool, terms, contextTokens);
    const matchedTerms = terms.filter((t) =>
      (tool.description + " " + tool.name + " " + tool.moduleId).toLowerCase().includes(t),
    );
    return { tool, score, matchedTerms };
  });

  if (debug) {
    const top = scored.sort((a, b) => b.score - a.score).slice(0, 5);
    console.debug("[ToolRouter] Top matches:", top.map((r) => `${r.tool.moduleId}:${r.score}`).join(", "));
  }

  // فرز تنازلياً وأخذ أفضل maxTools
  const filtered = scored
    .filter((r) => r.score > minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxTools);

  // إضافة الأدوات المُجبرة إذا لم تكن موجودة
  const existingIds = new Set(filtered.map((r) => r.tool.moduleId));
  for (const fId of forceInclude) {
    if (!existingIds.has(fId)) {
      const tool = allTools.find((t) => t.moduleId === fId);
      if (tool) filtered.push({ tool, score: 0, matchedTerms: [] });
    }
  }

  return filtered;
}

// ── تحويل النتائج إلى صيغة Anthropic tools param ─────────────────────────────
export function getFilteredAnthropicToolsParam(
  userMessage: string,
  conversationContext?: string,
  options?: ToolRouterOptions,
): AnthropicToolParam[] {
  const routed = routeTools(userMessage, conversationContext, options);
  return routed.map(({ tool }) => ({
    name: tool.moduleId,
    description: tool.description,
    input_schema: {
      type: "object" as const,
      properties: tool.inputSchema.properties ?? {},
      required: tool.inputSchema.required ?? [],
    },
  }));
}

// ── بناء System Block مُصفَّى للنموذج ────────────────────────────────────────
export function buildFilteredToolsSystemBlock(
  userMessage: string,
  conversationContext?: string,
  options?: ToolRouterOptions,
): { block: string; toolCount: number; totalCount: number } {
  const allCount = getRegisteredTools().length;
  const routed = routeTools(userMessage, conversationContext, options);

  if (routed.length === 0) {
    return { block: "", toolCount: 0, totalCount: allCount };
  }

  const toolLines = routed
    .map(({ tool }) => `  • **${tool.moduleId}**: ${tool.description.slice(0, 150)}`)
    .join("\n");

  const block = `\n\n[TOOL ROUTER — ${routed.length}/${allCount} tools selected for this query]
You have access to these tools (pre-selected for relevance). Invoke with <tool_call> blocks:

${toolLines}

Rules:
- Call multiple tools in parallel when possible
- Wait for <tool_result> before continuing
- Never fabricate tool results`;

  return { block, toolCount: routed.length, totalCount: allCount };
}

// ── إحصاءات التوجيه للمطوّر ───────────────────────────────────────────────────
export type ToolRouterStats = {
  totalTools: number;
  filteredTools: number;
  filterRatio: number;
  topMatchedTerms: string[];
};

export function getRouterStats(
  userMessage: string,
  options?: ToolRouterOptions,
): ToolRouterStats {
  const total = getRegisteredTools().length;
  const routed = routeTools(userMessage, "", options);
  const allTerms = routed.flatMap((r) => r.matchedTerms);
  const termCounts = new Map<string, number>();
  for (const t of allTerms) termCounts.set(t, (termCounts.get(t) ?? 0) + 1);
  const topTerms = [...termCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);

  return {
    totalTools: total,
    filteredTools: routed.length,
    filterRatio: total > 0 ? routed.length / total : 0,
    topMatchedTerms: topTerms,
  };
}
