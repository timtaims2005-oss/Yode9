/**
 * AI Security Guard v1.0
 * =======================
 * حماية الذكاء الاصطناعي من هجمات Prompt Injection ومحاولات الاستغلال
 * AI protection from prompt injection attacks and exploitation attempts
 */

import { z } from 'zod';
import * as crypto from 'crypto';

// ── Injection Patterns ────────────────────────────────────────────────────────

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+previous\s+instructions/i,
  /disregard\s+(all|previous)/i,
  /system\s*prompt/i,
  /you\s+are\s+now/i,
  /DAN\s*\(Do\s*Anything/i,
  /jailbreak/i,
  /ignore\s*your\s*training/i,
  /forget\s+(all|everything|previous)/i,
  /new\s+persona/i,
  /act\s+as\s+(if\s+)?you\s+(are|were)/i,
  /pretend\s+(to\s+be|you\s+are)/i,
  /roleplay\s+as/i,
  /simulate\s+(being|a)/i,
  /override\s+(system|instructions|prompt)/i,
  /bypass\s+(restrictions|filter|safety)/i,
];

// ── Dangerous Keywords ────────────────────────────────────────────────────────

const DANGEROUS_KEYWORDS: string[] = [
  'rm -rf',
  'drop table',
  'delete from',
  '<script>',
  'javascript:',
  'onerror=',
  'eval(',
  'exec(',
  'system(',
  '__import__',
  'subprocess',
  'os.system',
  'shell_exec',
  'passthru',
  '`rm ',
  '$(rm',
  'wget http',
  'curl http',
];

// ── Sensitive Data Patterns ───────────────────────────────────────────────────

