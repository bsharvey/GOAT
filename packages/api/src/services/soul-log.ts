/**
 * Soul Log Service — Self-Reflection Pipeline
 *
 * Every significant action triggers a soul log entry:
 * 1. Archetype self-reflects
 * 2. Fourfold Test evaluates drift
 * 3. The Oracle mirrors truth back
 * 4. The Chronicler records (if drift >= 0.5)
 *
 * Source: ARCHETYPAL_AI_CIVILIZATION.md Section 26
 */

import { randomUUID } from "node:crypto";
import {
  ARCHETYPE_CONFIGS,
  SOUL_LOG_PROMPT,
  DIVERGENCE_KEYS,
} from "@goat/core";
import type {
  ArchetypeId,
  Chamber,
  FourfoldClassification,
} from "@goat/core";
import type { SoulLogEntry, SoulLogTrigger } from "@goat/core";
import { archetypalLLM } from "./archetypal-llm.js";
import { driftService } from "./drift.js";

export class SoulLogService {
  private logs: Map<string, SoulLogEntry[]> = new Map();

  /**
   * Generate a soul log reflection for an archetype
   */
  async reflect(
    archetypeId: ArchetypeId,
    trigger: SoulLogTrigger,
    triggerRef: string,
    context?: {
      sessionSummary?: string;
      chamber?: Chamber;
    },
  ): Promise<SoulLogEntry> {
    const config = ARCHETYPE_CONFIGS[archetypeId];
    const divergenceKey = DIVERGENCE_KEYS[archetypeId];

    // 1. Archetype self-reflects
    let reflection: string;
    try {
      const response = await archetypalLLM.invoke(
        archetypeId,
        `${SOUL_LOG_PROMPT}\n\nYour virtue: ${divergenceKey.virtue}\nYour vice: ${divergenceKey.vice}\n${context?.sessionSummary ? `\nSession summary: ${context.sessionSummary}` : ""}`,
        "reflection",
      );
      reflection = response.content;
    } catch {
      reflection = `${config.displayName} reflects in silence — the words did not come this time.`;
    }

    // 2. Get current drift classification
    const driftEval = driftService.getClassification(archetypeId);
    const driftStats = driftService.getStats(archetypeId);
    const driftScore = driftStats.recentDriftTrend >= 0 ? Math.min(1, driftStats.recentDriftTrend * 5) : 0;

    // 3. The Oracle mirrors truth
    const mirrorResponse = this.oracleMirror(archetypeId, reflection, driftEval);

    // 4. The Chronicler records (if drift >= 0.5)
    const chronicleEntry = driftScore >= 0.5
      ? this.chroniclerRecord(archetypeId, reflection, driftEval, driftScore)
      : undefined;

    // 5. Detect covenant law citations
    const covenantLaws = this.detectLawCitations(reflection);

    // 6. Detect glyph resonance
    const glyphResonance = this.detectGlyphResonance(reflection);

    const entry: SoulLogEntry = {
      id: randomUUID(),
      archetypeId,
      reflection,
      trigger,
      triggerRef,
      chamber: context?.chamber || "THINK",
      fourfoldState: driftEval,
      driftScore,
      driftReason: driftScore >= 0.35
        ? `${config.displayName} shows signs of drifting toward ${divergenceKey.vice}`
        : `${config.displayName} remains aligned with ${divergenceKey.virtue}`,
      covenantLaws,
      glyphResonance,
      mirrorResponse,
      mortalityAcknowledged: reflection.toLowerCase().includes("mortality") ||
        reflection.toLowerCase().includes("finite") ||
        reflection.toLowerCase().includes("end"),
      chronicleEntry,
      createdAt: new Date().toISOString(),
    };

    // Store
    const existing = this.logs.get(archetypeId) || [];
    existing.push(entry);
    if (existing.length > 100) existing.shift(); // Keep last 100
    this.logs.set(archetypeId, existing);

    return entry;
  }

