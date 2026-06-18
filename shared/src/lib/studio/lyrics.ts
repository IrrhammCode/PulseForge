import type { LyricsStructure, MxmCoachContext, SectionLyricsInsight } from "@/types";
import type { LyricsSections } from "@/types/studio";
import { analyzeLyrics } from "@/lib/scoring/lyrics-analyzer";
import {
  analyzeSectionSentiments,
  generateMxmRewriteSuggestions,
} from "@/lib/musixmatch/section-intelligence";
import type { MxmAnalysisRaw } from "@/lib/musixmatch/types";

const SECTION_HEADERS: Record<keyof Omit<LyricsSections, "raw">, RegExp> = {
  verse1: /^\[?\s*verse\s*1\s*\]?$/i,
  verse2: /^\[?\s*verse\s*2\s*\]?$/i,
  chorus: /^\[?\s*chorus\s*\]?$/i,
  bridge: /^\[?\s*bridge\s*\]?$/i,
};

type SectionKey = keyof Omit<LyricsSections, "raw">;

/** Best line for voice preview (chorus first, then first non-empty section). */
export function getHookPreviewText(sections: LyricsSections): string {
  const chorusLine = sections.chorus
    .split("\n")
    .map((l) => l.trim())
    .find(Boolean);
  if (chorusLine) return chorusLine;

  for (const key of ["verse1", "verse2", "bridge"] as const) {
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

  add("[Verse 1]", sections.verse1);
  add("[Verse 2]", sections.verse2);
  add("[Chorus]", sections.chorus);
  add("[Bridge]", sections.bridge);

  return blocks.join("\n\n");
}

export function parseLyricsSections(body: string): LyricsSections {
  const trimmed = body.trim();
  if (!trimmed) {
    return { verse1: "", verse2: "", chorus: "", bridge: "", raw: "" };
  }

  const lines = trimmed.split("\n");
  const sections: Record<SectionKey, string[]> = {
    verse1: [],
    verse2: [],
    chorus: [],
    bridge: [],
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
    return { verse1: "", verse2: "", chorus: "", bridge: "", raw: trimmed };
  }

  return {
    verse1: sections.verse1.join("\n").trim(),
    verse2: sections.verse2.join("\n").trim(),
    chorus: sections.chorus.join("\n").trim(),
    bridge: sections.bridge.join("\n").trim(),
    raw: "",
  };
}

export function hasLyricsContent(sections: LyricsSections): boolean {
  return Boolean(
    sections.raw.trim() ||
      sections.verse1.trim() ||
      sections.verse2.trim() ||
      sections.chorus.trim() ||
      sections.bridge.trim()
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
  verse1: "Verse 1",
  verse2: "Verse 2",
  chorus: "Chorus",
  bridge: "Bridge",
};

export function diffLyricsSections(a: LyricsSections, b: LyricsSections): SectionDiff[] {
  const keys: SectionKey[] = ["verse1", "verse2", "chorus", "bridge"];
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

  const combined = [sections.verse1, sections.verse2, sections.chorus, sections.bridge].join("\n");
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