import type {
  MxmAnalysisRaw,
  MxmAnalysisResponse,
  MxmAnalysisSearchResponse,
  MxmLyricsRaw,
  MxmLyricsResponse,
  MxmRichsyncResponse,
  MxmSearchResponse,
  MxmTrackRaw,
} from "./types";
import type { MxmAnalysisSearchQuery } from "./types";

const BASE_URL = "https://api.musixmatch.com/ws/1.1";

function getApiKey(): string | undefined {
  const key = process.env.MUSIXMATCH_API_KEY || process.env.MXM_KEY;
  return key ? key.trim() : undefined;
}

export function hasMusixmatchKey(): boolean {
  return Boolean(getApiKey());
}

async function mxmFetch<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("MUSIXMATCH_API_KEY is not configured");
  }

  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("apikey", apiKey);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    headers: {
      "User-Agent": "PulseForge/1.0",
    },
  });

  if (!res.ok) {
    // Try to parse body for better error even on http error
    try {
      const errData = await res.clone().json();
      const st = errData?.message?.header?.status_code;
      const h = errData?.message?.header?.hint;
      if (st === 401) throw new Error(`Invalid Musixmatch API key${h ? ` (${h})` : ''}`);
      if (st === 403) throw new Error(`Musixmatch API access forbidden${h ? ` (${h})` : ''}`);
    } catch {}
    throw new Error(`Musixmatch HTTP ${res.status}`);
  }

  const data = (await res.json()) as T & {
    message?: { header?: { status_code?: number; hint?: string } };
  };

  const status = data.message?.header?.status_code;
  const hint = data.message?.header?.hint;
  if (status === 401) throw new Error(`Invalid Musixmatch API key${hint ? ` (${hint})` : ''}`);
  if (status === 403) throw new Error(`Musixmatch API access forbidden${hint ? ` (${hint})` : ''}`);
  if (status === 404) return data;

  // Handle other non-success status codes from Musixmatch (prevents crash in callers like searchTracks)
  if (status && status >= 400) {
    throw new Error(`Musixmatch error ${status}${hint ? ` (${hint})` : ''}`);
  }

  return data;
}

async function mxmPost<T>(
  endpoint: string,
  body: unknown,
  query: Record<string, string> = {}
): Promise<T> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("MUSIXMATCH_API_KEY is not configured");
  }

  const url = new URL(`${BASE_URL}/${endpoint}`);
  url.searchParams.set("apikey", apiKey);
  for (const [key, value] of Object.entries(query)) {
    if (value) url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "PulseForge/1.0",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    // Try to parse body for better error even on http error
    try {
      const errData = await res.clone().json();
      const st = errData?.message?.header?.status_code;
      const h = errData?.message?.header?.hint;
      if (st === 401) throw new Error(`Invalid Musixmatch API key${h ? ` (${h})` : ''}`);
      if (st === 403) throw new Error(`Musixmatch API access forbidden${h ? ` (${h})` : ''}`);
    } catch {}
    throw new Error(`Musixmatch HTTP ${res.status}`);
  }

  const data = (await res.json()) as T & {
    message?: { header?: { status_code?: number; hint?: string } };
  };

  const status = data.message?.header?.status_code;
  const hint = data.message?.header?.hint;
  if (status === 401) throw new Error(`Invalid Musixmatch API key${hint ? ` (${hint})` : ''}`);
  if (status === 403) throw new Error(`Musixmatch API access forbidden${hint ? ` (${hint})` : ''}`);

  if (status && status >= 400) {
    throw new Error(`Musixmatch error ${status}${hint ? ` (${hint})` : ''}`);
  }

  return data;
}

export async function searchTracks(query: string, pageSize = 10): Promise<MxmTrackRaw[]> {
  const params: Record<string, string> = {
    page_size: String(pageSize),
    f_has_lyrics: "1",
    s_track_rating: "desc",
  };

  // Improve matching for "title - artist" queries, as recommended in Musixmatch docs
  const dashMatch = query.match(/^(.+?)\s*-\s*(.+)$/);
  if (dashMatch) {
    params.q_track = dashMatch[1].trim();
    params.q_artist = dashMatch[2].trim();
  } else {
    params.q = query;
  }

  const data = await mxmFetch<MxmSearchResponse>("track.search", params);

  const body = data.message?.body;
  if (!body || Array.isArray(body) || typeof body !== 'object' || !('track_list' in body)) return [];
  return (body as any).track_list.map((item: any) => item.track);
}

