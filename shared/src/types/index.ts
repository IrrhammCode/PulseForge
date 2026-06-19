export interface Track {
  id: string;
  commontrackId?: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  coverUrl?: string;
  isrc?: string;
  genre?: string;
  releaseYear?: number;
  rating?: number;
  explicit?: boolean;
  hasRichsync?: boolean;
  hasAnalysis?: boolean;
  spotifyId?: string;
}

export interface MxmCoachContext {
  moods?: string[];
  themes?: string[];
  audienceRating?: string;
  hookQuote?: string;
}

export interface AnalysisMeta {
  lyricsLanguage?: string;
  poweredByMusixmatch: boolean;
  hasRichsync?: boolean;
  hasAnalysis?: boolean;
  demoMode?: boolean;
  cyaniteStatus?: string;
  songstatsStatus?: string;
  partners: string[];
  mxmCoach?: MxmCoachContext;
}

export interface RichsyncSectionInsight {
  text: string;
  startSec: number;
  endSec: number;
  repeatCount: number;
}

export interface SectionLyricsInsight {
  section: "intro" | "verse1" | "verse2" | "chorus" | "bridge" | "outro";
  label: string;
  sentiment: "positive" | "neutral" | "melancholic" | "energetic";
  wordCount: number;
  themes: string[];
}

export interface LyricsStructure {
  verses: number;
  chorusCount: number;
  hookLine: string;
  hookStrength: number;
  sentiment: "positive" | "neutral" | "melancholic" | "energetic";
  themes: string[];
  explicitScore: number;
  wordCount: number;
  repetitionIndex: number;
  /** Seconds until primary hook (from Musixmatch richsync). */
  hookWindowSec?: number;
  /** Richsync-powered structure flag. */
  richsyncPowered?: boolean;
  /** Timed sections derived from richsync. */
  sections?: RichsyncSectionInsight[];
  /** Per-section sentiment (Write tab / Rewrite Coach). */
  sectionInsights?: SectionLyricsInsight[];
  /** 0–100 end-rhyme density across lyric lines. */
  rhymeDensity?: number;
  /** Matched short-form / trend keywords (local + MXM themes). */
  trendKeywordHits?: string[];
  /** Word count of the primary chorus/hook block (richsync or repeated section). */
  chorusWordCount?: number;
  /** 0-100 simplicity/singability of chorus (short phrases, high internal repetition, low complexity). */
  chorusSimplicity?: number;
}

export interface SimilarTrackRef {
  id: string;
  title: string;
  artist: string;
  genre?: string;
  rating?: number;
  moods?: string[];
  themes?: string[];
  hookStrength?: number;
}

export interface CatalogBenchmark {
  similarTracks: SimilarTrackRef[];
  medianHookStrength?: number;
  medianRating?: number;
  source: "musixmatch" | "none";
}

export interface ScoreBreakdown {
  beatFit: number;
  lyricVirality: number;
  trendAlignment: number;
  hookStrength: number;
}

export interface HitPotential {
  overall: number;
  breakdown: ScoreBreakdown;
  confidence: number;
  verdict: "strong" | "promising" | "needs-work";
}

export interface SimulationPoint {
  week: number;
  plays: number;
  lower: number;
  upper: number;
}

export interface ListenerSimulation {
  targetPlays: number;
  probabilityToReach: number;
  medianWeeks: number;
  projectedPeak: number;
  curve: SimulationPoint[];
}

export interface EnergyProfile {
  bpm: number;
  energy: number;
  danceability: number;
  valence: number;
  loudness: number;
  waveform: number[];
  source?: "cyanite" | "cyanite-processing" | "estimated";
  key?: string;
  energyLevel?: string;
  energyDynamics?: string;
  moodTags?: string[];
  genreTags?: string[];
  movementTags?: string[];
  instrumentTags?: string[];
  caption?: string;
  /** Detected energy spike (beat drop) in seconds. */
  beatDropSec?: number;
  /** 0–100 strength of detected beat drop. */
  beatDropScore?: number;
  /** 0-100: overall production quality (loudness target, dynamics consistency, mix cleanliness). */
  productionQuality?: number;
  /** 0-100: vocal presence, level and clarity (stems + tags + waveform alignment). */
  vocalScore?: number;
}

