import { describe, expect, it } from "vitest";
import { DEFAULT_STEMS, EMPTY_LYRICS } from "@/types/studio";
import type { StudioProject } from "@/types/studio";
import { migrateProjectsOnRead, SCHEMA_VERSION } from "@/lib/studio/storage-schema";

const TIMESTAMP = "2026-06-16T10:00:00.000Z";

function legacyProject(overrides?: Partial<StudioProject>): StudioProject {
  return {
    id: "p1",
    title: "Legacy",
    artistName: "Artist",
    genre: "Pop",
    mood: "Energetic",
    status: "draft",
    versions: [
      {
        id: "v1",
        label: "v1",
        lyrics: { ...EMPTY_LYRICS },
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    activeVersionId: "v1",
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  };
}

describe("storage-schema", () => {
  it("exposes the current schema version", () => {
    expect(SCHEMA_VERSION).toBe(3);
  });

  it("migrates legacy audio without stem metadata", () => {
    const raw = [
      legacyProject({
        versions: [
          {
            id: "v1",
            label: "v1",
            lyrics: { ...EMPTY_LYRICS },
            audio: {
              fileName: "demo.mp3",
              mimeType: "audio/mpeg",
              sizeBytes: 1024,
              durationSec: 120,
              uploadedAt: TIMESTAMP,
              waveform: [0.1, 0.2],
            } as StudioProject["versions"][number]["audio"],
            createdAt: TIMESTAMP,
            updatedAt: TIMESTAMP,
          },
        ],
      }),
    ];

    const { projects, migrated, fromVersion } = migrateProjectsOnRead(raw);

    expect(fromVersion).toBe(1);
    expect(migrated).toBe(true);
    expect(projects[0].versions[0].audio?.stemsReady).toBe(false);
    expect(projects[0].versions[0].audio?.stems).toEqual(DEFAULT_STEMS);
  });

  it("promotes viral timeline edits to first-class version fields", () => {
    const timelineEdits = {
      sections: [],
      playheadPercent: 42,
      updatedAt: TIMESTAMP,
    };
    const raw = {
      schemaVersion: 2,
      projects: [
        legacyProject({
          versions: [
            {
              id: "v1",
              label: "v1",
              lyrics: { ...EMPTY_LYRICS },
              viral: {
                readiness: {
                  score: 70,
                  verdict: "near-viral",
                  headline: "Near",
                  subline: "Polish",
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
                  playheadPercent: 42,
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
                whatIf: {
                  marketingBudget: 500,
                  playlistPitchCount: 5,
                  tiktokSeedPosts: 3,
                  releaseTiming: "friday",
                },
                timelineEdits,
                contentFingerprint: "fp",
                analyzedAt: TIMESTAMP,
              },
              createdAt: TIMESTAMP,
              updatedAt: TIMESTAMP,
            },
          ],
        }),
      ],
    };

    const { projects, migrated } = migrateProjectsOnRead(raw);

    expect(migrated).toBe(true);
    expect(projects[0].versions[0].timelineEdits).toEqual(timelineEdits);
    expect(projects[0].versions[0].viral?.timelineEdits).toEqual(timelineEdits);
  });

  it("returns empty projects for invalid payloads", () => {
    expect(migrateProjectsOnRead(null)).toEqual({
      projects: [],
      migrated: false,
      fromVersion: 0,
    });
  });
});