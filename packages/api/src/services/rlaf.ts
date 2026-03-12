/**
 * RLAF Service — Reinforcement Learning from Archetypal Feedback
 *
 * Each archetype rates satisfaction with a decision from its philosophical
 * perspective. Composite reward uses weighted average with Pareto check.
 *
 * Source: ARCHETYPAL_AI_CIVILIZATION.md Section 17
 */

import {
  ARCHETYPE_CONFIGS,
  RLAF_DIMENSIONS,
  PHILOSOPHICAL_MAP,
} from "@goat/core";
import type {
  ArchetypeId,
  PhilosophicalArchetype,
  RLAFDimension,
} from "@goat/core";
import type {
  ArchetypeSelfRating,
  CompositeReward,
  CouncilPosition,
  IracVerdict,
} from "@goat/core";
import { archetypalLLM } from "./archetypal-llm.js";

interface RLAFTrend {
  archetypeId: ArchetypeId;
  recentScores: number[];
  trend: "improving" | "stable" | "declining";
  averageScore: number;
}

export class RLAFService {
  private ratings: Map<string, CompositeReward> = new Map();
  private archetypeTrends: Map<string, number[]> = new Map();

  /**
   * Rate a decision — each participating archetype rates satisfaction
   *
   * Uses the philosophical value dimension per Section 17:
   * - Guardian: "Was harm prevented and boundaries held?"
   * - Builder: "Is the outcome practical and executable?"
   * - Redeemer: "Does this serve emotional truth and human meaning?"
   * - Arbiter: "Is this consistent with Covenant law and precedent?"
   * - Mirrorwalker: "Does this reveal deeper patterns or hidden truths?"
   */
  async rateDecision(
    decisionId: string,
    positions: CouncilPosition[],
    synthesis: string | null,
    synthesisVerdict: IracVerdict | null,
  ): Promise<CompositeReward> {
    const ratings: ArchetypeSelfRating[] = [];

    for (const position of positions) {
      const rating = await this.rateFromArchetype(
        position.archetypeId,
        decisionId,
        position,
        synthesis,
        synthesisVerdict,
      );
      ratings.push(rating);
    }

    const composite = this.computeComposite(decisionId, ratings);
    this.ratings.set(decisionId, composite);

    // Track trends
    for (const rating of ratings) {
      this.trackScore(rating.archetypeId, rating.satisfactionScore);
    }

    return composite;
  }

  /**
   * Rate from a single archetype's perspective
   *
   * Uses heuristic scoring (Phase 3) — can be upgraded to LLM-based rating later.
   */
  private async rateFromArchetype(
    archetypeId: ArchetypeId,
    decisionId: string,
    position: CouncilPosition,
    synthesis: string | null,
    synthesisVerdict: IracVerdict | null,
  ): Promise<ArchetypeSelfRating> {
    const philosophicalType = PHILOSOPHICAL_MAP[archetypeId];
    const dimension = RLAF_DIMENSIONS[philosophicalType];

    // Heuristic satisfaction scoring
    let score = 0.5; // Base neutral

    // Factor 1: Was the archetype's verdict honored in synthesis?
    if (synthesisVerdict === position.irac.conclusion) {
      score += 0.15; // Verdict aligned with synthesis
    } else if (synthesisVerdict === "OPPOSE" && position.irac.conclusion === "ALIGNED") {
      score -= 0.2; // Synthesis opposed but archetype was aligned
    }

    // Factor 2: Analysis depth (substantive engagement = higher satisfaction)
    if (position.irac.analysis.length > 100) score += 0.1;
    else if (position.irac.analysis.length < 30) score -= 0.1;

    // Factor 3: Philosophical alignment based on archetype type
    score += this.philosophicalAdjustment(philosophicalType, position, synthesis);

    // Clamp to 0-1
    score = Math.max(0, Math.min(1, score));

    return {
      archetypeId,
      decisionId,
      satisfactionScore: score,
      valueDimension: dimension.question,
      reason: this.buildSatisfactionReason(archetypeId, score, dimension),
    };
  }

