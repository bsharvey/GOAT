import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "dotenv";
import { royaltyRoutes } from "./routes/royalties.js";
import { agentRoutes } from "./routes/agent.js";
import { voiceRoutes } from "./routes/voice.js";
import { securityRoutes } from "./routes/security.js";
import { healthRoutes } from "./routes/health.js";

config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Routes
app.use("/api/health", healthRoutes());
app.use("/api/royalties", royaltyRoutes());
app.use("/api/agent", agentRoutes());
app.use("/api/voice", voiceRoutes());
app.use("/api/security", securityRoutes());

app.listen(PORT, () => {
  console.log(`GOAT API running on http://localhost:${PORT}`);
});

export default app;
