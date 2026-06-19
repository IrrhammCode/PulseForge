import type { LyricsStructure, MxmCoachContext, SectionLyricsInsight } from "@/types";
import type { LyricsSections } from "@/types/studio";
import type { TimelineSectionEdit, KnownTimelineSectionId } from "@/types/viral";
import { analyzeLyrics } from "@/lib/scoring/lyrics-analyzer";
import {
  analyzeSectionSentiments,
  generateMxmRewriteSuggestions,
} from "@/lib/musixmatch/section-intelligence";
import type { MxmAnalysisRaw } from "@/lib/musixmatch/types";

const SECTION_HEADERS: Record<keyof Omit<LyricsSections, "raw">, RegExp> = {
  intro: /^\[?\s*intro\s*\]?$/i,
  verse1: /^\[?\s*verse\s*1\s*\]?$/i,
  verse2: /^\[?\s*verse\s*2\s*\]?$/i,
  chorus: /^\[?\s*chorus\s*\]?$/i,
  bridge: /^\[?\s*bridge\s*\]?$/i,
  outro: /^\[?\s*outro\s*\]?$/i,
};

export type LyricsSectionKey = keyof Omit<LyricsSections, "raw">;

export const LYRICS_SECTION_ORDER: LyricsSectionKey[] = [
  "intro",
  "verse1",
  "chorus",
  "verse2",
  "bridge",
  "outro",
];

type SectionKey = LyricsSectionKey;

/** Map NLE timeline section id → lyrics field (chorus1/chorus2 both → chorus). */
export function mapTimelineSectionToLyricsKey(sectionId: string): LyricsSectionKey | "raw" {
  const sid = sectionId.toLowerCase();
  if (sid.includes("intro")) return "intro";
  if (sid.includes("outro")) return "outro";
  if (sid.includes("chorus")) return "chorus";
  if (sid.includes("verse2")) return "verse2";
  if (sid.includes("bridge")) return "bridge";
  if (sid.includes("verse1") || sid === "verse1") return "verse1";
  return "raw";
}

export function sectionWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Proportional timeline sections from lyrics word counts (includes intro/outro when filled). */
export function buildLyricsTimelineFromWordCounts(lyrics: LyricsSections): TimelineSectionEdit[] {
  const raw: { sectionId: KnownTimelineSectionId; weight: number }[] = [
    { sectionId: "intro", weight: sectionWordCount(lyrics.intro) },
    { sectionId: "verse1", weight: sectionWordCount(lyrics.verse1) },
    { sectionId: "chorus1", weight: sectionWordCount(lyrics.chorus) },
    { sectionId: "verse2", weight: sectionWordCount(lyrics.verse2) },
    { sectionId: "chorus2", weight: sectionWordCount(lyrics.chorus) },
    { sectionId: "bridge", weight: sectionWordCount(lyrics.bridge) },
    { sectionId: "outro", weight: sectionWordCount(lyrics.outro) },
  ];
  const entries = raw.filter((e) => e.weight > 0);

  const total = entries.reduce((sum, e) => sum + e.weight, 0) || 1;
  let cursor = 0;
  return entries.map((e) => {
    const widthPercent = (e.weight / total) * 100;
    const section: TimelineSectionEdit = {
      sectionId: e.sectionId,
      startPercent: cursor,
      widthPercent,
    };
    cursor += widthPercent;
    return section;
  });
}

/** Best line for voice preview (chorus first, then first non-empty section). */
export function getHookPreviewText(sections: LyricsSections): string {
  const chorusLine = sections.chorus
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  if (chorusLine) return chorusLine;

  for (const key of ["intro", "verse1", "verse2", "chorus", "bridge", "outro"] as const) {
    const line = sections[key]
      .split("\n")
      .map((l) => l.trim())
      .find(Boolean);
    if (line) return line;
  }

  const rawLine = sections.raw
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l && !/^\[.+\]$/.test(l));
  return rawLine ?? "";
}

export function composeLyricsBody(sections: LyricsSections): string {
  if (sections.raw.trim()) return sections.raw.trim();

  const blocks: string[] = [];
  const add = (label: string, text: string) => {
    if (text.trim()) blocks.push(`${label}\n${text.trim()}`);
  };

  add("[Intro]", sections.intro);
  add("[Verse 1]", sections.verse1);
  add("[Chorus]", sections.chorus);
  add("[Verse 2]", sections.verse2);
  add("[Bridge]", sections.bridge);
  add("[Outro]", sections.outro);

  return blocks.join("\n\n");
}

