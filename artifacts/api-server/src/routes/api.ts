import { Router } from "express";
import multer from "multer";
import { getSystemCapabilities } from "@pulseforge/shared/lib/partners/capabilities";
import {
  getTrackDetails,
  getRichsync,
  getTrackLyrics,
  getLyricsAnalysis,
  getLyricsTranslation,
  hasMusixmatchKey,
  mapTrackToApp,
  searchTracks,
  separateWithMusixmatch,
} from "@pulseforge/shared/lib/musixmatch/client";
import { parseRichsyncBody } from "@pulseforge/shared/lib/musixmatch/richsync-parser";
import { mockTracksToApp, searchMockTracks } from "@pulseforge/shared/lib/partners/mock-catalog";
import { fetchCatalogBundle } from "@pulseforge/shared/lib/partners/adapters";
import { fetchCatalogBenchmark } from "@pulseforge/shared/lib/musixmatch/catalog-intelligence";
import { runAnalysis, rerunWhatIf } from "@pulseforge/shared/lib/scoring";
import { getMockAnalysis } from "@pulseforge/shared/lib/mock-data";
import { DEFAULT_WHAT_IF } from "@pulseforge/shared/lib/constants";
import { buildVersionSnapshot } from "@pulseforge/shared/lib/domain/version-snapshot";
import { buildStudioTrack, runStudioAnalysis } from "@pulseforge/shared/lib/scoring/studio-analysis";
import { runIntelligentOptimize } from "@pulseforge/shared/lib/studio/intelligent-optimize";
import { fetchStudioDraftPartners } from "@pulseforge/shared/lib/scoring/studio-draft-partners";
import { runViralAnalysis } from "@pulseforge/shared/lib/viral/run-viral-analysis";
import { getLiveTrendFeed } from "@pulseforge/shared/lib/trends/feed";
import { evaluateSeasonalContext } from "@pulseforge/shared/lib/trends/seasonal-calendar";
import { buildReleaseHistory } from "@pulseforge/shared/lib/scoring/release-history";
import { composeLyricsBody } from "@pulseforge/shared/lib/studio/lyrics";
import { hasElevenLabsKey, synthesizeSpeech, listVoices, cloneVoice, composeMusic, separateMusicStems } from "@pulseforge/shared/lib/elevenlabs/client";
import { hasLalalKey, separateWithLalal } from "@pulseforge/shared/lib/lalal/client";
import { searchConcerts } from "@pulseforge/shared/lib/jambase/client";
import { triggerWorkflow } from "@pulseforge/shared/lib/n8n/client";
import type { WhatIfParams, TrackAnalysis } from "@pulseforge/shared/types";
import type { AppTrack } from "@pulseforge/shared/lib/musixmatch/client";
import type { LyricsSections, StudioProject } from "@pulseforge/shared/types/studio";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

export const apiRouter = Router();

apiRouter.get("/capabilities", (_req, res) => {
  res.json(getSystemCapabilities());
});

apiRouter.get("/trends", async (_req, res) => {
  try {
    const [feed, seasonal] = await Promise.all([
      getLiveTrendFeed(),
      Promise.resolve(evaluateSeasonalContext({})),
    ]);
    res.json({ ...feed, seasonal });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Trend feed unavailable",
    });
  }
});

