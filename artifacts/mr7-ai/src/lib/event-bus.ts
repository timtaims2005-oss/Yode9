/**
 * Typed Event Bus — centralized, strongly-typed publish/subscribe system.
 * Replaces ad-hoc callbacks, window.dispatchEvent hacks, and prop drilling.
 * Zero dependencies, synchronous dispatch, async-safe.
 */

export interface AppEvents {
  // Chat events
  "chat:message-sent":    { chatId: string; content: string };
  "chat:stream-start":    { chatId: string; sessionId: string };
  "chat:stream-end":      { chatId: string; sessionId: string; totalTokens: number };
  "chat:error":           { chatId: string; error: string };
  "chat:title-updated":   { chatId: string; title: string };

  // Model events
  "model:changed":        { model: string; provider: string };
  "model:speed-measured": { model: string; tps: number };

  // System events
  "perf:fps-drop":        { fps: number; threshold: number };
  "perf:memory-pressure": { level: "moderate" | "critical"; heapMB: number };
  "perf:thermal":         { state: string };
  "connection:quality":   { grade: string; latencyMs: number };

  // UI events
  "ui:modal-open":        { id: string };
  "ui:modal-close":       { id: string };
  "ui:theme-change":      { theme: string; accent: string };
  "ui:sidebar-toggle":    { collapsed: boolean };

  // Arsenal events
  "arsenal:module-launch": { moduleId: string };
  "arsenal:chain-fire":    { from: string; to: string; data: unknown };

  // Security events
  "threat:detected":      { severity: string; description: string };
  "auth:session-expired": Record<string, never>;
}

type EventName = keyof AppEvents;
type EventPayload<E extends EventName> = AppEvents[E];
type Listener<E extends EventName> = (payload: EventPayload<E>) => void;

class EventBus {
  private listeners = new Map<EventName, Set<Listener<EventName>>>();
  private history = new Map<EventName, EventPayload<EventName>[]>();
  private maxHistory = 10;

  /** Subscribe to an event */
  on<E extends EventName>(event: E, listener: Listener<E>): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    (this.listeners.get(event)! as Set<Listener<E>>).add(listener);
    return () => this.off(event, listener);
  }

  /** Subscribe once — auto-unsubscribes after first dispatch */
  once<E extends EventName>(event: E, listener: Listener<E>): () => void {
    const wrap: Listener<E> = (payload) => { unsub(); listener(payload); };
    const unsub = this.on(event, wrap);
    return unsub;
  }

  /** Unsubscribe */
  off<E extends EventName>(event: E, listener: Listener<E>): void {
    (this.listeners.get(event) as Set<Listener<E>> | undefined)?.delete(listener);
  }

  /** Emit an event synchronously */
  emit<E extends EventName>(event: E, payload: EventPayload<E>): void {
    // Record in history
    const hist = this.history.get(event) ?? [];
    hist.push(payload);
    if (hist.length > this.maxHistory) hist.shift();
    this.history.set(event, hist);

    // Dispatch
    const set = this.listeners.get(event);
    if (!set) return;
    for (const listener of set) {
      try { (listener as Listener<E>)(payload); }
      catch (e) { console.warn(`[EventBus] listener error on "${event}":`, e); }
    }
  }

  /** Emit after current call stack (microtask) */
  emitAsync<E extends EventName>(event: E, payload: EventPayload<E>): void {
    Promise.resolve().then(() => this.emit(event, payload));
  }

  /** Get last N events of a type */
  getHistory<E extends EventName>(event: E, n = 5): EventPayload<E>[] {
    return (this.history.get(event) as EventPayload<E>[] | undefined)?.slice(-n) ?? [];
  }

  /** Count listeners for an event */
  listenerCount(event: EventName): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  /** Remove all listeners (for testing/cleanup) */
  clear() {
    this.listeners.clear();
    this.history.clear();
  }
}

export const eventBus = new EventBus();