export function parseLyricsSections(body: string): LyricsSections {
  const trimmed = body.trim();
  if (!trimmed) {
    return { intro: "", verse1: "", verse2: "", chorus: "", bridge: "", outro: "", raw: "" };
  }

  const lines = trimmed.split("\n");
  const sections: Record<SectionKey, string[]> = {
    intro: [],
    verse1: [],
    verse2: [],
    chorus: [],
    bridge: [],
    outro: [],
  };

  let current: SectionKey | null = null;
  let hasHeaders = false;

  for (const line of lines) {
    const header = (Object.entries(SECTION_HEADERS) as [SectionKey, RegExp][]).find(
      ([, rx]) => rx.test(line.trim())
    );
    if (header) {
      hasHeaders = true;
      current = header[0];
      continue;
    }
    if (current) sections[current].push(line);
  }

  if (!hasHeaders) {
    return { intro: "", verse1: "", verse2: "", chorus: "", bridge: "", outro: "", raw: trimmed };
  }

  return {
    intro: sections.intro.join("\n").trim(),
    verse1: sections.verse1.join("\n").trim(),
    verse2: sections.verse2.join("\n").trim(),
    chorus: sections.chorus.join("\n").trim(),
    bridge: sections.bridge.join("\n").trim(),
    outro: sections.outro.join("\n").trim(),
    raw: "",
  };
}

export function hasLyricsContent(sections: LyricsSections): boolean {
  return Boolean(
    sections.raw.trim() ||
      sections.intro.trim() ||
      sections.verse1.trim() ||
      sections.verse2.trim() ||
      sections.chorus.trim() ||
      sections.bridge.trim() ||
      sections.outro.trim()
  );
}

export function wordCount(text: string): number {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2).length;
}

export interface SectionDiff {
  section: SectionKey;
  label: string;
  changed: boolean;
  before: string;
  after: string;
}

const SECTION_LABELS: Record<SectionKey, string> = {
  intro: "Intro",
  verse1: "Verse 1",
  verse2: "Verse 2",
  chorus: "Chorus",
  bridge: "Bridge",
  outro: "Outro",
};

export function diffLyricsSections(a: LyricsSections, b: LyricsSections): SectionDiff[] {
  const keys: SectionKey[] = LYRICS_SECTION_ORDER;
  return keys.map((section) => {
    const before = a[section].trim();
    const after = b[section].trim();
    return {
      section,
      label: SECTION_LABELS[section],
      changed: before !== after,
      before,
      after,
    };
  });
}

export interface RewriteSuggestion {
  id: string;
  section: SectionKey | "general";
  type: "shorten" | "repeat" | "hook" | "structure" | "vocabulary";
  message: string;
  before?: string;
  after?: string;
}

const FILLER_WORDS = ["just", "really", "very", "maybe", "kind of", "sort of"];

function mxmCoachToAnalysis(mxmCoach?: MxmCoachContext): MxmAnalysisRaw | null {
  if (!mxmCoach) return null;
  return {
    moods: mxmCoach.moods ? { main_moods: mxmCoach.moods } : undefined,
    themes: mxmCoach.themes
      ? {
          main_themes: mxmCoach.themes.map((theme) => ({
            theme,
            quotes: mxmCoach.hookQuote ? [mxmCoach.hookQuote] : undefined,
          })),
        }
      : undefined,
    rating: mxmCoach.audienceRating ? { audience: mxmCoach.audienceRating } : undefined,
  };
}

