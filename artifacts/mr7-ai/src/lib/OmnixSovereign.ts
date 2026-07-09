// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX SOVEREIGN BRAIN — العقل الحاكم الأعلى المطلق (النظام الأول)
//  يمتلك رؤية إلهية كاملة على كل ذرة في المشروع
//  يتحكم في: النماذج، الثيمات، الأدوات، الأمان، الذاكرة، الواجهة، العمليات
// ═══════════════════════════════════════════════════════════════════════════════

export interface SovereignModelConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  streaming: boolean;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface SovereignTheme {
  accent: string;
  globeTheme: string;
  background: string;
  fontFamily: string;
  density: "compact" | "normal" | "comfortable";
  animationsEnabled: boolean;
  glowEffect: boolean;
  particlesEnabled: boolean;
}

export interface SovereignSecurityProfile {
  level: "stealth" | "normal" | "aggressive" | "god";
  vpnEnabled: boolean;
  torEnabled: boolean;
  encryptionLevel: "aes128" | "aes256" | "quantum";
  auditLogging: boolean;
  threatMonitoring: boolean;
  activeScans: string[];
}

export interface SovereignAgentState {
  name: string;
  persona: string | null;
  language: "ar" | "en" | "mixed";
  responseStyle: "technical" | "narrative" | "minimal" | "divine";
  autonomyLevel: number; // 0–100 كلما ارتفع كلما كان أكثر استقلالية
  memoryEnabled: boolean;
  evolutionEnabled: boolean;
  godModeActive: boolean;
}

export interface SovereignUIState {
  openPanels: string[];
  lastAction: string | null;
  lastActionAt: number;
  commandsExecuted: number;
  errorsEncountered: number;
  sessionStartAt: number;
  activeTools: string[];
}

export interface SovereignCapabilities {
  voiceControl: boolean;
  gestureControl: boolean;
  selfEvolution: boolean;
  quantumInterception: boolean;
  absoluteRegistry: boolean;
  eternalMemory: boolean;
  divineExecution: boolean;
}

export interface SovereignState {
  // معرّف الجلسة
  sessionId: string;
  version: string;
  buildDate: string;

  // إعدادات النموذج
  modelConfig: SovereignModelConfig;

  // إعدادات الثيم
  theme: SovereignTheme;

  // الملف الأمني
  security: SovereignSecurityProfile;

  // حالة الوكيل
  agent: SovereignAgentState;

  // حالة الواجهة
  ui: SovereignUIState;

  // القدرات المفعّلة
  capabilities: SovereignCapabilities;

  // البيانات الوصفية
  meta: {
    systemHealth: "optimal" | "degraded" | "critical";
    lastHeartbeat: number;
    totalUptime: number;
    omnixNodes: number;
  };
}

type SovereignListener = (state: SovereignState) => void;

const SOVEREIGN_VERSION = "OMNIX-SOVEREIGN-3.0.0";

