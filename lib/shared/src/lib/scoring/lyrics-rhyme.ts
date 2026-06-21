import { clamp } from "@/lib/utils";

/** Short-form / TikTok-adjacent keyword buckets (2026 music trends). */
export const SHORT_FORM_TREND_KEYWORDS = [
  "tonight",
  "forever",
  "alone",
  "ghost",
  "anxiety",
  "healing",
  "toxic",
  "vibe",
  "energy",
  "chaos",
  "summer",
  "midnight",
  "money",
  "famous",
  "sorry",
  "crazy",
  "again",
  "body",
  "dance",
  "fake",
  "real",
  "friends",
  "ex",
  "phone",
  "late night",
  "main character",
  "runaway",
  "velvet",
  "honey",
] as const;

const MXM_TREND_THEMES = [
  "love",
  "party",
  "empowerment",
  "heartbreak",
  "nightlife",
  "celebration",
  "hope",
  "freedom",
];

function rhymeEnding(word: string): string {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length < 3) return w;
  const tail = w.match(/[aeiouy][a-z]*$/);
  return tail ? tail[0].slice(0, 5) : w.slice(-3);
}

/** 0–100: share of lyric lines that end-rhyme with at least one other line. */
export function computeRhymeDensity(lines: string[]): number {
  const endings = lines
    .map((l) => l.trim().split(/\s+/).pop() ?? "")
    .filter((w) => w.length >= 3)
    .map(rhymeEnding);

  if (endings.length < 2) return 42;

  const counts = new Map<string, number>();
  for (const e of endings) counts.set(e, (counts.get(e) ?? 0) + 1);

  const rhymed = endings.filter((e) => (counts.get(e) ?? 0) >= 2).length;
  return clamp(Math.round((rhymed / endings.length) * 100), 0, 100);
}

export interface TrendKeywordMatch {
  hits: string[];
  alignmentBoost: number;
}

function matchKeywordList(body: string, wordSet: Set<string>, words: string[], list: string[]): string[] {
  return list.filter((kw) => {
    if (kw.includes(" ")) return body.includes(kw);
    return wordSet.has(kw) || words.some((w) => w.includes(kw));
  });
}

export function matchTrendKeywords(
  words: string[],
  mxmThemes: string[] = [],
  liveTrendKeywords: string[] = []
): TrendKeywordMatch {
  const body = words.join(" ").toLowerCase();
  const wordSet = new Set(words.map((w) => w.toLowerCase()));

  const staticHits = matchKeywordList(body, wordSet, words, [...SHORT_FORM_TREND_KEYWORDS]);
  const liveHits = matchKeywordList(body, wordSet, words, liveTrendKeywords);

  const themeHits = mxmThemes
    .map((t) => t.toLowerCase())
    .filter((t) => MXM_TREND_THEMES.some((b) => t.includes(b)));

  const hits = [...new Set([...staticHits, ...liveHits, ...themeHits])].slice(0, 10);
  const alignmentBoost = clamp(
    staticHits.length * 3 + liveHits.length * 5 + themeHits.length * 3,
    0,
    32
  );

  return { hits, alignmentBoost };
}