export interface StreamingInsights {
  available: boolean;
  status: "ok" | "not_found" | "unavailable" | "error" | "pre_release";
  totalStreams: number;
  totalPlaylists: number;
  editorialPlaylists: number;
  shazams: number;
  tiktokCreates: number;
  chartPosition: number | null;
  velocityScore: number;
  platforms: Array<{
    platform: string;
    streams?: number;
    playlists?: number;
    editorialPlaylists?: number;
    shazams?: number;
    tiktokCreates?: number;
    chartPosition?: number | null;
  }>;
}

export type VelocityTrajectory = "accelerating" | "stable" | "decelerating";

export type Week1VelocityPattern = "breakout" | "steady" | "slow-burn" | "flat";

export interface VelocityHistoryPoint {
  date: string;
  streams: number;
  streamsTotal?: number;
}

export interface VelocityHistoryInsights {
  available: boolean;
  status: "ok" | "not_found" | "unavailable" | "error";
  trajectory: VelocityTrajectory;
  historicVelocityScore: number;
  week1GrowthPct?: number;
  week1Pattern?: Week1VelocityPattern;
  recentWeeklyDeltaPct?: number;
  avgDailyStreams?: number;
  dataPoints: VelocityHistoryPoint[];
  primaryPlatform?: string;
  windowDays?: number;
}

export interface WhatIfParams {
  marketingBudget: number;
  playlistPitchCount: number;
  tiktokSeedPosts: number;
  releaseTiming: "friday" | "monday" | "saturday";
}

export interface MarketingRecommendation {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: "social" | "playlist" | "content" | "timing";
  impactEstimate: number;
}

export interface ArtistMomentumInsights {
  available: boolean;
  status: "ok" | "not_found" | "unavailable" | "error";
  artistName: string;
  songstatsArtistId?: string;
  spotifyArtistId?: string;
  followers?: number;
  monthlyListeners?: number;
  catalogStreams?: number;
  momentumScore: number;
  tier: "emerging" | "rising" | "established" | "mega" | "unknown";
}

export interface TrendFeedSnapshot {
  keywords: string[];
  moods: string[];
  source: "live" | "curated" | "hybrid";
  refreshedAt: string;
}

export type ReleaseWindowRating = "optimal" | "good" | "neutral" | "weak";

export interface SeasonalContext {
  alignmentScore: number;
  activeMoments: string[];
  culturalTags: string[];
  releaseWindow: ReleaseWindowRating;
  releaseDate?: string;
  seasonalKeywords: string[];
  timingBoost: number;
  nextOptimalWindow?: string;
}

export interface ReleaseHistoryRecord {
  projectId: string;
  projectTitle: string;
  versionLabel: string;
  hitScore: number | null;
  prob1M: number | null;
  analyzedAt?: string;
}

export type ReleaseTrajectory = "improving" | "stable" | "declining" | "first-release";

export interface ReleaseHistoryInsights {
  available: boolean;
  priorReleases: number;
  avgHitScore?: number;
  avgProb1M?: number;
  bestHitScore?: number;
  trajectory: ReleaseTrajectory;
  records: ReleaseHistoryRecord[];
  historyBoost: number;
}

export interface TrackAnalysis {
  track: Track;
  lyrics: LyricsStructure;
  hitPotential: HitPotential;
  simulation: ListenerSimulation;
  energy: EnergyProfile;
  recommendations: MarketingRecommendation[];
  streaming?: StreamingInsights;
  velocityHistory?: VelocityHistoryInsights;
  meta?: AnalysisMeta;
  catalogBenchmark?: CatalogBenchmark;
  artistMomentum?: ArtistMomentumInsights;
  trendFeed?: TrendFeedSnapshot;
  seasonalContext?: SeasonalContext;
  releaseHistory?: ReleaseHistoryInsights;
  /** Pre-parsed lyrics for Import to Studio. */
  importLyrics?: import("@/types/studio").LyricsSections;
}