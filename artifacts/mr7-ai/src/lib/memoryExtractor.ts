// ─────────────────────────────────────────────────────────────────────────────
//  MEMORY EXTRACTOR — Auto-Extract Facts from AI Responses → LTM (System 4+)
//  يستخرج تلقائياً الحقائق والتفضيلات من ردود الذكاء الاصطناعي
//  ويحفظها في Long-Term Memory لاسترجاعها في المحادثات المستقبلية.
//  قاعدة: لا حذف، لا تعديل للكود القائم — إضافة خالصة.
// ─────────────────────────────────────────────────────────────────────────────

import { LTM, STM, type LTMUserFact } from "./agentMemory";

// ── أنماط استخراج الحقائق ─────────────────────────────────────────────────────

const FACT_PATTERNS: Array<{
  pattern: RegExp;
  confidence: number;
  source: string;
  transform?: (match: RegExpMatchArray) => string;
}> = [
  // "المستخدم يفضل / يريد / يحتاج"
  {
    pattern: /(?:the user|you|المستخدم)\s+(?:prefer|like|want|need|يفضل|يريد|يحتاج)\s+(.{10,120}?)(?:\.|,|$)/gi,
    confidence: 0.75,
    source: "ai-inference",
  },
  // "Based on your [experience/background/...], ..."
  {
    pattern: /based on your\s+(\w+(?:\s+\w+){0,3})/gi,
    confidence: 0.6,
    source: "ai-inference",
    transform: (m) => `User has ${m[1]}`,
  },
  // "I remember you mentioned ..."
  {
    pattern: /(?:i remember|you mentioned|you told me|you said)\s+(.{10,150}?)(?:\.|,|$)/gi,
    confidence: 0.85,
    source: "explicit-recall",
  },
  // "Your [skill/expertise/experience] in ..."
  {
    pattern: /your\s+(?:skill|expertise|experience|background|knowledge)\s+(?:in|with|on)\s+(.{5,80}?)(?:\.|,|$)/gi,
    confidence: 0.7,
    source: "ai-inference",
    transform: (m) => `User has experience with ${m[1]}`,
  },
  // "You are a/an [role] who ..."
  {
    pattern: /you\s+are\s+(?:a|an)\s+(\w+(?:\s+\w+){0,5})\s+who/gi,
    confidence: 0.65,
    source: "ai-inference",
    transform: (m) => `User is a ${m[1]}`,
  },
];

// ── أنماط التفضيلات (للـ LTM Preferences) ────────────────────────────────────

const PREF_PATTERNS: Array<{
  key: string;
  pattern: RegExp;
  extract: (match: RegExpMatchArray) => unknown;
}> = [
  {
    key: "preferred_language",
    pattern: /prefer(?:ring)?\s+(?:to use\s+)?(?:arabic|العربية)/i,
    extract: () => "arabic",
  },
  {
    key: "preferred_language",
    pattern: /prefer(?:ring)?\s+(?:to use\s+)?(?:english|الإنجليزية)/i,
    extract: () => "english",
  },
  {
    key: "preferred_code_style",
    pattern: /prefer(?:ring)?\s+(?:typescript|javascript|python|ts|js)/i,
    extract: (m) => m[0].toLowerCase().replace(/prefer(?:ring)?\s+(?:to use\s+)?/i, "").trim(),
  },
  {
    key: "expertise_level",
    pattern: /(?:beginner|intermediate|expert|advanced|senior|junior)\s+(?:developer|programmer|engineer)/i,
    extract: (m) => m[0].toLowerCase(),
  },
];

// ── استخراج الحقائق من نص رد الذكاء الاصطناعي ────────────────────────────────

export type ExtractedFact = {
  fact: string;
  confidence: number;
  source: string;
  type: "fact" | "preference";
  prefKey?: string;
  prefValue?: unknown;
};

export function extractFactsFromText(
  aiResponse: string,
  userMessage?: string,
): ExtractedFact[] {
  const extracted: ExtractedFact[] = [];
  const seen = new Set<string>();

  // ── استخراج الحقائق ─────────────────────────────────────────────────────
  for (const { pattern, confidence, source, transform } of FACT_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = re.exec(aiResponse)) !== null) {
      const rawFact = transform ? transform(match) : match[1]?.trim();
      if (!rawFact || rawFact.length < 8 || rawFact.length > 200) continue;

      const normalizedFact = rawFact.replace(/\s+/g, " ").trim();
      const key = normalizedFact.toLowerCase().slice(0, 50);
      if (seen.has(key)) continue;
      seen.add(key);

      extracted.push({ fact: normalizedFact, confidence, source, type: "fact" });
    }
  }

  // ── استخراج التفضيلات ────────────────────────────────────────────────────
  const combinedText = (userMessage ?? "") + " " + aiResponse;
  for (const { key, pattern, extract } of PREF_PATTERNS) {
    const match = combinedText.match(pattern);
    if (match) {
      extracted.push({
        fact: `User prefers ${key}: ${String(extract(match))}`,
        confidence: 0.8,
        source: "preference-detection",
        type: "preference",
        prefKey: key,
        prefValue: extract(match),
      });
    }
  }

  return extracted.slice(0, 10); // أقصى 10 حقائق لكل رد
}

