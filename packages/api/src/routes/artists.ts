import { Router } from "express";
import { ArtistModel } from "../models/Artist.js";
import { protect, authorize } from "../middleware/auth.js";
import { asyncHandler, AppError } from "../middleware/error-handler.js";
import { qs, p } from "../utils/query.js";

export function artistRoutes(): Router {
  const router = Router();

  // List artists
  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const result = await ArtistModel.list({
        limit: req.query.limit ? Number(req.query.limit) : 20,
        offset: req.query.offset ? Number(req.query.offset) : 0,
        search: qs(req.query.search),
        active: req.query.active !== undefined ? req.query.active === "true" : undefined,
      });
      res.json({ success: true, ...result });
    })
  );

  // Get single artist
  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const artist = await ArtistModel.findById(p(req.params.id!));
      res.json({ success: true, data: artist });
    })
  );

  // Get artist earnings summary
  router.get(
    "/:id/earnings",
    asyncHandler(async (req, res) => {
      const summary = await ArtistModel.getEarningsSummary(p(req.params.id!));
      res.json({ success: true, data: summary });
    })
  );

  // Create artist (auth required)
  router.post(
    "/",
    protect,
    asyncHandler(async (req, res) => {
      const { name, email, phone, bio, genre, tags } = req.body;
      if (!name) throw new AppError("Artist name is required", 400);

      const artist = await ArtistModel.create({
        user_id: req.user!.id,
        name,
        email,
        phone,
        bio,
        genre,
        tags,
      });
      res.status(201).json({ success: true, data: artist });
    })
  );

  // Update artist
  router.put(
    "/:id",
    protect,
    asyncHandler(async (req, res) => {
      const artist = await ArtistModel.update(p(req.params.id!), req.body);
      res.json({ success: true, data: artist });
    })
  );

  // Delete artist (admin/manager only)
  router.delete(
    "/:id",
    protect,
    authorize("admin", "manager"),
    asyncHandler(async (req, res) => {
      await ArtistModel.delete(p(req.params.id!));
      res.json({ success: true, message: "Artist deleted" });
    })
  );

  return router;
}
