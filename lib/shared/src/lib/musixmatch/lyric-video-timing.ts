import {
  buildLyricsTimelineFromWordCounts,
  composeLyricsBody,
  LYRICS_SECTION_ORDER,
  mapTimelineSectionToLyricsKey,
  sectionWordCount,
  type LyricsSectionKey,
} from "@/lib/studio/lyrics";
import type { LyricsSections } from "@/types/studio";
import type { RichsyncParseResult } from "@/lib/musixmatch/richsync-parser";

export interface TimedLyricLine {
  text: string;
  start: number;
  end: number;
  section?: string;
  richsyncSegment?: {
    startSec: number;
    endSec: number;
    chars?: Array<{ char: string; offset: number }>;
  };
}

export interface LyricVideoTimingOptions {
  bpm?: number;
  richsync?: RichsyncParseResult | null;
  /**
   * Positive = delay lyrics so highlight waits for vocals (fixes lyrics racing ahead).
   * Negative = show lyrics early. Default 0.45s for AI-generated tracks.
   */
  syncOffsetSec?: number;
  /** Skip instrumental at song start before first lyric (seconds). Auto if omitted. */
  vocalPaddingSec?: number;
  /** Stretch factor when lines finish too early vs track length. */
  durationStretch?: number;
}

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
  for (const w of wa) {
    if (wb.has(w)) overlap++;
  }
  return overlap / Math.max(wa.size, wb.size, 1);
}

/** Only use catalog richsync when enough project lines match (avoids wrong-track fast timing). */
export function richsyncMatchesProjectLyrics(
  richsync: RichsyncParseResult,
  lyrics: LyricsSections,
  minMatchRatio = 0.42
): boolean {
  const lines = collectStructuredLines(lyrics);
  if (lines.length === 0) return false;
  let matched = 0;
  for (const line of lines) {
    let best = 0;
    for (const seg of richsync.segments) {
      best = Math.max(best, lineSimilarity(line.text, seg.text));
    }
    if (best >= 0.52) matched++;
  }
  return matched / lines.length >= minMatchRatio;
}

const SECTION_LABELS: Record<LyricsSectionKey, string> = {
  intro: "Intro",
  verse1: "Verse 1",
  verse2: "Verse 2",
  chorus: "Chorus",
  bridge: "Bridge",
  outro: "Outro",
};

function collectStructuredLines(lyrics: LyricsSections): Array<{ text: string; section: LyricsSectionKey }> {
  const out: Array<{ text: string; section: LyricsSectionKey }> = [];
  for (const key of LYRICS_SECTION_ORDER) {
    const block = lyrics[key].trim();
    if (!block) continue;
    for (const line of block.split("\n")) {
      const text = line.trim();
      if (!text || /^\(.*\)$/.test(text)) continue;
      out.push({ text, section: key });
    }
  }
  if (out.length > 0) return out;

  const body = composeLyricsBody(lyrics);
  return body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !/^\[.*\]$/.test(l))
    .map((text) => ({ text, section: "verse1" as LyricsSectionKey }));
}

