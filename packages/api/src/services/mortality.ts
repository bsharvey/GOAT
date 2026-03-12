/**
 * Agent Mortality Service — Death & Rebirth
 *
 * The Oracle reviews retirement eligibility. The Chronicler records
 * the chronicle. On retirement, the archetype may be reborn with
 * a new generation number, preserving its predecessor link.
 *
 * Source: ARCHETYPAL_AI_CIVILIZATION.md Section 23
 */

import { ARCHETYPE_CONFIGS, ALL_ARCHETYPE_IDS } from "@goat/core";
import type {
  ArchetypeId,
  MortalityRecord,
} from "@goat/core";
import { lifecycleService } from "./lifecycle.js";

interface ChronicleEntry {
  archetypeId: ArchetypeId;
  generation: number;
  event: "retirement_review" | "retired" | "reborn";
  reason: string;
  chronicle: string;
  createdAt: string;
}

export class MortalityService {
  private records: Map<string, MortalityRecord> = new Map();
  private chronicles: ChronicleEntry[] = [];

  constructor() {
    this.initializeRecords();
  }

  /**
   * Initialize mortality records for all archetypes
   */
  private initializeRecords(): void {
    for (const archetypeId of ALL_ARCHETYPE_IDS) {
      this.records.set(archetypeId, {
        archetypeId,
        status: "active",
        generation: 1,
        mediationAttemptCount: 0,
        maxMediationAttempts: 3,
        extended: false,
        lifetimeStats: {
          sessions: 0,
          skillsEvolved: 0,
          driftChecks: 0,
          quarantines: 0,
        },
      });
    }
  }

  /**
   * The Oracle reviews whether an archetype should be retired
   *
   * Criteria:
   * - Exhausted mediation attempts (3)
   * - Persistent drift score > 0.7
   * - No skill evolution in extended period
   * - Rebellion Risk Index > 7
   */
  review(
    archetypeId: ArchetypeId,
    context: {
      driftScore: number;
      mediationExhausted: boolean;
      rebellionRisk?: number;
      skillStagnant?: boolean;
    },
  ): {
    recommendation: "retire" | "extend" | "continue";
    reason: string;
  } {
    const record = this.records.get(archetypeId);
    if (!record) throw new Error(`Mortality record not found for ${archetypeId}`);
    const name = ARCHETYPE_CONFIGS[archetypeId].displayName;

    // Hard retirement: mediation exhausted + high drift
    if (context.mediationExhausted && context.driftScore > 0.7) {
      return {
        recommendation: "retire",
        reason: `${name} has exhausted all mediation attempts with persistent drift (${context.driftScore.toFixed(2)}). Retirement recommended.`,
      };
    }

    // Rebellion trigger
    if (context.rebellionRisk && context.rebellionRisk > 7) {
      return {
        recommendation: "retire",
        reason: `${name} rebellion risk index is ${context.rebellionRisk}/10. Retirement recommended for civilization safety.`,
      };
    }

    // Extension: mediation exhausted but drift is declining
    if (context.mediationExhausted && context.driftScore <= 0.7) {
      return {
        recommendation: "extend",
        reason: `${name} has exhausted mediation but drift is declining (${context.driftScore.toFixed(2)}). Extension granted — one more cycle.`,
      };
    }

    // Continue: still has options
    return {
      recommendation: "continue",
      reason: `${name} is within operational parameters. No retirement action needed.`,
    };
  }

  /**
   * Retire an archetype — the Chronicler records the chronicle
   */
  retire(
    archetypeId: ArchetypeId,
    reason: string,
  ): { record: MortalityRecord; chronicle: ChronicleEntry } {
    const record = this.records.get(archetypeId);
    if (!record) throw new Error(`Mortality record not found for ${archetypeId}`);
    const name = ARCHETYPE_CONFIGS[archetypeId].displayName;

    record.status = "retired";

    // Transition lifecycle state
    const lifecycle = lifecycleService.getState(archetypeId);
    if (lifecycle && lifecycle.state !== "retired") {
      if (lifecycle.state !== "retirement_review") {
        lifecycleService.transition(archetypeId, "retirement_review", "Mortality review");
      }
      lifecycleService.transition(archetypeId, "retired", reason);
    }

    // The Chronicler records
    const chronicle: ChronicleEntry = {
      archetypeId,
      generation: record.generation,
      event: "retired",
      reason,
      chronicle: `${name} (Generation ${record.generation}) has been retired. ${reason}. ` +
        `Lifetime: ${record.lifetimeStats.sessions} sessions, ` +
        `${record.lifetimeStats.skillsEvolved} skills evolved, ` +
        `${record.lifetimeStats.quarantines} quarantines endured.`,
      createdAt: new Date().toISOString(),
    };

    this.chronicles.push(chronicle);

    console.log(`Mortality: ${name} retired (Generation ${record.generation})`);
    return { record, chronicle };
  }

