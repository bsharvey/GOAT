/**
 * Autonomous Agent Routes
 *
 * Manage and execute GOAT Force AI agents.
 */

import { Router } from "express";
import { agentManager } from "../services/agent-manager.js";
import type { AgentType } from "@goat/core";

export function agentManagerRoutes() {
  const router = Router();

  // List all agents
  router.get("/", (_req, res) => {
    res.json({
      success: true,
      agents: agentManager.getAgents(),
    });
  });

  // Execute an agent immediately
  router.post("/execute", async (req, res) => {
    try {
      const { agentType, prompt } = req.body;

      if (!agentType || !prompt) {
        res.status(400).json({ success: false, error: "agentType and prompt required" });
        return;
      }

      const result = await agentManager.executeAgent(agentType as AgentType, prompt);
      res.json({
        success: true,
        agentType,
        result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: msg });
    }
  });

  // Queue a task
  router.post("/queue", (req, res) => {
    const { agentType, prompt, priority } = req.body;

    if (!agentType || !prompt) {
      res.status(400).json({ success: false, error: "agentType and prompt required" });
      return;
    }

    const taskId = agentManager.queueTask(agentType as AgentType, prompt, priority);
    res.json({ success: true, taskId });
  });

  // Process queued tasks
  router.post("/process", async (_req, res) => {
    try {
      const result = await agentManager.processQueue();
      res.json({ success: true, ...result });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: msg });
    }
  });

  // Get metrics
  router.get("/metrics", (_req, res) => {
    res.json({
      success: true,
      metrics: agentManager.getMetrics(),
      queue: agentManager.getQueueStatus(),
    });
  });

  // Get decision history
  router.get("/decisions", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    res.json({
      success: true,
      decisions: agentManager.getDecisionHistory(limit),
    });
  });

  return router;
}
