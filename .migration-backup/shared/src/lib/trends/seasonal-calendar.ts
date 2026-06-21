import type { ReleaseWindowRating, SeasonalContext } from "@/types";
import { clamp } from "@/lib/utils";

export type { ReleaseWindowRating, SeasonalContext };

interface CulturalMoment {
  id: string;
  label: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  themes: string[];
  genreFit: string[];
  keywords: string[];
  releaseBoost: number;
}

/** Fixed cultural calendar — no external API required. */
export const CULTURAL_MOMENTS_2026: CulturalMoment[] = [
  {
    id: "new-year",
    label: "New Year reset",
    startMonth: 12,
    startDay: 26,
    endMonth: 1,
    endDay: 10,
    themes: ["hope", "freedom", "party"],
    genreFit: ["pop", "dance", "electronic", "hip-hop"],
    keywords: ["new", "tonight", "forever", "rise", "2026"],
    releaseBoost: 0.05,
  },
  {
    id: "valentines",
    label: "Valentine's season",
    startMonth: 2,
    startDay: 1,
    endMonth: 2,
    endDay: 18,
    themes: ["love", "romance"],
    genreFit: ["pop", "r&b", "indie pop"],
    keywords: ["love", "heart", "forever", "baby", "kiss"],
    releaseBoost: 0.06,
  },
  {
    id: "spring-break",
    label: "Spring break",
    startMonth: 3,
    startDay: 8,
    endMonth: 3,
    endDay: 28,
    themes: ["freedom", "party", "nightlife"],
    genreFit: ["pop", "dance", "hip-hop", "electronic"],
    keywords: ["party", "dance", "wild", "summer", "friends"],
    releaseBoost: 0.05,
  },
  {
    id: "pride",
    label: "Pride month",
    startMonth: 6,
    startDay: 1,
    endMonth: 6,
    endDay: 30,
    themes: ["freedom", "love", "empowerment"],
    genreFit: ["pop", "dance", "electronic", "indie pop"],
    keywords: ["shine", "free", "love", "dance", "energy"],
    releaseBoost: 0.07,
  },
  {
    id: "summer-festival",
    label: "Summer festival season",
    startMonth: 6,
    startDay: 10,
    endMonth: 8,
    endDay: 31,
    themes: ["nightlife", "party", "freedom"],
    genreFit: ["pop", "dance", "electronic", "edm", "house", "hip-hop"],
    keywords: ["summer", "night", "dance", "heat", "party", "midnight"],
    releaseBoost: 0.08,
  },
  {
    id: "back-to-school",
    label: "Back-to-school",
    startMonth: 8,
    startDay: 15,
    endMonth: 9,
    endDay: 12,
    themes: ["nostalgia", "freedom", "love"],
    genreFit: ["pop", "indie pop", "hip-hop", "alternative"],
    keywords: ["again", "friends", "phone", "crazy", "late night"],
    releaseBoost: 0.04,
  },
  {
    id: "halloween",
    label: "Halloween season",
    startMonth: 10,
    startDay: 10,
    endMonth: 11,
    endDay: 2,
    themes: ["dark", "nightlife", "freedom"],
    genreFit: ["electronic", "pop", "hip-hop", "alternative"],
    keywords: ["ghost", "dark", "night", "crazy", "body"],
    releaseBoost: 0.06,
  },
  {
    id: "holiday",
    label: "Holiday season",
    startMonth: 11,
    startDay: 20,
    endMonth: 12,
    endDay: 25,
    themes: ["love", "hope", "party"],
    genreFit: ["pop", "r&b", "indie pop"],
    keywords: ["holiday", "forever", "love", "family", "night"],
    releaseBoost: 0.07,
  },
];

function dayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / 86_400_000);
}

function momentDayKey(month: number, day: number, year: number): number {
  return dayOfYear(new Date(year, month - 1, day));
}

function isInMoment(date: Date, moment: CulturalMoment): boolean {
  const y = date.getFullYear();
  const d = dayOfYear(date);
  const start = momentDayKey(moment.startMonth, moment.startDay, y);
  let end = momentDayKey(moment.endMonth, moment.endDay, y);

  if (moment.startMonth > moment.endMonth) {
    // wraps year (e.g. Dec → Jan)
    return d >= start || d <= end;
  }

  if (end < start) end += 365;
  return d >= start && d <= end;
}

function genreMatches(genre: string | undefined, fit: string[]): boolean {
  if (!genre) return false;
  const g = genre.toLowerCase();
  return fit.some((f) => g.includes(f.toLowerCase()));
}

function themeOverlap(themes: string[], momentThemes: string[]): number {
  const normalized = themes.map((t) => t.toLowerCase());
  return momentThemes.filter((t) => normalized.some((n) => n.includes(t))).length;
}

function ratingFromBoost(boost: number): ReleaseWindowRating {
  if (boost >= 0.07) return "optimal";
  if (boost >= 0.05) return "good";
  if (boost >= 0.03) return "neutral";
  return "weak";
}

export function evaluateSeasonalContext(input: {
  releaseDate?: string;
  genre?: string;
  lyricsThemes?: string[];
  now?: Date;
}): SeasonalContext {
  const now = input.now ?? new Date();
  const evalDate = input.releaseDate ? new Date(input.releaseDate) : now;
  const themes = input.lyricsThemes ?? [];

  const active = CULTURAL_MOMENTS_2026.filter((m) => isInMoment(evalDate, m));
  const activeMoments = active.map((m) => m.label);

  let boost = 0;
  const culturalTags: string[] = [];
  const seasonalKeywords: string[] = [];

  for (const moment of active) {
    const genreHit = genreMatches(input.genre, moment.genreFit);
    const themeHits = themeOverlap(themes, moment.themes);
    const momentBoost =
      moment.releaseBoost * (genreHit ? 1 : 0.45) + themeHits * 0.015;
    boost = Math.max(boost, momentBoost);
    culturalTags.push(...moment.themes);
    seasonalKeywords.push(...moment.keywords);
  }

  if (!active.length) {
    boost = 0.02;
  }

  const alignmentScore = clamp(Math.round(42 + boost * 420 + themeOverlap(themes, culturalTags) * 4), 35, 95);
  const releaseWindow = ratingFromBoost(boost);
  const timingBoost = clamp(boost, 0, 0.09);

  const upcoming = CULTURAL_MOMENTS_2026.find((m) => !isInMoment(now, m) && genreMatches(input.genre, m.genreFit));

  return {
    alignmentScore,
    activeMoments,
    culturalTags: [...new Set(culturalTags)].slice(0, 6),
    releaseWindow,
    releaseDate: input.releaseDate,
    seasonalKeywords: [...new Set(seasonalKeywords)].slice(0, 12),
    timingBoost,
    nextOptimalWindow: upcoming?.label,
  };
}