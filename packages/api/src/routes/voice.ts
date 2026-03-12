import { Router } from "express";
import OpenAI from "openai";

export function voiceRoutes() {
  const router = Router();

  // Speech-to-Text (Whisper)
  router.post("/stt", async (req, res) => {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      // Expects multipart form data with 'audio' field
      // In production, use multer middleware for file upload
      res.json({
        success: true,
        text: "[STT endpoint ready — wire up multer for audio upload]",
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "STT failed";
      res.status(500).json({ success: false, error: msg });
    }
  });

  // Text-to-Speech (OpenAI TTS or ElevenLabs)
  router.post("/tts", async (req, res) => {
    try {
      const { text, voice = "onyx" } = req.body;

      if (!text) {
        res.status(400).json({ success: false, error: "Text is required" });
        return;
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const mp3 = await openai.audio.speech.create({
        model: "tts-1",
        voice: voice as "onyx" | "alloy" | "echo" | "fable" | "nova" | "shimmer",
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());
      res.set("Content-Type", "audio/mpeg");
      res.send(buffer);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "TTS failed";
      res.status(500).json({ success: false, error: msg });
    }
  });

  return router;
}
