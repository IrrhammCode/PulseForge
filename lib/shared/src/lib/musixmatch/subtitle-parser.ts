import type { TimedLyricLine } from "@/lib/musixmatch/lyric-video-timing";

/**
 * Parse an LRC / Musixmatch subtitle body into timed lyric lines.
 *
 * Supports standard LRC timestamp tags `[mm:ss.xx]` (one or more per line).
 * Lines without a timestamp are ignored. The end of each line is the start of
 * the next timed line; the last line ends at `audioDurationSec` (or its own
 * start + 4s when the duration is unknown/too small).
 */
export function parseLrcSubtitle(
  lrcBody: string,
  audioDurationSec: number,
): TimedLyricLine[] {
  if (!lrcBody?.trim()) return [];

  const tagPattern = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
  const entries: Array<{ start: number; text: string }> = [];

  for (const rawLine of lrcBody.split(/\r?\n/)) {
    tagPattern.lastIndex = 0;
    const stamps: number[] = [];
    let match: RegExpExecArray | null;
    while ((match = tagPattern.exec(rawLine)) !== null) {
      const minutes = Number(match[1]);
      const seconds = Number(match[2]);
      const fracRaw = match[3] ?? "0";
      const frac = Number(fracRaw.padEnd(3, "0")) / 1000;
      stamps.push(minutes * 60 + seconds + frac);
    }
    if (stamps.length === 0) continue;

    const text = rawLine.replace(tagPattern, "").trim();
    if (!text) continue;

    for (const start of stamps) {
      entries.push({ start, text });
    }
  }

  if (entries.length === 0) return [];

  entries.sort((a, b) => a.start - b.start);

  const lines: TimedLyricLine[] = entries.map((entry, i) => {
    const next = entries[i + 1];
    const fallbackEnd = entry.start + 4;
    const end = next
      ? next.start
      : audioDurationSec > entry.start
        ? audioDurationSec
        : fallbackEnd;
    return { text: entry.text, start: entry.start, end };
  });

  return lines;
}
