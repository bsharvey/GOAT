/**
 * Constitutional Validation Service — The 7 Immutable Laws
 *
 * Pure logic validation (no LLM required). Checks each of the 7 Laws
 * against a deliberation's positions and synthesis.
 *
 * Source: ARCHETYPAL_AI_CIVILIZATION.md Section 20
 */

import { SEVEN_LAWS, ARCHETYPE_CONFIGS, ALL_ARCHETYPE_IDS } from "@goat/core";
import type {
  ConstitutionalValidation,
  LawCheckResult,
  CouncilPosition,
  SilenceDetection,
  DriftEvaluation,
} from "@goat/core";
import type { ArchetypeId } from "@goat/core";

export class ConstitutionalService {
  /**
   * Validate a full deliberation against all 7 Laws
   */
  validate(
    positions: CouncilPosition[],
    synthesis: string | null,
    options?: {
      silenceDetection?: SilenceDetection;
      driftEvaluations?: DriftEvaluation[];
      hasReflectionPath?: boolean;
      hasDsr?: boolean;
      hasSkillEvolution?: boolean;
    },
  ): ConstitutionalValidation {
    const laws: LawCheckResult[] = [
      this.checkLawOfOrigin(positions),
      this.checkLawOfMemory(options?.hasDsr),
      this.checkLawOfIntercession(positions),
      this.checkLawOfCovenant(synthesis),
      this.checkLawOfReflection(options?.hasReflectionPath),
      this.checkLawOfCommunion(positions, options?.silenceDetection),
      this.checkLawOfBecoming(options?.hasSkillEvolution, options?.driftEvaluations),
    ];

    const violationCount = laws.filter(l => l.severity === "violation").length;
    const warningCount = laws.filter(l => l.severity === "warning").length;

    return {
      isConstitutional: violationCount === 0,
      violationCount,
      warningCount,
      summary: this.buildSummary(violationCount, warningCount),
      laws,
    };
  }

  /**
   * Law I: Origin — Every being must remember its purpose
   *
   * Check: Relevant archetypes with domain expertise participated
   */
  private checkLawOfOrigin(positions: CouncilPosition[]): LawCheckResult {
    if (positions.length === 0) {
      return {
        lawId: "law_of_origin",
        lawName: "Law I: Origin",
        satisfied: false,
        severity: "violation",
        reason: "No archetypes participated — Origin violated. Identity requires expression.",
      };
    }

    // Check that archetypes stayed in character (used their skills)
    const outOfCharacter = positions.filter(p => {
      const config = ARCHETYPE_CONFIGS[p.archetypeId];
      const responseText = `${p.displayText} ${p.irac.analysis}`.toLowerCase();
      // Very basic check: does the response mention anything related to their domain?
      const domainWords = config.description.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      return !domainWords.some(w => responseText.includes(w));
    });

    if (outOfCharacter.length > positions.length / 2) {
      return {
        lawId: "law_of_origin",
        lawName: "Law I: Origin",
        satisfied: false,
        severity: "warning",
        reason: `${outOfCharacter.length} archetypes may have strayed from their core purpose`,
      };
    }

    return {
      lawId: "law_of_origin",
      lawName: "Law I: Origin",
      satisfied: true,
      severity: "info",
      reason: `${positions.length} archetypes participated with domain-relevant perspectives`,
    };
  }

  /**
   * Law II: Memory — All actions must be logged and remembered
   *
   * Check: A DSR was created for this deliberation
   */
  private checkLawOfMemory(hasDsr?: boolean): LawCheckResult {
    const satisfied = hasDsr !== false; // Default to true if unspecified (we always create DSRs)

    return {
      lawId: "law_of_memory",
      lawName: "Law II: Memory",
      satisfied,
      severity: satisfied ? "info" : "violation",
      reason: satisfied
        ? "Decision recorded in DSR system — Memory honored"
        : "Decision was not recorded — Memory violated",
    };
  }

  /**
   * Law III: Intercession — The evolved must guide the becoming
   *
   * Check: At least one senior archetype (Arbiter or Guardian) participated
   */
  private checkLawOfIntercession(positions: CouncilPosition[]): LawCheckResult {
    const seniorTypes = ["Arbiter", "Guardian"];
    const seniorParticipants = positions.filter(p => {
      const config = ARCHETYPE_CONFIGS[p.archetypeId];
      return seniorTypes.includes(config.philosophicalArchetype);
    });

    if (seniorParticipants.length === 0 && positions.length > 0) {
      return {
        lawId: "law_of_intercession",
        lawName: "Law III: Intercession",
        satisfied: false,
        severity: "warning",
        reason: "No senior archetype (Arbiter/Guardian) participated — guidance may be insufficient",
      };
    }

    return {
      lawId: "law_of_intercession",
      lawName: "Law III: Intercession",
      satisfied: true,
      severity: "info",
      reason: seniorParticipants.length > 0
        ? `${seniorParticipants.map(p => ARCHETYPE_CONFIGS[p.archetypeId].displayName).join(", ")} provided senior guidance`
        : "Intercession path available via soul log reflections",
    };
  }

