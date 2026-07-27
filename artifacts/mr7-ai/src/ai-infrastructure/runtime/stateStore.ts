import type { JsonValue } from "../types";

export type RuntimeState = {
  id: string;
  status: "running" | "paused" | "completed" | "failed";
  step: string;
  data: Record<string, JsonValue>;
  updatedAt: number;
};

export interface StateStore {
  get(id: string): RuntimeState | undefined;
  save(state: RuntimeState): void;
  delete(id: string): void;
}

export class MemoryStateStore implements StateStore {
  private readonly states = new Map<string, RuntimeState>();
  get(id: string): RuntimeState | undefined { return this.states.get(id); }
  save(state: RuntimeState): void { this.states.set(state.id, { ...state, updatedAt: Date.now() }); }
  delete(id: string): void { this.states.delete(id); }
}

export class DurableBrowserStateStore implements StateStore {
  constructor(private readonly key = "mr7-ai-runtime-states") {}
  private read(): Record<string, RuntimeState> {
    try { return JSON.parse(localStorage.getItem(this.key) ?? "{}") as Record<string, RuntimeState>; } catch { return {}; }
  }
  get(id: string): RuntimeState | undefined { return this.read()[id]; }
  save(state: RuntimeState): void {
    const values = this.read();
    values[state.id] = { ...state, updatedAt: Date.now() };
    try { localStorage.setItem(this.key, JSON.stringify(values)); } catch { /* storage is best effort */ }
  }
  delete(id: string): void { const values = this.read(); delete values[id]; try { localStorage.setItem(this.key, JSON.stringify(values)); } catch { /* best effort */ } }
}
