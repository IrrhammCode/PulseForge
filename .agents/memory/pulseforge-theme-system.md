---
name: PulseForge theme system
description: How to retheme the whole PulseForge web app (where the visual system lives)
---

# PulseForge theming

The entire PulseForge look is driven by `@theme` CSS custom-property tokens plus a
handful of utility classes in `artifacts/pulseforge/src/app/globals.css` (Tailwind v4,
single theme — no `.dark` class / no theme toggle).

To switch the whole app's look (e.g. dark → white aesthetic), change in that one file:
- The `@theme` tokens (`--color-background/surface/foreground/muted/border/accent/...`).
- Utility classes that **hardcode** colors instead of using tokens: `.glass-card`,
  `.gradient-text`, `.gradient-text-warm`, `.shimmer`, button glow shadows, `.card-interactive`.
- Base typography lives here too (set `h1..h6` weight/tracking + `body` font-weight for a "bold" feel).

**Why:** almost every component uses the semantic tokens (`bg-surface`, `text-foreground`,
`border-border`, `text-accent`, etc.), so retheming is centralized — you do NOT edit components.

**Remaining hardcoded dark spots** (grep `bg-black`): a few are legitimate and must stay dark
even in a light theme — the MXM video player frame/overlay, waveform strips, timeline timestamp
badges over colored clips, modal dimming scrims, and the TikTok brand logo tile. Only convert
`bg-black/*` panels that hold **text content** (code/lyric/translation previews) to a light surface.
`text-white` is fine wherever it sits on a colored fill (`bg-accent` buttons/tiles).
