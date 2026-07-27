// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX SELF EVOLUTION — النظام السابع: التطور الذاتي
//  يرصد الأنماط التلقائياً — يقترح أوامر جديدة — يتعلم من المستخدم
//  يسجل الأوامر المتعلَّمة في OmnixMemory ويضيفها للسجل المطلق
// ═══════════════════════════════════════════════════════════════════════════════

import { OmnixMemory, type OmnixCommandStat } from "./OmnixMemory";
import { OMNIX_ABSOLUTE_REGISTRY, type AbsoluteCommand } from "./OmnixAbsoluteRegistry";
import { registerLearnedCommand, type OmnixCommand } from "./OmnixRegistry";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EvolutionSuggestion {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  type: "alias" | "shortcut" | "composite" | "learned";
  basedOnCommandId: string;
  basedOnPattern: string;
  confidence: number;          // 0–1
  proposedAliases?: string[];
  proposedTrigger?: string;
  createdAt: number;
  status: "pending" | "approved" | "rejected";
}

export interface EvolutionStats {
  totalSuggestionsGenerated: number;
  totalApproved: number;
  totalRejected: number;
  learnedCommandCount: number;
  lastAnalysisAt: number;
}

type SuggestionCallback = (suggestion: EvolutionSuggestion) => void;
type StatsCallback = (stats: EvolutionStats) => void;

// ── Helpers ───────────────────────────────────────────────────────────────────

