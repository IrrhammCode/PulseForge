import { describe, expect, it } from "vitest";
import { buildOrchestratorPlan } from "@/lib/domain/workflow-orchestrator";
import type { StudioProject } from "@/types/studio";
import { EMPTY_LYRICS } from "@/types/studio";
import { DEFAULT_WHAT_IF } from "@/lib/constants";

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
      lyrics: { ...EMPTY_LYRICS, chorus: "repeatable hook line" },
      launchPlan: {
        whatIf: { ...DEFAULT_WHAT_IF, marketingBudget: 500 },
        manualChecks: {},
      },
      viral: {
        readiness: {
          score: 60,
          verdict: "needs-work",
          headline: "Work",
          subline: "Fix",
        },
        gaps: [],
        crowd: {
          aggregates: {
            fullListenRate: 30,
            skipHookRate: 20,
            saveRate: 4,
            shareRate: 2,
            playlistAddRate: 1,
            avgListenSec: 80,
            viralCoefficient: 0.3,
          },
          scaled: {
            reached: 1_000_000,
            fullListeners: 300_000,
            savers: 40_000,
            sharers: 20_000,
            playlistAdds: 10_000,
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
          probabilityToReach: 40,
          medianWeeks: 14,
          projectedPeak: 500_000,
          curve: [],
          confidenceBand: { low: 30, high: 50 },
        },
        hitPotential: {
          overall: 60,
          confidence: 70,
          verdict: "promising",
          breakdown: {
            beatFit: 60,
            lyricVirality: 55,
            trendAlignment: 50,
            hookStrength: 55,
          },
        },
        whatIf: { ...DEFAULT_WHAT_IF, marketingBudget: 800 },
        contentFingerprint: "old",
        analyzedAt: "2026-01-01T00:00:00.000Z",
      },
      viralStale: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  activeVersionId: "v1",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("workflow-orchestrator", () => {
  it("includes sync_what_if when launch and viral diverge", () => {
    const plan = buildOrchestratorPlan(project);
    expect(plan?.tasks.some((t) => t.id === "sync_what_if")).toBe(true);
  });

  it("includes reviral when viral is stale", () => {
    const plan = buildOrchestratorPlan(project);
    expect(plan?.tasks.some((t) => t.id === "reviral")).toBe(true);
  });
});