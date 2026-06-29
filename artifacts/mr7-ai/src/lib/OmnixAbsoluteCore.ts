// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX ABSOLUTE CORE — النواة المطلقة الموحدة
//  يجمع الأنظمة السبعة الإلهية في كيان واحد متكامل
//  يربط: Sovereign + Brain + Memory + Interceptor + Executor + Voice + Evolution
// ═══════════════════════════════════════════════════════════════════════════════

// ── System imports (Seven Divine Systems) ────────────────────────────────────
import { OmnixSovereign } from "./OmnixSovereign";
import { OmnixBrain } from "./OmnixBrain";
import { OmnixMemory } from "./OmnixMemory";
import { buildNexusSystemPrompt, type InterceptorContext } from "./NexusInterceptor";
import {
  parseOmnixActions,
  stripOmnixBlocks,
  executeOmnixResponse,
  registerOmnixDispatchers,
  type ParsedOmnixAction,
} from "./OmnixExecutor";
import { OmnixVoiceGesture, type VoiceCommand, type GestureEvent } from "./OmnixVoiceGesture";
import { OmnixSelfEvolution, type EvolutionSuggestion, type EvolutionStats } from "./OmnixSelfEvolution";
import { OMNIX_ABSOLUTE_REGISTRY } from "./OmnixAbsoluteRegistry";
import { OMNIX_REGISTRY_MAP, registerLearnedCommand } from "./OmnixRegistry";
import { NexusCore } from "./NexusCore";
import type { NexusDispatchers } from "./ToolRegistry";

// ── Core config ────────────────────────────────────────────────────────────────

export interface OmnixAbsoluteCoreConfig {
  provider?: "openai" | "anthropic" | "google" | "groq" | "deepseek" | "xai" | "custom";
  model?: string;
  enableVoice?: boolean;
  enableGesture?: boolean;
  enableEvolution?: boolean;
  enableQuantumInterception?: boolean;
  language?: "ar" | "en" | "mixed";
  godMode?: boolean;
}

export interface OmnixAbsoluteStatus {
  initialized: boolean;
  voiceActive: boolean;
  isProcessing: boolean;
  executingCommands: number;
  totalCommandsToday: number;
  totalLearnedCommands: number;
  pendingSuggestions: number;
  systemHealth: "optimal" | "degraded" | "critical";
  activeNodes: number;
  lastCommandAt: number;
}

export interface OmnixExecutionResult {
  cleanText: string;
  commands: ParsedOmnixAction[];
  executionSuccess: boolean;
  timestamp: number;
}

// ── Main Core Class ────────────────────────────────────────────────────────────

class OmnixAbsoluteCoreClass {
  private static _instance: OmnixAbsoluteCoreClass;

  // The seven divine nodes
  readonly sovereign = OmnixSovereign;
  readonly brain = OmnixBrain;
  readonly memory = OmnixMemory;
  readonly voice = OmnixVoiceGesture;
  readonly evolution = OmnixSelfEvolution;

  private _config: OmnixAbsoluteCoreConfig = {
    provider: "openai",
    model: "gpt-4o",
    enableVoice: true,
    enableGesture: true,
    enableEvolution: true,
    enableQuantumInterception: true,
    language: "ar",
    godMode: true,
  };

  private _initialized = false;
  private _dispatchers: NexusDispatchers | null = null;
  private _isProcessing = false;
  private _statusListeners = new Set<(s: OmnixAbsoluteStatus) => void>();

  private constructor() {
    // Wire voice → auto-execute commands
    this.voice.onCommandDetected((cmd) => this._handleVoiceCommand(cmd));

    // Wire gesture → auto-execute
    this.voice.onGesture((g) => this._handleGesture(g));

    // Wire evolution → auto-emit
    this.evolution.onNewSuggestion(() => this._emitStatus());

    // Listen for any component requesting the OmnixAbsoluteCore singleton
    if (typeof window !== "undefined") {
      window.addEventListener("omnix:request-core", () => {
        window.dispatchEvent(
          new CustomEvent("omnix:core-ready", { detail: { core: this } })
        );
      });
    }
  }

