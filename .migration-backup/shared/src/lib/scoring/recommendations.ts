import type {
  ArtistMomentumInsights,
  EnergyProfile,
  LyricsStructure,
  MarketingRecommendation,
  ReleaseHistoryInsights,
  SeasonalContext,
  StreamingInsights,
  TrendFeedSnapshot,
  VelocityHistoryInsights,
  WhatIfParams,
  HitPotential,
} from "@/types";
import type { AppTrack } from "@/lib/musixmatch/client";
import type { ViralGap } from "@/types/viral";

export function generateRecommendations(
  track: AppTrack,
  lyrics: LyricsStructure,
  hitPotential: HitPotential,
  params: WhatIfParams,
  streaming?: StreamingInsights,
  energy?: EnergyProfile,
  velocityHistory?: VelocityHistoryInsights,
  artistMomentum?: ArtistMomentumInsights,
  trendFeed?: TrendFeedSnapshot,
  seasonalContext?: SeasonalContext,
  releaseHistory?: ReleaseHistoryInsights,
  gaps?: ViralGap[]
): MarketingRecommendation[] {
  const recs: MarketingRecommendation[] = [];

  if (seasonalContext?.releaseWindow === "optimal") {
    recs.push({
      id: "seasonal-window",
      title: "Release aligns with cultural moment",
      description: `Active window: ${seasonalContext.activeMoments.join(", ") || "seasonal peak"}. Lean into ${seasonalContext.culturalTags.slice(0, 2).join(" + ") || "current themes"} in clip creative while momentum is high.`,
      priority: "high",
      category: "timing",
      impactEstimate: Math.min(20, Math.round(seasonalContext.alignmentScore * 0.18)),
    });
  } else if (seasonalContext?.nextOptimalWindow) {
    recs.push({
      id: "seasonal-shift",
      title: "Consider shifting release window",
      description: `Current timing is ${seasonalContext.releaseWindow}. Next genre-fit window: ${seasonalContext.nextOptimalWindow}.`,
      priority: "medium",
      category: "timing",
      impactEstimate: 11,
    });
  }

  if (releaseHistory?.trajectory === "improving") {
    recs.push({
      id: "artist-trajectory-up",
      title: "Ride improving release trajectory",
      description: `Prior ${releaseHistory.priorReleases} release(s) avg hit ${releaseHistory.avgHitScore ?? "—"}. Momentum is up — stack content drops 2×/week for the first month.`,
      priority: "medium",
      category: "social",
      impactEstimate: 14,
    });
  } else if (releaseHistory?.trajectory === "declining") {
    recs.push({
      id: "artist-trajectory-reset",
      title: "Reset creative formula",
      description:
        "Recent releases scored below your peak. A/B test a new hook structure and shorter intro before scaling paid seeding.",
      priority: "high",
      category: "content",
      impactEstimate: 16,
    });
  }

  // TikTok — always relevant for indie; boost if hook is strong
  if (lyrics.hookStrength >= 65) {
    recs.push({
      id: "tiktok-hook",
      title: "Seed TikTok with hook-first clips",
      description: `Lead with "${lyrics.hookLine}" in the first 2 seconds. ${
        params.tiktokSeedPosts < 5
          ? "Increase seed posts to 5+ for stronger week-1 velocity."
          : "Your TikTok seed count looks solid — test 3 hook variations."
      }`,
      priority: lyrics.hookStrength >= 75 ? "high" : "medium",
      category: "social",
      impactEstimate: Math.min(24, Math.round(lyrics.hookStrength * 0.22)),
    });
  }

  // Playlist pitching
  const genre = track.genre ?? "pop";
  recs.push({
    id: "playlist-pitch",
    title: "Pitch to editorial & indie playlists",
    description: `Target ${Math.max(8, params.playlistPitchCount + 3)} curators in ${genre}. ${
      hitPotential.breakdown.beatFit >= 70
        ? "Highlight BPM and energy fit for workout/mood playlists."
        : "Focus on lyrical storytelling playlists given your hook strength."
    }`,
    priority: params.playlistPitchCount < 8 ? "high" : "medium",
    category: "playlist",
    impactEstimate: Math.round(14 + hitPotential.breakdown.trendAlignment * 0.1),
  });

  // Release timing
  if (params.releaseTiming !== "friday") {
    recs.push({
      id: "release-friday",
      title: "Shift release to Friday 00:00",
      description:
        "Friday drops align with weekend discovery cycles on Spotify and Apple Music. Pair with a pre-save campaign 2 weeks out.",
      priority: "medium",
      category: "timing",
      impactEstimate: 12,
    });
  }

  // Lyric cards
  recs.push({
    id: "lyric-cards",
    title: "Create lyric quote cards",
    description: `Export 4 branded quote cards from "${lyrics.hookLine}" for Instagram Stories, Pinterest, and Spotify Canvas.`,
    priority: "medium",
    category: "content",
    impactEstimate: Math.round(8 + lyrics.hookStrength * 0.06),
  });

  // Budget
  if (params.marketingBudget < 1500 && hitPotential.overall >= 65) {
    recs.push({
      id: "boost-budget",
      title: "Increase launch marketing budget",
      description:
        "Simulations show diminishing returns below $1,500 for tracks with your hit profile. Allocate toward micro-influencer seeding.",
      priority: "high",
      category: "social",
      impactEstimate: 16,
    });
  }

  // Theme-specific
  if (lyrics.themes.includes("love") || lyrics.sentiment === "melancholic") {
    recs.push({
      id: "emotional-playlists",
      title: "Target emotional storytelling playlists",
      description:
        "Your lyrical themes align with 'sad girl autumn' and heartbreak editorial lists. Pitch with a personal artist story.",
      priority: "medium",
      category: "playlist",
      impactEstimate: 13,
    });
  }

  if (lyrics.sentiment === "energetic" || lyrics.themes.includes("nightlife")) {
    recs.push({
      id: "dance-creators",
      title: "Partner with dance creators",
      description:
        "Commission 3 dance choreo videos in week 1. Energetic tracks see 2.3× higher TikTok save rates with movement content.",
      priority: "high",
      category: "social",
      impactEstimate: 19,
    });
  }

  if (artistMomentum?.available && artistMomentum.tier === "rising") {
    recs.push({
      id: "artist-momentum-rising",
      title: "Leverage rising artist momentum",
      description: `Songstats artist score ${artistMomentum.momentumScore}/100 (${artistMomentum.tier}). Release while audience is growing — prioritize fan activation posts and pre-save CTAs in the first 72 hours.`,
      priority: "high",
      category: "social",
      impactEstimate: Math.min(20, Math.round(artistMomentum.momentumScore * 0.22)),
    });
  } else if (artistMomentum?.available && artistMomentum.tier === "emerging") {
    recs.push({
      id: "artist-momentum-emerging",
      title: "Build artist base before scale",
      description:
        "Emerging artist profile — compound TikTok seeds and micro-influencer reposts before pushing paid ads. Viral lift depends on hook + consistent posting cadence.",
      priority: "medium",
      category: "social",
      impactEstimate: 14,
    });
  }

  if (trendFeed?.keywords.length && lyrics.trendKeywordHits?.length) {
    recs.push({
      id: "trend-keyword-alignment",
      title: "Ride current short-form themes",
      description: `Lyrics align with ${trendFeed.source} trend feed (${lyrics.trendKeywordHits.slice(0, 3).join(", ")}). Mirror these themes in clip captions and hashtag sets this week.`,
      priority: "medium",
      category: "content",
      impactEstimate: 12,
    });
  }

  if (velocityHistory?.available && velocityHistory.trajectory === "accelerating") {
    recs.push({
      id: "historic-velocity-accelerating",
      title: "Ride accelerating stream velocity",
      description: `Songstats historic data shows ${velocityHistory.trajectory} trajectory (${velocityHistory.recentWeeklyDeltaPct != null ? `${velocityHistory.recentWeeklyDeltaPct > 0 ? "+" : ""}${velocityHistory.recentWeeklyDeltaPct}%` : "positive"} week-over-week). Week-1 pattern: ${velocityHistory.week1Pattern ?? "steady"}. Push playlist pitches and creator seeding this week while momentum compounds.`,
      priority: "high",
      category: "playlist",
      impactEstimate: Math.min(20, Math.round((velocityHistory.historicVelocityScore ?? 0) * 0.22)),
    });
  }

  if (velocityHistory?.available && velocityHistory.trajectory === "decelerating") {
    recs.push({
      id: "historic-velocity-decelerating",
      title: "Refresh creative to reverse stream decay",
      description: `Daily streams are decelerating vs the prior week. Ship a new hook-led clip or remix teaser before the curve flattens further.`,
      priority: "medium",
      category: "content",
      impactEstimate: 14,
    });
  }

  // Songstats-driven recommendations
  if (streaming?.available && streaming.velocityScore >= 50) {
    recs.push({
      id: "songstats-momentum",
      title: "Ride existing streaming momentum",
      description: `Songstats shows ${streaming.totalStreams.toLocaleString()} total streams and velocity score ${streaming.velocityScore}. Double down on platforms already moving — prioritize ${streaming.platforms[0]?.platform ?? "Spotify"} in your launch plan.`,
      priority: "high",
      category: "playlist",
      impactEstimate: Math.min(22, Math.round(streaming.velocityScore * 0.25)),
    });
  }

  if (streaming?.status === "pre_release") {
    recs.push({
      id: "pre-release-baseline",
      title: "Establish pre-release baseline",
      description:
        "No Songstats data yet — typical for unreleased tracks. Set up Spotify for Artists pre-save and track ISRC before launch so Songstats can monitor velocity from day one.",
      priority: "medium",
      category: "timing",
      impactEstimate: 11,
    });
  }

  if (streaming?.tiktokCreates && streaming.tiktokCreates > 100) {
    recs.push({
      id: "tiktok-amplify",
      title: "Amplify TikTok traction",
      description: `${streaming.tiktokCreates.toLocaleString()} TikTok creates detected. Seed 5 creator duets this week to compound organic growth.`,
      priority: "high",
      category: "social",
      impactEstimate: 17,
    });
  }

  // Cyanite-driven playlist targeting
  if (energy?.moodTags?.length) {
    const moods = energy.moodTags.slice(0, 2).join(" + ");
    recs.push({
      id: "cyanite-mood-playlists",
      title: "Target mood-matched playlists (Cyanite)",
      description: `Audio profile tags: ${moods}. Pitch to editorial playlists matching these Cyanite mood signals at ${energy.bpm} BPM.`,
      priority: "medium",
      category: "playlist",
      impactEstimate: 14,
    });
  }

  // Low hook — coaching
  if (lyrics.hookStrength < 60) {
    recs.push({
      id: "hook-rewrite",
      title: "Strengthen chorus hook before release",
      description:
        "Hook strength is below viral threshold. Consider shortening the chorus line or increasing repetition in the final 30 seconds.",
      priority: "high",
      category: "content",
      impactEstimate: 20,
    });
  }

  // === New production / vocal / chorus recommendations (completing the 2026 signals) ===
  if (energy?.productionQuality != null && energy.productionQuality < 55) {
    recs.push({
      id: "production-loudness",
      title: "Fix production loudness & dynamics",
      description: `Production quality ${energy.productionQuality}/100. Target modern integrated loudness around -6 to -8 with breathing room (variable energy). Export a competitive master or use reference tracks in the same subgenre.`,
      priority: energy.productionQuality < 42 ? "high" : "medium",
      category: "content",
      impactEstimate: 13,
    });
  }

  if (energy?.vocalScore != null && energy.vocalScore < 52) {
    recs.push({
      id: "vocal-presence",
      title: "Bring vocals forward for short-form",
      description: `Vocal score ${energy.vocalScore}/100. Raise vocal stem, add 2-3dB presence around 2-4kHz, or print a vocal-up mix for clips. Clear vocal hooks are the #1 predictor of TikTok saves in 2026.`,
      priority: energy.vocalScore < 40 ? "high" : "medium",
      category: "content",
      impactEstimate: 15,
    });
  }

  if (lyrics.chorusSimplicity != null && lyrics.chorusSimplicity < 55) {
    recs.push({
      id: "simplify-chorus",
      title: "Simplify the chorus for replay value",
      description: `Chorus simplicity ${lyrics.chorusSimplicity}/100${lyrics.chorusWordCount ? ` (${lyrics.chorusWordCount} words)` : ""}. Cut to the catchiest 6-12 words, increase internal repeats, remove long words. Short & dumb wins virality.`,
      priority: "medium",
      category: "content",
      impactEstimate: 11,
    });
  }

  // #3 Gap-driven actionable recommendations (map critical/high gaps to concrete actions)
  if (gaps && gaps.length > 0) {
    const criticalGaps = gaps.filter((g) => g.severity === "critical" || g.severity === "high");
    for (const gap of criticalGaps.slice(0, 4)) {
      let title = `Address: ${gap.title}`;
      let description = gap.description;
      if (gap.id === "late-hook" || gap.id === "hook-below-catalog-median") {
        title = "Move or strengthen the hook immediately";
        description = `${gap.description} Target hook arrival at 12-18 seconds.`;
      } else if (gap.id === "weak-vocals" || gap.id.includes("vocal")) {
        title = "Prioritize vocal presence in the mix";
        description = `${gap.description} Focus on the first chorus vocal take.`;
      } else if (gap.id.includes("production") || gap.id.includes("loudness")) {
        title = "Fix production loudness & dynamics for virality";
        description = `${gap.description} Reference a current hit in your genre.`;
      } else if (gap.id.includes("chorus") || gap.id.includes("complex")) {
        title = "Rewrite chorus for simplicity and length";
        description = `${gap.description}`;
      }
      recs.push({
        id: `gap-${gap.id}`,
        title,
        description,
        priority: gap.severity === "critical" ? "high" : "medium",
        category: "content",
        impactEstimate: Math.max(10, Math.min(22, gap.impactPoints)),
      });
    }
  }

  return recs
    .sort((a, b) => b.impactEstimate - a.impactEstimate)
    .slice(0, 6);
}