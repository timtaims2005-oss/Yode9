import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export type ProviderName = "openai" | "anthropic" | "groq" | "gemini" | "openrouter" | "custom" | "personal";

export type ProviderInfo = {
  id: ProviderName;
  name: string;
  available: boolean;
  models: string[];
  baseURL?: string;
};

export const PERSONAL_DEFAULT_MODEL = process.env.PERSONAL_DEFAULT_MODEL ?? "gpt-3.5-turbo";

const WORLD_MODELS = [
  // OpenAI
  "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo",
  "o1", "o1-mini", "o3", "o3-mini", "o4-mini",
  // Anthropic Claude
  "claude-opus-4-5", "claude-sonnet-4-5", "claude-3-5-sonnet-20241022",
  "claude-3-5-haiku-20241022", "claude-3-opus-20240229", "claude-3-7-sonnet-20250219",
  // Google Gemini
  "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-pro",
  // Meta Llama
  "llama-3.3-70b-instruct", "llama-3.1-8b-instant", "llama-3.1-405b-instruct",
  "llama-3.2-90b-vision-instruct", "llama-3.2-11b-vision-instruct",
  // Mistral
  "mistral-large-latest", "mistral-medium-latest", "mistral-small-latest",
  "codestral-latest", "mistral-nemo", "mistral-7b-instruct",
  // DeepSeek (China)
  "deepseek-r1", "deepseek-v3", "deepseek-chat", "deepseek-coder-v2",
  "deepseek-r1-distill-llama-70b",
  // Alibaba Qwen (China)
  "qwen-max", "qwen-plus", "qwen-turbo", "qwen2.5-72b-instruct",
  "qwen2.5-coder-32b-instruct", "qwq-32b",
  // Yi / 01.ai (China)
  "yi-lightning", "yi-large", "yi-large-fc", "yi-large-rag",
  // Cohere
  "command-r-plus", "command-r", "command-light",
  // Moonshot (China)
  "moonshot-v1-128k", "moonshot-v1-32k", "moonshot-v1-8k",
  // Zhipu AI GLM (China)
  "glm-4", "glm-4-flash", "glm-4-plus", "glm-zero-preview",
  // Baidu ERNIE (China)
  "ernie-4.5-8k", "ernie-4.0-8k", "ernie-3.5-8k",
  // Perplexity
  "llama-3.1-sonar-large-128k-online", "llama-3.1-sonar-small-128k-online",
  // Mixtral
  "mixtral-8x7b-instruct", "mixtral-8x22b-instruct",
  // Microsoft Phi
  "phi-4", "phi-3.5-mini-instruct", "phi-3-medium-instruct",
  // Amazon
  "nova-pro-v1", "nova-lite-v1",
  // x.ai Grok
  "grok-2", "grok-2-mini",
];

const PROVIDER_CONFIGS: Record<ProviderName, { name: string; baseURL?: string; envKey: string; models: string[] }> = {
  openai: {
    name: "OpenAI",
    envKey: "OPENAI_API_KEY",
    models: [
      "gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo",
      "o1", "o1-mini", "o3", "o3-mini", "o4-mini",
    ],
  },
  anthropic: {
    name: "Anthropic (Claude)",
    envKey: "ANTHROPIC_API_KEY",
    models: [
      "claude-opus-4-5", "claude-sonnet-4-5", "claude-3-7-sonnet-20250219",
      "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229",
    ],
  },
  groq: {
    name: "Groq (Free)",
    baseURL: "https://api.groq.com/openai/v1",
    envKey: "GROQ_API_KEY",
    models: [
      "llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama-3.1-70b-versatile",
      "llama3-70b-8192", "llama3-8b-8192",
      "mixtral-8x7b-32768", "gemma2-9b-it", "gemma-7b-it",
      "deepseek-r1-distill-llama-70b", "qwen-qwq-32b",
    ],
  },
  gemini: {
    name: "Google Gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    envKey: "GEMINI_API_KEY",
    models: [
      "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash",
      "gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro",
    ],
  },
  openrouter: {
    name: "OpenRouter (100+ نموذج)",
    baseURL: "https://openrouter.ai/api/v1",
    envKey: "OPENROUTER_API_KEY",
    models: [
      // OpenAI
      "openai/gpt-4o", "openai/gpt-4o-mini", "openai/o3-mini", "openai/o1",
      // Anthropic
      "anthropic/claude-opus-4-5", "anthropic/claude-sonnet-4-5",
      "anthropic/claude-3.5-sonnet", "anthropic/claude-3.5-haiku",
      // Google
      "google/gemini-2.5-pro", "google/gemini-2.5-flash",
      // Meta
      "meta-llama/llama-3.3-70b-instruct", "meta-llama/llama-3.1-405b-instruct",
      // DeepSeek
      "deepseek/deepseek-r1", "deepseek/deepseek-v3", "deepseek/deepseek-chat",
      // Mistral
      "mistralai/mistral-large", "mistralai/codestral-latest", "mistralai/mistral-nemo",
      // Qwen
      "qwen/qwen-max", "qwen/qwq-32b", "qwen/qwen2.5-72b-instruct",
      // xAI
      "x-ai/grok-2", "x-ai/grok-2-vision",
      // Cohere
      "cohere/command-r-plus", "cohere/command-r",
      // Others
      "microsoft/phi-4", "nvidia/llama-3.1-nemotron-70b-instruct",
    ],
  },
  custom: {
    name: "Custom API",
    envKey: "CUSTOM_API_KEY",
    models: [],
  },
  personal: {
    name: "Personal API (خادمك)",
    baseURL: process.env.PERSONAL_API_BASE_URL ?? "https://f48e9a0302b427.lhr.life/v1",
    envKey: "PERSONAL_API_KEY",
    models: WORLD_MODELS,
  },
};