apiRouter.get("/search", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  if (q.length < 2) {
    res.status(400).json({ error: "Query must be at least 2 characters" });
    return;
  }

  if (!hasMusixmatchKey()) {
    const results = searchMockTracks(q);
    res.json({ results, total: results.length, source: "mock-demo", demoMode: true });
    return;
  }

  try {
    const tracks = await searchTracks(q, 12);
    res.json({
      results: tracks.map(mapTrackToApp),
      total: tracks.length,
      source: "musixmatch",
      demoMode: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    if (message.includes("Musixmatch") || message.includes("Invalid") || message.includes("not configured")) {
      // Debug: show what key we are actually using (sanitized)
      const rawKey = process.env.MUSIXMATCH_API_KEY || process.env.MXM_KEY || '';
      console.warn(`Musixmatch key debug: length=${rawKey.length}, startsWith=${rawKey.slice(0,4)}..., endsWith=...${rawKey.slice(-4)}`);
      
      // Fallback to mock on key issues — this is expected if no valid key or key not working
      const results = searchMockTracks(q);
      res.json({ 
        results, 
        total: results.length, 
        source: "mock-demo", 
        demoMode: true,
        warning: message 
      });
      return;
    }
    console.error("Search error for q=", q, err);
    const hint = "Check backend logs and Musixmatch key setup.";
    res.status(502).json({ error: message, hint });
  }
});

apiRouter.get("/catalog/track/:id", async (req, res) => {
  const trackId = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(trackId)) {
    res.status(400).json({ error: "Invalid track id" });
    return;
  }

  if (!hasMusixmatchKey()) {
    const mock = mockTracksToApp();
    const hit = mock.find((t) => t.id === String(trackId)) ?? mock[0];
    if (!hit) {
      res.status(404).json({ error: "Track not found" });
      return;
    }
    res.json({ track: hit, source: "mock-demo", demoMode: true });
    return;
  }

  try {
    const raw = await getTrackDetails(trackId);
    if (!raw) {
      res.status(404).json({ error: "Track not found" });
      return;
    }
    res.json({ track: mapTrackToApp(raw), source: "musixmatch", demoMode: false });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Catalog lookup failed" });
  }
});

apiRouter.get("/catalog/richsync/:id", async (req, res) => {
  const trackId = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(trackId)) {
    res.status(400).json({ error: "Invalid track id" });
    return;
  }

  if (!hasMusixmatchKey()) {
    res.status(503).json({ error: "Musixmatch API key not configured", demoMode: true });
    return;
  }

  try {
    const body = await getRichsync(trackId);
    if (!body) {
      res.status(404).json({ error: "Richsync not available for this track" });
      return;
    }
    const parsed = parseRichsyncBody(body);
    res.json({ richsync: parsed, source: "musixmatch" });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Richsync fetch failed" });
  }
});

apiRouter.get("/catalog/lyrics/:id", async (req, res) => {
  const trackId = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(trackId)) {
    res.status(400).json({ error: "Invalid track id" });
    return;
  }
  if (!hasMusixmatchKey()) {
    res.status(503).json({ error: "Musixmatch API key not configured", demoMode: true });
    return;
  }
  try {
    const lyrics = await getTrackLyrics(trackId);
    if (!lyrics) {
      res.status(404).json({ error: "Lyrics not found" });
      return;
    }
    res.json({ lyrics, source: "musixmatch" });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Lyrics fetch failed" });
  }
});

apiRouter.get("/catalog/analysis/:id", async (req, res) => {
  const trackId = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(trackId)) {
    res.status(400).json({ error: "Invalid track id" });
    return;
  }
  if (!hasMusixmatchKey()) {
    res.status(503).json({ error: "Musixmatch API key not configured", demoMode: true });
    return;
  }
  try {
    const analysis = await getLyricsAnalysis(trackId);
    res.json({ analysis, source: "musixmatch" });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Analysis fetch failed" });
  }
});

apiRouter.get("/catalog/translation", async (req, res) => {
  const trackId = parseInt(String(req.query.track_id ?? ""), 10);
  const lang = String(req.query.lang ?? "en").slice(0, 5);
  if (!Number.isFinite(trackId)) {
    res.status(400).json({ error: "track_id query param required" });
    return;
  }
  if (!hasMusixmatchKey()) {
    res.status(503).json({ error: "Musixmatch API key not configured", demoMode: true });
    return;
  }
  try {
    const translation = await getLyricsTranslation(trackId, lang);
    if (!translation) {
      res.status(404).json({ error: "Translation not available" });
      return;
    }
    res.json({ translation, source: "musixmatch", language: lang });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : "Translation fetch failed" });
  }
});

