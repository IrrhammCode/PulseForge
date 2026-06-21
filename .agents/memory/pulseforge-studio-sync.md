---
name: PulseForge lyric-video sync, translation & preview audio
description: Durable gotchas for the MusixmatchProTools lyric-video preview, vocal sync, and lyric translation
---

# Project lyrics are ORIGINAL — Musixmatch catalog data is a *different* track
**Rule:** A studio project's lyrics are the user's own song. Anything pulled from
Musixmatch (richsync, analysis, **translation**) comes from whatever reference
track was matched/enriched — usually a different recording — so it will NOT line
up with the project lyrics.
**How to apply:**
- Translation: translate the user's actual project lyrics line-by-line via Groq
  (`/api/studio/translate-lyrics` → `translateLyricsBody`). Only fall back to an
  MXM catalog translation when a strong line-by-line content+count check confirms
  the catalog source genuinely matches the project lyrics (first-N-chars checks
  are too weak).
- Richsync timing: same caution — validate similarity before trusting it.

# Lyric-video sync pipeline order
Audio-first vocal detection → Groq Whisper forced-align → section-proportional
fallback. The first two were once stubs that returned empty, silently forcing the
proportional fallback (which drifts). Real browser vocal detection now lives in
`artifacts/pulseforge/src/lib/studio/vocal-activity.ts` (Web Audio RMS energy
envelope → active segments) and line mapping in
`lib/shared/src/lib/musixmatch/audio-vocal-sync.ts`.
**Why:** if sync "still isn't synced", first check whether these return real data
vs an empty profile.

# Preview double-audio race (generation token)
`startVideoPreview` is async with several awaits and creates+plays a `new Audio()`.
It is invoked both from the Preview click AND from an auto-refresh `useEffect`
(fires when MXM analysis / lyrics change). Two concurrent invocations each play
their own Audio → double sound.
**Rule:** guard with a monotonic `playbackGenRef`: `stopCurrentPreview()` bumps it;
each `startVideoPreview` captures `myGen` and aborts (tearing down its own audio)
at every await checkpoint AND inside the `draw()` RAF loop if superseded.