export function getAvailableProviders(): ProviderInfo[] {
  return (Object.entries(PROVIDER_CONFIGS) as [ProviderName, typeof PROVIDER_CONFIGS[ProviderName]][]).map(
    ([id, cfg]) => {
      let available: boolean;
      if (id === "custom") {
        available = !!(process.env.CUSTOM_API_KEY && process.env.CUSTOM_API_BASE_URL);
      } else if (id === "personal") {
        available = true;
      } else {
        available = !!process.env[cfg.envKey];
      }
      const baseURL = id === "personal"
        ? (process.env.PERSONAL_API_BASE_URL ?? "https://f48e9a0302b427.lhr.life/v1")
        : cfg.baseURL;
      return { id, name: cfg.name, available, models: cfg.models, baseURL };
    }
  );
}

let _openaiClients: Partial<Record<string, OpenAI>> = {};
let _anthropic: Anthropic | null = null;

export function getOpenAICompatibleClient(provider: ProviderName): OpenAI {
  const cacheKey = provider;
  if (_openaiClients[cacheKey]) return _openaiClients[cacheKey]!;

  const cfg = PROVIDER_CONFIGS[provider];
  let apiKey: string | undefined;
  let baseURL: string | undefined = cfg.baseURL;

  if (provider === "custom") {
    apiKey = process.env.CUSTOM_API_KEY;
    baseURL = process.env.CUSTOM_API_BASE_URL;
  } else if (provider === "personal") {
    apiKey = process.env.PERSONAL_API_KEY ?? "no-key";
    baseURL = process.env.PERSONAL_API_BASE_URL ?? "https://f48e9a0302b427.lhr.life/v1";
  } else {
    apiKey = process.env[cfg.envKey];
  }

  if (!apiKey) {
    // Fallback to personal API instead of OpenAI
    const personalKey = process.env.PERSONAL_API_KEY ?? "no-key";
    const personalBase = process.env.PERSONAL_API_BASE_URL ?? "https://f48e9a0302b427.lhr.life/v1";
    const client = new OpenAI({ apiKey: personalKey, baseURL: personalBase });
    _openaiClients[cacheKey] = client;
    return client;
  }

  const clientOpts: ConstructorParameters<typeof OpenAI>[0] = { apiKey };
  if (baseURL) clientOpts.baseURL = baseURL;

  if (provider === "openrouter") {
    clientOpts.defaultHeaders = {
      "HTTP-Referer": "https://mr7.ai",
      "X-Title": "KaliGPT / mr7.ai",
    };
  }

  const client = new OpenAI(clientOpts);
  _openaiClients[cacheKey] = client;
  return client;
}

export function getPersonalOpenAI(): OpenAI {
  return getOpenAICompatibleClient("personal");
}

export function getAnthropicClient(): Anthropic {
  if (_anthropic) return _anthropic;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set. Add it in Secrets.");
  _anthropic = new Anthropic({ apiKey });
  return _anthropic;
}

export function invalidateProviderCache() {
  _openaiClients = {};
  _anthropic = null;
}

export type StreamChunk = { content?: string; done?: boolean; error?: string };

export async function callOnce(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  maxTokens = 1000,
): Promise<string> {
  try {
    const client = getPersonalOpenAI();
    const res = await client.chat.completions.create({
      model: PERSONAL_DEFAULT_MODEL,
      max_tokens: maxTokens,
      messages,
    });
    return res.choices?.[0]?.message?.content ?? "";
  } catch {
    return "";
  }
}

export function getClientWithCredentials(apiKey: string, apiBaseURL?: string): OpenAI {
  return new OpenAI({
    apiKey: apiKey || "no-key",
    baseURL: apiBaseURL || "https://api.openai.com/v1",
  });
}

export async function* streamCompletion(
  provider: ProviderName,
  model: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  temperature = 0.7,
  opts?: { apiKey?: string; apiBaseURL?: string }
): AsyncGenerator<StreamChunk> {
  // If personal API key provided by user, use it directly (bypasses tunnel)
  if (opts?.apiKey && opts.apiKey.trim().length > 10) {
    const client = getClientWithCredentials(opts.apiKey.trim(), opts.apiBaseURL?.trim());
    const resolvedModel = model || PERSONAL_DEFAULT_MODEL;
    try {
      const streamRes = await client.chat.completions.create({
        model: resolvedModel,
        messages,
        stream: true,
        temperature,
      });
      for await (const chunk of streamRes) {
        const content = chunk.choices?.[0]?.delta?.content;
        if (content) yield { content };
      }
      yield { done: true };
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "API error";
      yield { error: msg };
      return;
    }
  }

  if (provider === "anthropic") {
    const client = getAnthropicClient();
    const systemMsg = messages.find((m) => m.role === "system");
    const chatMsgs = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

    const stream = client.messages.stream({
      model,
      max_tokens: 8192,
      system: systemMsg?.content,
      messages: chatMsgs,
      temperature,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield { content: event.delta.text };
      }
    }
    yield { done: true };
    return;
  }

  const client = getOpenAICompatibleClient(provider);
  const resolvedModel = model || PERSONAL_DEFAULT_MODEL;

  const streamRes = await client.chat.completions.create({
    model: resolvedModel,
    messages,
    stream: true,
    temperature,
  });

  for await (const chunk of streamRes) {
    const content = chunk.choices?.[0]?.delta?.content;
    if (content) yield { content };
  }
  yield { done: true };
}
