import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { logger } from '../../lib/logger.js';

// ── Types ────────────────────────────────────────────────────────────────────
export type AIProvider = 'cloudflare' | 'openai' | 'anthropic' | 'openrouter' | 'groq';
export type Capability = 'text' | 'vision' | 'code' | 'json' | 'audio' | 'image-gen';
export type Priority = 'low' | 'normal' | 'high' | 'critical';
export type OutputFormat = 'text' | 'json' | 'code' | 'markdown';

export interface ModelConfig {
  id: string;
  provider: AIProvider;
  endpoint: string;
  apiKey: string;
  contextWindow: number;
  capabilities: Capability[];
  costPerMillionTokens: number;
  avgLatencyMs: number;
  maxOutputTokens?: number;
  supportsStreaming?: boolean;
}

export interface InferenceRequest {
  prompt: string;
  systemPrompt?: string;
  image?: string; // base64
  expectedOutput: OutputFormat;
  maxTokens?: number;
  temperature?: number;
  priority: Priority;
  userId?: string;
  conversationId?: string;
  modelPreference?: string;
}

export interface InferenceResult {
  content: string;
  modelId: string;
  tokensUsed: number;
  estimatedCostUsd: number;
  latencyMs: number;
  cached: boolean;
  provider: AIProvider;
}

// ── Circuit Breaker ──────────────────────────────────────────────────────────
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number,
    private readonly timeoutMs: number,
  ) {}

  canExecute(): boolean {
    if (this.state === 'closed') return true;
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeoutMs) {
        this.state = 'half-open';
        return true;
      }
      return false;
    }
    return true; // half-open: allow one test request
  }

  recordSuccess(): void {
    this.failures = Math.max(0, this.failures - 1);
    if (this.state === 'half-open') this.state = 'closed';
  }

  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) this.state = 'open';
  }

  getHealth(): number {
    return Math.max(0, 1 - this.failures / this.threshold);
  }

  getState(): string { return this.state; }
}

// ── LRU Cache for inference results ──────────────────────────────────────────
class InferenceCache {
  private cache = new Map<string, { result: InferenceResult; ts: number }>();
  private readonly ttlMs: number;
  private readonly maxSize: number;

  constructor(ttlMs = 5 * 60_000, maxSize = 500) {
    this.ttlMs = ttlMs;
    this.maxSize = maxSize;
  }

  get(key: string): InferenceResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.result;
  }

  set(key: string, result: InferenceResult): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(key, { result, ts: Date.now() });
  }

  get size(): number { return this.cache.size; }
}

// ── AI Orchestrator ───────────────────────────────────────────────────────────
export class AIOrchestrator extends EventEmitter {
  private readonly models = new Map<string, ModelConfig>();
  private readonly cache = new InferenceCache();
  private readonly breakers = new Map<string, CircuitBreaker>();
  private requestCount = 0;
  private totalTokensUsed = 0;

  constructor() {
    super();
    this.initializeModels();
  }

