import type {
  ArtistMomentumInsights,
  CatalogBenchmark,
  ReleaseHistoryInsights,
  SeasonalContext,
  StreamingInsights,
  TrackAnalysis,
  TrendFeedSnapshot,
  VelocityHistoryInsights,
  WhatIfParams,
} from "@/types";
import type { AppTrack } from "@/lib/musixmatch/client";
import type { MxmAnalysisRaw, MxmLyricsRaw } from "@/lib/musixmatch/types";
import type { RichsyncParseResult } from "@/lib/musixmatch/richsync-parser";
import { catalogSimulationBoost } from "@/lib/musixmatch/catalog-intelligence";
import { attachSectionInsights } from "@/lib/musixmatch/section-intelligence";
import { buildImportLyrics } from "@/lib/studio/catalog-import";
import { parseLyricsSections } from "@/lib/studio/lyrics";
import type { CyaniteAnalysis } from "@/lib/cyanite/client";
import type { SongstatsInsights } from "@/lib/songstats/client";
import { analyzeLyrics } from "./lyrics-analyzer";
import { computeHitPotential } from "./hit-potential";
import { runMonteCarloSimulation } from "./simulation";
import { generateRecommendations } from "./recommendations";
import {
  adjustHitPotentialWithPartners,
  buildEnergyFromCyanite,
  simulationBoostFromSongstats,
} from "./partners";
import { DEFAULT_WHAT_IF } from "@/lib/constants";
import {
  adjustBeatFitWithBeatDrop,
  enrichEnergyWithBeatDrop,
} from "@/lib/viral/audio-signals";
import {
  adjustHitPotentialWithArtistMomentum,
  artistMomentumSimulationBoost,
} from "@/lib/songstats/artist-momentum";
import {
  adjustHitPotentialWithHistoricVelocity,
  historicVelocitySimulationBoost,
} from "@/lib/songstats/historic-velocity";
import {
  adjustHitPotentialWithContext,
  contextualSimulationBoost,
} from "@/lib/scoring/contextual-signals";
import { evaluateSeasonalContext } from "@/lib/trends/seasonal-calendar";
import { computeProductionQuality, computeVocalScore } from "./production-quality";

export interface AnalysisInput {
  track: AppTrack;
  lyrics: MxmLyricsRaw;
  mxmAnalysis?: MxmAnalysisRaw | null;
  richsync?: RichsyncParseResult | null;
  catalogBenchmark?: CatalogBenchmark;
  cyanite?: CyaniteAnalysis;
  songstats?: SongstatsInsights;
  velocityHistory?: VelocityHistoryInsights;
  artistMomentum?: ArtistMomentumInsights;
  trendFeed?: TrendFeedSnapshot;
  seasonalContext?: SeasonalContext;
  releaseHistory?: ReleaseHistoryInsights;
  releaseDate?: string;
  whatIf?: Partial<WhatIfParams>;
}

function toStreamingInsights(songstats: SongstatsInsights): StreamingInsights {
  if (songstats.status === "not_found") {
    return {
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
    };
  }

  return {
    available: songstats.available,
    status: songstats.status === "ok" ? "ok" : songstats.status,
    totalStreams: songstats.totalStreams,
    totalPlaylists: songstats.totalPlaylists,
    editorialPlaylists: songstats.editorialPlaylists,
    shazams: songstats.shazams,
    tiktokCreates: songstats.tiktokCreates,
    chartPosition: songstats.chartPosition,
    velocityScore: songstats.velocityScore,
    platforms: songstats.platforms,
  };
}

function buildMeta(
  input: AnalysisInput,
  cyanite: CyaniteAnalysis,
  songstats: SongstatsInsights
): TrackAnalysis["meta"] {
  const partners = ["Musixmatch"];
  if (cyanite.available || cyanite.status === "processing") partners.push("Cyanite");
  if (songstats.available || songstats.status === "ok") partners.push("Songstats");

  const hookQuote = input.mxmAnalysis?.themes?.main_themes?.[0]?.quotes?.[0];

  return {
    lyricsLanguage: input.lyrics.lyrics_language,
    poweredByMusixmatch: true,
    hasRichsync: input.track.hasRichsync,
    hasAnalysis: input.track.hasAnalysis,
    cyaniteStatus: cyanite.status,
    songstatsStatus: songstats.status,
    partners,
    mxmCoach: input.mxmAnalysis
      ? {
          moods: input.mxmAnalysis.moods?.main_moods?.slice(0, 4),
          themes: input.mxmAnalysis.themes?.main_themes?.map((t) => t.theme).slice(0, 4),
          audienceRating: input.mxmAnalysis.rating?.audience,
          hookQuote: hookQuote?.replace(/^"|"$/g, ""),
        }
      : undefined,
  };
}

