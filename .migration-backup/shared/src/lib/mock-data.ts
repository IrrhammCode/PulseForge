import type { Track, TrackAnalysis, WhatIfParams } from "@/types";
import { DEFAULT_WHAT_IF } from "@/lib/constants";

export { DEFAULT_WHAT_IF };

export const MOCK_TRACKS: Track[] = [
  {
    id: "1",
    title: "Midnight Pulse",
    artist: "Nova Ray",
    album: "Neon Horizons",
    duration: 214,
    genre: "Synth Pop",
    releaseYear: 2026,
  },
  {
    id: "2",
    title: "Echoes in the Rain",
    artist: "Luna Vale",
    album: "Silver Static",
    duration: 198,
    genre: "Indie Pop",
    releaseYear: 2025,
  },
  {
    id: "3",
    title: "Run the Night",
    artist: "Kai Meridian",
    album: "Velocity",
    duration: 187,
    genre: "Dance Pop",
    releaseYear: 2026,
  },
];

function generateWaveform(seed: number, length = 80): number[] {
  const wave: number[] = [];
  for (let i = 0; i < length; i++) {
    const t = i / length;
    wave.push(
      Math.abs(
        Math.sin(t * Math.PI * 4 + seed) * 0.6 +
          Math.sin(t * Math.PI * 12 + seed * 2) * 0.3 +
          Math.random() * 0.15
      )
    );
  }
  return wave;
}

function generateSimulationCurve(
  baseProbability: number,
  params?: Partial<WhatIfParams>
): TrackAnalysis["simulation"] {
  const budgetBoost = (params?.marketingBudget ?? 500) / 2000;
  const playlistBoost = (params?.playlistPitchCount ?? 5) / 20;
  const tiktokBoost = (params?.tiktokSeedPosts ?? 3) / 15;
  const timingBoost = params?.releaseTiming === "friday" ? 0.08 : 0;

  const probability = Math.min(
    0.92,
    baseProbability + budgetBoost * 0.15 + playlistBoost * 0.12 + tiktokBoost * 0.1 + timingBoost
  );

  const curve = Array.from({ length: 16 }, (_, week) => {
    const growth = 1 - Math.exp(-week * 0.35);
    const noise = 0.85 + Math.sin(week * 0.8) * 0.1;
    const plays = Math.round(growth * noise * 1_200_000 * probability);
    const spread = plays * (0.15 + week * 0.02);
    return {
      week,
      plays,
      lower: Math.round(plays - spread),
      upper: Math.round(plays + spread * 1.2),
    };
  });

  return {
    targetPlays: 1_000_000,
    probabilityToReach: Math.round(probability * 100),
    medianWeeks: Math.round(10 - probability * 4),
    projectedPeak: curve[curve.length - 1].upper,
    curve,
  };
}