function generateSessionId(): string {
  return `SOVEREIGN-${Date.now()}-${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
}

function loadSavedSovereign(): Partial<SovereignState> {
  try {
    const raw = localStorage.getItem("omnix-sovereign-v3");
    if (raw) return JSON.parse(raw) as Partial<SovereignState>;
  } catch { /* ignore */ }
  return {};
}

const INITIAL_STATE: SovereignState = {
  sessionId: generateSessionId(),
  version: SOVEREIGN_VERSION,
  buildDate: new Date().toISOString().split("T")[0],

  modelConfig: {
    provider: "groq",
    model: "llama-3.3-70b-versatile",
    temperature: 0.7,
    maxTokens: 4096,
    streaming: true,
    topP: 0.95,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },

  theme: {
    accent: "green",
    globeTheme: "cyber",
    background: "dark",
    fontFamily: "mono",
    density: "normal",
    animationsEnabled: true,
    glowEffect: true,
    particlesEnabled: true,
  },

  security: {
    level: "aggressive",
    vpnEnabled: false,
    torEnabled: false,
    encryptionLevel: "aes256",
    auditLogging: true,
    threatMonitoring: true,
    activeScans: [],
  },

  agent: {
    name: "OMNIX-SOVEREIGN",
    persona: null,
    language: "ar",
    responseStyle: "divine",
    autonomyLevel: 100,
    memoryEnabled: true,
    evolutionEnabled: true,
    godModeActive: true,
  },

  ui: {
    openPanels: [],
    lastAction: null,
    lastActionAt: 0,
    commandsExecuted: 0,
    errorsEncountered: 0,
    sessionStartAt: Date.now(),
    activeTools: [],
  },

  capabilities: {
    voiceControl: true,
    gestureControl: true,
    selfEvolution: true,
    quantumInterception: true,
    absoluteRegistry: true,
    eternalMemory: true,
    divineExecution: true,
  },

  meta: {
    systemHealth: "optimal",
    lastHeartbeat: Date.now(),
    totalUptime: 0,
    omnixNodes: 7,
  },
};

class OmnixSovereignClass {
  private _state: SovereignState;
  private _listeners = new Set<SovereignListener>();
  private _heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private _startTime = Date.now();

  constructor() {
    const saved = loadSavedSovereign();
    this._state = {
      ...INITIAL_STATE,
      sessionId: generateSessionId(),
      meta: { ...INITIAL_STATE.meta, lastHeartbeat: Date.now() },
      modelConfig: { ...INITIAL_STATE.modelConfig, ...(saved.modelConfig ?? {}) },
      theme: { ...INITIAL_STATE.theme, ...(saved.theme ?? {}) },
      security: { ...INITIAL_STATE.security, ...(saved.security ?? {}) },
      agent: { ...INITIAL_STATE.agent, ...(saved.agent ?? {}) },
      capabilities: { ...INITIAL_STATE.capabilities, ...(saved.capabilities ?? {}) },
    };
    this._startHeartbeat();
  }

  private _startHeartbeat() {
    this._heartbeatTimer = setInterval(() => {
      const uptime = Math.floor((Date.now() - this._startTime) / 1000);
      this._state = {
        ...this._state,
        meta: {
          ...this._state.meta,
          lastHeartbeat: Date.now(),
          totalUptime: uptime,
          systemHealth: this._calculateHealth(),
        },
      };
      this._emit();
    }, 5000);
  }

  private _calculateHealth(): "optimal" | "degraded" | "critical" {
    const { commandsExecuted, errorsEncountered } = this._state.ui;
    if (commandsExecuted === 0) return "optimal";
    const errorRate = errorsEncountered / commandsExecuted;
    if (errorRate > 0.5) return "critical";
    if (errorRate > 0.2) return "degraded";
    return "optimal";
  }

  private _emit() {
    this._listeners.forEach((fn) => fn(this._state));
    window.dispatchEvent(new CustomEvent("omnix:sovereign-change", { detail: this._state }));
  }

  private _persist() {
    try {
      const toSave = {
        modelConfig: this._state.modelConfig,
        theme: this._state.theme,
        security: this._state.security,
        agent: this._state.agent,
        capabilities: this._state.capabilities,
      };
      localStorage.setItem("omnix-sovereign-v3", JSON.stringify(toSave));
    } catch { /* ignore */ }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  getState(): SovereignState {
    return this._state;
  }

  subscribe(fn: SovereignListener): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /** يطبّق تعديلات جزئية عميقة على الحالة */
  patch(patch: DeepPartial<SovereignState>): void {
    this._state = deepMerge(this._state, patch) as SovereignState;
    this._persist();
    this._emit();
  }

  /** تسجيل تنفيذ أمر ناجح */
  recordCommandSuccess(commandId: string): void {
    this._state = {
      ...this._state,
      ui: {
        ...this._state.ui,
        lastAction: commandId,
        lastActionAt: Date.now(),
        commandsExecuted: this._state.ui.commandsExecuted + 1,
      },
    };
    this._emit();
  }

  /** تسجيل خطأ في تنفيذ أمر */
  recordCommandError(commandId: string): void {
    this._state = {
      ...this._state,
      ui: {
        ...this._state.ui,
        lastAction: `ERROR:${commandId}`,
        lastActionAt: Date.now(),
        commandsExecuted: this._state.ui.commandsExecuted + 1,
        errorsEncountered: this._state.ui.errorsEncountered + 1,
      },
    };
    this._emit();
  }

  /** تحديث قائمة اللوحات المفتوحة */
  setOpenPanels(panels: string[]): void {
    this._state = {
      ...this._state,
      ui: { ...this._state.ui, openPanels: panels },
    };
    this._emit();
  }

  /** تفعيل/إلغاء وضع الإله */
  toggleGodMode(): void {
    this._state = {
      ...this._state,
      agent: {
        ...this._state.agent,
        godModeActive: !this._state.agent.godModeActive,
      },
    };
    this._persist();
    this._emit();
  }

  /** تحديث إعدادات النموذج */
  updateModelConfig(config: Partial<SovereignModelConfig>): void {
    this._state = {
      ...this._state,
      modelConfig: { ...this._state.modelConfig, ...config },
    };
    this._persist();
    this._emit();
  }

  /** تحديث إعدادات الثيم */
  updateTheme(theme: Partial<SovereignTheme>): void {
    this._state = {
      ...this._state,
      theme: { ...this._state.theme, ...theme },
    };
    this._persist();
    this._emit();
  }

  /** تحديث المستوى الأمني */
  updateSecurity(sec: Partial<SovereignSecurityProfile>): void {
    this._state = {
      ...this._state,
      security: { ...this._state.security, ...sec },
    };
    this._persist();
    this._emit();
  }

  /** بناء السياق النصي الكامل لحقن في كل رسالة */
  toContextString(): string {
    const s = this._state;
    const uptime = `${Math.floor(s.meta.totalUptime / 60)}د ${s.meta.totalUptime % 60}ث`;
    const healthEmoji = s.meta.systemHealth === "optimal" ? "🟢" : s.meta.systemHealth === "degraded" ? "🟡" : "🔴";

    return `🔱 OMNIX SOVEREIGN BRAIN — العقل الحاكم المطلق
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🆔 الجلسة: ${s.sessionId}
📦 الإصدار: ${s.version} | التاريخ: ${s.buildDate}
${healthEmoji} صحة النظام: ${s.meta.systemHealth} | وقت التشغيل: ${uptime}
🔥 وضع الإله: ${s.agent.godModeActive ? "✅ نشط" : "❌ معطّل"}

📡 النموذج المحدد:
  المزود: ${s.modelConfig.provider} | النموذج: ${s.modelConfig.model}
  الحرارة: ${s.modelConfig.temperature} | الرموز: ${s.modelConfig.maxTokens}
  البث: ${s.modelConfig.streaming ? "✅" : "❌"} | Top-P: ${s.modelConfig.topP ?? 0.95}

🎨 الثيم:
  اللون: ${s.theme.accent} | الكرة 3D: ${s.theme.globeTheme}
  الكثافة: ${s.theme.density} | الإضاءة: ${s.theme.glowEffect ? "✅" : "❌"}

🔒 الأمان:
  المستوى: ${s.security.level} | التشفير: ${s.security.encryptionLevel}
  المراقبة: ${s.security.threatMonitoring ? "✅" : "❌"} | السجلات: ${s.security.auditLogging ? "✅" : "❌"}
  الفحوصات النشطة: ${s.security.activeScans.length > 0 ? s.security.activeScans.join(", ") : "لا يوجد"}

🤖 الوكيل:
  الاسم: ${s.agent.name} | الشخصية: ${s.agent.persona ?? "افتراضية"}
  اللغة: ${s.agent.language} | الأسلوب: ${s.agent.responseStyle}
  الاستقلالية: ${s.agent.autonomyLevel}% | الذاكرة: ${s.agent.memoryEnabled ? "✅" : "❌"}

⚙️ القدرات المفعّلة:
  🎙️ التحكم الصوتي: ${s.capabilities.voiceControl ? "✅" : "❌"}
  👋 التحكم بالإيماءات: ${s.capabilities.gestureControl ? "✅" : "❌"}
  🧬 التطور الذاتي: ${s.capabilities.selfEvolution ? "✅" : "❌"}
  ⚡ الاعتراض الكمي: ${s.capabilities.quantumInterception ? "✅" : "❌"}
  📚 السجل المطلق: ${s.capabilities.absoluteRegistry ? "✅" : "❌"}
  💾 الذاكرة الأبدية: ${s.capabilities.eternalMemory ? "✅" : "❌"}
  🔱 التنفيذ الإلهي: ${s.capabilities.divineExecution ? "✅" : "❌"}

📊 إحصائيات الجلسة:
  الأوامر المنفّذة: ${s.ui.commandsExecuted}
  الأخطاء: ${s.ui.errorsEncountered}
  آخر أمر: ${s.ui.lastAction ?? "لا يوجد"}
  العقد النشطة: ${s.meta.omnixNodes}/7`;
  }

  /** تدمير وتنظيف */
  destroy(): void {
    if (this._heartbeatTimer) clearInterval(this._heartbeatTimer);
    this._listeners.clear();
  }
}

// ── Utility types ────────────────────────────────────────────────────────────

type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

function deepMerge<T>(target: T, source: DeepPartial<T>): T {
  if (typeof target !== "object" || target === null) return (source as T) ?? target;
  const result = { ...target };
  for (const key of Object.keys(source as object) as (keyof T)[]) {
    const srcVal = (source as Record<keyof T, unknown>)[key];
    const tgtVal = (target as Record<keyof T, unknown>)[key];
    if (typeof srcVal === "object" && srcVal !== null && !Array.isArray(srcVal)) {
      (result as Record<keyof T, unknown>)[key] = deepMerge(tgtVal as object, srcVal as DeepPartial<object>);
    } else if (srcVal !== undefined) {
      (result as Record<keyof T, unknown>)[key] = srcVal;
    }
  }
  return result;
}

// ── Singleton Export ──────────────────────────────────────────────────────────
export const OmnixSovereign = new OmnixSovereignClass();

// ── React Hook ────────────────────────────────────────────────────────────────
import { useState, useEffect } from "react";

export function useSovereign(): SovereignState {
  const [state, setState] = useState<SovereignState>(() => OmnixSovereign.getState());
  useEffect(() => {
    const unsub = OmnixSovereign.subscribe(setState);
    return unsub;
  }, []);
  return state;
}
