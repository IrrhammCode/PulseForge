import { describe, expect, it } from "vitest";
import { buildReleaseHistory } from "@/lib/scoring/release-history";
import type { StudioProject } from "@/types/studio";
import { EMPTY_LYRICS } from "@/types/studio";

function project(
  id: string,
  title: string,
  hit: number,
  prob: number,
  analyzedAt: string
): StudioProject {
  return {
    id,
    title,
    artistName: "Nova Ray",
    genre: "Pop",
    mood: "Energetic",
    status: "crafting",
    versions: [
      {
        id: "v1",
        label: "v1",
        lyrics: EMPTY_LYRICS,
        viral: {
          hitPotential: {
            overall: hit,
            confidence: 80,
            verdict: "promising",
            breakdown: {
              beatFit: hit,
              lyricVirality: hit,
              trendAlignment: hit,
              hookStrength: hit,
            },
          },
          monteCarlo: {
            targetPlays: 1_000_000,
            probabilityToReach: prob,
            medianWeeks: 10,
            projectedPeak: 900_000,
            curve: [],
          },
          analyzedAt,
        } as unknown as StudioProject["versions"][0]["viral"],
        createdAt: analyzedAt,
        updatedAt: analyzedAt,
      },
    ],
    activeVersionId: "v1",
    createdAt: analyzedAt,
    updatedAt: analyzedAt,
  };
}

describe("release history", () => {
  it("marks first release when no prior data", () => {
    const current: StudioProject = {
      ...project("p-new", "New Song", 60, 40, "2026-06-01T00:00:00.000Z"),
      id: "p-new",
    };
    const hist = buildReleaseHistory(current, [current]);
    expect(hist.trajectory).toBe("first-release");
    expect(hist.available).toBe(false);
  });

  it("detects improving trajectory across prior projects", () => {
    const p1 = project("p1", "Old", 52, 28, "2026-01-01T00:00:00.000Z");
    const p2 = project("p2", "Mid", 61, 38, "2026-02-01T00:00:00.000Z");
    const p3 = project("p3", "Recent", 72, 48, "2026-04-01T00:00:00.000Z");
    const current = project("p4", "Now", 75, 50, "2026-06-01T00:00:00.000Z");
    const hist = buildReleaseHistory(current, [p1, p2, p3, current]);
    expect(hist.available).toBe(true);
    expect(hist.priorReleases).toBe(3);
    expect(hist.trajectory).toBe("improving");
    expect(hist.historyBoost).toBeGreaterThan(0);
  });
});