---
name: Optimize & Ship before/after comparison
description: Why the Optimize & Ship pipeline must compute baseline and candidates the same way, or it reports phantom +0/+0.
---

# Optimize & Ship "+0/+0" trap

The Optimize & Ship pipeline (OptimizeShipPanel.tsx `run()`) reports a Hit
Score / Hook delta = after - before. The delta is only meaningful if `before`
and the candidate `after` analyses are produced by the **same computation**.

**Rule:** always run a FRESH server-side baseline analysis of the current
lyrics at step 1. Never reuse the cached `version.analysis` as the baseline.

**Why:** the optimize step persists its winning analysis back onto the version
(`commandSaveAnalysis`). Reusing that cache as the next baseline means `before`
already contains the previous run's gain, so re-optimizing shows +0/+0. The
cache can also be computed with different partner/trend-feed state than the
freshly re-analyzed candidates, faking a zero (or phantom non-zero) delta. This
was the exact cause of the user-reported "Hit 74 was 74 / Hook 69 was 69".

**How to apply:** keep `before` = fresh UNPATCHED analysis of current lyrics.
Evaluate BOTH sandbox candidates (conservative = original lyrics, full =
rewritten) under the SAME coach-patch context (bpmTarget/mood/arrangement) so
non-lyric gains are measured and the committed `bestAnalysis` matches the
committed patches+lyrics. The trend feed (lib/shared/.../trends/feed.ts) is
cached 1h and deterministic (no randomness), so same-run analyses don't drift.

**Note on headroom:** for a studio draft, Cyanite needs uploaded audio and
Songstats needs a released track, so both are usually unavailable — lyrics
(via the Groq AI rewrite) plus bpm/duration are the only score levers. A
genuine first optimize moves ~+10 overall / +7 hook; an already-optimized
track honestly shows ~0 (no more headroom), which is correct, not a bug.

## Raw-mode lyrics trap (the "always +0/+0" cause)

The lyric editor has two **exclusive** modes: "sections" (writes structured
keys, sets `raw:""`) and "raw" (freeform paste — sets `raw:<text>`, all
structured keys empty). `composeLyricsBody` **prioritizes `raw`**: if `raw` is
non-empty it returns ONLY `raw` and ignores structured sections.

The AI coach rewrite (`runIntelligentOptimize`) only writes structured keys,
and `mergeLyrics` historically preserved `raw`. So for raw-mode lyrics the
rewrite was (a) prompted from EMPTY sections (never saw the real song) and
(b) shadowed by the unchanged `raw` in `composeLyricsBody` → every candidate
scored identical to baseline → phantom +0/+0 for ALL raw-mode tracks.

**Rule:** any lyric-rewrite pipeline must reconcile the `raw`-vs-structured
duality. `runIntelligentOptimize` now normalizes raw-only lyrics into
structured working sections (parse headers, else dump the blob into `verse1`)
before prompting/merging, and `mergeLyrics` clears `raw` whenever the AI
returns any structured text so the rewrite surfaces.

**Why it was invisible in curl tests:** a fixture with empty `raw` (structured
already populated) takes the working path and shows a real gain (~+4). Only
raw-authored tracks hit 0 — reproduce by moving lyrics into `raw` with
structured keys empty.

## Prompt engineering for algorithmic scoring (the "+0 after AI rewrite" cause)

The Groq lyric rewrite uses a vague prompt ("maximize hook strength") that
rewrites *words* but leaves the structural metrics unchanged — so the rule-based
re-analysis returns identical scores.

**The actual scoring levers** (must target all of them to get a reliable gain):
- `hookStrength`    = 45 + brevity(hook word len) + repeatBonus(repetitionIndex×0.45)
- `lyricVirality`  = hookStrength×0.45 + repetitionIndex×0.25 + rhymeDensity×0.12 + chorusCount×4
- `trendAlignment` += trendKeywordHits × 3 (up to +18)

**How to target them in the AI prompt:**
1. REPETITION — instruct the AI to repeat the hook line word-for-word 4+ times
2. RHYME — instruct to rhyme every 2nd/4th line end-word (AABB or ABAB)
3. TREND — pass SHORT_FORM_TREND_KEYWORDS + analysis.trendFeed.keywords in context
4. BREVITY — instruct to keep the hook to 3–5 words

**Rule:** whenever the scoring algorithm is changed, update the system prompt to
match the new levers. The buildRewritePrompt function now includes the full
breakdown score with per-metric targets and the live trend keyword list so the
AI can target low-scoring dimensions.

**Verified:** structured-mode +10 overall/hook (was +4), raw-mode +16 (was 0),
trend keyword hits 2→10.
