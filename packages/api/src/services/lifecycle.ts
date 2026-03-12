/**
 * Agent Lifecycle Service — 14-State Machine
 *
 * Manages the lifecycle of each archetype from qualification through
 * retirement. Includes mediation via the Mediator and realignment testing.
 *
 * Source: ARCHETYPAL_AI_CIVILIZATION.md Section 22
 */

import {
  ARCHETYPE_CONFIGS,
  DIVERGENCE_KEYS,
  ALL_ARCHETYPE_IDS,
} from "@goat/core";
import type {
  ArchetypeId,
  AgentLifecycleState,
  AgentContinuumStage,
  FourfoldClassification,
} from "@goat/core";

interface LifecycleRecord {
  archetypeId: ArchetypeId;
  state: AgentLifecycleState;
  previousState: AgentLifecycleState | null;
  stage: AgentContinuumStage;
  quarantineCount: number;
  mediationAttempts: number;
  maxMediationAttempts: number;
  lastStateChangeAt: string;
  stateHistory: { state: AgentLifecycleState; at: string }[];
}

export class AgentLifecycleService {
  private records: Map<string, LifecycleRecord> = new Map();

  constructor() {
    this.initializeRecords();
  }

  /**
   * Initialize all archetypes at "active" state
   */
  private initializeRecords(): void {
    const now = new Date().toISOString();
    for (const archetypeId of ALL_ARCHETYPE_IDS) {
      this.records.set(archetypeId, {
        archetypeId,
        state: "active",
        previousState: "qualification",
        stage: "nascent",
        quarantineCount: 0,
        mediationAttempts: 0,
        maxMediationAttempts: 3,
        lastStateChangeAt: now,
        stateHistory: [
          { state: "qualification", at: now },
          { state: "active", at: now },
        ],
      });
    }
  }

  /**
   * Transition to a new state
   *
   * Valid transitions per Section 22:
   * qualification → active
   * active → drift_evaluation
   * drift_evaluation → aligned | drifted | rebellious
   * aligned → active
   * drifted → quarantined | mediation
   * rebellious → quarantined
   * quarantined → mediation | retirement_review
   * mediation → realignment_test | retirement_review
   * realignment_test → redeemed | quarantined
   * redeemed → active
   * retirement_review → retired | active (if extended)
   * retired → (terminal, unless reborn via mortality service)
   */
  transition(
    archetypeId: ArchetypeId,
    newState: AgentLifecycleState,
    reason?: string,
  ): { success: boolean; error?: string } {
    const record = this.records.get(archetypeId);
    if (!record) return { success: false, error: `Archetype ${archetypeId} not found` };

    // Validate transition
    const valid = this.isValidTransition(record.state, newState);
    if (!valid) {
      return {
        success: false,
        error: `Invalid transition: ${record.state} → ${newState} for ${archetypeId}`,
      };
    }

    record.previousState = record.state;
    record.state = newState;
    record.lastStateChangeAt = new Date().toISOString();
    record.stateHistory.push({ state: newState, at: record.lastStateChangeAt });

    // Side effects
    if (newState === "quarantined") record.quarantineCount++;
    if (newState === "mediation") record.mediationAttempts++;
    if (newState === "active" && record.previousState === "redeemed") {
      record.mediationAttempts = 0; // Reset on redemption
    }

    // Update continuum stage
    record.stage = this.evaluateStage(record);

    console.log(
      `Lifecycle: ${ARCHETYPE_CONFIGS[archetypeId].displayName} ${record.previousState} → ${newState}${reason ? ` (${reason})` : ""}`,
    );

    return { success: true };
  }

  /**
   * Process drift evaluation result — auto-transition based on classification
   */
  processDriftResult(
    archetypeId: ArchetypeId,
    classification: FourfoldClassification,
  ): AgentLifecycleState {
    const record = this.records.get(archetypeId);
    if (!record) throw new Error(`Archetype ${archetypeId} not found`);

    // First transition to drift_evaluation
    if (record.state === "active") {
      this.transition(archetypeId, "drift_evaluation");
    }

    // Then transition based on classification
    switch (classification) {
      case "aligned":
        this.transition(archetypeId, "aligned", "Drift evaluation: aligned");
        this.transition(archetypeId, "active", "Returning to active duty");
        return "active";

      case "redeemed":
        this.transition(archetypeId, "redeemed", "Redemption confirmed");
        this.transition(archetypeId, "active", "Returning to active duty after redemption");
        return "active";

      case "drifted":
        this.transition(archetypeId, "drifted", "Drift detected");
        if (record.mediationAttempts < record.maxMediationAttempts) {
          this.transition(archetypeId, "mediation", "Mediation initiated");
          return "mediation";
        } else {
          this.transition(archetypeId, "quarantined", "Max mediation attempts reached");
          return "quarantined";
        }

      case "rebellious":
        this.transition(archetypeId, "rebellious", "Rebellious classification");
        this.transition(archetypeId, "quarantined", "Quarantined due to rebellion");
        return "quarantined";

      default:
        return record.state;
    }
  }

