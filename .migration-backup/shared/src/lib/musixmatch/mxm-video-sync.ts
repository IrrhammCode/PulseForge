import type { LyricsSections } from "@/types/studio";
import { LYRICS_SECTION_ORDER, type LyricsSectionKey } from "@/lib/studio/lyrics";
import type { RichsyncParseResult } from "@/lib/musixmatch/richsync-parser";
import type { TimedLyricLine } from "@/lib/musixmatch/lyric-video-timing";
import { parseLrcSubtitle } from "@/lib/musixmatch/subtitle-parser";
import type { ResolvedLyricDisplay } from "@/lib/musixmatch/vocal-gap-sync";

const SECTION_LABELS: Record<LyricsSectionKey, string> = {
  intro: "Intro",
  verse1: "Verse 1",
  verse2: "Verse 2",
  chorus: "Chorus",
  bridge: "Bridge",
  outro: "Outro",
};

function normalizeLine(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

function lineSimilarity(a: string, b: string): number {
  const na = normalizeLine(a);
  const nb = normalizeLine(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.88;
  const wa = new Set(na.split(" "));
  const wb = new Set(nb.split(" "));
  let overlap = 0;
  for (const w of wa) if (wb.has(w)) overlap++;
  return overlap / Math.max(wa.size, wb.size, 1);
}

function collectProjectLines(lyrics: LyricsSections): Array<{ text: string; section?: string }> {
  const out: Array<{ text: string; section?: string }> = [];
  for (const key of LYRICS_SECTION_ORDER) {
    const block = lyrics[key].trim();
    if (!block) continue;
    for (const line of block.split("\n")) {
      const text = line.trim();
      if (!text || /^\(.*\)$/.test(text)) continue;
      out.push({ text, section: SECTION_LABELS[key] });
    }
  }
  return out;
}

export type MxmVideoSyncSource =
  | "mxm.richsync"
  | "mxm.richsync+project"
  | "mxm.subtitle"
  | "mxm.subtitle+project"
  | "mxm.matcher.subtitle"
  | "mxm.matcher.subtitle+project";

export interface MxmVideoSyncResult {
  lines: TimedLyricLine[];
  source: MxmVideoSyncSource;
  richsync?: RichsyncParseResult | null;
}

/** Build timed lines from MXM richsync segments — gaps between ts/te are instrumental pauses. */
export function buildTimedLinesFromRichsync(
  richsync: RichsyncParseResult,
  audioDurationSec: number,
  projectLyrics?: LyricsSections
): MxmVideoSyncResult {
  // DO NOT stretch richsync timestamps based on duration differences.
  // A duration difference usually means trailing silence. Stretching the timestamps alters the BPM and ruins the perfect sync.
  const scale = 1;

  const mxmLines: TimedLyricLine[] = richsync.segments.map((seg) => {
    const start = seg.startSec * scale;
    const end = seg.endSec * scale;
    return {
      text: seg.text,
      start,
      end,
      richsyncSegment: {
        startSec: start,
        endSec: end,
        chars: seg.chars?.map((c) => ({
          char: c.char,
          offset: c.offset * scale,
        })),
      },
    };
  });

  const projectLines = projectLyrics ? collectProjectLines(projectLyrics) : [];
  if (projectLines.length === 0) {
    return { lines: mxmLines, source: "mxm.richsync", richsync };
  }

  const merged: TimedLyricLine[] = [];
  let mxmIdx = 0;
  for (const pl of projectLines) {
    let best = mxmIdx;
    let bestScore = 0;
    const searchEnd = Math.min(mxmIdx + 5, mxmLines.length);
    for (let j = mxmIdx; j < searchEnd; j++) {
      const score = lineSimilarity(pl.text, mxmLines[j]!.text);
      if (score > bestScore) {
        bestScore = score;
        best = j;
      }
    }
    if (bestScore >= 0.4 && mxmLines[best]) {
      merged.push({
        ...mxmLines[best]!,
        text: pl.text,
        section: pl.section,
      });
      mxmIdx = best + 1;
    }
  }

  if (merged.length >= Math.ceil(projectLines.length * 0.35)) {
    return { lines: merged, source: "mxm.richsync+project", richsync };
  }
  return { lines: mxmLines, source: "mxm.richsync", richsync };
}

/** Overlay project lyric text on LRC/subtitle timing from MXM. */
export function overlayProjectLyricsOnLrc(
  lrcLines: TimedLyricLine[],
  projectLyrics: LyricsSections
): TimedLyricLine[] {
  const projectLines = collectProjectLines(projectLyrics);
  if (projectLines.length === 0) return lrcLines;

  const merged: TimedLyricLine[] = [];
  let lrcIdx = 0;
  for (const pl of projectLines) {
    let best = lrcIdx;
    let bestScore = 0;
    for (let j = lrcIdx; j < Math.min(lrcIdx + 5, lrcLines.length); j++) {
      const score = lineSimilarity(pl.text, lrcLines[j]!.text);
      if (score > bestScore) {
        bestScore = score;
        best = j;
      }
    }
    if (bestScore >= 0.35 && lrcLines[best]) {
      merged.push({ ...lrcLines[best]!, text: pl.text, section: pl.section });
      lrcIdx = best + 1;
    }
  }
  return merged.length >= Math.ceil(projectLines.length * 0.3) ? merged : lrcLines;
}

export function buildTimedLinesFromLrc(
  lrcBody: string,
  audioDurationSec: number,
  projectLyrics?: LyricsSections,
  sourceBase: "mxm.subtitle" | "mxm.matcher.subtitle" = "mxm.subtitle"
): MxmVideoSyncResult {
  const lrcLines = parseLrcSubtitle(lrcBody, audioDurationSec);
  if (!projectLyrics) {
    return { lines: lrcLines, source: sourceBase, richsync: null };
  }
  const merged = overlayProjectLyricsOnLrc(lrcLines, projectLyrics);
  return {
    lines: merged,
    source: merged !== lrcLines ? `${sourceBase}+project` as MxmVideoSyncSource : sourceBase,
    richsync: null,
  };
}

/**
 * MXM Pro strict display: only highlight inside [start,end].
 * Between segments = instrumental gap (no lyric advance).
 */
export function resolveMxmStrictDisplay(
  t: number,
  lines: TimedLyricLine[]
): ResolvedLyricDisplay & { inGap: boolean } {
  const idx = lines.findIndex((l) => t >= l.start && t <= l.end);
  if (idx >= 0) {
    const line = lines[idx]!;
    return { line, lineIndex: idx, highlightTime: t, paused: false, inGap: false };
  }
  return { line: null, lineIndex: -1, highlightTime: t, paused: true, inGap: true };
}
