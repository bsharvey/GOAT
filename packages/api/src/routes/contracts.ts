import { Router } from "express";
import { ContractModel } from "../models/Contract.js";
import { protect, authorize } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/error-handler.js";
import { qs, p } from "../utils/query.js";

export function contractRoutes(): Router {
  const router = Router();

  // List contracts
  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const result = await ContractModel.list({
        status: qs(req.query.status),
        type: qs(req.query.type),
        artist_id: qs(req.query.artist_id),
        limit: req.query.limit ? Number(req.query.limit) : 20,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      });
      res.json({ success: true, ...result });
    })
  );

  // Get expiring contracts
  router.get(
    "/expiring",
    asyncHandler(async (req, res) => {
      const days = req.query.days ? Number(req.query.days) : 30;
      const contracts = await ContractModel.getExpiring(days);
      res.json({ success: true, data: contracts });
    })
  );

  // Get single contract with details
  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const contract = await ContractModel.findById(p(req.params.id!));
      res.json({ success: true, data: contract });
    })
  );

  // Create contract (auth required)
  router.post(
    "/",
    protect,
    asyncHandler(async (req, res) => {
      const { title, type, start_date, duration_months, artist_ids, exclusivity, territory, payment_frequency, notes, royalties, advances } = req.body;

      if (!title || !type || !start_date || !duration_months || !artist_ids?.length) {
        throw new AppError("title, type, start_date, duration_months, and artist_ids are required", 400);
      }

      const contract = await ContractModel.create({
        title,
        type,
        start_date,
        duration_months,
        created_by: req.user!.id,
        artist_ids,
        exclusivity,
        territory,
        payment_frequency,
        notes,
        royalties,
        advances,
      });
      res.status(201).json({ success: true, data: contract });
    })
  );

  // Activate contract (admin/manager)
  router.put(
    "/:id/activate",
    protect,
    authorize("admin", "manager"),
    asyncHandler(async (req, res) => {
      const contract = await ContractModel.activate(p(req.params.id!), req.user!.id);
      res.json({ success: true, data: contract });
    })
  );

  // Terminate contract (admin/manager)
  router.put(
    "/:id/terminate",
    protect,
    authorize("admin", "manager"),
    asyncHandler(async (req, res) => {
      const { reason } = req.body;
      if (!reason) throw new AppError("Termination reason is required", 400);
      const contract = await ContractModel.terminate(p(req.params.id!), req.user!.id, reason);
      res.json({ success: true, data: contract });
    })
  );

  return router;
}
