// @goat/core — shared types, constants, and utilities

// Types
export type { Artist, Song, RoyaltyRecord, StreamingMetrics } from "./types/royalties.js";
export type { LLMProvider, LLMModel, LLMResponse, OmniLLMConfig } from "./types/llm.js";
export type { Threat, ThreatLevel, SecurityScanResult, Evidence } from "./types/security.js";
export type { User, AuthToken } from "./types/auth.js";

// Constants
export { LLM_PROVIDERS, MODEL_REGISTRY, DEFAULT_MODEL, FAST_MODEL } from "./constants/models.js";
export { ROYALTY_SOURCES, PRO_AFFILIATIONS } from "./constants/royalties.js";

// Loyalty — GOAT Royalty Force
export { LoyaltyGuard, LOYALTY_KEYS, BUILD_FINGERPRINT } from "./loyalty.js";

// Activation — GOAT FORCE ACTIVATE protocol
export {
  ActivationProtocol,
  activation,
  ACTIVATION_PHRASE,
  ACTIVATION_HASH,
} from "./activation.js";
