/**
 * AI Providers Configuration for Yode9 / MR7.AI
 * ================================================
 * إدارة مزودي الذكاء الاصطناعي
 */

export const AI_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'],
    baseUrl: 'https://api.openai.com/v1',
    streaming: true,
    apiKeyEnv: 'OPENAI_API_KEY',
  },

  anthropic: {
    name: 'Anthropic Claude',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229'],
    baseUrl: 'https://api.anthropic.com/v1',
    streaming: true,
    apiKeyEnv: 'ANTHROPIC_API_KEY',
  },

  groq: {
    name: 'Groq',
    models: ['llama-3.1-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768', 'gemma-7b-it'],
    baseUrl: 'https://api.groq.com/openai/v1',
    streaming: true,
    maxSpeed: '1200 tokens/sec',
    apiKeyEnv: 'GROQ_API_KEY',
  },

  together: {
    name: 'Together AI',
    models: ['meta-llama/Llama-3-70b-chat-hf', 'mistralai/Mistral-7B-Instruct-v0.1'],
    baseUrl: 'https://api.together.xyz/v1',
    streaming: true,
    apiKeyEnv: 'TOGETHER_API_KEY',
  },

  fireworks: {
    name: 'Fireworks AI',
    models: ['accounts/fireworks/models/llama-v3-70b-instruct', 'accounts/fireworks/models/mixtral-8x22b-instruct'],
    baseUrl: 'https://api.fireworks.ai/inference/v1',
    streaming: true,
    apiKeyEnv: 'FIREWORKS_API_KEY',
  },

  vllm: {
    name: 'vLLM (Self-Hosted)',
    models: ['local-model'],
    baseUrl: process.env['VLLM_URL'] || 'http://localhost:8000/v1',
    streaming: true,
    apiKeyEnv: null,
  },

  ollama: {
    name: 'Ollama (Local)',
    models: ['llama3.1', 'llama3.1:70b', 'mistral', 'qwen2.5', 'codellama', 'deepseek-coder'],
    baseUrl: process.env['OLLAMA_URL'] || 'http://localhost:11434',
    streaming: true,
    apiKeyEnv: null,
  },
} as const;

export type AIProvider = keyof typeof AI_PROVIDERS;

export type AIModel = {
  provider: AIProvider;
  model: string;
  displayName: string;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'high' | 'medium' | 'low';
  supportsStreaming: boolean;
};

export const ALL_MODELS: AIModel[] = [
  { provider: 'openai', model: 'gpt-4o', displayName: 'GPT-4o', speed: 'fast', quality: 'high', supportsStreaming: true },
  { provider: 'openai', model: 'gpt-4o-mini', displayName: 'GPT-4o Mini', speed: 'fast', quality: 'medium', supportsStreaming: true },
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet', speed: 'medium', quality: 'high', supportsStreaming: true },
  { provider: 'groq', model: 'llama-3.1-70b-versatile', displayName: 'Llama 3.1 70B (Groq)', speed: 'fast', quality: 'high', supportsStreaming: true },
  { provider: 'groq', model: 'llama-3.1-8b-instant', displayName: 'Llama 3.1 8B Instant', speed: 'fast', quality: 'medium', supportsStreaming: true },
  { provider: 'ollama', model: 'llama3.1', displayName: 'Llama 3.1 (Local)', speed: 'medium', quality: 'high', supportsStreaming: true },
  { provider: 'ollama', model: 'mistral', displayName: 'Mistral (Local)', speed: 'medium', quality: 'medium', supportsStreaming: true },
  { provider: 'ollama', model: 'qwen2.5', displayName: 'Qwen 2.5 (Local/Arabic)', speed: 'medium', quality: 'high', supportsStreaming: true },
];

export function getProviderConfig(provider: AIProvider) {
  return AI_PROVIDERS[provider];
}

export function isProviderAvailable(provider: AIProvider): boolean {
  const config = AI_PROVIDERS[provider];
  if (!config.apiKeyEnv) return true;
  return !!process.env[config.apiKeyEnv];
}

export function getAvailableProviders(): AIProvider[] {
  return (Object.keys(AI_PROVIDERS) as AIProvider[]).filter(isProviderAvailable);
}