  static getInstance(): OmnixAbsoluteCoreClass {
    if (!OmnixAbsoluteCoreClass._instance) {
      OmnixAbsoluteCoreClass._instance = new OmnixAbsoluteCoreClass();
    }
    return OmnixAbsoluteCoreClass._instance;
  }

  // ── Initialize ─────────────────────────────────────────────────────────────

  initialize(config: OmnixAbsoluteCoreConfig = {}): void {
    if (this._initialized) {
      // Re-configure is allowed
      this._config = { ...this._config, ...config };
      this._applyConfig();
      return;
    }

    this._config = { ...this._config, ...config };
    this._applyConfig();
    this._initialized = true;

    console.info(
      `[OmnixAbsolute] ✅ Initialized — ${OMNIX_ABSOLUTE_REGISTRY.length + OMNIX_REGISTRY_MAP.size} commands registered | Nodes: 7`
    );

    window.dispatchEvent(
      new CustomEvent("omnix:initialized", {
        detail: {
          config: this._config,
          commandCount: OMNIX_ABSOLUTE_REGISTRY.length,
          timestamp: Date.now(),
        },
      })
    );

    this._emitStatus();
  }

  private _applyConfig(): void {
    // Sync to OmnixSovereign
    this.sovereign.patch({
      modelConfig: {
        provider: this._config.provider ?? "openai",
        model: this._config.model ?? "gpt-4o",
      },
      agent: {
        godModeActive: this._config.godMode ?? true,
        language: this._config.language ?? "ar",
        evolutionEnabled: this._config.enableEvolution ?? true,
        memoryEnabled: true,
      },
      capabilities: {
        voiceControl: this._config.enableVoice ?? true,
        gestureControl: this._config.enableGesture ?? true,
        selfEvolution: this._config.enableEvolution ?? true,
        quantumInterception: this._config.enableQuantumInterception ?? true,
        absoluteRegistry: true,
        eternalMemory: true,
        divineExecution: true,
      },
    });

    // Sync to OmnixBrain
    this.brain.patch({
      modelConfig: {
        provider: this._config.provider ?? "openai",
        model: this._config.model ?? "gpt-4o",
      },
      language: this._config.language ?? "ar",
    });

    // Run initial evolution analysis
    if (this._config.enableEvolution) {
      this.evolution.analyzePatterns();
    }
  }

  // ── Dispatchers registration ───────────────────────────────────────────────

  registerDispatchers(d: NexusDispatchers): void {
    this._dispatchers = d;
    registerOmnixDispatchers(d);
  }

  // ── Build enriched system prompt ───────────────────────────────────────────

