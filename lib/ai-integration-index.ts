/**
 * AI Integration Index for Yode9 / MR7.AI
 * ==========================================
 * نقاط دخول التكامل مع أدوات الذكاء الاصطناعي
 */

export { AI_PROVIDERS, ALL_MODELS, getProviderConfig, isProviderAvailable, getAvailableProviders } from './ai-providers';
export type { AIProvider, AIModel } from './ai-providers';

export { AISecurityGuard, validateAIRequest } from './ai-security-guard';
export type { ScanResult, RateLimitResult, AIRequestOptions } from './ai-security-guard';

export { AIStreamingOptimizer, registerStreamSession, updateStreamSession, endStreamSession, getActiveSessionCount } from './ai-streaming';
export type { StreamChunk, StreamOptions, StreamSession } from './ai-streaming';

export { AICacheManager, globalAICache } from './ai-cache';
export type { CacheEntry, CacheStats } from './ai-cache';

export const AI_INTEGRATION_VERSION = '1.0.0';

export const AI_INTEGRATION_INFO = {
  version: AI_INTEGRATION_VERSION,
  supportedProviders: ['openai', 'anthropic', 'groq', 'together', 'fireworks', 'vllm', 'ollama'],
  features: [
    'multi-provider-support',
    'streaming-optimization',
    'prompt-injection-detection',
    'response-caching',
    'rate-limiting',
    'output-sanitization',
  ],
  securityLevel: 'enterprise',
};
