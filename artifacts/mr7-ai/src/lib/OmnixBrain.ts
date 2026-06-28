// ═══════════════════════════════════════════════════════════════════════════════
//  OMNIX SOVEREIGN BRAIN — النواة المركزية المطلقة
//  خريطة حية كاملة لكل ذرة في المشروع — تتحدث في الوقت الفعلي
// ═══════════════════════════════════════════════════════════════════════════════

export interface OmnixWindowState {
  id: string;
  open: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  minimized?: boolean;
}

export interface OmnixModelConfig {
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  streaming: boolean;
  topP?: number;
  frequencyPenalty?: number;
}

export interface OmnixPersonaState {
  id: string;
  name: string;
  active: boolean;
  systemPrompt?: string;
}

export interface OmnixThemeState {
  themeId: string;
  accent: string;
  globeTheme: string;
  font?: string;
  brightness?: number;
}

export interface OmnixProjectSnapshot {
  // Metadata
  snapshotId: string;
  timestamp: number;

  // Windows
  windows: Record<string, OmnixWindowState>;

  // Model
  modelConfig: OmnixModelConfig;

  // Persona
  activePersona: OmnixPersonaState | null;
  personas: OmnixPersonaState[];

  // Theme
  theme: OmnixThemeState;

  // App state
  activeView: string;
  sidebarCollapsed: boolean;
  language: string;
  mode: string;
  agentEnabled: boolean;
  webEnabled: boolean;
  streaming: boolean;

  // Active tools
  activeSecurityTools: string[];
  activeOsintTools: string[];

  // Performance
  performanceMode: "ultra" | "balanced" | "power-save";

  // Session
  chatCount: number;
  activeChatId: string | null;

  // Custom data
  custom: Record<string, unknown>;
}

export interface OmnixBrainState {
  snapshot: OmnixProjectSnapshot;
  history: OmnixProjectSnapshot[];
  changeLog: { ts: number; field: string; from: unknown; to: unknown }[];
  subscriberCount: number;
}

type BrainListener = (snapshot: OmnixProjectSnapshot) => void;

function makeDefaultSnapshot(): OmnixProjectSnapshot {
  return {
    snapshotId: `omnix-${Date.now()}`,
    timestamp: Date.now(),
    windows: {},
    modelConfig: {
      provider: "openai",
      model: "gpt-4o",
      temperature: 0.7,
      maxTokens: 2048,
      streaming: true,
    },
    activePersona: null,
    personas: [],
    theme: {
      themeId: "space",
      accent: "green",
      globeTheme: "cyber",
    },
    activeView: "chat",
    sidebarCollapsed: false,
    language: "ar",
    mode: "chat",
    agentEnabled: false,
    webEnabled: false,
    streaming: true,
    activeSecurityTools: [],
    activeOsintTools: [],
    performanceMode: "balanced",
    chatCount: 0,
    activeChatId: null,
    custom: {},
  };
}

class OmnixBrainClass {
  private _snapshot: OmnixProjectSnapshot = makeDefaultSnapshot();
  private _history: OmnixProjectSnapshot[] = [];
  private _changeLog: { ts: number; field: string; from: unknown; to: unknown }[] = [];
  private _listeners = new Set<BrainListener>();

  // ── Public API ──────────────────────────────────────────────────────────────

  getSnapshot(): OmnixProjectSnapshot {
    return this._snapshot;
  }

  getHistory(): OmnixProjectSnapshot[] {
    return this._history;
  }

  getChangeLog() {
    return this._changeLog;
  }

  subscribe(fn: BrainListener): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  // ── Patch helpers ────────────────────────────────────────────────────────────

