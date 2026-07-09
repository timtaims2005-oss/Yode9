// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX ETERNAL MEMORY — الذاكرة الأبدية عبر الجلسات
//  تحفظ كل ما فعله الذكاء الاصطناعي وتتذكر تفضيلات المستخدم تلقائياً
// ═══════════════════════════════════════════════════════════════════════════════

const STORAGE_KEY = "omnix-eternal-memory-v1";
const MAX_ENTRIES = 500;
const MAX_SUGGESTIONS = 50;

export interface OmnixMemoryEntry {
  id: string;
  ts: number;
  actionId: string;
  actionLabel: string;
  params?: Record<string, unknown>;
  success: boolean;
  sessionId: string;
}

export interface OmnixUserPreference {
  key: string;
  value: unknown;
  updatedAt: number;
  useCount: number;
}

export interface OmnixCommandStat {
  actionId: string;
  label: string;
  count: number;
  lastUsed: number;
  successRate: number;
}

export interface OmnixMemoryData {
  version: number;
  sessionId: string;
  entries: OmnixMemoryEntry[];
  preferences: Record<string, OmnixUserPreference>;
  commandStats: Record<string, OmnixCommandStat>;
  learnedCommands: Array<{
    id: string;
    label: string;
    description: string;
    trigger: string;
    createdAt: number;
    usageCount: number;
  }>;
  lastUpdated: number;
}

function generateSessionId(): string {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadFromStorage(): OmnixMemoryData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as OmnixMemoryData;
      if (parsed.version === 1) {
        // Start new session
        parsed.sessionId = generateSessionId();
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return {
    version: 1,
    sessionId: generateSessionId(),
    entries: [],
    preferences: {},
    commandStats: {},
    learnedCommands: [],
    lastUpdated: Date.now(),
  };
}

class OmnixMemoryClass {
  private _data: OmnixMemoryData = loadFromStorage();

  // ── Persist ──────────────────────────────────────────────────────────────────

  private _save() {
    this._data.lastUpdated = Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
    } catch {
      // Storage full — trim and retry
      this._data.entries = this._data.entries.slice(0, 100);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data)); } catch { /* ignore */ }
    }
    window.dispatchEvent(new CustomEvent("omnix:memory-updated", { detail: this._data }));
  }

  // ── Record action ────────────────────────────────────────────────────────────

  recordAction(entry: Omit<OmnixMemoryEntry, "id" | "ts" | "sessionId">) {
    const full: OmnixMemoryEntry = {
      ...entry,
      id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(),
      sessionId: this._data.sessionId,
    };

    this._data.entries.unshift(full);
    if (this._data.entries.length > MAX_ENTRIES) {
      this._data.entries = this._data.entries.slice(0, MAX_ENTRIES);
    }

    // Update command stats
    const stat = this._data.commandStats[entry.actionId] ?? {
      actionId: entry.actionId,
      label: entry.actionLabel,
      count: 0,
      lastUsed: 0,
      successRate: 1,
    };
    const totalAttempts = stat.count + 1;
    const prevSuccesses = Math.round(stat.successRate * stat.count);
    stat.count = totalAttempts;
    stat.lastUsed = Date.now();
    stat.successRate = (prevSuccesses + (entry.success ? 1 : 0)) / totalAttempts;
    this._data.commandStats[entry.actionId] = stat;

    this._save();
  }

  // ── Preferences ───────────────────────────────────────────────────────────────

  setPreference(key: string, value: unknown) {
    const prev = this._data.preferences[key];
    this._data.preferences[key] = {
      key,
      value,
      updatedAt: Date.now(),
      useCount: (prev?.useCount ?? 0) + 1,
    };
    this._save();
  }

  getPreference<T = unknown>(key: string, defaultValue?: T): T | undefined {
    return (this._data.preferences[key]?.value as T) ?? defaultValue;
  }

  // ── Top commands ──────────────────────────────────────────────────────────────

  getTopCommands(limit = 10): OmnixCommandStat[] {
    return Object.values(this._data.commandStats)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  getRecentActions(limit = 10): OmnixMemoryEntry[] {
    return this._data.entries.slice(0, limit);
  }

  // ── Learned commands (SELF EVOLUTION) ────────────────────────────────────────

  addLearnedCommand(cmd: { label: string; description: string; trigger: string }) {
    const existing = this._data.learnedCommands.find(
      (c) => c.trigger.toLowerCase() === cmd.trigger.toLowerCase()
    );
    if (existing) {
      existing.usageCount++;
      this._save();
      return existing.id;
    }
    const newCmd = {
      id: `learned-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...cmd,
      createdAt: Date.now(),
      usageCount: 1,
    };
    this._data.learnedCommands.unshift(newCmd);
    if (this._data.learnedCommands.length > MAX_SUGGESTIONS) {
      this._data.learnedCommands = this._data.learnedCommands.slice(0, MAX_SUGGESTIONS);
    }
    this._save();
    return newCmd.id;
  }

  getLearnedCommands() {
    return this._data.learnedCommands;
  }

  removeLearnedCommand(id: string) {
    this._data.learnedCommands = this._data.learnedCommands.filter((c) => c.id !== id);
    this._save();
  }

  // ── Context string for interceptor ───────────────────────────────────────────

  toContextString(): string {
    const top = this.getTopCommands(5);
    const recent = this.getRecentActions(10);
    const prefs = Object.values(this._data.preferences).slice(0, 8);

    const lines: string[] = [
      `🧠 OMNIX MEMORY — ذاكرة الجلسات السابقة:`,
      `• إجمالي الأوامر المسجلة: ${this._data.entries.length}`,
    ];

    if (top.length > 0) {
      lines.push(`• أكثر الأوامر استخداماً: ${top.map((c) => `${c.label}(${c.count})`).join(", ")}`);
    }

    if (recent.length > 0) {
      lines.push(
        `• آخر 10 أوامر: ${recent
          .map((e) => `${e.actionLabel}${e.success ? "✓" : "✗"}`)
          .join(", ")}`
      );
    }

    if (prefs.length > 0) {
      lines.push(
        `• تفضيلات المستخدم: ${prefs
          .map((p) => `${p.key}=${JSON.stringify(p.value)}`)
          .join(", ")}`
      );
    }

    if (this._data.learnedCommands.length > 0) {
      lines.push(
        `• أوامر مُتعلَّمة جديدة: ${this._data.learnedCommands
          .slice(0, 5)
          .map((c) => c.label)
          .join(", ")}`
      );
    }

    return lines.join("\n");
  }

  // ── Clear ─────────────────────────────────────────────────────────────────────

  clearHistory() {
    this._data.entries = [];
    this._data.commandStats = {};
    this._save();
  }

  clearAll() {
    this._data = {
      version: 1,
      sessionId: generateSessionId(),
      entries: [],
      preferences: {},
      commandStats: {},
      learnedCommands: [],
      lastUpdated: Date.now(),
    };
    this._save();
  }

  getData(): OmnixMemoryData {
    return this._data;
  }
}

export const OmnixMemory = new OmnixMemoryClass();
