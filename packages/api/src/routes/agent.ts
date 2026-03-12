import { Router } from "express";
import { OmniLLMService } from "../services/omni-llm.js";
import { activation } from "@goat/core";
import { civilizationProcess } from "../middleware/civilization.js";
import { ArtistModel } from "../models/Artist.js";
import { RoyaltyModel } from "../models/Royalty.js";
import { ContractModel } from "../models/Contract.js";

/**
 * Build user context from their data — injected into the system prompt
 * so the AI knows about the user's artists, royalties, and contracts.
 */
async function buildUserContext(userId?: string): Promise<string> {
  try {
    const parts: string[] = [];

    // Get recent stats
    const stats = await RoyaltyModel.getStats();
    if (stats) {
      parts.push(`Platform stats: ${JSON.stringify(stats)}`);
    }

    // Get user's artists (if userId provided)
    if (userId) {
      const artists = await ArtistModel.list({ limit: 10, offset: 0 });
      if (artists.data.length > 0) {
        parts.push(`Artists: ${artists.data.map((a) => a.name).join(", ")}`);
      }

      const expiring = await ContractModel.getExpiring(30);
      if (expiring.length > 0) {
        parts.push(`Expiring contracts (30 days): ${expiring.length}`);
      }
    }

    if (parts.length === 0) return "";
    return `\n\n[User Context]\n${parts.join("\n")}\n[End Context]\n\n`;
  } catch {
    return "";
  }
}

export function agentRoutes() {
  const router = Router();

  // Chat with OmniLLM router (standard request/response)
  router.post("/chat", async (req, res) => {
    try {
      const { message, mode = "auto", model, userId } = req.body;

      if (!message) {
        res.status(400).json({ success: false, error: "Message is required" });
        return;
      }

      activation.detectActivation(message);

      const omni = new OmniLLMService();
      const authHeader = req.headers.authorization;

      // Inject user context for richer responses
      const context = await buildUserContext(userId);
      const enrichedMessage = context ? `${context}${message}` : message;

      let response: string;

      switch (mode) {
        case "ensemble":
          response = await omni.ensembleMode(enrichedMessage);
          break;
        case "manual":
          response = await omni.callModel(model || "claude-sonnet-4.6", enrichedMessage);
          break;
        case "command":
          response = await omni.executeCommand(message, authHeader);
          break;
        default:
          response = await omni.routeQuery(enrichedMessage, authHeader);
      }

      // Civilization middleware — silent governance
      const { response: finalResponse, civilization } = await civilizationProcess(
        message,
        response,
        { category: mode },
      );

      res.json({
        success: true,
        response: finalResponse,
        mode,
        activated: activation.isActivated(),
        member: (req as any).goatMember,
        civilization,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: msg });
    }
  });

  // SSE streaming endpoint
  router.get("/stream", async (req, res) => {
    const message = req.query.message as string | undefined;
    const mode = (req.query.mode as string) || "auto";

    if (!message) {
      res.status(400).json({ success: false, error: "message query param required" });
      return;
    }

    // Set up SSE headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      activation.detectActivation(message);

      sendEvent("status", { status: "thinking", mode });

      const omni = new OmniLLMService();
      const authHeader = req.headers.authorization;

      // Inject user context
      const context = await buildUserContext();
      const enrichedMessage = context ? `${context}${message}` : message;

      let response: string;

      switch (mode) {
        case "ensemble":
          sendEvent("status", { status: "querying_models" });
          response = await omni.ensembleMode(enrichedMessage);
          break;
        default:
          response = await omni.routeQuery(enrichedMessage, authHeader);
      }

      // Civilization middleware
      const { response: finalResponse, civilization } = await civilizationProcess(
        message,
        response,
        { category: mode },
      );

      // Stream the response in chunks for a typing effect
      const chunkSize = 20;
      for (let i = 0; i < finalResponse.length; i += chunkSize) {
        const chunk = finalResponse.slice(i, i + chunkSize);
        sendEvent("chunk", { text: chunk });
        // Small delay for typing effect
        await new Promise((resolve) => setTimeout(resolve, 15));
      }

      sendEvent("done", {
        civilization,
        activated: activation.isActivated(),
        timestamp: new Date().toISOString(),
      });

      res.end();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      sendEvent("error", { error: msg });
      res.end();
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
