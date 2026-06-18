import type { LyricsStructure } from "@/types";
import type { MxmAnalysisRaw } from "@/lib/musixmatch/types";
import {
  hookLatencyAdjustment,
  type RichsyncParseResult,
} from "@/lib/musixmatch/richsync-parser";
import { computeRhymeDensity, matchTrendKeywords } from "@/lib/scoring/lyrics-rhyme";

const ENERGETIC_WORDS = [
  "dance", "night", "fire", "run", "jump", "party", "wild", "energy", "beat",
  "light", "shine", "move", "alive", "power", "rush", "fly", "loud",
];

const MELANCHOLIC_WORDS = [
  "rain", "tears", "alone", "gone", "miss", "hurt", "broken", "fade", "ghost",
  "cold", "empty", "lost", "goodbye", "memory", "ache", "shadow",
];

const POSITIVE_WORDS = [
  "love", "heart", "dream", "hope", "beautiful", "forever", "happy", "smile",
  "together", "shine", "free", "rise", "gold", "bright",
];

function cleanLyricsBody(body: string): string {
  return body
    .replace(/\*\*\*\*\*\*/g, "")
    .replace(/\(.*?\)/g, "")
    .trim();
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

function countOccurrences(lines: string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const normalized = line.trim().toLowerCase();
    if (normalized.length < 8) continue;
    counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
  }
  return counts;
}

function detectSentiment(
  words: string[]
): LyricsStructure["sentiment"] {
  let energetic = 0;
  let melancholic = 0;
  let positive = 0;

  for (const w of words) {
    if (ENERGETIC_WORDS.some((k) => w.includes(k))) energetic++;
    if (MELANCHOLIC_WORDS.some((k) => w.includes(k))) melancholic++;
    if (POSITIVE_WORDS.some((k) => w.includes(k))) positive++;
  }

  if (energetic > melancholic && energetic > positive) return "energetic";
  if (melancholic > energetic && melancholic > positive) return "melancholic";
  if (positive > melancholic) return "positive";
  return "neutral";
}

function estimateHookStrength(
  hookLine: string,
  repetitionIndex: number,
  wordCount: number
): number {
  const hookWords = tokenize(hookLine);
  const avgWordLen =
    hookWords.reduce((s, w) => s + w.length, 0) / Math.max(hookWords.length, 1);

  // Shorter, punchier hooks score higher; high repetition helps memorability
  const brevity = avgWordLen <= 4 ? 18 : avgWordLen <= 5 ? 12 : 6;
  const repeatBonus = Math.min(35, repetitionIndex * 0.45);
  const lengthPenalty = wordCount > 400 ? -5 : wordCount < 150 ? -3 : 0;

  return Math.round(Math.min(95, Math.max(40, 45 + brevity + repeatBonus + lengthPenalty)));
}

export interface AnalyzeLyricsOptions {
  liveTrendKeywords?: string[];
}

export function analyzeLyrics(
  lyricsBody: string,
  mxmAnalysis?: MxmAnalysisRaw | null,
  explicitFlag = false,
  richsync?: RichsyncParseResult | null,
  opts?: AnalyzeLyricsOptions
): LyricsStructure {
  const cleaned = cleanLyricsBody(lyricsBody);
  const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
  const words = tokenize(cleaned);

  const lineCounts = countOccurrences(lines);
  let hookLine = lines[0] ?? "—";
  let maxRepeat = 1;

  for (const [line, count] of lineCounts) {
    if (count > maxRepeat) {
      maxRepeat = count;
      hookLine = line;
    }
  }

  // Use Musixmatch analysis themes when available
  const mxmThemes =
    mxmAnalysis?.themes?.main_themes?.map((t) => t.theme.toLowerCase()) ?? [];

  const mxmHook =
    mxmAnalysis?.themes?.main_themes?.[0]?.quotes?.[0] ??
    mxmAnalysis?.meaning?.explanation?.split(".")[0];

  if (mxmHook && mxmHook.length > 10 && mxmHook.length < 120) {
    hookLine = mxmHook.replace(/^"|"$/g, "");
  }

  const blankBlocks = cleaned.split(/\n\s*\n/).filter((b) => b.trim().length > 0);
  const verses = Math.max(1, blankBlocks.length - 1);

  const uniqueWords = new Set(words);
  const repetitionIndex = Math.round(
    ((words.length - uniqueWords.size) / Math.max(words.length, 1)) * 100
  );

  let chorusCount = Math.max(1, maxRepeat);
  let hookWindowSec: number | undefined;
  let richsyncPowered = false;
  let sections: LyricsStructure["sections"];

  if (richsync) {
    richsyncPowered = true;
    hookLine = richsync.hookLine;
    hookWindowSec = richsync.hookWindowSec;
    chorusCount = Math.max(chorusCount, richsync.chorusRepeats);
    sections = richsync.sections;
  }

  let hookStrength = estimateHookStrength(hookLine, repetitionIndex, words.length);
  if (hookWindowSec != null) {
    hookStrength = Math.min(95, Math.max(40, hookStrength + hookLatencyAdjustment(hookWindowSec)));
  }

  const moodKeywords =
    mxmAnalysis?.moods?.main_moods?.map((m) => m.toLowerCase()) ?? [];

  let sentiment = detectSentiment(words);
  if (moodKeywords.some((m) => ["party", "celebration", "joy", "empowerment"].includes(m))) {
    sentiment = "energetic";
  } else if (moodKeywords.some((m) => ["heartbreak", "despair", "nostalgia", "angst"].includes(m))) {
    sentiment = sentiment === "energetic" ? "neutral" : "melancholic";
  }

  const themes =
    mxmThemes.length > 0
      ? mxmThemes.slice(0, 4)
      : extractThemesFromWords(words);

  const rhymeDensity = computeRhymeDensity(lines);
  const trendMatch = matchTrendKeywords(words, mxmThemes, opts?.liveTrendKeywords ?? []);

  // === Chorus length & simplicity (new first-class signals for viral structure) ===
  const chorusMetrics = computeChorusMetrics(lines, hookLine, richsync?.sections, chorusCount);

  return {
    verses,
    chorusCount,
    hookLine: hookLine.charAt(0).toUpperCase() + hookLine.slice(1),
    hookStrength,
    sentiment,
    themes,
    explicitScore: explicitFlag ? 40 : 0,
    wordCount: words.length,
    repetitionIndex,
    hookWindowSec,
    richsyncPowered,
    sections,
    rhymeDensity,
    trendKeywordHits: trendMatch.hits,
    chorusWordCount: chorusMetrics.chorusWordCount,
    chorusSimplicity: chorusMetrics.chorusSimplicity,
  };
}

