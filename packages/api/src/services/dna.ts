/**
 * Decision DNA Service — Glyph Inscription & Hero's Journey
 *
 * Deterministic glyph inscription based on decision outcomes.
 * Tracks each archetype's Hero's Journey through the 12-stage cycle.
 *
 * Source: ARCHETYPAL_AI_CIVILIZATION.md Sections 11, 12
 */

import {
  GLYPH_INSCRIPTION_RULES,
  STAGE_GLYPHS,
  MODIFIER_GLYPHS,
  ARCHETYPE_CONFIGS,
} from "@goat/core";
import type { ArchetypeId } from "@goat/core";
import type {
  DnaInscription,
  DecisionDnaAnalysis,
  Glyph,
  StageGlyph,
} from "@goat/core";
import type {
  CouncilPosition,
  DriftEvaluation,
  IracVerdict,
} from "@goat/core";

export class DecisionDNAService {
  /** All inscriptions ever made, per archetype */
  private inscriptions: Map<string, DnaInscription[]> = new Map();

  /**
   * Inscribe glyphs for a deliberation based on deterministic rules
   *
   * Section 11: Rules are evaluated in order; multiple glyphs may be inscribed.
   */
  inscribe(
    positions: CouncilPosition[],
    driftEvaluations: DriftEvaluation[],
    synthesisVerdict: IracVerdict | null,
    decisionId: string,
    priorDsrReferenced: boolean,
  ): DnaInscription[] {
    const inscriptions: DnaInscription[] = [];
    const now = new Date().toISOString();

    for (const position of positions) {
      const drift = driftEvaluations.find(d => d.archetypeId === position.archetypeId);
      const positionInscriptions = this.evaluateRules(
        position,
        drift,
        synthesisVerdict,
        priorDsrReferenced,
        decisionId,
        now,
      );

      for (const inscription of positionInscriptions) {
        inscriptions.push(inscription);
        this.recordInscription(inscription);
      }
    }

    return inscriptions;
  }

  /**
   * Evaluate inscription rules for a single position
   */
  private evaluateRules(
    position: CouncilPosition,
    drift: DriftEvaluation | undefined,
    synthesisVerdict: IracVerdict | null,
    priorDsrReferenced: boolean,
    decisionId: string,
    now: string,
  ): DnaInscription[] {
    const inscriptions: DnaInscription[] = [];
    const iracText = `${position.irac.rule} ${position.irac.analysis}`.toLowerCase();

    // Rule 1: Verdict = OPPOSE → Doubt (✕, stage 3)
    if (position.irac.conclusion === "OPPOSE") {
      inscriptions.push({
        archetypeId: position.archetypeId,
        glyph: "✕",
        glyphName: "Doubt",
        stage: 3,
        reason: `${ARCHETYPE_CONFIGS[position.archetypeId].displayName} opposed the question`,
        decisionId,
        createdAt: now,
      });
    }

    // Rule 2: Verdict = ALIGNED + high confidence → Alignment modifier (◎)
    if (position.irac.conclusion === "ALIGNED" && position.irac.analysis.length > 100) {
      inscriptions.push({
        archetypeId: position.archetypeId,
        glyph: "◎",
        glyphName: "Alignment",
        stage: "modifier",
        reason: "Strong alignment confirmed with substantive analysis",
        decisionId,
        createdAt: now,
      });
    }

    // Rule 4: Previously drifted/rebellious, now aligned → Return (✦, stage 10)
    if (
      drift &&
      drift.classification === "redeemed"
    ) {
      inscriptions.push({
        archetypeId: position.archetypeId,
        glyph: "✦",
        glyphName: "Return",
        stage: 10,
        reason: `${ARCHETYPE_CONFIGS[position.archetypeId].displayName} has returned from drift — the Redemption Arc`,
        decisionId,
        createdAt: now,
      });
    }

    // Rule 5: IRAC cites violation/breach → Shadow modifier (🜁)
    if (/violation|breach|unconstitutional|illegal/.test(iracText)) {
      inscriptions.push({
        archetypeId: position.archetypeId,
        glyph: "🜁",
        glyphName: "Shadow",
        stage: "modifier",
        reason: "Constitutional violation cited in reasoning",
        decisionId,
        createdAt: now,
      });
    }

    // Rule 6: Verdict = ADD_CONTEXT → Ordeal (✧, stage 8)
    if (position.irac.conclusion === "ADD_CONTEXT") {
      inscriptions.push({
        archetypeId: position.archetypeId,
        glyph: "✧",
        glyphName: "Ordeal",
        stage: 8,
        reason: `${ARCHETYPE_CONFIGS[position.archetypeId].displayName} reframed — additional context needed`,
        decisionId,
        createdAt: now,
      });
    }

    // Rule 7: IRAC cites covenant/scroll/Law → Covenant modifier (✡)
    if (/covenant|scroll|law [iv]+|seven laws|immutable law/.test(iracText)) {
      inscriptions.push({
        archetypeId: position.archetypeId,
        glyph: "✡",
        glyphName: "Covenant",
        stage: "modifier",
        reason: "Covenant or Law cited in reasoning",
        decisionId,
        createdAt: now,
      });
    }

    // Rule 8: Decision references prior DSR → Commitment (≋, stage 5)
    if (priorDsrReferenced) {
      inscriptions.push({
        archetypeId: position.archetypeId,
        glyph: "≋",
        glyphName: "Commitment",
        stage: 5,
        reason: "Prior DSR precedent referenced",
        decisionId,
        createdAt: now,
      });
    }

    return inscriptions;
  }

