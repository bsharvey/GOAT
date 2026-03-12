// Decision System of Record Types
// Source: ARCHETYPAL_AI_CIVILIZATION.md Section 13

import type { ArchetypeId, FourfoldClassification } from "./archetypes.js";
import type { IracResponse, IracVerdict } from "./council.js";

// DSR lifecycle statuses (Section 13)
export type DecisionStatus =
  | "research"
  | "council"
  | "decided"
  | "implementing"
  | "completed"
  | "refused"
  | "escalated"
  | "superseded"
  | "abandoned";

// Constraint types on a decision
export type ConstraintType = "technical" | "business" | "covenant" | "timeline";

export interface DecisionConstraint {
  type: ConstraintType;
  description: string;
  severity: "hard" | "soft";
}

// RDL Triple — Rule Description Logic (Section 27)
export interface RDLTriple {
  condition: string;   // IF [this is true]
  decision: string;    // THEN [this action]
  reason: string;      // BECAUSE [this principle]
}

// Research finding attached to a DSR
export interface ResearchFinding {
  source: string;
  summary: string;
  relevance: number;   // 0-1
}

// Covenant alignment result
export type CovenantAlignment = FourfoldClassification;

// Archetype perspective on a decision (Section 13)
export interface DecisionPerspective {
  dsrId: string;
  archetypeId: ArchetypeId;
  verdict: IracVerdict;
  irac: IracResponse;
  createdAt: string;
}

// Evidence exhibit (Section 13)
export interface DecisionEvidence {
  dsrId: string;
  exhibitNumber: number;
  title: string;
  sourceType: "document" | "research" | "precedent" | "testimony" | "data";
  reference: string;
  content: string;
}

// Post-decision reflection (Section 13)
export interface DecisionReflection {
  dsrId: string;
  author: string;
  type: "mirror" | "dna" | "rlaf" | "irac" | "outcome" | "manual";
  content: string;
  outcomeStatus?: "successful" | "partial" | "failed" | "pending";
  createdAt: string;
}

// Full Decision record (Section 13)
export interface Decision {
  id: string;
  userId: string;
  dsrNumber: string;                   // "DSR-001", auto-incremented
  title: string;
  status: DecisionStatus;
  question: string;
  constraints: DecisionConstraint[];
  priorDecisions: string[];            // Referenced prior DSR numbers
  research: ResearchFinding[];
  synthesis: string | null;
  judgeArchetype: string;              // Usually "arbiter"
  rdlTriples: RDLTriple[];
  outcome: string | null;
  outcomeStatus: "successful" | "partial" | "failed" | "pending" | null;
  alignment: CovenantAlignment | null;
  tags: string[];
  metadata: Record<string, unknown>;

  // Relations
  perspectives: DecisionPerspective[];
  evidence: DecisionEvidence[];
  reflections: DecisionReflection[];

  // DNA & RLAF
  compositeReward?: number;
  paretoAcceptable?: boolean;
  dnaGlyphsInscribed?: string[];

  // Recursive council
  parentDsrId?: string;
  recursionDepth?: number;
  followUpTopics?: string[];

  createdAt: string;
  updatedAt: string;
}
