import type { Request, Response, NextFunction } from "express";

const MAX_STRING_LENGTH = 512_000;

function sanitizeValue(val: unknown, depth = 0): unknown {
  if (depth > 10) return val;
  if (typeof val === "string") {
    return val
      .replace(/\0/g, "")
      .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, "")
      .slice(0, MAX_STRING_LENGTH);
  }
  if (Array.isArray(val)) {
    return val.map((v) => sanitizeValue(v, depth + 1));
  }
  if (val !== null && typeof val === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      out[k] = sanitizeValue(v, depth + 1);
    }
    return out;
  }
  return val;
}

export function sanitizeInputs(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body) as Record<string, unknown>;
  }
  if (req.query && typeof req.query === "object") {
    for (const [k, v] of Object.entries(req.query)) {
      if (typeof v === "string") {
        (req.query as Record<string, unknown>)[k] = v.replace(/\0/g, "").slice(0, 4096);
      }
    }
  }
  next();
}