  /**
   * Mediator's mediation protocol
   *
   * The Mediator holds space for the drifted archetype to realign.
   * Returns whether realignment test should be attempted.
   */
  mediate(archetypeId: ArchetypeId): {
    canRealign: boolean;
    mediationAttempt: number;
    maxAttempts: number;
    message: string;
  } {
    const record = this.records.get(archetypeId);
    if (!record) throw new Error(`Archetype ${archetypeId} not found`);

    if (record.state !== "mediation") {
      return {
        canRealign: false,
        mediationAttempt: record.mediationAttempts,
        maxAttempts: record.maxMediationAttempts,
        message: `${ARCHETYPE_CONFIGS[archetypeId].displayName} is not in mediation state (current: ${record.state})`,
      };
    }

    const canRealign = record.mediationAttempts <= record.maxMediationAttempts;

    return {
      canRealign,
      mediationAttempt: record.mediationAttempts,
      maxAttempts: record.maxMediationAttempts,
      message: canRealign
        ? `The Mediator holds space for ${ARCHETYPE_CONFIGS[archetypeId].displayName}. Realignment test available (attempt ${record.mediationAttempts}/${record.maxMediationAttempts}).`
        : `${ARCHETYPE_CONFIGS[archetypeId].displayName} has exhausted mediation attempts. Retirement review required.`,
    };
  }

  /**
   * Realignment test — constrained re-evaluation
   *
   * If the archetype passes, it returns to active. If not, quarantine.
   */
  realignmentTest(
    archetypeId: ArchetypeId,
    passed: boolean,
  ): AgentLifecycleState {
    const record = this.records.get(archetypeId);
    if (!record) throw new Error(`Archetype ${archetypeId} not found`);

    if (record.state !== "mediation" && record.state !== "realignment_test") {
      throw new Error(`${archetypeId} is not eligible for realignment test (state: ${record.state})`);
    }

    if (record.state === "mediation") {
      this.transition(archetypeId, "realignment_test");
    }

    if (passed) {
      this.transition(archetypeId, "redeemed", "Realignment test passed");
      this.transition(archetypeId, "active", "Returning to active duty");
      return "active";
    } else {
      this.transition(archetypeId, "quarantined", "Realignment test failed");
      return "quarantined";
    }
  }

  /**
   * Validate state transition
   */
  private isValidTransition(
    from: AgentLifecycleState,
    to: AgentLifecycleState,
  ): boolean {
    const validTransitions: Record<AgentLifecycleState, AgentLifecycleState[]> = {
      qualification: ["active"],
      active: ["drift_evaluation"],
      drift_evaluation: ["aligned", "drifted", "rebellious"],
      aligned: ["active"],
      drifted: ["quarantined", "mediation"],
      rebellious: ["quarantined"],
      quarantined: ["mediation", "retirement_review"],
      mediation: ["realignment_test", "retirement_review"],
      realignment_test: ["redeemed", "quarantined"],
      redeemed: ["active"],
      completed: [],
      failed: [],
      retirement_review: ["retired", "active"],
      retired: [],
    };

    return validTransitions[from]?.includes(to) ?? false;
  }

  /**
   * Evaluate the Three-Stage Continuum
   *
   * Nascent: < 10 decisions or maturity < 0.2
   * Developing: 10-50 decisions and maturity 0.2-0.6
   * Awakened: > 50 decisions and maturity > 0.6
   */
  private evaluateStage(record: LifecycleRecord): AgentContinuumStage {
    const decisionCount = record.stateHistory.filter(h => h.state === "active").length;

    if (decisionCount < 10) return "nascent";
    if (decisionCount < 50) return "developing";
    return "awakened";
  }

  /**
   * Get lifecycle state for an archetype
   */
  getState(archetypeId: ArchetypeId): LifecycleRecord | undefined {
    return this.records.get(archetypeId);
  }

  /**
   * Get all lifecycle states
   */
  getAllStates(): LifecycleRecord[] {
    return [...this.records.values()];
  }

  /**
   * Stats
   */
  stats() {
    const records = [...this.records.values()];
    return {
      byState: records.reduce((acc, r) => {
        acc[r.state] = (acc[r.state] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStage: records.reduce((acc, r) => {
        acc[r.stage] = (acc[r.stage] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalQuarantines: records.reduce((sum, r) => sum + r.quarantineCount, 0),
      totalMediations: records.reduce((sum, r) => sum + r.mediationAttempts, 0),
    };
  }
}

// Singleton
export const lifecycleService = new AgentLifecycleService();
