import type { AppTrack } from "@/lib/musixmatch/client";
import type { TrackAnalysis } from "@/types";
import type { CreateProjectInput, LyricsSections } from "@/types/studio";
import { MOOD_OPTIONS } from "@/types/studio";
import { parseLyricsSections } from "@/lib/studio/lyrics";
import {
  mapCatalogGenre,
  mapMxmMoodToStudioMood,
} from "@/lib/musixmatch/section-intelligence";
import type { MxmAnalysisRaw } from "@/lib/musixmatch/types";

export interface CatalogMeta {
  spotifyId?: string;
  hasRichsync?: boolean;
  hasAnalysis?: boolean;
  mxmTrackId?: string;
  commontrackId?: string;
  isrc?: string;
  releaseYear?: number;
  mxmRating?: number;
  moods?: string[];
  themes?: string[];
  audienceRating?: string;
}

export function buildCatalogMeta(
  track: AppTrack,
  analysis?: TrackAnalysis,
  mxmAnalysis?: MxmAnalysisRaw | null
): CatalogMeta {
  const moods = mxmAnalysis?.moods?.main_moods;
  const themes = mxmAnalysis?.themes?.main_themes?.map((t) => t.theme);

  return {
    spotifyId: track.spotifyId,
    hasRichsync: track.hasRichsync ?? analysis?.meta?.hasRichsync,
    hasAnalysis: track.hasAnalysis ?? analysis?.meta?.hasAnalysis,
    mxmTrackId: track.id,
    commontrackId: track.commontrackId,
    isrc: track.isrc,
    releaseYear: track.releaseYear,
    mxmRating: track.rating,
    moods: moods?.slice(0, 4),
    themes: themes?.slice(0, 4),
    audienceRating: mxmAnalysis?.rating?.audience,
  };
}

/** Build sectioned lyrics from Musixmatch body or richsync-timed analysis. */
export function buildImportLyrics(
  analysis?: TrackAnalysis,
  lyricsBody?: string
): LyricsSections {
  if (lyricsBody?.trim()) {
    const parsed = parseLyricsSections(lyricsBody);
    if (parsed.chorus.trim() || parsed.verse1.trim() || parsed.raw.trim()) {
      return parsed;
    }
  }

  const timed = analysis?.lyrics.sections;
  if (timed?.length) {
    const byRepeat = [...timed].sort((a, b) => b.repeatCount - a.repeatCount);
    const chorusText = byRepeat[0]?.text ?? analysis!.lyrics.hookLine;
    const verseCandidates = timed.filter((s) => s.text !== chorusText);
    return {
      intro: "",
      verse1: verseCandidates[0]?.text ?? "",
      verse2: verseCandidates[1]?.text ?? "",
      chorus: chorusText,
      bridge: verseCandidates[2]?.text ?? "",
      outro: "",
      raw: "",
    };
  }

  const hook = analysis?.lyrics.hookLine ?? "";
  if (!hook) {
    return { intro: "", verse1: "", verse2: "", chorus: "", bridge: "", outro: "", raw: "" };
  }

    return {
      verse1: "",
      verse2: "",
      chorus: hook,
      bridge: "",
      intro: "",
      outro: "",
      raw: `[Chorus]\n${hook}`,
    };
}

export function buildCreateProjectInput(
  track: AppTrack,
  analysis?: TrackAnalysis,
  mxmAnalysis?: MxmAnalysisRaw | null
): CreateProjectInput {
  const sentiment = analysis?.lyrics.sentiment;
  const moodFallback: (typeof MOOD_OPTIONS)[number] =
    sentiment === "melancholic"
      ? "Melancholic"
      : sentiment === "energetic"
        ? "Energetic"
        : sentiment === "positive"
          ? "Uplifting"
          : "Energetic";

  const genre = mapCatalogGenre(track.genre ?? analysis?.track.genre);
  const mood = mapMxmMoodToStudioMood(mxmAnalysis, moodFallback);
  const mxmMoods = mxmAnalysis?.moods?.main_moods?.slice(0, 3);

  return {
    title: track.title,
    artistName: track.artist,
    genre,
    mood,
    genreTags: [genre],
    moodTags: mxmMoods?.length ? mxmMoods : [mood],
    bpmTarget: analysis?.energy.bpm,
  };
}