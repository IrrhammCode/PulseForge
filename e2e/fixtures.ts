export const E2E_VIRAL_PROJECT_ID = "e2e-viral-p1";
const VERSION_ID = "e2e-v1";
const TIMESTAMP = "2026-06-16T10:00:00.000Z";

/** Project with persisted viral snapshot for timeline E2E. */
export function buildViralTimelineProject() {
  return {
    id: E2E_VIRAL_PROJECT_ID,
    title: "E2E Viral Track",
    artistName: "Test Artist",
    genre: "Pop",
    mood: "Energetic",
    status: "crafting",
    versions: [
      {
        id: VERSION_ID,
        label: "v1",
        lyrics: {
          verse1: "Line one",
          verse2: "",
          chorus: "Hook for viral sim",
          bridge: "",
          raw: "",
        },
        timelineEdits: {
          sections: [],
          playheadPercent: 35,
          updatedAt: TIMESTAMP,
        },
        viral: {
          readiness: {
            score: 72,
            verdict: "near-viral",
            headline: "Near viral",
            subline: "Polish hook",
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
            playheadPercent: 35,
            gapCount: 0,
          },
          monteCarlo: {
            targetPlays: 1_000_000,
            probabilityToReach: 55,
            medianWeeks: 12,
            projectedPeak: 800_000,
            curve: [{ week: 1, plays: 10_000, lower: 5000, upper: 20_000 }],
          },
          hitPotential: {
            overall: 72,
            confidence: 80,
            verdict: "promising",
            breakdown: {
              beatFit: 70,
              lyricVirality: 68,
              trendAlignment: 65,
              hookStrength: 74,
            },
          },
          whatIf: {
            marketingBudget: 500,
            playlistPitchCount: 5,
            tiktokSeedPosts: 3,
            releaseTiming: "friday",
          },
          contentFingerprint: "e2e-fp-stable",
          analyzedAt: TIMESTAMP,
        },
        createdAt: TIMESTAMP,
        updatedAt: TIMESTAMP,
      },
    ],
    activeVersionId: VERSION_ID,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
  };
}