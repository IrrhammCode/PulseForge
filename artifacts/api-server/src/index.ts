import "dotenv/config";
import { createApp } from "./app.js";

const PORT = Number(process.env.PORT ?? 4000);
const app = createApp();

app.listen(PORT, () => {
  console.log(`PulseForge backend listening on http://localhost:${PORT}`);
  const dbUrl = process.env.PULSEFORGE_DATABASE_URL ?? "file:./data/pulseforge.db";
  // Never log the raw connection string — it can contain credentials. Report
  // only the scheme (e.g. "file", "postgresql").
  const dbScheme = dbUrl.split(":", 1)[0] || "unknown";
  console.log(`Database: ${dbScheme}`);
  const partners = [
    `Musixmatch: ${(process.env.MUSIXMATCH_API_KEY || process.env.MXM_KEY) ? "configured" : "demo/mock"}`,
    `Cyanite: ${process.env.CYANITE_ACCESS_TOKEN ? "configured" : "demo"}`,
    `Songstats: ${process.env.SONGSTATS_API_KEY ? "configured" : "demo"}`,
    `ElevenLabs: ${process.env.ELEVENLABS_API_KEY ? "configured" : "off"}`,
    `LALAL: ${process.env.LALAL_API_KEY ? "configured" : "off"}`,
    `JamBase: ${process.env.JAMBASE_API_KEY ? "configured" : "demo"}`,
    `n8n: ${process.env.N8N_WEBHOOK_URL ? "configured" : "off"}`,
    `Trend feed: ${process.env.TREND_FEED_URL ? "remote" : "curated"}`,
  ];
  console.log(`Partners: ${partners.join(', ')}`);
});