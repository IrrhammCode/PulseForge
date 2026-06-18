import type { TrackAnalysis, WhatIfParams } from "@/types";
import type {
  CrowdFunnelStep,
  CrowdSimulation,
  ListenerArchetype,
  ListenerPersona,
  ListeningOutcome,
  PersonaListeningResult,
  RetentionPoint,
} from "@/types/viral";
import { clamp } from "@/lib/utils";
import {
  buildCrowdGrounding,
  groundingModifiers,
  type CrowdGroundingSignals,
} from "@/lib/viral/crowd-grounding";
import type { CyaniteAnalysis } from "@/lib/cyanite/client";
import type { SongstatsInsights } from "@/lib/songstats/client";
import {
  beatDropSweetSpotModifier,
  bpmSweetSpotModifier,
  computeEnergyBuildupScore,
  lateHookPullPenalty,
  resolveEarlySkipSec,
  resolveHookArrivalSec,
} from "@/lib/viral/audio-signals";

const POPULATION_TARGET = 1_000_000;
const SAMPLE_SIZE = 2400;

const ARCHETYPES: Array<{
  type: ListenerArchetype;
  platform: string;
  weight: number;
  attentionSpan: [number, number];
}> = [
  { type: "gen_z_tiktok", platform: "TikTok", weight: 0.28, attentionSpan: [8, 22] },
  { type: "casual_streamer", platform: "Spotify", weight: 0.32, attentionSpan: [25, 90] },
  { type: "playlist_curator", platform: "Apple Music", weight: 0.12, attentionSpan: [45, 180] },
  { type: "superfan", platform: "Spotify", weight: 0.1, attentionSpan: [120, 240] },
  { type: "radio_listener", platform: "Radio", weight: 0.1, attentionSpan: [15, 45] },
  { type: "workout_dj", platform: "YouTube Music", weight: 0.08, attentionSpan: [60, 200] },
];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickArchetype(rng: () => number): (typeof ARCHETYPES)[number] {
  const roll = rng();
  let cumulative = 0;
  for (const arch of ARCHETYPES) {
    cumulative += arch.weight;
    if (roll <= cumulative) return arch;
  }
  return ARCHETYPES[ARCHETYPES.length - 1];
}

export function generatePersonas(seed: number, count = SAMPLE_SIZE): ListenerPersona[] {
  const rng = mulberry32(seed);
  return Array.from({ length: count }, (_, i) => {
    const arch = pickArchetype(rng);
    const span =
      arch.attentionSpan[0] +
      rng() * (arch.attentionSpan[1] - arch.attentionSpan[0]);
    const genreAffinity = clamp(0.35 + rng() * 0.55, 0.3, 0.95);
    return {
      id: i + 1,
      archetype: arch.type,
      platform: arch.platform,
      attentionSpanSec: Math.round(span),
      genreAffinity,
    };
  });
}