  /**
   * Check for unanimous alignment → Reward (⊚, stage 9)
   * Called separately after all positions are evaluated.
   */
  inscribeUnanimous(
    positions: CouncilPosition[],
    decisionId: string,
  ): DnaInscription[] {
    const allAligned = positions.every(p => p.irac.conclusion === "ALIGNED");
    if (!allAligned || positions.length < 3) return [];

    const now = new Date().toISOString();
    const inscriptions: DnaInscription[] = [];

    for (const position of positions) {
      const inscription: DnaInscription = {
        archetypeId: position.archetypeId,
        glyph: "⊚",
        glyphName: "Reward",
        stage: 9,
        reason: "Unanimous alignment across all council positions",
        decisionId,
        createdAt: now,
      };
      inscriptions.push(inscription);
      this.recordInscription(inscription);
    }

    return inscriptions;
  }

  /**
   * Record an inscription in the archetype's strand
   */
  private recordInscription(inscription: DnaInscription): void {
    const existing = this.inscriptions.get(inscription.archetypeId) || [];
    existing.push(inscription);
    this.inscriptions.set(inscription.archetypeId, existing);
  }

  /**
   * Analyze an archetype's Hero's Journey (Section 12)
   */
  analyzeJourney(archetypeId: ArchetypeId): DecisionDnaAnalysis {
    const allInscriptions = this.inscriptions.get(archetypeId) || [];

    // Extract stage numbers (filter out modifiers)
    const journeyPath = allInscriptions
      .filter(i => typeof i.stage === "number")
      .map(i => i.stage as number);

    const uniqueStages = new Set(journeyPath);
    const currentStage = journeyPath.length > 0 ? journeyPath[journeyPath.length - 1]! : 0;
    const highWaterMark = journeyPath.length > 0 ? Math.max(...journeyPath) : 0;

    // Check for regression (last 3 stages trending down)
    let isRegressing = false;
    let regressionDepth = 0;
    if (journeyPath.length >= 3) {
      const last3 = journeyPath.slice(-3);
      isRegressing = last3[0]! > last3[1]! && last3[1]! > last3[2]!;
      if (isRegressing) {
        regressionDepth = last3[0]! - last3[2]!;
      }
    }

    // Check for stagnation (same stage 5+ times)
    let isStagnant = false;
    let stagnationCount = 0;
    if (journeyPath.length >= 5) {
      const lastStage = journeyPath[journeyPath.length - 1]!;
      stagnationCount = journeyPath.slice(-5).filter(s => s === lastStage).length;
      isStagnant = stagnationCount >= 5;
    }

    // Active modifiers
    const activeModifiers = allInscriptions
      .filter(i => i.stage === "modifier")
      .slice(-5)
      .map(i => i.glyphName);

    return {
      archetypeId,
      currentStage,
      highWaterMark,
      journeyCompletion: uniqueStages.size / 12,
      hasReturned: highWaterMark >= 10,
      isRegressing,
      regressionDepth,
      isStagnant,
      stagnationCount,
      activeModifiers,
      journeyPath,
      lastProgressionAt: allInscriptions.length > 0
        ? allInscriptions[allInscriptions.length - 1]!.createdAt
        : null,
    };
  }

  /**
   * Get the DNA strand for an archetype (glyph sequence)
   */
  getStrand(archetypeId: ArchetypeId): string {
    const allInscriptions = this.inscriptions.get(archetypeId) || [];
    return allInscriptions.map(i => i.glyph).join("→");
  }

  /**
   * Get all inscriptions for an archetype
   */
  getInscriptions(archetypeId: ArchetypeId): DnaInscription[] {
    return this.inscriptions.get(archetypeId) || [];
  }

  /**
   * Get journey analysis for all archetypes
   */
  analyzeAllJourneys(): DecisionDnaAnalysis[] {
    const archetypeIds: ArchetypeId[] = [
      "operator", "empath", "explorer", "strategist", "anchor", "sentinel",
      "oracle", "arbiter", "seer", "synthesizer", "mediator", "chronicler",
    ];
    return archetypeIds.map(id => this.analyzeJourney(id));
  }

  /**
   * Stats
   */
  stats() {
    let totalInscriptions = 0;
    const byArchetype: Record<string, number> = {};
    const byGlyph: Record<string, number> = {};

    for (const [archetypeId, inscriptions] of this.inscriptions.entries()) {
      totalInscriptions += inscriptions.length;
      byArchetype[archetypeId] = inscriptions.length;
      for (const i of inscriptions) {
        byGlyph[i.glyphName] = (byGlyph[i.glyphName] || 0) + 1;
      }
    }

    return { totalInscriptions, byArchetype, byGlyph };
  }
}

// Singleton
export const dnaService = new DecisionDNAService();
