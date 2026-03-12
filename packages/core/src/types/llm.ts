export type LLMProvider = "anthropic" | "openai" | "google" | "nvidia" | "xai" | "ollama";

export interface LLMModel {
  id: string;
  provider: LLMProvider;
  name: string;
  capabilities: string[];
  costMultiplier: number;
  maxTokens: number;
}

export interface LLMResponse {
  content: string;
  model: string;
  provider: LLMProvider;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  latencyMs: number;
}

export interface OmniLLMConfig {
  defaultProvider: LLMProvider;
  defaultModel: string;
  fallbackChain: string[];
  enableEnsemble: boolean;
  apiKeys: Partial<Record<LLMProvider, string>>;
}

export interface RouterDecision {
  model: string;
  provider: LLMProvider;
  reason: string;
  confidence: number;
}
