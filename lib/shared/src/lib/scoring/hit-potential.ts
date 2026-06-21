import type { HitPotential, LyricsStructure, ScoreBreakdown } from "@/types";
import type { AppTrack } from "@/lib/musixmatch/client";
import type { MxmAnalysisRaw } from "@/lib/musixmatch/types";
import { clamp } from "@/lib/utils";

const TRENDING_GENRES = new Set([
  "pop", "dance pop", "hip-hop/rap", "hip hop", "r&b", "indie pop",
  "electronic", "synth pop", "alternative",
]);

interface HitPotentialInput {
  track: AppTrack;
  lyrics: LyricsStructure;
  mxmAnalysis?: MxmAnalysisRaw | null;
}

function scoreBeatFit(track: AppTrack, lyrics: LyricsStructure): number {
  const duration = track.duration || 210;
  const idealDuration = duration >= 170 && duration <= 240 ? 22 : duration >= 150 ? 14 : 8;

  const genre = (track.genre ?? "").toLowerCase();
  const genreBoost = TRENDING_GENRES.has(genre) ? 18 : genre ? 10 : 5;

  const energyBoost =
    lyrics.sentiment === "energetic" ? 16 :
    lyrics.sentiment === "positive" ? 10 :
    lyrics.sentiment === "melancholic" ? 6 : 8;

  const richsyncBoost = lyrics.richsyncPowered ? 14 : track.hasRichsync ? 8 : 0;
  const hookTimingBoost =
    lyrics.hookWindowSec != null && lyrics.hookWindowSec <= 15
      ? 6
      : lyrics.hookWindowSec != null && lyrics.hookWindowSec > 45
        ? -4
        : 0;
  const ratingBoost = track.rating ? Math.min(15, (track.rating - 50) * 0.3) : 0;

  return clamp(
    Math.round(35 + idealDuration + genreBoost + energyBoost + richsyncBoost + hookTimingBoost + ratingBoost),
    45,
    95
  );
}

function scoreLyricVirality(lyrics: LyricsStructure): number {
  const hook = lyrics.hookStrength * 0.45;
  const repeat = lyrics.repetitionIndex * 0.25;
  const brevity = lyrics.wordCount < 280 ? 12 : lyrics.wordCount < 380 ? 6 : 0;
  const chorus = Math.min(15, lyrics.chorusCount * 4);
  const rhyme = lyrics.rhymeDensity != null ? lyrics.rhymeDensity * 0.12 : 0;

  // Chorus simplicity & length now first-class contributors (was indirect before)
  let chorusBonus = 0;
  if (lyrics.chorusSimplicity != null) {
    chorusBonus += (lyrics.chorusSimplicity - 50) * 0.18;
  }
  if (lyrics.chorusWordCount != null) {
    if (lyrics.chorusWordCount >= 5 && lyrics.chorusWordCount <= 14) chorusBonus += 6;
    else if (lyrics.chorusWordCount > 17) chorusBonus -= 8;
  }

  return clamp(Math.round(hook + repeat + brevity + chorus + rhyme + chorusBonus), 40, 94);
}

function scoreTrendAlignment(
  track: AppTrack,
  lyrics: LyricsStructure,
  mxmAnalysis?: MxmAnalysisRaw | null
): number {
  const genre = (track.genre ?? "").toLowerCase();
  let score = TRENDING_GENRES.has(genre) ? 28 : 14;

  const year = track.releaseYear ?? new Date().getFullYear();
  const recency = year >= 2024 ? 18 : year >= 2020 ? 10 : 4;
  score += recency;

  const moods = mxmAnalysis?.moods?.main_moods ?? [];
  const trendingMoods = ["Empowerment", "Party", "Love", "Celebration", "Hope"];
  const moodHits = moods.filter((m) => trendingMoods.includes(m)).length;
  score += moodHits * 6;

  if (lyrics.sentiment === "energetic") score += 10;
  if (lyrics.themes.some((t) => ["love", "nightlife", "freedom"].includes(t))) score += 8;
  if (lyrics.trendKeywordHits?.length) {
    score += clamp(lyrics.trendKeywordHits.length * 3, 0, 18);
  }

  const rating = mxmAnalysis?.rating?.audience;
  if (rating === "PG" || rating === "PG-13") score += 6;

  return clamp(Math.round(score), 38, 90);
}

export function computeHitPotential(input: HitPotentialInput): HitPotential {
  const { track, lyrics, mxmAnalysis } = input;

  const breakdown: ScoreBreakdown = {
    beatFit: scoreBeatFit(track, lyrics),
    lyricVirality: scoreLyricVirality(lyrics),
    trendAlignment: scoreTrendAlignment(track, lyrics, mxmAnalysis),
    hookStrength: lyrics.hookStrength,
  };

  const overall = clamp(
    Math.round(
      breakdown.beatFit * 0.25 +
      breakdown.lyricVirality * 0.3 +
      breakdown.trendAlignment * 0.2 +
      breakdown.hookStrength * 0.25
    ),
    35,
    96
  );

  const hasMxmAnalysis = Boolean(mxmAnalysis?.moods || mxmAnalysis?.themes);
  const confidence = clamp(
    62 + (track.hasAnalysis ? 12 : 0) + (hasMxmAnalysis ? 8 : 0) + (track.hasRichsync ? 4 : 0),
    60,
    92
  );

  const verdict: HitPotential["verdict"] =
    overall >= 78 ? "strong" : overall >= 62 ? "promising" : "needs-work";

  return { overall, breakdown, confidence, verdict };
}