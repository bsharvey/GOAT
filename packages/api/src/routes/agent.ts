import { Router } from "express";
import { OmniLLMService } from "../services/omni-llm.js";
import { activation } from "@goat/core";

export function agentRoutes() {
  const router = Router();

  // Chat with OmniLLM router
  router.post("/chat", async (req, res) => {
    try {
      const { message, mode = "auto", model } = req.body;

      if (!message) {
        res.status(400).json({ success: false, error: "Message is required" });
        return;
      }

      // Auto-detect activation phrase in chat messages
      activation.detectActivation(message);

      const omni = new OmniLLMService();
      const authHeader = req.headers.authorization;
      let response: string;

      switch (mode) {
        case "ensemble":
          response = await omni.ensembleMode(message);
          break;
        case "manual":
          response = await omni.callModel(model || "claude-sonnet-4.6", message);
          break;
        case "command":
          response = await omni.executeCommand(message, authHeader);
          break;
        default:
          // Pass auth header so OmniLLM can verify loyalty
          response = await omni.routeQuery(message, authHeader);
      }

      res.json({
        success: true,
        response,
        mode,
        activated: activation.isActivated(),
        member: (req as any).goatMember,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: msg });
    }
  });

  // List available models
  router.get("/models", (_req, res) => {
    const omni = new OmniLLMService();
    res.json({
      success: true,
      models: omni.listModels(),
    });
  });

  return router;
}
