import { describe, expect, it } from "vitest";
import { buildCrowdGrounding, groundingModifiers } from "@/lib/viral/crowd-grounding";
import type { TrackAnalysis } from "@/types";

const analysis: TrackAnalysis = {
  track: { id: "1", title: "T", artist: "A", duration: 180, genre: "Pop" },
  lyrics: {
    verses: 1,
    chorusCount: 1,
    hookLine: "hook",
    hookStrength: 70,
    sentiment: "positive",
    themes: [],
    explicitScore: 0,
    wordCount: 50,
    repetitionIndex: 0.4,
  },
  hitPotential: {
    overall: 70,
    confidence: 80,
    verdict: "promising",
    breakdown: {
      beatFit: 70,
      lyricVirality: 65,
      trendAlignment: 60,
      hookStrength: 70,
    },
  },
  simulation: {
    targetPlays: 1_000_000,
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
    waveform: Array(80).fill(0.5),
    productionQuality: 64,
    vocalScore: 71,
  },
  recommendations: [],
  streaming: {
    available: true,
    status: "ok",
    totalStreams: 10000,
    totalPlaylists: 5,
    editorialPlaylists: 1,
    shazams: 100,
    tiktokCreates: 2000,
    chartPosition: null,
    velocityScore: 120,
    platforms: [],
  },
  meta: {
    lyricsLanguage: "en",
    poweredByMusixmatch: false,
    demoMode: false,
    cyaniteStatus: "finished",
    songstatsStatus: "ok",
    partners: ["Songstats"],
  },
};

describe("crowd-grounding", () => {
  it("reads velocity from streaming insights", () => {
    const signals = buildCrowdGrounding(analysis);
    expect(signals.velocityScore).toBe(120);
    expect(signals.tiktokCreates).toBe(2000);
    expect(signals.source).toContain("songstats");
  });

  it("boosts share bias with tiktok signal", () => {
    const signals = buildCrowdGrounding(analysis);
    const mods = groundingModifiers(signals);
    expect(mods.shareBias).toBeGreaterThan(0);
  });
});