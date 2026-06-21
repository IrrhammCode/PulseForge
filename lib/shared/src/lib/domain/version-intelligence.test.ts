import { describe, expect, it } from "vitest";
import {
  buildVersionIntelligence,
  resolveCanonicalWhatIf,
  resolveCanonicalHitScore,
} from "@/lib/domain/version-intelligence";
import { DEFAULT_WHAT_IF } from "@/lib/constants";
import type { StudioProject } from "@/types/studio";
import { EMPTY_LYRICS } from "@/types/studio";

const project: StudioProject = {
  id: "p1",
  title: "Song",
  artistName: "Artist",
  genre: "Pop",
  mood: "Energetic",
  status: "crafting",
  versions: [
    {
      id: "v1",
      label: "v1",
      lyrics: { ...EMPTY_LYRICS, chorus: "hook" },
      launchPlan: {
        whatIf: { ...DEFAULT_WHAT_IF, marketingBudget: 900 },
        manualChecks: {},
      },
      viral: {
        readiness: {
          score: 70,
          verdict: "near-viral",
          headline: "Near",
          subline: "Gaps",
        },
        gaps: [],
        crowd: {
          aggregates: {
            fullListenRate: 40,
            skipHookRate: 10,
            saveRate: 5,
            shareRate: 3,
            playlistAddRate: 2,
            avgListenSec: 100,
            viralCoefficient: 0.4,
          },
          scaled: {
            reached: 1_000_000,
            fullListeners: 400_000,
            savers: 50_000,
            sharers: 30_000,
            playlistAdds: 20_000,
          },
          funnel: [],
          retentionCurve: [],
          populationTarget: 1_000_000,
          sampleSize: 100,
        },
        timeline: {
          durationSec: 180,
          bpm: 120,
          lanes: [],
          playheadPercent: 20,
          gapCount: 0,
        },
        monteCarlo: {
          probabilityToReach: 55,
          medianWeeks: 10,
          projectedPeak: 800_000,
          curve: [],
          confidenceBand: { low: 40, high: 70 },
        },
        hitPotential: {
          overall: 72,
          confidence: 80,
          verdict: "promising",
          breakdown: {
            beatFit: 70,
            lyricVirality: 68,
            trendAlignment: 60,
            hookStrength: 70,
          },
        },
        whatIf: { ...DEFAULT_WHAT_IF, marketingBudget: 1200 },
        contentFingerprint: "fp",
        analyzedAt: "2026-01-01T00:00:00.000Z",
      },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  activeVersionId: "v1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("version-intelligence", () => {
  it("prefers viral whatIf over launch", () => {
    const version = project.versions[0]!;
    expect(resolveCanonicalWhatIf(version).marketingBudget).toBe(1200);
  });

  it("uses viral hit score as canonical", () => {
    const version = project.versions[0]!;
    expect(resolveCanonicalHitScore(version)).toBe(72);
  });

  it("builds intelligence view", () => {
    const intel = buildVersionIntelligence(project);
    expect(intel?.canonicalHitScore).toBe(72);
    expect(intel?.canonicalProb1M).toBe(55);
  });
});