import type {
  ArtistMomentumInsights,
  CatalogBenchmark,
  TrackAnalysis,
  ReleaseHistoryInsights,
  TrendFeedSnapshot,
  VelocityHistoryInsights,
  WhatIfParams,
} from "@/types";
import type { AppTrack } from "@/lib/musixmatch/client";
import type { MxmAnalysisRaw, MxmLyricsRaw } from "@/lib/musixmatch/types";
import type { RichsyncParseResult } from "@/lib/musixmatch/richsync-parser";
import { catalogSimulationBoost } from "@/lib/musixmatch/catalog-intelligence";
import {
  adjustBeatFitWithBeatDrop,
  enrichEnergyWithBeatDrop,
} from "@/lib/viral/audio-signals";

import type { StudioProject } from "@/types/studio";
import type { AudioSignals, VersionSnapshot } from "@/lib/domain/types";
import { DEFAULT_WHAT_IF } from "@/lib/constants";
import { runAnalysis } from "./index";
import { composeLyricsBody } from "@/lib/studio/lyrics";
import { buildVersionSnapshot } from "@/lib/domain/version-snapshot";
import {
  adjustHitPotentialWithAudio,
  buildEnergyFromAudioSignals,
  resolveStudioDuration,
} from "@/lib/scoring/audio-signals";
import { getSystemCapabilities } from "@/lib/partners/capabilities";
import type { CyaniteAnalysis } from "@/lib/cyanite/client";
import type { SongstatsInsights } from "@/lib/songstats/client";
import {
  adjustHitPotentialWithPartners,
  buildEnergyFromCyanite,
  simulationBoostFromSongstats,
} from "@/lib/scoring/partners";

export interface StudioAnalysisInput {
  project: StudioProject;
  lyricsBody: string;
  versionId?: string;
  snapshot?: VersionSnapshot;
  whatIf?: Partial<WhatIfParams>;
  trackPatch?: Partial<AppTrack>;
  cyanite?: CyaniteAnalysis;
  songstats?: SongstatsInsights;
  velocityHistory?: VelocityHistoryInsights;
  mxmAnalysis?: MxmAnalysisRaw | null;
  richsync?: RichsyncParseResult | null;
  catalogBenchmark?: CatalogBenchmark;
  artistMomentum?: ArtistMomentumInsights;
  trendFeed?: TrendFeedSnapshot;
  releaseHistory?: ReleaseHistoryInsights;
  releaseDate?: string;
}

export function buildStudioTrack(
  project: StudioProject,
  audio?: AudioSignals
): AppTrack {
  const seed = project.id.replace(/-/g, "").slice(0, 8);
  const numericId = parseInt(seed, 16) || project.title.length * 97;

  return {
    id: String(numericId),
    commontrackId: String(numericId),
    title: project.title,
    artist: project.artistName,
    album: "Studio Draft",
    duration: resolveStudioDuration(audio, project.bpmTarget),
    coverUrl: undefined,
    isrc: undefined,
    genre: project.genre,
    releaseYear: new Date().getFullYear(),
    rating: undefined,
    explicit: false,
    hasRichsync: false,
    hasAnalysis: false,
    spotifyId: undefined,
  };
}

function buildStudioLyrics(body: string): MxmLyricsRaw {
  return {
    lyrics_id: 0,
    lyrics_body: body,
    lyrics_language: "en",
    explicit: 0,
  };
}

export function runStudioAnalysis(input: StudioAnalysisInput): TrackAnalysis {
  const snapshot =
    input.snapshot ??
    buildVersionSnapshot(input.project, input.versionId) ??
    undefined;

  const audio = snapshot?.audio;
  const baseTrack = buildStudioTrack(input.project, audio);
  const track = { ...baseTrack, ...input.trackPatch };
  const lyrics = buildStudioLyrics(input.lyricsBody);
  const caps = getSystemCapabilities();

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

  const analysis = runAnalysis({
    track,
    lyrics,
    mxmAnalysis: input.mxmAnalysis ?? null,
    richsync: input.richsync ?? null,
    catalogBenchmark: input.catalogBenchmark,
    artistMomentum: input.artistMomentum,
    trendFeed: input.trendFeed,
    releaseHistory: input.releaseHistory,
    releaseDate: input.releaseDate,
    cyanite,
    songstats,
    velocityHistory: input.velocityHistory,
    whatIf: { ...DEFAULT_WHAT_IF, ...input.whatIf },
  });

  let energy = buildEnergyFromAudioSignals(analysis.energy, audio, input.project.bpmTarget);
  if (cyanite.available && cyanite.status === "finished") {
    energy = buildEnergyFromCyanite(track, analysis.lyrics, cyanite);
  }
  energy = enrichEnergyWithBeatDrop(energy, track.duration);

  let hitPotential = adjustHitPotentialWithAudio(
    analysis.hitPotential,
    audio,
    input.project.bpmTarget
  );
  if (cyanite.available || songstats.available) {
    hitPotential = adjustHitPotentialWithPartners(
      hitPotential,
      songstats,
      cyanite,
      energy.productionQuality,
      energy.vocalScore
    );
  }
  hitPotential = adjustBeatFitWithBeatDrop(hitPotential, energy);

  const catalogBoost = catalogSimulationBoost(input.catalogBenchmark);
  const simBoost = simulationBoostFromSongstats(songstats) + catalogBoost;
  const simulation = {
    ...analysis.simulation,
    probabilityToReach: Math.min(
      98,
      Math.round(analysis.simulation.probabilityToReach + simBoost * 100)
    ),
  };

  const partners = ["PulseForge Studio"];
  if (audio?.estimatedBpm) partners.push("Demo Audio");
  if (audio?.waveform?.length) partners.push("Waveform");
  if (cyanite.available) partners.push("Cyanite");
  if (songstats.available) partners.push("Songstats");
  if (track.hasRichsync || input.richsync) partners.push("Richsync");
  if (input.mxmAnalysis) partners.push("Musixmatch Analysis");
  if (input.catalogBenchmark?.similarTracks.length) partners.push("Catalog Benchmark");

  return {
    ...analysis,
    track: {
      ...analysis.track,
      title: input.project.title,
      artist: input.project.artistName,
      genre: input.project.genre,
      duration: track.duration,
      hasRichsync: track.hasRichsync,
      hasAnalysis: track.hasAnalysis,
    },
    hitPotential,
    energy,
    simulation,
    streaming: analysis.streaming,
    meta: {
      ...analysis.meta,
      lyricsLanguage: "en",
      poweredByMusixmatch: Boolean(
        track.hasRichsync || track.hasAnalysis || input.mxmAnalysis || input.richsync
      ),
      hasRichsync: Boolean(track.hasRichsync || input.richsync),
      hasAnalysis: Boolean(track.hasAnalysis || input.mxmAnalysis),
      demoMode: caps.demoMode,
      cyaniteStatus: cyanite.status,
      songstatsStatus: songstats.status,
      partners,
    },
    catalogBenchmark: input.catalogBenchmark ?? analysis.catalogBenchmark,
    artistMomentum: input.artistMomentum ?? analysis.artistMomentum,
    trendFeed: input.trendFeed ?? analysis.trendFeed,
    seasonalContext: analysis.seasonalContext,
    releaseHistory: input.releaseHistory ?? analysis.releaseHistory,
  };
}

export function lyricsBodyFromProject(project: StudioProject, versionId?: string): string {
  const version =
    project.versions.find((v) => v.id === (versionId ?? project.activeVersionId)) ??
    project.versions[0];
  if (!version) return "";
  return composeLyricsBody(version.lyrics);
}