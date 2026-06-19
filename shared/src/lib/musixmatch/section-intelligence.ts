import type { LyricsStructure } from "@/types";
import type { LyricsSections } from "@/types/studio";
import { MOOD_OPTIONS, type CreateProjectInput } from "@/types/studio";
import type { MxmAnalysisRaw } from "@/lib/musixmatch/types";
import { analyzeLyrics } from "@/lib/scoring/lyrics-analyzer";
import type { RewriteSuggestion } from "@/lib/studio/lyrics";

import type { SectionLyricsInsight } from "@/types";

export type { SectionLyricsInsight };

const SECTION_LABELS: Record<keyof Omit<LyricsSections, "raw">, string> = {
  intro: "Intro",
  verse1: "Verse 1",
  verse2: "Verse 2",
  chorus: "Chorus",
  bridge: "Bridge",
  outro: "Outro",
};

const MXM_TO_STUDIO_MOOD: Record<string, (typeof MOOD_OPTIONS)[number]> = {
  Party: "Energetic",
  Celebration: "Energetic",
  Empowerment: "Uplifting",
  Joy: "Uplifting",
  Hope: "Uplifting",
  Inspiration: "Uplifting",
  Heartbreak: "Melancholic",
  Despair: "Melancholic",
  Nostalgia: "Melancholic",
  Angst: "Dark",
  Anger: "Aggressive",
  Love: "Romantic",
  Peace: "Chill",
  Solitude: "Chill",
  Nature: "Chill",
};

function normalizeForCompare(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
}

/** Per-section sentiment using PulseForge analyzer + Musixmatch moods on chorus. */
export function analyzeSectionSentiments(
  sections: LyricsSections,
  mxmAnalysis?: MxmAnalysisRaw | null
): SectionLyricsInsight[] {
  const globalThemes =
    mxmAnalysis?.themes?.main_themes?.map((t) => t.theme.toLowerCase()) ?? [];
  const globalMoods = mxmAnalysis?.moods?.main_moods ?? [];
  const keys = ["intro", "verse1", "verse2", "chorus", "bridge", "outro"] as const;

  return keys
    .filter((key) => sections[key].trim())
    .map((section) => {
      const mxmForSection = section === "chorus" ? mxmAnalysis : null;
      const analyzed = analyzeLyrics(sections[section], mxmForSection);
      let sentiment = analyzed.sentiment;

      if (section === "chorus") {
        if (globalMoods.some((m) => ["Party", "Celebration", "Empowerment", "Joy"].includes(m))) {
          sentiment = "energetic";
        } else if (globalMoods.some((m) => ["Heartbreak", "Despair", "Nostalgia"].includes(m))) {
          sentiment = sentiment === "energetic" ? "neutral" : "melancholic";
        }
      }

      return {
        section,
        label: SECTION_LABELS[section],
        sentiment,
        wordCount: analyzed.wordCount,
        themes: analyzed.themes.length > 0 ? analyzed.themes : globalThemes.slice(0, 3),
      };
    });
}

export function mapMxmMoodToStudioMood(
  mxmAnalysis?: MxmAnalysisRaw | null,
  fallback: (typeof MOOD_OPTIONS)[number] = "Energetic"
): (typeof MOOD_OPTIONS)[number] {
  const mood = mxmAnalysis?.moods?.main_moods?.[0];
  if (!mood) return fallback;
  return MXM_TO_STUDIO_MOOD[mood] ?? fallback;
}

export function mapCatalogGenre(genre?: string): string {
  if (!genre) return "Pop";
  const normalized = genre.toLowerCase();
  const match = [
    "Indie Pop",
    "Hip-Hop",
    "R&B",
    "Electronic",
    "Rock",
    "Afrobeats",
    "Latin",
    "Pop",
  ].find((g) => normalized.includes(g.toLowerCase().replace("-", "")) || g.toLowerCase() === normalized);
  return match ?? (genre.length > 2 ? genre : "Pop");
}

/** Musixmatch-aware rewrite tips layered on rule-based coach. */
export function generateMxmRewriteSuggestions(
  sections: LyricsSections,
  structure: LyricsStructure,
  mxmAnalysis?: MxmAnalysisRaw | null,
  sectionInsights?: SectionLyricsInsight[]
): RewriteSuggestion[] {
  if (!mxmAnalysis) return [];

  const suggestions: RewriteSuggestion[] = [];
  const themeQuote = mxmAnalysis.themes?.main_themes?.[0]?.quotes?.[0]?.replace(/^"|"$/g, "");
  const chorus = sections.chorus.trim();

  if (themeQuote && chorus) {
    const quoteNorm = normalizeForCompare(themeQuote);
    const chorusNorm = normalizeForCompare(chorus.split("\n")[0] ?? "");
    if (quoteNorm.length > 8 && !chorusNorm.includes(quoteNorm.slice(0, 12))) {
      suggestions.push({
        id: "mxm-hook-align",
        section: "chorus",
        type: "hook",
        message: `Musixmatch flags this hook quote: "${themeQuote}". Align your chorus with the catalog hook for stronger recognition.`,
        before: chorus.split("\n")[0],
        after: themeQuote,
      });
    }
  }

  if (structure.hookWindowSec != null && structure.hookWindowSec > 30) {
    suggestions.push({
      id: "mxm-late-hook",
      section: "general",
      type: "structure",
      message: `Richsync shows hook at ${structure.hookWindowSec.toFixed(0)}s. Move the memorable line into the first 15 seconds for streaming retention.`,
    });
  }

  const chorusInsight = sectionInsights?.find((s) => s.section === "chorus");
  const verseInsight = sectionInsights?.find((s) => s.section === "verse1");
  if (
    chorusInsight &&
    verseInsight &&
    verseInsight.sentiment === "melancholic" &&
    chorusInsight.sentiment !== "energetic" &&
    chorusInsight.sentiment !== "positive"
  ) {
    suggestions.push({
      id: "mxm-mood-contrast",
      section: "chorus",
      type: "structure",
      message:
        "Verse reads melancholic but chorus doesn't lift energy. Pop hits often contrast sad verses with an uplifting, repeatable chorus.",
    });
  }

  const audience = mxmAnalysis.rating?.audience;
  if (audience === "PG" || audience === "PG-13") {
    const explicitRx = /\b(damn|hell|shit|fuck|bitch)\b/i;
    const combined = [
      sections.intro,
      sections.verse1,
      sections.verse2,
      sections.chorus,
      sections.bridge,
      sections.outro,
    ].join("\n");
    if (explicitRx.test(combined)) {
      suggestions.push({
        id: "mxm-rating-explicit",
        section: "general",
        type: "vocabulary",
        message: `Catalog rating is ${audience} but lyrics include explicit words — consider cleaner language for playlist placement.`,
      });
    }
  }

  const moods = mxmAnalysis.moods?.main_moods?.slice(0, 2).join(", ");
  if (moods && !sections.chorus.trim()) {
    suggestions.push({
      id: "mxm-mood-chorus",
      section: "chorus",
      type: "hook",
      message: `Musixmatch moods (${moods}) suggest an ${mapMxmMoodToStudioMood(mxmAnalysis).toLowerCase()} chorus hook — draft it first.`,
    });
  }

  return suggestions.slice(0, 4);
}

export function attachSectionInsights(
  structure: LyricsStructure,
  sections: LyricsSections,
  mxmAnalysis?: MxmAnalysisRaw | null
): LyricsStructure {
  const insights = analyzeSectionSentiments(sections, mxmAnalysis);
  return { ...structure, sectionInsights: insights };
}