export function generateRewriteSuggestions(
  sections: LyricsSections,
  structure?: LyricsStructure,
  mxmCoach?: MxmCoachContext
): RewriteSuggestion[] {
  const suggestions: RewriteSuggestion[] = [];
  const body = composeLyricsBody(sections);
  const analyzed = structure ?? analyzeLyrics(body);
  const mxmAnalysis = mxmCoachToAnalysis(mxmCoach);
  const sectionInsights: SectionLyricsInsight[] =
    analyzed.sectionInsights ?? analyzeSectionSentiments(sections, mxmAnalysis);

  const mxmTips = generateMxmRewriteSuggestions(
    sections,
    analyzed,
    mxmAnalysis,
    sectionInsights
  );
  suggestions.push(...mxmTips);

  if (!hasLyricsContent(sections)) {
    suggestions.push({
      id: "empty",
      section: "general",
      type: "structure",
      message: "Start with a chorus hook — listeners decide in the first 8 seconds.",
    });
    return suggestions;
  }

  if (!sections.chorus.trim() && !sections.raw.trim()) {
    suggestions.push({
      id: "missing-chorus",
      section: "chorus",
      type: "structure",
      message: "Add a chorus section. Repeatable hooks drive memorability and streaming saves.",
    });
  }

  if (analyzed.hookStrength < 65 && sections.chorus.trim()) {
    const lines = sections.chorus.split("\n").filter((l) => l.trim());
    const longest = lines.reduce((a, b) => (a.split(/\s+/).length >= b.split(/\s+/).length ? a : b), "");
    if (longest.split(/\s+/).length > 8) {
      const shortened = longest.split(/\s+/).slice(0, 6).join(" ");
      suggestions.push({
        id: "shorten-hook",
        section: "chorus",
        type: "hook",
        message: "Shorten your hook line — punchier phrases score higher on memorability.",
        before: longest,
        after: shortened,
      });
    }
  }

  if (analyzed.repetitionIndex < 45 && sections.chorus.trim()) {
    const hook = sections.chorus.split("\n")[0]?.trim();
    if (hook) {
      suggestions.push({
        id: "repeat-hook",
        section: "chorus",
        type: "repeat",
        message: "Repeat the opening chorus line once more to boost repetition index.",
        before: sections.chorus,
        after: `${hook}\n${sections.chorus}`,
      });
    }
  }

  for (const [section, text] of Object.entries(sections) as [SectionKey, string][]) {
    if (!text.trim()) continue;
    const lines = text.split("\n");
    for (const line of lines) {
      const words = line.trim().split(/\s+/);
      if (words.length > 14) {
        suggestions.push({
          id: `shorten-${section}-${line.slice(0, 12)}`,
          section,
          type: "shorten",
          message: `Line in ${SECTION_LABELS[section]} is long (${words.length} words). Try splitting or trimming.`,
          before: line.trim(),
          after: words.slice(0, 10).join(" ") + "…",
        });
        break;
      }
    }
  }

  if (!sections.bridge.trim() && !sections.raw.trim() && sections.verse1.trim()) {
    suggestions.push({
      id: "add-bridge",
      section: "bridge",
      type: "structure",
      message: "Consider a bridge for contrast before the final chorus — adds dynamic range.",
    });
  }

  if (analyzed.wordCount > 420) {
    suggestions.push({
      id: "trim-length",
      section: "general",
      type: "shorten",
      message: `Lyrics are ${analyzed.wordCount} words. Pop tracks often land under 300 for stronger hook density.`,
    });
  }

  const combined = [
    sections.intro,
    sections.verse1,
    sections.verse2,
    sections.chorus,
    sections.bridge,
    sections.outro,
  ].join("\n");
  for (const filler of FILLER_WORDS) {
    const rx = new RegExp(`\\b${filler}\\b`, "gi");
    const match = combined.match(rx);
    if (match && match.length >= 2) {
      suggestions.push({
        id: `filler-${filler}`,
        section: "general",
        type: "vocabulary",
        message: `Reduce "${filler}" (${match.length}×) — tighter language reads more confident on streaming.`,
      });
      break;
    }
  }

  return suggestions.slice(0, 8);
}

export function applySuggestion(
  sections: LyricsSections,
  suggestion: RewriteSuggestion
): LyricsSections {
  if (!suggestion.after || suggestion.section === "general") return sections;

  const next = { ...sections, raw: "" };
  if (suggestion.type === "repeat" || suggestion.type === "hook") {
    next[suggestion.section] = suggestion.after;
  } else if (suggestion.before && suggestion.after) {
    const current = next[suggestion.section];
    next[suggestion.section] = current.replace(suggestion.before, suggestion.after.replace(/…$/, ""));
  }
  return next;
}