# PulseForge

PulseForge is a local-first "music studio OS" — write lyrics, craft a track, analyze hit potential, run a Viral Lab (1M-listener simulation + gap analysis), and plan a launch, all in one place. Ported from a Vercel/v0 Next.js app into the Replit pnpm_workspace stack (Vite + React).

## Run & Operate

- `pnpm --filter @workspace/pulseforge run dev` — run the web app (Vite, port via `PORT`)
- `pnpm --filter @workspace/api-server run dev` — run the API server (Express + Prisma)
- `pnpm --filter @workspace/pulseforge run typecheck` — typecheck the web app
- Required env (api-server `.env`): `PULSEFORGE_DATABASE_URL` — SQLite file URL (e.g. `file:./data/pulseforge.db`)
- Optional partner keys (server-side, enable real AI/partner features): `MUSIXMATCH_API_KEY`, `ELEVENLABS_API_KEY`, `LALAL_API_KEY`, `JAMBASE_API_KEY`, `CYANITE_ACCESS_TOKEN`, `SONGSTATS_API_KEY`, `N8N_WEBHOOK_URL`, `GROQ_API_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: Vite + React + wouter (routing) + Tailwind, artifact `@workspace/pulseforge`
- API: Express + Prisma (SQLite), artifact `@workspace/api-server`
- Shared logic: `@pulseforge/shared` (`lib/shared`) — Musixmatch/partner clients, studio + viral domain logic
- Build: Vite (frontend), tsx (backend dev)

## Where things live

- `artifacts/pulseforge/src/App.tsx` — wouter route table (mirrors the old Next.js paths)
- `artifacts/pulseforge/src/lib/navigation-compat.ts` — drop-in `next/navigation` replacements backed by wouter
- `artifacts/pulseforge/src/lib/api-client.ts` — all frontend → backend `fetch` calls
- `artifacts/api-server/src/routes/api.ts` — Express API routes (mounted at `/api`)
- `lib/shared/src/types/studio.ts` — `LyricsSections`, `EMPTY_LYRICS` and core studio types
- `.migration-backup/` — original imported Next.js source (reference only)

## Architecture decisions

- **Local-first**: studio projects live in the browser's localStorage/IndexedDB, not the server DB. The backend only proxies partner APIs (Musixmatch, ElevenLabs, etc.).
- **Onboarding guard**: `/` and all app routes redirect to `/welcome` until `isOnboardedClient()` is true (replaces the old Next.js middleware gating).
- **`process.env` shim**: `vite.config.ts` sets `define: { "process.env": {} }` so shared server code that reads `process.env` doesn't crash in the browser (the browser has no secrets; it calls the backend instead).
- **AI/partner features degrade gracefully**: where the imported snapshot lacked backend routes (AI project generation, lyric translation, vocal sync, catalog similar, video sync), the api-client calls endpoints that may not exist yet and fall back to friendly error messages rather than crashing.
- **DB env var**: Prisma uses `PULSEFORGE_DATABASE_URL` (not `DATABASE_URL`) so the platform's Postgres `DATABASE_URL` doesn't override the app's SQLite database.

## Gotchas

- This is a multi-artifact pnpm_workspace — there is **no** root-level `pnpm dev`/`pnpm build`. Run apps via their workflows/filters.
- Type-only TS errors don't break the Vite runtime (esbuild strips types). Runtime breakers are missing modules/exports, file-name casing mismatches, `next/*` imports, and bare `process` references.
- See `.agents/memory/vercel-vite-port.md` for the Next→Vite porting traps.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
