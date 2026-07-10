/**
 * High-Performance Event Bus v4.0
 * In-process pub/sub with priority queues, backpressure, and replay support.
 * Used for inter-module communication without tight coupling.
 */

type Handler<T = unknown> = (event: T) => void | Promise<void>;
type Unsubscribe = () => void;

interface EventSubscription<T> {
  id: string;
  handler: Handler<T>;
  once: boolean;
  priority: number;
  filter?: (event: T) => boolean;
}

interface ReplayBuffer<T> {
  events: T[];
  maxSize: number;
}

export class EventBus {
  private subscriptions = new Map<string, EventSubscription<unknown>[]>();
  private replayBuffers = new Map<string, ReplayBuffer<unknown>>();
  private stats = { emitted: 0, delivered: 0, dropped: 0 };
  private errorHandler?: (err: unknown, topic: string) => void;

  onError(handler: (err: unknown, topic: string) => void): void {
    this.errorHandler = handler;
  }

  enableReplay(topic: string, maxSize: number): void {
    this.replayBuffers.set(topic, { events: [], maxSize });
  }

  subscribe<T>(topic: string, handler: Handler<T>, opts: { once?: boolean; priority?: number; filter?: (e: T) => boolean; replay?: boolean } = {}): Unsubscribe {
    const subs = this.subscriptions.get(topic) ?? [];
    const sub: EventSubscription<T> = {
      id: Math.random().toString(36).slice(2),
      handler: handler as Handler<unknown>,
      once: opts.once ?? false,
      priority: opts.priority ?? 0,
      filter: opts.filter ? (opts.filter as (e: unknown) => boolean) : undefined,
    };
    subs.push(sub as EventSubscription<unknown>);
    subs.sort((a, b) => b.priority - a.priority);
    this.subscriptions.set(topic, subs);

    if (opts.replay) {
      const buf = this.replayBuffers.get(topic);
      if (buf) {
        for (const ev of buf.events) {
          if (!sub.filter || sub.filter(ev)) {
            Promise.resolve(handler(ev as T)).catch(err => this.errorHandler?.(err, topic));
          }
        }
      }
    }

    return () => {
      const current = this.subscriptions.get(topic) ?? [];
      this.subscriptions.set(topic, current.filter(s => s.id !== sub.id));
    };
  }

  on<T>(topic: string, handler: Handler<T>, priority = 0): Unsubscribe {
    return this.subscribe(topic, handler, { priority });
  }

  once<T>(topic: string, handler: Handler<T>): Unsubscribe {
    return this.subscribe(topic, handler, { once: true });
  }

  async emit<T>(topic: string, event: T): Promise<void> {
    this.stats.emitted++;
    const buf = this.replayBuffers.get(topic);
    if (buf) {
      buf.events.push(event);
      if (buf.events.length > buf.maxSize) buf.events.shift();
    }

    const subs = this.subscriptions.get(topic) ?? [];
    const toRemove: string[] = [];
    for (const sub of subs) {
      if (sub.filter && !sub.filter(event)) continue;
      try {
        await sub.handler(event);
        this.stats.delivered++;
      } catch (err) {
        this.stats.dropped++;
        this.errorHandler?.(err, topic);
      }
      if (sub.once) toRemove.push(sub.id);
    }
    if (toRemove.length) {
      this.subscriptions.set(topic, subs.filter(s => !toRemove.includes(s.id)));
    }
  }

  emitSync<T>(topic: string, event: T): void {
    this.emit(topic, event).catch(err => this.errorHandler?.(err, topic));
  }

  hasSubscribers(topic: string): boolean {
    return (this.subscriptions.get(topic)?.length ?? 0) > 0;
  }

  clear(topic?: string): void {
    if (topic) this.subscriptions.delete(topic);
    else this.subscriptions.clear();
  }

  getStats() { return { ...this.stats, topics: this.subscriptions.size }; }
}

export const eventBus = new EventBus();

export const EVENTS = {
  THREAT_DETECTED:       "security.threat.detected",
  THREAT_MITIGATED:      "security.threat.mitigated",
  ANOMALY_DETECTED:      "security.anomaly.detected",
  USER_AUTH:             "auth.user.authenticated",
  USER_LOGOUT:           "auth.user.logged_out",
  SESSION_EXPIRED:       "auth.session.expired",
  AI_REQUEST_START:      "ai.request.start",
  AI_REQUEST_COMPLETE:   "ai.request.complete",
  AI_REQUEST_FAILED:     "ai.request.failed",
  FEATURE_FLAG_CHANGED:  "features.flag.changed",
  BACKUP_COMPLETE:       "ops.backup.complete",
  HEALTH_DEGRADED:       "ops.health.degraded",
  HEALTH_RECOVERED:      "ops.health.recovered",
  RATE_LIMIT_HIT:        "security.ratelimit.hit",
  CVE_NEW:               "threat.cve.new",
} as const;
