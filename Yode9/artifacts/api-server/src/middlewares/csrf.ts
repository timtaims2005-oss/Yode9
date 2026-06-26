import type { Request, Response, NextFunction } from "express";
import crypto from "crypto";

declare module "express-session" {
  interface SessionData {
    csrfToken?: string;
  }
}

function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function ensureCsrfToken(req: Request, _res: Response, next: NextFunction): void {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }
  next();
}

export function verifyCsrfToken(req: Request, res: Response, next: NextFunction): void {
  const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const sessionToken = req.session?.csrfToken;
  const headerToken =
    (req.headers["x-csrf-token"] as string | undefined) ||
    (req.body?._csrf as string | undefined);

  if (!sessionToken || !headerToken) {
    res.status(403).json({ error: "CSRF token missing." });
    return;
  }

  try {
    const sessionBuf = Buffer.from(sessionToken, "hex");
    const headerBuf = Buffer.from(headerToken, "hex");
    if (sessionBuf.length !== headerBuf.length || !crypto.timingSafeEqual(sessionBuf, headerBuf)) {
      res.status(403).json({ error: "CSRF token invalid." });
      return;
    }
  } catch {
    res.status(403).json({ error: "CSRF token malformed." });
    return;
  }

  next();
}

export function getCsrfToken(req: Request, res: Response): void {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateToken();
  }
  res.json({ csrfToken: req.session.csrfToken });
}
