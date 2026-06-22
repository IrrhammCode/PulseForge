import { describe, expect, it } from "vitest";
import {
  buildCatalogBenchmark,
  buildSimilarTracksQuery,
  catalogSimulationBoost,
} from "@/lib/musixmatch/catalog-intelligence";
import type { AppTrack } from "@/lib/musixmatch/client";

const anchor: AppTrack = {
  id: "1",
  commontrackId: "1",
  title: "Midnight Drive",
  artist: "Nova Ray",
  album: undefined,
  duration: 210,
  coverUrl: undefined,
  isrc: undefined,
  genre: "Pop",
  releaseYear: undefined,
  rating: 80,
  explicit: false,
  hasRichsync: true,
  hasAnalysis: true,
  spotifyId: undefined,
};

describe("buildSimilarTracksQuery", () => {
  it("builds query from moods and themes", () => {
    const query = buildSimilarTracksQuery(anchor, {
      moods: { main_moods: ["Empowerment", "Party"] },
      themes: { main_themes: [{ theme: "freedom" }] },
      meaning: { explanation: "A song about breaking free and running the night." },
    });
    expect(query?.moods).toContain("Empowerment");
    expect(query?.themes).toContain("freedom");
    expect(query?.genre).toEqual(["Pop"]);
  });

  it("returns null when analysis is empty", () => {
    expect(buildSimilarTracksQuery(anchor, null)).toBeNull();
  });
});

describe("buildCatalogBenchmark", () => {
  it("computes median hook strength from similar tracks", () => {
    const benchmark = buildCatalogBenchmark(anchor, [
      {
        track: { ...anchor, id: "2", title: "Hit A", rating: 90 },
        analysis: { moods: { main_moods: ["Party"] } },
        lyricsBody: "dance all night dance all night dance all night",
      },
      {
        track: { ...anchor, id: "3", title: "Hit B", rating: 70 },
        analysis: { moods: { main_moods: ["Love"] } },
        lyricsBody: "love you forever love you forever",
      },
    ]);
    expect(benchmark.similarTracks).toHaveLength(2);
    expect(benchmark.medianHookStrength).toBeTypeOf("number");
    expect(benchmark.source).toBe("musixmatch");
  });
});

describe("catalogSimulationBoost", () => {
  it("returns higher boost for stronger catalog median", () => {
    const low = catalogSimulationBoost({ similarTracks: [], source: "none", medianHookStrength: 55 });
    const high = catalogSimulationBoost({ similarTracks: [], source: "none", medianHookStrength: 78 });
    expect(high).toBeGreaterThan(low);
  });
});