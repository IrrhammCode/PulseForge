import {
  mapTrackToApp,
  searchSimilarByAnalysis,
  type AppTrack,
} from "@/lib/musixmatch/client";
import type { MxmAnalysisRaw, MxmAnalysisSearchQuery } from "@/lib/musixmatch/types";
import type { CatalogBenchmark, SimilarTrackRef } from "@/types";
import { analyzeLyrics } from "@/lib/scoring/lyrics-analyzer";

const TRENDING_MOODS = new Set([
  "Empowerment",
  "Party",
  "Love",
  "Celebration",
  "Hope",
  "Joy",
]);

/** Build analysis.search payload from Musixmatch analysis + track metadata. */
export function buildSimilarTracksQuery(
  track: AppTrack,
  mxmAnalysis?: MxmAnalysisRaw | null
): MxmAnalysisSearchQuery | null {
  if (!mxmAnalysis) return null;

  const moods =
    mxmAnalysis.moods?.main_moods?.filter((m) => TRENDING_MOODS.has(m)).slice(0, 3) ?? [];
  const themes =
    mxmAnalysis.themes?.main_themes?.map((t) => t.theme).slice(0, 3) ?? [];
  const meaning = mxmAnalysis.meaning?.explanation?.slice(0, 200);

  if (!moods.length && !themes.length && !meaning) return null;

  const query: MxmAnalysisSearchQuery = { lyrics_language: "en" };
  if (moods.length) query.moods = moods;
  if (themes.length) query.themes = themes;
  if (track.genre) query.genre = [track.genre];
  if (meaning && meaning.length > 20) query.meaning = meaning;

  return query;
}

export function mapToSimilarTrackRef(
  track: AppTrack,
  analysis?: MxmAnalysisRaw | null,
  lyricsBody?: string
): SimilarTrackRef {
  const hookStrength = lyricsBody
    ? analyzeLyrics(lyricsBody, analysis).hookStrength
    : undefined;

  return {
    id: track.id,
    title: track.title,
    artist: track.artist,
    genre: track.genre,
    rating: track.rating,
    moods: analysis?.moods?.main_moods?.slice(0, 3),
    themes: analysis?.themes?.main_themes?.map((t) => t.theme).slice(0, 3),
    hookStrength,
  };
}

export function buildCatalogBenchmark(
  anchor: AppTrack,
  similar: Array<{ track: AppTrack; analysis?: MxmAnalysisRaw | null; lyricsBody?: string }>
): CatalogBenchmark {
  const refs = similar
    .filter((s) => s.track.id !== anchor.id)
    .slice(0, 5)
    .map((s) => mapToSimilarTrackRef(s.track, s.analysis, s.lyricsBody));

  const hookScores = refs.map((r) => r.hookStrength).filter((h): h is number => h != null);
  const ratings = refs.map((r) => r.rating).filter((r): r is number => r != null);

  return {
    similarTracks: refs,
    medianHookStrength:
      hookScores.length > 0
        ? Math.round(hookScores.sort((a, b) => a - b)[Math.floor(hookScores.length / 2)]!)
        : undefined,
    medianRating:
      ratings.length > 0
        ? Math.round(ratings.sort((a, b) => a - b)[Math.floor(ratings.length / 2)]!)
        : undefined,
    source: refs.length > 0 ? "musixmatch" : "none",
  };
}

/** Simulation prior boost from similar-catalog median hook strength. */
export function catalogSimulationBoost(benchmark?: CatalogBenchmark): number {
  if (!benchmark?.medianHookStrength) return 0;
  return Math.max(0, Math.min(0.15, (benchmark.medianHookStrength - 60) / 200));
}

/** Fetch similar tracks via Musixmatch analysis.search for catalog grounding. */
export async function fetchCatalogBenchmark(
  track: AppTrack,
  mxmAnalysis?: MxmAnalysisRaw | null
): Promise<CatalogBenchmark> {
  const query = buildSimilarTracksQuery(track, mxmAnalysis);
  if (!query) {
    return { similarTracks: [], source: "none" };
  }

  const hits = await searchSimilarByAnalysis(query, 6);
  const similar = hits.map((hit) => ({
    track: mapTrackToApp(hit.track),
    analysis: hit.analysis,
  }));

  return buildCatalogBenchmark(track, similar);
}