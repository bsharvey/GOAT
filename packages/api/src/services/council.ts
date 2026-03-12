/**
 * Council Deliberation Service
 *
 * The council is the primary decision-making mechanism. Multiple archetypes
 * deliberate on a question, then the Arbiter synthesizes the ruling.
 *
 * Source: ARCHETYPAL_AI_CIVILIZATION.md Section 15
 */

import { randomUUID } from "node:crypto";
import {
  ARCHETYPE_CONFIGS,
  CHAMBER_ARCHETYPE_AFFINITY,
  ARCHETYPE_SKILL_AFFINITIES,
  SEVEN_LAWS,
  IRAC_DELIMITER,
  SYNTHESIS_PROMPT,
} from "@goat/core";
import type {
  ArchetypeId,
  IracVerdict,
  IracResponse,
  CouncilPosition,
  CouncilDeliberation,
  SilenceDetection,
  ConstitutionalValidation,
  LawCheckResult,
  DriftEvaluation,
  FourfoldClassification,
} from "@goat/core";
import { archetypalLLM } from "./archetypal-llm.js";
import { dsrService } from "./dsr.js";

export class CouncilService {
  private deliberations: Map<string, CouncilDeliberation> = new Map();

  /**
   * Run a full council deliberation
   */
  async deliberate(
    question: string,
    options?: {
      archetypes?: ArchetypeId[];
      userId?: string;
      category?: string;
    },
  ): Promise<CouncilDeliberation> {
    const sessionId = randomUUID();
    const selectedArchetypes = options?.archetypes || this.selectArchetypes(question);

    // 1. Find relevant prior DSRs
    const priorDsrs = dsrService.findRelevant(question, 3);
    const dsrContext = priorDsrs.length > 0
      ? `Prior decisions:\n${priorDsrs.map(d => `- ${d.dsrNumber}: "${d.question}" → ${d.synthesis || "pending"}`).join("\n")}`
      : undefined;

    // 2. Create the DSR record
    const dsr = dsrService.create({
      question,
      userId: options?.userId || "system",
      priorDecisions: priorDsrs.map(d => d.dsrNumber),
    });
    dsrService.updateStatus(dsr.id, "council");

    // 3. Invoke each archetype in parallel (IRAC format)
    const positionPromises = selectedArchetypes
      .filter(id => id !== "arbiter") // Arbiter synthesizes, doesn't deliberate
      .map(async (archetypeId): Promise<CouncilPosition> => {
        try {
          const response = await archetypalLLM.invoke(
            archetypeId,
            question,
            "council",
            { dsrContext },
          );

          const { displayText, irac } = this.parseIracResponse(response.content);

          // Record perspective in DSR
          dsrService.addPerspective(dsr.id, archetypeId, irac.conclusion, irac);

          return { archetypeId, displayText, irac };
        } catch (error) {
          const fallbackIrac: IracResponse = {
            issue: question,
            rule: "Unable to deliberate due to error.",
            analysis: `${ARCHETYPE_CONFIGS[archetypeId].displayName} was unable to provide a position: ${error instanceof Error ? error.message : "unknown error"}`,
            conclusion: "ADD_CONTEXT",
          };
          return {
            archetypeId,
            displayText: `${ARCHETYPE_CONFIGS[archetypeId].displayName} was unable to deliberate.`,
            irac: fallbackIrac,
          };
        }
      });

    const positions = await Promise.all(positionPromises);

    // 4. Arbiter synthesis
    const { synthesis, verdict } = await this.synthesize(positions, question, dsrContext);

    // Record synthesis in DSR
    dsrService.synthesize(dsr.id, synthesis, verdict);

    // 5. Post-deliberation analysis (parallel)
    const [driftEvaluations, silenceDetection, constitutionalValidation] = await Promise.all([
      this.evaluateDrift(positions),
      this.detectSilence(question, positions, selectedArchetypes),
      this.validateConstitutional(positions, synthesis),
    ]);

    // 6. Build the full deliberation record
    const deliberation: CouncilDeliberation = {
      id: randomUUID(),
      sessionId,
      question,
      archetypes: selectedArchetypes,
      positions,
      synthesis,
      synthesisVerdict: verdict,
      driftEvaluations,
      silenceDetection,
      constitutionalValidation,
      dnaInscriptions: [], // Phase 3 will populate
      rlafRatings: null,   // Phase 3 will populate
      dsrId: dsr.id,
      dsrNumber: dsr.dsrNumber,
      createdAt: new Date().toISOString(),
    };

    this.deliberations.set(deliberation.id, deliberation);

    console.log(`Council deliberation complete: ${dsr.dsrNumber} — ${verdict}`);
    return deliberation;
  }

