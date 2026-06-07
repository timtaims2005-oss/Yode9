import type { Request, Response, NextFunction } from "express";

const INTERNAL_KEY = process.env.INTERNAL_API_KEY;

export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  if (!INTERNAL_KEY) {
    next();
    return;
  }
  const header = req.headers["x-internal-key"];
  if (!header || header !== INTERNAL_KEY) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
}
