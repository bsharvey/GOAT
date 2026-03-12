// Council Deliberation Types
// Source: ARCHETYPAL_AI_CIVILIZATION.md Sections 14, 15, 19, 20

import type { ArchetypeId, FourfoldClassification } from "./archetypes.js";

// IRAC verdict options (Section 14)
export type IracVerdict = "ALIGNED" | "ADD_CONTEXT" | "OPPOSE";

// IRAC structured response (Section 14)
export interface IracResponse {
  issue: string;       // 1 sentence
  rule: string;        // 1 sentence
  analysis: string;    // 2-3 sentences
  conclusion: IracVerdict;
}

// IRAC quality scoring (Section 14)
export interface IracQualityScore {
  archetypeId: ArchetypeId;
  overallQuality: number;      // 0-1
  issueClarity: number;
  ruleRelevance: number;
  analysisDepth: number;
  conclusionSupport: number;
  isFormulaic: boolean;
  formulaicScore: number;      // Trigram similarity to recent IRACs
}

// Individual archetype position in a council deliberation (Section 15)
export interface CouncilPosition {
  archetypeId: ArchetypeId;
  displayText: string;         // PART 1: single bold sentence
  irac: IracResponse;         // PART 2: full IRAC analysis
  audioUrl?: string;
}

// Drift evaluation per archetype (Section 18)
export interface DriftEvaluation {
  archetypeId: ArchetypeId;
  score: number;               // 0-1
  classification: FourfoldClassification;
  reason: string;
  triggeredQuarantine: boolean;
}

// Silence detection result (Section 19)
export interface SilenceDetection {
  uncitedTopics: string[];
  silentArchetypes: string[];
  coverageScore: number;       // 0-1
  oracleNote: string;          // Karen's observation
}

// Constitutional law definition (Section 2)
export interface ConstitutionalLaw {
  id: string;
  name: string;
  description: string;
  custodian: ArchetypeId;
}

// Law check result (Section 20)
export interface LawCheckResult {
  lawId: string;
  lawName: string;
  satisfied: boolean;
  severity: "violation" | "warning" | "info";
  reason: string;
}

// Constitutional validation result (Section 20)
export interface ConstitutionalValidation {
  isConstitutional: boolean;
  violationCount: number;
  warningCount: number;
  summary: string;
  laws: LawCheckResult[];
}

// RLAF self-rating per archetype (Section 17)
export interface ArchetypeSelfRating {
  archetypeId: ArchetypeId;
  decisionId: string;
  satisfactionScore: number;   // 0-1
  valueDimension: string;
  reason: string;
}

// Composite RLAF reward (Section 17)
export interface CompositeReward {
  decisionId: string;
  compositeScore: number;
  ratings: ArchetypeSelfRating[];
  isParetoAcceptable: boolean;
  dissatisfiedArchetypes: ArchetypeId[];
}

// Full council deliberation record (Section 15)
export interface CouncilDeliberation {
  id: string;
  sessionId: string;
  question: string;
  archetypes: ArchetypeId[];
  positions: CouncilPosition[];
  synthesis: string | null;
  synthesisVerdict: IracVerdict | null;
  driftEvaluations: DriftEvaluation[];
  silenceDetection: SilenceDetection | null;
  constitutionalValidation: ConstitutionalValidation | null;
  dnaInscriptions: string[];
  rlafRatings: CompositeReward | null;
  dsrId: string | null;
  dsrNumber: string | null;
  createdAt: string;
}

// SSE event types for streaming council deliberation (Section 15)
export type CouncilEventType =
  | "council:start"
  | "council:dsr_context"
  | "council:speaking"
  | "council:token"
  | "council:position"
  | "council:audio"
  | "council:synthesizing"
  | "council:synthesis_token"
  | "council:synthesis"
  | "council:skill_evolution"
  | "council:skill_emergence"
  | "council:milestones"
  | "council:drift"
  | "council:silence"
  | "council:constitutional"
  | "council:dna_inscriptions"
  | "council:rlaf_ratings"
  | "council:feedback_loop"
  | "council:follow_up"
  | "council:complete";

// Parallel reasoning result for high-criticality decisions (Section 15)
export interface ParallelReasoningResult {
  pathways: { archetypeId: ArchetypeId; verdict: IracVerdict; reasoning: string }[];
  agreementScore: number;
  divergenceDetected: boolean;
  reconciliation?: string;
}

// Recursive deliberation options (Section 15)
export interface RecursiveDeliberationOptions {
  question: string;
  maxDepth?: number;           // Default: 3
  coverageThreshold?: number;  // Default: 0.8
  parentDsrId?: string;
}

// Autonomous council trigger (Section 15)
export interface AutonomousCouncilOptions {
  question: string;
  archetypes?: ArchetypeId[];
  triggeredBy: "kernel" | "archetype";
  triggeringArchetypeId?: ArchetypeId;
  criticality?: number;
  category?: string;
}
