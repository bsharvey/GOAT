import { Router } from "express";
import { PaymentModel } from "../models/Payment.js";
import { protect, authorize } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/error-handler.js";
import { qs, p } from "../utils/query.js";

export function paymentRoutes(): Router {
  const router = Router();

  // List payments
  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const result = await PaymentModel.list({
        artist_id: qs(req.query.artist_id),
        status: qs(req.query.status),
        limit: req.query.limit ? Number(req.query.limit) : 20,
        offset: req.query.offset ? Number(req.query.offset) : 0,
      });
      res.json({ success: true, ...result });
    })
  );

  // Get single payment
  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const payment = await PaymentModel.findById(p(req.params.id!));
      res.json({ success: true, data: payment });
    })
  );

  // Get payment summary for artist
  router.get(
    "/summary/:artistId",
    asyncHandler(async (req, res) => {
      const summary = await PaymentModel.getPaymentSummary(p(req.params.artistId!));
      res.json({ success: true, data: summary });
    })
  );

  // Create payment (auth required)
  router.post(
    "/",
    protect,
    asyncHandler(async (req, res) => {
      const { artist_id, total_amount, method, royalty_ids, notes, processing_fees, taxes } = req.body;
      if (!artist_id || !total_amount || !method) {
        throw new AppError("artist_id, total_amount, and method are required", 400);
      }

      const payment = await PaymentModel.create({
        artist_id,
        total_amount,
        method,
        created_by: req.user!.id,
        royalty_ids,
        notes,
        processing_fees,
        taxes,
      });
      res.status(201).json({ success: true, data: payment });
    })
  );

  // Process payment (admin/manager)
  router.put(
    "/:id/process",
    protect,
    authorize("admin", "manager"),
    asyncHandler(async (req, res) => {
      const payment = await PaymentModel.process(p(req.params.id!), req.user!.id);
      res.json({ success: true, data: payment });
    })
  );

  // Complete payment (admin/manager)
  router.put(
    "/:id/complete",
    protect,
    authorize("admin", "manager"),
    asyncHandler(async (req, res) => {
      const payment = await PaymentModel.complete(p(req.params.id!));
      res.json({ success: true, data: payment });
    })
  );

  // Fail payment
  router.put(
    "/:id/fail",
    protect,
    authorize("admin", "manager"),
    asyncHandler(async (req, res) => {
      const { reason } = req.body;
      const payment = await PaymentModel.fail(p(req.params.id!), reason || "Payment failed");
      res.json({ success: true, data: payment });
    })
  );

  return router;
}