function simulatePersona(
  persona: ListenerPersona,
  analysis: TrackAnalysis,
  durationSec: number,
  rng: () => number,
  mods = groundingModifiers(
    buildCrowdGrounding(analysis),
    analysis.catalogBenchmark,
    analysis.artistMomentum
  )
): PersonaListeningResult {
  const { hitPotential, lyrics, energy } = analysis;
  const hookArrivalSec = resolveHookArrivalSec(lyrics.hookWindowSec, durationSec);
  const earlySkipSec = resolveEarlySkipSec(durationSec);
  const buildupScore = computeEnergyBuildupScore(energy, hookArrivalSec, durationSec);
  const lateHookPenalty = lateHookPullPenalty(lyrics.hookWindowSec);

  const viralPull =
    hitPotential.overall / 100 * 0.36 +
    lyrics.hookStrength / 100 * 0.32 +
    energy.danceability * 0.14 +
    persona.genreAffinity * 0.08 +
    bpmSweetSpotModifier(energy.bpm) +
    beatDropSweetSpotModifier(energy.beatDropSec, energy.beatDropScore) +
    buildupScore * 0.1 -
    lateHookPenalty;

  const vocal = energy.vocalScore ?? 58;
  const vocalBias = vocal >= 70 ? 0.09 : vocal >= 58 ? 0.04 : vocal < 42 ? -0.08 : 0;

  const archetypeMod: Record<ListenerArchetype, number> = {
    gen_z_tiktok:
      (lyrics.hookStrength >= 70 ? 0.12 : -0.18) +
      (lyrics.hookWindowSec != null && lyrics.hookWindowSec <= 15 ? 0.06 : 0) +
      (lyrics.hookWindowSec != null && lyrics.hookWindowSec > 30 ? -0.14 : 0) +
      vocalBias,
    playlist_curator:
      (hitPotential.breakdown.beatFit >= 68 ? 0.1 : -0.05) +
      ((energy.productionQuality ?? 60) >= 72 ? 0.06 : (energy.productionQuality ?? 60) < 48 ? -0.04 : 0),
    casual_streamer: 0,
    superfan: 0.15,
    radio_listener: energy.energy >= 0.55 ? 0.08 : -0.1,
    workout_dj:
      energy.bpm >= 115 && energy.bpm <= 145 ? 0.16 : energy.bpm >= 115 ? 0.1 : -0.12,
  };

  let pull = clamp(viralPull + archetypeMod[persona.archetype], 0.08, 0.96);
  pull += mods.saveBias * 0.3;
  if (persona.archetype === "gen_z_tiktok") {
    pull += mods.skipHookBias;
    pull += mods.shareBias * 0.2;
  }
  pull = clamp(pull, 0.05, 0.98);
  const attentionRatio = persona.attentionSpanSec / durationSec;

  let outcome: ListeningOutcome;
  let listenedSec: number;
  let dropAtPercent: number;

  if (pull < 0.28 && persona.archetype === "gen_z_tiktok") {
    outcome = "skip_hook";
    const skipSec =
      lyrics.hookWindowSec != null && lyrics.hookWindowSec > 15
        ? earlySkipSec
        : hookArrivalSec;
    listenedSec = Math.round(skipSec * (0.3 + rng() * 0.5));
    dropAtPercent = clamp((listenedSec / durationSec) * 100, 3, 12);
  } else if (pull < 0.38 && attentionRatio < 0.25) {
    outcome = "skip_early";
    listenedSec = Math.round(durationSec * (0.12 + rng() * 0.18));
    dropAtPercent = clamp((listenedSec / durationSec) * 100, 8, 28);
  } else if (pull >= 0.72 && rng() < 0.22 + pull * 0.15) {
    outcome = rng() < 0.55 ? "share" : "save";
    listenedSec = Math.round(durationSec * (0.85 + rng() * 0.15));
    dropAtPercent = 100;
  } else if (
    pull >= 0.58 &&
    persona.archetype === "playlist_curator" &&
    rng() < 0.35
  ) {
    outcome = "playlist_add";
    listenedSec = Math.round(durationSec * (0.75 + rng() * 0.25));
    dropAtPercent = 100;
  } else {
    outcome = "full_listen";
    listenedSec = Math.round(
      durationSec * clamp(0.55 + pull * 0.4 + rng() * 0.08, 0.45, 1)
    );
    dropAtPercent = listenedSec >= durationSec * 0.9 ? 100 : (listenedSec / durationSec) * 100;
  }

  return {
    personaId: persona.id,
    archetype: persona.archetype,
    platform: persona.platform,
    outcome,
    listenedSec,
    dropAtPercent,
  };
}

function buildRetentionCurve(
  results: PersonaListeningResult[],
  durationSec: number
): RetentionPoint[] {
  const checkpoints = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const labels: Record<number, string | undefined> = {
    10: "Hook",
    50: "Mid",
    80: "Final chorus",
  };

  return checkpoints.map((percent) => {
    const thresholdSec = (percent / 100) * durationSec;
    const retained = results.filter((r) => r.listenedSec >= thresholdSec).length;
    return {
      percent,
      retained: Math.round((retained / results.length) * 100),
      label: labels[percent],
    };
  });
}

function buildFunnel(scaled: CrowdSimulation["scaled"]): CrowdFunnelStep[] {
  const reached = scaled.reached;
  const steps: CrowdFunnelStep[] = [
    { label: "Reached", count: reached, percent: 100, color: "#8b5cf6" },
    {
      label: "Full listen",
      count: scaled.fullListeners,
      percent: Math.round((scaled.fullListeners / reached) * 100),
      color: "#a78bfa",
    },
    {
      label: "Saved",
      count: scaled.savers,
      percent: Math.round((scaled.savers / reached) * 100),
      color: "#c4b5fd",
    },
    {
      label: "Shared",
      count: scaled.sharers,
      percent: Math.round((scaled.sharers / reached) * 100),
      color: "#22d3ee",
    },
    {
      label: "Playlist add",
      count: scaled.playlistAdds,
      percent: Math.round((scaled.playlistAdds / reached) * 100),
      color: "#34d399",
    },
  ];
  return steps;
}