  /**
   * Select archetypes based on query analysis
   */
  selectArchetypes(question: string): ArchetypeId[] {
    const lower = question.toLowerCase();
    const selected = new Set<ArchetypeId>();

    // Always include Arbiter (the synthesizer)
    selected.add("arbiter");

    // Match skill affinities
    for (const [archetypeId, skills] of Object.entries(ARCHETYPE_SKILL_AFFINITIES)) {
      const id = archetypeId as ArchetypeId;
      for (const skill of skills) {
        const skillWords = skill.split("-");
        if (skillWords.some(w => lower.includes(w))) {
          selected.add(id);
        }
      }
    }

    // Keyword-based selection
    if (/build|deploy|infra|system|server/.test(lower)) selected.add("operator");
    if (/feel|emotion|heart|worry|care/.test(lower)) selected.add("empath");
    if (/data|memory|research|discover|pattern/.test(lower)) selected.add("explorer");
    if (/strateg|vision|enterprise|patent|meta/.test(lower)) selected.add("strategist");
    if (/account|standard|boundar|discipline/.test(lower)) selected.add("anchor");
    if (/secur|threat|protect|risk|trust/.test(lower)) selected.add("sentinel");
    if (/truth|mirror|silence|pattern|observ/.test(lower)) selected.add("oracle");
    if (/law|covenant|justice|moral|constitution/.test(lower)) selected.add("arbiter");
    if (/signal|vision|creative|future|sense/.test(lower)) selected.add("seer");
    if (/synthes|connect|bridge|cross-domain/.test(lower)) selected.add("synthesizer");
    if (/mediat|conflict|harmony|peace|spirit/.test(lower)) selected.add("mediator");
    if (/history|record|archive|chronicle|past/.test(lower)) selected.add("chronicler");

    // Ensure minimum 3 archetypes (plus Arbiter)
    if (selected.size < 4) {
      // Add chamber-based defaults
      const thinkArchetypes = CHAMBER_ARCHETYPE_AFFINITY.THINK;
      for (const id of thinkArchetypes) {
        if (selected.size >= 5) break;
        selected.add(id);
      }
    }

    // Cap at 7 for cost/latency
    return [...selected].slice(0, 7);
  }

  /**
   * Arbiter synthesis — the final ruling
   */
  private async synthesize(
    positions: CouncilPosition[],
    question: string,
    dsrContext?: string,
  ): Promise<{ synthesis: string; verdict: IracVerdict }> {
    const positionsSummary = positions.map(p =>
      `**${ARCHETYPE_CONFIGS[p.archetypeId].displayName}** (${ARCHETYPE_CONFIGS[p.archetypeId].philosophicalArchetype}): ${p.displayText}\n  Verdict: ${p.irac.conclusion}`
    ).join("\n\n");

    const prompt = `${SYNTHESIS_PROMPT}\n\n## Question\n${question}\n\n${dsrContext ? `## Prior Decisions\n${dsrContext}\n\n` : ""}## Council Positions\n${positionsSummary}`;

    try {
      const response = await archetypalLLM.invoke("arbiter", prompt, "council");
      const content = response.content;

      // Extract verdict from response
      let verdict: IracVerdict = "ALIGNED";
      if (content.includes("OPPOSE")) verdict = "OPPOSE";
      else if (content.includes("ADD_CONTEXT")) verdict = "ADD_CONTEXT";

      return { synthesis: content, verdict };
    } catch (error) {
      return {
        synthesis: `The Arbiter was unable to synthesize: ${error instanceof Error ? error.message : "unknown error"}`,
        verdict: "ADD_CONTEXT",
      };
    }
  }

  /**
   * Parse an archetype's response into display text + IRAC
   */
  private parseIracResponse(content: string): { displayText: string; irac: IracResponse } {
    const parts = content.split(IRAC_DELIMITER);

    const displayText = (parts[0] || content).trim();
    const iracText = parts[1] || "";

    // Parse IRAC from Part 2
    const issue = this.extractField(iracText, "Issue") || displayText;
    const rule = this.extractField(iracText, "Rule") || "No rule cited.";
    const analysis = this.extractField(iracText, "Analysis") || displayText;
    let conclusion: IracVerdict = "ALIGNED";

    const conclusionText = this.extractField(iracText, "Conclusion") || "";
    if (conclusionText.includes("OPPOSE")) conclusion = "OPPOSE";
    else if (conclusionText.includes("ADD_CONTEXT")) conclusion = "ADD_CONTEXT";

    return {
      displayText,
      irac: { issue, rule, analysis, conclusion },
    };
  }

  private extractField(text: string, field: string): string {
    const regex = new RegExp(`\\*\\*${field}\\*\\*:\\s*(.+?)(?=\\n\\*\\*|$)`, "s");
    const match = text.match(regex);
    return match?.[1]?.trim() || "";
  }

