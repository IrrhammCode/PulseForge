import type { ArtistMomentumInsights, CatalogBenchmark, TrackAnalysis } from "@/types";
import { catalogSimulationBoost } from "@/lib/musixmatch/catalog-intelligence";
import { artistMomentumSimulationBoost } from "@/lib/songstats/artist-momentum";
import type { CyaniteAnalysis } from "@/lib/cyanite/client";
import type { SongstatsInsights } from "@/lib/songstats/client";
import { clamp } from "@/lib/utils";

export interface CrowdGroundingSignals {
  velocityScore: number;
  tiktokCreates: number;
  cyaniteEnergy?: number;
  danceability?: number;
  source: ("songstats" | "cyanite" | "waveform" | "none")[];
}

export function buildCrowdGrounding(
  analysis: TrackAnalysis,
  cyanite?: CyaniteAnalysis,
  songstats?: SongstatsInsights
): CrowdGroundingSignals {
  const sources: CrowdGroundingSignals["source"] = [];
  let velocityScore = 0;
  let tiktokCreates = 0;
  let cyaniteEnergy: number | undefined;
  let danceability: number | undefined;

  if (songstats?.available) {
    velocityScore = songstats.velocityScore;
    tiktokCreates = songstats.tiktokCreates;
    sources.push("songstats");
  } else if (analysis.streaming?.available) {
    velocityScore = analysis.streaming.velocityScore;
    tiktokCreates = analysis.streaming.tiktokCreates;
    sources.push("songstats");
  }

  if (analysis.velocityHistory?.available) {
    const historicBlend = Math.round(
      analysis.velocityHistory.historicVelocityScore * 0.35
    );
    if (analysis.velocityHistory.trajectory === "accelerating") {
      velocityScore = Math.max(velocityScore, historicBlend);
    } else if (analysis.velocityHistory.trajectory === "decelerating") {
      velocityScore = Math.min(velocityScore, Math.max(velocityScore - 8, historicBlend));
    }
  }

  if (cyanite?.available && cyanite.status === "finished") {
    cyaniteEnergy =
      cyanite.arousal != null ? clamp((cyanite.arousal + 1) / 2, 0, 1) : undefined;
    danceability =
      cyanite.movementTags.some((t) => /dance|groove/i.test(t)) ? 0.72 : 0.55;
    sources.push("cyanite");
  } else if (analysis.energy.waveform?.length) {
    danceability = analysis.energy.danceability;
    sources.push("waveform");
  }

  if (sources.length === 0) sources.push("none");

  return { velocityScore, tiktokCreates, cyaniteEnergy, danceability, source: sources };
}

/** Adjust skip/save priors from real-ish partner signals. */
export function groundingModifiers(
  signals: CrowdGroundingSignals,
  catalogBenchmark?: CatalogBenchmark,
  artistMomentum?: ArtistMomentumInsights
): {
  skipHookBias: number;
  saveBias: number;
  shareBias: number;
  genZTikTokWeight: number;
} {
  const velocityBoost = clamp(signals.velocityScore / 200, 0, 0.12);
  const tiktokBoost = clamp(signals.tiktokCreates / 5000, 0, 0.1);
  const energyBoost = signals.cyaniteEnergy != null ? (signals.cyaniteEnergy - 0.5) * 0.08 : 0;
  const catalogBoost = catalogSimulationBoost(catalogBenchmark);
  const artistBoost = artistMomentumSimulationBoost(artistMomentum);

  return {
    skipHookBias: -(velocityBoost + energyBoost + catalogBoost + artistBoost) * 0.5,
    saveBias: velocityBoost + tiktokBoost * 0.3 + catalogBoost * 0.4 + artistBoost * 0.5,
    shareBias: tiktokBoost + velocityBoost * 0.4 + catalogBoost * 0.5 + artistBoost * 0.6,
    genZTikTokWeight: clamp(
      0.28 + tiktokBoost + catalogBoost * 0.2 + artistBoost * 0.3,
      0.2,
      0.38
    ),
  };
}