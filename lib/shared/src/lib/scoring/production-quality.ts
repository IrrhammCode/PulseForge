import type { StemMeta } from "@/types/studio";
import { clamp } from "@/lib/utils";

export interface ProductionQualityInput {
  waveform: number[];
  loudness: number; // e.g. -5.2 (more negative = quieter in current scale)
  energyDynamics?: string;
  stemBalance?: number; // 0-100 from computeStemBalanceScore
  cyaniteAvailable?: boolean;
  source?: string;
}

export interface VocalScoreInput {
  stems?: StemMeta[];
  instrumentTags?: string[];
  waveform: number[];
  hookWindowSec?: number;
  energy?: number; // 0-1
  hasStrongHook?: boolean;
  durationSec?: number;
}

/**
 * 0-100 production quality score.
 * Factors: modern loudness target adherence (-6 to -9 sweet spot for viral short-form),
 * dynamic movement (naik-turun), low compression artifacts (waveform variance),
 * stem balance, and presence of high-quality partner analysis.
 */
export function computeProductionQuality(input: ProductionQualityInput): number {
  const { waveform, loudness, energyDynamics, stemBalance, cyaniteAvailable } = input;

  // Loudness target: modern tracks for TikTok/playlist often sit -5.5 to -8 integrated.
  // Our loudness is rough (higher number = louder, e.g. -4.5 > -8).
  // Ideal center around -6.8.
  const loudnessTarget = -6.8;
  const loudnessDelta = Math.abs(loudness - loudnessTarget);
  let loudnessScore = 92 - loudnessDelta * 11; // ~ -4 gives ~65, -7 gives ~92, -10 gives ~58
  if (loudness > -3.5) loudnessScore -= 18; // too hot, squashed risk
  loudnessScore = clamp(Math.round(loudnessScore), 35, 96);

  // Dynamics / movement quality (the "naik-turun yang bagus")
  let dynamicsScore = 62;
  const dyn = (energyDynamics || "").toLowerCase();
  if (dyn.includes("variable") || dyn.includes("dynamic") || dyn.includes("build") || dyn.includes("increas")) {
    dynamicsScore += 22;
  } else if (dyn.includes("flat") || dyn.includes("steady") || dyn.includes("static")) {
    dynamicsScore -= 18;
  }

  // Waveform variance = good micro-dynamics (not brickwalled)
  if (waveform.length >= 12) {
    const avg = waveform.reduce((s, v) => s + v, 0) / waveform.length;
    const variance = waveform.reduce((s, v) => s + (v - avg) ** 2, 0) / waveform.length;
    const std = Math.sqrt(variance);
    if (std > 0.22) dynamicsScore += 11;
    else if (std < 0.09) dynamicsScore -= 14;
  }

  let production = Math.round(loudnessScore * 0.42 + dynamicsScore * 0.38);

  // Stem balance contribution (mix quality)
  if (typeof stemBalance === "number") {
    production = Math.round(production * 0.7 + stemBalance * 0.3);
  }

  // Cyanite high-fidelity analysis is a quality signal itself
  if (cyaniteAvailable) production = clamp(production + 6, 0, 98);

  return clamp(Math.round(production), 28, 96);
}

/**
 * 0-100 vocal presence + clarity score.
 * Prioritizes:
 *  - Real stems: vocal lane volume + not muted
 *  - Cyanite instrumentTags containing vocal/voice/sing signals
 *  - Waveform energy alignment with hook window (vocal "pops")
 *  - Hook strength proxy (clear memorable vocal line)
 */
export function computeVocalScore(input: VocalScoreInput): number {
  const { stems, instrumentTags = [], waveform, hookWindowSec, energy = 0.6, hasStrongHook, durationSec = 210 } = input;

  let score = 54; // neutral default when no audio

  // 1. Stems (highest signal - user-controlled in studio)
  const vocals = stems?.find((s) => s.id === "vocals");
  if (vocals) {
    if (vocals.muted) {
      score = 22; // heavily penalized
    } else {
      const vol = vocals.volume ?? 1;
      // Sweet spot 0.75 - 1.25
      if (vol >= 0.72 && vol <= 1.28) score += 26;
      else if (vol < 0.45) score -= 18;
      else if (vol > 1.55) score -= 9;
      else score += 12;

      if (vol > 0.55 && vol < 1.4) score += 8; // presence
    }
  }

  // 2. Cyanite instrument / vocal tags
  const lowerTags = instrumentTags.map((t) => t.toLowerCase());
  const hasVocalTag = lowerTags.some((t) =>
    /vocal|voice|sing|choir|female|male|rap|spoken/.test(t)
  );
  if (hasVocalTag) score += 18;
  if (lowerTags.includes("vocals") || lowerTags.some((t) => t.includes("vocal"))) score += 7;

  // 3. Waveform + hook timing proxy for vocal "cut through"
  if (waveform.length >= 16) {
    const hookSec = hookWindowSec ?? Math.max(8, durationSec * 0.08);
    const hookRatio = Math.min(0.42, hookSec / Math.max(60, durationSec));
    const hookIdx = Math.max(2, Math.floor(hookRatio * waveform.length));
    const preHook = waveform.slice(Math.max(0, hookIdx - 6), hookIdx);
    const hookRegion = waveform.slice(hookIdx, Math.min(waveform.length, hookIdx + 7));

    const preAvg = preHook.length ? preHook.reduce((s, v) => s + v, 0) / preHook.length : 0.4;
    const hookAvg = hookRegion.length ? hookRegion.reduce((s, v) => s + v, 0) / hookRegion.length : 0.5;

    const lift = hookAvg - preAvg;
    if (lift > 0.11) score += 13;
    else if (lift > 0.04) score += 7;
    else if (lift < -0.06) score -= 6;

    // Overall energy in vocal range of spectrum proxy (mid energy via waveform peaks in hook)
    if (hookAvg > 0.65 && energy > 0.55) score += 6;
  }

  // 4. Strong memorable vocal hook line helps perceived clarity
  if (hasStrongHook) score += 9;

  // Bonus for high overall energy (vocal sits on top)
  if (energy > 0.78) score += 4;

  return clamp(Math.round(score), 18, 96);
}

/**
 * Simple loudness quality helper (used by production + gaps).
 * Returns a 0-100 "how good is this loudness for viral" score.
 */
export function loudnessQualityScore(loudness: number): number {
  // Target window for competitive modern short-form: roughly -5.8 to -8.2
  if (loudness >= -5.8 && loudness <= -8.2) return 94;
  if (loudness >= -5.2 && loudness <= -8.8) return 82;
  if (loudness >= -4.2 && loudness <= -9.5) return 66;
  if (loudness > -3.5) return 42; // too crushed
  return 55;
}
