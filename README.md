# PulseForge

Music Studio OS for Musicathon 2026 — local-first songwriting, demo production, hit-potential analysis, and launch planning.

## Monorepo layout

```
PulseForge/
├── shared/     @pulseforge/shared — domain, viral, scoring, types
├── backend/    @pulseforge/backend — Express API + SQLite (Prisma)
└── frontend/   @pulseforge/frontend — Next.js UI (proxies /api → backend)
```

## Quick start

```bash
npm install
cp backend/.env.example backend/.env    # SQLite + API keys + sync token
npm run db:push                         # create SQLite schema
npm run dev:fresh
```

- **Frontend:** [http://localhost:3000](http://localhost:3000) — Home (`/welcome`) → Open Studio
- **Backend:** [http://localhost:4000/health](http://localhost:4000/health) — reports DB status and configured partner keys

`npm run dev` runs backend (`:4000`) and frontend (`:3000`) together. Frontend rewrites `/api/*` to the backend.

## Environment

### Backend (`backend/.env`)

| Variable | Partner | What it unlocks |
|----------|---------|-----------------|
| `DATABASE_URL` | — | SQLite path (default `file:./data/pulseforge.db`) |
| `PORT` | — | API port (default `4000`) |
| `PULSEFORGE_API_SECRET` | — | Optional `X-PulseForge-Key` on `/api/*` |
| `PULSEFORGE_SYNC_TOKEN` | — | Cloud sync bootstrap admin token |
| `MUSIXMATCH_API_KEY` / `MXM_KEY` | Musixmatch | Catalog search, lyrics, moods/themes, richsync, similar tracks |
| `CYANITE_ACCESS_TOKEN` | Cyanite | Spotify audio AI — BPM, energy curve, mood/genre tags |
| `CYANITE_WEBHOOK_SECRET` | Cyanite | (optional) Async analysis webhook verification |
| `SONGSTATS_API_KEY` | Songstats | Streams, TikTok/Shazam, velocity, artist momentum |
| `ELEVENLABS_API_KEY` | ElevenLabs | Full song (Music API), hook TTS, voice clone, music stems |
| `ELEVENLABS_VOICE_ID` | ElevenLabs | (optional) Default TTS voice |
| `LALAL_API_KEY` | LALAL.AI | AI stem separation in Produce |
| `JAMBASE_API_KEY` | JamBase | Live concert listings on Launch (demo without key) |
| `N8N_WEBHOOK_URL` | n8n | Release automation — rich payload with partner context |
| `TREND_FEED_URL` | — | (optional) External trend keywords for lyric scoring |

Without partner keys, **Quick Analyze** uses demo tracks; **Studio** still runs local scoring + optional ElevenLabs/LALAL if configured independently.

### Frontend (`frontend/.env.local`, optional)

| Variable | Purpose |
|----------|---------|
| `BACKEND_URL` | API proxy target (default `http://localhost:4000`) |
| `PULSEFORGE_API_SECRET` | When set, Next.js route proxy adds `X-PulseForge-Key` to `/api/*` (not cloud) |

Without partner keys, **Quick Analyze** uses demo tracks; **Studio** runs full local scoring.

## Architecture

```
Frontend (Next.js UI, localStorage + IndexedDB)
    ↓ app/api/[...path] proxy (+ optional API secret header)
Backend (Express + Prisma SQLite)
    ↓
Shared domain (CreativeGraph, VersionIntelligence, Workflow)
    ↓
Services (Scoring, Partner Adapters, Viral Lab, NLE timeline)
```

### Domain patterns

| Pattern | Role |
|---------|------|
| **`IProjectRepository`** | Port for project CRUD; default `LocalProjectRepository` (localStorage) |
| **`DomainEventBridge`** | Single browser coordinator for stale flags, auto-orchestrator, auto-cloud-push |
| **`BroadcastChannel`** | Cross-tab domain events + tab lock (one active writer per profile) |
| **Cloud sync** | Push/pull via `sync-client`; merge conflicts via `updatedAt` (not CRDT) |

### Data layers

| Layer | Storage |
|-------|---------|
| **Local-first** | Projects → `localStorage` (schema v3); audio → IndexedDB |
| **Cloud sync** | Projects JSON + audio blobs → SQLite via `/api/cloud` (session or bootstrap token) |
| **Intelligence** | Viral snapshots + timeline edits on `ProjectVersion` |

### Intelligence tiers

| Tier | Signals |
|------|---------|
| **Local** | Lyrics structure, genre/mood heuristics, client BPM & waveform |
| **Partner** | Any Musicathon API key configured |
| **Full** | Musixmatch + (Cyanite or Songstats) on catalog tracks |

### Partner data flow

| Tab | Musixmatch | Cyanite | Songstats | ElevenLabs | LALAL | JamBase | n8n |
|-----|------------|---------|-----------|------------|-------|---------|-----|
| Quick Analyze | Search, lyrics, benchmark | Energy panel | Streaming + momentum | — | — | — | — |
| Studio Write | Coach, richsync | — | — | Full song, TTS | Auto-stems | — | — |
| Studio Produce | Richsync sync | — | — | Section regen | Stems | — | — |
| Studio Analyze | Lyrics intel | Energy | Streaming + similar tracks | — | — | — | — |
| Studio Launch | Recs | — | Streaming snapshot | — | — | Concerts | Webhook |
| Viral Lab | Catalog benchmark | Crowd grounding | Velocity gaps | — | Stem gaps | — | — |

## Routes

| Path | Description |
|------|-------------|
| `/welcome` | Home / landing |
| `/dashboard` | Dashboard |
| `/studio/[id]/{write,produce,analyze,compare,launch}` | Studio OS tabs |
| `/analyze` | Quick Analyze (catalog) |
| `/viral` | Viral Lab — 1M sim, gaps, **NLE timeline** (resize, split, scrub, mute/solo) |
| `/settings` | Backup, **cloud push/pull** with conflict resolution |
| `/integrations` | Partner API status |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Backend + frontend concurrently |
| `npm run dev:fresh` | Kill ports 3000/4000, restart dev |
| `npm run build` | Prisma generate + backend tsc + frontend build |
| `npm test` | Shared + backend API tests (Vitest) |
| `npm run test:e2e` | Playwright E2E (welcome, settings cloud, conflict pull, viral undo) |
| `npm run db:push` | Apply Prisma schema to SQLite |
| `npm run lint` | ESLint (frontend) |

### Cloud sync auth

1. **Per-device session** — Settings → *Create sync session* → token stored in `localStorage`. Projects are scoped to that session on the server. Sessions expire after 30 days idle; revoke via `DELETE /api/cloud/auth/session`.
2. **Bootstrap admin** — paste `PULSEFORGE_SYNC_TOKEN` from `backend/.env` for full access (all sessions’ data visible).
3. **Merge conflicts** — on pull (merge mode), conflicting projects show a resolution panel (keep local vs cloud per project).

## Demo script

See [DEMO.md](./DEMO.md) for a 60-second judge walkthrough.