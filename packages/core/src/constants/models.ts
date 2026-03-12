import type { LLMModel, LLMProvider } from "../types/llm.js";

export const LLM_PROVIDERS: LLMProvider[] = [
  "anthropic",
  "openai",
  "google",
  "nvidia",
  "xai",
  "ollama",
];

export const DEFAULT_MODEL = "claude-sonnet-4-20250514";
export const FAST_MODEL = "claude-haiku-4-5-20251001";

export const MODEL_REGISTRY: Record<string, LLMModel> = {
  // Anthropic Claude
  "claude-haiku-4.5": {
    id: "claude-haiku-4-5-20251001",
    provider: "anthropic",
    name: "Claude Haiku 4.5",
    capabilities: ["fast", "cheap", "general"],
    costMultiplier: 0.33,
    maxTokens: 8192,
  },
  "claude-sonnet-4.6": {
    id: "claude-sonnet-4-20250514",
    provider: "anthropic",
    name: "Claude Sonnet 4.6",
    capabilities: ["balanced", "code", "analysis"],
    costMultiplier: 1,
    maxTokens: 8192,
  },
  "claude-opus-4.6": {
    id: "claude-opus-4-6",
    provider: "anthropic",
    name: "Claude Opus 4.6",
    capabilities: ["complex", "expert", "analysis"],
    costMultiplier: 3,
    maxTokens: 8192,
  },

  // OpenAI GPT
  "gpt-4o": {
    id: "gpt-4o",
    provider: "openai",
    name: "GPT-4o",
    capabilities: ["vision", "general", "fast"],
    costMultiplier: 0,
    maxTokens: 4096,
  },
  "gpt-4.1": {
    id: "gpt-4.1",
    provider: "openai",
    name: "GPT-4.1",
    capabilities: ["general"],
    costMultiplier: 0,
    maxTokens: 4096,
  },

  // Google Gemini
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    provider: "google",
    name: "Gemini 2.5 Pro",
    capabilities: ["reasoning", "long-context"],
    costMultiplier: 1,
    maxTokens: 8192,
  },

  // xAI Grok
  "grok-code-fast": {
    id: "grok-code-fast-1",
    provider: "xai",
    name: "Grok Code Fast",
    capabilities: ["code", "fast"],
    costMultiplier: 0.25,
    maxTokens: 4096,
  },

  // Local (Ollama)
  "llama3-70b": {
    id: "llama3:70b",
    provider: "ollama",
    name: "Llama 3 70B",
    capabilities: ["general", "offline"],
    costMultiplier: 0,
    maxTokens: 4096,
  },
  "codellama": {
    id: "codellama",
    provider: "ollama",
    name: "Code Llama",
    capabilities: ["code", "offline"],
    costMultiplier: 0,
    maxTokens: 4096,
  },
};