export function runAnalysis(input: AnalysisInput): TrackAnalysis {
  const whatIf: WhatIfParams = { ...DEFAULT_WHAT_IF, ...input.whatIf };
  const cyanite = input.cyanite ?? {
    available: false,
    status: "unavailable" as const,
    moodTags: [],
    genreTags: [],
    movementTags: [],
    instrumentTags: [],
    segmentEnergy: [],
  };
  const songstats = input.songstats ?? {
    available: false,
    status: "unavailable" as const,
    totalStreams: 0,
    totalPlaylists: 0,
    editorialPlaylists: 0,
    shazams: 0,
    tiktokCreates: 0,
    chartPosition: null,
    velocityScore: 0,
    platforms: [],
  };

  const seasonalSeed =
    input.seasonalContext ??
    evaluateSeasonalContext({
      releaseDate: input.releaseDate,
      genre: input.track.genre,
    });
  const mergedTrendKeywords = [
    ...(input.trendFeed?.keywords ?? []),
    ...seasonalSeed.seasonalKeywords,
  ];

  let lyrics = analyzeLyrics(
    input.lyrics.lyrics_body,
    input.mxmAnalysis,
    input.lyrics.explicit === 1 || input.track.explicit,
    input.richsync,
    { liveTrendKeywords: mergedTrendKeywords }
  );

  const parsedSections = parseLyricsSections(input.lyrics.lyrics_body);
  lyrics = attachSectionInsights(lyrics, parsedSections, input.mxmAnalysis);

  let hitPotential = computeHitPotential({
    track: input.track,
    lyrics,
    mxmAnalysis: input.mxmAnalysis,
  });

  if (input.velocityHistory?.available) {
    hitPotential = adjustHitPotentialWithHistoricVelocity(hitPotential, input.velocityHistory);
  }
  if (input.artistMomentum?.available) {
    hitPotential = adjustHitPotentialWithArtistMomentum(hitPotential, input.artistMomentum);
  }

  const seasonalContext = evaluateSeasonalContext({
    releaseDate: input.releaseDate,
    genre: input.track.genre,
    lyricsThemes: lyrics.themes,
  });
  hitPotential = adjustHitPotentialWithContext(
    hitPotential,
    seasonalContext,
    input.releaseHistory
  );

  let energy = buildEnergyFromCyanite(input.track, lyrics, cyanite);
  energy = enrichEnergyWithBeatDrop(energy, input.track.duration || 210);

  // Ensure productionQuality + vocalScore are always present (first-class 2026 signals)
  if (energy.productionQuality == null || energy.vocalScore == null) {
    const prod = computeProductionQuality({
      waveform: energy.waveform,
      loudness: energy.loudness,
      energyDynamics: energy.energyDynamics,
      cyaniteAvailable: cyanite.available && cyanite.status === "finished",
    });
    const voc = computeVocalScore({
      instrumentTags: energy.instrumentTags,
      waveform: energy.waveform,
      energy: energy.energy,
      hookWindowSec: lyrics.hookWindowSec,
      hasStrongHook: lyrics.hookStrength >= 58,
    });
    energy = { ...energy, productionQuality: prod, vocalScore: voc };
  }

  hitPotential = adjustBeatFitWithBeatDrop(hitPotential, energy);

  // Re-apply partner (cyanite/songstats) + new production/vocal adjustments with final energy signals
  hitPotential = adjustHitPotentialWithPartners(
    hitPotential,
    songstats,
    cyanite,
    energy.productionQuality,
    energy.vocalScore
  );

  const trackSeed = parseInt(input.track.id, 10) || input.track.title.length * 97;
  const partnerBoost =
    simulationBoostFromSongstats(songstats) +
    historicVelocitySimulationBoost(input.velocityHistory) +
    catalogSimulationBoost(input.catalogBenchmark) +
    artistMomentumSimulationBoost(input.artistMomentum) +
    contextualSimulationBoost(seasonalContext, input.releaseHistory);
  const simulation = runMonteCarloSimulation(
    hitPotential.overall,
    trackSeed,
    whatIf,
    200,
    partnerBoost
  );

  const streaming = toStreamingInsights(songstats);

  const recommendations = generateRecommendations(
    input.track,
    lyrics,
    hitPotential,
    whatIf,
    streaming,
    energy,
    input.velocityHistory,
    input.artistMomentum,
    input.trendFeed,
    seasonalContext,
    input.releaseHistory,
    undefined // gaps provided in viral layer for gap-driven actions
  );

  return {
    track: {
      id: input.track.id,
      commontrackId: input.track.commontrackId,
      title: input.track.title,
      artist: input.track.artist,
      album: input.track.album,
      duration: input.track.duration,
      coverUrl: input.track.coverUrl,
      isrc: input.track.isrc,
      genre: input.track.genre,
      releaseYear: input.track.releaseYear,
      spotifyId: input.track.spotifyId,
    },
    lyrics,
    hitPotential,
    simulation,
    energy,
    streaming,
    velocityHistory: input.velocityHistory,
    recommendations,
    meta: buildMeta(input, cyanite, songstats),
    catalogBenchmark: input.catalogBenchmark,
    artistMomentum: input.artistMomentum,
    trendFeed: input.trendFeed,
    seasonalContext,
    releaseHistory: input.releaseHistory,
    importLyrics: buildImportLyrics(
      {
        track: {
          id: input.track.id,
          title: input.track.title,
          artist: input.track.artist,
          duration: input.track.duration,
        },
        lyrics,
      } as TrackAnalysis,
      input.lyrics.lyrics_body
    ),
  };
}