export async function getTrackLyrics(
  trackId: number,
  commontrackId?: number
): Promise<MxmLyricsRaw | null> {
  const params: Record<string, string> = {};
  if (commontrackId) {
    params.commontrack_id = String(commontrackId);
  } else {
    params.track_id = String(trackId);
  }

  const data = await mxmFetch<MxmLyricsResponse>("track.lyrics.get", params);
  const body = data.message.body;
  if (!body || Array.isArray(body)) return null;
  return body.lyrics;
}

export async function getLyricsAnalysis(
  trackId: number,
  commontrackId?: number
): Promise<MxmAnalysisRaw | null> {
  const params: Record<string, string> = {};
  if (commontrackId) {
    params.commontrack_id = String(commontrackId);
  } else {
    params.track_id = String(trackId);
  }

  try {
    const data = await mxmFetch<MxmAnalysisResponse>("track.lyrics.analysis.get", params);
    const body = data.message.body;
    if (!body || Array.isArray(body)) return null;
    return body.analysis;
  } catch {
    return null;
  }
}

export function mapTrackToApp(track: MxmTrackRaw) {
  const genre =
    track.primary_genres?.music_genre_list?.[0]?.music_genre?.music_genre_name;

  const releaseYear = track.first_release_date
    ? new Date(track.first_release_date).getFullYear()
    : undefined;

  const cover =
    track.album_coverart_350x350 &&
    !track.album_coverart_350x350.includes("nocover")
      ? track.album_coverart_350x350
      : track.album_coverart_100x100;

  return {
    id: String(track.track_id),
    commontrackId: String(track.commontrack_id),
    title: track.track_name,
    artist: track.artist_name,
    album: track.album_name,
    duration: track.track_length ?? 0,
    coverUrl: cover?.includes("nocover") ? undefined : cover,
    isrc: track.track_isrc,
    genre,
    releaseYear,
    rating: track.track_rating,
    explicit: track.explicit === 1,
    hasRichsync: track.has_richsync === 1,
    hasAnalysis: track.has_lyrics_analysis === 1,
    spotifyId: track.track_spotify_id,
  };
}

export async function getRichsync(
  trackId: number,
  commontrackId?: number
): Promise<string | null> {
  const params: Record<string, string> = {};
  if (commontrackId) {
    params.commontrack_id = String(commontrackId);
  } else {
    params.track_id = String(trackId);
  }

  try {
    const data = await mxmFetch<MxmRichsyncResponse>("track.richsync.get", params);
    const body = data.message.body;
    if (!body || Array.isArray(body)) return null;
    return body.richsync.richsync_body ?? null;
  } catch {
    return null;
  }
}

export interface AnalysisSearchResult {
  track: MxmTrackRaw;
  analysis: MxmAnalysisRaw | null;
}

export async function searchSimilarByAnalysis(
  query: MxmAnalysisSearchQuery,
  pageSize = 6
): Promise<AnalysisSearchResult[]> {
  if (!query.moods?.length && !query.themes?.length && !query.meaning) {
    return [];
  }

  try {
    const data = await mxmPost<MxmAnalysisSearchResponse>(
      "track.lyrics.analysis.search",
      { data: query },
      { page_size: String(pageSize), page: "1" }
    );
    const body = data.message.body;
    if (!body || Array.isArray(body)) return [];

    return body.track_list.map((hit) => ({
      track: hit.track,
      analysis: hit.analysis ?? null,
    }));
  } catch {
    return [];
  }
}

export async function getTrackDetails(trackId: number): Promise<MxmTrackRaw | null> {
  const data = await mxmFetch<{ message: { body: { track: MxmTrackRaw } | [] } }>(
    "track.get",
    { track_id: String(trackId) }
  );
  const body = data.message.body;
  if (!body || Array.isArray(body)) return null;
  return body.track;
}

export type AppTrack = ReturnType<typeof mapTrackToApp>;