export interface CrowdSimulationOptions {
  cyanite?: CyaniteAnalysis;
  songstats?: SongstatsInsights;
  grounding?: CrowdGroundingSignals;
  whatIf?: WhatIfParams;
}

export function runCrowdSimulation(
  analysis: TrackAnalysis,
  durationSec: number,
  seed: number,
  options?: CrowdSimulationOptions
): CrowdSimulation {
  const rng = mulberry32(seed + 7919);
  const grounding =
    options?.grounding ??
    buildCrowdGrounding(analysis, options?.cyanite, options?.songstats);
  const mods = groundingModifiers(grounding, analysis.catalogBenchmark, analysis.artistMomentum);
  const personas = generatePersonas(seed);
  const results = personas.map((p) =>
    simulatePersona(p, analysis, durationSec, rng, mods)
  );

  const fullListen = results.filter((r) => r.outcome === "full_listen").length;
  const skipHook = results.filter((r) => r.outcome === "skip_hook").length;
  const saves = results.filter((r) => r.outcome === "save").length;
  const shares = results.filter((r) => r.outcome === "share").length;
  const playlistAdds = results.filter((r) => r.outcome === "playlist_add").length;
  const total = results.length;

  const scale = POPULATION_TARGET / total;
  const reached = POPULATION_TARGET;
  const scaled = {
    reached,
    fullListeners: Math.round((fullListen / total) * scale),
    savers: Math.round((saves / total) * scale),
    sharers: Math.round((shares / total) * scale),
    playlistAdds: Math.round((playlistAdds / total) * scale),
  };

  const shareRate = (shares + playlistAdds * 0.4) / total;
  const viralCoefficient = clamp(
    Math.round((shareRate * 2.8 + saves / total * 1.2) * 100) / 100,
    0.05,
    2.5
  );

  let finalSkipHookRate = Math.round((skipHook / total) * 100);
  let finalViralCoefficient = viralCoefficient;
  let finalPlaylistAddRate = Math.round((playlistAdds / total) * 100);
  let finalShareRate = Math.round((shares / total) * 100);

  // Integrate WhatIfParams to make simulation sensitive to distribution efforts
  const wi = options?.whatIf;
  if (wi) {
    // TikTok seeds strongly affect skip and share for short-form personas
    const tiktokBoost = Math.min(0.25, (wi.tiktokSeedPosts / 15) * 0.12);
    finalSkipHookRate = Math.max(5, Math.round(finalSkipHookRate * (1 - tiktokBoost)));
    finalShareRate = Math.min(45, Math.round(finalShareRate * (1 + tiktokBoost * 1.5)));
    finalViralCoefficient = clamp(finalViralCoefficient + tiktokBoost * 0.6, 0.1, 0.95);

    // Playlist pitches boost playlist adds
    const playlistBoost = Math.min(0.2, (wi.playlistPitchCount / 20) * 0.15);
    finalPlaylistAddRate = Math.min(35, Math.round(finalPlaylistAddRate * (1 + playlistBoost)));

    // Marketing budget and Friday timing give overall lift
    const budgetLift = Math.min(0.12, (wi.marketingBudget / 5000) * 0.08);
    const timingLift = wi.releaseTiming === "friday" ? 0.05 : 0;
    finalViralCoefficient = clamp(finalViralCoefficient + budgetLift + timingLift, 0.1, 0.98);
  }

  const crowd: CrowdSimulation = {
    populationTarget: POPULATION_TARGET,
    sampleSize: SAMPLE_SIZE,
    seed,
    personas: personas.slice(0, 120),
    results: results.slice(0, 120),
    funnel: buildFunnel(scaled),
    retentionCurve: buildRetentionCurve(results, durationSec),
    aggregates: {
      fullListenRate: Math.round((fullListen / total) * 100),
      skipHookRate: finalSkipHookRate,
      saveRate: Math.round((saves / total) * 100),
      shareRate: finalShareRate,
      playlistAddRate: finalPlaylistAddRate,
      avgListenSec: Math.round(
        results.reduce((s, r) => s + r.listenedSec, 0) / total
      ),
      viralCoefficient: finalViralCoefficient,
    },
    scaled,
  };

  return crowd;
}