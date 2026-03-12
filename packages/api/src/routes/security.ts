import { Router } from "express";
import type { Threat } from "@goat/core";

// In-memory store — swap with MongoDB later
const threats: Threat[] = [];

export function securityRoutes() {
  const router = Router();

  // Scan email for threats
  router.post("/scan-email", async (_req, res) => {
    try {
      // TODO: Implement Gmail/Outlook OAuth scanning
      res.json({
        success: true,
        message: "Email scan endpoint ready — configure OAuth credentials",
        threats: [],
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Scan failed";
      res.status(500).json({ success: false, error: msg });
    }
  });

  // Get all threats
  router.get("/threats", (_req, res) => {
    res.json({ success: true, data: threats });
  });

  // Report a threat manually
  router.post("/threats", (req, res) => {
    const threat: Threat = {
      id: crypto.randomUUID(),
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...req.body,
    };
    threats.push(threat);
    res.status(201).json({ success: true, data: threat });
  });

  // Update threat status
  router.patch("/threats/:id", (req, res) => {
    const idx = threats.findIndex((t) => t.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ success: false, error: "Threat not found" });
      return;
    }
    threats[idx] = { ...threats[idx]!, ...req.body, updatedAt: new Date() };
    res.json({ success: true, data: threats[idx] });
  });

  // Upload evidence
  router.post("/evidence/upload", (_req, res) => {
    // TODO: Wire up multer + storage
    res.json({
      success: true,
      message: "Evidence upload endpoint ready — configure storage",
    });
  });

  return router;
}
