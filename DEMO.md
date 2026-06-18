# PulseForge — 60s Demo Script

## Setup (before judges arrive)

1. `npm install && cp backend/.env.example backend/.env`
2. `npm run db:push` — SQLite schema for cloud mirror
3. `npm run dev:fresh` — backend `:4000` + frontend `:3000`
4. Optional: add partner API keys to `backend/.env` for live Musixmatch search
5. Open `http://localhost:3000` — lands on `/welcome` (or Settings → Reset welcome tour)

---

## Script (~60 seconds)

### 1. Landing (10s)

- Show `/welcome` — product positioning
- Click **Open Studio** (lands in studio hub)

### 2. Create project (10s)

- **New project**: title `Midnight Drive`, artist `Nova Ray`, genre Pop, mood Energetic
- Open project → **Write** tab

### 3. Write + Produce (15s)

- Paste chorus lines in section editor (or raw mode)
- **Rewrite Coach** shows rule-based hook tips
- **Produce** → upload a short demo MP3
- Point out waveform + **estimated BPM**

### 4. Analyze (15s)

- **Analyze** tab → **Analyze version**
- Highlight score uses **lyrics + demo BPM** (subtitle shows `~NNN BPM`)
- Show hit potential, energy, simulation
- **Workflow orchestrator** panel → **Run auto steps** (re-analyze + re-viral when stale)

### 5. Viral Lab (10s)

- Open **Viral Lab** from Analyze tab or sidebar
- **Run 1M simulation** — crowd funnel, gap analysis, NLE timeline (resize, split, scrub)
- Click a **red gap** → jumps to Studio Write/Produce with focus
- Edit lyrics → return to Viral Lab → **stale banner** → re-run (or enable auto re-viral in Settings)

### 6. Launch (10s)

- **Launch** → tweak What-If sliders
- **Release checklist** includes Viral Lab items
- **Release pack** → download PDF or JSON

---

## Bonus paths (if time)

| Path | Show |
|------|------|
| **Cloud sync** | Settings → Create sync session → Push/Pull with conflict resolution |
| **Per-project sync** | Studio header → **Sync to cloud** (when token configured) |
| **ElevenLabs** | Write tab → **Hook Voice Preview** |
| **LALAL.AI** | Produce → **AI stems (LALAL.AI)** |
| **JamBase** | Launch → **Live Music Intel** |
| **n8n** | Launch → **Trigger workflow** |
| **Quick Analyze** | `/analyze` → search demo track → **Import to Studio** |
| **Partners** | `/partners` — all 7 integrations |

---

## Talking points

- **Local-first**: no account; projects in `localStorage`, audio in IndexedDB
- **Optional cloud**: session tokens + SQLite mirror with merge conflict UI
- **Tab lock**: second tab shows a banner — avoids concurrent localStorage writes
- **Creative graph**: lyrics + demo audio fused before scoring
- **Domain events**: `DomainEventBridge` coordinates stale flags, auto re-viral, auto cloud push
- **Partner stack**: Musixmatch + Cyanite + Songstats when keys present
- **Production API**: optional `PULSEFORGE_API_SECRET` gates partner routes on the backend