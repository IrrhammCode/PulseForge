import type { VocalActivityProfile } from "@pulseforge/shared/lib/musixmatch/vocal-gap-sync";

export type { VocalActivityProfile };

/**
 * Analyze a mix to detect vocal-active regions. Real-time vocal detection is
 * unavailable in this environment, so this returns an empty profile and callers
 * fall back to other lyric-sync strategies.
 */
export async function analyzeMixVocalActivity(
  _source: Blob | string,
): Promise<VocalActivityProfile> {
  return { durationSec: 0, segments: [] };
}
