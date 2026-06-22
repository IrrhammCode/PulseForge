import { describe, expect, it } from "vitest";
import {
  buildCatalogMeta,
  buildCreateProjectInput,
  buildImportLyrics,
} from "@/lib/studio/catalog-import";
import type { AppTrack } from "@/lib/musixmatch/client";
import type { TrackAnalysis } from "@/types";

const track: AppTrack = {
  id: "99",
  commontrackId: "88",
  title: "Midnight Drive",
  artist: "Nova Ray",
  album: undefined,
  duration: 200,
  coverUrl: undefined,
  genre: "Dance Pop",
  releaseYear: 2024,
  rating: 85,
  explicit: false,
  hasRichsync: true,
  hasAnalysis: true,
  spotifyId: "abc",
  isrc: "USUM72400001",
};

describe("buildCreateProjectInput", () => {
  it("maps genre and mxm mood into studio project fields", () => {
    const input = buildCreateProjectInput(track, undefined, {
      moods: { main_moods: ["Empowerment"] },
    });
    expect(input.genre).toBe("Pop");
    expect(input.mood).toBe("Uplifting");
    expect(input.title).toBe("Midnight Drive");
  });
});

describe("buildCatalogMeta", () => {
  it("captures mxm identifiers and release year", () => {
    const meta = buildCatalogMeta(track, undefined, {
      moods: { main_moods: ["Party"] },
      themes: { main_themes: [{ theme: "nightlife" }] },
      rating: { audience: "PG-13" },
    });
    expect(meta.mxmTrackId).toBe("99");
    expect(meta.releaseYear).toBe(2024);
    expect(meta.moods).toContain("Party");
    expect(meta.audienceRating).toBe("PG-13");
  });
});

describe("buildImportLyrics", () => {
  it("uses richsync sections when available", () => {
    const analysis = {
      lyrics: {
        hookLine: "Hook line",
        sections: [
          { text: "Verse line one", startSec: 0, endSec: 10, repeatCount: 1 },
          { text: "Chorus hook here", startSec: 20, endSec: 30, repeatCount: 3 },
        ],
      },
    } as TrackAnalysis;
    const lyrics = buildImportLyrics(analysis);
    expect(lyrics.chorus).toContain("Chorus hook");
    expect(lyrics.verse1).toContain("Verse");
  });
});