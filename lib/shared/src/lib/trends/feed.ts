import { SHORT_FORM_TREND_KEYWORDS } from "@/lib/scoring/lyrics-rhyme";
import type { TrendFeedSnapshot } from "@/types";

const CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 4000;

let cache: { data: TrendFeedSnapshot; expiresAt: number } | null = null;

const SEASONAL_KEYWORDS: Record<string, string[]> = {
  winter: ["cold", "snow", "fire", "holiday", "midnight", "alone", "ghost"],
  spring: ["bloom", "rain", "rise", "freedom", "sun", "hope", "again"],
  summer: ["summer", "heat", "beach", "sunset", "midnight", "party", "dance", "body"],
  fall: ["fall", "fade", "memory", "rain", "ghost", "sorry", "gold"],
};

const CURATED_MOODS_2026 = [
  "Party",
  "Empowerment",
  "Love",
  "Celebration",
  "Hope",
  "Heartbreak",
];

function seasonBucket(date = new Date()): keyof typeof SEASONAL_KEYWORDS {
  const m = date.getMonth();
  if (m <= 1 || m === 11) return "winter";
  if (m <= 4) return "spring";
  if (m <= 7) return "summer";
  return "fall";
}

export function buildCuratedTrendFeed(now = new Date()): TrendFeedSnapshot {
  const seasonal = SEASONAL_KEYWORDS[seasonBucket(now)] ?? [];
  const keywords = [
    ...new Set([
      ...seasonal,
      ...SHORT_FORM_TREND_KEYWORDS.slice(0, 16),
      "delulu",
      "healing",
      "anxiety",
      "main character",
      "late night",
    ]),
  ].slice(0, 24);

  return {
    keywords,
    moods: CURATED_MOODS_2026,
    source: "curated",
    refreshedAt: now.toISOString(),
  };
}

function parseRemoteFeed(raw: unknown): Partial<TrendFeedSnapshot> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const keywords = Array.isArray(obj.keywords)
    ? obj.keywords.map(String).filter(Boolean)
    : Array.isArray(obj.trends)
      ? obj.trends.map(String).filter(Boolean)
      : [];

  const moods = Array.isArray(obj.moods) ? obj.moods.map(String).filter(Boolean) : [];

  if (!keywords.length && !moods.length) return null;
  return { keywords, moods };
}

async function fetchRemoteTrendFeed(url: string): Promise<Partial<TrendFeedSnapshot> | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return parseRemoteFeed(json);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function mergeFeeds(
  remote: Partial<TrendFeedSnapshot> | null,
  curated: TrendFeedSnapshot
): TrendFeedSnapshot {
  if (!remote?.keywords?.length && !remote?.moods?.length) return curated;

  const keywords = [
    ...new Set([...(remote.keywords ?? []), ...curated.keywords]),
  ].slice(0, 28);
  const moods = [
    ...new Set([...(remote.moods ?? []), ...curated.moods]),
  ].slice(0, 8);

  return {
    keywords,
    moods,
    source: remote.keywords?.length ? "hybrid" : "curated",
    refreshedAt: new Date().toISOString(),
  };
}

/** Cached live trend feed — never throws; always returns data. */
export async function getLiveTrendFeed(): Promise<TrendFeedSnapshot> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.data;

  const curated = buildCuratedTrendFeed();
  const url = process.env.TREND_FEED_URL?.trim();
  let merged = curated;

  if (url) {
    const remote = await fetchRemoteTrendFeed(url);
    merged = mergeFeeds(remote, curated);
    if (remote?.keywords?.length) merged.source = "hybrid";
    else if (remote) merged.source = "live";
  }

  cache = { data: merged, expiresAt: now + CACHE_TTL_MS };
  return merged;
}

/** Sync read of last cached feed (curated if cache cold). */
export function getCachedTrendFeed(): TrendFeedSnapshot {
  return cache?.data ?? buildCuratedTrendFeed();
}

/** Test helper */
export function resetTrendFeedCache(): void {
  cache = null;
}