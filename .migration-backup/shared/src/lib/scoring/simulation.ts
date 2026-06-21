import type { ListenerSimulation, WhatIfParams } from "@/types";
import { clamp } from "@/lib/utils";

/** Seeded PRNG for reproducible Monte Carlo runs per track */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function whatIfMultiplier(params: WhatIfParams): number {
  const budget = (params.marketingBudget / 5000) * 0.12;
  const playlists = (params.playlistPitchCount / 20) * 0.1;
  const tiktok = (params.tiktokSeedPosts / 15) * 0.09;
  const timing =
    params.releaseTiming === "friday" ? 0.06 :
    params.releaseTiming === "saturday" ? 0.03 : 0;

  return 1 + budget + playlists + tiktok + timing;
}

export function runMonteCarloSimulation(
  hitScore: number,
  trackSeed: number,
  params: WhatIfParams,
  iterations = 200,
  partnerBoost = 0
): ListenerSimulation {
  const rng = mulberry32(trackSeed);
  const baseReach = (hitScore / 100) * whatIfMultiplier(params) * (1 + partnerBoost);

  let successCount = 0;
  const weekMedians: number[] = Array.from({ length: 16 }, () => 0);

  for (let i = 0; i < iterations; i++) {
    const viralFactor = 0.55 + rng() * 0.55;
    const decay = 0.22 + rng() * 0.18;
    let cumulative = 0;
    let reached = false;

    for (let week = 0; week < 16; week++) {
      const weeklyGrowth =
        Math.round(
          (8000 + rng() * 45000) *
          baseReach *
          viralFactor *
          Math.exp(-week * decay) *
          (1 + week * 0.04)
        );
      cumulative += weeklyGrowth;
      weekMedians[week] += cumulative;
      if (cumulative >= 1_000_000) reached = true;
    }
    if (reached) successCount++;
  }

  const curve = weekMedians.map((total, week) => {
    const plays = Math.round(total / iterations);
    const variance = 0.12 + week * 0.015 + (1 - baseReach) * 0.08;
    const spread = plays * variance;
    return {
      week,
      plays,
      lower: Math.round(plays - spread),
      upper: Math.round(plays + spread * 1.15),
    };
  });

  const probabilityToReach = Math.round((successCount / iterations) * 100);
  const projectedPeak = curve[curve.length - 1].upper;

  const medianWeeks = (() => {
    for (let w = 0; w < curve.length; w++) {
      if (curve[w].plays >= 1_000_000) return w + 1;
    }
    return clamp(Math.round(14 - baseReach * 6), 8, 16);
  })();

  return {
    targetPlays: 1_000_000,
    probabilityToReach: clamp(probabilityToReach, 5, 94),
    medianWeeks,
    projectedPeak,
    curve,
  };
}