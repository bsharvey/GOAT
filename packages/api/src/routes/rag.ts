/**
 * RAG System Routes
 *
 * Add documents to the knowledge base and query with context.
 */

import { Router } from "express";
import { ragService } from "../services/rag.js";

export function ragRoutes() {
  const router = Router();

  // Add a document to the knowledge base
  router.post("/documents", (req, res) => {
    const { content, metadata } = req.body;

    if (!content) {
      res.status(400).json({ success: false, error: "content required" });
      return;
    }

    const docId = ragService.addDocument(content, metadata || {});
    res.json({ success: true, documentId: docId });
  });

  // Query with RAG context
  router.post("/query", (req, res) => {
    const { query, topK } = req.body;

    if (!query) {
      res.status(400).json({ success: false, error: "query required" });
      return;
    }

    const results = ragService.retrieve(query, topK || 5);
    const context = ragService.buildContext(query, topK || 5);

    res.json({
      success: true,
      results: results.map((r) => ({
        content: r.document.content,
        metadata: r.document.metadata,
        score: r.score,
      })),
      context,
    });
  });

  // Get knowledge base stats
  router.get("/stats", (_req, res) => {
    res.json({
      success: true,
      ...ragService.getStats(),
    });
  });

  return router;
}