  private initializeModels(): void {
    // Cloudflare Workers AI
    if (process.env['CLOUDFLARE_API_TOKEN'] && process.env['CLOUDFLARE_ACCOUNT_ID']) {
      this.registerModel({
        id: 'cf-llama-3.2-vision',
        provider: 'cloudflare',
        endpoint: '@cf/meta/llama-3.2-11b-vision-instruct',
        apiKey: process.env['CLOUDFLARE_API_TOKEN'],
        contextWindow: 8192,
        capabilities: ['text', 'vision', 'code'],
        costPerMillionTokens: 0.2,
        avgLatencyMs: 1500,
        supportsStreaming: true,
      });
      this.registerModel({
        id: 'cf-flux-schnell',
        provider: 'cloudflare',
        endpoint: '@cf/black-forest-labs/flux-1-schnell',
        apiKey: process.env['CLOUDFLARE_API_TOKEN'],
        contextWindow: 0,
        capabilities: ['image-gen'],
        costPerMillionTokens: 0.1,
        avgLatencyMs: 2000,
      });
    }

    // OpenAI
    if (process.env['OPENAI_API_KEY']) {
      this.registerModel({
        id: 'gpt-4o',
        provider: 'openai',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        apiKey: process.env['OPENAI_API_KEY'],
        contextWindow: 128_000,
        capabilities: ['text', 'vision', 'code', 'json'],
        costPerMillionTokens: 5,
        avgLatencyMs: 800,
        supportsStreaming: true,
      });
      this.registerModel({
        id: 'gpt-4o-mini',
        provider: 'openai',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        apiKey: process.env['OPENAI_API_KEY'],
        contextWindow: 128_000,
        capabilities: ['text', 'code', 'json'],
        costPerMillionTokens: 0.15,
        avgLatencyMs: 400,
        supportsStreaming: true,
      });
    }

    // Anthropic
    if (process.env['ANTHROPIC_API_KEY']) {
      this.registerModel({
        id: 'claude-3-5-sonnet',
        provider: 'anthropic',
        endpoint: 'https://api.anthropic.com/v1/messages',
        apiKey: process.env['ANTHROPIC_API_KEY'],
        contextWindow: 200_000,
        capabilities: ['text', 'vision', 'code', 'json'],
        costPerMillionTokens: 3,
        avgLatencyMs: 1000,
        supportsStreaming: true,
      });
    }
  }

  registerModel(config: ModelConfig): void {
    this.models.set(config.id, config);
    this.breakers.set(config.id, new CircuitBreaker(5, 60_000));
    logger.info({ modelId: config.id, provider: config.provider }, '[AIOrchestrator] model registered');
  }

  async generate(request: InferenceRequest): Promise<InferenceResult> {
    this.requestCount++;
    const cacheKey = this.hashRequest(request);

    // Cache check (skip for high-priority or unique requests)
    if (request.priority !== 'critical') {
      const cached = this.cache.get(cacheKey);
      if (cached) return { ...cached, cached: true };
    }

    // Select optimal model
    const model = this.selectOptimalModel(request);
    if (!model) {
      throw new Error('No suitable AI model available — all circuit breakers open or no matching capabilities');
    }

    const breaker = this.breakers.get(model.id)!;
    if (!breaker.canExecute()) {
      // Fallback to next best model
      const fallback = this.selectFallbackModel(request, model.id);
      if (!fallback) throw new Error(`Circuit breaker open for ${model.id} and no fallback available`);
      return this.executeWithModel(fallback, request, cacheKey);
    }

    return this.executeWithModel(model, request, cacheKey);
  }

  private async executeWithModel(
    model: ModelConfig,
    request: InferenceRequest,
    cacheKey: string,
  ): Promise<InferenceResult> {
    const breaker = this.breakers.get(model.id)!;
    const startTime = Date.now();

    try {
      const content = await this.callProvider(model, request);
      breaker.recordSuccess();

      const tokensUsed = this.estimateTokens(request.prompt, content);
      this.totalTokensUsed += tokensUsed;

      const result: InferenceResult = {
        content,
        modelId: model.id,
        tokensUsed,
        estimatedCostUsd: (tokensUsed / 1_000_000) * model.costPerMillionTokens,
        latencyMs: Date.now() - startTime,
        cached: false,
        provider: model.provider,
      };

      this.cache.set(cacheKey, result);
      this.emit('inference:completed', result);
      return result;
    } catch (err) {
      breaker.recordFailure();
      this.emit('inference:failed', { modelId: model.id, err });
      throw err;
    }
  }

  private selectOptimalModel(request: InferenceRequest): ModelConfig | null {
    if (request.modelPreference && this.models.has(request.modelPreference)) {
      const model = this.models.get(request.modelPreference)!;
      const breaker = this.breakers.get(model.id)!;
      if (breaker.canExecute()) return model;
    }

    const requiredCap: Capability = request.image ? 'vision' : 'text';
    const candidates = Array.from(this.models.values()).filter(
      (m) => m.capabilities.includes(requiredCap),
    );

    return candidates.sort((a, b) => {
      const aHealth = this.breakers.get(a.id)!.getHealth();
      const bHealth = this.breakers.get(b.id)!.getHealth();
      if (Math.abs(aHealth - bHealth) > 0.2) return bHealth - aHealth;

      // Prefer by priority
      if (request.priority === 'high' || request.priority === 'critical') {
        return a.avgLatencyMs - b.avgLatencyMs; // Fastest
      }
      return a.costPerMillionTokens - b.costPerMillionTokens; // Cheapest
    })[0] ?? null;
  }

