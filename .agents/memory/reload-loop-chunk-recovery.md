---
name: ChunkLoadRecovery reload-loop trap
description: Why a generic JS error can cause an endless page-reload loop in the pulseforge web app, and the two rules that prevent it.
---

`ChunkLoadRecovery` (component exported as `n`, mounted in `App.tsx`) calls `window.location.reload()` on window `error` / `unhandledrejection` whose reason matches `isChunkOrWebpackError`. The reload is guarded once per ~8s via `sessionStorage` — **but the guard auto-clears after 8s**, so any error that *recurs* (on every load, or every button press) becomes an endless reload loop, perceived as "reload terus terusan / ngebug".

**Rule 1 — keep the matcher narrow.** `isChunkOrWebpackError` must only match true stale-chunk / dynamic-import signatures (ChunkLoadError, "loading chunk", "failed to fetch dynamically imported module", vendor-chunks, webpack). It must NOT match generic runtime errors like `failed to fetch`, `cannot read properties of undefined`, or `reading 'call'` — those are ordinary app bugs and matching them weaponizes every bug into a reload loop.
**Why:** the optimize/ship flow tripped it via a transient fetch failure and via a render crash on committed data.

**Rule 2 — never leave a dangling promise rejection.** `Promise.all([...])` surfaces only the FIRST rejection; sibling rejections go to `unhandledrejection` and (pre-fix) triggered the reload. Use `Promise.allSettled`, inspect for a rejected result, and throw it into your own try/catch. Also validate result shape BEFORE persisting, so a malformed object can't crash a later render.
**How to apply:** any new parallel fetch / async pipeline in this app must use allSettled (or per-promise catch), and any data written to localStorage that the dashboard renders must be shape-validated first.
