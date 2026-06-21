export interface RichsyncSegment {
  text: string;
  startSec: number;
  endSec: number;
}

export interface RichsyncSectionInsight {
  text: string;
  startSec: number;
  endSec: number;
  repeatCount: number;
}

export interface RichsyncParseResult {
  segments: RichsyncSegment[];
  hookLine: string;
  hookWindowSec: number;
  chorusRepeats: number;
  durationSec: number;
  sections: RichsyncSectionInsight[];
}

interface RawRichsyncLine {
  ts?: number;
  te?: number;
  x?: string;
}

function normalizeLine(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Parse Musixmatch richsync_body JSON into timed sections and hook metrics. */
export function parseRichsyncBody(richsyncBody: string): RichsyncParseResult | null {
  if (!richsyncBody?.trim()) return null;

  let raw: RawRichsyncLine[];
  try {
    raw = JSON.parse(richsyncBody) as RawRichsyncLine[];
  } catch {
    return null;
  }

  if (!Array.isArray(raw) || raw.length === 0) return null;

  const segments: RichsyncSegment[] = raw
    .filter((line) => typeof line.x === "string" && line.x.trim().length > 0)
    .map((line) => ({
      text: line.x!.trim(),
      startSec: typeof line.ts === "number" ? line.ts : 0,
      endSec: typeof line.te === "number" ? line.te : typeof line.ts === "number" ? line.ts : 0,
    }));

  if (segments.length === 0) return null;

  const repeatCounts = new Map<string, { text: string; count: number; firstSec: number }>();
  for (const segment of segments) {
    const key = normalizeLine(segment.text);
    if (key.length < 6) continue;
    const existing = repeatCounts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      repeatCounts.set(key, { text: segment.text, count: 1, firstSec: segment.startSec });
    }
  }

  let hookLine = segments[0]!.text;
  let hookWindowSec = segments[0]!.startSec;
  let chorusRepeats = 1;

  let topRepeat: { text: string; count: number; firstSec: number } | null = null;
  for (const entry of repeatCounts.values()) {
    if (!topRepeat || entry.count > topRepeat.count) topRepeat = entry;
  }

  if (topRepeat && topRepeat.count >= 2) {
    hookLine = topRepeat.text;
    hookWindowSec = topRepeat.firstSec;
    chorusRepeats = topRepeat.count;
  }

  const durationSec = Math.max(...segments.map((s) => s.endSec));

  const sections: RichsyncSectionInsight[] = [];
  let cluster: RichsyncSegment[] = [segments[0]!];

  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1]!;
    const curr = segments[i]!;
    if (curr.startSec - prev.endSec > 4) {
      sections.push(clusterToSection(cluster, repeatCounts));
      cluster = [curr];
    } else {
      cluster.push(curr);
    }
  }
  if (cluster.length) sections.push(clusterToSection(cluster, repeatCounts));

  return {
    segments,
    hookLine,
    hookWindowSec,
    chorusRepeats,
    durationSec,
    sections,
  };
}

function clusterToSection(
  cluster: RichsyncSegment[],
  repeatCounts: Map<string, { text: string; count: number; firstSec: number }>
): RichsyncSectionInsight {
  const text = cluster.map((s) => s.text).join(" ");
  const key = normalizeLine(cluster[0]?.text ?? text);
  const repeat = repeatCounts.get(key)?.count ?? 1;
  return {
    text: cluster[0]?.text ?? text,
    startSec: cluster[0]?.startSec ?? 0,
    endSec: cluster[cluster.length - 1]?.endSec ?? 0,
    repeatCount: repeat,
  };
}

/** Hook timing bonus/penalty for scoring (seconds until primary hook). */
export function hookLatencyAdjustment(hookWindowSec: number): number {
  if (hookWindowSec <= 15) return 8;
  if (hookWindowSec <= 30) return 3;
  if (hookWindowSec <= 45) return 0;
  return -10;
}