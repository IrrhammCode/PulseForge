import type { CatalogBenchmark } from "@/types";
import {
  getLyricsAnalysis,
  getRichsync,
  hasMusixmatchKey,
  type AppTrack,
} from "@/lib/musixmatch/client";
import { fetchCatalogBenchmark } from "@/lib/musixmatch/catalog-intelligence";
import { parseRichsyncBody, type RichsyncParseResult } from "@/lib/musixmatch/richsync-parser";
import type { MxmAnalysisRaw } from "@/lib/musixmatch/types";

export const EMPTY_CATALOG_BENCHMARK: CatalogBenchmark = {
  similarTracks: [],
  source: "none",
};

export interface MxmIntelligenceBundle {
  mxmAnalysis: MxmAnalysisRaw | null;
  richsync: RichsyncParseResult | null;
  catalogBenchmark: CatalogBenchmark;
}

export async function fetchMxmIntelligenceForTrack(
  track: AppTrack
): Promise<MxmIntelligenceBundle> {
  if (!hasMusixmatchKey()) {
    return { mxmAnalysis: null, richsync: null, catalogBenchmark: EMPTY_CATALOG_BENCHMARK };
  }

  const trackId = parseInt(track.id, 10);
  if (!Number.isFinite(trackId)) {
    return { mxmAnalysis: null, richsync: null, catalogBenchmark: EMPTY_CATALOG_BENCHMARK };
  }

  const commontrackId = track.commontrackId
    ? parseInt(track.commontrackId, 10)
    : undefined;

  try {
    const [mxmAnalysis, richsyncBody] = await Promise.all([
      getLyricsAnalysis(trackId, commontrackId),
      track.hasRichsync ? getRichsync(trackId, commontrackId) : Promise.resolve(null),
    ]);

    const richsync = richsyncBody ? parseRichsyncBody(richsyncBody) : null;
    const catalogBenchmark = await fetchCatalogBenchmark(track, mxmAnalysis);

    return { mxmAnalysis, richsync, catalogBenchmark };
  } catch {
    return { mxmAnalysis: null, richsync: null, catalogBenchmark: EMPTY_CATALOG_BENCHMARK };
  }
}