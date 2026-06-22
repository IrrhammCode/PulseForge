const BASE_URL = "https://api.songstats.com/enterprise/v1";

export interface PlatformStat {
  platform: string;
  streams?: number;
  playlists?: number;
  editorialPlaylists?: number;
  shazams?: number;
  tiktokCreates?: number;
  chartPosition?: number | null;
  popularity?: number;
}

export interface SongstatsInsights {
  available: boolean;
  status: "ok" | "not_found" | "unavailable" | "error";
  songstatsTrackId?: string;
  totalStreams: number;
  totalPlaylists: number;
  editorialPlaylists: number;
  shazams: number;
  tiktokCreates: number;
  chartPosition: number | null;
  velocityScore: number;
  platforms: PlatformStat[];
}

function getApiKey(): string | undefined {
  return process.env.SONGSTATS_API_KEY;
}

export function hasSongstatsKey(): boolean {
  return Boolean(getApiKey());
}

export async function songstatsFetch(
  path: string,
  params: Record<string, string>
): Promise<unknown> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("SONGSTATS_API_KEY is not configured");

  const url = new URL(`${BASE_URL}/${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (v) url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: {
      apikey: apiKey,
      accept: "application/json",
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Songstats HTTP ${res.status}`);

  return res.json();
}

function num(value: unknown): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

function extractPlatformStats(entry: Record<string, unknown>): PlatformStat {
  const source = String(entry.source ?? entry.platform ?? "unknown");
  const data = (entry.data ?? entry.stats ?? entry) as Record<string, unknown>;

  return {
    platform: source,
    streams: num(data.streams_total ?? data.streams ?? data.streams_current),
    playlists: num(data.playlists_total ?? data.playlists ?? data.playlists_current),
    editorialPlaylists: num(
      data.playlists_editorial_total ?? data.playlists_editorial_current ?? data.editorial_playlists
    ),
    shazams: num(data.shazams_total ?? data.shazams ?? data.shazams_current),
    tiktokCreates: num(data.tiktok_creates_total ?? data.tiktok_creates ?? data.tiktok_posts),
    chartPosition: num(data.chart_position ?? data.chart_current_position) ?? null,
    popularity: num(data.popularity_current ?? data.popularity),
  };
}

function computeVelocity(platforms: PlatformStat[]): number {
  const spotify = platforms.find((p) => p.platform.toLowerCase().includes("spotify"));
  const tiktok = platforms.find((p) => p.platform.toLowerCase().includes("tiktok"));
  const shazam = platforms.find((p) => p.platform.toLowerCase().includes("shazam"));

  let score = 30;
  if (spotify?.streams) score += Math.min(25, Math.log10(spotify.streams + 1) * 5);
  if (spotify?.editorialPlaylists) score += Math.min(15, spotify.editorialPlaylists * 2);
  if (tiktok?.tiktokCreates) score += Math.min(15, Math.log10(tiktok.tiktokCreates + 1) * 6);
  if (shazam?.shazams) score += Math.min(10, Math.log10(shazam.shazams + 1) * 4);
  if (spotify?.chartPosition && spotify.chartPosition <= 100) {
    score += Math.min(15, (101 - spotify.chartPosition) * 0.15);
  }

  return Math.round(Math.min(95, score));
}

function parseStatsResponse(raw: unknown): SongstatsInsights {
  if (!raw || typeof raw !== "object") {
    return emptyInsights("not_found");
  }

  const obj = raw as Record<string, unknown>;
  const statsArray = Array.isArray(obj.stats)
    ? obj.stats
    : Array.isArray(obj.data)
      ? obj.data
      : null;

  if (!statsArray?.length) {
    return emptyInsights("not_found");
  }

  const platforms = statsArray.map((entry) =>
    extractPlatformStats(entry as Record<string, unknown>)
  );

  const totalStreams = platforms.reduce((s, p) => s + (p.streams ?? 0), 0);
  const totalPlaylists = platforms.reduce((s, p) => s + (p.playlists ?? 0), 0);
  const editorialPlaylists = platforms.reduce((s, p) => s + (p.editorialPlaylists ?? 0), 0);
  const shazams = platforms.reduce((s, p) => s + (p.shazams ?? 0), 0);
  const tiktokCreates = platforms.reduce((s, p) => s + (p.tiktokCreates ?? 0), 0);

  const chartPositions = platforms
    .map((p) => p.chartPosition)
    .filter((c): c is number => c != null);
  const chartPosition = chartPositions.length ? Math.min(...chartPositions) : null;

  const trackId =
    typeof obj.songstats_track_id === "string" ? obj.songstats_track_id : undefined;

  return {
    available: totalStreams > 0 || totalPlaylists > 0 || shazams > 0,
    status: "ok",
    songstatsTrackId: trackId,
    totalStreams,
    totalPlaylists,
    editorialPlaylists,
    shazams,
    tiktokCreates,
    chartPosition,
    velocityScore: computeVelocity(platforms),
    platforms,
  };
}

function emptyInsights(status: SongstatsInsights["status"]): SongstatsInsights {
  return {
    available: false,
    status,
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

export async function getTrackStats(opts: {
  isrc?: string;
  spotifyTrackId?: string;
}): Promise<SongstatsInsights> {
  if (!hasSongstatsKey()) {
    return emptyInsights("unavailable");
  }

  const params: Record<string, string> = { source: "all" };
  if (opts.isrc) params.isrc = opts.isrc;
  else if (opts.spotifyTrackId) params.spotify_track_id = opts.spotifyTrackId;
  else return emptyInsights("not_found");

  try {
    const raw = await songstatsFetch("tracks/stats", params);
    if (!raw) return emptyInsights("not_found");
    return parseStatsResponse(raw);
  } catch {
    return emptyInsights("error");
  }
}