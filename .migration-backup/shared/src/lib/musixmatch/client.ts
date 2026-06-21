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

export interface MxmTranslationRaw {
  lyrics_id: number;
  lyrics_body: string;
  lyrics_language?: string;
  lyrics_translated?: {
    lyrics_body: string;
    selected_language?: string;
    restricted?: number;
  };
  lyrics_copyright?: string;
}

export async function getLyricsTranslation(
  trackId: number,
  selectedLanguage = "en"
): Promise<MxmTranslationRaw | null> {
  try {
    const data = await mxmFetch<{ message: { body: { lyrics: MxmTranslationRaw } } }>(
      "track.lyrics.translation.get",
      {
        track_id: String(trackId),
        selected_language: selectedLanguage,
      }
    );
    const body = data.message?.body;
    if (!body || Array.isArray(body)) return null;
    return body.lyrics ?? null;
  } catch {
    return null;
  }
}

export type AppTrack = ReturnType<typeof mapTrackToApp>;

/**
 * Musixmatch Pro Stem Separation
 * Uses the Stem Separation API to split audio into high-fidelity stems.
 * Supports 2, 4 or 6 stems (we normalize to vocals/drums/bass/other).
 */
export async function separateWithMusixmatch(
  audioBuffer: ArrayBuffer,
  filename = "song.mp3"
): Promise<Record<string, ArrayBuffer>> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("MUSIXMATCH_API_KEY or MXM_KEY is required for Musixmatch stem separation");
  }

  const form = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
  form.append("file", blob, filename);
  // Some Musixmatch endpoints accept additional params for stem count
  form.append("stem_count", "4"); // vocals, drums, bass, other

  // Musixmatch stem separation endpoint (based on Pro API docs)
  const url = `${BASE_URL}/track.stem.separation?apikey=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Musixmatch stem separation failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = await res.json().catch(() => ({}));

  const stems: Record<string, ArrayBuffer> = {};

  // Flexible parsing - Musixmatch may return different structures
  const body = data?.message?.body ?? data?.body ?? data;

  // Common patterns: { stems: { vocals: base64, drums: ..., ... } } or array of tracks
  const stemData = body?.stems || body?.result?.stems || body;

  if (stemData && typeof stemData === "object") {
    for (const [rawKey, value] of Object.entries(stemData as Record<string, any>)) {
      let b64: string | null = null;
      if (typeof value === "string") {
        b64 = value;
      } else if (value && typeof value === "object" && value.url) {
        // If URL provided, fetch it
        try {
          const stemRes = await fetch(value.url);
          if (stemRes.ok) {
            stems[normalizeStemKey(rawKey)] = await stemRes.arrayBuffer();
          }
        } catch {}
        continue;
      } else if (value?.data) {
        b64 = value.data;
      }

      if (b64) {
        try {
          const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          stems[normalizeStemKey(rawKey)] = binary.buffer;
        } catch (e) {
          console.warn("Failed to decode Musixmatch stem", rawKey);
        }
      }
    }
  }

  // Ensure we have at least the common 4 stems
  if (Object.keys(stems).length === 0) {
    throw new Error("Musixmatch returned no usable stems");
  }

  return stems;
}

function normalizeStemKey(key: string): "vocals" | "drums" | "bass" | "other" {
  const k = key.toLowerCase();
  if (k.includes("vocal") || k.includes("lead")) return "vocals";
  if (k.includes("drum")) return "drums";
  if (k.includes("bass")) return "bass";
  return "other";
}