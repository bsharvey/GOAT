/**
 * Data Routes — CSV import/export, MLC, SoundExchange, SuperBass
 */

import { Router } from "express";
import { CSVService } from "../services/csv.js";

export function dataRoutes() {
  const router = Router();

  // Dashboard summary stats
  router.get("/stats", (_req, res) => {
    res.json({ success: true, ...CSVService.getDashboardStats() });
  });

  // MLC Mechanical Royalties
  router.get("/mlc", (_req, res) => {
    res.json({ success: true, data: CSVService.getMlcData() });
  });

  router.post("/mlc/import", (req, res) => {
    const { csv } = req.body;
    if (!csv) {
      res.status(400).json({ success: false, error: "csv string required" });
      return;
    }
    const count = CSVService.importMlcCSV(csv);
    res.json({ success: true, imported: count });
  });

  router.get("/mlc/export", (_req, res) => {
    const data = CSVService.getMlcData();
    const csv = CSVService.toCSV(data);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=mlc-royalties.csv");
    res.send(csv);
  });

  // SoundExchange Data
  router.get("/soundexchange", (_req, res) => {
    res.json({ success: true, data: CSVService.getSoundExchangeData() });
  });

  router.post("/soundexchange/import", (req, res) => {
    const { csv } = req.body;
    if (!csv) {
      res.status(400).json({ success: false, error: "csv string required" });
      return;
    }
    const count = CSVService.importSoundExchangeCSV(csv);
    res.json({ success: true, imported: count });
  });

  router.get("/soundexchange/export", (_req, res) => {
    const data = CSVService.getSoundExchangeData();
    const csv = CSVService.toCSV(data);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=soundexchange.csv");
    res.send(csv);
  });

  // SuperBass Stats
  router.get("/superbass", (_req, res) => {
    res.json({ success: true, data: CSVService.getSuperBassData() });
  });

  return router;
}
