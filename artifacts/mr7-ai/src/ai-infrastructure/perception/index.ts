export type Modality = "video" | "audio" | "image" | "text" | "code" | "voice" | "telemetry" | "gis";

export type PerceptionEvent<T = unknown> = {
  id: string;
  modality: Modality;
  timestamp: number;
  payload: T;
  metadata?: Record<string, string | number | boolean>;
};

export type StreamProcessor<T = unknown> = {
  start(source: AsyncIterable<T>): Promise<void>;
  stop(): Promise<void>;
  onEvent(listener: (event: PerceptionEvent<T>) => void): () => void;
};

export type EmbeddingProvider = {
  embed(input: { modality: Modality; value: unknown }): Promise<number[]>;
};

export type CrossModalRecord = {
  id: string;
  modality: Modality;
  value: unknown;
  embedding: number[];
  metadata?: Record<string, string | number | boolean>;
};

export type SensorEvent = {
  sensorId: string;
  kind: "iot" | "telemetry" | "gis";
  value: unknown;
  location?: { lat: number; lon: number; altitude?: number };
  timestamp: number;
};

const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export class AsyncStreamProcessor<T> implements StreamProcessor<T> {
  private active = false;
  private readonly listeners = new Set<(event: PerceptionEvent<T>) => void>();
  async start(source: AsyncIterable<T>): Promise<void> {
    this.active = true;
    for await (const payload of source) {
      if (!this.active) break;
      const event = { id: id("perception"), modality: "text" as Modality, timestamp: Date.now(), payload };
      this.listeners.forEach((listener) => listener(event));
    }
  }
  async stop(): Promise<void> { this.active = false; }
  onEvent(listener: (event: PerceptionEvent<T>) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export class CrossModalIndex {
  private readonly records = new Map<string, CrossModalRecord>();
  constructor(private readonly embeddings: EmbeddingProvider) {}
  async upsert(record: Omit<CrossModalRecord, "embedding">): Promise<void> {
    this.records.set(record.id, { ...record, embedding: await this.embeddings.embed({ modality: record.modality, value: record.value }) });
  }
  async search(query: { modality: Modality; value: unknown }, limit = 5): Promise<CrossModalRecord[]> {
    const vector = await this.embeddings.embed(query);
    return [...this.records.values()]
      .map((record) => ({ record, score: cosine(vector, record.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ record }) => record);
  }
  size(): number { return this.records.size; }
}

function cosine(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  let dot = 0; let aa = 0; let bb = 0;
  for (let i = 0; i < length; i++) { dot += a[i] * b[i]; aa += a[i] ** 2; bb += b[i] ** 2; }
  return aa && bb ? dot / (Math.sqrt(aa) * Math.sqrt(bb)) : 0;
}

export class SensorFusionBus {
  private readonly listeners = new Set<(event: SensorEvent) => void>();
  publish(event: SensorEvent): void { this.listeners.forEach((listener) => listener(event)); }
  onEvent(listener: (event: SensorEvent) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
}

export const deterministicEmbeddingProvider: EmbeddingProvider = {
  async embed({ value }) {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    const vector = [0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < text.length; i++) vector[i % vector.length] += text.charCodeAt(i) / 255;
    return vector;
  },
};
