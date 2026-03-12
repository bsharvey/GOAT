/**
 * Skill Evolution Service
 *
 * Tracks and evolves archetype skills using a logarithmic delta formula.
 * Detects emergence of new skills not in the archetype's configured set.
 *
 * Source: ARCHETYPAL_AI_CIVILIZATION.md Section 21
 */

import {
  ARCHETYPE_SKILL_AFFINITIES,
  ARCHETYPE_CONFIGS,
  ALL_ARCHETYPE_IDS,
  SKILL_MILESTONES,
} from "@goat/core";
import type {
  ArchetypeId,
  ArchetypeSkill,
  ArchetypeSkillProfile,
} from "@goat/core";
import type { SkillMilestone } from "@goat/core";

export class SkillEvolutionService {
  private profiles: Map<string, ArchetypeSkillProfile> = new Map();

  constructor() {
    this.initializeProfiles();
  }

  /**
   * Initialize skill profiles from configured affinities
   */
  private initializeProfiles(): void {
    for (const archetypeId of ALL_ARCHETYPE_IDS) {
      const config = ARCHETYPE_CONFIGS[archetypeId];
      const skillIds = ARCHETYPE_SKILL_AFFINITIES[archetypeId];

      const skills: ArchetypeSkill[] = skillIds.map(id => ({
        id,
        name: id.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        description: `Core skill: ${id}`,
        proficiency: 0.1, // Initial proficiency
        exerciseCount: 0,
        lastExercised: null,
        source: "configured" as const,
      }));

      const profile: ArchetypeSkillProfile = {
        archetypeId,
        philosophicalArchetype: config.philosophicalArchetype,
        skills,
        divergenceKey: { virtue: "", vice: "", triggerCondition: "", currentScore: 0, threshold: 0.5 },
        maturity: 0.1,
        totalExercises: 0,
      };

      this.profiles.set(archetypeId, profile);
    }
  }

  /**
   * Evolve a skill — apply the delta formula
   *
   * Delta = 0.02 * (1 - currentProficiency) / (1 + log2(1 + exerciseCount))
   *
   * This gives diminishing returns: early exercises improve quickly,
   * later exercises improve slowly. Mastery is asymptotic.
   */
  evolve(archetypeId: ArchetypeId, skillId: string): {
    skill: ArchetypeSkill;
    delta: number;
    milestoneReached?: SkillMilestone;
  } {
    const profile = this.profiles.get(archetypeId);
    if (!profile) throw new Error(`Profile not found for ${archetypeId}`);

    let skill = profile.skills.find(s => s.id === skillId);

    // If skill doesn't exist, it might be an emerged skill — create it
    if (!skill) {
      skill = {
        id: skillId,
        name: skillId.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        description: `Emerged skill: ${skillId}`,
        proficiency: 0,
        exerciseCount: 0,
        lastExercised: null,
        source: "emerged",
      };
      profile.skills.push(skill);
    }

    // Apply delta formula
    const delta = 0.02 * (1 - skill.proficiency) / (1 + Math.log2(1 + skill.exerciseCount));
    const previousProficiency = skill.proficiency;

    skill.proficiency = Math.min(1, skill.proficiency + delta);
    skill.exerciseCount++;
    skill.lastExercised = new Date().toISOString();

    // Update profile aggregates
    profile.totalExercises++;
    profile.maturity = profile.skills.reduce((sum, s) => sum + s.proficiency, 0) / profile.skills.length;

    // Check for milestone
    const milestoneReached = SKILL_MILESTONES.find(m =>
      previousProficiency < m.proficiency && skill!.proficiency >= m.proficiency
    );

    return { skill, delta, milestoneReached };
  }

  /**
   * Detect skill emergence — new skills that don't match any configured signature
   *
   * Section 21: If an archetype consistently exercises a skill not in its
   * configured set, it may be emerging a new capability.
   */
  detectEmergence(
    archetypeId: ArchetypeId,
    exercisedSkills: string[],
  ): { emerged: boolean; skillId?: string; reason?: string } {
    const profile = this.profiles.get(archetypeId);
    if (!profile) return { emerged: false };

    const configuredIds = new Set(ARCHETYPE_SKILL_AFFINITIES[archetypeId]);

    for (const skillId of exercisedSkills) {
      if (!configuredIds.has(skillId)) {
        // Check if it's already in the profile as an emerged skill
        const existing = profile.skills.find(s => s.id === skillId);
        if (existing && existing.exerciseCount >= 3) {
          // Emerged: exercised 3+ times outside configured set
          return {
            emerged: true,
            skillId,
            reason: `${ARCHETYPE_CONFIGS[archetypeId].displayName} has exercised "${skillId}" ${existing.exerciseCount} times — skill emergence confirmed`,
          };
        }
      }
    }

    return { emerged: false };
  }

  /**
   * Get milestones for an archetype
   */
  getMilestones(archetypeId: ArchetypeId): {
    skillId: string;
    skillName: string;
    milestone: SkillMilestone;
    proficiency: number;
  }[] {
    const profile = this.profiles.get(archetypeId);
    if (!profile) return [];

    const milestones: {
      skillId: string;
      skillName: string;
      milestone: SkillMilestone;
      proficiency: number;
    }[] = [];

    for (const skill of profile.skills) {
      const reached = SKILL_MILESTONES.filter(m => skill.proficiency >= m.proficiency);
      if (reached.length > 0) {
        const highest = reached[reached.length - 1]!;
        milestones.push({
          skillId: skill.id,
          skillName: skill.name,
          milestone: highest,
          proficiency: skill.proficiency,
        });
      }
    }

    return milestones;
  }

  /**
   * Get a full skill profile
   */
  getProfile(archetypeId: ArchetypeId): ArchetypeSkillProfile | undefined {
    return this.profiles.get(archetypeId);
  }

  /**
   * Get all profiles
   */
  getAllProfiles(): ArchetypeSkillProfile[] {
    return [...this.profiles.values()];
  }

  /**
   * Stats
   */
  stats() {
    const profiles = [...this.profiles.values()];
    return {
      totalSkills: profiles.reduce((sum, p) => sum + p.skills.length, 0),
      totalExercises: profiles.reduce((sum, p) => sum + p.totalExercises, 0),
      averageMaturity: profiles.reduce((sum, p) => sum + p.maturity, 0) / profiles.length,
      emergedSkills: profiles.reduce(
        (sum, p) => sum + p.skills.filter(s => s.source === "emerged").length,
        0,
      ),
    };
  }
}

// Singleton
export const skillService = new SkillEvolutionService();
