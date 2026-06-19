import type { CyaniteAnalysis } from "@/lib/cyanite/client";
import { analyzeSpotifyTrack } from "@/lib/cyanite/client";
import {
  getLyricsAnalysis,
  getRichsync,
  getTrackLyrics,
  getTrackDetails,
  mapTrackToApp,
  type AppTrack,
} from "@/lib/musixmatch/client";
import type { MxmAnalysisRaw, MxmLyricsRaw } from "@/lib/musixmatch/types";
import { parseRichsyncBody } from "@/lib/musixmatch/richsync-parser";
import type { RichsyncParseResult } from "@/lib/musixmatch/richsync-parser";
import { getTrackStats, type SongstatsInsights } from "@/lib/songstats/client";
import { getArtistMomentum } from "@/lib/songstats/artist-momentum";
import { getTrackHistoricVelocity } from "@/lib/songstats/historic-velocity";
import type { ArtistMomentumInsights, VelocityHistoryInsights } from "@/types";
import { hasMusixmatchKey } from "@/lib/musixmatch/client";

export interface CatalogAnalysisBundle {
  track: AppTrack;
  lyrics: MxmLyricsRaw;
  mxmAnalysis: MxmAnalysisRaw | null;
  richsync: RichsyncParseResult | null;
  cyanite: CyaniteAnalysis;
  songstats: SongstatsInsights;
  artistMomentum: ArtistMomentumInsights;
  velocityHistory: VelocityHistoryInsights;
}

export interface PartnerAdapter {
  id: string;
  available: () => boolean;
}

export const partnerAdapters: PartnerAdapter[] = [
  { id: "musixmatch", available: () => hasMusixmatchKey() },
  { id: "cyanite", available: () => Boolean(process.env.CYANITE_ACCESS_TOKEN) },
  { id: "songstats", available: () => Boolean(process.env.SONGSTATS_API_KEY) },
  { id: "elevenlabs", available: () => Boolean(process.env.ELEVENLABS_API_KEY) },
  { id: "lalal", available: () => Boolean(process.env.LALAL_API_KEY) },
  { id: "jambase", available: () => Boolean(process.env.JAMBASE_API_KEY) },
  { id: "n8n", available: () => Boolean(process.env.N8N_WEBHOOK_URL) },
];

export async function enrichCatalogTrack(track: AppTrack): Promise<AppTrack> {
  if (track.spotifyId && track.isrc) return track;
  const details = await getTrackDetails(parseInt(track.id, 10));
  if (!details) return track;
  const enriched = mapTrackToApp(details);
  return { ...track, ...enriched, id: track.id };
}

export async function fetchCatalogBundle(track: AppTrack): Promise<CatalogAnalysisBundle> {
  const enriched = await enrichCatalogTrack(track);
  const trackId = parseInt(enriched.id, 10);
  const commontrackId = enriched.commontrackId
    ? parseInt(enriched.commontrackId, 10)
    : undefined;

  const [lyrics, mxmAnalysis, richsyncBody, cyanite, songstats, artistMomentum, velocityHistory] =
    await Promise.all([
      getTrackLyrics(trackId, commontrackId),
      getLyricsAnalysis(trackId, commontrackId),
      enriched.hasRichsync ? getRichsync(trackId, commontrackId) : Promise.resolve(null),
      enriched.spotifyId
        ? analyzeSpotifyTrack(enriched.spotifyId)
        : Promise.resolve({
            available: false,
            status: "unavailable" as const,
            moodTags: [],
            genreTags: [],
            movementTags: [],
            instrumentTags: [],
            segmentEnergy: [],
          }),
      getTrackStats({
        isrc: enriched.isrc,
        spotifyTrackId: enriched.spotifyId,
      }),
      getArtistMomentum(enriched.artist),
      getTrackHistoricVelocity({
        isrc: enriched.isrc,
        spotifyTrackId: enriched.spotifyId,
      }),
    ]);

  if (!lyrics?.lyrics_body) {
    throw new Error("Lyrics not available for this track");
  }

  const richsync = richsyncBody ? parseRichsyncBody(richsyncBody) : null;

  return {
    track: enriched,
    lyrics,
    mxmAnalysis,
    richsync,
    cyanite,
    songstats,
    artistMomentum,
    velocityHistory,
  };
}