---
name: MXM search relevance & viral 1M calibration
description: Why Quick Analyze returned wrong songs and why the 1M probability was stuck at 5% — the durable fixes for each.
---

# Musixmatch search relevance (Quick Analyze)

**Rule:** For plain title queries, search Musixmatch `track.search` with `q_track`, NOT the generic full-text `q`.

**Why:** `q` + `s_track_rating=desc` returns globally popular but unrelated tracks
(searching "Blinding Lights" never surfaced The Weeknd; "As It Was" returned random
top-rated songs). This is the "every search returns the same songs" symptom. `q_track`
is title-targeted and returns the actual song; rating-desc then puts the canonical
(highest-rated) cut on top.

**How to apply:**
- Only treat `" - "` (whitespace on BOTH sides) as a `title - artist` split, else
  hyphenated titles like "Anti-Hero" get torn into q_track="Anti"/q_artist="Hero".
- Over-fetch (~2× page size) and re-rank client-side by relevance (exact title >
  startsWith > includes + word overlap), using track rating only as a tiebreaker.
  Re-ranking alone is NOT enough — if the upstream query is wrong the real track
  isn't even in the candidate set.

# Viral Lab "1M probability" calibration

**Rule:** `runMonteCarloSimulation` weekly-growth base must be large enough that a
strong track actually accumulates ~1M plays over the 16-week window.

**Why:** The original base `(8000 + rng()*45000)` peaked around ~130k cumulative even
for a perfect song, so `probabilityToReach` was permanently pinned at its 5% floor —
real hits (e.g. "Flowers") showed 5%. Scaled to `(100000 + rng()*540000)`, calibrated
against the default what-if multiplier (~1.115) so hitScore ~70 lands near 50% and
clear hits (85+) reach ~80%+. Live check after fix: Flowers overall=89, prob=84.

**How to apply:** If you retune hitPotential or the what-if multiplier, re-check these
probability bands; the growth constant is coupled to both. Both Quick Analyze (catalog
`runAnalysis`) and Viral Lab (`runViralAnalysis`) share this simulation.
