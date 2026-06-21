import { describe, expect, it } from "vitest";
import { computeRhymeDensity, matchTrendKeywords } from "@/lib/scoring/lyrics-rhyme";

describe("lyrics-rhyme", () => {
  it("scores higher rhyme density for repeated end sounds", () => {
    const rhymed = computeRhymeDensity([
      "We run tonight",
      "Under city light",
      "Feel so right",
      "Dance until daylight",
    ]);
    const flat = computeRhymeDensity([
      "Monday morning coffee",
      "Traffic on the highway",
      "Emails never stopping",
    ]);
    expect(rhymed).toBeGreaterThan(flat);
  });

  it("matches trend keywords and MXM themes", () => {
    const match = matchTrendKeywords(
      ["dance", "tonight", "forever", "alone"],
      ["Party", "Love"]
    );
    expect(match.hits.length).toBeGreaterThanOrEqual(2);
    expect(match.alignmentBoost).toBeGreaterThan(0);
  });

  it("weights live trend keywords higher than static-only hits", () => {
    const staticOnly = matchTrendKeywords(["hello", "world"], []);
    const withLive = matchTrendKeywords(["hello", "delulu"], [], ["delulu", "main character"]);
    expect(withLive.alignmentBoost).toBeGreaterThanOrEqual(staticOnly.alignmentBoost);
    expect(withLive.hits).toContain("delulu");
  });
});