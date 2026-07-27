import type { DomainEvent } from '../domain/events/ArtifactCreatedEvent.js';

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>,
  ): void;
}

// ── In-Memory EventBus (development/single-node) ────────────────────────────
export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, Array<(e: DomainEvent) => Promise<void>>> = new Map();

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) ?? [];
    await Promise.allSettled(handlers.map((h) => h(event)));
  }

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: (event: T) => Promise<void>,
  ): void {
    const existing = this.handlers.get(eventType) ?? [];
    existing.push(handler as (e: DomainEvent) => Promise<void>);
    this.handlers.set(eventType, existing);
  }
}

export const globalEventBus = new InMemoryEventBus();