export function getMockAnalysis(
  track: Track,
  whatIf?: Partial<WhatIfParams>
): TrackAnalysis {
  const seed = track.title.length + track.artist.length;

  const baseScores = {
    "1": { overall: 78, beatFit: 82, lyricVirality: 74, trendAlignment: 79, hook: 81 },
    "2": { overall: 71, beatFit: 68, lyricVirality: 79, trendAlignment: 65, hook: 76 },
    "3": { overall: 84, beatFit: 88, lyricVirality: 80, trendAlignment: 85, hook: 83 },
  }[track.id] ?? {
    overall: 72,
    beatFit: 70,
    lyricVirality: 72,
    trendAlignment: 70,
    hook: 74,
  };

  const paramBoost =
    ((whatIf?.marketingBudget ?? 500) / 5000) * 4 +
    ((whatIf?.playlistPitchCount ?? 5) / 20) * 3 +
    ((whatIf?.tiktokSeedPosts ?? 3) / 15) * 4;

  const overall = Math.min(95, Math.round(baseScores.overall + paramBoost));

  const lyricsByTrack: Record<string, TrackAnalysis["lyrics"]> = {
    "1": {
      verses: 2,
      chorusCount: 3,
      hookLine: "Feel the midnight pulse — we never slow down",
      hookStrength: baseScores.hook,
      sentiment: "energetic",
      themes: ["nightlife", "momentum", "connection"],
      explicitScore: 0,
      wordCount: 342,
      repetitionIndex: 68,
      chorusWordCount: 9,
      chorusSimplicity: 79,
    },
    "2": {
      verses: 3,
      chorusCount: 2,
      hookLine: "Echoes in the rain, calling out your name",
      hookStrength: baseScores.hook,
      sentiment: "melancholic",
      themes: ["longing", "memory", "intimacy"],
      explicitScore: 0,
      wordCount: 298,
      repetitionIndex: 54,
      chorusWordCount: 11,
      chorusSimplicity: 61,
    },
    "3": {
      verses: 2,
      chorusCount: 4,
      hookLine: "Run the night, don't look back now",
      hookStrength: baseScores.hook,
      sentiment: "energetic",
      themes: ["freedom", "party", "confidence"],
      explicitScore: 5,
      wordCount: 256,
      repetitionIndex: 72,
      chorusWordCount: 7,
      chorusSimplicity: 84,
    },
  };

  const energyByTrack: Record<string, TrackAnalysis["energy"]> = {
    "1": {
      bpm: 124,
      energy: 0.82,
      danceability: 0.78,
      valence: 0.71,
      loudness: -5.2,
      waveform: generateWaveform(seed, 80),
      productionQuality: 81,
      vocalScore: 78,
    },
    "2": {
      bpm: 98,
      energy: 0.58,
      danceability: 0.52,
      valence: 0.44,
      loudness: -7.8,
      waveform: generateWaveform(seed + 1, 80),
      productionQuality: 54,
      vocalScore: 41,
    },
    "3": {
      bpm: 128,
      energy: 0.91,
      danceability: 0.86,
      valence: 0.83,
      loudness: -4.1,
      waveform: generateWaveform(seed + 2, 80),
      productionQuality: 87,
      vocalScore: 84,
    },
  };

  const verdict: TrackAnalysis["hitPotential"]["verdict"] =
    overall >= 80 ? "strong" : overall >= 65 ? "promising" : "needs-work";

  return {
    track,
    lyrics: lyricsByTrack[track.id] ?? lyricsByTrack["1"],
    hitPotential: {
      overall,
      breakdown: {
        beatFit: baseScores.beatFit,
        lyricVirality: baseScores.lyricVirality,
        trendAlignment: baseScores.trendAlignment,
        hookStrength: baseScores.hook,
      },
      confidence: 78,
      verdict,
    },
    simulation: generateSimulationCurve(overall / 100, whatIf),
    energy: energyByTrack[track.id] ?? energyByTrack["1"],
    streaming: {
      available: false,
      status: "pre_release" as const,
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
      poweredByMusixmatch: true,
      partners: ["Musixmatch"],
      demoMode: true,
    },
    recommendations: [
      {
        id: "r1",
        title: "Seed TikTok with hook-first clips",
        description:
          `Lead with "${lyricsByTrack[track.id]?.hookLine ?? "your hook"}" in the first 2 seconds. Post 3 variations targeting ${track.genre?.toLowerCase() ?? "pop"} creators.`,
        priority: "high",
        category: "social",
        impactEstimate: 18,
      },
      {
        id: "r2",
        title: "Pitch to New Music Friday playlists",
        description:
          "Target 8 editorial and 12 independent curators. Emphasize BPM and energy match for workout/mood playlists.",
        priority: "high",
        category: "playlist",
        impactEstimate: 22,
      },
      {
        id: "r3",
        title: "Release on Friday 00:00 local",
        description:
          "Friday drops align with weekend discovery cycles. Pair with a 15-second visualizer asset for pre-save campaigns.",
        priority: "medium",
        category: "timing",
        impactEstimate: 12,
      },
      {
        id: "r4",
        title: "Create lyric quote cards",
        description:
          "Export 4 branded quote cards from your strongest hook lines for Instagram Stories and Pinterest.",
        priority: "medium",
        category: "content",
        impactEstimate: 9,
      },
      {
        id: "r5",
        title: "Collaborate with micro-influencers",
        description:
          "Partner with 5 creators (10K–50K followers) in your genre for duet/stitch campaigns in week 1 post-release.",
        priority: "low",
        category: "social",
        impactEstimate: 14,
      },
    ],
  };
}

