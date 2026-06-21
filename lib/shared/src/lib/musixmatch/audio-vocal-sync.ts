import type { TimedLyricLine } from "./lyric-video-timing";
import type { VocalActivityProfile } from "./vocal-gap-sync";

export interface ProjectLine {
  text: string;
  section?: string;
}

function wordCount(text: string): number {
  const t = (text || "").trim();
  if (!t) return 1;
  return Math.max(1, t.split(/\s+/).length);
}

/**
 * Round fractional counts to integers that still sum to `total` using the
 * largest-remainder method (so all lines get placed, none are lost).
 */
function largestRemainder(raw: number[], total: number): number[] {
  const floors = raw.map((r) => Math.floor(r));
  let used = floors.reduce((a, b) => a + b, 0);
  let remaining = total - used;
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < order.length && remaining > 0; k++) {
    floors[order[k]!.i]! += 1;
    remaining--;
  }
  return floors;
}

/**
 * Build timed lyric lines by mapping project lines onto detected vocal/active
 * phrases from the audio energy envelope. Lines are distributed across the
 * active segments (proportional to each segment's length), then within a
 * segment split by per-line word weight. Because lines only ever fall inside an
 * active segment, the highlight naturally pauses during instrumental gaps and
 * intros instead of racing ahead on a fixed proportional grid.
 *
 * Returns [] (callers fall back to other strategies) when there is no usable
 * vocal-activity profile.
 */
export function buildTimedLinesFromVocalPhrases(
  projectLines: ProjectLine[],
  profile: VocalActivityProfile,
  durationSec: number,
  syncOffsetSec: number,
): TimedLyricLine[] {
  const lines = projectLines.filter((l) => l.text && l.text.trim());
  if (lines.length === 0) return [];

  const rawSegs = (profile?.segments ?? [])
    .filter((s) => s && isFinite(s.start) && isFinite(s.end) && s.end > s.start)
    .sort((a, b) => a.start - b.start);
  if (rawSegs.length === 0) return [];

  // Scale segment times to the actual playback duration when the analyzed
  // duration differs (e.g. re-encoded mix).
  const scale =
    profile.durationSec > 0 && durationSec > 0 && Math.abs(profile.durationSec - durationSec) > 1
      ? durationSec / profile.durationSec
      : 1;
  const segs = rawSegs.map((s) => ({
    start: s.start * scale,
    end: Math.min(s.end * scale, durationSec),
  }));

  const totalActive = segs.reduce((a, s) => a + (s.end - s.start), 0);
  if (totalActive <= 0) return [];

  const N = lines.length;
  const rawCounts = segs.map((s) => ((s.end - s.start) / totalActive) * N);
  const counts = largestRemainder(rawCounts, N);

  const timed: TimedLyricLine[] = [];
  let li = 0;

  for (let si = 0; si < segs.length; si++) {
    const cnt = counts[si]!;
    if (cnt <= 0) continue;
    const seg = segs[si]!;
    const segLines = lines.slice(li, li + cnt);
    li += cnt;

    const weights = segLines.map((l) => wordCount(l.text));
    const wsum = weights.reduce((a, b) => a + b, 0) || segLines.length;
    const segDur = Math.max(0.6, seg.end - seg.start);
    let cursor = seg.start;

    segLines.forEach((line, i) => {
      const d = (weights[i]! / wsum) * segDur;
      const start = cursor;
      let end = i === segLines.length - 1 ? seg.end : start + d;
      if (end <= start) end = start + 0.6;
      timed.push({ text: line.text, start, end, section: line.section });
      cursor = end;
    });
  }

  // Place any leftover lines (rounding remainder) right after the last placed line.
  while (li < N) {
    const line = lines[li++]!;
    const last = timed[timed.length - 1];
    const start = last ? last.end : segs[segs.length - 1]!.end;
    timed.push({ text: line.text, start, end: start + 1.6, section: line.section });
  }

  timed.sort((a, b) => a.start - b.start);

  return timed.map((l) => ({
    ...l,
    start: Math.max(0, l.start + syncOffsetSec),
    end: Math.max(l.start + 0.6, l.end + syncOffsetSec),
  }));
}
