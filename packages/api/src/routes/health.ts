import { Router } from "express";

export function healthRoutes() {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      status: "ok",
      service: "goat-api",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
