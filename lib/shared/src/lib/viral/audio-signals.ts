import type { EnergyProfile, HitPotential } from "@/types";
import { clamp } from "@/lib/utils";

export interface BeatDropInsight {
  beatDropSec: number | null;
  beatDropScore: number;
  inSweetSpot: boolean;
}

const BEAT_DROP_SWEET_MIN = 15;
const BEAT_DROP_SWEET_MAX = 30;

/** Detect largest energy spike in the short-form window (≈10–45s). */
export function detectBeatDrop(
  waveform: number[],
  durationSec: number,
  searchMinSec = 10,
  searchMaxSec = 45
): BeatDropInsight {
  if (!waveform.length || durationSec <= 0) {
    return { beatDropSec: null, beatDropScore: 0, inSweetSpot: false };
  }

  const startIdx = Math.floor((searchMinSec / durationSec) * waveform.length);
  const endIdx = Math.min(
    waveform.length - 2,
    Math.ceil((searchMaxSec / durationSec) * waveform.length)
  );

  if (endIdx <= startIdx + 4) {
    return { beatDropSec: null, beatDropScore: 0, inSweetSpot: false };
  }

  const lookback = 3;
  let bestIdx = -1;
  let bestStrength = 0;

  for (let i = startIdx + lookback; i < endIdx; i++) {
    const prev = waveform.slice(i - lookback, i);
    const prevAvg = prev.reduce((s, v) => s + v, 0) / prev.length;
    const delta = waveform[i]! - prevAvg;
    const strength = delta * 0.65 + waveform[i]! * 0.35;
    if (strength > bestStrength) {
      bestStrength = strength;
      bestIdx = i;
    }
  }

  if (bestIdx < 0 || bestStrength < 0.07) {
    return { beatDropSec: null, beatDropScore: 0, inSweetSpot: false };
  }

  const beatDropSec = Math.round((bestIdx / waveform.length) * durationSec);
  const beatDropScore = clamp(
    Math.round(bestStrength * 170 + (waveform[bestIdx] ?? 0) * 25),
    0,
    100
  );
  const inSweetSpot =
    beatDropSec >= BEAT_DROP_SWEET_MIN && beatDropSec <= BEAT_DROP_SWEET_MAX;

  return { beatDropSec, beatDropScore, inSweetSpot };
}

export function enrichEnergyWithBeatDrop(
  energy: EnergyProfile,
  durationSec: number
): EnergyProfile {
  const drop = detectBeatDrop(energy.waveform, durationSec);
  if (!drop.beatDropSec) return energy;
  return {
    ...energy,
    beatDropSec: drop.beatDropSec,
    beatDropScore: drop.beatDropScore,
  };
}

export function beatDropSweetSpotModifier(
  beatDropSec: number | undefined,
  beatDropScore?: number
): number {
  if (beatDropSec == null) return -0.03;
  if (beatDropSec >= BEAT_DROP_SWEET_MIN && beatDropSec <= BEAT_DROP_SWEET_MAX) {
    return 0.06 + clamp((beatDropScore ?? 50) / 1000, 0, 0.04);
  }
  if (beatDropSec > 35) return -0.08;
  if (beatDropSec < 12) return -0.04;
  return 0;
}

export function adjustBeatFitWithBeatDrop(
  hitPotential: HitPotential,
  energy: Pick<EnergyProfile, "beatDropSec" | "beatDropScore">
): HitPotential {
  if (energy.beatDropSec == null) return hitPotential;

  let beatFit = hitPotential.breakdown.beatFit;
  if (energy.beatDropSec >= BEAT_DROP_SWEET_MIN && energy.beatDropSec <= BEAT_DROP_SWEET_MAX) {
    beatFit = clamp(beatFit + 5 + Math.round((energy.beatDropScore ?? 0) * 0.04), 0, 95);
  } else if (energy.beatDropSec > 35) {
    beatFit = clamp(beatFit - 5, 0, 95);
  } else if (energy.beatDropSec < 12) {
    beatFit = clamp(beatFit - 3, 0, 95);
  }

  const overall = clamp(
    Math.round(
      beatFit * 0.25 +
        hitPotential.breakdown.lyricVirality * 0.3 +
        hitPotential.breakdown.trendAlignment * 0.2 +
        hitPotential.breakdown.hookStrength * 0.25
    ),
    hitPotential.overall - 6,
    96
  );

  const verdict: HitPotential["verdict"] =
    overall >= 78 ? "strong" : overall >= 62 ? "promising" : "needs-work";

  return {
    ...hitPotential,
    overall,
    verdict,
    breakdown: { ...hitPotential.breakdown, beatFit },
  };
}

/** Hook landing time — richsync when available, else ~8% duration heuristic. */
export function resolveHookArrivalSec(
  hookWindowSec: number | undefined,
  durationSec: number
): number {
  if (hookWindowSec != null && hookWindowSec > 0) {
    return clamp(Math.round(hookWindowSec), 3, Math.min(45, Math.round(durationSec * 0.5)));
  }
  return clamp(Math.round(durationSec * 0.08), 6, 18);
}

/** TikTok / short-form skip window (first seconds before listener bails). */
export function resolveEarlySkipSec(durationSec: number): number {
  return clamp(Math.round(durationSec * 0.08), 6, 15);
}

/** BPM sweet spot for short-form dance/pop (120–140). */
export function bpmSweetSpotModifier(bpm: number): number {
  if (bpm >= 120 && bpm <= 140) return 0.08;
  if (bpm >= 110 && bpm <= 150) return 0.03;
  if (bpm < 95 || bpm > 165) return -0.06;
  return -0.02;
}

const BUILDUP_DYNAMICS = /increas|build|rise|variable|dynamic/i;
const FLAT_DYNAMICS = /static|steady|flat|decreas/i;

/** 0–1 score: rising energy into the hook window (waveform + Cyanite dynamics). */
export function computeEnergyBuildupScore(
  energy: Pick<EnergyProfile, "waveform" | "energyDynamics">,
  hookArrivalSec: number,
  durationSec: number
): number {
  let score = 0.5;

  if (energy.energyDynamics) {
    if (BUILDUP_DYNAMICS.test(energy.energyDynamics)) score += 0.18;
    else if (FLAT_DYNAMICS.test(energy.energyDynamics)) score -= 0.12;
  }

  const waveform = energy.waveform;
  if (waveform.length >= 12 && durationSec > 0) {
    const hookRatio = hookArrivalSec / durationSec;
    const hookIdx = Math.max(3, Math.floor(hookRatio * waveform.length));
    const window = waveform.slice(0, hookIdx);
    const third = Math.max(1, Math.floor(window.length / 3));
    const startAvg =
      window.slice(0, third).reduce((s, v) => s + v, 0) / third;
    const endAvg =
      window.slice(-third).reduce((s, v) => s + v, 0) / third;
    const rise = endAvg - startAvg;
    const peak = Math.max(...window);
    const peakLift = peak / Math.max(startAvg, 0.05);

    score += clamp(rise * 1.8, -0.2, 0.25);
    if (peakLift >= 1.35) score += 0.12;
    else if (peakLift < 1.05) score -= 0.08;
  }

  return clamp(score, 0, 1);
}

/** Penalty when memorable hook lands after the short-form attention window. */
export function lateHookPullPenalty(hookWindowSec: number | undefined): number {
  if (hookWindowSec == null) return 0;
  if (hookWindowSec <= 15) return 0;
  if (hookWindowSec <= 30) return clamp((hookWindowSec - 15) / 120, 0, 0.1);
  return clamp(0.1 + (hookWindowSec - 30) / 80, 0.1, 0.22);
}