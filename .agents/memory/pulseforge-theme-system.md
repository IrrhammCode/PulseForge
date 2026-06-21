---
name: PulseForge theme system
description: How the PulseForge web app is rethemed (where the visual system lives) and the rules that keep a retheme cohesive
---

# PulseForge theming

The entire PulseForge look is driven by `@theme` CSS custom-property tokens plus a
handful of utility classes in `artifacts/pulseforge/src/app/globals.css` (Tailwind v4,
single theme — no `.dark` class, no theme toggle). Almost every component uses the
semantic tokens (`bg-surface`, `text-foreground`, `border-border`, `bg-accent`, etc.),
so a retheme is centralized in that one file — you do NOT edit components for color.

**Current aesthetic (2026-06-21): BOLD MONOCHROME editorial.** Warm off-white paper
canvas, black ink, NOTHING but black — every accent token (accent, purple, blue, cyan,
emerald, success, warning, danger) is mapped to the single ink color. Anton display
headlines (large, uppercase), IBM Plex Mono uppercase labels, bold 2px section rules,
black-framed cards. (Earlier iterations were a dark "Verge" theme, then a light
mint/ultraviolet theme — both abandoned.)

**Hard rule: flat depth — NO gradients / shadows / glows.** The shared helper classes
(`gradient-text`, `glow-border`, `gradient-border-animated`, `hero-glow*`, `glass-card*`)
are already flattened in globals.css. The real violations are **inline Tailwind utilities**
on components (`bg-gradient-to-*`, `shadow-*`) — grep for them after any visual change.

## Gotchas that bite during a retheme
- **`bg-accent text-black` becomes invisible** when accent maps to black. Any
  fill-tile that hardcodes `text-black`/`text-white` must switch to `text-background`.
- **Colored SVG icons bypass tokens.** `components/icons/BrandLogos.tsx` has two kinds:
  PulseForge's own product icons (HitScore/Simulation/Playbook/Dashboard) — make these
  `currentColor` so they inherit the token; and real PARTNER brand logos (Musixmatch,
  Spotify, TikTok, Cyanite…) — these intentionally keep brand colors for recognizability
  even in a monochrome theme. Flag this exception to the user; don't assume.
- **Dead data fields** like per-item `gradient`/`iconBg`/`color` strings can linger in
  component data arrays after you stop rendering them — harmless but grep shows them.

## Layout vs. color
A pure token swap changes COLOR only. If the user says "the layout didn't change",
restructure components: section headers (`SectionShell`), hero composition, stat band,
card framing — not just tokens.

## Shared editorial primitives (reuse these, don't re-invent)
`artifacts/pulseforge/src/components/ui/editorial.tsx` exports `PageHeader`,
`SectionHead`, and `Panel` — the canonical building blocks for the bold-monochrome
editorial look (eyebrow + Anton uppercase title, 2px top/bottom rules, flat
`border-2 border-foreground bg-surface` blocks). Dashboard, Studio/Projects, Quick
Analyze, Viral Lab, Integrations, Settings, and Help all use them.
**Why:** keeps every page cohesive and makes future restyles a matter of composing
primitives instead of hand-rolling headers (which caused drift before).
**How to apply:** when adding/restyling a page, import these instead of writing new
`text-xs uppercase` eyebrows or rounded cards; flatten inputs to
`border-2 border-foreground bg-surface ... focus:bg-foreground/5` (no rounding/accent).