/** Build per-line timing grid synced to track duration (section-aware + optional richsync). */
export function buildLyricVideoTimedLines(
  lyrics: LyricsSections,
  durationSec: number,
  options: LyricVideoTimingOptions = {}
): TimedLyricLine[] {
  const duration = Math.max(20, durationSec);
  const syncOffset = options.syncOffsetSec ?? 0;
  const vocalPadding =
    options.vocalPaddingSec ?? Math.min(8, Math.max(2.5, duration * 0.07));
  const durationStretch = options.durationStretch ?? 1.12;
  const richsync = options.richsync ?? null;
  const structured = collectStructuredLines(lyrics);
  if (structured.length === 0) return [];

  const timeline = buildLyricsTimelineFromWordCounts(lyrics);
  const sectionWindows = new Map<LyricsSectionKey, { start: number; end: number }>();

  for (const block of timeline) {
    const key = mapTimelineSectionToLyricsKey(block.sectionId);
    if (key === "raw") continue;
    const start = (block.startPercent / 100) * duration;
    const end = start + (block.widthPercent / 100) * duration;
    const existing = sectionWindows.get(key);
    if (!existing) {
      sectionWindows.set(key, { start, end });
    } else {
      existing.end = Math.max(existing.end, end);
    }
  }

  if (sectionWindows.size === 0) {
    sectionWindows.set("verse1", { start: duration * 0.08, end: duration * 0.92 });
  }

  const timed: TimedLyricLine[] = [];

  for (const [key, window] of sectionWindows) {
    const sectionLines = structured.filter((l) => l.section === key);
    if (sectionLines.length === 0) continue;

    const weights = sectionLines.map((l) =>
      Math.max(1.5, sectionWordCount(l.text) * 0.55 + l.text.length * 0.03)
    );
    const totalWeight = weights.reduce((s, w) => s + w, 0);
    const windowDur = Math.max(2, window.end - window.start - 0.4);
    const introDelay = key === "intro" ? Math.min(windowDur * 0.45, 4) : 0;
    let cursor = window.start + 0.15 + introDelay;

    sectionLines.forEach((line, i) => {
      let dur = (weights[i]! / totalWeight) * windowDur;
      dur = Math.max(2.0, Math.min(8.5, dur * durationStretch));
      const start = cursor;
      let end = start + dur;
      if (end > window.end) end = window.end;
      timed.push({
        text: line.text,
        start,
        end,
        section: SECTION_LABELS[key],
      });
      cursor = end + 0.12;
    });
  }

  timed.sort((a, b) => a.start - b.start);

  // Push first vocal line past intro instrumental
  if (timed.length > 0 && timed[0]!.start < vocalPadding) {
    const shift = vocalPadding - timed[0]!.start;
    for (const line of timed) {
      line.start += shift;
      line.end += shift;
    }
  }

  if (richsync?.segments?.length) {
    const scale = duration / Math.max(richsync.durationSec, duration * 0.5);
    let matched = 0;

    for (const line of timed) {
      let best: { seg: (typeof richsync.segments)[0]; score: number } | null = null;
      for (const seg of richsync.segments) {
        const score = lineSimilarity(line.text, seg.text);
        if (!best || score > best.score) best = { seg, score };
      }
      if (best && best.score >= 0.52) {
        matched++;
        line.start = best.seg.startSec * scale;
        line.end = best.seg.endSec * scale;
        line.richsyncSegment = {
          startSec: line.start,
          endSec: line.end,
          chars: best.seg.chars,
        };
      }
    }

    if (matched >= Math.ceil(timed.length * 0.35)) {
      for (let i = 0; i < timed.length; i++) {
        const line = timed[i]!;
        if (line.richsyncSegment) continue;
        const prev = timed[i - 1];
        const next = timed[i + 1];
        if (prev?.richsyncSegment && next?.richsyncSegment) {
          line.start = prev.end + 0.08;
          line.end = Math.min(next.start - 0.05, line.start + 2.5);
        }
      }
    }
  }

  const lastEnd = timed[timed.length - 1]?.end ?? duration;
  const targetEnd = duration * 0.94;

  if (lastEnd > duration - 1 && lastEnd > 0) {
    const scale = targetEnd / lastEnd;
    for (const line of timed) {
      line.start *= scale;
      line.end *= scale;
      if (line.richsyncSegment) {
        line.richsyncSegment.startSec = line.start;
        line.richsyncSegment.endSec = line.end;
      }
    }
  } else if (lastEnd < targetEnd * 0.78 && lastEnd > 0) {
    // Lines finish too early — stretch so highlight doesn't race ahead of vocals
    const scale = targetEnd / lastEnd;
    for (const line of timed) {
      line.start *= scale;
      line.end *= scale;
      if (line.richsyncSegment) {
        line.richsyncSegment.startSec = line.start;
        line.richsyncSegment.endSec = line.end;
      }
    }
  }

  return timed.map((line) => ({
    ...line,
    start: Math.max(0, line.start + syncOffset),
    end: Math.max(line.start + 0.8, line.end + syncOffset),
  }));
}
