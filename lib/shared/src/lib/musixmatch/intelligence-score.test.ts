import { describe, expect, it } from "vitest";
import {
  mxmIntelligenceLabel,
  mxmIntelligenceScore,
  sortByMxmIntelligence,
} from "@/lib/musixmatch/intelligence-score";
import type { AppTrack } from "@/lib/musixmatch/client";

const rich: AppTrack = {
  id: "1",
  commontrackId: "1",
  title: "A",
  artist: "X",
  album: undefined,
  duration: 200,
  coverUrl: undefined,
  isrc: undefined,
  genre: undefined,
  releaseYear: undefined,
  rating: 90,
  explicit: false,
  hasAnalysis: true,
  hasRichsync: true,
  spotifyId: undefined,
};

const basic: AppTrack = {
  id: "2",
  commontrackId: "2",
  title: "B",
  artist: "Y",
  album: undefined,
  duration: 200,
  coverUrl: undefined,
  isrc: undefined,
  genre: undefined,
  releaseYear: undefined,
  rating: undefined,
  explicit: false,
  hasAnalysis: false,
  hasRichsync: false,
  spotifyId: undefined,
};

describe("mxmIntelligenceScore", () => {
  it("ranks richer catalog entries higher", () => {
    expect(mxmIntelligenceScore(rich)).toBeGreaterThan(mxmIntelligenceScore(basic));
    expect(mxmIntelligenceLabel(rich)).toBe("full");
  });

  it("sorts tracks by intelligence score", () => {
    const sorted = sortByMxmIntelligence([basic, rich]);
    expect(sorted[0]?.id).toBe("1");
  });
});