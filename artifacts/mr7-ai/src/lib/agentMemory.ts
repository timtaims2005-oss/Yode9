// ─────────────────────────────────────────────────────────────────────────────
//  MULTI-LAYER MEMORY SYSTEM (System 4)
//  STM: ذاكرة قصيرة المدى (session) — حالة الأدوات + مسار الـ UI
//  LTM: ذاكرة طويلة المدى (localStorage/IDB) — تفضيلات + سجل الأدوات
//  قاعدة: لا حذف، لا تعديل للكود القائم — إضافة فقط.
// ─────────────────────────────────────────────────────────────────────────────

// ════════════════════════════════════════════════════════════════════════════
// SHORT-TERM MEMORY (STM) — ذاكرة الجلسة الحالية
// ════════════════════════════════════════════════════════════════════════════

export type STMToolEntry = {
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
  output: unknown;
  ok: boolean;
  ts: number;
  conversationId?: string;
};

export type STMNavigationEntry = {
  page: string;
  component?: string;
  ts: number;
  meta?: Record<string, unknown>;
};

export type STMState = {
  toolHistory: STMToolEntry[];      // آخر N أداة نُفِّذت
  navigationHistory: STMNavigationEntry[]; // مسار الـ UI
  activeContext: Record<string, unknown>;  // سياق حي
  sessionStart: number;
  messageCount: number;
};

const STM_MAX_TOOLS = 50;
const STM_MAX_NAV = 30;

let _stm: STMState = {
  toolHistory: [],
  navigationHistory: [],
  activeContext: {},
  sessionStart: Date.now(),
  messageCount: 0,
};

// ── واجهة STM العامة ──────────────────────────────────────────────────────────
export const STM = {
  /** تسجيل تنفيذ أداة */
  recordTool(entry: STMToolEntry): void {
    _stm.toolHistory.push(entry);
    if (_stm.toolHistory.length > STM_MAX_TOOLS) _stm.toolHistory.shift();
  },

  /** تسجيل تنقل UI */
  recordNavigation(entry: STMNavigationEntry): void {
    _stm.navigationHistory.push(entry);
    if (_stm.navigationHistory.length > STM_MAX_NAV) _stm.navigationHistory.shift();
  },

  /** تحديث السياق الحي */
  setContext(key: string, value: unknown): void {
    _stm.activeContext[key] = value;
  },

  getContext(key: string): unknown {
    return _stm.activeContext[key];
  },

  clearContext(key?: string): void {
    if (key) delete _stm.activeContext[key];
    else _stm.activeContext = {};
  },

  /** آخر N أداة نُفِّذت */
  getRecentTools(n = 10): STMToolEntry[] {
    return _stm.toolHistory.slice(-n);
  },

  /** آخر تنفيذ لأداة محددة */
  getLastToolResult(toolId: string): STMToolEntry | undefined {
    return [..._stm.toolHistory].reverse().find((e) => e.toolId === toolId);
  },

  /** آخر N صفحة */
  getRecentNavigation(n = 5): STMNavigationEntry[] {
    return _stm.navigationHistory.slice(-n);
  },

  /** الأدوات الأكثر استخداماً في الجلسة */
  getFrequentTools(n = 5): Array<{ toolId: string; count: number }> {
    const counts = new Map<string, number>();
    for (const e of _stm.toolHistory) {
      counts.set(e.toolId, (counts.get(e.toolId) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([toolId, count]) => ({ toolId, count }));
  },

  incrementMessageCount(): void {
    _stm.messageCount++;
  },

  getState(): Readonly<STMState> {
    return _stm;
  },

  reset(): void {
    _stm = {
      toolHistory: [],
      navigationHistory: [],
      activeContext: {},
      sessionStart: Date.now(),
      messageCount: 0,
    };
  },

  /** بناء نص سياقي للنموذج */
  buildContextBlock(): string {
    const recent = STM.getRecentTools(5);
    const nav = STM.getRecentNavigation(3);
    const lines: string[] = [];

    if (recent.length > 0) {
      lines.push("[RECENT TOOL EXECUTIONS]");
      recent.forEach((e) => {
        const status = e.ok ? "✓" : "✗";
        const result = typeof e.output === "string" ? e.output.slice(0, 100) : JSON.stringify(e.output).slice(0, 100);
        lines.push(`  ${status} ${e.toolId}: ${result}`);
      });
    }

    if (nav.length > 0) {
      lines.push("[CURRENT UI CONTEXT]");
      nav.forEach((n) => lines.push(`  → ${n.page}${n.component ? ` / ${n.component}` : ""}`));
    }

    const ctxKeys = Object.keys(_stm.activeContext);
    if (ctxKeys.length > 0) {
      lines.push("[ACTIVE CONTEXT]");
      ctxKeys.forEach((k) => lines.push(`  ${k}: ${JSON.stringify(_stm.activeContext[k]).slice(0, 80)}`));
    }

    return lines.length > 0 ? lines.join("\n") : "";
  },
};

// ════════════════════════════════════════════════════════════════════════════
// LONG-TERM MEMORY (LTM) — ذاكرة دائمة بين الجلسات
// ════════════════════════════════════════════════════════════════════════════

const LTM_PREFS_KEY = "mr7-ltm-preferences";
const LTM_TOOL_HISTORY_KEY = "mr7-ltm-tool-history";
const LTM_SYSTEM_MSGS_KEY = "mr7-ltm-system-messages";
const LTM_USER_FACTS_KEY = "mr7-ltm-user-facts";
const LTM_MAX_TOOL_HISTORY = 500;
const LTM_MAX_FACTS = 200;

export type LTMPreference = {
  key: string;
  value: unknown;
  updatedAt: number;
  source: "explicit" | "inferred"; // صريح من المستخدم أو مستنتج من السلوك
};

export type LTMToolHistoryEntry = {
  toolId: string;
  toolName: string;
  input: Record<string, unknown>;
  ok: boolean;
  ts: number;
  conversationId?: string;
};

export type LTMSystemMessage = {
  id: string;
  content: string;
  tags: string[];
  createdAt: number;
  usageCount: number;
  lastUsedAt?: number;
};

export type LTMUserFact = {
  id: string;
  fact: string;          // "المستخدم يفضل اللغة العربية"
  confidence: number;    // 0–1
  source: string;        // "explicit" | toolId | "behavior"
  createdAt: number;
  updatedAt: number;
};

// ── محمّل/حافظ مساعد ─────────────────────────────────────────────────────────
function _load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}

function _save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota */ }
}

