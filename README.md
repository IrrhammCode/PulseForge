# PulseForge — Local-First Music Studio OS

**Write · Produce · Analyze · Viral Lab · Launch** — one pipeline for lyrics, audio, hit scoring, and release planning. Built for **Musicathon 2026** with deep **Musixmatch** integration and a multi-partner intelligence stack.

[![pnpm workspace](https://img.shields.io/badge/monorepo-pnpm%20workspace-f69220)](pnpm-workspace.yaml)
[![Musixmatch](https://img.shields.io/badge/Musixmatch-API%20integrated-FF5A5F)](lib/shared/src/lib/musixmatch/client.ts)

**[Quick Start](#-quick-start)** · **[Architecture](#️-architecture)** · **[Musixmatch Integration](#-musixmatch-api-integration-primary)** · **[All Partners](#-partner-integrations-proof-of-implementation)** · **[Routes](#-application-routes)** · **[API Matrix](#-api-endpoint-matrix)** · **[Troubleshooting](#-troubleshooting)**

---

## ⏱️ How PulseForge Works in 10 Seconds

```
Write lyrics + creative brief in Studio
        ↓
Produce demo audio, stems, and NLE timeline edits
        ↓
Analyze hit potential (Musixmatch + Cyanite + Songstats scoring)
        ↓
Optimize & Ship — 5-step coach pipeline with partner + AI rewrite
        ↓
Viral Lab — 1M listener simulation + gap analysis
        ↓
Launch — release checklist, concerts, n8n workflows
```

Everything is **local-first** (projects in browser storage). Partner API keys live **only on the backend** — the frontend calls `/api/*` through a proxy.

---

## ⚡ Quick Start

```bash
# 1. Clone
git clone https://github.com/YOUR_ORG/PulseForge.git
cd PulseForge

# 2. Install (pnpm required)
pnpm install

# 3. Configure API server
cp artifacts/api-server/.env.example artifacts/api-server/.env
# Set MUSIXMATCH_API_KEY at minimum (see Environment Variables)

# 4. Run backend + frontend (two terminals)
pnpm --filter @workspace/api-server run dev    # http://localhost:4000
pnpm --filter @workspace/pulseforge run dev    # http://localhost:5173

# 5. Open app
# → http://localhost:5173/welcome → Open Studio
```

**Recommended demo path:** `/welcome` → `/studio` → New Project (template) → Write → Optimize & Ship → Produce → `/analyze` (Hello — Adele) → `/viral` → `/integrations`

---

## 🌍 Project Overview

### What is PulseForge?

PulseForge is a **music studio operating system**: write structured lyrics, generate and edit audio, score tracks against catalog intelligence, simulate viral reach, and plan launches — without switching between five different tools.

### Why does it exist?

Artists and hackathon builders need **Musixmatch-grade catalog data** wired into a real creative workflow — not a standalone lyrics widget. PulseForge connects search, Analysis API, richsync, translation, stems, scoring, and Viral Lab in one local-first app.

### Who is it for?

- **Musicathon 2026** teams showcasing Musixmatch API depth
- **Indie artists** prototyping songs with hit-potential feedback
- **Developers** who want a reference multi-partner music intelligence stack

### How is it different?

| Layer | PulseForge approach |
|-------|---------------------|
| Data | Musixmatch catalog + Analysis API as the spine |
| Scoring | Rule engine + partner adapters (Cyanite energy, Songstats velocity) |
| Studio | Full Write → Produce → Analyze pipeline with IndexedDB audio |
| AI | Server-side coach fix (Groq / B.AI / n8n fallback) — keys never in browser |
| Deploy | Split-ready: Vite SPA + Express API (Replit, Vercel + AWS, local) |

---

## 📂 Repository Structure

Active source lives in **`artifacts/`** and **`lib/shared/`**. Legacy Next.js code is archived in **`.migration-backup/`** (reference only).

```
PulseForge/
├── artifacts/
│   ├── pulseforge/          # @workspace/pulseforge — Vite + React + wouter
│   │   └── src/
│   │       ├── App.tsx                    # Route table
│   │       ├── lib/api-client.ts          # Frontend → /api/* calls
│   │       └── components/studio/         # Write, Produce, Musixmatch Pro, …
│   └── api-server/          # @workspace/api-server — Express + Prisma (SQLite)
│       └── src/routes/api.ts              # All partner proxy routes
├── lib/shared/              # @pulseforge/shared — domain logic + partner clients
│   └── src/lib/
│       ├── musixmatch/      # 19 modules — catalog, analysis, richsync, stems, …
│       ├── cyanite/         # Spotify audio AI (GraphQL)
│       ├── songstats/       # Streaming velocity + artist momentum
│       ├── elevenlabs/      # Music generation, TTS, voice clone, stems
│       ├── lalal/           # AI stem separation
│       ├── jambase/         # Concert intelligence
│       ├── n8n/             # Workflow webhooks
│       ├── scoring/         # Hit potential, simulation, partners merge
│       └── viral/           # 1M crowd sim + gap analysis
├── scripts/                 # Tooling
├── attached_assets/         # Static assets
├── .migration-backup/       # Archived Next.js monorepo (do not edit)
├── pnpm-workspace.yaml
└── package.json             # Root typecheck + build
```

Some local environments may still contain old root-level folders such as `frontend/`, `backend/`, or `shared`, but the active app source is the `artifacts/` + `lib/shared/` workspace shown above.

---

## 🚨 Problem Statement

- **Fragmented tools** — lyrics in one app, stems in another, analytics in a third.
- **Shallow Musixmatch demos** — search-only integrations miss Analysis API, richsync, catalog benchmark, translation, stems.
- **No local-first studio** — cloud-only DAWs lose work offline; PulseForge keeps projects in the browser.
- **Black-box scoring** — hit potential without explainable partner signals (energy, velocity, moods/themes).
- **Viral guesswork** — no structured 1M-listener simulation tied back to lyric and production gaps.

---

## 💡 Solution

PulseForge unifies creative work and partner intelligence:

1. **Musixmatch spine** — every analyze path pulls lyrics, Analysis API, richsync, similar tracks, translation, stems.
2. **Partner merge layer** — `fetchCatalogBundle()` + `runAnalysis()` fuse Cyanite + Songstats into one `TrackAnalysis`.
3. **Studio pipeline** — Write → Produce → Analyze → Compare → Launch with Optimize & Ship coach in the middle.
4. **Viral Lab** — crowd simulation + gap analysis grounded in studio project state.
5. **Server-side secrets** — `vite.config.ts` sets `define: { "process.env": {} }`; all keys stay on `api-server`.

---

## 💎 Key Features

| Feature | Route / module |
|---------|----------------|
| Landing + onboarding | `/welcome` · [`lib/onboarding.ts`][onboarding-file] |
| Project dashboard | `/dashboard` · [`DashboardPage.tsx`][dashboard-page-file] |
| Template-based project creation | `/studio` · [`NewProjectForm.tsx`][new-project-form-file] · `STUDIO_EXAMPLE_PRESETS` in [`example-presets.ts`][example-presets-file] |
| Lyrics + song concept | `/studio/:id/write` · [`WriteTab.tsx`][write-tab-file] · [`SongConceptPanel.tsx`][song-concept-panel-file] |
| Musixmatch Pro tools | [`MusixmatchProTools.tsx`][mxm-pro-tools-file] — Lyrics, Analysis, Catalog, Translation, Lyric Video |
| Full production NLE | `/studio/:id/produce` · [`ProduceTab.tsx`][produce-tab-file] · [`MusicTimelineEditor.tsx`][music-timeline-editor-file] |
| Stem separation | [`StemPanel.tsx`][stem-panel-file] — Musixmatch / ElevenLabs / LALAL / client-side |
| Quick Analyze (catalog tracks) | `/analyze` · [`app/analyze/page.tsx`][analyze-page-file] |
| Optimize & Ship (5-step) | `/studio/:id/optimize` · [`OptimizeShipPanel.tsx`][optimize-ship-panel-file] |
| Viral Lab (1M sim) | `/viral` · [`ViralLabPage.tsx`][viral-lab-page-file] |
| Partner status | `/integrations` · [`IntegrationsPage.tsx`][integrations-page-file] |
| Cloud sync (optional) | `/settings` · [`routes/cloud.ts`][cloud-routes-file] |
| Capabilities probe | `GET /api/capabilities` · [`capabilities.ts`][capabilities-file] |

---

## 🎵 Musixmatch API Integration (Primary)

Official base URL: `https://api.musixmatch.com/ws/1.1` — implemented in [`lib/shared/src/lib/musixmatch/client.ts`][mxm-client-file] (L13).

### Layer 1 — HTTP Client & API Endpoints

| Musixmatch endpoint | Client function | Lines |
|---------------------|-----------------|-------|
| `track.search` | `searchTracks()` | [`client.ts`][mxm-client-file] L165–197 |
| `track.lyrics.get` | `getTrackLyrics()` | [`client.ts`][mxm-client-file] L199–214 |
| `track.lyrics.analysis.get` | `getLyricsAnalysis()` | [`client.ts`][mxm-client-file] L216–235 |
| `track.richsync.get` | `getRichsync()` | [`client.ts`][mxm-client-file] L270–291 |
| `track.lyrics.analysis.search` | `searchSimilarByAnalysis()` | [`client.ts`][mxm-client-file] L296–320 |
| `track.get` | `getTrackDetails()` | [`client.ts`][mxm-client-file] L322–342 |
| `track.lyrics.translation.get` | `getLyricsTranslation()` | [`client.ts`][mxm-client-file] L344–369 |
| `track.stem.separation` | `separateWithMusixmatch()` | [`client.ts`][mxm-client-file] L371–452 |
| Key detection | `hasMusixmatchKey()` / `getApiKey()` | [`client.ts`][mxm-client-file] L15–23 |
| HTTP GET wrapper | `mxmFetch()` | [`client.ts`][mxm-client-file] L25–71 |
| HTTP POST wrapper | `mxmPost()` | [`client.ts`][mxm-client-file] L73–124 |
| App track mapping | `mapTrackToApp()` | [`client.ts`][mxm-client-file] L237–268 |
| Search re-ranking | `trackRelevanceScore()` | [`client.ts`][mxm-client-file] L140–163 |

Env vars: `MUSIXMATCH_API_KEY` or `MXM_KEY` ([`client.ts`][mxm-client-file] L17).

### Layer 2 — Shared Musixmatch Modules (all files)

| Module | Purpose | Key exports | File |
|--------|---------|-------------|------|
| `client.ts` | REST client | All API calls above | [`lib/musixmatch/client.ts`][mxm-client-file] |
| `types.ts` | MXM response types | `MxmAnalysisRaw`, `MxmLyricsRaw`, … | [`lib/musixmatch/types.ts`][mxm-types-file] |
| `richsync-parser.ts` | Word-level sync parse | `parseRichsyncBody()` L35 · `hookLatencyAdjustment()` L127 | [`lib/musixmatch/richsync-parser.ts`][mxm-richsync-parser-file] |
| `subtitle-parser.ts` | LRC subtitle parse | `parseLrcSubtitle()` L11 | [`lib/musixmatch/subtitle-parser.ts`][mxm-subtitle-parser-file] |
| `catalog-intelligence.ts` | Similar-track benchmark | `fetchCatalogBenchmark()` L97 · `buildCatalogBenchmark()` L64 | [`lib/musixmatch/catalog-intelligence.ts`][mxm-catalog-intel-file] |
| `section-intelligence.ts` | Section moods + rewrite tips | `analyzeSectionSentiments()` L44 · `generateMxmRewriteSuggestions()` L104 | [`lib/musixmatch/section-intelligence.ts`][mxm-section-intel-file] |
| `studio-intelligence.ts` | Studio draft MXM bundle | `fetchMxmIntelligenceForTrack()` L23 | [`lib/musixmatch/studio-intelligence.ts`][mxm-studio-intel-file] |
| `project-lyrics-intelligence.ts` | Merge project + MXM analysis | `resolveProjectAnalysis()` L13 | [`lib/musixmatch/project-lyrics-intelligence.ts`][mxm-project-intel-file] |
| `intelligence-score.ts` | Search result ranking | `mxmIntelligenceScore()` L4 · `sortByMxmIntelligence()` L13 | [`lib/musixmatch/intelligence-score.ts`][mxm-intelligence-score-file] |
| `translate-lyrics.ts` | Translation helpers | `translateLyricsBody()` L42 | [`lib/musixmatch/translate-lyrics.ts`][mxm-translate-file] |
| `lyric-video-timing.ts` | Timed lines for video | `buildLyricVideoTimedLines()` L108 | [`lib/musixmatch/lyric-video-timing.ts`][mxm-lyric-video-file] |
| `mxm-video-sync.ts` | Richsync/LRC video sync | `buildTimedLinesFromRichsync()` L63 · `resolveMxmStrictDisplay()` L174 | [`lib/musixmatch/mxm-video-sync.ts`][mxm-video-sync-file] |
| `audio-vocal-sync.ts` | Vocal phrase timing | `buildTimedLinesFromVocalPhrases()` L44 | [`lib/musixmatch/audio-vocal-sync.ts`][mxm-audio-sync-file] |
| `vocal-gap-sync.ts` | Karaoke line alignment | `alignTimedLinesToVocalOnsets()` L46 | [`lib/musixmatch/vocal-gap-sync.ts`][mxm-vocal-gap-file] |
| `sync-quality.ts` | Project line collection | `collectProjectLinesWithSections()` L14 | [`lib/musixmatch/sync-quality.ts`][mxm-sync-quality-file] |

**Unit tests:** [`richsync-parser.test.ts`][mxm-richsync-parser-test-file] · [`catalog-intelligence.test.ts`][mxm-catalog-intel-test-file] · [`section-intelligence.test.ts`][mxm-section-intel-test-file] · [`intelligence-score.test.ts`][mxm-intelligence-score-test-file]

### Layer 3 — Backend API Routes (Musixmatch)

All routes in [`artifacts/api-server/src/routes/api.ts`][api-routes-file]:

| HTTP | Route | Handler lines | Musixmatch calls |
|------|-------|---------------|------------------|
| `GET` | `/api/search` | L75–118 | `searchTracks()` · mock fallback if no key |
| `GET` | `/api/catalog/track/:id` | L120–148 | `getTrackDetails()` · `mapTrackToApp()` |
| `GET` | `/api/catalog/richsync/:id` | L150–173 | `getRichsync()` · `parseRichsyncBody()` |
| `GET` | `/api/catalog/lyrics/:id` | L175–195 | `getTrackLyrics()` |
| `GET` | `/api/catalog/analysis/:id` | L197–213 | `getLyricsAnalysis()` |
| `GET` | `/api/catalog/translation` | L215–238 | `getLyricsTranslation()` |
| `POST` | `/api/catalog/similar` | L240–273 | `searchSimilarByAnalysis()` · `fetchCatalogBenchmark()` |
| `POST` | `/api/analyze` | L275–343 | `fetchCatalogBundle()` → `runAnalysis()` |
| `POST` | `/api/studio/analyze` | L345–423 | `fetchStudioDraftPartners()` · `runStudioAnalysis()` |
| `POST` | `/api/studio/lyrics/coach-fix` | L425–463 | `runIntelligentOptimize()` (MXM coach signals) |
| `POST` | `/api/studio/translate-lyrics` | L469–501 | `translateLyricsBody()` |
| `POST` | `/api/studio/stems/musixmatch` | L767–800 | `separateWithMusixmatch()` |
| `POST` | `/api/viral/analyze` | L523–548 | `runViralAnalysis()` (MXM-grounded gaps) |

Startup partner log: [`artifacts/api-server/src/index.ts`][api-index-file] L14–24.

### Layer 4 — Catalog Bundle Orchestrator

[`lib/shared/src/lib/partners/adapters.ts`][partner-adapters-file] — single fetch that powers Quick Analyze:

| Step | Code | Lines |
|------|------|-------|
| Partner registry | `partnerAdapters[]` | L36–44 |
| Enrich track (Spotify ID, ISRC) | `enrichCatalogTrack()` | L46–52 |
| Parallel MXM + Cyanite + Songstats | `fetchCatalogBundle()` | L54–86 |
| Lyrics fetch | `getTrackLyrics()` | L63 |
| Analysis API | `getLyricsAnalysis()` | L64 |
| Richsync | `getRichsync()` | L65 |
| Cyanite (via Spotify ID) | `analyzeSpotifyTrack()` | L66–76 |
| Songstats stats | `getTrackStats()` | L77–80 |
| Artist momentum | `getArtistMomentum()` | L81 |
| Velocity history | `getTrackHistoricVelocity()` | L82–85 |

### Layer 5 — Scoring Engine (Musixmatch-aware)

[`lib/shared/src/lib/scoring/index.ts`][scoring-index-file]:

| Integration point | Lines | Musixmatch usage |
|-------------------|-------|------------------|
| Import catalog boost | L15 | `catalogSimulationBoost()` from `catalog-intelligence.ts` |
| Section insights attach | L16 | `attachSectionInsights()` from `section-intelligence.ts` |
| Lyrics import | L17–18 | `buildImportLyrics()` · `parseLyricsSections()` |
| `runAnalysis()` input | L50–60 | `mxmAnalysis`, `richsync`, `catalogBenchmark` fields |
| Full analysis pipeline | `runAnalysis()` | L62+ |

[`lib/shared/src/lib/scoring/studio-draft-partners.ts`][studio-draft-partners-file] — studio analyze path:

| Function | Lines | Musixmatch |
|----------|-------|------------|
| `fetchStudioDraftPartners()` | L95+ | `fetchMxmIntelligenceForTrack()` when `hasMusixmatchKey()` |
| Catalog match by title/artist | L155–177 | `searchTracks()` + `getLyricsAnalysis()` |

[`lib/shared/src/lib/studio/intelligent-optimize.ts`][intelligent-optimize-file] — Optimize & Ship coach:

| Step | Lines | Musixmatch |
|------|-------|------------|
| Partner tier (local → partner → AI) | L459–463 | Uses MXM moods/themes in rewrite prompt |
| `runIntelligentOptimize()` | L400+ | Musixmatch section intelligence in coach patches |

### Layer 6 — Frontend API Client

[`artifacts/pulseforge/src/lib/api-client.ts`][frontend-api-client-file] — every Musixmatch-backed `fetch`:

| Function | Lines | Backend route |
|----------|-------|---------------|
| `fetchCatalogTrack()` | L7–14 | `/api/catalog/track/:id` |
| `fetchRichsync()` | L16–27 | `/api/catalog/richsync/:id` |
| `fetchLyrics()` | L29–35 | `/api/catalog/lyrics/:id` |
| `fetchLyricsAnalysis()` | L37–43 | `/api/catalog/analysis/:id` |
| `fetchLyricsTranslation()` | L45–51 | `/api/catalog/translation` |
| `searchTracks()` | L53–66 | `/api/search` |
| `analyzeTrack()` | L68–95 | `/api/analyze` |
| `analyzeStudioVersion()` | L97–124 | `/api/studio/analyze` |
| `coachFixLyrics()` | L145–165 | `/api/studio/lyrics/coach-fix` |
| `separateStemsWithMusixmatch()` | L330–345 | `/api/studio/stems/musixmatch` |
| `fetchCatalogSimilar()` | L475–491 | `/api/catalog/similar` |
| `translateProjectLyrics()` | L525–543 | `/api/studio/translate-lyrics` |
| `fetchMxmVideoSync()` | L511–523 | `/api/catalog/video-sync` |
| `fetchCapabilities()` | L451–457 | `/api/capabilities` |

### Layer 7 — UI Surfaces (Musixmatch)

| UI | Feature | File · lines |
|----|---------|--------------|
| Track search | Musixmatch catalog search + intelligence badges | [`TrackSearch.tsx`][track-search-file] · [`MxmIntelligenceBadges.tsx`][mxm-badges-file] |
| Quick Analyze | Full catalog analyze flow | [`app/analyze/page.tsx`][analyze-page-file] L32–80 (`analyzeTrack`) |
| Musixmatch Pro panel | Lyrics · Analysis · Catalog · Translation · Lyric Video tabs | [`MusixmatchProTools.tsx`][mxm-pro-tools-file] L1306–1330 |
| Match & Enrich | Catalog link + Analysis API pull | [`MusixmatchProTools.tsx`][mxm-pro-tools-file] L200–260 |
| Section sentiment | MXM-powered rewrite tips | [`SectionSentimentStrip.tsx`][section-sentiment-file] · [`WriteTab.tsx`][write-tab-file] L169–319 |
| Import from catalog | Quick Analyze → Studio | [`ImportToStudioButton.tsx`][import-to-studio-file] · [`import-from-track.ts`][import-from-track-file] |
| Produce MXM sync | Richsync timeline sync | [`ProduceTab.tsx`][produce-tab-file] L1107–1112 |
| Optimize & Ship | Partner coach (MXM in pipeline) | [`OptimizeShipPanel.tsx`][optimize-ship-panel-file] L108–111 |
| Integrations page | Musixmatch row + live status | [`IntegrationsPage.tsx`][integrations-page-file] L19–26 |
| Partners landing | Musixmatch pillar | [`PartnersSection.tsx`][partners-section-file] · [`PartnerLogoStrip.tsx`][partner-logo-strip-file] |
| Capabilities gating | `musixmatch` / `richsyncTimeline` / `musixmatchStems` flags | [`capabilities.ts`][capabilities-file] L70–81 |

### Layer 8 — Capabilities & Feature Flags

[`lib/shared/src/lib/partners/capabilities.ts`][capabilities-file]:

| Flag | Lines | Requires |
|------|-------|----------|
| `partners.musixmatch` | L47 | `hasMusixmatchKey()` |
| `features.quickAnalyze` | L70 | Musixmatch key |
| `features.quickAnalyzeDemo` | L71 | No key (mock catalog) |
| `features.importFromCatalog` | L75 | Musixmatch key |
| `features.richsyncTimeline` | L81 | Musixmatch key |
| `features.musixmatchStems` | L80 | Musixmatch key |
| `tier` full/partner/local | L57–64 | Musixmatch + (Cyanite or Songstats) |

---

## 🔌 Partner Integrations (Proof of Implementation)

### Cyanite — Spotify Audio AI

**Purpose:** BPM, valence, arousal, mood/genre tags, segment energy curve for hit scoring and energy insights.

| Artifact | Location | Lines |
|----------|----------|-------|
| GraphQL client | [`lib/shared/src/lib/cyanite/client.ts`][cyanite-client-file] | `CYANITE_URL` L1 · `hasCyaniteToken()` L24–26 |
| Spotify analysis query | [`cyanite/client.ts`][cyanite-client-file] | `SPOTIFY_ANALYSIS_QUERY` L58+ · `analyzeSpotifyTrack()` |
| Energy merge into scoring | [`lib/shared/src/lib/scoring/partners.ts`][scoring-partners-file] | `buildEnergyFromCyanite()` L21+ |
| Catalog bundle fetch | [`lib/shared/src/lib/partners/adapters.ts`][partner-adapters-file] | L66–76 |
| Studio draft partners | [`lib/shared/src/lib/scoring/studio-draft-partners.ts`][studio-draft-partners-file] | L170–176 |
| Capabilities flag | [`lib/shared/src/lib/partners/capabilities.ts`][capabilities-file] | L48 · L58 |
| Backend env log | [`artifacts/api-server/src/index.ts`][api-index-file] | L16 |

Env: `CYANITE_ACCESS_TOKEN`

---

### Songstats — Streaming & Velocity Intelligence

**Purpose:** Cross-platform streams, TikTok/Shazam signals, playlist counts, velocity score for simulation boost.

| Artifact | Location | Lines |
|----------|----------|-------|
| REST client | [`lib/shared/src/lib/songstats/client.ts`][songstats-client-file] | `BASE_URL` L1 · `songstatsFetch()` L36–59 · `hasSongstatsKey()` L32–34 |
| Track stats | [`songstats/client.ts`][songstats-client-file] | `getTrackStats()` |
| Artist momentum | [`lib/shared/src/lib/songstats/artist-momentum.ts`][songstats-momentum-file] | `getArtistMomentum()` · `adjustHitPotentialWithArtistMomentum()` |
| Historic velocity | [`lib/shared/src/lib/songstats/historic-velocity.ts`][songstats-velocity-file] | `getTrackHistoricVelocity()` |
| Simulation boost | [`lib/shared/src/lib/scoring/partners.ts`][scoring-partners-file] | `simulationBoostFromSongstats()` L196–198 |
| Context adjust | [`lib/shared/src/lib/scoring/partners.ts`][scoring-partners-file] | `adjustHitPotentialWithPartners()` L126–181 |
| Catalog bundle | [`lib/shared/src/lib/partners/adapters.ts`][partner-adapters-file] | L77–85 |
| Scoring index imports | [`lib/shared/src/lib/scoring/index.ts`][scoring-index-file] | L36–42 |
| Capabilities | [`lib/shared/src/lib/partners/capabilities.ts`][capabilities-file] | L49 · L82 |
| Unit tests | [`songstats/artist-momentum.test.ts`][songstats-momentum-test-file] · [`historic-velocity.test.ts`][songstats-velocity-test-file] | — |

Env: `SONGSTATS_API_KEY`

---

### ElevenLabs — Music, TTS, Voice Clone, Stems

**Purpose:** Full song generation, hook voice preview, voice cloning, music stem separation.

| Artifact | Location | Lines |
|----------|----------|-------|
| Client | [`lib/shared/src/lib/elevenlabs/client.ts`][elevenlabs-client-file] | `hasElevenLabsKey()` L20 · `listVoices()` L67 · `cloneVoice()` L88 · `synthesizeSpeech()` L127 · `composeMusic()` L199 · `separateMusicStems()` L305 |
| Backend routes | [`artifacts/api-server/src/routes/api.ts`][api-routes-file] | `GET /studio/voices` L550 · `POST /studio/voices/clone` L563 · `POST /studio/tts` L589 · `GET /studio/music/quota` L642 · `POST /studio/music` L648 · `POST /studio/music/stems` L706 |
| Rate limit (music gen) | [`api.ts`][api-routes-file] | L54–55 · L648+ |
| Frontend API | [`artifacts/pulseforge/src/lib/api-client.ts`][frontend-api-client-file] | `listElevenLabsVoices()` L185 · `cloneElevenLabsVoice()` L195 · `synthesizeHookVoice()` L218 · `generateFullSong()` L281 · `separateStemsWithElevenMusic()` L315 |
| UI | [`HookVoicePreview.tsx`][hook-voice-file] · [`GenerateFullSongPanel.tsx`][generate-full-song-file] · [`StemPanel.tsx`][stem-panel-file] L224–243 | — |
| Capabilities | [`capabilities.ts`][capabilities-file] | L76–78 |

Env: `ELEVENLABS_API_KEY`

---

### LALAL.AI — Stem Separation

**Purpose:** Upload → multistem task → poll → download vocals/drums/bass/other.

| Artifact | Location | Lines |
|----------|----------|-------|
| Client | [`lib/shared/src/lib/lalal/client.ts`][lalal-client-file] | `hasLalalKey()` L19 · `uploadSource()` L62 · `startMultistem()` L79 · `pollTask()` L125 · `separateWithLalal()` L156 |
| Backend route | [`artifacts/api-server/src/routes/api.ts`][api-routes-file] | `POST /studio/stems/lalal` L735–765 |
| Frontend API | [`api-client.ts`][frontend-api-client-file] | `separateStemsWithLalal()` L300–313 |
| UI | [`StemPanel.tsx`][stem-panel-file] | L48–49 · L94–106 |
| Capabilities | [`capabilities.ts`][capabilities-file] | L51 · L79 |

Env: `LALAL_API_KEY`

---

### JamBase — Concert Intelligence

**Purpose:** Live concert search for Launch tab tour planning.

| Artifact | Location | Lines |
|----------|----------|-------|
| Client | [`lib/shared/src/lib/jambase/client.ts`][jambase-client-file] | `hasJamBaseKey()` L24 · `searchConcerts()` L65 |
| Backend route | [`artifacts/api-server/src/routes/api.ts`][api-routes-file] | `GET /jambase/concerts` L802–814 |
| Frontend API | [`api-client.ts`][frontend-api-client-file] | `fetchConcertIntel()` L357–374 |
| UI | [`ConcertInsights.tsx`][concert-insights-file] · [`LaunchTab.tsx`][launch-tab-file] | — |
| Capabilities | [`capabilities.ts`][capabilities-file] | L53 · L84–85 |

Env: `JAMBASE_API_KEY`

---

### n8n — Workflow Automation

**Purpose:** Trigger external release/marketing workflows from Launch tab.

| Artifact | Location | Lines |
|----------|----------|-------|
| Client | [`lib/shared/src/lib/n8n/client.ts`][n8n-client-file] | `hasN8nWebhook()` L31 · `triggerWorkflow()` L35 |
| Backend route | [`artifacts/api-server/src/routes/api.ts`][api-routes-file] | `POST /workflows/n8n` L816–822 |
| Frontend API | [`api-client.ts`][frontend-api-client-file] | `triggerN8nWorkflow()` L376–407 |
| UI | [`N8nWorkflowTrigger.tsx`][n8n-workflow-file] | — |
| Capabilities | [`capabilities.ts`][capabilities-file] | L52 · L85 |
| AI fallback in optimize | [`intelligent-optimize.ts`][intelligent-optimize-file] | n8n path in rewrite chain L459+ |

Env: `N8N_WEBHOOK_URL`

---

### Groq / B.AI — AI Lyric Rewrite (Optimize & Ship)

**Purpose:** Optional AI lyric rewrite after local + partner coach in `runIntelligentOptimize()`.

| Artifact | Location | Lines |
|----------|----------|-------|
| Groq rewrite | [`lib/shared/src/lib/studio/intelligent-optimize.ts`][intelligent-optimize-file] | `groqRewrite()` L337–343 · chain L462–463 |
| B.AI rewrite | [`intelligent-optimize.ts`][intelligent-optimize-file] | `baiRewrite()` L324 · chain L462 |
| Backend route | [`artifacts/api-server/src/routes/api.ts`][api-routes-file] | `POST /studio/lyrics/coach-fix` L425–463 |
| Frontend | [`OptimizeShipPanel.tsx`][optimize-ship-panel-file] | L121 (`coachFixLyrics`) |

Env: `GROQ_API_KEY` · `BAI_API_KEY` (optional)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (Vite SPA — artifacts/pulseforge)                  │
│  localStorage + IndexedDB projects · fetch("/api/*")        │
└──────────────────────────┬──────────────────────────────────┘
                           │ dev proxy / Replit router / CDN rewrite
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  Express API (artifacts/api-server)                         │
│  /api/* partner proxies · Prisma SQLite · rate limits       │
└──────────────────────────┬──────────────────────────────────┘
                           │
     ┌─────────────────────┼─────────────────────┐
     ▼                     ▼                     ▼
 Musixmatch API      Cyanite GraphQL      Songstats REST
 ElevenLabs REST     LALAL REST           JamBase REST
 Groq / B.AI         n8n webhook
```

**Local-first rule:** Studio projects never require the server DB. The backend only proxies partner APIs and optional cloud sync (`/api/cloud/*`).

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Vite 7 · React 19 · wouter · Tailwind 4 |
| Backend | Express 4 · Prisma 6 · SQLite |
| Shared | `@pulseforge/shared` — TypeScript 5.9 |
| Monorepo | pnpm workspaces |
| Partners | Musixmatch · Cyanite · Songstats · ElevenLabs · LALAL · JamBase · n8n · Groq |
| Tests | Vitest (32 tests in `lib/shared`) |

---

## 🗺️ Application Routes

| Route | Purpose | Code |
|-------|---------|------|
| `/welcome` | Landing page | [`app/welcome/page.tsx`][welcome-page-file] |
| `/dashboard` | Studio OS overview | [`app/dashboard/page.tsx`][dashboard-route-file] |
| `/studio` | Project list + templates | [`app/studio/page.tsx`][studio-page-file] |
| `/studio/:id/write` | Lyrics & song concept | [`WriteTab.tsx`][write-tab-file] |
| `/studio/:id/produce` | Audio, stems, NLE | [`ProduceTab.tsx`][produce-tab-file] |
| `/studio/:id/analyze` | Studio hit analysis | [`AnalyzeTab.tsx`][analyze-tab-file] |
| `/studio/:id/compare` | Version A vs B | [`CompareTab.tsx`][compare-tab-file] |
| `/studio/:id/launch` | Release + concerts + n8n | [`LaunchTab.tsx`][launch-tab-file] |
| `/studio/:id/optimize` | Optimize & Ship pipeline | [`OptimizeShipPage.tsx`][optimize-ship-page-file] |
| `/analyze` | Quick Analyze (catalog) | [`app/analyze/page.tsx`][analyze-page-file] |
| `/viral` | Viral Lab 1M simulation | [`app/viral/page.tsx`][viral-route-file] |
| `/integrations` | Partner status | [`IntegrationsPage.tsx`][integrations-page-file] |
| `/settings` | Export/import, cloud sync | [`app/settings/page.tsx`][settings-page-file] |
| `/help` | Workflow guide | [`app/help/page.tsx`][help-page-file] |
| `/partners` | Partner overview | [`app/partners/page.tsx`][partners-page-file] |

Route table: [`artifacts/pulseforge/src/App.tsx`][app-router-file] L56–156.

Studio tabs definition: [`lib/shared/src/types/studio.ts`][studio-types-file] L196–202.

---

## 🔗 API Endpoint Matrix

All API routes are mounted under `/api` in `artifacts/api-server/src/routes/api.ts`.

| Area | Method | Endpoint | Purpose |
|------|--------|----------|---------|
| Capabilities | `GET` | `/api/capabilities` | Active partner/features flags |
| Trends | `GET` | `/api/trends` | Trend feed + seasonal context |
| Search | `GET` | `/api/search?q=` | Catalog search (Musixmatch or demo fallback) |
| Catalog | `GET` | `/api/catalog/track/:id` | Track metadata |
| Catalog | `GET` | `/api/catalog/richsync/:id` | Richsync parse payload |
| Catalog | `GET` | `/api/catalog/lyrics/:id` | Lyrics body |
| Catalog | `GET` | `/api/catalog/analysis/:id` | Musixmatch Analysis API |
| Catalog | `GET` | `/api/catalog/translation` | Lyrics translation |
| Catalog | `POST` | `/api/catalog/similar` | Similar-track benchmark |
| Analyze | `POST` | `/api/analyze` | Full quick-analysis pipeline |
| Studio | `POST` | `/api/studio/analyze` | Analyze active studio version |
| Studio | `POST` | `/api/studio/lyrics/coach-fix` | Optimize & Ship partner/AI coach |
| Studio | `POST` | `/api/studio/generate` | Generate project concept from prompt |
| Studio | `POST` | `/api/studio/translate-lyrics` | Project lyrics translation |
| Studio | `GET` | `/api/studio/voices` | ElevenLabs voices |
| Studio | `POST` | `/api/studio/voices/clone` | Voice cloning |
| Studio | `POST` | `/api/studio/tts` | Hook/full vocal generation |
| Studio | `GET` | `/api/studio/music/quota` | Music generation quota status |
| Studio | `POST` | `/api/studio/music` | Full song generation |
| Studio | `POST` | `/api/studio/music/stems` | Stem separation (ElevenLabs) |
| Studio | `POST` | `/api/studio/stems/lalal` | Stem separation (LALAL) |
| Studio | `POST` | `/api/studio/stems/musixmatch` | Stem separation (Musixmatch) |
| Viral | `POST` | `/api/viral/analyze` | 1M listener simulation |
| Launch | `GET` | `/api/jambase/concerts` | Concert lookup |
| Launch | `POST` | `/api/workflows/n8n` | Trigger external workflow |
| Health | `GET` | `/health` / `/api/healthz` | Service readiness |

---

## 🔑 Environment Variables

Copy `artifacts/api-server/.env.example` → `artifacts/api-server/.env`.

| Variable | Required | Partner |
|----------|----------|---------|
| `MUSIXMATCH_API_KEY` or `MXM_KEY` | **Recommended** | Musixmatch |
| `PULSEFORGE_DATABASE_URL` | Yes (cloud sync) | SQLite path |
| `CYANITE_ACCESS_TOKEN` | Optional | Cyanite |
| `SONGSTATS_API_KEY` | Optional | Songstats |
| `ELEVENLABS_API_KEY` | Optional | ElevenLabs |
| `LALAL_API_KEY` | Optional | LALAL.AI |
| `JAMBASE_API_KEY` | Optional | JamBase |
| `GROQ_API_KEY` | Optional | AI rewrite |
| `N8N_WEBHOOK_URL` | Optional | n8n |
| `PULSEFORGE_API_SECRET` | Optional | API auth |
| `CORS_ORIGIN` | Split deploy | AWS + Vercel |

Without `MUSIXMATCH_API_KEY`, search falls back to mock catalog (`api.ts` L82–85) and `demoMode: true` (`capabilities.ts` L88).

---

## 🚀 Running the Project

```bash
# Typecheck entire workspace
pnpm run typecheck

# Build all packages
pnpm run build

# API server only
pnpm --filter @workspace/api-server run dev

# Frontend only (proxies /api → localhost:4000)
pnpm --filter @workspace/pulseforge run dev
```

**Replit:** see `replit.md` for artifact ports and workflows.

There is **no** root-level `pnpm dev` — run each artifact via filter (by design).

---

## 🧪 Testing

```bash
# Shared library unit tests (Vitest)
pnpm --filter @pulseforge/shared exec vitest run

# Musixmatch-specific tests
pnpm --filter @pulseforge/shared exec vitest run src/lib/musixmatch/
```

Musixmatch test files:
- `richsync-parser.test.ts`
- `catalog-intelligence.test.ts`
- `section-intelligence.test.ts`
- `intelligence-score.test.ts`

---

## 🎬 Demo Flow Checklist

Use this sequence for judges, demo videos, or smoke QA:

1. Open `/welcome` → click **Open Studio**
2. Go to `/dashboard` (stats + pipeline overview)
3. `+ New Project` → `Browse Templates` → choose one template
4. In `Write`, show Lyrics + Song Concept + Arrangement
5. Back to project card → open **Optimize & Ship**
6. Wait for 5-step optimize pipeline completion
7. Return to `Write` to show updated lyrics/settings
8. Open `Produce` and show NLE + stems panel
9. Open `/analyze`, search **Hello — Adele**, run analysis
10. Open `/viral`, select project, run 1M simulation
11. Open `/integrations`, `/settings`, `/help`

Tip: run backend with a real `MUSIXMATCH_API_KEY` before recording.

---

## 📤 Deployment (Split)

| Component | Target | Notes |
|-----------|--------|-------|
| Frontend | Vercel | Vite SPA · `artifacts/pulseforge/dist/public` |
| API | AWS App Runner / ECS / EC2 | Express + SQLite (use EFS/EBS for persistence) |
| Env | Server only | Never expose partner keys in `VITE_*` |

Frontend dev proxy: `artifacts/pulseforge/vite.config.ts` — `/api` → `http://127.0.0.1:4000`.

---

## 🏆 Musicathon 2026 — Integration Summary

| Criterion | PulseForge evidence |
|-----------|---------------------|
| **Musixmatch API** | 8 REST endpoints · 15 shared modules · Pro UI · stems · richsync · Analysis API · translation · catalog benchmark |
| **Originality** | Local-first studio OS + Viral Lab 1M sim + NLE in browser |
| **Craft** | 32 Vitest tests · typed partner adapters · graceful demo fallback |
| **Impact** | Write → Produce → Analyze → Viral → Launch single pipeline |

---

## 📚 Documentation Links

| Document | Description |
|----------|-------------|
| [replit.md](replit.md) | Replit artifact ports and operational gotchas |
| [.migration-backup/README.md](.migration-backup/README.md) | Archived Next.js monorepo (reference) |
| [Musixmatch API Docs](https://developer.musixmatch.com/documentation) | Official API reference |
| [Musixmatch Analysis API](https://developer.musixmatch.com/documentation/analysis-api) | Lyrics analysis endpoint |

---

## ⚠️ Known Limitations

- **Musixmatch key required** for live catalog — mock mode without it.
- **SQLite** on API server — ephemeral on serverless; use persistent volume or Postgres for production.
- **Some scaffold routes** return 501/410 if not yet ported from `.migration-backup` (whisper-align, video-sync).
- **Replit-specific** Vite plugins load only when `REPL_ID` is set (`vite.config.ts`).

---

## 🆘 Troubleshooting

| Issue | Likely cause | Fix |
|------|--------------|-----|
| Search returns demo tracks | Missing/invalid `MUSIXMATCH_API_KEY` | Set key in `artifacts/api-server/.env`, restart backend |
| `Unauthorized` on `/api/*` | `PULSEFORGE_API_SECRET` enabled but client missing key | Unset secret for local dev or pass `x-pulseforge-key` |
| Stems fail to generate | Partner key missing or provider timeout | Check `ELEVENLABS_API_KEY` / `LALAL_API_KEY` / `MUSIXMATCH_API_KEY` |
| No voices in Hook Voice panel | ElevenLabs not configured | Add `ELEVENLABS_API_KEY`, then reload app |
| Concert intel unavailable | JamBase key absent | Add `JAMBASE_API_KEY` or continue with demo mode |
| n8n trigger fails | Invalid webhook URL | Set `N8N_WEBHOOK_URL` to active webhook endpoint |
| Typecheck casing error (`Card` vs `card`) | Mixed import casing on macOS/Linux | Use canonical imports: `@/components/ui/Card` and `@/components/ui/Skeleton` |
| App opens but API calls fail | Backend not running | Start `pnpm --filter @workspace/api-server run dev` |

---

## 📄 License

Add your preferred repository license file if you plan to publish or submit the project externally. This repo currently does not include a checked-in `LICENSE` file.

---

Built for **Musicathon 2026** — Musixmatch at the core, partners at the edges, local-first by default.

[onboarding-file]: artifacts/pulseforge/src/lib/onboarding.ts
[dashboard-page-file]: artifacts/pulseforge/src/components/dashboard/DashboardPage.tsx
[dashboard-route-file]: artifacts/pulseforge/src/app/dashboard/page.tsx
[welcome-page-file]: artifacts/pulseforge/src/app/welcome/page.tsx
[studio-page-file]: artifacts/pulseforge/src/app/studio/page.tsx
[analyze-tab-file]: artifacts/pulseforge/src/components/studio/AnalyzeTab.tsx
[compare-tab-file]: artifacts/pulseforge/src/components/studio/CompareTab.tsx
[launch-tab-file]: artifacts/pulseforge/src/components/studio/LaunchTab.tsx
[optimize-ship-page-file]: artifacts/pulseforge/src/components/studio/OptimizeShipPage.tsx
[viral-route-file]: artifacts/pulseforge/src/app/viral/page.tsx
[settings-page-file]: artifacts/pulseforge/src/app/settings/page.tsx
[help-page-file]: artifacts/pulseforge/src/app/help/page.tsx
[partners-page-file]: artifacts/pulseforge/src/app/partners/page.tsx
[app-router-file]: artifacts/pulseforge/src/App.tsx
[studio-types-file]: lib/shared/src/types/studio.ts
[new-project-form-file]: artifacts/pulseforge/src/components/studio/NewProjectForm.tsx
[example-presets-file]: lib/shared/src/lib/studio/example-presets.ts
[write-tab-file]: artifacts/pulseforge/src/components/studio/WriteTab.tsx
[song-concept-panel-file]: artifacts/pulseforge/src/components/studio/SongConceptPanel.tsx
[mxm-pro-tools-file]: artifacts/pulseforge/src/components/studio/MusixmatchProTools.tsx
[produce-tab-file]: artifacts/pulseforge/src/components/studio/ProduceTab.tsx
[music-timeline-editor-file]: artifacts/pulseforge/src/components/viral/MusicTimelineEditor.tsx
[stem-panel-file]: artifacts/pulseforge/src/components/studio/StemPanel.tsx
[analyze-page-file]: artifacts/pulseforge/src/app/analyze/page.tsx
[optimize-ship-panel-file]: artifacts/pulseforge/src/components/studio/OptimizeShipPanel.tsx
[viral-lab-page-file]: artifacts/pulseforge/src/components/viral/ViralLabPage.tsx
[integrations-page-file]: artifacts/pulseforge/src/components/integrations/IntegrationsPage.tsx
[cloud-routes-file]: artifacts/api-server/src/routes/cloud.ts
[capabilities-file]: lib/shared/src/lib/partners/capabilities.ts
[mxm-client-file]: lib/shared/src/lib/musixmatch/client.ts
[mxm-types-file]: lib/shared/src/lib/musixmatch/types.ts
[mxm-richsync-parser-file]: lib/shared/src/lib/musixmatch/richsync-parser.ts
[mxm-subtitle-parser-file]: lib/shared/src/lib/musixmatch/subtitle-parser.ts
[mxm-catalog-intel-file]: lib/shared/src/lib/musixmatch/catalog-intelligence.ts
[mxm-section-intel-file]: lib/shared/src/lib/musixmatch/section-intelligence.ts
[mxm-studio-intel-file]: lib/shared/src/lib/musixmatch/studio-intelligence.ts
[mxm-project-intel-file]: lib/shared/src/lib/musixmatch/project-lyrics-intelligence.ts
[mxm-intelligence-score-file]: lib/shared/src/lib/musixmatch/intelligence-score.ts
[mxm-translate-file]: lib/shared/src/lib/musixmatch/translate-lyrics.ts
[mxm-lyric-video-file]: lib/shared/src/lib/musixmatch/lyric-video-timing.ts
[mxm-video-sync-file]: lib/shared/src/lib/musixmatch/mxm-video-sync.ts
[mxm-audio-sync-file]: lib/shared/src/lib/musixmatch/audio-vocal-sync.ts
[mxm-vocal-gap-file]: lib/shared/src/lib/musixmatch/vocal-gap-sync.ts
[mxm-sync-quality-file]: lib/shared/src/lib/musixmatch/sync-quality.ts
[mxm-richsync-parser-test-file]: lib/shared/src/lib/musixmatch/richsync-parser.test.ts
[mxm-catalog-intel-test-file]: lib/shared/src/lib/musixmatch/catalog-intelligence.test.ts
[mxm-section-intel-test-file]: lib/shared/src/lib/musixmatch/section-intelligence.test.ts
[mxm-intelligence-score-test-file]: lib/shared/src/lib/musixmatch/intelligence-score.test.ts
[api-routes-file]: artifacts/api-server/src/routes/api.ts
[api-index-file]: artifacts/api-server/src/index.ts
[cyanite-client-file]: lib/shared/src/lib/cyanite/client.ts
[scoring-partners-file]: lib/shared/src/lib/scoring/partners.ts
[songstats-client-file]: lib/shared/src/lib/songstats/client.ts
[songstats-momentum-file]: lib/shared/src/lib/songstats/artist-momentum.ts
[songstats-velocity-file]: lib/shared/src/lib/songstats/historic-velocity.ts
[songstats-momentum-test-file]: lib/shared/src/lib/songstats/artist-momentum.test.ts
[songstats-velocity-test-file]: lib/shared/src/lib/songstats/historic-velocity.test.ts
[elevenlabs-client-file]: lib/shared/src/lib/elevenlabs/client.ts
[hook-voice-file]: artifacts/pulseforge/src/components/studio/HookVoicePreview.tsx
[generate-full-song-file]: artifacts/pulseforge/src/components/studio/GenerateFullSongPanel.tsx
[lalal-client-file]: lib/shared/src/lib/lalal/client.ts
[jambase-client-file]: lib/shared/src/lib/jambase/client.ts
[concert-insights-file]: artifacts/pulseforge/src/components/studio/ConcertInsights.tsx
[n8n-client-file]: lib/shared/src/lib/n8n/client.ts
[n8n-workflow-file]: artifacts/pulseforge/src/components/studio/N8nWorkflowTrigger.tsx
[partner-adapters-file]: lib/shared/src/lib/partners/adapters.ts
[scoring-index-file]: lib/shared/src/lib/scoring/index.ts
[studio-draft-partners-file]: lib/shared/src/lib/scoring/studio-draft-partners.ts
[intelligent-optimize-file]: lib/shared/src/lib/studio/intelligent-optimize.ts
[frontend-api-client-file]: artifacts/pulseforge/src/lib/api-client.ts
[track-search-file]: artifacts/pulseforge/src/components/search/TrackSearch.tsx
[mxm-badges-file]: artifacts/pulseforge/src/components/search/MxmIntelligenceBadges.tsx
[section-sentiment-file]: artifacts/pulseforge/src/components/studio/SectionSentimentStrip.tsx
[import-to-studio-file]: artifacts/pulseforge/src/components/analyze/ImportToStudioButton.tsx
[import-from-track-file]: artifacts/pulseforge/src/lib/studio/import-from-track.ts
[partners-section-file]: artifacts/pulseforge/src/components/landing/PartnersSection.tsx
[partner-logo-strip-file]: artifacts/pulseforge/src/components/landing/PartnerLogoStrip.tsx
