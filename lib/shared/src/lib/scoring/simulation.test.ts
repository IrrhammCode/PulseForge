import { describe, expect, it } from "vitest";
import { runMonteCarloSimulation } from "@/lib/scoring/simulation";
import { DEFAULT_WHAT_IF } from "@/lib/constants";
import type { WhatIfParams } from "@/types";

// A handful of fixed seeds so the calibration is averaged over several
// reproducible Monte Carlo runs rather than a single lucky/unlucky draw.
const SEEDS = [1, 7, 42, 123, 777, 2024];

function avgProbability(hitScore: number, params: WhatIfParams = DEFAULT_WHAT_IF): number {
  const total = SEEDS.reduce(
    (sum, seed) => sum + runMonteCarloSimulation(hitScore, seed, params).probabilityToReach,
    0
  );
  return total / SEEDS.length;
}

// Representative hit-potential scores for genuinely strong tracks vs. weak demos.
const REAL_HITS = [85, 90, 95];
const WEAK_SONGS = [20, 30, 40];

function rosterAvg(scores: number[]): number {
  return scores.reduce((sum, s) => sum + avgProbability(s), 0) / scores.length;
}

describe("Viral Lab simulation calibration", () => {
  it("gives real hits a far higher 1M-play probability than weak songs", () => {
    const hits = rosterAvg(REAL_HITS);
    const weak = rosterAvg(WEAK_SONGS);

    // Strong tracks should land in a clearly optimistic band...
    expect(hits).toBeGreaterThan(55);
    // ...while weak demos stay near the pessimistic floor.
    expect(weak).toBeLessThan(15);
    // The gap between the two cohorts must be unmistakable.
    expect(hits - weak).toBeGreaterThan(45);
  });

  it("increases probability monotonically as hit potential rises", () => {
    const buckets = [40, 50, 60, 70, 80, 90].map((hs) => avgProbability(hs));
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i]).toBeGreaterThanOrEqual(buckets[i - 1]);
    }
    // The very top of the range must beat the bottom by a wide margin.
    expect(buckets[buckets.length - 1] - buckets[0]).toBeGreaterThan(40);
  });

  it("keeps every probability inside the calibrated [5, 94] confidence band", () => {
    for (let hs = 0; hs <= 100; hs += 5) {
      for (const seed of SEEDS) {
        const { probabilityToReach } = runMonteCarloSimulation(hs, seed, DEFAULT_WHAT_IF);
        expect(probabilityToReach).toBeGreaterThanOrEqual(5);
        expect(probabilityToReach).toBeLessThanOrEqual(94);
      }
    }
  });

  it("is deterministic for a given track seed", () => {
    const a = runMonteCarloSimulation(80, 42, DEFAULT_WHAT_IF);
    const b = runMonteCarloSimulation(80, 42, DEFAULT_WHAT_IF);
    expect(b.probabilityToReach).toBe(a.probabilityToReach);
    expect(b.projectedPeak).toBe(a.projectedPeak);
  });

  it("rewards a stronger launch plan (budget, playlists, TikTok seeding)", () => {
    const lean: WhatIfParams = {
      marketingBudget: 0,
      playlistPitchCount: 0,
      tiktokSeedPosts: 0,
      releaseTiming: "monday",
    };
    const heavy: WhatIfParams = {
      marketingBudget: 10000,
      playlistPitchCount: 40,
      tiktokSeedPosts: 30,
      releaseTiming: "friday",
    };
    // Use a mid-tier track where the launch levers can actually move the needle.
    expect(avgProbability(70, heavy)).toBeGreaterThan(avgProbability(70, lean));
  });
});
