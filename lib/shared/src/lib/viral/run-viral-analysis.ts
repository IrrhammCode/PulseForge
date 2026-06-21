import type { WhatIfParams } from "@/types";
import type { StudioProject } from "@/types/studio";
import { buildReleaseHistory } from "@/lib/scoring/release-history";
import { generateRecommendations } from "@/lib/scoring/recommendations";
import type { ViralAnalysis, ViralReadiness } from "@/types/viral";
import { DEFAULT_WHAT_IF } from "@/lib/constants";
import { runStudioAnalysis, lyricsBodyFromProject } from "@/lib/scoring/studio-analysis";
import { resolveStudioDuration } from "@/lib/scoring/audio-signals";
import { buildVersionSnapshot } from "@/lib/domain/version-snapshot";
import { runCrowdSimulation } from "./crowd-simulation";
import { fetchStudioDraftPartners } from "@/lib/scoring/studio-draft-partners";
import { analyzeViralGaps } from "./gap-analysis";
import { buildMusicTimeline } from "./music-timeline";
import { clamp } from "@/lib/utils";
import { getLiveTrendFeed } from "@/lib/trends/feed";

function computeReadiness(
  hitScore: number,
  skipHookRate: number,
  gapCount: number,
  prob1M: number
): ViralReadiness {
  const penalty = skipHookRate * 0.35 + gapCount * 2.5;
  const score = clamp(Math.round(hitScore * 0.55 + prob1M * 0.35 - penalty * 0.15), 12, 96);

  let verdict: ViralReadiness["verdict"];
  let headline: string;
  let subline: string;

  if (score >= 78 && prob1M >= 45) {
    verdict = "viral-ready";
    headline = "Ready to push to 1M";
    subline = "Crowd sim + Monte Carlo align — final polish in Studio.";
  } else if (score >= 62) {
    verdict = "near-viral";
    headline = "Near viral — critical gaps remain";
    subline = "Fix red items on the timeline, then re-run the simulation.";
  } else if (score >= 40) {
    verdict = "needs-work";
    headline = "Needs creative iteration";
    subline = "Hook, production, or distribution is still far from the 1M threshold.";
  } else {
    verdict = "early-stage";
    headline = "Still an early draft";
    subline = "Add lyrics + demo audio before scaling the simulation.";
  }

  return { score, verdict, headline, subline };
}

export interface RunViralAnalysisInput {
  project: StudioProject;
  versionId?: string;
  whatIf?: Partial<WhatIfParams>;
  /** Other studio projects for same-artist release history (client localStorage). */
  allProjects?: StudioProject[];
}

