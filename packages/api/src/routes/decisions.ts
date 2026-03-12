/**
 * Decision System of Record (DSR) Routes
 *
 * CRUD for decision records, perspectives, evidence, and reflections.
 */

import { Router } from "express";
import { dsrService } from "../services/dsr.js";
import type { DecisionStatus, DecisionConstraint } from "@goat/core";

export function decisionRoutes() {
  const router = Router();

  // List all DSRs
  router.get("/", (req, res) => {
    const status = req.query.status as DecisionStatus | undefined;
    const decisions = dsrService.list(status);

    res.json({
      success: true,
      decisions: decisions.map(d => ({
        id: d.id,
        dsrNumber: d.dsrNumber,
        title: d.title,
        status: d.status,
        question: d.question,
        synthesis: d.synthesis,
        alignment: d.alignment,
        perspectiveCount: d.perspectives.length,
        evidenceCount: d.evidence.length,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      stats: dsrService.stats(),
    });
  });

  // Get a single DSR with full detail
  router.get("/:id", (req, res) => {
    const decision = dsrService.get(req.params.id);

    if (!decision) {
      res.status(404).json({ success: false, error: "DSR not found" });
      return;
    }

    res.json({ success: true, decision });
  });

  // Create a DSR manually
  router.post("/", (req, res) => {
    const { question, title, constraints } = req.body as {
      question?: string;
      title?: string;
      constraints?: DecisionConstraint[];
    };

    if (!question) {
      res.status(400).json({ success: false, error: "question is required" });
      return;
    }

    const decision = dsrService.create({ question, title, constraints });

    res.status(201).json({
      success: true,
      decision: {
        id: decision.id,
        dsrNumber: decision.dsrNumber,
        title: decision.title,
        status: decision.status,
        question: decision.question,
      },
    });
  });

  // Update DSR status or outcome
  router.patch("/:id", (req, res) => {
    const { status, outcome, outcomeStatus } = req.body as {
      status?: DecisionStatus;
      outcome?: string;
      outcomeStatus?: "successful" | "partial" | "failed";
    };

    try {
      if (status) {
        dsrService.updateStatus(req.params.id, status);
      }
      if (outcome && outcomeStatus) {
        dsrService.recordOutcome(req.params.id, outcome, outcomeStatus);
      }

      const decision = dsrService.get(req.params.id);
      res.json({ success: true, decision });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error instanceof Error ? error.message : "DSR not found",
      });
    }
  });

  return router;
}