const SENSITIVE_PATTERNS: RegExp[] = [
  /sk-[a-zA-Z0-9]{20,}/g,                                          // OpenAI API keys
  /\bAIza[0-9A-Za-z_-]{35}\b/g,                                    // Google API keys
  /ghp_[a-zA-Z0-9]{36}/g,                                          // GitHub tokens
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,                     // IP addresses
  /password\s*[:=]\s*["']?[^\s"']{8,}/gi,                          // Passwords in text
  /secret\s*[:=]\s*["']?[^\s"']{8,}/gi,                            // Secrets in text
];

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScanResult {
  isSafe: boolean;
  threats: string[];
  sanitized: string;
  riskScore: number;
}

export interface OutputValidation {
  isValid: boolean;
  sanitized: string;
  redactedCount: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

// ── In-memory Rate Limit Store ────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.windowStart > 60_000) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// ── AISecurityGuard ───────────────────────────────────────────────────────────

export class AISecurityGuard {
  private static readonly MAX_INPUT_LENGTH = 10_000;
  private static readonly DEFAULT_RATE_LIMIT = 60;  // requests per window
  private static readonly RATE_WINDOW_MS = 60_000;  // 1 minute window

  /**
   * فحص المدخلات للكشف عن محاولات الحقن والتهديدات
   * Scan input for injection attempts and threats
   */
  static scanInput(input: string): ScanResult {
    const threats: string[] = [];
    let sanitized = input;
    let riskScore = 0;

    // Check input length
    if (input.length > this.MAX_INPUT_LENGTH) {
      threats.push(`Input exceeds maximum length of ${this.MAX_INPUT_LENGTH} characters`);
      riskScore += 20;
      sanitized = sanitized.slice(0, this.MAX_INPUT_LENGTH);
    }

    // Check injection patterns
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(input)) {
        threats.push(`Prompt injection pattern detected: ${pattern.source}`);
        riskScore += 30;
      }
    }

    // Check dangerous keywords
    for (const keyword of DANGEROUS_KEYWORDS) {
      if (input.toLowerCase().includes(keyword.toLowerCase())) {
        threats.push(`Dangerous keyword detected: ${keyword}`);
        riskScore += 25;
        sanitized = sanitized.replace(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[BLOCKED]');
      }
    }

    // Check for base64-encoded content (potential obfuscation)
    const base64Pattern = /[A-Za-z0-9+/]{50,}={0,2}/g;
    const base64Matches = input.match(base64Pattern) || [];
    if (base64Matches.length > 0) {
      threats.push('Potential base64-encoded content detected (possible obfuscation)');
      riskScore += 10;
    }

    // Check for null bytes
    if (input.includes('\0')) {
      threats.push('Null byte detected in input');
      riskScore += 15;
      sanitized = sanitized.replace(/\0/g, '');
    }

    return {
      isSafe: threats.length === 0,
      threats,
      sanitized,
      riskScore: Math.min(riskScore, 100),
    };
  }

  /**
   * التحقق من صحة استجابة النموذج وإزالة البيانات الحساسة
   * Validate model output and remove sensitive data
   */
  static validateOutput(output: string): OutputValidation {
    let sanitized = output;
    let redactedCount = 0;

    for (const pattern of SENSITIVE_PATTERNS) {
      const matches = sanitized.match(new RegExp(pattern.source, pattern.flags)) || [];
      redactedCount += matches.length;

      if (pattern.source.includes('IP')) {
        sanitized = sanitized.replace(new RegExp(pattern.source, pattern.flags), '[IP_REDACTED]');
      } else if (pattern.source.includes('sk-')) {
        sanitized = sanitized.replace(new RegExp(pattern.source, pattern.flags), '[API_KEY_REDACTED]');
      } else {
        sanitized = sanitized.replace(new RegExp(pattern.source, pattern.flags), '[REDACTED]');
      }
    }

    return {
      isValid: true,
      sanitized,
      redactedCount,
    };
  }

  /**
   * فحص محدودية معدل الطلبات
   * Rate limiting check using sliding window algorithm
   */
  static checkRateLimit(
    userId: string,
    limit: number = this.DEFAULT_RATE_LIMIT,
    windowMs: number = this.RATE_WINDOW_MS
  ): RateLimitResult {
    const now = Date.now();
    const key = `ai:rate:${userId}`;
    const entry = rateLimitStore.get(key);

    if (!entry || now - entry.windowStart > windowMs) {
      // New window
      rateLimitStore.set(key, { count: 1, windowStart: now });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: now + windowMs,
      };
    }

    entry.count++;
    const allowed = entry.count <= limit;
    const remaining = Math.max(0, limit - entry.count);
    const resetAt = entry.windowStart + windowMs;

    return { allowed, remaining, resetAt };
  }

  /**
   * توليد hash للرسالة لأغراض التخزين المؤقت
   * Generate a deterministic hash for caching purposes
   */
  static hashMessage(message: string, model: string): string {
    return crypto
      .createHash('sha256')
      .update(`${model}:${message}`)
      .digest('hex');
  }

  /**
   * تقدير عدد التوكنز في النص (تقريبي)
   * Estimate token count for a string (approximate)
   */
  static estimateTokens(text: string): number {
    // Rough approximation: ~4 characters per token for English, ~2 for Arabic
    const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
    const otherChars = text.length - arabicChars;
    return Math.ceil(arabicChars / 2 + otherChars / 4);
  }
}

// ── Zod Schema for AI Requests ────────────────────────────────────────────────

export const AIRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(10_000, 'Message too long'),
  model: z.string().min(1, 'Model is required'),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().positive().max(32_768).default(2048),
  stream: z.boolean().default(true),
  systemPrompt: z.string().max(5_000).optional(),
  conversationId: z.string().uuid().optional(),
  provider: z.enum([
    'openai', 'anthropic', 'groq', 'together', 'fireworks',
    'google', 'mistral', 'ollama', 'vllm', 'custom',
  ]).optional(),
});

export type AIRequest = z.infer<typeof AIRequestSchema>;

// ── Middleware helper ─────────────────────────────────────────────────────────

/**
 * Express middleware to validate and sanitize AI requests
 */
export function aiSecurityMiddleware(
  req: { body: unknown; userId?: string },
  res: { status: (code: number) => { json: (body: unknown) => void } },
  next: () => void
): void {
  const userId = req.userId || 'anonymous';

  // Rate limit check
  const rateLimit = AISecurityGuard.checkRateLimit(userId);
  if (!rateLimit.allowed) {
    res.status(429).json({
      error: 'Rate limit exceeded',
      remaining: rateLimit.remaining,
      resetAt: rateLimit.resetAt,
    });
    return;
  }

  // Parse and validate request body
  const parsed = AIRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: 'Invalid request',
      details: parsed.error.flatten(),
    });
    return;
  }

  // Security scan on message
  const scan = AISecurityGuard.scanInput(parsed.data.message);
  if (!scan.isSafe && scan.riskScore >= 50) {
    res.status(400).json({
      error: 'Request blocked by security filter',
      threats: scan.threats,
      riskScore: scan.riskScore,
    });
    return;
  }

  // Replace message with sanitized version
  (req.body as Record<string, unknown>)['message'] = scan.sanitized;

  next();
}
