// ─────────────────────────────────────────────────────────────────────────────
//  NEXUS CORE — العقل المركزي لنظام NEXUS AI AGENT
//  المخزن المركزي الذي يحتفظ بحالة كل شيء في الوقت الفعلي
// ─────────────────────────────────────────────────────────────────────────────

export interface NexusActivityEntry {
  id: string;
  ts: number;
  actionId: string;
  actionLabel: string;
  success: boolean;
  message: string;
  params?: Record<string, unknown>;
}

export interface NexusExecutionState {
  running: boolean;
  queue: { actionId: string; label: string; params?: Record<string, unknown> }[];
  current: string | null;
  currentIndex: number;
  total: number;
  results: { actionId: string; success: boolean; message: string }[];
}

export interface NexusState {
  enabled: boolean;
  executionState: NexusExecutionState;
  activityLog: NexusActivityEntry[];
  showHUD: boolean;
  showActivityLog: boolean;
  lastSnapshotAt: number;
}

type NexusListener = (state: NexusState) => void;

const INITIAL_STATE: NexusState = {
  enabled: true,
  executionState: {
    running: false,
    queue: [],
    current: null,
    currentIndex: 0,
    total: 0,
    results: [],
  },
  activityLog: [],
  showHUD: true,
  showActivityLog: false,
  lastSnapshotAt: 0,
};

class NexusCoreClass {
  private _state: NexusState = structuredClone(INITIAL_STATE);
  private _listeners = new Set<NexusListener>();

  getState(): NexusState {
    return this._state;
  }

  subscribe(fn: NexusListener): () => void {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  private _emit() {
    this._listeners.forEach((fn) => fn(this._state));
    window.dispatchEvent(new CustomEvent("nexus:state-change", { detail: this._state }));
  }

  private _patch(patch: Partial<NexusState>) {
    this._state = { ...this._state, ...patch };
    this._emit();
  }

  setEnabled(val: boolean) {
    this._patch({ enabled: val });
  }

  toggleHUD() {
    this._patch({ showHUD: !this._state.showHUD });
  }

  toggleActivityLog() {
    this._patch({ showActivityLog: !this._state.showActivityLog });
  }

  touchSnapshot() {
    this._patch({ lastSnapshotAt: Date.now() });
  }

  startExecution(queue: { actionId: string; label: string; params?: Record<string, unknown> }[]) {
    this._patch({
      executionState: {
        running: true,
        queue,
        current: queue[0]?.actionId ?? null,
        currentIndex: 0,
        total: queue.length,
        results: [],
      },
    });
  }

  advanceExecution(result: { actionId: string; success: boolean; message: string }) {
    const es = this._state.executionState;
    const nextIndex = es.currentIndex + 1;
    const nextResults = [...es.results, result];
    const nextCurrent = es.queue[nextIndex]?.actionId ?? null;

    const entry: NexusActivityEntry = {
      id: `nex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(),
      actionId: result.actionId,
      actionLabel: es.queue[es.currentIndex]?.label ?? result.actionId,
      success: result.success,
      message: result.message,
      params: es.queue[es.currentIndex]?.params,
    };

    this._patch({
      activityLog: [entry, ...this._state.activityLog].slice(0, 100),
      executionState: {
        ...es,
        currentIndex: nextIndex,
        current: nextCurrent,
        results: nextResults,
      },
    });
  }

  finishExecution() {
    this._patch({
      executionState: {
        ...this._state.executionState,
        running: false,
        current: null,
      },
    });
  }

  addActivityEntry(entry: Omit<NexusActivityEntry, "id" | "ts">) {
    const full: NexusActivityEntry = {
      ...entry,
      id: `nex-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ts: Date.now(),
    };
    this._patch({ activityLog: [full, ...this._state.activityLog].slice(0, 100) });
  }

  clearLog() {
    this._patch({ activityLog: [] });
  }
}

export const NexusCore = new NexusCoreClass();
