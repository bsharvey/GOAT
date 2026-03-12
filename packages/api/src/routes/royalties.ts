import { Router } from "express";
import type { RoyaltyRecord, Song, Artist } from "@goat/core";

// In-memory store for now — swap with MongoDB later
const artists: Artist[] = [];
const songs: Song[] = [];
const royalties: RoyaltyRecord[] = [];

export function royaltyRoutes() {
  const router = Router();

  // Artists
  router.get("/artists", (_req, res) => {
    res.json({ success: true, data: artists });
  });

  router.post("/artists", (req, res) => {
    const artist: Artist = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      ...req.body,
    };
    artists.push(artist);
    res.status(201).json({ success: true, data: artist });
  });

  // Songs
  router.get("/songs", (_req, res) => {
    res.json({ success: true, data: songs });
  });

  router.post("/songs", (req, res) => {
    const song: Song = {
      id: crypto.randomUUID(),
      plays: 0,
      likes: 0,
      createdAt: new Date(),
      ...req.body,
    };
    songs.push(song);
    res.status(201).json({ success: true, data: song });
  });

  // Royalties
  router.get("/", (_req, res) => {
    res.json({ success: true, data: royalties });
  });

  router.post("/", (req, res) => {
    const record: RoyaltyRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      ...req.body,
    };
    royalties.push(record);
    res.status(201).json({ success: true, data: record });
  });

  // Stats
  router.get("/stats", (_req, res) => {
    const totalRevenue = royalties.reduce((sum, r) => sum + r.amount, 0);
    const totalPlays = songs.reduce((sum, s) => sum + s.plays, 0);

    res.json({
      success: true,
      data: {
        totalArtists: artists.length,
        totalSongs: songs.length,
        totalRoyaltyRecords: royalties.length,
        totalRevenue,
        totalPlays,
      },
    });
  });

  return router;
}
