import express from "express";
import cors from "cors";
import { apiRouter } from "./routes/api.js";
import { cloudRouter } from "./routes/cloud.js";
import { authRouter } from "./routes/auth.js";
import { requireApiKey } from "./middleware/api-key.js";
import { getHealthStatus } from "./lib/health.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
      credentials: true,
    })
  );
  app.use(express.json({ limit: "50mb" }));

  app.get("/health", async (_req, res) => {
    const status = await getHealthStatus();
    res.json(status);
  });

  app.use("/api", requireApiKey);
  app.use("/api", apiRouter);
  app.use("/api/cloud/auth", authRouter);
  app.use("/api/cloud", cloudRouter);

  return app;
}