export async function runViralAnalysis(
  input: RunViralAnalysisInput
): Promise<ViralAnalysis> {
  const project = input.project;
  const versionId = input.versionId ?? project.activeVersionId;
  const version =
    project.versions.find((v) => v.id === versionId) ?? project.versions[0];
  const whatIf: WhatIfParams = { ...DEFAULT_WHAT_IF, ...input.whatIf };

  const lyricsBody = lyricsBodyFromProject(project, versionId);
  const snapshotPre = buildVersionSnapshot(project, versionId);
  const [draftPartners, trendFeed] = await Promise.all([
    fetchStudioDraftPartners(project, versionId, snapshotPre?.audio),
    getLiveTrendFeed(),
  ]);

  const releaseHistory = buildReleaseHistory(
    project,
    input.allProjects ?? [],
    versionId
  );

  // #1 & #5 Strengthen historical + artist grounding
  let baseHit = 0; // will be set after trackAnalysis
  const catalogMed = draftPartners.catalogBenchmark?.medianHookStrength ?? null;
  const momentumScore = draftPartners.artistMomentum?.momentumScore ?? 50;

  const trackAnalysis = runStudioAnalysis({
    project,
    lyricsBody,
    versionId,
    whatIf,
    snapshot: snapshotPre ?? undefined,
    trackPatch: draftPartners.trackPatch,
    cyanite: draftPartners.cyanite,
    songstats: draftPartners.songstats,
    velocityHistory: draftPartners.velocityHistory,
    mxmAnalysis: draftPartners.mxmAnalysis,
    richsync: draftPartners.richsync,
    catalogBenchmark: draftPartners.catalogBenchmark,
    artistMomentum: draftPartners.artistMomentum,
    trendFeed,
    releaseHistory,
    releaseDate: version?.launchPlan?.targetReleaseDate,
  });

  const snapshot = buildVersionSnapshot(project, versionId);
  const durationSec = resolveStudioDuration(
    snapshot?.audio,
    project.bpmTarget,
    trackAnalysis.track.duration
  );

  const seed =
    parseInt(project.id.replace(/\D/g, "").slice(0, 8), 10) ||
    project.title.length * 131;

  const crowd = runCrowdSimulation(trackAnalysis, durationSec, seed, {
    cyanite: draftPartners.cyanite,
    songstats: draftPartners.songstats,
    whatIf,
  });
  const gaps = analyzeViralGaps(trackAnalysis, project, crowd, whatIf);

  const readiness = computeReadiness(
    trackAnalysis.hitPotential.overall,
    crowd.aggregates.skipHookRate,
    gaps.filter((g) => g.severity === "critical" || g.severity === "high").length,
    trackAnalysis.simulation.probabilityToReach
  );

  // Apply historical/artist boosts to final readiness (stronger grounding #1 & #5)
  if (catalogMed != null && trackAnalysis.lyrics.hookStrength > catalogMed + 5) {
    readiness.score = Math.min(96, readiness.score + 3);
  }
  if (momentumScore > 65) {
    readiness.score = Math.min(96, readiness.score + 4);
    if (readiness.verdict === "needs-work") readiness.verdict = "near-viral";
  }
  if (releaseHistory.trajectory === "improving" && releaseHistory.priorReleases >= 1) {
    readiness.score = Math.min(96, readiness.score + 2);
  }

  const timeline = buildMusicTimeline(
    project,
    trackAnalysis,
    gaps,
    version?.timelineEdits ?? version?.viral?.timelineEdits
  );

  // #3 Gap-driven actionable recommendations (merge on top of base marketing recs)
  const gapAwareRecs = generateRecommendations(
    trackAnalysis.track as any,
    trackAnalysis.lyrics,
    trackAnalysis.hitPotential,
    whatIf,
    trackAnalysis.streaming,
    trackAnalysis.energy,
    trackAnalysis.velocityHistory,
    trackAnalysis.artistMomentum,
    trackAnalysis.trendFeed,
    trackAnalysis.seasonalContext,
    trackAnalysis.releaseHistory,
    gaps
  );
  const existingIds = new Set(trackAnalysis.recommendations.map((r) => r.id));
  trackAnalysis.recommendations = [
    ...trackAnalysis.recommendations,
    ...gapAwareRecs.filter((r) => !existingIds.has(r.id)),
  ].slice(0, 8);

  // #4 Timeline edits impact: major chorus position changes adjust effective readiness (hook timing)
  if (timeline) {
    const mainChorus = timeline.lanes
      .flatMap((l) => l.clips)
      .find((c) => c.sectionId.includes("chorus1") || c.sectionId === "chorus1");
    if (mainChorus) {
      const hookFromTimeline = timeline.durationSec * (mainChorus.startPercent / 100);
      if (hookFromTimeline < 15) {
        readiness.score = Math.min(96, readiness.score + 4);
      } else if (hookFromTimeline > 30) {
        readiness.score = Math.max(20, readiness.score - 5);
      }
    }
  }

  return {
    projectId: project.id,
    projectTitle: project.title,
    versionId: version?.id ?? project.activeVersionId,
    versionLabel: version?.label ?? "v1",
    readiness,
    crowd,
    gaps,
    timeline,
    monteCarlo: trackAnalysis.simulation,
    trackAnalysis,
    analyzedAt: new Date().toISOString(),
  };
}