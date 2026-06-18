import type { ArtistMomentumInsights, HitPotential } from "@/types";
import { clamp } from "@/lib/utils";
import { hasSongstatsKey } from "@/lib/songstats/client";
import type { PlatformStat } from "@/lib/songstats/client";

const BASE_URL = "https://api.songstats.com/enterprise/v1";

type ArtistMomentumTier = ArtistMomentumInsights["tier"];

interface ArtistRef {
  name: string;
  songstatsArtistId?: string;
  spotifyArtistId?: string;
}

function getApiKey(): string | undefined {
  return process.env.SONGSTATS_API_KEY;
}

async function songstatsFetch(
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
    headers: { apikey: apiKey, accept: "application/json" },
    next: { revalidate: 600 },
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

function emptyMomentum(
  artistName: string,
  status: ArtistMomentumInsights["status"]
): ArtistMomentumInsights {
  return {
    available: false,
    status,
    artistName,
    momentumScore: 0,
    tier: "unknown",
  };
}

function parseArtistSearch(raw: unknown, query: string): ArtistRef | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const results = Array.isArray(obj.results)
    ? obj.results
    : Array.isArray(obj.data)
      ? obj.data
      : Array.isArray(obj.artists)
        ? obj.artists
        : [];

  const q = query.trim().toLowerCase();
  let best: ArtistRef | null = null;
  let bestScore = -1;

  for (const entry of results) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const name = String(row.name ?? row.artist_name ?? "").trim();
    if (!name) continue;

    const lower = name.toLowerCase();
    let score = 0;
    if (lower === q) score = 100;
    else if (lower.startsWith(q) || q.startsWith(lower.slice(0, Math.min(lower.length, q.length)))) {
      score = 70;
    } else if (lower.includes(q.slice(0, Math.min(6, q.length)))) score = 40;

    const ref: ArtistRef = {
      name,
      songstatsArtistId:
        typeof row.songstats_artist_id === "string"
          ? row.songstats_artist_id
          : row.songstats_artist_id != null
            ? String(row.songstats_artist_id)
            : undefined,
      spotifyArtistId:
        typeof row.spotify_artist_id === "string"
          ? row.spotify_artist_id
          : row.spotify_artist_id != null
            ? String(row.spotify_artist_id)
            : undefined,
    };

    if (score > bestScore) {
      bestScore = score;
      best = ref;
    }
  }

  if (best) return best;

  const first = results[0];
  if (!first || typeof first !== "object") return null;
  const row = first as Record<string, unknown>;
  const name = String(row.name ?? row.artist_name ?? "").trim();
  if (!name) return null;

  return {
    name,
    songstatsArtistId:
      row.songstats_artist_id != null ? String(row.songstats_artist_id) : undefined,
    spotifyArtistId:
      row.spotify_artist_id != null ? String(row.spotify_artist_id) : undefined,
  };
}

function extractArtistPlatformStats(entry: Record<string, unknown>): PlatformStat {
  const source = String(entry.source ?? entry.platform ?? "unknown");
  const data = (entry.data ?? entry.stats ?? entry) as Record<string, unknown>;

  return {
    platform: source,
    streams: num(
      data.streams_total ??
        data.streams ??
        data.streams_current ??
        data.catalog_streams_total
    ),
    playlists: num(data.playlists_total ?? data.playlists),
    editorialPlaylists: num(data.playlists_editorial_total ?? data.editorial_playlists),
    shazams: num(data.shazams_total ?? data.shazams),
    tiktokCreates: num(data.tiktok_creates_total ?? data.tiktok_creates),
    chartPosition: num(data.chart_position) ?? null,
    popularity: num(
      data.popularity_current ??
        data.popularity ??
        data.monthly_listeners_current ??
        data.followers_total
    ),
  };
}

function classifyTier(
  monthlyListeners?: number,
  followers?: number
): ArtistMomentumTier {
  const signal = monthlyListeners ?? followers ?? 0;
  if (signal <= 0) return "unknown";
  if (signal < 15_000) return "emerging";
  if (signal < 250_000) return "rising";
  if (signal < 3_000_000) return "established";
  return "mega";
}

function computeMomentumScore(
  platforms: PlatformStat[],
  followers?: number,
  monthlyListeners?: number,
  catalogStreams?: number
): number {
  let score = 28;

  if (monthlyListeners) {
    score += Math.min(34, Math.log10(monthlyListeners + 1) * 9);
  }
  if (followers) {
    score += Math.min(22, Math.log10(followers + 1) * 6);
  }
  if (catalogStreams) {
    score += Math.min(16, Math.log10(catalogStreams + 1) * 4);
  }

  const spotify = platforms.find((p) => p.platform.toLowerCase().includes("spotify"));
  if (spotify?.popularity) {
    score += Math.min(12, spotify.popularity * 0.12);
  }

  const tiktok = platforms.find((p) => p.platform.toLowerCase().includes("tiktok"));
  if (tiktok?.tiktokCreates) {
    score += Math.min(10, Math.log10(tiktok.tiktokCreates + 1) * 4);
  }

  return clamp(Math.round(score), 0, 100);
}

