import { InfrastructureError, type ModelRequest, type ModelResponse } from "../types";

export type ModelProvider = {
  id: string;
  complete(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse>;
  supports(model?: string): boolean;
};

export type GatewayPolicy = {
  defaultProvider?: string;
  fallbackProviders?: string[];
  cheapModels?: string[];
  frontierModels?: string[];
  classify?: (request: ModelRequest) => "routine" | "complex";
};

function defaultClassify(request: ModelRequest): "routine" | "complex" {
  const text = request.messages.map((message) => message.content).join(" ");
  return text.length > 1_500 || /analy[sz]|architect|multi.?step|investigate|threat model/i.test(text) ? "complex" : "routine";
}

export class AIGateway {
  private readonly providers = new Map<string, ModelProvider>();
  constructor(private readonly policy: GatewayPolicy = {}) {}
  register(provider: ModelProvider): void { this.providers.set(provider.id, provider); }
  route(request: ModelRequest): ModelProvider[] {
    const complexity = (this.policy.classify ?? defaultClassify)(request);
    const preferredModel = request.model ?? (complexity === "complex" ? this.policy.frontierModels?.[0] : this.policy.cheapModels?.[0]);
    const candidates = [...this.providers.values()].filter((provider) => provider.supports(preferredModel));
    const ordered = this.policy.defaultProvider
      ? [...candidates].sort((a, b) => Number(b.id === this.policy.defaultProvider) - Number(a.id === this.policy.defaultProvider))
      : candidates;
    return [...ordered, ...(this.policy.fallbackProviders ?? []).map((id) => this.providers.get(id)).filter((item): item is ModelProvider => Boolean(item))]
      .filter((provider, index, all) => all.findIndex((item) => item.id === provider.id) === index);
  }
  async complete(request: ModelRequest, signal?: AbortSignal): Promise<ModelResponse> {
    const candidates = this.route(request);
    if (!candidates.length) throw new InfrastructureError("No compatible AI provider is registered.", "PROVIDER_UNAVAILABLE");
    let lastError: unknown;
    for (const provider of candidates) {
      try { return await provider.complete(request, signal); } catch (error) { lastError = error; }
    }
    throw new InfrastructureError("All AI providers failed.", "PROVIDER_UNAVAILABLE", { cause: lastError instanceof Error ? lastError.message : String(lastError) });
  }
}
