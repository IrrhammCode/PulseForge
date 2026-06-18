import type { EnergyProfile, HitPotential, LyricsStructure } from "@/types";
import type { CyaniteAnalysis } from "@/lib/cyanite/client";
import type { SongstatsInsights } from "@/lib/songstats/client";
import type { AppTrack } from "@/lib/musixmatch/client";
import { clamp } from "@/lib/utils";
import { deriveEnergyProfile } from "./energy";
import { computeProductionQuality, computeVocalScore } from "./production-quality";

const ENERGY_LEVEL_MAP: Record<string, number> = {
  high: 0.88,
  medium: 0.62,
  low: 0.38,
  variable: 0.72,
};

const DANCE_MOVEMENTS = new Set(["groovy", "driving", "bouncy", "pulsing", "running"]);

export function buildEnergyFromCyanite(
  track: AppTrack,
  lyrics: LyricsStructure,
  cyanite: CyaniteAnalysis
): EnergyProfile {
  const fallback = deriveEnergyProfile(track, lyrics);

  if (!cyanite.available || cyanite.status !== "finished") {
    return {
      ...fallback,
      source: cyanite.status === "processing" ? "cyanite-processing" : "estimated",
      moodTags: [],
      genreTags: [],
      movementTags: [],
      instrumentTags: [],
      caption: undefined,
    };
  }

  const energy =
    cyanite.energyLevel && ENERGY_LEVEL_MAP[cyanite.energyLevel]
      ? ENERGY_LEVEL_MAP[cyanite.energyLevel]
      : cyanite.arousal != null
        ? clamp((cyanite.arousal + 1) / 2, 0.2, 0.98)
        : fallback.energy;

  const valence =
    cyanite.valence != null
      ? clamp((cyanite.valence + 1) / 2, 0, 1)
      : fallback.valence;

  const danceability = cyanite.movementTags.some((t) =>
    DANCE_MOVEMENTS.has(t.toLowerCase())
  )
    ? clamp(danceabilityFromMovement(cyanite.movementTags), 0.4, 0.95)
    : fallback.danceability;

  const bpm = cyanite.bpm ? Math.round(cyanite.bpm) : fallback.bpm;

  const waveform =
    cyanite.segmentEnergy.length >= 20
      ? resampleWaveform(cyanite.segmentEnergy, 80)
      : fallback.waveform;

  const baseProfile: EnergyProfile = {
    bpm,
    energy: clamp(energy, 0, 1),
    danceability: clamp(danceability, 0, 1),
    valence: clamp(valence, 0, 1),
    loudness: fallback.loudness,
    waveform,
    source: "cyanite",
    key: cyanite.key,
    energyLevel: cyanite.energyLevel,
    energyDynamics: cyanite.energyDynamics,
    moodTags: cyanite.moodTags,
    genreTags: cyanite.genreTags,
    movementTags: cyanite.movementTags,
    instrumentTags: cyanite.instrumentTags,
    caption: cyanite.caption,
  };

  // Attach first-class production & vocal signals (Cyanite path)
  const prod = computeProductionQuality({
    waveform,
    loudness: baseProfile.loudness,
    energyDynamics: cyanite.energyDynamics,
    cyaniteAvailable: true,
  });
  const vocal = computeVocalScore({
    instrumentTags: cyanite.instrumentTags,
    waveform,
    energy: baseProfile.energy,
    hasStrongHook: true, // lyrics hook assumed present at analysis time
  });

  return {
    ...baseProfile,
    productionQuality: prod,
    vocalScore: vocal,
  };
}

function danceabilityFromMovement(tags: string[]): number {
  const scores: Record<string, number> = {
    groovy: 0.9,
    driving: 0.82,
    bouncy: 0.88,
    pulsing: 0.8,
    running: 0.75,
    steady: 0.55,
  };
  const matched = tags.map((t) => scores[t.toLowerCase()] ?? 0.5);
  return matched.reduce((a, b) => a + b, 0) / matched.length;
}

function resampleWaveform(values: number[], target: number): number[] {
  if (values.length === target) return values;
  const result: number[] = [];
  for (let i = 0; i < target; i++) {
    const idx = Math.floor((i / target) * values.length);
    result.push(values[idx] ?? 0.3);
  }
  return result;
}

export function adjustHitPotentialWithPartners(
  hitPotential: HitPotential,
  songstats: SongstatsInsights,
  cyanite: CyaniteAnalysis,
  productionQuality?: number,
  vocalScore?: number
): HitPotential {
  let beatFit = hitPotential.breakdown.beatFit;
  let trendAlignment = hitPotential.breakdown.trendAlignment;
  let hookStrength = hitPotential.breakdown.hookStrength;

  if (cyanite.available && cyanite.status === "finished") {
    if (cyanite.energyLevel === "high") beatFit = clamp(beatFit + 4, 0, 95);
    if (cyanite.moodTags.includes("energetic") || cyanite.moodTags.includes("uplifting")) {
      trendAlignment = clamp(trendAlignment + 3, 0, 95);
    }
  }

  if (songstats.available) {
    trendAlignment = clamp(
      trendAlignment + Math.round(songstats.velocityScore * 0.12),
      0,
      95
    );
  }

  // New first-class signals (production + vocal) — make the partials "sangat ready"
  if (typeof productionQuality === "number" && productionQuality >= 68) {
    beatFit = clamp(beatFit + Math.round((productionQuality - 65) * 0.11), 40, 96);
  } else if (typeof productionQuality === "number" && productionQuality < 48) {
    beatFit = clamp(beatFit - 7, 38, 92);
  }

  if (typeof vocalScore === "number") {
    // Strong clear vocals improve perceived hook strength and memorability (TikTok loves vocal hooks)
    if (vocalScore >= 72) hookStrength = clamp(hookStrength + 5, 40, 96);
    else if (vocalScore >= 60) hookStrength = clamp(hookStrength + 2, 40, 95);
    else if (vocalScore < 42) hookStrength = clamp(hookStrength - 4, 32, 90);
  }

  const overall = clamp(
    Math.round(
      beatFit * 0.25 +
      hitPotential.breakdown.lyricVirality * 0.3 +
      trendAlignment * 0.2 +
      hookStrength * 0.25
    ),
    hitPotential.overall - 5,
    96
  );

  const verdict: HitPotential["verdict"] =
    overall >= 78 ? "strong" : overall >= 62 ? "promising" : "needs-work";

  const confidence = clamp(
    hitPotential.confidence +
      (cyanite.available ? 5 : 0) +
      (songstats.available ? 5 : 0) +
      (productionQuality && productionQuality > 65 ? 3 : 0) +
      (vocalScore && vocalScore > 65 ? 3 : 0),
    60,
    96
  );

  return {
    overall,
    breakdown: { ...hitPotential.breakdown, beatFit, trendAlignment, hookStrength },
    confidence,
    verdict,
  };
}

export function simulationBoostFromSongstats(songstats: SongstatsInsights): number {
  if (!songstats.available) return 0;
  return Math.min(0.12, songstats.velocityScore / 800);
}