function parseArtistStats(
  raw: unknown,
  ref: ArtistRef
): ArtistMomentumInsights {
  if (!raw || typeof raw !== "object") {
    return emptyMomentum(ref.name, "not_found");
  }

  const obj = raw as Record<string, unknown>;
  const statsArray = Array.isArray(obj.stats)
    ? obj.stats
    : Array.isArray(obj.data)
      ? obj.data
      : null;

  const platforms = statsArray?.length
    ? statsArray.map((e) => extractArtistPlatformStats(e as Record<string, unknown>))
    : [];

  const rootFollowers = num(
    obj.followers_total ?? obj.followers ?? obj.spotify_followers_total
  );
  const rootMonthly = num(
    obj.monthly_listeners_current ??
      obj.monthly_listeners ??
      obj.spotify_monthly_listeners_current
  );
  const rootStreams = num(obj.streams_total ?? obj.catalog_streams_total);

  const spotify = platforms.find((p) => p.platform.toLowerCase().includes("spotify"));
  const followers = rootFollowers ?? spotify?.popularity;
  const monthlyListeners = rootMonthly ?? spotify?.popularity;
  const catalogStreams =
    rootStreams ?? platforms.reduce((s, p) => s + (p.streams ?? 0), 0);

  const momentumScore = computeMomentumScore(
    platforms,
    followers,
    monthlyListeners,
    catalogStreams
  );
  const tier = classifyTier(monthlyListeners, followers);
  const available = momentumScore >= 30 || (followers ?? 0) > 0 || (monthlyListeners ?? 0) > 0;

  return {
    available,
    status: available ? "ok" : "not_found",
    artistName: ref.name,
    songstatsArtistId: ref.songstatsArtistId,
    spotifyArtistId: ref.spotifyArtistId,
    followers,
    monthlyListeners,
    catalogStreams: catalogStreams || undefined,
    momentumScore,
    tier,
  };
}

export async function getArtistMomentum(
  artistName: string
): Promise<ArtistMomentumInsights> {
  const name = artistName.trim();
  if (!name) return emptyMomentum(name, "not_found");
  if (!hasSongstatsKey()) return emptyMomentum(name, "unavailable");

  try {
    const searchRaw = await songstatsFetch("artists/search", { q: name, limit: "5" });
    const ref = parseArtistSearch(searchRaw, name);
    if (!ref) return emptyMomentum(name, "not_found");

    const params: Record<string, string> = { source: "all" };
    if (ref.spotifyArtistId) params.spotify_artist_id = ref.spotifyArtistId;
    else if (ref.songstatsArtistId) params.songstats_artist_id = ref.songstatsArtistId;
    else return emptyMomentum(name, "not_found");

    const statsRaw = await songstatsFetch("artists/stats", params);
    if (!statsRaw) return emptyMomentum(name, "not_found");
    return parseArtistStats(statsRaw, ref);
  } catch {
    return emptyMomentum(name, "error");
  }
}

export function artistMomentumSimulationBoost(
  momentum?: ArtistMomentumInsights
): number {
  if (!momentum?.available) return 0;
  if (momentum.tier === "rising") return 0.08;
  if (momentum.tier === "emerging") return 0.04;
  if (momentum.tier === "established") return 0.06;
  if (momentum.tier === "mega") return 0.03;
  return clamp(momentum.momentumScore / 1200, 0, 0.06);
}

export function adjustHitPotentialWithArtistMomentum(
  hitPotential: HitPotential,
  momentum: ArtistMomentumInsights
): HitPotential {
  if (!momentum.available) return hitPotential;

  let trendAlignment = hitPotential.breakdown.trendAlignment;
  trendAlignment = clamp(
    trendAlignment + Math.round(momentum.momentumScore * 0.08),
    0,
    95
  );

  const overall = clamp(
    Math.max(
      hitPotential.overall,
      Math.round(
        hitPotential.breakdown.beatFit * 0.25 +
          hitPotential.breakdown.lyricVirality * 0.3 +
          trendAlignment * 0.2 +
          hitPotential.breakdown.hookStrength * 0.25
      )
    ),
    hitPotential.overall - 4,
    96
  );

  return {
    ...hitPotential,
    overall,
    breakdown: { ...hitPotential.breakdown, trendAlignment },
    confidence: clamp(hitPotential.confidence + 3, 60, 96),
  };
}