import { describe, expect, it } from "vitest";
import {
  artistMomentumSimulationBoost,
  adjustHitPotentialWithArtistMomentum,
} from "@/lib/songstats/artist-momentum";
import type { ArtistMomentumInsights, HitPotential } from "@/types";

const baseHit: HitPotential = {
  overall: 68,
  confidence: 75,
  verdict: "promising",
  breakdown: {
    beatFit: 70,
    lyricVirality: 65,
    trendAlignment: 55,
    hookStrength: 72,
  },
};

const risingArtist: ArtistMomentumInsights = {
  available: true,
  status: "ok",
  artistName: "Nova Ray",
  momentumScore: 72,
  tier: "rising",
  monthlyListeners: 120_000,
};

describe("artist momentum", () => {
  it("boosts trend alignment for available artist data", () => {
    const adjusted = adjustHitPotentialWithArtistMomentum(baseHit, risingArtist);
    expect(adjusted.breakdown.trendAlignment).toBeGreaterThan(baseHit.breakdown.trendAlignment);
    expect(adjusted.overall).toBeGreaterThanOrEqual(baseHit.overall);
  });

  it("gives rising tier the highest simulation boost", () => {
    const rising = artistMomentumSimulationBoost(risingArtist);
    const emerging = artistMomentumSimulationBoost({
      ...risingArtist,
      tier: "emerging",
      momentumScore: 35,
    });
    expect(rising).toBeGreaterThan(emerging);
  });
});