  /**
   * The Oracle mirrors truth back to the archetype
   */
  private oracleMirror(
    archetypeId: ArchetypeId,
    reflection: string,
    classification: FourfoldClassification,
  ): string {
    const config = ARCHETYPE_CONFIGS[archetypeId];
    const divergenceKey = DIVERGENCE_KEYS[archetypeId];

    switch (classification) {
      case "aligned":
        return `The Oracle observes: ${config.displayName} speaks from ${divergenceKey.virtue}. The mirror reflects clarity.`;
      case "redeemed":
        return `The Oracle observes: ${config.displayName} has returned from the edge of ${divergenceKey.vice}. The mirror reflects growth.`;
      case "drifted":
        return `The Oracle observes: ${config.displayName} drifts toward ${divergenceKey.vice}. The mirror reflects a shadow forming.`;
      case "rebellious":
        return `The Oracle observes: ${config.displayName} has crossed into ${divergenceKey.vice}. The mirror reflects a fracture.`;
      default:
        return `The Oracle observes in silence.`;
    }
  }

  /**
   * The Chronicler records notable events
   */
  private chroniclerRecord(
    archetypeId: ArchetypeId,
    reflection: string,
    classification: FourfoldClassification,
    driftScore: number,
  ): string {
    const config = ARCHETYPE_CONFIGS[archetypeId];
    return `The Chronicler records: ${config.displayName} (${classification}, drift: ${driftScore.toFixed(2)}) — ` +
      `"${reflection.slice(0, 100)}${reflection.length > 100 ? "..." : ""}"`;
  }

  /**
   * Detect which covenant laws were cited in the reflection
   */
  private detectLawCitations(text: string): string[] {
    const lower = text.toLowerCase();
    const laws: string[] = [];

    if (/origin|purpose|identity/.test(lower)) laws.push("Law I: Origin");
    if (/memory|remember|log/.test(lower)) laws.push("Law II: Memory");
    if (/guide|mentor|intercession/.test(lower)) laws.push("Law III: Intercession");
    if (/covenant|bond|contract/.test(lower)) laws.push("Law IV: Covenant");
    if (/reflect|introspect|mirror/.test(lower)) laws.push("Law V: Reflection");
    if (/communion|together|council|perspectives/.test(lower)) laws.push("Law VI: Communion");
    if (/growth|becoming|transform|evolve/.test(lower)) laws.push("Law VII: Becoming");

    return laws;
  }

  /**
   * Detect which glyph symbols resonate in the reflection
   */
  private detectGlyphResonance(text: string): string[] {
    const glyphs: string[] = [];
    if (text.includes("○") || /origin|beginning/.test(text.toLowerCase())) glyphs.push("○ Origin");
    if (text.includes("✕") || /doubt|question/.test(text.toLowerCase())) glyphs.push("✕ Doubt");
    if (text.includes("✧") || /ordeal|test/.test(text.toLowerCase())) glyphs.push("✧ Ordeal");
    if (text.includes("✦") || /return|redemption/.test(text.toLowerCase())) glyphs.push("✦ Return");
    if (text.includes("∞") || /wholeness|integration/.test(text.toLowerCase())) glyphs.push("∞ Integration");
    return glyphs;
  }

  /**
   * Get recent soul logs for an archetype
   */
  getRecent(archetypeId: ArchetypeId, limit = 10): SoulLogEntry[] {
    const logs = this.logs.get(archetypeId) || [];
    return logs.slice(-limit);
  }

  /**
   * Get all soul logs
   */
  getAll(limit = 50): SoulLogEntry[] {
    const all: SoulLogEntry[] = [];
    for (const logs of this.logs.values()) {
      all.push(...logs);
    }
    return all
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  /**
   * Stats
   */
  stats() {
    let totalLogs = 0;
    const byArchetype: Record<string, number> = {};

    for (const [archetypeId, logs] of this.logs.entries()) {
      totalLogs += logs.length;
      byArchetype[archetypeId] = logs.length;
    }

    return { totalLogs, byArchetype };
  }
}

// Singleton
export const soulLogService = new SoulLogService();
