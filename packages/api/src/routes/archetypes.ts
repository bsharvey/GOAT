/**
 * Archetype Routes — The 12 Operational Archetypes
 *
 * View archetype configs, skill profiles, and status.
 */

import { Router } from "express";
import {
  ARCHETYPE_CONFIGS,
  PHILOSOPHICAL_MAP,
  DIVERGENCE_KEYS,
  ARCHETYPE_SKILL_AFFINITIES,
  ALL_ARCHETYPE_IDS,
} from "@goat/core";
import type { ArchetypeId } from "@goat/core";

export function archetypeRoutes() {
  const router = Router();

  // List all 12 archetypes
  router.get("/", (_req, res) => {
    const archetypes = ALL_ARCHETYPE_IDS.map(id => ({
      ...ARCHETYPE_CONFIGS[id],
      philosophicalArchetype: PHILOSOPHICAL_MAP[id],
      divergenceKey: DIVERGENCE_KEYS[id],
      skills: ARCHETYPE_SKILL_AFFINITIES[id],
    }));

    res.json({ success: true, archetypes });
  });

  // Get a single archetype by ID
  router.get("/:id", (req, res) => {
    const id = req.params.id as ArchetypeId;
    const config = ARCHETYPE_CONFIGS[id];

    if (!config) {
      res.status(404).json({ success: false, error: `Archetype "${id}" not found` });
      return;
    }

    res.json({
      success: true,
      archetype: {
        ...config,
        philosophicalArchetype: PHILOSOPHICAL_MAP[id],
        divergenceKey: DIVERGENCE_KEYS[id],
        skills: ARCHETYPE_SKILL_AFFINITIES[id],
      },
    });
  });

  // Get an archetype's skill profile
  router.get("/:id/skills", (req, res) => {
    const id = req.params.id as ArchetypeId;
    const skills = ARCHETYPE_SKILL_AFFINITIES[id];

    if (!skills) {
      res.status(404).json({ success: false, error: `Archetype "${id}" not found` });
      return;
    }

    res.json({
      success: true,
      archetypeId: id,
      skills: skills.map(skill => ({
        id: skill,
        name: skill.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
        proficiency: 0.1, // Initial — will be updated by skill evolution service
        exerciseCount: 0,
      })),
    });
  });

  return router;
}