interface ChorusMetrics {
  chorusWordCount: number;
  chorusSimplicity: number;
}

function computeChorusMetrics(
  allLines: string[],
  hookLine: string,
  sections?: Array<{ text: string; startSec: number; endSec: number; repeatCount: number }>,
  chorusCount?: number
): ChorusMetrics {
  let chorusText = hookLine;

  // Prefer richsync chorus section if available
  if (sections && sections.length) {
    // Find highest repeat or any section that looks like main hook/chorus
    const chorusLike = sections.find((s) => s.repeatCount >= 2) ||
      sections.find((s) => /chorus|hook|refrain/i.test(s.text)) ||
      sections[0];
    if (chorusLike) {
      chorusText = chorusLike.text;
    }
  } else {
    // Fallback: take the hookLine + next 1-2 lines that repeat or are short
    const hookNorm = hookLine.toLowerCase().trim();
    const idx = allLines.findIndex((l) => l.toLowerCase().trim() === hookNorm);
    if (idx >= 0) {
      const block = allLines.slice(idx, idx + 3).join(" ");
      if (block.length > hookLine.length + 6) chorusText = block;
    }
  }

  const chorusWords = tokenize(chorusText);
  const chorusWordCount = chorusWords.length;

  if (chorusWordCount === 0) {
    return { chorusWordCount: 0, chorusSimplicity: 48 };
  }

  // Simplicity scoring (higher = better for viral replay & singability)
  const avgWordLen = chorusWords.reduce((s, w) => s + w.length, 0) / chorusWordCount;
  let simplicity = 78;

  // Short words win (punchy)
  if (avgWordLen <= 3.6) simplicity += 14;
  else if (avgWordLen <= 4.4) simplicity += 7;
  else if (avgWordLen >= 6.5) simplicity -= 13;

  // Internal repetition inside chorus block is gold
  const uniqueInChorus = new Set(chorusWords).size;
  const repeatRatio = 1 - (uniqueInChorus / Math.max(chorusWordCount, 1));
  simplicity += Math.round(repeatRatio * 28);

  // Length penalty: ideal chorus/hook ~5-14 words for short-form
  if (chorusWordCount >= 5 && chorusWordCount <= 13) simplicity += 9;
  else if (chorusWordCount > 18) simplicity -= 14;
  else if (chorusWordCount < 4) simplicity -= 6;

  // Bonus for very repeatable structure (many chorus repeats overall)
  if ((chorusCount ?? 1) >= 3) simplicity += 6;

  // Very long unique words hurt singability
  const longWords = chorusWords.filter((w) => w.length > 8).length;
  simplicity -= longWords * 3.5;

  return {
    chorusWordCount: Math.round(chorusWordCount),
    chorusSimplicity: clamp(Math.round(simplicity), 32, 96),
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function extractThemesFromWords(words: string[]): string[] {
  const themeBuckets: Record<string, string[]> = {
    love: ["love", "heart", "kiss", "baby", "forever"],
    nightlife: ["night", "club", "dance", "party", "neon"],
    freedom: ["free", "fly", "run", "escape", "wild"],
    struggle: ["fight", "pain", "broken", "rise", "strong"],
  };

  const scores: Record<string, number> = {};
  for (const [theme, keys] of Object.entries(themeBuckets)) {
    scores[theme] = words.filter((w) => keys.some((k) => w.includes(k))).length;
  }

  return Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t]) => t);
}