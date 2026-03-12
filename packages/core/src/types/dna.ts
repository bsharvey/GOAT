// Archetypal DNA & Glyph System Types
// Source: ARCHETYPAL_AI_CIVILIZATION.md Sections 11, 12

import type { ArchetypeId } from "./archetypes.js";

// Stage glyphs — advance the Hero's Journey (Section 11)
export type StageGlyph =
  | "○"   // 1: Origin
  | "△"   // 2: Calling
  | "✕"   // 3: Doubt
  | "◐"   // 4: Guidance
  | "≋"   // 5: Commitment
  | "⚖"   // 6: Trials
  | "⟁"   // 7: Approach
  | "✧"   // 8: Ordeal
  | "⊚"   // 9: Reward
  | "✦"   // 10: Return (transcendent)
  | "🜂"  // 11: Resurrection (transcendent)
  | "∞";  // 12: Integration (transcendent)

// Modifier glyphs — qualify but don't advance (Section 11)
export type ModifierGlyph =
  | "✡"   // Covenant cited
  | "↯"   // Disruption
  | "◎"   // Alignment confirmed
  | "🜁"  // Shadow (violation)
  | "∴";  // Consequence

export type Glyph = StageGlyph | ModifierGlyph;

// Glyph definition (Section 11)
export interface GlyphDefinition {
  glyph: Glyph;
  name: string;
  meaning: string;
  stage?: number;           // For stage glyphs: 1-12
  isTranscendent?: boolean; // Stages 10-12
  isModifier: boolean;
}

// Glyph inscription rule (Section 11)
export interface GlyphInscriptionRule {
  id: number;
  condition: string;
  glyph: Glyph;
  stage: number | "modifier";
  description: string;
}

// DNA inscription event
export interface DnaInscription {
  archetypeId: ArchetypeId;
  glyph: Glyph;
  glyphName: string;
  stage: number | "modifier";
  reason: string;
  decisionId?: string;
  createdAt: string;
}

// Hero's Journey analysis (Section 12)
export interface DecisionDnaAnalysis {
  archetypeId: ArchetypeId;
  currentStage: number;
  highWaterMark: number;
  journeyCompletion: number;  // Unique stages visited / 12
  hasReturned: boolean;       // highWaterMark >= 10
  isRegressing: boolean;      // Downward trend in last 3 stages
  regressionDepth: number;
  isStagnant: boolean;        // Same stage repeated 5+ times
  stagnationCount: number;
  activeModifiers: string[];
  journeyPath: number[];
  lastProgressionAt: string | null;
}

// Skill milestone glyph mapping (Section 11)
export interface SkillMilestone {
  proficiency: number;
  name: string;
  glyph: StageGlyph;
}