  private selectFallbackModel(request: InferenceRequest, excludeId: string): ModelConfig | null {
    const requiredCap: Capability = request.image ? 'vision' : 'text';
    return Array.from(this.models.values())
      .filter((m) => m.id !== excludeId && m.capabilities.includes(requiredCap))
      .sort((a, b) => this.breakers.get(b.id)!.getHealth() - this.breakers.get(a.id)!.getHealth())[0] ?? null;
  }

  private async callProvider(model: ModelConfig, request: InferenceRequest): Promise<string> {
    switch (model.provider) {
      case 'cloudflare': return this.callCloudflare(model, request);
      case 'openai': return this.callOpenAI(model, request);
      case 'anthropic': return this.callAnthropic(model, request);
      default: throw new Error(`Unknown provider: ${model.provider}`);
    }
  }

  private async callCloudflare(model: ModelConfig, req: InferenceRequest): Promise<string> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${process.env['CLOUDFLARE_ACCOUNT_ID']}/ai/run/${model.endpoint}`;
    const messages: unknown[] = [];
    if (req.systemPrompt) messages.push({ role: 'system', content: req.systemPrompt });
    messages.push({
      role: 'user',
      content: req.image
        ? [{ type: 'image', image: req.image }, { type: 'text', text: req.prompt }]
        : req.prompt,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${model.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, max_tokens: req.maxTokens ?? 2048 }),
    });
    if (!res.ok) throw new Error(`Cloudflare AI error: ${res.status} ${await res.text()}`);
    const data = await res.json() as { result: { response: string } };
    return data.result.response;
  }

  private async callOpenAI(model: ModelConfig, req: InferenceRequest): Promise<string> {
    const messages: unknown[] = [];
    if (req.systemPrompt) messages.push({ role: 'system', content: req.systemPrompt });
    messages.push({
      role: 'user',
      content: req.image
        ? [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${req.image}` } }, { type: 'text', text: req.prompt }]
        : req.prompt,
    });

    const res = await fetch(model.endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${model.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model.id,
        messages,
        max_tokens: req.maxTokens ?? 2048,
        temperature: req.temperature ?? 0.7,
        response_format: req.expectedOutput === 'json' ? { type: 'json_object' } : undefined,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${await res.text()}`);
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]?.message?.content ?? '';
  }

  private async callAnthropic(model: ModelConfig, req: InferenceRequest): Promise<string> {
    const content: unknown[] = req.image
      ? [{ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: req.image } }, { type: 'text', text: req.prompt }]
      : [{ type: 'text', text: req.prompt }];

    const res = await fetch(model.endpoint, {
      method: 'POST',
      headers: {
        'x-api-key': model.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: req.maxTokens ?? 2048,
        system: req.systemPrompt,
        messages: [{ role: 'user', content }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);
    const data = await res.json() as { content: Array<{ text: string }> };
    return data.content[0]?.text ?? '';
  }

  private hashRequest(request: InferenceRequest): string {
    return createHash('sha256')
      .update(JSON.stringify({ p: request.prompt, i: request.image?.slice(0, 100), o: request.expectedOutput }))
      .digest('hex');
  }

  private estimateTokens(input: string, output: string): number {
    return Math.ceil((input.length + output.length) / 4);
  }

  getStats() {
    return {
      registeredModels: this.models.size,
      totalRequests: this.requestCount,
      totalTokensUsed: this.totalTokensUsed,
      cacheSize: this.cache.size,
      modelHealth: Object.fromEntries(
        Array.from(this.breakers.entries()).map(([id, b]) => [
          id,
          { health: b.getHealth(), state: b.getState() },
        ]),
      ),
    };
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────
export const globalAIOrchestrator = new AIOrchestrator();
