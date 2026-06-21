import type { EnergyProfile, HitPotential, ScoreBreakdown } from "@/types";
import type { AudioSignals } from "@/lib/domain/types";
import { deriveEnergyProfile } from "@/lib/scoring/energy";
import type { AppTrack } from "@/lib/musixmatch/client";
import type { LyricsStructure } from "@/types";
import { clamp } from "@/lib/utils";
import { computeProductionQuality, computeVocalScore } from "./production-quality";

export function resolveStudioDuration(
  audio?: AudioSignals,
  bpmTarget?: number,
  fallback = 210
): number {
  if (audio?.durationSec) return Math.round(audio.durationSec);
  if (bpmTarget) return Math.round(180 + (bpmTarget - 100) * 0.5);
  return fallback;
}

export function resolveStudioBpm(
  audio?: AudioSignals,
  bpmTarget?: number,
  lyrics?: LyricsStructure,
  track?: AppTrack
): number {
  if (audio?.estimatedBpm) return Math.round(audio.estimatedBpm);
  if (bpmTarget) return bpmTarget;
  if (lyrics && track) return deriveEnergyProfile(track, lyrics).bpm;
  return 110;
}

/** Fuse client-side demo audio signals into energy profile. */
export function buildEnergyFromAudioSignals(
  base: EnergyProfile,
  audio?: AudioSignals,
  bpmTarget?: number
): EnergyProfile {
  if (!audio?.estimatedBpm && !audio?.waveform?.length) {
    return base;
  }

  const bpm = resolveStudioBpm(audio, bpmTarget);
  const waveform =
    audio.waveform && audio.waveform.length >= 20
      ? resampleWaveform(audio.waveform, 80)
      : base.waveform;

  let energy = base.energy;
  if (bpm >= 120) energy = clamp(energy + 0.04, 0, 1);
  if (bpm <= 90) energy = clamp(energy - 0.03, 0, 1);

  const enhanced: EnergyProfile = {
    ...base,
    bpm,
    energy,
    danceability: clamp(base.danceability + (bpm > 115 ? 0.05 : 0), 0, 1),
    waveform,
    source: audio.estimatedBpm || audio.waveform?.length ? "estimated" : base.source,
    caption: audio.fileName
      ? `Demo "${audio.fileName}" — client BPM/waveform signals`
      : base.caption,
  };

  // Attach production + vocal scores for demo audio path (makes local stems/vocal volumes first-class)
  const stemBalance = audio?.stemBalance;
  const prod = computeProductionQuality({
    waveform,
    loudness: enhanced.loudness,
    stemBalance,
  });
  const voc = computeVocalScore({
    stems: audio?.stems,
    waveform,
    energy: enhanced.energy,
    hasStrongHook: true,
  });

  return {
    ...enhanced,
    productionQuality: prod,
    vocalScore: voc,
  };
}

function resampleWaveform(source: number[], targetLen: number): number[] {
  if (source.length === targetLen) return source;
  const out: number[] = [];
  for (let i = 0; i < targetLen; i++) {
    const idx = Math.floor((i / targetLen) * source.length);
    out.push(source[idx] ?? 0);
  }
  const peak = Math.max(...out, 0.001);
  return out.map((v) => v / peak);
}

/** Boost beatFit when demo BPM aligns with genre sweet spot or project target. */
export function adjustBeatFitWithAudio(
  breakdown: ScoreBreakdown,
  audio?: AudioSignals,
  bpmTarget?: number
): ScoreBreakdown {
  if (!audio?.estimatedBpm) return breakdown;

  const bpm = audio.estimatedBpm;
  let boost = 0;

  if (bpmTarget) {
    const delta = Math.abs(bpm - bpmTarget);
    if (delta <= 3) boost += 6;
    else if (delta <= 8) boost += 3;
    else if (delta > 20) boost -= 2;
  }

  if (bpm >= 115 && bpm <= 130) boost += 2;

  return {
    ...breakdown,
    beatFit: clamp(breakdown.beatFit + boost, 40, 95),
  };
}

export function adjustHitPotentialWithAudio(
  hitPotential: HitPotential,
  audio?: AudioSignals,
  bpmTarget?: number
): HitPotential {
  let breakdown = adjustBeatFitWithAudio(hitPotential.breakdown, audio, bpmTarget);

  if (audio?.stemBalance != null && audio.stemsReady) {
    const stemBoost = audio.stemBalance >= 70 ? 3 : audio.stemBalance < 40 ? -4 : 0;
    breakdown = {
      ...breakdown,
      beatFit: clamp(breakdown.beatFit + stemBoost, 40, 95),
    };
  }

  // Layer production & vocal when the (enriched) energy carries them — critical for studio vocal volume tweaks
  const energyProd = (hitPotential as any)._energyProd ?? undefined; // not passed directly; rely on later partners pass
  // (partners + studio-analysis will re-apply using final energy.productionQuality / vocalScore)

  const delta = breakdown.beatFit - hitPotential.breakdown.beatFit;
  const overall = clamp(hitPotential.overall + Math.round(delta * 0.5), 40, 96);

  return {
    ...hitPotential,
    overall,
    breakdown,
    confidence: audio?.estimatedBpm
      ? clamp(hitPotential.confidence + 4, 50, 92)
      : hitPotential.confidence,
    verdict:
      overall >= 78 ? "strong" : overall >= 62 ? "promising" : "needs-work",
  };
}