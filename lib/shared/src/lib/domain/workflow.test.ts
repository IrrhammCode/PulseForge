import { describe, expect, it } from "vitest";
import {
  computeWorkflowTransition,
  detectViralStaleness,
  getAllowedTransitions,
} from "@/lib/domain/workflow";
import type { StudioProject } from "@/types/studio";
import { EMPTY_LYRICS } from "@/types/studio";

const baseProject: StudioProject = {
  id: "p1",
  title: "Test",
  artistName: "Artist",
  genre: "Pop",
  mood: "Energetic",
  status: "draft",
  versions: [
    {
      id: "v1",
      label: "v1",
      lyrics: { ...EMPTY_LYRICS, chorus: "hook line here now" },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      viral: {
        readiness: {
          score: 70,
          verdict: "near-viral",
          headline: "Near",
          subline: "Fix gaps",
        },
        gaps: [],
        crowd: {
          aggregates: {
            fullListenRate: 40,
            skipHookRate: 10,
            saveRate: 5,
            shareRate: 3,
            playlistAddRate: 2,
            avgListenSec: 120,
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
          sampleSize: 2400,
        },
        timeline: {
          durationSec: 180,
          bpm: 120,
          lanes: [],
          playheadPercent: 30,
          gapCount: 0,
        },
        monteCarlo: {
          probabilityToReach: 55,
          medianWeeks: 12,
          projectedPeak: 800_000,
          curve: [],
          confidenceBand: { low: 40, high: 70 },
        },
        hitPotential: {
          overall: 70,
          confidence: 80,
          verdict: "promising",
          breakdown: {
            beatFit: 70,
            lyricVirality: 65,
            trendAlignment: 60,
            hookStrength: 72,
          },
        },
        whatIf: {
          marketingBudget: 500,
          playlistPitchCount: 5,
          tiktokSeedPosts: 3,
          releaseTiming: "friday",
        },
        contentFingerprint: "old-fp",
        analyzedAt: "2026-01-01T00:00:00.000Z",
      },
      viralStale: true,
      viralStaleReason: "lyrics_changed",
    },
  ],
  activeVersionId: "v1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("workflow", () => {
  it("detects viral staleness from flag", () => {
    const version = baseProject.versions[0]!;
    const result = detectViralStaleness(version, baseProject);
    expect(result.stale).toBe(true);
    expect(result.reason).toBe("lyrics_changed");
  });

  it("detects viral staleness after timeline edit", () => {
    const version = {
      ...baseProject.versions[0]!,
      viralStale: true,
      viralStaleReason: "timeline_edited" as const,
    };
    const result = detectViralStaleness(version, baseProject);
    expect(result.stale).toBe(true);
    expect(result.reason).toBe("timeline_edited");
  });

  it("lists allowed transitions from draft", () => {
    expect(getAllowedTransitions("draft")).toContain("crafting");
  });

  it("records workflow transition when status changes", () => {
    const next: StudioProject = { ...baseProject, status: "crafting" };
    const transition = computeWorkflowTransition(baseProject, next);
    expect(transition?.from).toBe("draft");
    expect(transition?.to).toBe("crafting");
  });
});