  patch(partial: Partial<OmnixProjectSnapshot>, reason?: string) {
    const prev = this._snapshot;

    // Record change log entries
    for (const [key, val] of Object.entries(partial)) {
      this._changeLog.unshift({
        ts: Date.now(),
        field: key,
        from: (prev as Record<string, unknown>)[key],
        to: val,
      });
    }
    this._changeLog = this._changeLog.slice(0, 200);

    // Push to history every 30 changes
    if (this._changeLog.length % 30 === 0) {
      this._history.unshift({ ...prev });
      this._history = this._history.slice(0, 50);
    }

    this._snapshot = {
      ...prev,
      ...partial,
      snapshotId: `omnix-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      timestamp: Date.now(),
    };

    this._emit();

    // Broadcast to window for cross-component access
    window.dispatchEvent(
      new CustomEvent("omnix:snapshot", { detail: { snapshot: this._snapshot, reason } })
    );
  }

  // ── Window management ────────────────────────────────────────────────────────

  setWindowOpen(id: string, open: boolean, meta?: Partial<OmnixWindowState>) {
    const prev = this._snapshot.windows[id] ?? { id, open: false };
    this.patch({
      windows: {
        ...this._snapshot.windows,
        [id]: { ...prev, ...meta, id, open },
      },
    });
  }

  setWindowPosition(id: string, x: number, y: number) {
    const prev = this._snapshot.windows[id] ?? { id, open: true };
    this.patch({
      windows: { ...this._snapshot.windows, [id]: { ...prev, x, y } },
    });
  }

  minimizeWindow(id: string) {
    const prev = this._snapshot.windows[id] ?? { id, open: true };
    this.patch({
      windows: { ...this._snapshot.windows, [id]: { ...prev, minimized: true } },
    });
  }

  restoreWindow(id: string) {
    const prev = this._snapshot.windows[id] ?? { id, open: true };
    this.patch({
      windows: { ...this._snapshot.windows, [id]: { ...prev, minimized: false } },
    });
  }

  closeAllWindows() {
    const closed: Record<string, OmnixWindowState> = {};
    for (const [k, w] of Object.entries(this._snapshot.windows)) {
      closed[k] = { ...w, open: false };
    }
    this.patch({ windows: closed });
  }

  // ── Model config ─────────────────────────────────────────────────────────────

  setModelConfig(cfg: Partial<OmnixModelConfig>) {
    this.patch({ modelConfig: { ...this._snapshot.modelConfig, ...cfg } });
  }

  // ── Theme ────────────────────────────────────────────────────────────────────

  setTheme(theme: Partial<OmnixThemeState>) {
    this.patch({ theme: { ...this._snapshot.theme, ...theme } });
  }

  // ── Persona ──────────────────────────────────────────────────────────────────

  setActivePersona(persona: OmnixPersonaState | null) {
    this.patch({ activePersona: persona });
  }

  updatePersonas(personas: OmnixPersonaState[]) {
    this.patch({ personas });
  }

  // ── Custom data ───────────────────────────────────────────────────────────────

  setCustom(key: string, value: unknown) {
    this.patch({ custom: { ...this._snapshot.custom, [key]: value } });
  }

  // ── Serialization for interceptor ────────────────────────────────────────────

  toContextString(): string {
    const s = this._snapshot;
    const openWindows = Object.entries(s.windows)
      .filter(([, w]) => w.open)
      .map(([id]) => id)
      .join(", ") || "لا يوجد";

    return [
      `📡 OMNIX BRAIN — خريطة المشروع الحية [${new Date(s.timestamp).toLocaleTimeString("ar")}]`,
      `• المزود: ${s.modelConfig.provider} | النموذج: ${s.modelConfig.model}`,
      `• الثيم: ${s.theme.themeId} | اللون: ${s.theme.accent} | الكرة 3D: ${s.theme.globeTheme}`,
      `• الشخصية: ${s.activePersona?.name ?? "افتراضية"} | الوضع: ${s.mode}`,
      `• درجة الحرارة: ${s.modelConfig.temperature} | الرموز: ${s.modelConfig.maxTokens}`,
      `• النوافذ المفتوحة: ${openWindows}`,
      `• المحادثات: ${s.chatCount} | اللغة: ${s.language}`,
      `• الأدوات الأمنية النشطة: ${s.activeSecurityTools.join(", ") || "لا يوجد"}`,
      `• أدوات OSINT النشطة: ${s.activeOsintTools.join(", ") || "لا يوجد"}`,
    ].join("\n");
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private _emit() {
    this._listeners.forEach((fn) => fn(this._snapshot));
  }
}

export const OmnixBrain = new OmnixBrainClass();

// Auto-sync window open/close events from Nexus
window.addEventListener("nexus:state-change", (e) => {
  const detail = (e as CustomEvent).detail;
  if (detail?.modals) {
    for (const [id, open] of Object.entries(detail.modals)) {
      OmnixBrain.setWindowOpen(id, !!open);
    }
  }
});