  buildSystemPrompt(ctx: InterceptorContext): string {
    // Inject memory context
    const memoryCtx = this.memory.toContextString();

    // Inject evolution context
    const evolutionCtx = this.evolution.toContextString();

    // Base system prompt from NexusInterceptor (existing implementation)
    const base = buildNexusSystemPrompt(ctx);

    // Compose the full quantum-enriched prompt
    return `${base}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${memoryCtx}

${evolutionCtx}

🔱 OMNIX ABSOLUTE CORE — حالة النظام الكاملة:
• الأنظمة النشطة: 7/7 ✅
• إجمالي الأوامر: ${OMNIX_ABSOLUTE_REGISTRY.length} أمر مطلق + ${OMNIX_REGISTRY_MAP.size} أمر إضافي
• وضع الإله: ${this._config.godMode ? "✅ نشط" : "❌ غير نشط"}
• التطور الذاتي: ${this._config.enableEvolution ? "✅ نشط" : "❌ غير نشط"}
• التحكم الصوتي: ${this._config.enableVoice ? "✅ نشط" : "❌ غير نشط"}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  // ── Process AI response ────────────────────────────────────────────────────

  async processAIResponse(
    responseText: string,
    originalPrompt: string
  ): Promise<OmnixExecutionResult> {
    this._isProcessing = true;
    this._emitStatus();

    try {
      const commands = parseOmnixActions(responseText);
      const cleanText = stripOmnixBlocks(responseText);

      let executionSuccess = true;

      if (commands.length > 0 && this._dispatchers) {
        try {
          await executeOmnixResponse(responseText);

          // Record each command in memory
          for (const cmd of commands) {
            this.memory.recordAction({
              actionId: cmd.action,
              actionLabel: cmd.action,
              params: cmd.params ?? {},
              success: true,
            });
          }

          // Sync sovereign stats
          this.sovereign.recordCommandSuccess(`batch:${commands.length}`);
        } catch (err) {
          executionSuccess = false;
          this.sovereign.recordCommandError("batch_execution");
          console.error("[OmnixAbsolute] Execution error:", err);
        }
      }

      // Record session summary in memory
      this.memory.recordAction({
        actionId: "omnix_session",
        actionLabel: `جلسة: ${originalPrompt.slice(0, 40)}`,
        params: {
          promptPreview: originalPrompt.slice(0, 80),
          commandCount: commands.length,
          model: this._config.model,
          timestamp: Date.now(),
        },
        success: executionSuccess,
      });

      // Run evolution analysis after each AI interaction
      if (this._config.enableEvolution) {
        this.evolution.analyzePatterns();
      }

      return {
        cleanText,
        commands,
        executionSuccess,
        timestamp: Date.now(),
      };
    } finally {
      this._isProcessing = false;
      this._emitStatus();
    }
  }

  // ── Voice command handler ──────────────────────────────────────────────────

  private _handleVoiceCommand(voiceCmd: VoiceCommand): void {
    if (!voiceCmd.matchedCommandId || !this._dispatchers) return;

    const cmdId = voiceCmd.matchedCommandId;

    // Find in absolute registry
    const absCmd = OMNIX_ABSOLUTE_REGISTRY.find((c) => c.id === cmdId);
    if (absCmd) {
      try {
        const result = absCmd.execute(voiceCmd.args, this._dispatchers);
        this.sovereign.recordCommandSuccess(cmdId);
        this.memory.recordAction({
          actionId: cmdId,
          actionLabel: absCmd.nameAr,
          params: { ...voiceCmd.args, via: "voice" },
          success: true,
        });
        this._dispatchers.toast(`🎙️ ${absCmd.nameAr}: ${result.message}`);
      } catch (err) {
        this.sovereign.recordCommandError(cmdId);
        console.error("[OmnixAbsolute] Voice command error:", err);
      }
      return;
    }

    // Find in secondary registry
    const regCmd = OMNIX_REGISTRY_MAP.get(cmdId);
    if (regCmd && this._dispatchers) {
      try {
        const result = regCmd.execute(voiceCmd.args, this._dispatchers);
        this.sovereign.recordCommandSuccess(cmdId);
        this._dispatchers.toast(`🎙️ ${regCmd.nameAr}: ${result.messageAr}`);
      } catch (err) {
        this.sovereign.recordCommandError(cmdId);
        console.error("[OmnixAbsolute] Voice registry command error:", err);
      }
    }
  }

  // ── Gesture handler ────────────────────────────────────────────────────────

  private _handleGesture(gesture: GestureEvent): void {
    if (!gesture.commandId || !this._dispatchers) return;

    const cmdId = gesture.commandId;
    const absCmd = OMNIX_ABSOLUTE_REGISTRY.find((c) => c.id === cmdId);

    if (absCmd) {
      try {
        absCmd.execute({}, this._dispatchers);
        this.memory.recordAction({
          actionId: cmdId,
          actionLabel: absCmd.nameAr,
          params: { via: "gesture", gestureType: gesture.type },
          success: true,
        });
      } catch (err) {
        console.error("[OmnixAbsolute] Gesture command error:", err);
      }
    }
  }

  // ── Execute a command directly by ID ──────────────────────────────────────

  async executeCommand(
    commandId: string,
    params: Record<string, unknown> = {}
  ): Promise<{ success: boolean; message: string }> {
    if (!this._dispatchers) {
      return { success: false, message: "No dispatchers registered" };
    }

    // Try absolute registry first
    const absCmd = OMNIX_ABSOLUTE_REGISTRY.find((c) => c.id === commandId);
    if (absCmd) {
      try {
        const r = absCmd.execute(params, this._dispatchers);
        this.sovereign.recordCommandSuccess(commandId);
        this.memory.recordAction({
          actionId: commandId,
          actionLabel: absCmd.nameAr,
          params,
          success: true,
        });
        return { success: true, message: r.message };
      } catch (err: any) {
        this.sovereign.recordCommandError(commandId);
        return { success: false, message: err?.message ?? "Error" };
      }
    }

    // Try secondary registry
    const regCmd = OMNIX_REGISTRY_MAP.get(commandId);
    if (regCmd) {
      try {
        const r = regCmd.execute(params, this._dispatchers);
        this.sovereign.recordCommandSuccess(commandId);
        this.memory.recordAction({
          actionId: commandId,
          actionLabel: regCmd.nameAr,
          params,
          success: r.success,
        });
        return { success: r.success, message: r.messageAr };
      } catch (err: any) {
        this.sovereign.recordCommandError(commandId);
        return { success: false, message: err?.message ?? "Error" };
      }
    }

    // Fallback: dispatch as custom window event
    window.dispatchEvent(
      new CustomEvent(`omnix:fallback:${commandId}`, { detail: { params } })
    );
    return { success: true, message: `Dispatched fallback: ${commandId}` };
  }

  // ── Voice control ──────────────────────────────────────────────────────────

  startVoice(): boolean {
    if (!this._config.enableVoice) return false;
    return this.voice.startListening();
  }

  stopVoice(): void {
    this.voice.stopListening();
  }

  toggleVoice(): boolean {
    if (this.voice.isListening) {
      this.stopVoice();
      return false;
    }
    return this.startVoice();
  }

  // ── Status ─────────────────────────────────────────────────────────────────

  getStatus(): OmnixAbsoluteStatus {
    const sovState = this.sovereign.getState();
    const nexusState = NexusCore.getState();
    const evolutionStats = this.evolution.getStats();

    return {
      initialized: this._initialized,
      voiceActive: this.voice.isListening,
      isProcessing: this._isProcessing || nexusState.executionState.running,
      executingCommands: nexusState.executionState.running ? nexusState.executionState.total : 0,
      totalCommandsToday: sovState.ui.commandsExecuted,
      totalLearnedCommands: evolutionStats.learnedCommandCount,
      pendingSuggestions: this.evolution.getPendingSuggestions().length,
      systemHealth: sovState.meta.systemHealth,
      activeNodes: 7,
      lastCommandAt: sovState.ui.lastActionAt,
    };
  }

  private _emitStatus(): void {
    const status = this.getStatus();
    this._statusListeners.forEach((cb) => cb(status));
    window.dispatchEvent(new CustomEvent("omnix:status-update", { detail: status }));
  }

  onStatusChange(cb: (s: OmnixAbsoluteStatus) => void): () => void {
    this._statusListeners.add(cb);
    return () => this._statusListeners.delete(cb);
  }

  // ── Config ─────────────────────────────────────────────────────────────────

  getConfig(): Readonly<OmnixAbsoluteCoreConfig> {
    return { ...this._config };
  }

  updateConfig(patch: Partial<OmnixAbsoluteCoreConfig>): void {
    this._config = { ...this._config, ...patch };
    this._applyConfig();
    this._emitStatus();
  }

  // ── Register a custom command at runtime ───────────────────────────────────

  registerRuntimeCommand(def: {
    id: string;
    label: string;
    labelAr: string;
    description: string;
    execute: (params: Record<string, unknown>, dispatchers: NexusDispatchers) => void;
  }): void {
    registerLearnedCommand({
      id: def.id,
      name: def.label,
      nameAr: def.labelAr,
      description: def.description,
      descriptionAr: def.description,
      category: "evolution",
      aliases: [def.label.toLowerCase(), def.labelAr],
      learned: true,
      execute: (params, d) => {
        def.execute(params, d);
        return {
          actionId: def.id,
          success: true,
          message: def.label,
          messageAr: def.labelAr,
        };
      },
    });
  }

  // ── Context string for interceptor ────────────────────────────────────────

  toContextString(): string {
    return [
      this.sovereign.toContextString(),
      "",
      this.brain.toContextString(),
      "",
      this.memory.toContextString(),
      "",
      this.evolution.toContextString(),
    ].join("\n");
  }

  get isInitialized() { return this._initialized; }
  get config() { return this._config; }
}

// ── Singleton export ───────────────────────────────────────────────────────────
export const OmnixAbsoluteCore = OmnixAbsoluteCoreClass.getInstance();
export default OmnixAbsoluteCore;