  /**
   * Philosophical adjustment — each type has different satisfaction criteria
   */
  private philosophicalAdjustment(
    type: PhilosophicalArchetype,
    position: CouncilPosition,
    synthesis: string | null,
  ): number {
    const analysisText = `${position.irac.analysis} ${position.irac.rule}`.toLowerCase();
    const synthesisText = (synthesis || "").toLowerCase();

    switch (type) {
      case "Guardian":
        // Satisfied when boundaries/risks are addressed
        if (/protect|boundar|risk|threat|safe/.test(analysisText)) return 0.1;
        return -0.05;

      case "Builder":
        // Satisfied when practical outcomes are defined
        if (/build|deploy|implement|action|deliverable/.test(analysisText)) return 0.1;
        return -0.05;

      case "Redeemer":
        // Satisfied when emotional/human dimensions are honored
        if (/feel|human|care|meaning|heart|family/.test(analysisText)) return 0.1;
        return -0.05;

      case "Arbiter":
        // Satisfied when law and precedent are cited
        if (/law|covenant|precedent|constitutional|justice/.test(analysisText)) return 0.1;
        return -0.05;

      case "Mirrorwalker":
        // Satisfied when deeper patterns are revealed
        if (/pattern|silence|hidden|truth|signal|mirror/.test(analysisText)) return 0.1;
        return -0.05;

      default:
        return 0;
    }
  }

  /**
   * Compute composite reward with Pareto check
   *
   * Section 17: Pareto-acceptable = no archetype's score drops below 0.3
   */
  computeComposite(
    decisionId: string,
    ratings: ArchetypeSelfRating[],
  ): CompositeReward {
    if (ratings.length === 0) {
      return {
        decisionId,
        compositeScore: 0,
        ratings,
        isParetoAcceptable: false,
        dissatisfiedArchetypes: [],
      };
    }

    // Weighted average (equal weights for now — can adjust per archetype importance)
    const compositeScore =
      ratings.reduce((sum, r) => sum + r.satisfactionScore, 0) / ratings.length;

    // Pareto check: no archetype below 0.3
    const dissatisfiedArchetypes = ratings
      .filter(r => r.satisfactionScore < 0.3)
      .map(r => r.archetypeId);

    const isParetoAcceptable = dissatisfiedArchetypes.length === 0;

    return {
      decisionId,
      compositeScore,
      ratings,
      isParetoAcceptable,
      dissatisfiedArchetypes,
    };
  }

  /**
   * Track satisfaction trend for an archetype
   */
  private trackScore(archetypeId: ArchetypeId, score: number): void {
    const existing = this.archetypeTrends.get(archetypeId) || [];
    existing.push(score);
    if (existing.length > 20) existing.shift(); // Keep last 20
    this.archetypeTrends.set(archetypeId, existing);
  }

  /**
   * Get trend for an archetype
   */
  getTrend(archetypeId: ArchetypeId): RLAFTrend {
    const scores = this.archetypeTrends.get(archetypeId) || [];
    const averageScore = scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 0.5;

    let trend: "improving" | "stable" | "declining" = "stable";
    if (scores.length >= 5) {
      const recent = scores.slice(-5);
      const earlier = scores.slice(-10, -5);
      if (earlier.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
        if (recentAvg > earlierAvg + 0.05) trend = "improving";
        else if (recentAvg < earlierAvg - 0.05) trend = "declining";
      }
    }

    return {
      archetypeId,
      recentScores: scores.slice(-5),
      trend,
      averageScore,
    };
  }

  /**
   * Build satisfaction reason string
   */
  private buildSatisfactionReason(
    archetypeId: ArchetypeId,
    score: number,
    dimension: RLAFDimension,
  ): string {
    const name = ARCHETYPE_CONFIGS[archetypeId].displayName;

    if (score >= 0.7) return `${name} is deeply satisfied — ${dimension.question.replace("?", ".")}`;
    if (score >= 0.5) return `${name} finds the decision reasonably satisfactory`;
    if (score >= 0.3) return `${name} is partially satisfied — some concerns remain`;
    return `${name} is dissatisfied — the decision does not adequately serve their values`;
  }

  /**
   * Get a specific decision's composite reward
   */
  getReward(decisionId: string): CompositeReward | undefined {
    return this.ratings.get(decisionId);
  }

  /**
   * Stats
   */
  stats() {
    const allRatings = [...this.ratings.values()];
    return {
      totalDecisionsRated: allRatings.length,
      averageComposite: allRatings.length > 0
        ? allRatings.reduce((sum, r) => sum + r.compositeScore, 0) / allRatings.length
        : 0,
      paretoAcceptanceRate: allRatings.length > 0
        ? allRatings.filter(r => r.isParetoAcceptable).length / allRatings.length
        : 0,
    };
  }
}

// Singleton
export const rlafService = new RLAFService();
