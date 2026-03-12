/**
 * Decision System of Record (DSR) Service
 *
 * Every significant decision is recorded as a DSR — a structured judicial
 * document with IRAC reasoning, evidence, and reflection.
 *
 * Source: ARCHETYPAL_AI_CIVILIZATION.md Section 13
 */

import { randomUUID } from "node:crypto";
import type {
  Decision,
  DecisionStatus,
  DecisionConstraint,
  DecisionPerspective,
  DecisionEvidence,
  DecisionReflection,
  RDLTriple,
  CovenantAlignment,
} from "@goat/core";
import type { ArchetypeId, IracResponse, IracVerdict } from "@goat/core";

export class DSRService {
  private decisions: Map<string, Decision> = new Map();
  private dsrCounter = 0;

  /**
   * Create a new DSR
   */
  create(options: {
    question: string;
    title?: string;
    userId?: string;
    constraints?: DecisionConstraint[];
    priorDecisions?: string[];
    parentDsrId?: string;
  }): Decision {
    this.dsrCounter++;
    const dsrNumber = `DSR-${String(this.dsrCounter).padStart(3, "0")}`;
    const now = new Date().toISOString();

    const decision: Decision = {
      id: randomUUID(),
      userId: options.userId || "system",
      dsrNumber,
      title: options.title || options.question.slice(0, 80),
      status: "research",
      question: options.question,
      constraints: options.constraints || [],
      priorDecisions: options.priorDecisions || [],
      research: [],
      synthesis: null,
      judgeArchetype: "arbiter",
      rdlTriples: [],
      outcome: null,
      outcomeStatus: null,
      alignment: null,
      tags: [],
      metadata: {},
      perspectives: [],
      evidence: [],
      reflections: [],
      parentDsrId: options.parentDsrId,
      recursionDepth: options.parentDsrId ? 1 : 0,
      createdAt: now,
      updatedAt: now,
    };

    this.decisions.set(decision.id, decision);
    return decision;
  }

  /**
   * Add an archetype's IRAC perspective to a DSR
   */
  addPerspective(
    dsrId: string,
    archetypeId: ArchetypeId,
    verdict: IracVerdict,
    irac: IracResponse,
  ): DecisionPerspective {
    const decision = this.decisions.get(dsrId);
    if (!decision) throw new Error(`DSR ${dsrId} not found`);

    const perspective: DecisionPerspective = {
      dsrId,
      archetypeId,
      verdict,
      irac,
      createdAt: new Date().toISOString(),
    };

    decision.perspectives.push(perspective);
    decision.updatedAt = new Date().toISOString();
    return perspective;
  }

  /**
   * Add evidence to a DSR
   */
  addEvidence(
    dsrId: string,
    evidence: Omit<DecisionEvidence, "dsrId" | "exhibitNumber">,
  ): DecisionEvidence {
    const decision = this.decisions.get(dsrId);
    if (!decision) throw new Error(`DSR ${dsrId} not found`);

    const exhibit: DecisionEvidence = {
      dsrId,
      exhibitNumber: decision.evidence.length + 1,
      ...evidence,
    };

    decision.evidence.push(exhibit);
    decision.updatedAt = new Date().toISOString();
    return exhibit;
  }

  /**
   * Record Oranos's synthesis
   */
  synthesize(
    dsrId: string,
    synthesis: string,
    verdict: IracVerdict,
    rdlTriples?: RDLTriple[],
  ): void {
    const decision = this.decisions.get(dsrId);
    if (!decision) throw new Error(`DSR ${dsrId} not found`);

    decision.synthesis = synthesis;
    decision.status = "decided";
    decision.rdlTriples = rdlTriples || [];
    decision.updatedAt = new Date().toISOString();

    // Map verdict to alignment
    const alignmentMap: Record<IracVerdict, CovenantAlignment> = {
      ALIGNED: "aligned",
      ADD_CONTEXT: "drifted",
      OPPOSE: "rebellious",
    };
    decision.alignment = alignmentMap[verdict];
  }

