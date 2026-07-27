import type { ContextBusLike } from "./types";

type Listener = (payload: unknown) => void;

/**
 * Small in-memory typed pub/sub bus. It is intentionally process-local:
 * context is never persisted or sent to an external actor by this class.
 */
export class ContextBus implements ContextBusLike {
  private readonly listeners = new Map<string, Set<Listener>>();
  private readonly latestValues = new Map<string, unknown>();

  publish<T>(topic: string, payload: T): void {
    this.latestValues.set(topic, payload);
    const topicListeners = this.listeners.get(topic);
    if (topicListeners === undefined) return;
    for (const listener of topicListeners) listener(payload);
  }

  subscribe<T>(topic: string, listener: (payload: T) => void): () => void {
    const wrapped: Listener = (payload: unknown): void => {
      listener(payload as T);
    };
    const topicListeners = this.listeners.get(topic) ?? new Set<Listener>();
    topicListeners.add(wrapped);
    this.listeners.set(topic, topicListeners);
    return (): void => {
      topicListeners.delete(wrapped);
      if (topicListeners.size === 0) this.listeners.delete(topic);
    };
  }

  latest<T>(topic: string): T | undefined {
    return this.latestValues.get(topic) as T | undefined;
  }

  clear(): void {
    this.listeners.clear();
    this.latestValues.clear();
  }
}

export default ContextBus;