apiRouter.post("/analyze", async (req, res) => {
  try {
    const body = req.body as {
      track: AppTrack;
      whatIf?: Partial<WhatIfParams>;
      cachedAnalysis?: TrackAnalysis;
    };

    if (!body.track?.id) {
      res.status(400).json({ error: "Track is required" });
      return;
    }

    const whatIf: WhatIfParams = { ...DEFAULT_WHAT_IF, ...body.whatIf };

    if (body.cachedAnalysis && body.whatIf) {
      res.json({ analysis: rerunWhatIf(body.cachedAnalysis, body.track, whatIf), source: "scoring-engine" });
      return;
    }

    if (!hasMusixmatchKey()) {
      res.json({
        analysis: getMockAnalysis(body.track, whatIf),
        source: "mock-demo",
        demoMode: true,
        capabilities: getSystemCapabilities(),
      });
      return;
    }

    let bundle;
    let source = "musixmatch+cyanite+songstats+scoring-engine";
    let demoMode = false;
    const trendFeed = await getLiveTrendFeed();
    try {
      bundle = await fetchCatalogBundle(body.track);
    } catch (e) {
      if (e instanceof Error && (e.message.includes("Musixmatch") || e.message.includes("Invalid") || e.message.includes("not configured"))) {
        console.warn("Falling back to mock due to Musixmatch key issue in analyze:", e.message);
        const analysis = getMockAnalysis(body.track, whatIf);
        res.json({ analysis, source: "mock-demo", demoMode: true, warning: e.message });
        return;
      }
      throw e;
    }
    const catalogBenchmark = await fetchCatalogBenchmark(bundle.track, bundle.mxmAnalysis);
    const analysis = runAnalysis({
      track: bundle.track,
      lyrics: bundle.lyrics,
      mxmAnalysis: bundle.mxmAnalysis,
      richsync: bundle.richsync,
      catalogBenchmark,
      cyanite: bundle.cyanite,
      songstats: bundle.songstats,
      velocityHistory: bundle.velocityHistory,
      artistMomentum: bundle.artistMomentum,
      trendFeed,
      whatIf,
    });

    res.json({ analysis, source, demoMode });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    const hint = message.includes("Musixmatch") || message.includes("Invalid")
      ? "Verify MUSIXMATCH_API_KEY or MXM_KEY in backend/.env exactly (restart server after edit), or use demo mode by leaving it empty."
      : undefined;
    res.status(500).json({ error: message, hint });
  }
});