function genId(): string {
  return `evo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function findAbsoluteCmd(id: string): AbsoluteCommand | undefined {
  return OMNIX_ABSOLUTE_REGISTRY.find((c) => c.id === id);
}

// Confidence calculation: count / threshold, capped at 0.97
function calcConfidence(count: number, threshold = 15): number {
  return Math.min(count / threshold, 0.97);
}

// ── OmnixSelfEvolution Singleton ──────────────────────────────────────────────

class OmnixSelfEvolutionClass {
  private static _instance: OmnixSelfEvolutionClass;

  private _suggestions: EvolutionSuggestion[] = [];
  private _suggestionCallbacks = new Set<SuggestionCallback>();
  private _statsCallbacks = new Set<StatsCallback>();

  private _stats: EvolutionStats = {
    totalSuggestionsGenerated: 0,
    totalApproved: 0,
    totalRejected: 0,
    learnedCommandCount: 0,
    lastAnalysisAt: 0,
  };

  // Analysis runs automatically after every N commands
  private _analysisInterval: ReturnType<typeof setInterval> | null = null;
  private readonly ANALYSIS_INTERVAL_MS = 60_000; // every 60 s
  private readonly MIN_USE_COUNT_FOR_ALIAS = 8;
  private readonly MIN_USE_COUNT_FOR_LEARNED = 5;

  private constructor() {
    this._loadStatsFromMemory();
    this._startAutoAnalysis();
    this._listenToMemoryUpdates();
  }

  static getInstance(): OmnixSelfEvolutionClass {
    if (!OmnixSelfEvolutionClass._instance) {
      OmnixSelfEvolutionClass._instance = new OmnixSelfEvolutionClass();
    }
    return OmnixSelfEvolutionClass._instance;
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  private _loadStatsFromMemory() {
    const saved = OmnixMemory.getPreference<EvolutionStats>("omnix_evolution_stats");
    if (saved) {
      this._stats = { ...this._stats, ...saved };
    }
    this._stats.learnedCommandCount = OmnixMemory.getLearnedCommands().length;
  }

  private _saveStats() {
    OmnixMemory.setPreference("omnix_evolution_stats", this._stats);
  }

  private _startAutoAnalysis() {
    if (this._analysisInterval) return;
    this._analysisInterval = setInterval(() => {
      this.analyzePatterns();
    }, this.ANALYSIS_INTERVAL_MS);
  }

  private _listenToMemoryUpdates() {
    if (typeof window === "undefined") return;
    window.addEventListener("omnix:memory-updated", () => {
      // Only re-analyze every 10 memory updates
      const mod = (OmnixMemory.getData().entries.length % 10 === 0);
      if (mod) this.analyzePatterns();
    });
  }

  // ── Core Analysis ──────────────────────────────────────────────────────────

  analyzePatterns(): EvolutionSuggestion[] {
    this._stats.lastAnalysisAt = Date.now();
    const newSuggestions: EvolutionSuggestion[] = [];

    const topCommands = OmnixMemory.getTopCommands(30);
    const learnedCommands = OmnixMemory.getLearnedCommands();
    this._stats.learnedCommandCount = learnedCommands.length;

    for (const stat of topCommands) {
      const suggestions = this._analyzeCommand(stat);
      newSuggestions.push(...suggestions);
    }

    // De-duplicate: skip if identical basedOnCommandId + type already pending
    for (const s of newSuggestions) {
      const exists = this._suggestions.some(
        (ex) => ex.basedOnCommandId === s.basedOnCommandId && ex.type === s.type && ex.status === "pending"
      );
      if (!exists) {
        this._suggestions.push(s);
        this._stats.totalSuggestionsGenerated++;
        this._suggestionCallbacks.forEach((cb) => cb(s));
        window.dispatchEvent(new CustomEvent("omnix:evolution-suggestion", { detail: s }));
      }
    }

    this._saveStats();
    this._statsCallbacks.forEach((cb) => cb(this._stats));
    return newSuggestions;
  }

  private _analyzeCommand(stat: OmnixCommandStat): EvolutionSuggestion[] {
    const results: EvolutionSuggestion[] = [];
    const absoluteCmd = findAbsoluteCmd(stat.actionId);

    // ── Suggestion 1: Add aliases for frequently used commands ───────────────
    if (stat.count >= this.MIN_USE_COUNT_FOR_ALIAS && absoluteCmd) {
      const currentAliasCount = absoluteCmd.aliases?.length ?? 0;
      // Only suggest if they don't already have 5+ aliases
      if (currentAliasCount < 5) {
        const shortLabel = absoluteCmd.nameAr.split(" ").slice(0, 2).join(" ");
        const abbreviation = absoluteCmd.id.replace(/_/g, " ").slice(0, 12);
        results.push({
          id: genId(),
          name: `Add aliases for "${absoluteCmd.name}"`,
          nameAr: `إضافة اختصارات لـ "${absoluteCmd.nameAr}"`,
          description: `Command used ${stat.count}× — add shorthand aliases for faster access.`,
          type: "alias",
          basedOnCommandId: stat.actionId,
          basedOnPattern: stat.actionId,
          confidence: calcConfidence(stat.count, this.MIN_USE_COUNT_FOR_ALIAS),
          proposedAliases: [shortLabel, abbreviation],
          createdAt: Date.now(),
          status: "pending",
        });
      }
    }

    // ── Suggestion 2: Learn voice/text trigger from pattern ──────────────────
    if (stat.count >= this.MIN_USE_COUNT_FOR_LEARNED) {
      // Check if not already in learned commands
      const alreadyLearned = OmnixMemory.getLearnedCommands().find(
        (c) => c.trigger === stat.actionId
      );
      if (!alreadyLearned) {
        const label = absoluteCmd?.nameAr ?? stat.label;
        const trigger = absoluteCmd?.id ?? stat.actionId;
        results.push({
          id: genId(),
          name: `Learn shortcut for "${stat.label}"`,
          nameAr: `تعلّم اختصار سريع لـ "${label}"`,
          description: `High usage detected (${stat.count}×). Create instant trigger.`,
          type: "shortcut",
          basedOnCommandId: stat.actionId,
          basedOnPattern: stat.actionId,
          confidence: calcConfidence(stat.count, this.MIN_USE_COUNT_FOR_LEARNED * 2),
          proposedTrigger: trigger,
          createdAt: Date.now(),
          status: "pending",
        });
      }
    }

    // ── Suggestion 3: Low success rate — suggest alternative ─────────────────
    if (stat.count >= 5 && stat.successRate < 0.6 && absoluteCmd) {
      results.push({
        id: genId(),
        name: `Review command "${absoluteCmd.name}"`,
        nameAr: `مراجعة أمر "${absoluteCmd.nameAr}"`,
        description: `Success rate only ${Math.round(stat.successRate * 100)}% — may need a composite command.`,
        type: "composite",
        basedOnCommandId: stat.actionId,
        basedOnPattern: `low_success:${stat.actionId}`,
        confidence: 0.75,
        createdAt: Date.now(),
        status: "pending",
      });
    }

    return results;
  }

  // ── Approve/Reject ────────────────────────────────────────────────────────

  approve(suggestionId: string): boolean {
    const s = this._suggestions.find((x) => x.id === suggestionId);
    if (!s) return false;

    s.status = "approved";
    this._stats.totalApproved++;

    const absoluteCmd = findAbsoluteCmd(s.basedOnCommandId);

    if (s.type === "alias" && s.proposedAliases && absoluteCmd) {
      // Add aliases permanently to the command
      const newAliases = [...(absoluteCmd.aliases || []), ...s.proposedAliases];
      absoluteCmd.aliases = [...new Set(newAliases)];
    }

    if (s.type === "shortcut" && s.proposedTrigger) {
      const trigger = s.proposedTrigger;
      const label = absoluteCmd?.nameAr ?? s.nameAr;
      const description = `تشغيل ${label} بسرعة`;

      // Save to OmnixMemory persistent learned commands
      const learnedId = OmnixMemory.addLearnedCommand({
        label,
        description,
        trigger,
      });

      // Register into the live OmnixRegistry so it can be executed immediately
      const learnedCmd: Omit<OmnixCommand, "execute" | "fallbacks"> & { execute: OmnixCommand["execute"] } = {
        id: trigger,
        name: label,
        nameAr: label,
        description,
        descriptionAr: description,
        category: "evolution",
        aliases: [label.toLowerCase(), trigger.replace(/_/g, " ")],
        learned: true,
        execute: (params, d) => {
          // Delegate to the base command if it exists
          if (absoluteCmd) {
            return absoluteCmd.execute(params, d) as any;
          }
          d.toast(`⚡ ${label}`);
          return { actionId: trigger, success: true, message: label, messageAr: label };
        },
      };

      registerLearnedCommand(learnedCmd);
      this._stats.learnedCommandCount++;
      console.info(`[OmnixEvolution] Learned command registered: ${learnedId}`);
    }

    this._saveStats();
    this._statsCallbacks.forEach((cb) => cb(this._stats));

    window.dispatchEvent(
      new CustomEvent("omnix:evolution-approved", { detail: s })
    );
    return true;
  }

  reject(suggestionId: string): boolean {
    const s = this._suggestions.find((x) => x.id === suggestionId);
    if (!s) return false;

    s.status = "rejected";
    this._stats.totalRejected++;

    this._saveStats();
    this._statsCallbacks.forEach((cb) => cb(this._stats));

    window.dispatchEvent(
      new CustomEvent("omnix:evolution-rejected", { detail: s })
    );
    return true;
  }

  // ── Register custom command manually (user-defined) ───────────────────────

  registerCustomCommand(params: {
    label: string;
    labelAr: string;
    description: string;
    trigger: string;
    executeFn?: () => void;
  }): string {
    const cmd: Omit<OmnixCommand, "execute"> & { execute: OmnixCommand["execute"] } = {
      id: params.trigger.toLowerCase().replace(/\s+/g, "_"),
      name: params.label,
      nameAr: params.labelAr,
      description: params.description,
      descriptionAr: params.description,
      category: "evolution",
      aliases: [params.trigger.toLowerCase(), params.labelAr],
      learned: true,
      execute: (_, d) => {
        if (params.executeFn) params.executeFn();
        d.toast(`⚡ ${params.labelAr}`);
        return {
          actionId: params.trigger,
          success: true,
          message: params.label,
          messageAr: params.labelAr,
        };
      },
    };

    registerLearnedCommand(cmd);
    const memId = OmnixMemory.addLearnedCommand({
      label: params.labelAr,
      description: params.description,
      trigger: params.trigger,
    });

    this._stats.learnedCommandCount++;
    this._saveStats();
    return memId;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  getSuggestions(status?: EvolutionSuggestion["status"]): EvolutionSuggestion[] {
    if (status) return this._suggestions.filter((s) => s.status === status);
    return [...this._suggestions];
  }

  getPendingSuggestions(): EvolutionSuggestion[] {
    return this._suggestions.filter((s) => s.status === "pending");
  }

  getStats(): EvolutionStats {
    return { ...this._stats };
  }

  onNewSuggestion(cb: SuggestionCallback): () => void {
    this._suggestionCallbacks.add(cb);
    return () => this._suggestionCallbacks.delete(cb);
  }

  onStatsChange(cb: StatsCallback): () => void {
    this._statsCallbacks.add(cb);
    return () => this._statsCallbacks.delete(cb);
  }

  clearSuggestions() {
    this._suggestions = [];
  }

  getLearnedCommands() {
    return OmnixMemory.getLearnedCommands();
  }

  removeLearnedCommand(id: string) {
    OmnixMemory.removeLearnedCommand(id);
    this._stats.learnedCommandCount = OmnixMemory.getLearnedCommands().length;
    this._saveStats();
  }

  toContextString(): string {
    const pending = this.getPendingSuggestions();
    const learned = this.getLearnedCommands();
    const lines = [
      `🧬 OMNIX SELF EVOLUTION — التطور الذاتي:`,
      `• اقتراحات معلّقة: ${pending.length}`,
      `• أوامر مُتعلَّمة: ${learned.length}`,
      `• إجمالي المُقترحات: ${this._stats.totalSuggestionsGenerated}`,
      `• مُوافق عليها: ${this._stats.totalApproved} | مرفوضة: ${this._stats.totalRejected}`,
    ];
    if (learned.length > 0) {
      lines.push(`• أمثلة على الأوامر المتعلَّمة: ${learned.slice(0, 5).map((c) => c.label).join("، ")}`);
    }
    return lines.join("\n");
  }

  destroy() {
    if (this._analysisInterval) clearInterval(this._analysisInterval);
    this._suggestionCallbacks.clear();
    this._statsCallbacks.clear();
  }
}

export const OmnixSelfEvolution = OmnixSelfEvolutionClass.getInstance();
