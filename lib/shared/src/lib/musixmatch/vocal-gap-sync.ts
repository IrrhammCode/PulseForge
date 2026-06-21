import type { TimedLyricLine } from "./lyric-video-timing";

export interface VocalActivityProfile {
  durationSec: number;
  /** Time ranges (seconds) where vocals are detected as active. */
  segments: Array<{ start: number; end: number }>;
}

export interface DisplayLineState {
  highlightTime: number;
  line: TimedLyricLine | null;
  lineIndex: number;
  paused: boolean;
}

/**
 * Resolve which timed line should be displayed at time `t`.
 * Time-based resolution: returns the active line when `t` falls within a
 * line's [start, end) window, otherwise marks the display as paused (gap).
 */
export function resolveDisplayLineAt(
  t: number,
  timedLines: TimedLyricLine[],
  _vocalProfile: VocalActivityProfile | null,
): DisplayLineState {
  if (!timedLines.length) {
    return { highlightTime: t, line: null, lineIndex: -1, paused: false };
  }

  for (let i = 0; i < timedLines.length; i++) {
    const line = timedLines[i]!;
    if (t >= line.start && t < line.end) {
      return { highlightTime: t, line, lineIndex: i, paused: false };
    }
  }

  let lastIndex = -1;
  for (let i = 0; i < timedLines.length; i++) {
    if (t >= timedLines[i]!.end) lastIndex = i;
    else break;
  }
  return { highlightTime: t, line: null, lineIndex: lastIndex, paused: true };
}

/** Pass-through alignment helper (vocal-onset alignment unavailable). */
export function alignTimedLinesToVocalOnsets(
  timedLines: TimedLyricLine[],
  _vocalProfile: VocalActivityProfile | null,
): TimedLyricLine[] {
  return timedLines;
}