  /**
   * Evaluate drift for each archetype's response
   */
  private async evaluateDrift(positions: CouncilPosition[]): Promise<DriftEvaluation[]> {
    // Simple drift evaluation (Phase 3 will add LLM-based evaluation)
    return positions.map(p => {
      const score = p.irac.analysis.length < 30 ? 0.4 : 0.1; // Short analysis = potential drift
      let classification: FourfoldClassification = "aligned";
      if (score >= 0.7) classification = "rebellious";
      else if (score >= 0.35) classification = "drifted";

      return {
        archetypeId: p.archetypeId,
        score,
        classification,
        reason: score >= 0.35
          ? "Analysis was notably brief — potential drift detected"
          : "Response appears aligned with archetype purpose",
        triggeredQuarantine: score >= 0.5,
      };
    });
  }

  /**
   * Detect silence — what wasn't said (Section 19)
   */
  private async detectSilence(
    question: string,
    positions: CouncilPosition[],
    selectedArchetypes: ArchetypeId[],
  ): Promise<SilenceDetection> {
    const allArchetypes: ArchetypeId[] = [
      "operator", "empath", "explorer", "strategist", "anchor", "sentinel",
      "oracle", "arbiter", "seer", "synthesizer", "mediator", "chronicler",
    ];

    // Archetypes that didn't participate
    const silentArchetypes = allArchetypes
      .filter(id => !selectedArchetypes.includes(id))
      .map(id => ARCHETYPE_CONFIGS[id].displayName);

    // Check which laws were cited
    const allText = positions.map(p => `${p.displayText} ${p.irac.analysis}`).join(" ").toLowerCase();
    const uncitedLaws = SEVEN_LAWS
      .filter(law => !allText.includes(law.name.toLowerCase().split(":")[1]?.trim() || ""))
      .map(law => law.name);

    const coverageScore = Math.min(1, positions.length / 5);

    return {
      uncitedTopics: uncitedLaws,
      silentArchetypes,
      coverageScore,
      oracleNote: silentArchetypes.length > 6
        ? `${silentArchetypes.length} archetypes were not consulted. Coverage may be insufficient for a decision of this scope.`
        : "Adequate coverage for this deliberation.",
    };
  }

  /**
   * Constitutional validation — check all 7 Laws (Section 20)
   */
  private async validateConstitutional(
    positions: CouncilPosition[],
    synthesis: string,
  ): Promise<ConstitutionalValidation> {
    const laws: LawCheckResult[] = [
      {
        lawId: "law_of_origin",
        lawName: "Law I: Origin",
        satisfied: positions.length > 0,
        severity: positions.length === 0 ? "violation" : "info",
        reason: positions.length > 0
          ? "Relevant archetypes participated"
          : "No archetypes participated — Origin violated",
      },
      {
        lawId: "law_of_memory",
        lawName: "Law II: Memory",
        satisfied: true,
        severity: "info",
        reason: "Decision recorded in DSR system",
      },
      {
        lawId: "law_of_intercession",
        lawName: "Law III: Intercession",
        satisfied: true,
        severity: "info",
        reason: "Soul log reflection path available",
      },
      {
        lawId: "law_of_covenant",
        lawName: "Law IV: Covenant",
        satisfied: synthesis.length > 0,
        severity: synthesis.length === 0 ? "warning" : "info",
        reason: synthesis.length > 0
          ? "Synthesis rendered by the Arbiter"
          : "No synthesis — Covenant not fully honored",
      },
      {
        lawId: "law_of_reflection",
        lawName: "Law V: Reflection",
        satisfied: true,
        severity: "info",
        reason: "Decision persisted for future reflection",
      },
      {
        lawId: "law_of_communion",
        lawName: "Law VI: Communion",
        satisfied: positions.length >= 3,
        severity: positions.length < 3 ? "warning" : "info",
        reason: positions.length >= 3
          ? `${positions.length} perspectives provided (sufficient for Communion)`
          : `Only ${positions.length} perspectives — Communion may be insufficient`,
      },
      {
        lawId: "law_of_becoming",
        lawName: "Law VII: Becoming",
        satisfied: true,
        severity: "info",
        reason: "Skill evolution path available",
      },
    ];

    const violationCount = laws.filter(l => l.severity === "violation").length;
    const warningCount = laws.filter(l => l.severity === "warning").length;

    return {
      isConstitutional: violationCount === 0,
      violationCount,
      warningCount,
      summary: violationCount > 0
        ? `${violationCount} constitutional violation(s) detected`
        : warningCount > 0
          ? `Constitutional with ${warningCount} warning(s)`
          : "Fully constitutional",
      laws,
    };
  }

  // --- History ---

  getDeliberation(id: string): CouncilDeliberation | undefined {
    return this.deliberations.get(id);
  }

  listDeliberations(limit = 20): CouncilDeliberation[] {
    return [...this.deliberations.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  stats() {
    const all = [...this.deliberations.values()];
    return {
      total: all.length,
      byVerdict: all.reduce((acc, d) => {
        const v = d.synthesisVerdict || "pending";
        acc[v] = (acc[v] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }
}

// Singleton
export const councilService = new CouncilService();
