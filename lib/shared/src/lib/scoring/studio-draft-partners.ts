import type { ArtistMomentumInsights, CatalogBenchmark, VelocityHistoryInsights } from "@/types";
import { getArtistMomentum } from "@/lib/songstats/artist-momentum";
import type { CyaniteAnalysis } from "@/lib/cyanite/client";
import type { SongstatsInsights } from "@/lib/songstats/client";
import type { StudioProject } from "@/types/studio";
import type { AudioSignals } from "@/lib/domain/types";
import {
  searchTracks,
  getTrackLyrics,
  mapTrackToApp,
  type AppTrack,
} from "@/lib/musixmatch/client";
import { hasMusixmatchKey } from "@/lib/musixmatch/client";
import { analyzeSpotifyTrack } from "@/lib/cyanite/client";
import { getTrackStats } from "@/lib/songstats/client";
import { getTrackHistoricVelocity } from "@/lib/songstats/historic-velocity";
import { fetchStudioPartnerSignals } from "@/lib/scoring/studio-partners";
import { buildStudioTrack } from "@/lib/scoring/studio-analysis";
import {
  EMPTY_CATALOG_BENCHMARK,
  fetchMxmIntelligenceForTrack,
} from "@/lib/musixmatch/studio-intelligence";
import type { MxmAnalysisRaw } from "@/lib/musixmatch/types";
import type { RichsyncParseResult } from "@/lib/musixmatch/richsync-parser";

export interface StudioDraftPartnerBundle {
  trackPatch: Partial<AppTrack>;
  cyanite: CyaniteAnalysis;
  songstats: SongstatsInsights;
  velocityHistory: VelocityHistoryInsights;
  mxmAnalysis: MxmAnalysisRaw | null;
  richsync: RichsyncParseResult | null;
  catalogBenchmark: CatalogBenchmark;
  artistMomentum: ArtistMomentumInsights;
  matchedCatalog?: AppTrack;
  lyricsBody?: string;
}

/** Waveform-derived proxy when Cyanite file/Spotify path unavailable. */
function waveformCyaniteProxy(audio?: AudioSignals): CyaniteAnalysis {
  if (!audio?.waveform?.length) {
    return {
      available: false,
      status: "unavailable",
      moodTags: [],
      genreTags: [],
      movementTags: [],
      instrumentTags: [],
      segmentEnergy: [],
    };
  }

  const peaks = audio.waveform;
  const avg = peaks.reduce((a, b) => a + b, 0) / peaks.length;
  const energy = avg > 0.6 ? "high" : avg > 0.35 ? "medium" : "low";

  return {
    available: true,
    status: "finished",
    moodTags: energy === "high" ? ["energetic"] : ["chill"],
    genreTags: [],
    movementTags: audio.estimatedBpm && audio.estimatedBpm > 110 ? ["danceable"] : [],
    instrumentTags: audio.stemsReady ? ["vocals", "drums"] : [],
    segmentEnergy: peaks.slice(0, 80),
    bpm: audio.estimatedBpm,
    energyLevel: energy,
    arousal: energy === "high" ? 0.4 : energy === "medium" ? 0.1 : -0.2,
  };
}

async function matchCatalogTrack(project: StudioProject): Promise<AppTrack | null> {
  if (!hasMusixmatchKey()) return null;
  try {
    const query = `${project.title} ${project.artistName}`.trim();
    const results = await searchTracks(query, 5);
    const hit = results.find(
      (t) =>
        t.track_name.toLowerCase().includes(project.title.toLowerCase().slice(0, 8)) ||
        t.artist_name.toLowerCase().includes(project.artistName.toLowerCase().slice(0, 6))
    );
    if (!hit) return null;
    return mapTrackToApp(hit);
  } catch {
    return null;
  }
}

