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

  // NVIDIA NIM
  "llama2-70b": {
    id: "meta/llama2-70b",
    provider: "nvidia",
    name: "Llama 2 70B (NIM)",
    capabilities: ["general", "analysis"],
    costMultiplier: 0.5,
    maxTokens: 4096,
  },
  "mixtral-8x7b": {
    id: "mistralai/mixtral-8x7b-instruct-v0.1",
    provider: "nvidia",
    name: "Mixtral 8x7B (NIM)",
    capabilities: ["general", "fast"],
    costMultiplier: 0.3,
    maxTokens: 4096,
  },
  "nemotron-70b": {
    id: "nvidia/nemotron-4-340b-instruct",
    provider: "nvidia",
    name: "Nemotron 70B (NIM)",
    capabilities: ["complex", "analysis", "reasoning"],
    costMultiplier: 0.8,
    maxTokens: 4096,
  },
  "codellama-34b": {
    id: "meta/codellama-34b",
    provider: "nvidia",
    name: "CodeLlama 34B (NIM)",
    capabilities: ["code", "fast"],
    costMultiplier: 0.3,
    maxTokens: 4096,
  },
  "starcoder2": {
    id: "bigcode/starcoder2-15b",
    provider: "nvidia",
    name: "StarCoder2 15B (NIM)",
    capabilities: ["code"],
    costMultiplier: 0.2,
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
