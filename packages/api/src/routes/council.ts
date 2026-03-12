/**
 * Council Deliberation Routes
 *
 * Submit questions to the Archetypal Council for deliberation.
 */

import { Router } from "express";
import { councilService } from "../services/council.js";
import type { ArchetypeId } from "@goat/core";

export function councilRoutes() {
  const router = Router();

  // Submit a question for council deliberation
  router.post("/deliberate", async (req, res) => {
    try {
      const { question, archetypes } = req.body as {
        question?: string;
        archetypes?: ArchetypeId[];
      };

      if (!question || typeof question !== "string") {
        res.status(400).json({ success: false, error: "question is required" });
        return;
      }

      const deliberation = await councilService.deliberate(question, {
        archetypes,
        userId: "system",
      });

      res.json({
        success: true,
        deliberation: {
          id: deliberation.id,
          dsrNumber: deliberation.dsrNumber,
          question: deliberation.question,
          archetypes: deliberation.archetypes,
          positions: deliberation.positions.map(p => ({
            archetype: p.archetypeId,
            displayText: p.displayText,
            verdict: p.irac.conclusion,
            irac: p.irac,
          })),
          synthesis: deliberation.synthesis,
          synthesisVerdict: deliberation.synthesisVerdict,
          silenceDetection: deliberation.silenceDetection,
          constitutionalValidation: deliberation.constitutionalValidation,
          driftEvaluations: deliberation.driftEvaluations,
          createdAt: deliberation.createdAt,
        },
      });
    } catch (error) {
      console.error("Council deliberation error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Council deliberation failed",
      });
    }
  });

  // List past deliberations
  router.get("/history", (_req, res) => {
    const deliberations = councilService.listDeliberations();

    res.json({
      success: true,
      deliberations: deliberations.map(d => ({
        id: d.id,
        dsrNumber: d.dsrNumber,
        question: d.question,
        archetypes: d.archetypes,
        synthesisVerdict: d.synthesisVerdict,
        createdAt: d.createdAt,
      })),
    });
  });

  // Get a single deliberation
  router.get("/:id", (req, res) => {
    const deliberation = councilService.getDeliberation(req.params.id);

    if (!deliberation) {
      res.status(404).json({ success: false, error: "Deliberation not found" });
      return;
    }

    res.json({ success: true, deliberation });
  });

  // Council stats
  router.get("/", (_req, res) => {
    res.json({
      success: true,
      stats: councilService.stats(),
    });
  });

  return router;
}
