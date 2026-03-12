import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "dotenv";
import { loyaltyMiddleware } from "./middleware/loyalty.js";
import { royaltyRoutes } from "./routes/royalties.js";
import { agentRoutes } from "./routes/agent.js";
import { voiceRoutes } from "./routes/voice.js";
import { securityRoutes } from "./routes/security.js";
import { healthRoutes } from "./routes/health.js";
import { loyaltyRoutes } from "./routes/loyalty.js";
import { activationRoutes } from "./routes/activation.js";

config();

const app = express();
const PORT = process.env.PORT || 5001;

// Base middleware
app.use(helmet());
app.use(cors());
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
app.use("/api/voice", voiceRoutes());
app.use("/api/security", securityRoutes());

app.listen(PORT, () => {
  console.log(`GOAT API running on http://localhost:${PORT}`);
  console.log(`System protected by GOAT Royalty Force`);
  console.log(`Awaiting activation... speak the words.`);
});

export default app;