/** Re-run simulation + score adjustments for What-If without re-fetching lyrics */
export function rerunWhatIf(
  analysis: TrackAnalysis,
  track: AppTrack,
  whatIf: WhatIfParams
): TrackAnalysis {
  let hitPotential = computeHitPotential({
    track,
    lyrics: analysis.lyrics,
    mxmAnalysis: null,
  });

  if (analysis.streaming) {
    const songstatsLike = {
      available: analysis.streaming.available,
      status: analysis.streaming.status === "pre_release" ? "not_found" as const : "ok" as const,
      totalStreams: analysis.streaming.totalStreams,
      totalPlaylists: analysis.streaming.totalPlaylists,
      editorialPlaylists: analysis.streaming.editorialPlaylists,
      shazams: analysis.streaming.shazams,
      tiktokCreates: analysis.streaming.tiktokCreates,
      chartPosition: analysis.streaming.chartPosition,
      velocityScore: analysis.streaming.velocityScore,
      platforms: analysis.streaming.platforms,
    };
    const cyaniteLike = {
      available: analysis.energy.source === "cyanite",
      status: analysis.energy.source === "cyanite-processing" ? "processing" as const : analysis.energy.source === "cyanite" ? "finished" as const : "unavailable" as const,
      moodTags: analysis.energy.moodTags ?? [],
      genreTags: analysis.energy.genreTags ?? [],
      movementTags: analysis.energy.movementTags ?? [],
      instrumentTags: analysis.energy.instrumentTags ?? [],
      segmentEnergy: analysis.energy.waveform,
      energyLevel: analysis.energy.energyLevel,
    };
    hitPotential = adjustHitPotentialWithPartners(
      hitPotential,
      songstatsLike,
      cyaniteLike,
      analysis.energy.productionQuality,
      analysis.energy.vocalScore
    );
  }

  const budgetBoost = Math.round((whatIf.marketingBudget / 5000) * 4);
  const playlistBoost = Math.round((whatIf.playlistPitchCount / 20) * 3);
  const tiktokBoost = Math.round((whatIf.tiktokSeedPosts / 15) * 3);
  const timingBoost = whatIf.releaseTiming === "friday" ? 2 : 0;
  const boostedOverall = Math.min(
    96,
    hitPotential.overall + budgetBoost + playlistBoost + tiktokBoost + timingBoost
  );

  const adjustedHitPotential = {
    ...hitPotential,
    overall: boostedOverall,
    verdict:
      boostedOverall >= 78 ? "strong" as const :
      boostedOverall >= 62 ? "promising" as const : "needs-work" as const,
  };

  const trackSeed = parseInt(track.id, 10) || 42;
  const partnerBoost = analysis.streaming?.available
    ? simulationBoostFromSongstats({
        available: true,
        status: "ok",
        totalStreams: analysis.streaming.totalStreams,
        totalPlaylists: analysis.streaming.totalPlaylists,
        editorialPlaylists: analysis.streaming.editorialPlaylists,
        shazams: analysis.streaming.shazams,
        tiktokCreates: analysis.streaming.tiktokCreates,
        chartPosition: analysis.streaming.chartPosition,
        velocityScore: analysis.streaming.velocityScore,
        platforms: analysis.streaming.platforms,
      })
    : 0;

  const simulation = runMonteCarloSimulation(
    boostedOverall,
    trackSeed,
    whatIf,
    200,
    partnerBoost
  );

  return {
    ...analysis,
    hitPotential: adjustedHitPotential,
    simulation,
    recommendations: generateRecommendations(
      track,
      analysis.lyrics,
      adjustedHitPotential,
      whatIf,
      analysis.streaming,
      analysis.energy,
      analysis.velocityHistory,
      analysis.artistMomentum,
      analysis.trendFeed,
      analysis.seasonalContext,
      analysis.releaseHistory,
      undefined
    ),
  };
}