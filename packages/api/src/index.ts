import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "dotenv";
import { connectDB } from "./db.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";
import { loyaltyMiddleware } from "./middleware/loyalty.js";
import { royaltyRoutes } from "./routes/royalties.js";
import { agentRoutes } from "./routes/agent.js";
import { voiceRoutes } from "./routes/voice.js";
import { securityRoutes } from "./routes/security.js";
import { healthRoutes } from "./routes/health.js";
import { loyaltyRoutes } from "./routes/loyalty.js";
import { activationRoutes } from "./routes/activation.js";
import { agentManagerRoutes } from "./routes/agents.js";
import { ragRoutes } from "./routes/rag.js";
import { dataRoutes } from "./routes/data.js";
import { spotifyRoutes } from "./routes/spotify.js";
import { archetypeRoutes } from "./routes/archetypes.js";
import { councilRoutes } from "./routes/council.js";
import { decisionRoutes } from "./routes/decisions.js";
import { authRoutes } from "./routes/auth.js";
import { artistRoutes } from "./routes/artists.js";
import { paymentRoutes } from "./routes/payments.js";
import { contractRoutes } from "./routes/contracts.js";
import { reportRoutes } from "./routes/reports.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";

config();

// Connect to Supabase
connectDB();

const app = express();
const PORT = process.env.PORT || 5001;

// Base middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",")
    : ["http://localhost:3000", "http://localhost:5173", "https://goat-app.pages.dev"],
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

// GOAT Force loyalty middleware — applied to ALL routes
// Blocks anyone not in the GOAT Royalty Force
app.use(loyaltyMiddleware);

// Routes
app.use("/api/health", healthRoutes());
app.use("/", loyaltyRoutes());
app.use("/", activationRoutes());
app.use("/api/royalties", royaltyRoutes());
app.use("/api/agent", agentRoutes());
app.use("/api/agents", agentManagerRoutes());
app.use("/api/rag", ragRoutes());
app.use("/api/data", dataRoutes());
app.use("/api/spotify", spotifyRoutes());
app.use("/api/voice", voiceRoutes());
app.use("/api/security", securityRoutes());

// Auth & CRUD routes
app.use("/api/auth", authRoutes());
app.use("/api/artists", artistRoutes());
app.use("/api/payments", paymentRoutes());
app.use("/api/contracts", contractRoutes());
app.use("/api/reports", reportRoutes());

// Archetypal AI Civilization routes (invisible backbone)
app.use("/api/archetypes", archetypeRoutes());
app.use("/api/council", councilRoutes());
app.use("/api/decisions", decisionRoutes());

// Serve frontend static files in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const webDistPath = join(__dirname, "../../web/dist");

if (process.env.NODE_ENV === "production" && existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
  // SPA catch-all — serve index.html for all non-API routes
  app.get("*", (_req, res) => {
    res.sendFile(join(webDistPath, "index.html"));
  });
}

// Error handling (after all routes)
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`GOAT API running on http://localhost:${PORT}`);
  console.log(`System protected by GOAT Royalty Force`);
  console.log(`Awaiting activation... speak the words.`);
});

export default app;