  /**
   * Add a post-decision reflection
   */
  addReflection(
    dsrId: string,
    reflection: Omit<DecisionReflection, "dsrId" | "createdAt">,
  ): DecisionReflection {
    const decision = this.decisions.get(dsrId);
    if (!decision) throw new Error(`DSR ${dsrId} not found`);

    const entry: DecisionReflection = {
      dsrId,
      ...reflection,
      createdAt: new Date().toISOString(),
    };

    decision.reflections.push(entry);
    decision.updatedAt = new Date().toISOString();
    return entry;
  }

  /**
   * Update DSR status
   */
  updateStatus(dsrId: string, status: DecisionStatus): void {
    const decision = this.decisions.get(dsrId);
    if (!decision) throw new Error(`DSR ${dsrId} not found`);

    decision.status = status;
    decision.updatedAt = new Date().toISOString();
  }

  /**
   * Record outcome
   */
  recordOutcome(
    dsrId: string,
    outcome: string,
    outcomeStatus: "successful" | "partial" | "failed",
  ): void {
    const decision = this.decisions.get(dsrId);
    if (!decision) throw new Error(`DSR ${dsrId} not found`);

    decision.outcome = outcome;
    decision.outcomeStatus = outcomeStatus;
    decision.status = "completed";
    decision.updatedAt = new Date().toISOString();
  }

  /**
   * Record DNA glyphs inscribed by this decision
   */
  recordDnaInscriptions(dsrId: string, glyphs: string[]): void {
    const decision = this.decisions.get(dsrId);
    if (!decision) throw new Error(`DSR ${dsrId} not found`);

    decision.dnaGlyphsInscribed = glyphs;
    decision.updatedAt = new Date().toISOString();
  }

  /**
   * Record RLAF composite reward
   */
  recordRlaf(dsrId: string, compositeReward: number, paretoAcceptable: boolean): void {
    const decision = this.decisions.get(dsrId);
    if (!decision) throw new Error(`DSR ${dsrId} not found`);

    decision.compositeReward = compositeReward;
    decision.paretoAcceptable = paretoAcceptable;
    decision.updatedAt = new Date().toISOString();
  }

  /**
   * Find relevant prior DSRs by keyword search
   */
  findRelevant(query: string, limit = 5): Decision[] {
    const lower = query.toLowerCase();
    const words = lower.split(/\s+/).filter(w => w.length > 2);

    const scored = [...this.decisions.values()]
      .filter(d => d.status !== "abandoned")
      .map(decision => {
        const text = `${decision.question} ${decision.title} ${decision.synthesis || ""} ${decision.tags.join(" ")}`.toLowerCase();
        const score = words.reduce((acc, word) => acc + (text.includes(word) ? 1 : 0), 0);
        return { decision, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(({ decision }) => decision);
  }

  /**
   * Get a single DSR by ID
   */
  get(dsrId: string): Decision | undefined {
    return this.decisions.get(dsrId);
  }

  /**
   * Get a DSR by its number (e.g. "DSR-001")
   */
  getByNumber(dsrNumber: string): Decision | undefined {
    return [...this.decisions.values()].find(d => d.dsrNumber === dsrNumber);
  }

  /**
   * List all DSRs, optionally filtered by status
   */
  list(status?: DecisionStatus): Decision[] {
    const all = [...this.decisions.values()];
    if (status) return all.filter(d => d.status === status);
    return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Get DSR stats
   */
  stats() {
    const all = [...this.decisions.values()];
    return {
      total: all.length,
      byStatus: all.reduce((acc, d) => {
        acc[d.status] = (acc[d.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalPerspectives: all.reduce((acc, d) => acc + d.perspectives.length, 0),
      totalEvidence: all.reduce((acc, d) => acc + d.evidence.length, 0),
    };
  }
}

// Singleton
export const dsrService = new DSRService();
