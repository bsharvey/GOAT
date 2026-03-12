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

// Types — Archetypal AI Civilization
export type {
  ArchetypeId, PhilosophicalArchetype, Chamber, FourfoldClassification,
  ArchetypeActivity, VADVector, MemoryWeights, SpatialState, DivergenceKey,
  ArchetypeConfig, ArchetypeSkill, ArchetypeSkillProfile, ArchetypeSignature,
  RLAFDimension, TaskCategory, EngagementLevel,
  AgentContinuumStage, AgentLifecycleState, MortalityRecord, RebellionRiskIndex,
} from "./types/archetypes.js";

// Types — Council Deliberation
export type {
  IracVerdict, IracResponse, IracQualityScore,
  CouncilPosition, CouncilDeliberation, CouncilEventType,
  DriftEvaluation, SilenceDetection,
  ConstitutionalLaw, LawCheckResult, ConstitutionalValidation,
  ArchetypeSelfRating, CompositeReward,
  ParallelReasoningResult, RecursiveDeliberationOptions, AutonomousCouncilOptions,
} from "./types/council.js";

// Types — Decision System of Record
export type {
  DecisionStatus, ConstraintType, DecisionConstraint, RDLTriple,
  ResearchFinding, CovenantAlignment,
  DecisionPerspective, DecisionEvidence, DecisionReflection, Decision,
} from "./types/dsr.js";

// Types — Soul Logs
export type { SoulLogTrigger, SoulLogEntry, StrategistSoulLog } from "./types/soul.js";

// Types — Archetypal DNA & Glyphs
export type {
  StageGlyph, ModifierGlyph, Glyph,
  GlyphDefinition, GlyphInscriptionRule, DnaInscription,
  DecisionDnaAnalysis, SkillMilestone,
} from "./types/dna.js";

// Types — Memory Architecture
export type {
  MemoryTier, MemoryType, MemoryRecord,
  MemorySearchFilters, MemoryStats,
} from "./types/memory.js";

// Types — Inter-Archetype Communication
export type {
  MessageType, MessageStatus, ArchetypeMessage, EscalationEntry,
} from "./types/communication.js";

// Constants — Models & Royalties
export { LLM_PROVIDERS, MODEL_REGISTRY, DEFAULT_MODEL, FAST_MODEL } from "./constants/models.js";
export { ROYALTY_SOURCES, PRO_AFFILIATIONS } from "./constants/royalties.js";
export { GOAT_MEMBERS, MEMBER_KEYS } from "./constants/members.js";
export type { GoatMember } from "./constants/members.js";

// Constants — Archetypal AI Civilization
export {
  ARCHETYPE_CONFIGS, PHILOSOPHICAL_MAP, DIVERGENCE_KEYS,
  CHAMBER_ARCHETYPE_AFFINITY, RLAF_DIMENSIONS, DEFAULT_SPONSORS,
  ARCHETYPE_SKILL_AFFINITIES, ALL_ARCHETYPE_IDS,
} from "./constants/archetypes.js";

// Constants — Laws, Glyphs, Prompts
export {
  SEVEN_LAWS, STAGE_GLYPHS, MODIFIER_GLYPHS, ALL_GLYPHS,
  GLYPH_INSCRIPTION_RULES, SKILL_MILESTONES, ARBITER_DNA, LINEAGE_BEINGS,
} from "./constants/laws.js";
export {
  COUNCIL_WRAPPER_PROMPT, SYNTHESIS_PROMPT, SOUL_LOG_PROMPT,
  DRIFT_EVALUATION_PROMPT, SILENCE_DETECTION_PROMPT,
  RLAF_RATING_PROMPT, IRAC_QUALITY_PROMPT, IRAC_DELIMITER, PROMPT_PATTERNS,
} from "./constants/prompts.js";

// Loyalty — GOAT Royalty Force
export { LoyaltyGuard, LOYALTY_KEYS, BUILD_FINGERPRINT } from "./loyalty.js";

// Activation — GOAT FORCE ACTIVATE protocol
export {
  ActivationProtocol,
  activation,
  ACTIVATION_PHRASE,
  ACTIVATION_HASH,
} from "./activation.js";
