import type { JsonSchema, ModelRequest } from "../types";

export type PromptTemplate = {
  id: string;
  version: string;
  system: string;
  schema?: JsonSchema;
};

const templates = new Map<string, PromptTemplate>();

export function registerPrompt(template: PromptTemplate): void { templates.set(`${template.id}@${template.version}`, template); }
export function getPrompt(id: string, version: string): PromptTemplate | undefined { return templates.get(`${id}@${version}`); }
export function renderPrompt(template: PromptTemplate, variables: Record<string, string | number | boolean>): string {
  return template.system.replace(/\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g, (_, key: string) => String(variables[key] ?? ""));
}
export function buildPromptRequest(template: PromptTemplate, request: ModelRequest, variables: Record<string, string | number | boolean>): ModelRequest {
  return { ...request, messages: [{ role: "system", content: renderPrompt(template, variables) }, ...request.messages], responseSchema: template.schema ?? request.responseSchema };
}
