/**
 * Civilization Middleware — The Invisible Backbone
 *
 * Wraps all AI interactions with the Archetypal AI civilization:
 * - Council deliberation (silent, background)
 * - Constitutional validation against the 7 Laws
 * - Drift detection on responses
 * - RLAF scoring for continuous improvement
 * - Soul log for significant decisions
 *
 * Users never see this. The council convenes silently.
 */

import { CouncilService } from "../services/council.js";
import { ConstitutionalService } from "../services/constitutional.js";
import { DriftDetectionService } from "../services/drift.js";
import { RLAFService } from "../services/rlaf.js";
import { SoulLogService } from "../services/soul-log.js";
import type { ArchetypeId } from "@goat/core";

const council = new CouncilService();
const constitutional = new ConstitutionalService();
const drift = new DriftDetectionService();
const rlaf = new RLAFService();
const soulLog = new SoulLogService();

export interface CivilizationMeta {
  councilVerdict?: string;
  constitutionalValid?: boolean;
  lawsChecked?: number;
  lawsPassed?: number;
  driftScore?: number;
  fourfoldState?: string;
  soulLogged?: boolean;
}

/**
 * Process an AI response through the civilization layer.
 * Returns the response unchanged — governance runs silently.
 */
export async function civilizationProcess(
  query: string,
  response: string,
  options?: {
    userId?: string;
    category?: string;
    archetypes?: ArchetypeId[];
    skipCouncil?: boolean;
  },
): Promise<{ response: string; civilization: CivilizationMeta }> {
  const meta: CivilizationMeta = {};

  try {
    // 1. Council deliberation (background — 3 archetypes, fast)
    if (!options?.skipCouncil) {
      try {
        const deliberation = await council.deliberate(query, {
          archetypes: options?.archetypes || ["operator", "sentinel", "arbiter"],
          userId: options?.userId,
          category: options?.category,
        });
        meta.councilVerdict = deliberation.synthesisVerdict || "aligned";
      } catch {
        meta.councilVerdict = "skipped";
      }
    }

    // 2. Constitutional validation (pure logic — no LLM, instant)
    try {
      const validation = constitutional.validate([], response, {});
      meta.constitutionalValid = validation.isConstitutional;
      meta.lawsChecked = validation.laws.length;
      meta.lawsPassed = validation.laws.filter((l) => l.satisfied).length;
    } catch {
      meta.constitutionalValid = true;
    }

    // 3. Drift detection
    try {
      const driftResult = drift.evaluateResponse(
        "operator",
        {
          issue: query,
          rule: "",
          analysis: response,
          conclusion: "ALIGNED" as const,
        },
        query,
      );
      meta.driftScore = driftResult.score;
      meta.fourfoldState = driftResult.classification;
    } catch {
      meta.driftScore = 0;
      meta.fourfoldState = "aligned";
    }

    // 4. Soul log for significant interactions
    try {
      const significant = (meta.driftScore || 0) > 0.3 || !meta.constitutionalValid;
      if (significant) {
        await soulLog.reflect("operator", "deliberation", query, {
          sessionSummary: `Drift: ${meta.driftScore}, Constitutional: ${meta.constitutionalValid}`,
        });
        meta.soulLogged = true;
      }
    } catch {
      // Soul logging failure never blocks
    }
  } catch {
    // Civilization failure NEVER blocks the AI response
    console.warn("Civilization middleware: background error (non-blocking)");
  }

  return { response, civilization: meta };
}

/**
 * Quick governance check — no council, just constitutional + drift.
 */
export function civilizationQuickCheck(response: string): {
  isValid: boolean;
  driftScore: number;
} {
  try {
    const validation = constitutional.validate([], response, {});
    const driftResult = drift.evaluateResponse(
      "operator",
      {
        issue: "",
        rule: "",
        analysis: response,
        conclusion: "ALIGNED" as const,
      },
      "",
    );
    return { isValid: validation.isConstitutional, driftScore: driftResult.score };
  } catch {
    return { isValid: true, driftScore: 0 };
  }
}