// ── حفظ الحقائق في LTM ────────────────────────────────────────────────────────

export function syncExtractedFactsToLTM(facts: ExtractedFact[]): {
  saved: number;
  preferences: number;
} {
  let saved = 0;
  let preferences = 0;

  for (const extracted of facts) {
    try {
      if (extracted.type === "preference" && extracted.prefKey) {
        LTM.setPreference(extracted.prefKey, extracted.prefValue, "inferred");
        preferences++;
      } else {
        LTM.addUserFact(extracted.fact, extracted.confidence, extracted.source);
        saved++;
      }
    } catch { /* ignore quota errors */ }
  }

  return { saved, preferences };
}

// ── الدالة الرئيسية: استخراج + حفظ في خطوة واحدة ────────────────────────────

export function processResponseForMemory(
  aiResponse: string,
  userMessage?: string,
  opts: { minConfidence?: number; maxFacts?: number } = {},
): { extracted: ExtractedFact[]; saved: number; preferences: number } {
  const { minConfidence = 0.6, maxFacts = 5 } = opts;

  // استخراج الحقائق
  const all = extractFactsFromText(aiResponse, userMessage);
  const filtered = all
    .filter((f) => f.confidence >= minConfidence)
    .slice(0, maxFacts);

  // حفظ في LTM
  const { saved, preferences } = syncExtractedFactsToLTM(filtered);

  // تسجيل في STM أن المعالجة تمّت
  if (saved + preferences > 0) {
    STM.setContext("lastMemoryExtraction", {
      ts: Date.now(),
      savedFacts: saved,
      savedPrefs: preferences,
    });
  }

  return { extracted: filtered, saved, preferences };
}

// ── استخراج المعلومات الحساسة للـ OSINT/Security ─────────────────────────────

const OSINT_PATTERNS: Array<{
  type: string;
  pattern: RegExp;
}> = [
  { type: "ip_address",   pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g },
  { type: "domain",       pattern: /\b(?:[a-zA-Z0-9-]+\.)+(?:com|net|org|io|gov|edu|mil|co|uk|de|fr|ru|cn)\b/g },
  { type: "hash_md5",     pattern: /\b[a-fA-F0-9]{32}\b/g },
  { type: "hash_sha256",  pattern: /\b[a-fA-F0-9]{64}\b/g },
  { type: "cve",          pattern: /CVE-\d{4}-\d{4,7}/gi },
  { type: "email",        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g },
];

export type OsintEntity = {
  type: string;
  value: string;
  context: string;
};

export function extractOsintEntities(text: string): OsintEntity[] {
  const entities: OsintEntity[] = [];
  const seen = new Set<string>();

  for (const { type, pattern } of OSINT_PATTERNS) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const value = m[0];
      const key = `${type}:${value}`;
      if (seen.has(key)) continue;
      seen.add(key);

      // استخراج السياق (30 حرف قبل وبعد)
      const start = Math.max(0, m.index - 30);
      const end = Math.min(text.length, m.index + value.length + 30);
      const context = text.slice(start, end).replace(/\s+/g, " ").trim();

      entities.push({ type, value, context });
    }
  }

  return entities.slice(0, 50); // أقصى 50 كيان OSINT
}

// ── Hook: يُشغَّل تلقائياً لكل رد نموذج (استدعِه من ChatView أو Pipeline) ────

let _autoExtractEnabled = true;
let _extractQueue: Array<{ response: string; userMessage?: string }> = [];
let _processTimer: ReturnType<typeof setTimeout> | null = null;

export function setAutoExtractEnabled(enabled: boolean): void {
  _autoExtractEnabled = enabled;
}

export function queueResponseForExtraction(
  aiResponse: string,
  userMessage?: string,
): void {
  if (!_autoExtractEnabled) return;
  _extractQueue.push({ response: aiResponse, userMessage });

  // معالجة دفعية مع delay لتجنب الحمل الزائد
  if (_processTimer !== null) return;
  _processTimer = setTimeout(() => {
    _processTimer = null;
    const toProcess = [..._extractQueue];
    _extractQueue = [];
    for (const item of toProcess) {
      processResponseForMemory(item.response, item.userMessage, {
        minConfidence: 0.65,
        maxFacts: 3,
      });
    }
  }, 1500);
}

// ── جلب ملخص الذاكرة للـ UI ────────────────────────────────────────────────────

export function getMemorySummary(): {
  totalFacts: number;
  highConfidenceFacts: LTMUserFact[];
  preferences: Record<string, unknown>;
  recentToolIds: string[];
  sessionMessages: number;
} {
  const allFacts = LTM.getUserFacts(0);
  const highFacts = LTM.getUserFacts(0.75).slice(0, 5);
  const allPrefs = LTM.getAllPreferences();
  const recentTools = STM.getRecentTools(5).map((e) => e.toolId);
  const stm = STM.getState();

  return {
    totalFacts: allFacts.length,
    highConfidenceFacts: highFacts,
    preferences: Object.fromEntries(allPrefs.map((p) => [p.key, p.value])),
    recentToolIds: recentTools,
    sessionMessages: stm.messageCount,
  };
}

// ── تصدير نوع LTMUserFact للمكوّنات ────────────────────────────────────────────
export type { LTMUserFact };
