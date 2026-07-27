import type { JsonSchema, JsonValue } from "../types";

export type SchemaValidation = { valid: boolean; errors: string[]; value?: JsonValue };

function validateNode(value: JsonValue, schema: JsonSchema, path: string, errors: string[]): void {
  if (schema.enum && !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) errors.push(`${path} is not an allowed value`);
  if (schema.type === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) { errors.push(`${path} must be an object`); return; }
    const object = value as Record<string, JsonValue>;
    (schema.required ?? []).forEach((key) => { if (!(key in object)) errors.push(`${path}.${key} is required`); });
    Object.entries(object).forEach(([key, child]) => {
      const childSchema = schema.properties?.[key];
      if (!childSchema && schema.additionalProperties === false) errors.push(`${path}.${key} is not allowed`);
      if (childSchema) validateNode(child, childSchema, `${path}.${key}`, errors);
    });
  } else if (schema.type === "array") {
    if (!Array.isArray(value)) { errors.push(`${path} must be an array`); return; }
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(`${path} has too few items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path} has too many items`);
    value.forEach((item, index) => schema.items && validateNode(item, schema.items, `${path}[${index}]`, errors));
  } else if (schema.type === "string" && typeof value !== "string") errors.push(`${path} must be a string`);
  else if (schema.type === "number" && (typeof value !== "number" || Number.isNaN(value))) errors.push(`${path} must be a number`);
  else if (schema.type === "integer" && (typeof value !== "number" || !Number.isInteger(value))) errors.push(`${path} must be an integer`);
  else if (schema.type === "boolean" && typeof value !== "boolean") errors.push(`${path} must be a boolean`);
  else if (schema.type === "null" && value !== null) errors.push(`${path} must be null`);
}

export function createSchemaValidator(schema: JsonSchema): { validate(value: JsonValue): SchemaValidation } {
  return { validate(value) { const errors: string[] = []; validateNode(value, schema, "$", errors); return { valid: errors.length === 0, errors, value }; } };
}

export function parseAndValidate<T extends JsonValue>(text: string, schema: JsonSchema): SchemaValidation & { value?: T } {
  try {
    const value = JSON.parse(text) as T;
    return { ...createSchemaValidator(schema).validate(value), value };
  } catch {
    return { valid: false, errors: ["Output is not valid JSON."] };
  }
}

export function repairJson(text: string): string | undefined {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1];
  const candidate = (fenced ?? text).trim();
  try { JSON.parse(candidate); return candidate; } catch { /* repair below */ }
  const objectStart = candidate.indexOf("{");
  const objectEnd = candidate.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    const sliced = candidate.slice(objectStart, objectEnd + 1).replace(/,\s*([}\]])/g, "$1");
    try { JSON.parse(sliced); return sliced; } catch { return undefined; }
  }
  return undefined;
}
