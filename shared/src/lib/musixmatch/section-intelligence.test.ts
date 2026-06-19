import { describe, expect, it } from "vitest";
import {
  analyzeSectionSentiments,
  generateMxmRewriteSuggestions,
  mapMxmMoodToStudioMood,
} from "@/lib/musixmatch/section-intelligence";
import { analyzeLyrics } from "@/lib/scoring/lyrics-analyzer";
import type { LyricsSections } from "@/types/studio";

const sections: LyricsSections = {
  intro: "",
  verse1: "Rain on the window cold and grey",
  verse2: "",
  chorus: "Feel the midnight pulse we never slow",
  bridge: "",
  outro: "",
  raw: "",
};

describe("analyzeSectionSentiments", () => {
  it("returns per-section sentiment rows", () => {
    const rows = analyzeSectionSentiments(sections, {
      moods: { main_moods: ["Empowerment"] },
      themes: { main_themes: [{ theme: "freedom" }] },
    });
    expect(rows.length).toBeGreaterThanOrEqual(2);
    expect(rows.find((r) => r.section === "chorus")?.sentiment).toBe("energetic");
  });
});

describe("mapMxmMoodToStudioMood", () => {
  it("maps catalog moods to studio mood options", () => {
    expect(mapMxmMoodToStudioMood({ moods: { main_moods: ["Heartbreak"] } })).toBe("Melancholic");
    expect(mapMxmMoodToStudioMood({ moods: { main_moods: ["Party"] } })).toBe("Energetic");
  });
});

describe("generateMxmRewriteSuggestions", () => {
  it("suggests aligning chorus with Musixmatch hook quote", () => {
    const structure = analyzeLyrics(sections.chorus);
    const tips = generateMxmRewriteSuggestions(
      sections,
      structure,
      {
        themes: {
          main_themes: [{ theme: "nightlife", quotes: ["Dance until the sunrise glow"] }],
        },
      },
      analyzeSectionSentiments(sections)
    );
    expect(tips.some((t) => t.id === "mxm-hook-align")).toBe(true);
  });
});