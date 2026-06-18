import type { CyaniteAnalysis } from "@/lib/cyanite/client";
import { analyzeSpotifyTrack } from "@/lib/cyanite/client";
import type { SongstatsInsights } from "@/lib/songstats/client";
import { getTrackStats } from "@/lib/songstats/client";
import { getTrackHistoricVelocity } from "@/lib/songstats/historic-velocity";
import type { VelocityHistoryInsights } from "@/types";
import type { StudioProject } from "@/types/studio";
import type { AppTrack } from "@/lib/musixmatch/client";

export interface StudioPartnerSignals {
  cyanite: CyaniteAnalysis;
  songstats: SongstatsInsights;
  velocityHistory: VelocityHistoryInsights;
  trackPatch: Partial<AppTrack>;
}

const EMPTY_CYANITE: CyaniteAnalysis = {
  available: false,
  status: "unavailable",
  moodTags: [],
  genreTags: [],
  movementTags: [],
  instrumentTags: [],
  segmentEnergy: [],
};

const EMPTY_SONGSTATS: SongstatsInsights = {
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

export async function fetchStudioPartnerSignals(
  project: StudioProject,
  track: AppTrack,
  versionId?: string
): Promise<StudioPartnerSignals> {
  const version =
    project.versions.find((v) => v.id === (versionId ?? project.activeVersionId)) ??
    project.versions[0];

  const catalog = version?.catalogMeta;
  const spotifyId = catalog?.spotifyId ?? track.spotifyId;

  const trackPatch: Partial<AppTrack> = {
    hasRichsync: catalog?.hasRichsync ?? track.hasRichsync,
    hasAnalysis: catalog?.hasAnalysis ?? track.hasAnalysis,
    spotifyId,
  };

  let cyanite = EMPTY_CYANITE;
  let songstats = EMPTY_SONGSTATS;
  let velocityHistory: VelocityHistoryInsights = {
    available: false,
    status: "unavailable",
    trajectory: "stable",
    historicVelocityScore: 0,
    dataPoints: [],
  };

  if (spotifyId) {
    const [cyaniteResult, songstatsResult, historyResult] = await Promise.all([
      analyzeSpotifyTrack(spotifyId).catch(() => EMPTY_CYANITE),
      getTrackStats({ spotifyTrackId: spotifyId }).catch(() => EMPTY_SONGSTATS),
      getTrackHistoricVelocity({ spotifyTrackId: spotifyId }).catch(() => ({
        available: false,
        status: "error" as const,
        trajectory: "stable" as const,
        historicVelocityScore: 0,
        dataPoints: [],
      })),
    ]);
    cyanite = cyaniteResult;
    songstats = songstatsResult;
    velocityHistory = historyResult;
  }

  return { cyanite, songstats, velocityHistory, trackPatch };
}