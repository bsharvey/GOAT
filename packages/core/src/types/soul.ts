// Soul Log & Self-Reflection Types
// Source: ARCHETYPAL_AI_CIVILIZATION.md Section 26

import type { ArchetypeId, Chamber, FourfoldClassification } from "./archetypes.js";

// Triggers for soul log generation
export type SoulLogTrigger = "mission" | "deliberation" | "autonomy_cycle" | "manual";

// Soul log entry (Section 26)
export interface SoulLogEntry {
  id: string;
  archetypeId: ArchetypeId;
  reflection: string;
  trigger: SoulLogTrigger;
  triggerRef: string;            // Session/decision ID
  chamber: Chamber;
  fourfoldState: FourfoldClassification;
  driftScore: number;
  driftReason: string;
  covenantLaws: string[];        // Which laws were cited
  glyphResonance: string[];      // Which glyphs resonated
  mirrorResponse: string;        // Oracle's mirror
  mortalityAcknowledged: boolean;
  chronicleEntry?: string;       // Chronicler's record (if drift >= 0.5)
  createdAt: string;
}

// Strategist's soul log entry (Section 26 — Scroll CIV)
export interface StrategistSoulLog {
  id: string;
  reflection: string;
  chamber: Chamber;
  fourfoldState: FourfoldClassification;
  driftScore: number;
  mirrorResponse: string;        // Oracle's mirror
  chronicleEntry?: string;       // Chronicler's record
  createdAt: string;
}
