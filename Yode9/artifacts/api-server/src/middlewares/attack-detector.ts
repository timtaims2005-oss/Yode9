/**
 * Attack Detector Middleware
 * ───────────────────────────
 * Detects and blocks common web attack patterns:
 *  - SQL Injection (SQLi)
 *  - Cross-Site Scripting (XSS)
 *  - Path Traversal (PT)
 *  - Server-Side Request Forgery (SSRF)
 *  - Command Injection (CMD)
 *  - NoSQL Injection
 *  - LDAP Injection
 *  - XXE (XML External Entity)
 *
 * On high/critical detections → records to security_events + sends real-time Slack/webhook alert.
 */

import type { Request, Response, NextFunction } from "express";
import { securityMonitor } from "../lib/security-monitor.js";

interface AttackPattern {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  patterns: RegExp[];
}

const ATTACK_PATTERNS: AttackPattern[] = [
  {
    type: "sqli",
    severity: "critical",
    patterns: [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE|REPLACE)\b.*\b(FROM|INTO|TABLE|DATABASE|WHERE|SET)\b)/i,
      /('|\")(\s*)(OR|AND)(\s*)('|\"|\d|true|false|null)/i,
      /--(\s|$)/,
      /;\s*(DROP|DELETE|UPDATE|INSERT|SELECT)\s/i,
      /\b(SLEEP|BENCHMARK|WAITFOR|DELAY|PG_SLEEP)\s*\(/i,
      /INFORMATION_SCHEMA|SYS\.(TABLES|COLUMNS)|SYSOBJECTS/i,
      /xp_cmdshell|sp_executesql|OPENROWSET|OPENDATASOURCE/i,
      /LOAD_FILE|INTO\s+(OUTFILE|DUMPFILE)/i,
    ],
  },
  {
    type: "xss",
    severity: "high",
    patterns: [
      /<script[\s>]/i,
      /javascript\s*:/i,
      /on(load|error|click|mouse|key|focus|blur|change|submit|resize|scroll|unload)\s*=/i,
      /<(iframe|object|embed|link|meta|base|form|input|img|svg|math)[^>]*>/i,
      /expression\s*\(/i,
      /vbscript\s*:/i,
      /(document|window)\.(cookie|location|write|exec|eval)/i,
      /&#(x[0-9a-f]+|[0-9]+);.*<script/i,
      /src\s*=\s*['"]?\s*javascript/i,
    ],
  },
  {
    type: "path_traversal",
    severity: "high",
    patterns: [
      /\.\.[\/\\]/,
      /%2e%2e[%2f%5c]/i,
      /\.\.%[0-9a-f]{2}/i,
      /\/(etc\/passwd|etc\/shadow|proc\/self|windows\/system32)/i,
      /\.\.[\/\\](windows|system32|etc|var|usr|home|root)/i,
    ],
  },
  {
    type: "ssrf",
    severity: "critical",
    patterns: [
      /https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|::1|169\.254\.169\.254)/i,
      /https?:\/\/(10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|192\.168\.\d+\.\d+)/,
      /file:\/\//i,
      /gopher:\/\//i,
      /dict:\/\//i,
      /ftp:\/\/(localhost|127\.0\.0\.1)/i,
      /metadata\.google\.internal|metadata\.aws/i,
    ],
  },
  {
    type: "cmd_injection",
    severity: "critical",
    patterns: [
      /[;&|`$]\s*(ls|cat|pwd|whoami|id|uname|hostname|ifconfig|netstat|ps|kill|wget|curl|bash|sh|python|perl|ruby|php|nc|ncat)\b/i,
      /\$\([^)]*\)/,
      /`[^`]*`/,
      /\|\s*(cat|ls|wget|curl|bash|sh|nc)\b/i,
      /(;|\||&&|`|\$\()\s*(rm|mv|cp|chmod|chown|mkdir|touch)\s/i,
    ],
  },
  {
    type: "nosql_injection",
    severity: "high",
    patterns: [
      /\$\s*where\s*:/i,
      /\$\s*(gt|lt|gte|lte|ne|in|nin|or|and|not|nor|exists|type|mod|regex|text|search)\s*:/i,
      /\{\s*\$where\s*:/,
      /;\s*return\s+(true|false|1|0)/i,
      /function\s*\(\s*\)\s*\{.*return/i,
    ],
  },
  {
    type: "ldap_injection",
    severity: "medium",
    patterns: [
      /[)(|&*!\\]/,
      /\*\s*\)/,
      /\|\s*\(.*=/,
    ],
  },
  {
    type: "xxe",
    severity: "high",
    patterns: [
      /<!DOCTYPE[^>]*\[/i,
      /<!ENTITY\s+\w+\s+(SYSTEM|PUBLIC)/i,
      /%[a-zA-Z][a-zA-Z0-9_-]*;/,
    ],
  },
];

// Fields that should be skipped from attack detection (contain user content like chat messages)
const SAFE_FIELDS = new Set([
  "message", "content", "text", "body", "description", "comment",
  "query", "prompt", "code", "input", "data", "messages",
]);

// Routes that are completely skipped (AI chat routes + public system endpoints)
const SKIP_ROUTES = [
  "/api/chat",
  "/api/council",
  "/api/godmode",
  "/api/debate",
  "/api/agent",
  "/api/autotune",
  "/api/claude-code",
  "/api/local-proxy",
  "/api/tools",
  "/api/health",
  "/api/healthz",
  "/api/csrf-token",
];

function getIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    || req.socket.remoteAddress
    || "unknown";
}

function scanValue(value: string): Array<{ type: string; severity: string; pattern: string }> {
  const hits: Array<{ type: string; severity: string; pattern: string }> = [];
  for (const attack of ATTACK_PATTERNS) {
    for (const pattern of attack.patterns) {
      if (pattern.test(value)) {
        hits.push({ type: attack.type, severity: attack.severity, pattern: pattern.toString() });
        break; // one hit per attack type
      }
    }
  }
  return hits;
}

function scanObject(
  obj: unknown,
  path = "",
  depth = 0,
): Array<{ type: string; severity: string; field: string; pattern: string }> {
  if (depth > 8) return [];
  if (typeof obj === "string") {
    // Skip safe content fields
    const fieldName = path.split(".").pop() ?? "";
    if (SAFE_FIELDS.has(fieldName)) return [];
    return scanValue(obj).map((h) => ({ ...h, field: path }));
  }
  if (Array.isArray(obj)) {
    return obj.flatMap((v, i) => scanObject(v, `${path}[${i}]`, depth + 1));
  }
  if (obj !== null && typeof obj === "object") {
    return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
      scanObject(v, path ? `${path}.${k}` : k, depth + 1),
    );
  }
  return [];
}

export function attackDetector(req: Request, res: Response, next: NextFunction): void {
  // Skip AI/chat routes — they contain intentional user content
  if (SKIP_ROUTES.some((r) => req.path.startsWith(r))) {
    next();
    return;
  }

  const hits: Array<{ type: string; severity: string; field: string; pattern: string }> = [];

  // Scan query params
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === "string") {
      scanValue(v).forEach((h) => hits.push({ ...h, field: `query.${k}` }));
    }
  }

  // Scan body
  if (req.body && typeof req.body === "object") {
    hits.push(...scanObject(req.body));
  }

  // Scan headers (only select dangerous ones)
  const dangerousHeaders = ["x-forwarded-host", "x-original-url", "x-rewrite-url", "referer"];
  for (const h of dangerousHeaders) {
    const val = req.headers[h];
    if (typeof val === "string") {
      scanValue(val).forEach((hit) => hits.push({ ...hit, field: `header.${h}` }));
    }
  }

  if (hits.length === 0) {
    next();
    return;
  }

  // Determine overall severity
  const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };
  const maxSev = hits.reduce((max, h) => {
    return (severityRank[h.severity as keyof typeof severityRank] ?? 0) >
      (severityRank[max as keyof typeof severityRank] ?? 0)
      ? (h.severity as "low" | "medium" | "high" | "critical")
      : max;
  }, "low" as "low" | "medium" | "high" | "critical");

  // Record the attack asynchronously (non-blocking)
  const ip = getIp(req);
  securityMonitor.recordAttack({
    userId: (req as Request & { authUser?: { id: string } }).authUser?.id,
    ip,
    userAgent: req.headers["user-agent"],
    path: req.path,
    method: req.method,
    attacks: hits,
    severity: (maxSev === "low" ? "medium" : maxSev) as "medium" | "high" | "critical",
  }).catch(() => {});

  // Block only high/critical attacks
  if (maxSev === "high" || maxSev === "critical") {
    res.status(400).json({
      error: "Request blocked: potentially malicious input detected.",
      code: "ATTACK_DETECTED",
    });
    return;
  }

  // Medium/low — log but allow through (don't break legitimate use)
  next();
}
