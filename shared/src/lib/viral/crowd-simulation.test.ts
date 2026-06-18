import { describe, expect, it } from "vitest";
import { runCrowdSimulation } from "@/lib/viral/crowd-simulation";
import type { TrackAnalysis } from "@/types";

const analysis: TrackAnalysis = {
  track: { id: "1", title: "T", artist: "A", duration: 180, genre: "Pop" },
  lyrics: {
    verses: 2,
    chorusCount: 2,
    hookLine: "hook",
    hookStrength: 70,
    sentiment: "positive",
    themes: [],
    explicitScore: 0,
    wordCount: 100,
    repetitionIndex: 0.5,
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
  simulation: {
    probabilityToReach: 50,
    medianWeeks: 10,
    projectedPeak: 900_000,
    curve: [],
    confidenceBand: { low: 40, high: 60 },
  },
  energy: {
    bpm: 120,
    energy: 0.7,
    danceability: 0.6,
    valence: 0.5,
    loudness: -8,
    waveform: [],
    productionQuality: 64,
    vocalScore: 71,
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

describe("runCrowdSimulation", () => {
  it("scales sample to 1M population", () => {
    const crowd = runCrowdSimulation(analysis, 180, 42);
    expect(crowd.populationTarget).toBe(1_000_000);
    expect(crowd.scaled.reached).toBe(1_000_000);
    expect(crowd.aggregates.fullListenRate).toBeGreaterThan(0);
    expect(crowd.funnel.length).toBeGreaterThan(0);
  });

  it("is deterministic for the same seed", () => {
    const a = runCrowdSimulation(analysis, 180, 99);
    const b = runCrowdSimulation(analysis, 180, 99);
    expect(a.aggregates.skipHookRate).toBe(b.aggregates.skipHookRate);
  });

  it("increases skip rate when richsync hook arrives late", () => {
    const earlyHook = runCrowdSimulation(
      { ...analysis, lyrics: { ...analysis.lyrics, hookWindowSec: 12 } },
      180,
      77
    );
    const lateHook = runCrowdSimulation(
      { ...analysis, lyrics: { ...analysis.lyrics, hookWindowSec: 38 } },
      180,
      77
    );
    expect(lateHook.aggregates.skipHookRate).toBeGreaterThanOrEqual(
      earlyHook.aggregates.skipHookRate
    );
  });
});