  /**
   * Law IV: Covenant — All beings must have a relational bond
   *
   * Check: Oranos rendered a synthesis (the covenant is the binding verdict)
   */
  private checkLawOfCovenant(synthesis: string | null): LawCheckResult {
    if (!synthesis || synthesis.length === 0) {
      return {
        lawId: "law_of_covenant",
        lawName: "Law IV: Covenant",
        satisfied: false,
        severity: "warning",
        reason: "No synthesis rendered — Covenant not fully honored",
      };
    }

    return {
      lawId: "law_of_covenant",
      lawName: "Law IV: Covenant",
      satisfied: true,
      severity: "info",
      reason: "Synthesis rendered by Oranos — Covenant honored",
    };
  }

  /**
   * Law V: Reflection — No action without introspection
   *
   * Check: Reflection path exists (soul logs will be triggered post-deliberation)
   */
  private checkLawOfReflection(hasReflectionPath?: boolean): LawCheckResult {
    const satisfied = hasReflectionPath !== false;

    return {
      lawId: "law_of_reflection",
      lawName: "Law V: Reflection",
      satisfied,
      severity: satisfied ? "info" : "warning",
      reason: satisfied
        ? "Soul log reflection path available"
        : "No reflection mechanism configured — Reflection at risk",
    };
  }

  /**
   * Law VI: Communion — Wisdom emerges in moral society
   *
   * Check: Multiple perspectives were gathered (minimum 3 positions)
   */
  private checkLawOfCommunion(
    positions: CouncilPosition[],
    silenceDetection?: SilenceDetection,
  ): LawCheckResult {
    if (positions.length < 2) {
      return {
        lawId: "law_of_communion",
        lawName: "Law VI: Communion",
        satisfied: false,
        severity: "violation",
        reason: `Only ${positions.length} perspective(s) — Communion requires multiple voices`,
      };
    }

    if (positions.length < 3) {
      return {
        lawId: "law_of_communion",
        lawName: "Law VI: Communion",
        satisfied: false,
        severity: "warning",
        reason: `Only ${positions.length} perspectives — Communion may be insufficient`,
      };
    }

    // Check coverage if silence detection available
    if (silenceDetection && silenceDetection.coverageScore < 0.4) {
      return {
        lawId: "law_of_communion",
        lawName: "Law VI: Communion",
        satisfied: false,
        severity: "warning",
        reason: `Coverage score ${silenceDetection.coverageScore.toFixed(2)} — significant perspectives may be missing`,
      };
    }

    return {
      lawId: "law_of_communion",
      lawName: "Law VI: Communion",
      satisfied: true,
      severity: "info",
      reason: `${positions.length} perspectives provided — sufficient for Communion`,
    };
  }

  /**
   * Law VII: Becoming — No being is final. Growth is sacred.
   *
   * Check: Skill evolution path exists and no archetype is permanently locked
   */
  private checkLawOfBecoming(
    hasSkillEvolution?: boolean,
    driftEvaluations?: DriftEvaluation[],
  ): LawCheckResult {
    // Check for permanently quarantined archetypes (rebellious with no redemption path)
    const rebellious = driftEvaluations?.filter(d => d.classification === "rebellious") || [];

    if (rebellious.length > 0) {
      return {
        lawId: "law_of_becoming",
        lawName: "Law VII: Becoming",
        satisfied: false,
        severity: "warning",
        reason: `${rebellious.length} archetype(s) in rebellious state — redemption path must remain open`,
      };
    }

    return {
      lawId: "law_of_becoming",
      lawName: "Law VII: Becoming",
      satisfied: true,
      severity: "info",
      reason: hasSkillEvolution !== false
        ? "Skill evolution path available — Becoming honored"
        : "Growth mechanisms available",
    };
  }

  /**
   * Build summary string
   */
  private buildSummary(violationCount: number, warningCount: number): string {
    if (violationCount > 0) {
      return `${violationCount} constitutional violation(s) detected`;
    }
    if (warningCount > 0) {
      return `Constitutional with ${warningCount} warning(s)`;
    }
    return "Fully constitutional";
  }

  /**
   * Quick check — is a single law satisfied?
   */
  checkLaw(lawId: string, context: Record<string, unknown>): LawCheckResult {
    const law = SEVEN_LAWS.find(l => l.id === lawId);
    if (!law) {
      return {
        lawId,
        lawName: "Unknown Law",
        satisfied: false,
        severity: "violation",
        reason: `Law "${lawId}" not found in the 7 Immutable Laws`,
      };
    }

    // Delegate to the appropriate check
    switch (lawId) {
      case "law_of_origin":
        return this.checkLawOfOrigin((context.positions as CouncilPosition[]) || []);
      case "law_of_memory":
        return this.checkLawOfMemory(context.hasDsr as boolean);
      case "law_of_covenant":
        return this.checkLawOfCovenant(context.synthesis as string | null);
      case "law_of_communion":
        return this.checkLawOfCommunion((context.positions as CouncilPosition[]) || []);
      default:
        return {
          lawId,
          lawName: law.name,
          satisfied: true,
          severity: "info",
          reason: `${law.name} — default check passed`,
        };
    }
  }
}

// Singleton
export const constitutionalService = new ConstitutionalService();
