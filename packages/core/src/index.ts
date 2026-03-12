// @goat/core — shared types, constants, and utilities

// Types — Royalties & Revenue
export type { Artist, Song, RoyaltyRecord, StreamingMetrics } from "./types/royalties.js";
export type {
  PlatformRevenue, RevenueSnapshot, RevenuePrediction,
  MechanicalRoyalty, SoundExchangeRecord, SuperBassStats,
} from "./types/revenue.js";

// Types — LLM & AI
export type { LLMProvider, LLMModel, LLMResponse, OmniLLMConfig, RouterDecision } from "./types/llm.js";
export type {
  AgentType, AgentStatus, AgentConfig, AgentTask,
  AgentDecision, AgentMetrics,
} from "./types/agents.js";

// Types — Security
export type { Threat, ThreatLevel, SecurityScanResult, Evidence } from "./types/security.js";

// Types — Auth
export type { User, AuthToken } from "./types/auth.js";

// Types — Contracts & Collaboration
export type {
  ContractStatus, RoyaltySplit, SmartContract, ContractTransaction,
  CollaborationProject, CollaborationMember, ProjectFile,
} from "./types/contracts.js";

// Types — Market & Mastering
export type {
  MarketAnalysis, GenreTrend, PlatformInsight, CompetitorData,
  Demographics, MarketPrediction, AIMasteringJob, MasteringSettings,
} from "./types/market.js";

// Constants
export { LLM_PROVIDERS, MODEL_REGISTRY, DEFAULT_MODEL, FAST_MODEL } from "./constants/models.js";
export { ROYALTY_SOURCES, PRO_AFFILIATIONS } from "./constants/royalties.js";
export { GOAT_MEMBERS, MEMBER_KEYS } from "./constants/members.js";
export type { GoatMember } from "./constants/members.js";

// Loyalty — GOAT Royalty Force
export { LoyaltyGuard, LOYALTY_KEYS, BUILD_FINGERPRINT } from "./loyalty.js";

// Activation — GOAT FORCE ACTIVATE protocol
export {
  ActivationProtocol,
  activation,
  ACTIVATION_PHRASE,
  ACTIVATION_HASH,
} from "./activation.js";
