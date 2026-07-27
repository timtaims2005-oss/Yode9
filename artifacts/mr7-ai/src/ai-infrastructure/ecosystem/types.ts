import type { JsonValue, ModelRequest, ModelResponse } from "../types";

export type EcosystemModality = "text" | "audio" | "video" | "cad" | "spatial" | "iot" | "document";
export type SensoryPacket = {
  id: string;
  modality: EcosystemModality;
  payload: JsonValue;
  timestamp: number;
  source?: string;
  metadata?: Record<string, JsonValue>;
};
export type ParsedDocument = {
  id: string;
  format: "pdf" | "spreadsheet" | "diagram" | "text" | "unknown";
  text: string;
  fields: Record<string, string | number | boolean>;
  confidence: number;
};
export type ToolCall = { id: string; name: string; input: JsonValue; sensitive?: boolean };
export type ToolResult = { callId: string; ok: boolean; output: JsonValue; error?: string };
export type CognitionPlan = { goal: string; steps: string[]; risk: number; rationale: string };
export type EcosystemTraceEvent = { stage: string; status: "started" | "completed" | "blocked" | "failed"; timestamp: number; data?: JsonValue };
export type EcosystemModelProvider = { id: string; complete(request: ModelRequest): Promise<ModelResponse>; supports?(model?: string): boolean };