/**
 * AI Security Guard for Yode9 / MR7.AI
 * =======================================
 * حماية الذكاء الاصطناعي من الهجمات وحقن الأوامر
 */

import crypto from 'crypto';

export interface ScanResult {
  isSafe: boolean;
  threats: string[];
  sanitized: string;
  riskScore: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

export class AISecurityGuard {
  private static injectionPatterns: RegExp[] = [
    /ignore\s+previous\s+instructions/i,
    /disregard\s+(all|previous)/i,
    /system\s*prompt/i,
    /you\s+are\s+now/i,
    /DAN\s*\(Do\s*Anything/i,
    /jailbreak/i,
    /ignore\s*your\s*training/i,
    /forget\s+everything/i,
    /new\s+persona/i,
    /act\s+as\s+if/i,
    /pretend\s+you\s+are/i,
    /roleplay\s+as/i,
  ];

  private static dangerousKeywords: string[] = [
    'rm -rf', 'drop table', 'delete from users',
    '<script>', 'javascript:', 'onerror=',
    'eval(', 'exec(', 'system(',
    '__import__', 'subprocess', 'os.system',
    'net user', 'net localgroup',
  ];

  private static sensitiveDataPatterns: RegExp[] = [
    /sk-[a-zA-Z0-9]{20,}/g,
    /Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi,
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b/g,
  ];

  static scanInput(input: string): ScanResult {
    const threats: string[] = [];
    let sanitized = input;
    let riskScore = 0;

    for (const pattern of this.injectionPatterns) {
      if (pattern.test(input)) {
        threats.push(`Prompt injection pattern: ${pattern.source}`);
        riskScore += 30;
      }
    }

    for (const keyword of this.dangerousKeywords) {
      if (input.toLowerCase().includes(keyword.toLowerCase())) {
        threats.push(`Dangerous keyword detected: ${keyword}`);
        sanitized = sanitized.replace(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[BLOCKED]');
        riskScore += 25;
      }
    }

    if (input.length > 10000) {
      threats.push('Input exceeds maximum length (10000 chars)');
      riskScore += 10;
    }

    const encodedPatterns = [/%3Cscript/i, /&#60;script/i, /\u003cscript/i];
    for (const pattern of encodedPatterns) {
      if (pattern.test(input)) {
        threats.push('Encoded XSS attempt detected');
        riskScore += 40;
      }
    }

    return {
      isSafe: threats.length === 0,
      threats,
      sanitized,
      riskScore: Math.min(riskScore, 100),
    };
  }

  static validateOutput(output: string): { isValid: boolean; sanitized: string } {
    let sanitized = output;

    const replacements: [RegExp, string][] = [
      [/sk-[a-zA-Z0-9]{20,}/g, '[API_KEY_REDACTED]'],
      [/Bearer\s+[a-zA-Z0-9\-._~+/]+=*/gi, 'Bearer [TOKEN_REDACTED]'],
      [/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[IP_REDACTED]'],
      [/password\s*[:=]\s*\S+/gi, 'password: [REDACTED]'],
      [/secret\s*[:=]\s*\S+/gi, 'secret: [REDACTED]'],
    ];

    for (const [pattern, replacement] of replacements) {
      sanitized = sanitized.replace(pattern, replacement);
    }

    return { isValid: true, sanitized };
  }

  static generateRequestId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  static hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  static sanitizeForLog(data: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'apiKey', 'api_key'];
    const result: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(data)) {
      if (sensitiveKeys.some(sk => k.toLowerCase().includes(sk))) {
        result[k] = '[REDACTED]';
      } else {
        result[k] = v;
      }
    }

    return result;
  }
}

export interface AIRequestOptions {
  message: string;
  model: string;
  provider: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  userId?: string;
}

export function validateAIRequest(options: AIRequestOptions): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!options.message || options.message.trim().length === 0) {
    errors.push('Message is required');
  }

  if (options.message && options.message.length > 10000) {
    errors.push('Message exceeds maximum length of 10000 characters');
  }

  if (!options.model) {
    errors.push('Model is required');
  }

  if (!options.provider) {
    errors.push('Provider is required');
  }

  if (options.temperature !== undefined && (options.temperature < 0 || options.temperature > 2)) {
    errors.push('Temperature must be between 0 and 2');
  }

  if (options.maxTokens !== undefined && (options.maxTokens < 1 || options.maxTokens > 8192)) {
    errors.push('maxTokens must be between 1 and 8192');
  }

  return { valid: errors.length === 0, errors };
}
