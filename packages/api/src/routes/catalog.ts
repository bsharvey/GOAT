/**
 * Catalog Routes — DJ Speedy's music catalog and production tools
 */

import { Router } from "express";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

export function catalogRoutes() {
  const router = Router();

  let catalogData: Record<string, unknown> | null = null;

  function loadCatalog() {
    if (catalogData) return catalogData;
    try {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const raw = readFileSync(join(__dirname, "../../data/catalog.json"), "utf-8");
      catalogData = JSON.parse(raw);
      return catalogData;
    } catch {
      return null;
    }
  }

  // Full catalog
  router.get("/", (_req, res): void => {
    const data = loadCatalog();
    if (!data) {
      res.status(500).json({ success: false, error: "Catalog not found" });
      return;
    }
    res.json({ success: true, ...data });
  });

  // Genre summary
  router.get("/genres", (_req, res): void => {
    const data = loadCatalog() as Record<string, unknown> | null;
    if (!data) {
      res.status(500).json({ success: false, error: "Catalog not found" });
      return;
    }
    const catalog = data.catalog as { genres: unknown[]; totalTracks: number };
    res.json({
      success: true,
      totalTracks: catalog.totalTracks,
      genres: catalog.genres,
    });
  });

  // Production tools
  router.get("/tools", (_req, res): void => {
    const data = loadCatalog() as Record<string, unknown> | null;
    if (!data) {
      res.status(500).json({ success: false, error: "Catalog not found" });
      return;
    }
    res.json({
      success: true,
      tools: data.productionTools,
    });
  });

  // Projects (DJ SPEEDY WAKA sessions, etc.)
  router.get("/projects", (_req, res): void => {
    const data = loadCatalog() as Record<string, unknown> | null;
    if (!data) {
      res.status(500).json({ success: false, error: "Catalog not found" });
      return;
    }
    const catalog = data.catalog as { projects: unknown[] };
    res.json({
      success: true,
      projects: catalog.projects,
    });
  });

  return router;
}