export async function fetchStudioDraftPartners(
  project: StudioProject,
  versionId?: string,
  audio?: AudioSignals
): Promise<StudioDraftPartnerBundle> {
  const version =
    project.versions.find((v) => v.id === (versionId ?? project.activeVersionId)) ??
    project.versions[0];

  if (version?.catalogMeta?.spotifyId || version?.importedFromTrackId) {
    const track = buildStudioTrack(project, audio);
    const catalog = await fetchStudioPartnerSignals(project, track, versionId);
    const mxmTrack: AppTrack = {
      ...track,
      ...catalog.trackPatch,
      id: version.catalogMeta?.mxmTrackId ?? version.importedFromTrackId ?? track.id,
      commontrackId: version.catalogMeta?.commontrackId ?? track.commontrackId,
      hasRichsync: version.catalogMeta?.hasRichsync ?? catalog.trackPatch.hasRichsync ?? false,
      hasAnalysis: version.catalogMeta?.hasAnalysis ?? catalog.trackPatch.hasAnalysis ?? false,
      spotifyId: version.catalogMeta?.spotifyId ?? catalog.trackPatch.spotifyId,
      isrc: version.catalogMeta?.isrc ?? track.isrc,
      releaseYear: version.catalogMeta?.releaseYear ?? track.releaseYear,
      rating: version.catalogMeta?.mxmRating ?? track.rating,
    };
    const [intel, artistMomentum] = await Promise.all([
      fetchMxmIntelligenceForTrack(mxmTrack),
      getArtistMomentum(project.artistName),
    ]);
    return {
      trackPatch: catalog.trackPatch,
      cyanite: catalog.cyanite,
      songstats: catalog.songstats,
      velocityHistory: catalog.velocityHistory,
      mxmAnalysis: intel.mxmAnalysis,
      richsync: intel.richsync,
      catalogBenchmark: intel.catalogBenchmark,
      artistMomentum,
    };
  }

  const matched = await matchCatalogTrack(project);
  let trackPatch: Partial<AppTrack> = {};
  let cyanite = waveformCyaniteProxy(audio);
  let songstats: SongstatsInsights = {
    available: false,
    status: "unavailable",
    totalStreams: 0,
    totalPlaylists: 0,
    editorialPlaylists: 0,
    shazams: 0,
    tiktokCreates: 0,
    chartPosition: null,
    velocityScore: 0,
    platforms: [],
  };
  let lyricsBody: string | undefined;
  let mxmAnalysis: MxmAnalysisRaw | null = null;
  let richsync: RichsyncParseResult | null = null;
  let catalogBenchmark: CatalogBenchmark = EMPTY_CATALOG_BENCHMARK;
  let artistMomentum: ArtistMomentumInsights = {
    available: false,
    status: "unavailable",
    artistName: project.artistName,
    momentumScore: 0,
    tier: "unknown",
  };
  let velocityHistory: VelocityHistoryInsights = {
    available: false,
    status: "unavailable",
    trajectory: "stable",
    historicVelocityScore: 0,
    dataPoints: [],
  };

  if (matched) {
    trackPatch = {
      hasRichsync: matched.hasRichsync,
      hasAnalysis: matched.hasAnalysis,
      spotifyId: matched.spotifyId,
    };

    if (matched.spotifyId) {
      const [cyaniteResult, songstatsResult, historyResult] = await Promise.all([
        analyzeSpotifyTrack(matched.spotifyId).catch(() => waveformCyaniteProxy(audio)),
        getTrackStats({ spotifyTrackId: matched.spotifyId }).catch(() => songstats),
        getTrackHistoricVelocity({ spotifyTrackId: matched.spotifyId }).catch(() => velocityHistory),
      ]);
      cyanite = cyaniteResult;
      songstats = songstatsResult;
      velocityHistory = historyResult;
    }

    try {
      const lyrics = await getTrackLyrics(parseInt(matched.id, 10));
      if (lyrics?.lyrics_body) lyricsBody = lyrics.lyrics_body;
    } catch {
      /* ignore */
    }

    const [intel, momentum] = await Promise.all([
      fetchMxmIntelligenceForTrack(matched),
      getArtistMomentum(project.artistName),
    ]);
    mxmAnalysis = intel.mxmAnalysis;
    richsync = intel.richsync;
    catalogBenchmark = intel.catalogBenchmark;
    artistMomentum = momentum;
  } else {
    artistMomentum = await getArtistMomentum(project.artistName);
  }

  if (!cyanite.available) {
    cyanite = waveformCyaniteProxy(audio);
  }

  return {
    trackPatch,
    cyanite,
    songstats,
    velocityHistory,
    mxmAnalysis,
    richsync,
    catalogBenchmark,
    artistMomentum,
    matchedCatalog: matched ?? undefined,
    lyricsBody,
  };
}