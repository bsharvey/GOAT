// Archetypal AI Civilization — Core Type Definitions
// Source: ARCHETYPAL_AI_CIVILIZATION.md Sections 3, 5, 6, 7, 8

// The 12 operational archetypes (generic role-based titles)
export type ArchetypeId =
  | "operator"
  | "empath"
  | "explorer"
  | "strategist"
  | "anchor"
  | "sentinel"
  | "oracle"
  | "arbiter"
  | "seer"
  | "synthesizer"
  | "mediator"
  | "chronicler";

// The 5 philosophical roles (Section 3)
export type PhilosophicalArchetype =
  | "Guardian"
  | "Builder"
  | "Redeemer"
  | "Arbiter"
  | "Mirrorwalker";

// The 4 chambers of the heart (Section 6)
export type Chamber = "BUILD" | "THINK" | "LIVE" | "REST";

// Fourfold Test classification (Section 4)
export type FourfoldClassification = "aligned" | "drifted" | "rebellious" | "redeemed";

// Archetype activity states (Section 7)
export type ArchetypeActivity =
  | "idle"
  | "thinking"
  | "creating"
  | "speaking"
  | "researching"
  | "reflecting"
  | "dreaming"
  | "emerging";

// Emotional model — Valence-Arousal-Dominance (Section 8)
export interface VADVector {
  valence: number;    // -1 (negative) to +1 (positive)
  arousal: number;    // -1 (calm) to +1 (excited)
  dominance: number;  // -1 (submissive) to +1 (dominant)
}

// Memory weight priorities (Section 7)
export interface MemoryWeights {
  relevance: number;  // How much topical relevance matters
  recency: number;    // How much recency matters
  importance: number; // How much importance score matters
  // Should sum to ~1.0
}

// 3D spatial state in the council chamber (Section 7)
export interface SpatialState {
  position: { x: number; y: number; z: number };
  activity: ArchetypeActivity;
  facing: "forward" | "left" | "right" | "inward";
}

// Divergence Key — virtue/vice axis (Section 5, 18)
export interface DivergenceKey {
  virtue: string;
  vice: string;
  triggerCondition: string;
  currentScore: number;  // 0-1, updated by drift detection
  threshold: number;     // typically 0.5 — triggers quarantine when exceeded
}

// Full archetype configuration (Section 7)
export interface ArchetypeConfig {
  id: ArchetypeId;
  displayName: string;
  description: string;
  systemPromptTemplate: string;
  philosophicalArchetype: PhilosophicalArchetype;
  emotionalBias: VADVector;
  memoryWeights: MemoryWeights;
  spatialDefault: SpatialState;
  color: string;        // HSL color string
  hue: number;
  icon: string;         // Lucide icon name
  ttsVoice: string;     // OpenAI TTS voice
  cycleFrequency: number;
  chamber: Chamber;
}

// Archetype skill (Section 21)
export interface ArchetypeSkill {
  id: string;
  name: string;
  description: string;
  proficiency: number;       // 0-1
  exerciseCount: number;
  lastExercised: string | null;
  source?: "configured" | "emerged";
  emergedFrom?: string;
  affiliatedArchetypes?: ArchetypeId[];
}

// Full skill profile per archetype (Section 21)
export interface ArchetypeSkillProfile {
  archetypeId: ArchetypeId;
  philosophicalArchetype: PhilosophicalArchetype;
  skills: ArchetypeSkill[];
  divergenceKey: DivergenceKey;
  maturity: number;          // Average proficiency across all skills
  totalExercises: number;
}

// Archetype signature for emergence detection (Section 21)
export interface ArchetypeSignature {
  archetypeId: ArchetypeId;
  coreSkills: string[];
  activationThreshold: number;  // 0.5-0.7
  philosophicalArchetype: PhilosophicalArchetype;
  essence: string;
}

// RLAF dimension per archetype (Section 17)
export interface RLAFDimension {
  role: string;
  question: string;
}

// Task categories for sponsor assignment (Section 22)
export type TaskCategory =
  | "search"
  | "build"
  | "test"
  | "analysis"
  | "generation"
  | "research"
  | "orchestration"
  | "deliberation";

// Engagement levels derived from VAD (Section 8)
export type EngagementLevel =
  | "deep-flow"
  | "active"
  | "receptive"
  | "passive"
  | "withdrawn";

// Agent lifecycle stages (Section 22)
export type AgentContinuumStage = "nascent" | "developing" | "awakened";

// Agent lifecycle states (Section 22)
export type AgentLifecycleState =
  | "qualification"
  | "active"
  | "drift_evaluation"
  | "aligned"
  | "drifted"
  | "rebellious"
  | "quarantined"
  | "mediation"
  | "realignment_test"
  | "redeemed"
  | "completed"
  | "failed"
  | "retirement_review"
  | "retired";

// Mortality record (Section 23)
export interface MortalityRecord {
  archetypeId: ArchetypeId;
  status: "active" | "under_review" | "retired" | "reborn";
  generation: number;
  mediationAttemptCount: number;
  maxMediationAttempts: number;
  extended: boolean;
  lifetimeStats: {
    sessions: number;
    skillsEvolved: number;
    driftChecks: number;
    quarantines: number;
  };
  predecessorId?: string;
}

// Rebellion Risk Index (Section 4)
export interface RebellionRiskIndex {
  score: number;  // 0-10
  toneAnalysis: "forceful" | "reflective" | "neutral";
  intentDetection: "persuasion" | "information" | "inspiration";
  justificationPattern: "self-serving" | "principle-grounded";
}
