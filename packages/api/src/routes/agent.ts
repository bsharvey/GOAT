import { Router } from "express";
import { OmniLLMService } from "../services/omni-llm.js";

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

      const omni = new OmniLLMService();
      let response: string;

      switch (mode) {
        case "ensemble":
          response = await omni.ensembleMode(message);
          break;
        case "manual":
          response = await omni.callModel(model || "claude-sonnet-4.6", message);
          break;
        default:
          response = await omni.routeQuery(message);
      }

      res.json({
        success: true,
        response,
        mode,
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