// ── واجهة LTM العامة ──────────────────────────────────────────────────────────
export const LTM = {
  // ── التفضيلات ──────────────────────────────────────────────────────────────
  setPreference(key: string, value: unknown, source: "explicit" | "inferred" = "explicit"): void {
    const prefs = _load<LTMPreference[]>(LTM_PREFS_KEY, []);
    const idx = prefs.findIndex((p) => p.key === key);
    const entry: LTMPreference = { key, value, updatedAt: Date.now(), source };
    if (idx >= 0) prefs[idx] = entry;
    else prefs.push(entry);
    _save(LTM_PREFS_KEY, prefs);
  },

  getPreference(key: string): unknown {
    const prefs = _load<LTMPreference[]>(LTM_PREFS_KEY, []);
    return prefs.find((p) => p.key === key)?.value;
  },

  getAllPreferences(): LTMPreference[] {
    return _load<LTMPreference[]>(LTM_PREFS_KEY, []);
  },

  // ── سجل الأدوات ────────────────────────────────────────────────────────────
  recordToolExecution(entry: LTMToolHistoryEntry): void {
    const history = _load<LTMToolHistoryEntry[]>(LTM_TOOL_HISTORY_KEY, []);
    history.push(entry);
    if (history.length > LTM_MAX_TOOL_HISTORY) history.splice(0, history.length - LTM_MAX_TOOL_HISTORY);
    _save(LTM_TOOL_HISTORY_KEY, history);
  },

  getToolHistory(toolId?: string, limit = 20): LTMToolHistoryEntry[] {
    const history = _load<LTMToolHistoryEntry[]>(LTM_TOOL_HISTORY_KEY, []);
    const filtered = toolId ? history.filter((h) => h.toolId === toolId) : history;
    return filtered.slice(-limit);
  },

  getMostUsedTools(n = 10): Array<{ toolId: string; count: number; successRate: number }> {
    const history = _load<LTMToolHistoryEntry[]>(LTM_TOOL_HISTORY_KEY, []);
    const stats = new Map<string, { count: number; ok: number }>();
    for (const e of history) {
      const s = stats.get(e.toolId) ?? { count: 0, ok: 0 };
      s.count++;
      if (e.ok) s.ok++;
      stats.set(e.toolId, s);
    }
    return [...stats.entries()]
      .map(([toolId, s]) => ({ toolId, count: s.count, successRate: s.count > 0 ? s.ok / s.count : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, n);
  },

  // ── رسائل النظام المحفوظة ──────────────────────────────────────────────────
  saveSystemMessage(content: string, tags: string[] = []): LTMSystemMessage {
    const msgs = _load<LTMSystemMessage[]>(LTM_SYSTEM_MSGS_KEY, []);
    const msg: LTMSystemMessage = {
      id: `sysmsg-${Date.now()}`,
      content,
      tags,
      createdAt: Date.now(),
      usageCount: 0,
    };
    msgs.push(msg);
    _save(LTM_SYSTEM_MSGS_KEY, msgs);
    return msg;
  },

  getSystemMessages(tag?: string): LTMSystemMessage[] {
    const msgs = _load<LTMSystemMessage[]>(LTM_SYSTEM_MSGS_KEY, []);
    return tag ? msgs.filter((m) => m.tags.includes(tag)) : msgs;
  },

  useSystemMessage(id: string): void {
    const msgs = _load<LTMSystemMessage[]>(LTM_SYSTEM_MSGS_KEY, []);
    const idx = msgs.findIndex((m) => m.id === id);
    if (idx >= 0) {
      msgs[idx].usageCount++;
      msgs[idx].lastUsedAt = Date.now();
      _save(LTM_SYSTEM_MSGS_KEY, msgs);
    }
  },

  deleteSystemMessage(id: string): void {
    const msgs = _load<LTMSystemMessage[]>(LTM_SYSTEM_MSGS_KEY, []).filter((m) => m.id !== id);
    _save(LTM_SYSTEM_MSGS_KEY, msgs);
  },

  // ── حقائق المستخدم ─────────────────────────────────────────────────────────
  addUserFact(fact: string, confidence: number = 0.8, source: string = "explicit"): LTMUserFact {
    const facts = _load<LTMUserFact[]>(LTM_USER_FACTS_KEY, []);
    // تجنب التكرار
    const existing = facts.find((f) => f.fact.toLowerCase() === fact.toLowerCase());
    if (existing) {
      existing.confidence = Math.min(1, Math.max(existing.confidence, confidence));
      existing.updatedAt = Date.now();
      _save(LTM_USER_FACTS_KEY, facts);
      return existing;
    }
    const newFact: LTMUserFact = {
      id: `fact-${Date.now()}`,
      fact,
      confidence,
      source,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    facts.push(newFact);
    if (facts.length > LTM_MAX_FACTS) facts.shift();
    _save(LTM_USER_FACTS_KEY, facts);
    return newFact;
  },

  getUserFacts(minConfidence = 0.5): LTMUserFact[] {
    return _load<LTMUserFact[]>(LTM_USER_FACTS_KEY, []).filter((f) => f.confidence >= minConfidence);
  },

  deleteUserFact(id: string): void {
    const facts = _load<LTMUserFact[]>(LTM_USER_FACTS_KEY, []).filter((f) => f.id !== id);
    _save(LTM_USER_FACTS_KEY, facts);
  },

  // ── بناء سياق LTM للنموذج ──────────────────────────────────────────────────
  buildContextBlock(opts: { includeFacts?: boolean; includePrefs?: boolean; maxFacts?: number } = {}): string {
    const { includeFacts = true, includePrefs = true, maxFacts = 10 } = opts;
    const lines: string[] = [];

    if (includePrefs) {
      const prefs = LTM.getAllPreferences().filter((p) => p.source === "explicit").slice(0, 5);
      if (prefs.length > 0) {
        lines.push("[USER PREFERENCES]");
        prefs.forEach((p) => lines.push(`  • ${p.key}: ${JSON.stringify(p.value)}`));
      }
    }

    if (includeFacts) {
      const facts = LTM.getUserFacts(0.7).slice(0, maxFacts);
      if (facts.length > 0) {
        lines.push("[USER CONTEXT]");
        facts.forEach((f) => lines.push(`  • ${f.fact} (confidence: ${Math.round(f.confidence * 100)}%)`));
      }
    }

    const topTools = LTM.getMostUsedTools(3);
    if (topTools.length > 0) {
      lines.push("[FREQUENTLY USED TOOLS]");
      topTools.forEach((t) => lines.push(`  • ${t.toolId} (${t.count}× used, ${Math.round(t.successRate * 100)}% success)`));
    }

    return lines.length > 0 ? lines.join("\n") : "";
  },
};

// ════════════════════════════════════════════════════════════════════════════
// UNIFIED MEMORY API — واجهة موحدة للنموذج
// ════════════════════════════════════════════════════════════════════════════

export type MemorySearchResult = {
  source: "stm" | "ltm";
  type: string;
  content: string;
  relevance: number;
  ts: number;
};

/** بحث دلالي بسيط في STM + LTM */
export function searchMemory(query: string, limit = 10): MemorySearchResult[] {
  const q = query.toLowerCase();
  const results: MemorySearchResult[] = [];

  // البحث في STM
  for (const entry of STM.getRecentTools(STM_MAX_TOOLS)) {
    const text = `${entry.toolId} ${JSON.stringify(entry.output)}`.toLowerCase();
    if (text.includes(q)) {
      results.push({
        source: "stm",
        type: "tool_execution",
        content: `Tool: ${entry.toolId} → ${typeof entry.output === "string" ? entry.output.slice(0, 100) : JSON.stringify(entry.output).slice(0, 100)}`,
        relevance: 0.8,
        ts: entry.ts,
      });
    }
  }

  // البحث في LTM — الحقائق
  for (const fact of LTM.getUserFacts(0.4)) {
    if (fact.fact.toLowerCase().includes(q)) {
      results.push({
        source: "ltm",
        type: "user_fact",
        content: fact.fact,
        relevance: fact.confidence,
        ts: fact.updatedAt,
      });
    }
  }

  // البحث في LTM — رسائل النظام
  for (const msg of LTM.getSystemMessages()) {
    if (msg.content.toLowerCase().includes(q)) {
      results.push({
        source: "ltm",
        type: "system_message",
        content: msg.content.slice(0, 200),
        relevance: 0.7,
        ts: msg.createdAt,
      });
    }
  }

  return results
    .sort((a, b) => b.relevance - a.relevance || b.ts - a.ts)
    .slice(0, limit);
}

/** بناء سياق الذاكرة الكامل للنموذج */
export function buildFullMemoryContext(opts: {
  includeSTM?: boolean;
  includeLTM?: boolean;
  stmRecentTools?: number;
} = {}): string {
  const { includeSTM = true, includeLTM = true, stmRecentTools = 5 } = opts;
  const parts: string[] = [];

  if (includeSTM) {
    const stmBlock = STM.buildContextBlock();
    if (stmBlock) parts.push(`[SHORT-TERM MEMORY]\n${stmBlock}`);
  }

  if (includeLTM) {
    const ltmBlock = LTM.buildContextBlock();
    if (ltmBlock) parts.push(`[LONG-TERM MEMORY]\n${ltmBlock}`);
  }

  return parts.join("\n\n");
}

// ── Auto-record tool results from global activity events ───────────────────
// يُسجَّل تلقائياً عند الاستيراد إذا كان toolsRegistry متاحاً
if (typeof window !== "undefined") {
  // Hook into tool activity events lazily to avoid circular import
  const hookToolActivity = async () => {
    try {
      const { onToolActivity } = await import("./toolsRegistry");
      onToolActivity((e) => {
        if (e.status === "done" || e.status === "error") {
          const entry: STMToolEntry = {
            toolId: e.toolId,
            toolName: e.toolName,
            input: {},
            output: e.result,
            ok: e.status === "done",
            ts: e.ts,
          };
          STM.recordTool(entry);
          LTM.recordToolExecution({ ...entry });
        }
      });
    } catch { /* ignore if toolsRegistry not ready */ }
  };
  hookToolActivity();
}