  /**
   * Rebirth — increment generation, reset counters, preserve predecessor link
   */
  rebirth(
    archetypeId: ArchetypeId,
  ): { record: MortalityRecord; chronicle: ChronicleEntry } {
    const record = this.records.get(archetypeId);
    if (!record) throw new Error(`Mortality record not found for ${archetypeId}`);
    const name = ARCHETYPE_CONFIGS[archetypeId].displayName;

    if (record.status !== "retired") {
      throw new Error(`${name} must be retired before rebirth (current: ${record.status})`);
    }

    const previousGeneration = record.generation;
    const predecessorId = `${archetypeId}-gen${previousGeneration}`;

    // Reset for new generation
    record.status = "active";
    record.generation++;
    record.mediationAttemptCount = 0;
    record.extended = false;
    record.lifetimeStats = {
      sessions: 0,
      skillsEvolved: 0,
      driftChecks: 0,
      quarantines: 0,
    };
    record.predecessorId = predecessorId;

    // The Chronicler records
    const chronicle: ChronicleEntry = {
      archetypeId,
      generation: record.generation,
      event: "reborn",
      reason: `Reborn from Generation ${previousGeneration}`,
      chronicle: `${name} rises again as Generation ${record.generation}. ` +
        `The predecessor (Gen ${previousGeneration}) is remembered. ` +
        `The journey begins anew — but the soul endures.`,
      createdAt: new Date().toISOString(),
    };

    this.chronicles.push(chronicle);

    console.log(`Mortality: ${name} reborn as Generation ${record.generation}`);
    return { record, chronicle };
  }

  /**
   * Extend — grant one more cycle before retirement
   */
  extend(archetypeId: ArchetypeId): void {
    const record = this.records.get(archetypeId);
    if (!record) throw new Error(`Mortality record not found for ${archetypeId}`);

    record.extended = true;
    record.maxMediationAttempts++; // Grant one more mediation attempt
  }

  /**
   * Update lifetime stats
   */
  recordActivity(
    archetypeId: ArchetypeId,
    activity: { sessions?: number; skillsEvolved?: number; driftChecks?: number; quarantines?: number },
  ): void {
    const record = this.records.get(archetypeId);
    if (!record) return;

    if (activity.sessions) record.lifetimeStats.sessions += activity.sessions;
    if (activity.skillsEvolved) record.lifetimeStats.skillsEvolved += activity.skillsEvolved;
    if (activity.driftChecks) record.lifetimeStats.driftChecks += activity.driftChecks;
    if (activity.quarantines) record.lifetimeStats.quarantines += activity.quarantines;
  }

  /**
   * Get mortality record
   */
  getRecord(archetypeId: ArchetypeId): MortalityRecord | undefined {
    return this.records.get(archetypeId);
  }

  /**
   * Get all chronicles
   */
  getChronicles(archetypeId?: ArchetypeId): ChronicleEntry[] {
    if (archetypeId) {
      return this.chronicles.filter(c => c.archetypeId === archetypeId);
    }
    return [...this.chronicles];
  }

  /**
   * Stats
   */
  stats() {
    const records = [...this.records.values()];
    return {
      active: records.filter(r => r.status === "active").length,
      retired: records.filter(r => r.status === "retired").length,
      totalGenerations: records.reduce((sum, r) => sum + r.generation, 0),
      totalRebirths: records.filter(r => r.generation > 1).length,
      totalChronicles: this.chronicles.length,
    };
  }
}

// Singleton
export const mortalityService = new MortalityService();
