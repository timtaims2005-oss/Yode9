// ═══════════════════════════════════════════════════════════════════════════════
//  useOmnixAbsolute — re-export from unified OmnixAbsolute.ts
//  الواجهة الموحدة لجميع الأنظمة التسعة
// ═══════════════════════════════════════════════════════════════════════════════

export {
  useOmnixAbsolute,
  OmnixAbsoluteCore,
  OmnixAbsoluteRegistry,
  OmnixMemory,
  OmnixSovereign,
  OmnixInstantExecutor,
  OmnixQuantumInterceptor,
  OmnixVoiceGesture,
  OmnixSelfEvolution,
  registerBuiltinCommands,
  omnixCore,
} from "../lib/OmnixAbsolute";

export type {
  OmnixAbsoluteCoreStatus,
  OmnixCoreConfig,
  CommandDefinition,
  CommandType,
  ComponentType,
  ComponentEntry,
  ExecutionJob,
  ProgressPayload,
  EvolutionSuggestion,
  SessionRecord,
  VoiceCommandResult,
  PatternRecord,
  OmnixContext,
} from "../lib/OmnixAbsolute";

export { useOmnixAbsolute as default } from "../lib/OmnixAbsolute";
