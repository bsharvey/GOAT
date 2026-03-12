import { Router } from "express";
import { RoyaltyModel } from "../models/Royalty.js";
import { PaymentModel } from "../models/Payment.js";
import { asyncHandler } from "../middleware/error-handler.js";
import { qs, p } from "../utils/query.js";

export function reportRoutes(): Router {
  const router = Router();

  // Revenue by source (pie chart data)
  router.get(
    "/revenue-by-source",
    asyncHandler(async (_req, res) => {
      const data = await RoyaltyModel.getRevenueBySource();
      res.json({ success: true, data });
    })
  );

  // Revenue by period (line/area chart data)
  router.get(
    "/revenue-by-period",
    asyncHandler(async (req, res) => {
      const months = req.query.months ? Number(req.query.months) : 12;
      const data = await RoyaltyModel.getRevenueByPeriod(months);
      res.json({ success: true, data });
    })
  );

  // Overall stats
  router.get(
    "/stats",
    asyncHandler(async (_req, res) => {
      const stats = await RoyaltyModel.getStats();
      res.json({ success: true, data: stats });
    })
  );

  // Artist-specific summary
  router.get(
    "/artist/:artistId",
    asyncHandler(async (req, res) => {
      const [royaltySummary, paymentSummary] = await Promise.all([
        RoyaltyModel.getArtistSummary(p(req.params.artistId!), qs(req.query.start_date), qs(req.query.end_date)),
        PaymentModel.getPaymentSummary(p(req.params.artistId!)),
      ]);
      res.json({ success: true, data: { royalties: royaltySummary, payments: paymentSummary } });
    })
  );

  return router;
}
