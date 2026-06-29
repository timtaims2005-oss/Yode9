// ═══════════════════════════════════════════════════════════════════════════════
//  useOmnixAbsolute — React Hook الرئيسي للنظام المطلق
//  يوفر وصولاً كاملاً للأنظمة السبعة عبر واجهة React موحدة
//  يدير: التنفيذ، الصوت، التطور، الذاكرة، الحالة الكاملة
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";

import { OmnixAbsoluteCore, type OmnixAbsoluteCoreConfig, type OmnixAbsoluteStatus, type OmnixExecutionResult } from "../lib/OmnixAbsoluteCore";
import { OmnixSovereign, type SovereignState } from "../lib/OmnixSovereign";
import { OmnixBrain, type OmnixProjectSnapshot } from "../lib/OmnixBrain";
import { OmnixMemory, type OmnixCommandStat } from "../lib/OmnixMemory";
import { OmnixVoiceGesture, type VoiceCommand, type GestureEvent } from "../lib/OmnixVoiceGesture";
import { OmnixSelfEvolution, type EvolutionSuggestion, type EvolutionStats } from "../lib/OmnixSelfEvolution";
import type { InterceptorContext } from "../lib/NexusInterceptor";
import type { NexusDispatchers } from "../lib/ToolRegistry";

// ── Hook return type ──────────────────────────────────────────────────────────

export interface UseOmnixAbsoluteReturn {
  // ── Core reference
  core: typeof OmnixAbsoluteCore;

  // ── Status & state
  status: OmnixAbsoluteStatus;
  sovereignState: SovereignState;
  brainSnapshot: OmnixProjectSnapshot;

  // ── Processing
  isProcessing: boolean;
  lastResult: OmnixExecutionResult | null;

  // ── Voice
  isListening: boolean;
  voiceState: "idle" | "listening" | "processing" | "error";
  lastVoiceCommand: VoiceCommand | null;
  lastGesture: GestureEvent | null;
  voiceSupported: boolean;
  toggleVoice: () => boolean;
  startVoice: () => boolean;
  stopVoice: () => void;

  // ── Evolution & suggestions
  pendingSuggestions: EvolutionSuggestion[];
  evolutionStats: EvolutionStats;
  learnedCommands: ReturnType<typeof OmnixMemory.getLearnedCommands>;
  approveSuggestion: (id: string) => boolean;
  rejectSuggestion: (id: string) => boolean;

  // ── Memory
  topCommands: OmnixCommandStat[];
  recentActions: ReturnType<typeof OmnixMemory.getRecentActions>;

  // ── Actions
  initialize: (config?: OmnixAbsoluteCoreConfig) => void;
  registerDispatchers: (d: NexusDispatchers) => void;
  buildSystemPrompt: (ctx: InterceptorContext) => string;
  processAIResponse: (response: string, prompt: string) => Promise<OmnixExecutionResult>;
  executeCommand: (commandId: string, params?: Record<string, unknown>) => Promise<{ success: boolean; message: string }>;
  parseVoiceText: (text: string) => VoiceCommand;
  analyzePatterns: () => EvolutionSuggestion[];
  registerCustomCommand: (params: {
    label: string;
    labelAr: string;
    description: string;
    trigger: string;
    executeFn?: () => void;
  }) => string;

  // ── Sovereign patches
  patchSovereign: typeof OmnixSovereign.patch;
  updateModelConfig: typeof OmnixSovereign.updateModelConfig;
  updateTheme: typeof OmnixSovereign.updateTheme;
  toggleGodMode: typeof OmnixSovereign.toggleGodMode;

  // ── Brain patches
  patchBrain: typeof OmnixBrain.patch;
  setWindowOpen: typeof OmnixBrain.setWindowOpen;
  closeAllWindows: typeof OmnixBrain.closeAllWindows;
}

// ── The Hook ──────────────────────────────────────────────────────────────────

