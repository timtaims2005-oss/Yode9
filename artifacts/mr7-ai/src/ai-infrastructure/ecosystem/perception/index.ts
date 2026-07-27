import type { JsonValue } from "../../types";
import type { EcosystemModality, ParsedDocument, SensoryPacket } from "../types";

export class MultimodalStreamIngestion {
  private readonly packets: SensoryPacket[] = [];
  ingest(packet: SensoryPacket): SensoryPacket {
    const normalized = { ...packet, timestamp: packet.timestamp || Date.now() };
    this.packets.push(normalized);
    return normalized;
  }
  ingestBatch(packets: SensoryPacket[]): SensoryPacket[] { return packets.map((packet) => this.ingest(packet)); }
  recent(limit = 50): SensoryPacket[] { return this.packets.slice(-limit); }
}

export class RealTimeSensoryTracker {
  private readonly latest = new Map<string, SensoryPacket>();
  track(packet: SensoryPacket): void { this.latest.set(`${packet.modality}:${packet.source ?? "default"}`, packet); }
  snapshot(): Record<string, SensoryPacket> { return Object.fromEntries(this.latest.entries()); }
}

export type SensorConnector = { id: string; read(): Promise<SensoryPacket[]> };
export class SpatialAndIoTSensorHub {
  private readonly connectors = new Map<string, SensorConnector>();
  register(connector: SensorConnector): void { this.connectors.set(connector.id, connector); }
  async poll(): Promise<SensoryPacket[]> {
    const batches = await Promise.all([...this.connectors.values()].map((connector) => connector.read()));
    return batches.flat();
  }
}

export class DocumentParserOCR {
  parse(input: { id: string; format?: ParsedDocument["format"]; content: string | JsonValue }): ParsedDocument {
    const text = typeof input.content === "string" ? input.content : JSON.stringify(input.content);
    const format = input.format ?? (text.startsWith("%PDF") ? "pdf" : "unknown");
    const fields: Record<string, string | number | boolean> = {};
    text.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^\s*([^:=]{1,80})\s*[:=]\s*(.+)\s*$/);
      if (match) fields[match[1].trim()] = match[2].trim();
    });
    return { id: input.id, format, text, fields, confidence: text ? 0.9 : 0 };
  }
}

export const modality = (value: string): EcosystemModality => (
  ["text", "audio", "video", "cad", "spatial", "iot", "document"].includes(value) ? value as EcosystemModality : "text"
);