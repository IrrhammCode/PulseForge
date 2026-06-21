import express from "express";
import cors from "cors";
import { apiRouter } from "./routes/api.js";
import { cloudRouter } from "./routes/cloud.js";
import { authRouter } from "./routes/auth.js";
import { requireApiKey } from "./middleware/api-key.js";
import { getHealthStatus } from "./lib/health.js";

export function createApp() {
  const app = express();

  // Behind Replit's proxy — trust X-Forwarded-For so req.ip / rate limiting see the real client.
  app.set("trust proxy", true);

  app.use(
    cors({
      origin: true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: "50mb" }));

  app.get("/health", async (_req, res) => {
    const status = await getHealthStatus();
    res.json(status);
  });

  app.get("/api/healthz", async (_req, res) => {
    const status = await getHealthStatus();
    res.json(status);
  });

  app.use("/api", requireApiKey);
  app.use("/api", apiRouter);
  app.use("/api/cloud/auth", authRouter);
  app.use("/api/cloud", cloudRouter);

  return app;
}