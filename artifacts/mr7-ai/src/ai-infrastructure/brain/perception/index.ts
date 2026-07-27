import type { JsonValue } from "../../types";

export type SensoryModality = "audio" | "video" | "telemetry" | "event";
export type SensoryEvent = {
  id: string;
  modality: SensoryModality;
  payload: JsonValue;
  timestamp: number;
  source?: string;
};
export type EnvironmentDelta = {
  path: string;
  value: JsonValue;
  previous?: JsonValue;
  timestamp: number;
};

export class RealTimeSensoryStream {
  private active = false;
  private readonly listeners = new Set<(event: SensoryEvent) => void>();

  async ingest(source: AsyncIterable<SensoryEvent>): Promise<void> {
    this.active = true;
    for await (const event of source) {
      if (!this.active) break;
      this.listeners.forEach((listener) => listener(event));
    }
  }

  stop(): void { this.active = false; }
  onEvent(listener: (event: SensoryEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export class EnvironmentStateTree {
  private readonly state = new Map<string, JsonValue>();
  private readonly listeners = new Set<(delta: EnvironmentDelta) => void>();

  set(path: string, value: JsonValue): EnvironmentDelta {
    const delta: EnvironmentDelta = { path, value, previous: this.state.get(path), timestamp: Date.now() };
    this.state.set(path, value);
    this.listeners.forEach((listener) => listener(delta));
    return delta;
  }

  get(path: string): JsonValue | undefined { return this.state.get(path); }
  snapshot(): Record<string, JsonValue> { return Object.fromEntries(this.state.entries()); }
  onDelta(listener: (delta: EnvironmentDelta) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
