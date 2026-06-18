import type { TrackAnalysis, WhatIfParams } from "@/types";
import type { StudioProject } from "@/types/studio";
import type { CrowdSimulation, ViralGap } from "@/types/viral";
import { hasLyricsContent } from "@/lib/studio/lyrics";
import { computeStemBalanceScore, stemBalanceLabel } from "@/lib/studio/stem-balance";
import {
  computeEnergyBuildupScore,
  resolveHookArrivalSec,
} from "@/lib/viral/audio-signals";
import { loudnessQualityScore } from "@/lib/scoring/production-quality";

export function analyzeViralGaps(
  analysis: TrackAnalysis,
  project: StudioProject,
  crowd: CrowdSimulation,
  whatIf: WhatIfParams
): ViralGap[] {
  const gaps: ViralGap[] = [];
  const version =
    project.versions.find((v) => v.id === project.activeVersionId) ??
    project.versions[0];
  const lyrics = version?.lyrics;
  const audio = version?.audio;
  const { hitPotential, energy, lyrics: structure, catalogBenchmark } = analysis;

  // #1 Stronger historical benchmarking against successful catalog tracks (Musixmatch + velocity signals)
  if (catalogBenchmark?.medianHookStrength != null) {
    const median = catalogBenchmark.medianHookStrength;
    const delta = structure.hookStrength - median;
    if (delta < -10) {
      gaps.push({
        id: "hook-below-catalog-median",
        category: "hook",
        severity: "high",
        title: "Hook strength below successful catalog median",
        description: `Your hook strength ${structure.hookStrength} is ${Math.abs(delta)} points below the median of similar successful tracks in Musixmatch catalog (${median}). Study top similar tracks and strengthen the repeatable core line.`,
        impactPoints: 18,
        studioTab: "write",
        focus: "chorus",
        metric: "Hook vs Catalog Median",
        currentValue: String(structure.hookStrength),
        targetValue: `${median}+`,
      });
    } else if (delta > 8) {
      // positive signal, no gap
    }
  }

  if (!lyrics || !hasLyricsContent(lyrics)) {
    gaps.push({
      id: "no-lyrics",
      category: "lyrics",
      severity: "critical",
      title: "No lyrics yet",
      description:
        "The 1M simulation cannot validate a hook without text. Write the chorus first — viral decisions happen in the first 8 seconds.",
      impactPoints: 28,
      studioTab: "write",
      focus: "chorus",
      metric: "Hook strength",
      currentValue: "0",
      targetValue: "65+",
    });
  }

  if (structure.hookStrength < 65) {
    gaps.push({
      id: "weak-hook",
      category: "hook",
      severity: structure.hookStrength < 50 ? "critical" : "high",
      title: "Hook not strong enough",
      description: `Hook strength ${structure.hookStrength}/100. "${structure.hookLine || "—"}" needs to be shorter, more repeatable, and memorable for TikTok seeding.`,
      impactPoints: Math.round(22 - structure.hookStrength * 0.12),
      studioTab: "write",
      focus: "chorus",
      metric: "Hook strength",
      currentValue: String(structure.hookStrength),
      targetValue: "70+",
    });
  }

  if (
    structure.hookWindowSec != null &&
    structure.hookWindowSec > 30 &&
    structure.hookStrength < 70
  ) {
    gaps.push({
      id: "late-hook",
      category: "hook",
      severity: structure.hookWindowSec > 45 ? "high" : "medium",
      title: "Hook arrives too late",
      description: `Primary hook lands at ${structure.hookWindowSec.toFixed(0)}s. TikTok and streaming skips cluster in the first 8–15 seconds — move the hook earlier.`,
      impactPoints: Math.round(structure.hookWindowSec * 0.25),
      studioTab: "produce",
      focus: "intro",
      metric: "Hook window",
      currentValue: `${structure.hookWindowSec.toFixed(0)}s`,
      targetValue: "≤15s",
    });
  }

  if (structure.chorusCount < 2 && lyrics && !lyrics.raw.trim()) {
    gaps.push({
      id: "chorus-repeat",
      category: "structure",
      severity: "medium",
      title: "Chorus repeats too few times",
      description:
        "Viral pop structure usually has 3× chorus. Add another repeat to boost end-of-track retention.",
      impactPoints: 12,
      studioTab: "write",
      focus: "structure",
    });
  }

  if (crowd.aggregates.skipHookRate >= 18) {
    gaps.push({
      id: "hook-dropoff",
      category: "hook",
      severity: crowd.aggregates.skipHookRate >= 28 ? "critical" : "high",
      title: "High drop-off at the hook",
      description: `${crowd.aggregates.skipHookRate}% of Gen-Z personas skip in the first 8 seconds. Strengthen the opening vocal or move the beat drop earlier.`,
      impactPoints: Math.round(crowd.aggregates.skipHookRate * 0.6),
      studioTab: "produce",
      focus: "intro",
      metric: "Skip @ hook",
      currentValue: `${crowd.aggregates.skipHookRate}%`,
      targetValue: "<12%",
    });
  }

  if (!audio?.fileName) {
    gaps.push({
      id: "no-audio",
      category: "production",
      severity: "high",
      title: "No demo audio yet",
      description:
        "Upload a mix or demo for BPM, waveform, and stem separation analysis (LALAL.AI). Without audio, production cannot be optimized.",
      impactPoints: 20,
      studioTab: "produce",
      focus: "upload",
    });
  } else if (!audio.stemsReady) {
    gaps.push({
      id: "stems-missing",
      category: "production",
      severity: "medium",
      title: "Stems not separated",
      description:
        "Split vocals/drums/bass/other for per-lane timeline editing — like an NLE, but for music.",
      impactPoints: 14,
      studioTab: "produce",
      focus: "stems",
    });
  } else if (audio.stems?.length) {
    const balance = computeStemBalanceScore(audio.stems);
    if (balance < 50) {
      gaps.push({
        id: "stem-imbalance",
        category: "production",
        severity: balance < 30 ? "high" : "medium",
        title: "Stem mix imbalanced",
        description: `Mix balance ${balance}/100 (${stemBalanceLabel(balance)}). Adjust stem volumes — muted or extreme levels hurt retention in the crowd sim.`,
        impactPoints: balance < 30 ? 16 : 10,
        studioTab: "produce",
        focus: "stems",
        metric: "Stem balance",
        currentValue: String(balance),
        targetValue: "70+",
      });
    }
  }

  // === New first-class production & vocal gaps (the previously "partial" items now very ready) ===
  const prodQ = energy.productionQuality;
  if (typeof prodQ === "number" && prodQ < 52) {
    const lq = loudnessQualityScore(energy.loudness);
    gaps.push({
      id: "low-production-quality",
      category: "production",
      severity: prodQ < 38 ? "high" : "medium",
      title: "Production quality below viral standard",
      description: `Production score ${prodQ}/100. Target modern loudness around -6 to -8 with good dynamics. ${lq < 70 ? "Loudness feels off-target or over-compressed." : "Clean up the mix and restore micro-dynamics."}`,
      impactPoints: prodQ < 40 ? 14 : 9,
      studioTab: "produce",
      focus: "stems",
      metric: "Production",
      currentValue: String(prodQ),
      targetValue: "68+",
    });
  }

  const vocS = energy.vocalScore;
  if (typeof vocS === "number" && vocS < 48) {
    gaps.push({
      id: "weak-vocals",
      category: "production",
      severity: vocS < 35 ? "high" : "medium",
      title: "Vocals lack presence or clarity",
      description: `Vocal score ${vocS}/100. Strong, upfront, clear vocals in the hook window are essential for short-form retention and sing-alongs. Raise vocal stem volume or add presence/EQ in the 1.5-4k range.`,
      impactPoints: vocS < 36 ? 16 : 8,
      studioTab: "produce",
      focus: "stems",
      metric: "Vocal score",
      currentValue: String(vocS),
      targetValue: "65+",
    });
  }

  // Chorus length / simplicity (makes the "Sedang" structure item first-class)
  const cSimp = structure.chorusSimplicity;
  const cWords = structure.chorusWordCount;
  if (typeof cSimp === "number" && cSimp < 52) {
    gaps.push({
      id: "complex-chorus",
      category: "lyrics",
      severity: cSimp < 40 ? "medium" : "low",
      title: "Chorus too complex or long for replay",
      description: `Chorus simplicity ${cSimp}/100${cWords != null ? ` (${cWords} words)` : ""}. Short, repeatable, singable hooks win on TikTok. Shorten lines, increase internal rhyme/repeat, cut filler words.`,
      impactPoints: cSimp < 42 ? 11 : 6,
      studioTab: "write",
      focus: "chorus",
      metric: "Chorus simplicity",
      currentValue: String(cSimp),
      targetValue: "62+",
    });
  } else if (typeof cWords === "number" && cWords > 17 && (cSimp == null || cSimp < 60)) {
    gaps.push({
      id: "long-chorus",
      category: "lyrics",
      severity: "low",
      title: "Chorus is too wordy",
      description: `Primary chorus ~${cWords} words. Viral choruses are usually 6-14 words and super repeatable. Trim it.`,
      impactPoints: 7,
      studioTab: "write",
      focus: "chorus",
      metric: "Chorus words",
      currentValue: String(cWords),
      targetValue: "≤14",
    });
  }

  if (hitPotential.breakdown.beatFit < 68) {
    gaps.push({
      id: "beat-fit",
      category: "audio",
      severity: "medium",
      title: "Beat fit below sweet spot",
      description: `Beat fit ${hitPotential.breakdown.beatFit}/100. Target BPM ${project.bpmTarget ?? energy.bpm} — adjust tempo or genre tagging.`,
      impactPoints: 15,
      studioTab: "produce",
      focus: "bpm",
      metric: "Beat fit",
      currentValue: String(hitPotential.breakdown.beatFit),
      targetValue: "72+",
    });
  }

  if (energy.danceability < 0.52 && project.genre.toLowerCase().includes("pop")) {
    gaps.push({
      id: "low-danceability",
      category: "audio",
      severity: "medium",
      title: "Low danceability for pop",
      description: `Danceability ${Math.round(energy.danceability * 100)}%. Raise energy in the chorus or tighten drums in the hook window.`,
      impactPoints: 11,
      studioTab: "produce",
      focus: "chorus",
      metric: "Danceability",
      currentValue: `${Math.round(energy.danceability * 100)}%`,
      targetValue: "55%+",
    });
  }

  const genreLower = project.genre.toLowerCase();
  const danceGenres = /pop|dance|electronic|edm|house|hip-hop|rap/;
  if (danceGenres.test(genreLower) && (energy.bpm < 120 || energy.bpm > 140)) {
    gaps.push({
      id: "bpm-sweet-spot",
      category: "audio",
      severity: energy.bpm < 100 || energy.bpm > 160 ? "medium" : "low",
      title: "BPM outside short-form sweet spot",
      description: `BPM ${energy.bpm} — TikTok and dance playlists cluster around 120–140. Nudge tempo or retag genre if intentional.`,
      impactPoints: energy.bpm < 100 || energy.bpm > 160 ? 10 : 6,
      studioTab: "produce",
      focus: "bpm",
      metric: "BPM",
      currentValue: String(energy.bpm),
      targetValue: "120–140",
    });
  }

  const hookArrival = resolveHookArrivalSec(structure.hookWindowSec, analysis.track.duration);
  const buildupScore = computeEnergyBuildupScore(
    energy,
    hookArrival,
    analysis.track.duration
  );
  if (energy.beatDropSec == null && energy.waveform.length >= 20) {
    gaps.push({
      id: "no-beat-drop",
      category: "audio",
      severity: "medium",
      title: "No clear beat drop detected",
      description:
        "Waveform scan found no energy spike in the 10–45s window. Add a drop or hook swell in the TikTok window (15–30s).",
      impactPoints: 11,
      studioTab: "produce",
      focus: "intro",
      metric: "Beat drop",
      currentValue: "—",
      targetValue: "15–30s",
    });
  } else if (
    energy.beatDropSec != null &&
    (energy.beatDropSec < 15 || energy.beatDropSec > 30)
  ) {
    gaps.push({
      id: "beat-drop-timing",
      category: "audio",
      severity: energy.beatDropSec > 40 ? "high" : "medium",
      title: "Beat drop outside TikTok window",
      description: `Detected drop at ${energy.beatDropSec}s. Short-form clips peak when the drop lands between 15–30 seconds.`,
      impactPoints: energy.beatDropSec > 40 ? 14 : 9,
      studioTab: "produce",
      focus: "intro",
      metric: "Beat drop",
      currentValue: `${energy.beatDropSec}s`,
      targetValue: "15–30s",
    });
  }

  if (structure.rhymeDensity != null && structure.rhymeDensity < 38) {
    gaps.push({
      id: "low-rhyme-density",
      category: "lyrics",
      severity: structure.rhymeDensity < 25 ? "medium" : "low",
      title: "Low rhyme density",
      description: `Rhyme density ${structure.rhymeDensity}/100. Catchier end-rhymes improve replay and sing-along in short clips.`,
      impactPoints: structure.rhymeDensity < 25 ? 10 : 5,
      studioTab: "write",
      focus: "chorus",
      metric: "Rhyme density",
      currentValue: String(structure.rhymeDensity),
      targetValue: "45+",
    });
  }

  const trendTarget = analysis.trendFeed?.keywords.length ? 1 : 2;
  if (
    (!structure.trendKeywordHits || structure.trendKeywordHits.length < trendTarget) &&
    hitPotential.breakdown.trendAlignment < 55
  ) {
    gaps.push({
      id: "weak-trend-keywords",
      category: "lyrics",
      severity: "low",
      title: "Few trend-aligned keywords",
      description:
        "Lyrics miss common short-form themes (nightlife, healing, vibe, etc.). Add 1–2 relatable hooks without forcing slang.",
      impactPoints: 6,
      studioTab: "write",
      focus: "chorus",
      metric: "Trend keywords",
      currentValue: String(structure.trendKeywordHits?.length ?? 0),
      targetValue: `${trendTarget}+`,
    });
  }

  if (
    analysis.velocityHistory?.available &&
    analysis.velocityHistory.trajectory === "decelerating" &&
    (analysis.velocityHistory.recentWeeklyDeltaPct ?? 0) < -8
  ) {
    gaps.push({
      id: "decelerating-stream-velocity",
      category: "distribution",
      severity: "high",
      title: "Stream velocity decelerating",
      description: `Songstats historic data shows week-over-week stream decline (${analysis.velocityHistory.recentWeeklyDeltaPct ?? "—"}%). Ship fresh creative or a remix hook before organic reach stalls.`,
      impactPoints: 14,
      studioTab: "launch",
      focus: "tiktok",
      metric: "Stream trajectory",
      currentValue: analysis.velocityHistory.trajectory,
      targetValue: "accelerating",
    });
  }

  if (
    analysis.artistMomentum?.available &&
    analysis.artistMomentum.tier === "emerging" &&
    analysis.artistMomentum.momentumScore < 42 &&
    !analysis.streaming?.available
  ) {
    gaps.push({
      id: "low-artist-momentum",
      category: "distribution",
      severity: "medium",
      title: "Artist momentum still building",
      description: `Songstats shows ${analysis.artistMomentum.tier} tier (score ${analysis.artistMomentum.momentumScore}/100). Seed TikTok and playlists before expecting organic 1M — hook must carry early discovery.`,
      impactPoints: 12,
      studioTab: "launch",
      focus: "tiktok",
      metric: "Artist momentum",
      currentValue: String(analysis.artistMomentum.momentumScore),
      targetValue: "50+",
    });
  }

  if (
    analysis.seasonalContext?.releaseWindow === "weak" &&
    version?.launchPlan?.targetReleaseDate
  ) {
    gaps.push({
      id: "weak-seasonal-window",
      category: "distribution",
      severity: "medium",
      title: "Release date misses cultural peak",
      description: `Target ${version.launchPlan.targetReleaseDate} lands in a weak seasonal window. Next fit: ${analysis.seasonalContext.nextOptimalWindow ?? "summer festival season"}.`,
      impactPoints: 10,
      studioTab: "launch",
      focus: "release-date",
      metric: "Seasonal fit",
      currentValue: analysis.seasonalContext.releaseWindow,
      targetValue: "good+",
    });
  }

  if (
    analysis.releaseHistory?.trajectory === "declining" &&
    analysis.releaseHistory.priorReleases >= 2
  ) {
    gaps.push({
      id: "declining-release-trajectory",
      category: "hook",
      severity: "high",
      title: "Declining release trajectory",
      description: `Last ${analysis.releaseHistory.priorReleases} projects averaged ${analysis.releaseHistory.avgHitScore ?? "—"} hit score. Hook or production needs a measurable step-up vs prior drops.`,
      impactPoints: 15,
      studioTab: "write",
      focus: "chorus",
      metric: "Hit trend",
      currentValue: analysis.releaseHistory.trajectory,
      targetValue: "improving",
    });
  }

  if (
    buildupScore < 0.42 &&
    (structure.hookWindowSec == null || structure.hookWindowSec > 12)
  ) {
    gaps.push({
      id: "weak-energy-buildup",
      category: "audio",
      severity: buildupScore < 0.32 ? "medium" : "low",
      title: "Flat intro energy",
      description: `Energy build-up score ${Math.round(buildupScore * 100)}/100. Short-form retention needs a lift into the hook — automate risers, filter sweeps, or a pre-drop swell.`,
      impactPoints: buildupScore < 0.32 ? 12 : 7,
      studioTab: "produce",
      focus: "intro",
      metric: "Build-up",
      currentValue: `${Math.round(buildupScore * 100)}`,
      targetValue: "50+",
    });
  }

  if (analysis.track.duration > 240) {
    gaps.push({
      id: "long-duration",
      category: "audio",
      severity: "low",
      title: "Duration too long",
      description: `${Math.round(analysis.track.duration / 60)}m+ — streaming favors 2:30–3:30. Consider trimming the outro or bridge.`,
      impactPoints: 8,
      studioTab: "produce",
      focus: "outro",
    });
  }

  if (whatIf.tiktokSeedPosts < 5 && structure.hookStrength >= 60) {
    gaps.push({
      id: "tiktok-seed",
      category: "distribution",
      severity: "high",
      title: "Too few TikTok seeds",
      description: `Only ${whatIf.tiktokSeedPosts} seed posts. Hook is strong enough — increase to 8+ for a compound viral loop.`,
      impactPoints: 16,
      studioTab: "launch",
      focus: "tiktok",
      metric: "Seed posts",
      currentValue: String(whatIf.tiktokSeedPosts),
      targetValue: "8+",
    });
  }

  if (whatIf.playlistPitchCount < 8) {
    gaps.push({
      id: "playlist-pitch",
      category: "distribution",
      severity: "medium",
      title: "Not enough playlist pitches",
      description: `${whatIf.playlistPitchCount} pitches — target at least 12 curators in ${project.genre}.`,
      impactPoints: 13,
      studioTab: "launch",
      focus: "playlists",
      metric: "Pitches",
      currentValue: String(whatIf.playlistPitchCount),
      targetValue: "12+",
    });
  }

  if (whatIf.marketingBudget < 1200 && hitPotential.overall >= 62) {
    gaps.push({
      id: "budget-low",
      category: "distribution",
      severity: "medium",
      title: "Limited launch budget",
      description: `$${whatIf.marketingBudget} is below the $1,500 sweet spot for a track with hit score ${hitPotential.overall}.`,
      impactPoints: 10,
      studioTab: "launch",
      focus: "budget",
    });
  }

  if (crowd.aggregates.viralCoefficient < 0.35) {
    gaps.push({
      id: "low-k-factor",
      category: "distribution",
      severity: "high",
      title: "Low viral coefficient",
      description: `K≈${crowd.aggregates.viralCoefficient} — share+save rate is not enough for organic 1M. Focus on a shareable CTA in the chorus.`,
      impactPoints: 18,
      studioTab: "launch",
      focus: "viral-loop",
      metric: "K-factor",
      currentValue: String(crowd.aggregates.viralCoefficient),
      targetValue: "0.5+",
    });
  }

  const severityOrder: Record<ViralGap["severity"], number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };

  return gaps
    .sort(
      (a, b) =>
        severityOrder[a.severity] - severityOrder[b.severity] ||
        b.impactPoints - a.impactPoints
    )
    .slice(0, 10);
}