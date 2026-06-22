import { describe, expect, it } from "vitest";
import { analyzeViralGaps } from "@/lib/viral/gap-analysis";
import { DEFAULT_WHAT_IF } from "@/lib/constants";
import type { TrackAnalysis } from "@/types";
import type { StudioProject } from "@/types/studio";
import { EMPTY_LYRICS, DEFAULT_STEMS } from "@/types/studio";
import type { CrowdSimulation } from "@/types/viral";

const crowd: CrowdSimulation = {
  populationTarget: 1_000_000,
  sampleSize: 100,
  seed: 1,
  personas: [],
  results: [],
  funnel: [],
  retentionCurve: [],
  aggregates: {
    fullListenRate: 40,
    skipHookRate: 20,
    saveRate: 5,
    shareRate: 3,
    playlistAddRate: 2,
    avgListenSec: 100,
    viralCoefficient: 0.3,
  },
  scaled: {
    reached: 1_000_000,
    fullListeners: 400_000,
    savers: 50_000,
    sharers: 30_000,
    playlistAdds: 20_000,
  },
};

const analysis: TrackAnalysis = {
  track: { id: "1", title: "T", artist: "A", duration: 200, genre: "Pop" },
  lyrics: {
    verses: 2,
    chorusCount: 2,
    hookLine: "short hook",
    hookStrength: 55,
    sentiment: "positive",
    themes: [],
    explicitScore: 0,
    wordCount: 120,
    repetitionIndex: 0.4,
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
  simulation: {
    targetPlays: 1_000_000,
    probabilityToReach: 40,
    medianWeeks: 14,
    projectedPeak: 500_000,
    curve: [],
    confidenceBand: { low: 30, high: 50 },
  },
  energy: {
    bpm: 120,
    energy: 0.6,
    danceability: 0.45,
    valence: 0.5,
    loudness: -8,
    waveform: [],
    productionQuality: 61,
    vocalScore: 58,
  },
  recommendations: [],
  streaming: {
    available: false,
    status: "pre_release",
    totalStreams: 0,
    totalPlaylists: 0,
    editorialPlaylists: 0,
    shazams: 0,
    tiktokCreates: 0,
    chartPosition: null,
    velocityScore: 0,
    platforms: [],
  },
  meta: {
    lyricsLanguage: "en",
    poweredByMusixmatch: false,
    demoMode: true,
    cyaniteStatus: "unavailable",
    songstatsStatus: "pre_release",
    partners: [],
  },
};

describe("analyzeViralGaps", () => {
  it("flags weak hook and stem imbalance", () => {
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
          lyrics: { ...EMPTY_LYRICS, chorus: "repeat hook now" },
          audio: {
            fileName: "demo.mp3",
            mimeType: "audio/mpeg",
            sizeBytes: 1000,
            durationSec: 200,
            uploadedAt: "2026-01-01T00:00:00.000Z",
            waveform: Array(80).fill(0.5),
            stemsReady: true,
            stems: DEFAULT_STEMS.map((s) => ({
              ...s,
              muted: s.id !== "drums",
              volume: s.id === "drums" ? 1.8 : 0.05,
            })),
          },
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      activeVersionId: "v1",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    const gaps = analyzeViralGaps(analysis, project, crowd, DEFAULT_WHAT_IF);
    expect(gaps.some((g) => g.id === "weak-hook")).toBe(true);
    expect(gaps.some((g) => g.id === "stem-imbalance")).toBe(true);
  });
});