apiRouter.post("/studio/analyze", async (req, res) => {
  try {
    const body = req.body as {
      project: StudioProject;
      versionId?: string;
      lyricsBody?: string;
      whatIf?: Partial<WhatIfParams>;
      cachedAnalysis?: TrackAnalysis;
      allProjects?: StudioProject[];
    };

    if (!body.project?.id) {
      res.status(400).json({ error: "Project is required" });
      return;
    }

    const versionId = body.versionId ?? body.project.activeVersionId;
    const snapshot = buildVersionSnapshot(body.project, versionId);
    const whatIf: WhatIfParams = { ...DEFAULT_WHAT_IF, ...body.whatIf };

    if (body.cachedAnalysis && body.whatIf) {
      const track = buildStudioTrack(body.project, snapshot?.audio);
      res.json({
        analysis: rerunWhatIf(body.cachedAnalysis, track, whatIf),
        source: "pulseforge-studio-what-if",
        versionId,
        snapshot,
      });
      return;
    }

    let lyricsBody = body.lyricsBody?.trim();
    const version = body.project.versions.find((v) => v.id === versionId);
    if (!lyricsBody && version) lyricsBody = composeLyricsBody(version.lyrics);

    if (!lyricsBody || lyricsBody.split(/\s+/).filter((w) => w.length > 0).length < 5) {
      res.status(400).json({ error: "Add more lyrics before analyzing" });
      return;
    }

    const [draftPartners, trendFeed] = await Promise.all([
      fetchStudioDraftPartners(body.project, versionId, snapshot?.audio),
      getLiveTrendFeed(),
    ]);
    const releaseHistory = buildReleaseHistory(
      body.project,
      body.allProjects ?? [],
      versionId
    );
    const analysis = runStudioAnalysis({
      project: body.project,
      lyricsBody,
      versionId,
      snapshot: snapshot ?? undefined,
      whatIf,
      trackPatch: draftPartners.trackPatch,
      cyanite: draftPartners.cyanite,
      songstats: draftPartners.songstats,
      velocityHistory: draftPartners.velocityHistory,
      mxmAnalysis: draftPartners.mxmAnalysis,
      richsync: draftPartners.richsync,
      catalogBenchmark: draftPartners.catalogBenchmark,
      artistMomentum: draftPartners.artistMomentum,
      trendFeed,
      releaseHistory,
      releaseDate: version?.launchPlan?.targetReleaseDate,
    });

    res.json({
      analysis,
      source: "pulseforge-studio",
      versionId,
      snapshot,
      contentFingerprint: snapshot?.contentFingerprint,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Studio analysis failed" });
  }
});

apiRouter.post("/studio/lyrics/coach-fix", async (req, res) => {
  try {
    const body = req.body as {
      project: StudioProject;
      analysis: TrackAnalysis;
      lyrics?: LyricsSections;
      versionId?: string;
    };

    if (!body.project?.id || !body.analysis) {
      res.status(400).json({ error: "Project and baseline analysis are required" });
      return;
    }

    const versionId = body.versionId ?? body.project.activeVersionId;
    const version =
      body.project.versions.find((v) => v.id === versionId) ??
      body.project.versions[0];
    const lyrics = body.lyrics ?? version?.lyrics;
    if (!lyrics) {
      res.status(400).json({ error: "Lyrics are required for coach fix" });
      return;
    }

    const result = await runIntelligentOptimize({
      project: body.project,
      analysis: body.analysis,
      lyrics,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Coach fix failed",
    });
  }
});

apiRouter.post("/viral/analyze", async (req, res) => {
  try {
    const body = req.body as {
      project: StudioProject;
      versionId?: string;
      whatIf?: Partial<WhatIfParams>;
      allProjects?: StudioProject[];
    };

    if (!body.project?.id) {
      res.status(400).json({ error: "Project is required" });
      return;
    }

    const viral = await runViralAnalysis({
      project: body.project,
      versionId: body.versionId,
      whatIf: body.whatIf,
      allProjects: body.allProjects,
    });

    res.json({ viral, source: "pulseforge-viral-lab" });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Viral analysis failed" });
  }
});

apiRouter.get("/studio/voices", async (req, res) => {
  try {
    if (!hasElevenLabsKey()) {
      res.status(503).json({ error: "ELEVENLABS_API_KEY is not configured" });
      return;
    }
    const voices = await listVoices();
    res.json({ voices });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Failed to fetch voices" });
  }
});

apiRouter.post("/studio/voices/clone", upload.single("sample"), async (req, res) => {
  try {
    if (!hasElevenLabsKey()) {
      res.status(503).json({ error: "ELEVENLABS_API_KEY is not configured" });
      return;
    }
    const name = (req.body as { name?: string }).name || "Cloned Voice";
    const description = (req.body as { description?: string }).description;

    if (!req.file) {
      res.status(400).json({ error: "Audio sample file is required" });
      return;
    }

    const buffer = Buffer.from(req.file.buffer);
    const cloned = await cloneVoice(name, [buffer], description);

    res.json({
      voice_id: cloned.voice_id,
      name: cloned.name,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Voice cloning failed" });
  }
});

apiRouter.post("/studio/tts", async (req, res) => {
  try {
    if (!hasElevenLabsKey()) {
      res.status(503).json({ error: "ELEVENLABS_API_KEY is not configured" });
      return;
    }

    const body = req.body as {
      text?: string;
      voiceId?: string;
      modelId?: string;
      stability?: number;
      similarityBoost?: number;
      style?: number;
      useSpeakerBoost?: boolean;
      maxLength?: number;
    };

    const text = body.text?.trim();
    if (!text) {
      res.status(400).json({ error: "Text is required" });
      return;
    }

    const result = await synthesizeSpeech(text, {
      voiceId: body.voiceId,
      modelId: body.modelId,
      stability: body.stability,
      similarityBoost: body.similarityBoost,
      style: body.style,
      useSpeakerBoost: body.useSpeakerBoost,
      maxLength: body.maxLength,
    });

    res.setHeader("Content-Type", result.mimeType);
    res.setHeader("X-Voice-Id", result.voiceId);
    res.send(Buffer.from(result.audio));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "TTS failed" });
  }
});

// Full song generation using ElevenLabs Music (not TTS). Supports custom lyrics + style via prompt.
apiRouter.post("/studio/music", async (req, res) => {
  try {
    if (!hasElevenLabsKey()) {
      res.status(503).json({ error: "ELEVENLABS_API_KEY is not configured" });
      return;
    }

    const body = req.body as {
      prompt?: string;
      modelId?: string;
      musicLengthMs?: number;
      forceInstrumental?: boolean;
      compositionPlan?: any;
    };

    const prompt = body.prompt?.trim() ?? "";
    if (!prompt && !body.compositionPlan) {
      res.status(400).json({ error: "Prompt or composition plan is required for full song generation" });
      return;
    }

    const result = await composeMusic(prompt, {
      modelId: body.modelId,
      musicLengthMs: body.compositionPlan ? undefined : body.musicLengthMs,
      forceInstrumental: body.forceInstrumental,
      compositionPlan: body.compositionPlan,
    });

    res.setHeader("Content-Type", result.mimeType);
    if (result.songId) {
      res.setHeader("X-Song-Id", result.songId);
    }
    res.send(Buffer.from(result.audio));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Music generation failed" });
  }
});

apiRouter.post("/studio/music/stems", upload.single("file"), async (req, res) => {
  try {
    if (!hasElevenLabsKey()) {
      res.status(503).json({ error: "ELEVENLABS_API_KEY is not configured" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Audio file is required" });
      return;
    }
    const fileBuf = req.file.buffer;
    const arrayBuffer = fileBuf.buffer.slice(
      fileBuf.byteOffset,
      fileBuf.byteOffset + fileBuf.byteLength
    ) as ArrayBuffer;

    const stems = await separateMusicStems(arrayBuffer, req.file.originalname);

    const outStems: Record<string, string> = {};
    for (const [id, buf] of Object.entries(stems)) {
      outStems[id] = Buffer.from(buf).toString("base64");
    }

    res.json({ source: "eleven-music", stems: outStems, mimeType: "audio/mpeg" });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Eleven Music stem separation failed" });
  }
});

apiRouter.post("/studio/stems/lalal", upload.single("file"), async (req, res) => {
  try {
    if (!hasLalalKey()) {
      res.status(503).json({ error: "LALAL_API_KEY is not configured", fallback: "client" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Audio file is required" });
      return;
    }
    const fileBuf = req.file.buffer;
    const arrayBuffer = fileBuf.buffer.slice(
      fileBuf.byteOffset,
      fileBuf.byteOffset + fileBuf.byteLength
    ) as ArrayBuffer;
    const blobs = await separateWithLalal(arrayBuffer, req.file.originalname);
    const stems: Record<string, string> = {};
    for (const id of ["vocals", "drums", "bass", "other"] as const) {
      const data = blobs[id];
      if (data) stems[id] = Buffer.from(data).toString("base64");
    }
    if (!Object.keys(stems).length) {
      res.status(502).json({ error: "No stems returned from LALAL.AI" });
      return;
    }
    res.json({ source: "lalal", stems, mimeType: "audio/mpeg" });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "LALAL.AI separation failed" });
  }
});

// Musixmatch Pro Stem Separation
apiRouter.post("/studio/stems/musixmatch", upload.single("file"), async (req, res) => {
  try {
    if (!hasMusixmatchKey()) {
      res.status(503).json({ error: "MUSIXMATCH_API_KEY / MXM_KEY is not configured" });
      return;
    }
    if (!req.file) {
      res.status(400).json({ error: "Audio file is required" });
      return;
    }
    const fileBuf = req.file.buffer;
    const arrayBuffer = fileBuf.buffer.slice(
      fileBuf.byteOffset,
      fileBuf.byteOffset + fileBuf.byteLength
    ) as ArrayBuffer;

    const stemsBuf = await separateWithMusixmatch(arrayBuffer, req.file.originalname);

    const stems: Record<string, string> = {};
    for (const id of ["vocals", "drums", "bass", "other"] as const) {
      const data = stemsBuf[id];
      if (data) stems[id] = Buffer.from(data).toString("base64");
    }

    if (!Object.keys(stems).length) {
      res.status(502).json({ error: "No stems returned from Musixmatch" });
      return;
    }

    res.json({ source: "musixmatch", stems, mimeType: "audio/mpeg" });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Musixmatch stem separation failed" });
  }
});

apiRouter.get("/jambase/concerts", async (req, res) => {
  const artist = String(req.query.artist ?? "").trim();
  const genre = String(req.query.genre ?? "").trim();
  if (!artist) {
    res.status(400).json({ error: "artist query param is required" });
    return;
  }
  try {
    res.json(await searchConcerts(artist, genre || undefined));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "JamBase search failed" });
  }
});

apiRouter.post("/workflows/n8n", async (req, res) => {
  try {
    const result = await triggerWorkflow(req.body);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "n8n trigger failed" });
  }
});