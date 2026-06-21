import { describe, expect, it } from "vitest";
import {
  mxmIntelligenceLabel,
  mxmIntelligenceScore,
  sortByMxmIntelligence,
} from "@/lib/musixmatch/intelligence-score";
import type { AppTrack } from "@/lib/musixmatch/client";

const rich: AppTrack = {
  id: "1",
  title: "A",
  artist: "X",
  duration: 200,
  hasAnalysis: true,
  hasRichsync: true,
  rating: 90,
};

const basic: AppTrack = {
  id: "2",
  title: "B",
  artist: "Y",
  duration: 200,
  hasAnalysis: false,
  hasRichsync: false,
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