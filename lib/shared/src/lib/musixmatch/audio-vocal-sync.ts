import type { TimedLyricLine } from "./lyric-video-timing";
import type { VocalActivityProfile } from "./vocal-gap-sync";

export interface ProjectLine {
  text: string;
  section?: string;
}

/**
 * Build timed lyric lines by mapping project lines onto detected vocal phrases.
 * Vocal-phrase detection is unavailable in this environment, so this returns no
 * lines and callers fall back to other sync strategies (whisper / even spread).
 */
export function buildTimedLinesFromVocalPhrases(
  _projectLines: ProjectLine[],
  _profile: VocalActivityProfile,
  _durationSec: number,
  _syncOffsetSec: number,
): TimedLyricLine[] {
  return [];
}
