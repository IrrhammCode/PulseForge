import type { AppTrack } from "@/lib/musixmatch/client";

/** Higher = richer Musixmatch intelligence (analysis API, richsync, rating). */
export function mxmIntelligenceScore(track: AppTrack): number {
  let score = 0;
  if (track.hasAnalysis) score += 3;
  if (track.hasRichsync) score += 3;
  if (track.rating && track.rating >= 70) score += 1;
  if (track.spotifyId) score += 1;
  return score;
}

export function sortByMxmIntelligence(tracks: AppTrack[]): AppTrack[] {
  return [...tracks].sort((a, b) => {
    const delta = mxmIntelligenceScore(b) - mxmIntelligenceScore(a);
    if (delta !== 0) return delta;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
}

export function mxmIntelligenceLabel(track: AppTrack): "full" | "analysis" | "lyrics" {
  if (track.hasAnalysis && track.hasRichsync) return "full";
  if (track.hasAnalysis) return "analysis";
  return "lyrics";
}