/**
 * Spotify Integration Routes
 */

import { Router } from "express";
import { spotifyService } from "../services/spotify.js";

export function spotifyRoutes() {
  const router = Router();

  // Check if Spotify is configured
  router.get("/status", (_req, res) => {
    res.json({
      success: true,
      configured: spotifyService.isConfigured(),
    });
  });

  // Search for an artist
  router.get("/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        res.status(400).json({ success: false, error: "query parameter 'q' required" });
        return;
      }

      const artists = await spotifyService.searchArtist(query);
      res.json({ success: true, artists });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: msg });
    }
  });

  // Get artist by Spotify ID
  router.get("/artist/:id", async (req, res) => {
    try {
      const artist = await spotifyService.getArtist(req.params.id);
      res.json({ success: true, artist });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: msg });
    }
  });

  // Get artist's top tracks
  router.get("/artist/:id/top-tracks", async (req, res) => {
    try {
      const market = (req.query.market as string) || "US";
      const tracks = await spotifyService.getArtistTopTracks(req.params.id, market);
      res.json({ success: true, tracks });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: msg });
    }
  });

  return router;
}