export function useOmnixAbsolute(): UseOmnixAbsoluteReturn {
  const coreRef = useRef(OmnixAbsoluteCore);
  const core = coreRef.current;

  // ── Core status ───────────────────────────────────────────────────────────
  const [status, setStatus] = useState<OmnixAbsoluteStatus>(() => core.getStatus());
  const [lastResult, setLastResult] = useState<OmnixExecutionResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ── Sovereign state ───────────────────────────────────────────────────────
  const [sovereignState, setSovereignState] = useState<SovereignState>(() =>
    OmnixSovereign.getState()
  );

  // ── Brain snapshot ────────────────────────────────────────────────────────
  const [brainSnapshot, setBrainSnapshot] = useState<OmnixProjectSnapshot>(() =>
    OmnixBrain.getSnapshot()
  );

  // ── Voice ─────────────────────────────────────────────────────────────────
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "processing" | "error">("idle");
  const [lastVoiceCommand, setLastVoiceCommand] = useState<VoiceCommand | null>(null);
  const [lastGesture, setLastGesture] = useState<GestureEvent | null>(null);

  // ── Evolution ─────────────────────────────────────────────────────────────
  const [pendingSuggestions, setPendingSuggestions] = useState<EvolutionSuggestion[]>(() =>
    OmnixSelfEvolution.getPendingSuggestions()
  );
  const [evolutionStats, setEvolutionStats] = useState<EvolutionStats>(() =>
    OmnixSelfEvolution.getStats()
  );

  // ── Memory ────────────────────────────────────────────────────────────────
  const [topCommands, setTopCommands] = useState<OmnixCommandStat[]>(() =>
    OmnixMemory.getTopCommands(10)
  );
  const [recentActions, setRecentActions] = useState(() =>
    OmnixMemory.getRecentActions(10)
  );
  const [learnedCommands, setLearnedCommands] = useState(() =>
    OmnixMemory.getLearnedCommands()
  );

  // ── Subscribe to all systems ───────────────────────────────────────────────
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    // Status updates
    unsubs.push(core.onStatusChange((s) => {
      setStatus(s);
      setIsProcessing(s.isProcessing);
    }));

    // Sovereign state
    unsubs.push(OmnixSovereign.subscribe((s) => setSovereignState(s)));

    // Brain snapshot
    unsubs.push(OmnixBrain.subscribe((s) => setBrainSnapshot(s)));

    // Voice state
    unsubs.push(OmnixVoiceGesture.onStateChange((s) => setVoiceState(s)));
    unsubs.push(OmnixVoiceGesture.onCommandDetected((cmd) => {
      setLastVoiceCommand(cmd);
      setStatus(core.getStatus());
    }));
    unsubs.push(OmnixVoiceGesture.onGesture((g) => setLastGesture(g)));

    // Evolution suggestions
    unsubs.push(OmnixSelfEvolution.onNewSuggestion(() => {
      setPendingSuggestions(OmnixSelfEvolution.getPendingSuggestions());
    }));
    unsubs.push(OmnixSelfEvolution.onStatsChange((stats) => {
      setEvolutionStats(stats);
      setLearnedCommands(OmnixMemory.getLearnedCommands());
    }));

    // Memory updates via window event
    const memHandler = () => {
      setTopCommands(OmnixMemory.getTopCommands(10));
      setRecentActions(OmnixMemory.getRecentActions(10));
      setLearnedCommands(OmnixMemory.getLearnedCommands());
    };
    window.addEventListener("omnix:memory-updated", memHandler);
    unsubs.push(() => window.removeEventListener("omnix:memory-updated", memHandler));

    return () => unsubs.forEach((u) => u());
  }, [core]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const initialize = useCallback((config?: OmnixAbsoluteCoreConfig) => {
    core.initialize(config ?? {});
    setStatus(core.getStatus());
    setSovereignState(OmnixSovereign.getState());
  }, [core]);

  const registerDispatchers = useCallback((d: NexusDispatchers) => {
    core.registerDispatchers(d);
  }, [core]);

  const buildSystemPrompt = useCallback((ctx: InterceptorContext): string => {
    return core.buildSystemPrompt(ctx);
  }, [core]);

  const processAIResponse = useCallback(async (
    response: string,
    prompt: string
  ): Promise<OmnixExecutionResult> => {
    setIsProcessing(true);
    try {
      const result = await core.processAIResponse(response, prompt);
      setLastResult(result);
      setTopCommands(OmnixMemory.getTopCommands(10));
      setRecentActions(OmnixMemory.getRecentActions(10));
      setPendingSuggestions(OmnixSelfEvolution.getPendingSuggestions());
      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [core]);

  const executeCommand = useCallback(async (
    commandId: string,
    params?: Record<string, unknown>
  ): Promise<{ success: boolean; message: string }> => {
    return core.executeCommand(commandId, params ?? {});
  }, [core]);

  const toggleVoice = useCallback((): boolean => {
    return core.toggleVoice();
  }, [core]);

  const startVoice = useCallback((): boolean => {
    return core.startVoice();
  }, [core]);

  const stopVoice = useCallback((): void => {
    core.stopVoice();
  }, [core]);

  const parseVoiceText = useCallback((text: string): VoiceCommand => {
    return OmnixVoiceGesture.parseText(text);
  }, []);

  const approveSuggestion = useCallback((id: string): boolean => {
    const result = OmnixSelfEvolution.approve(id);
    setPendingSuggestions(OmnixSelfEvolution.getPendingSuggestions());
    setEvolutionStats(OmnixSelfEvolution.getStats());
    setLearnedCommands(OmnixMemory.getLearnedCommands());
    return result;
  }, []);

  const rejectSuggestion = useCallback((id: string): boolean => {
    const result = OmnixSelfEvolution.reject(id);
    setPendingSuggestions(OmnixSelfEvolution.getPendingSuggestions());
    setEvolutionStats(OmnixSelfEvolution.getStats());
    return result;
  }, []);

  const analyzePatterns = useCallback((): EvolutionSuggestion[] => {
    const suggestions = OmnixSelfEvolution.analyzePatterns();
    setPendingSuggestions(OmnixSelfEvolution.getPendingSuggestions());
    setEvolutionStats(OmnixSelfEvolution.getStats());
    return suggestions;
  }, []);

  const registerCustomCommand = useCallback((params: {
    label: string;
    labelAr: string;
    description: string;
    trigger: string;
    executeFn?: () => void;
  }): string => {
    const id = OmnixSelfEvolution.registerCustomCommand(params);
    setLearnedCommands(OmnixMemory.getLearnedCommands());
    setEvolutionStats(OmnixSelfEvolution.getStats());
    return id;
  }, []);

  return {
    // Core
    core,

    // Status & state
    status,
    sovereignState,
    brainSnapshot,

    // Processing
    isProcessing,
    lastResult,

    // Voice
    isListening: voiceState === "listening",
    voiceState,
    lastVoiceCommand,
    lastGesture,
    voiceSupported: OmnixVoiceGesture.isSupported,
    toggleVoice,
    startVoice,
    stopVoice,

    // Evolution & suggestions
    pendingSuggestions,
    evolutionStats,
    learnedCommands,
    approveSuggestion,
    rejectSuggestion,

    // Memory
    topCommands,
    recentActions,

    // Actions
    initialize,
    registerDispatchers,
    buildSystemPrompt,
    processAIResponse,
    executeCommand,
    parseVoiceText,
    analyzePatterns,
    registerCustomCommand,

    // Sovereign patches
    patchSovereign: OmnixSovereign.patch.bind(OmnixSovereign),
    updateModelConfig: OmnixSovereign.updateModelConfig.bind(OmnixSovereign),
    updateTheme: OmnixSovereign.updateTheme.bind(OmnixSovereign),
    toggleGodMode: OmnixSovereign.toggleGodMode.bind(OmnixSovereign),

    // Brain patches
    patchBrain: OmnixBrain.patch.bind(OmnixBrain),
    setWindowOpen: OmnixBrain.setWindowOpen.bind(OmnixBrain),
    closeAllWindows: OmnixBrain.closeAllWindows.bind(OmnixBrain),
  };
}

export default useOmnixAbsolute;
