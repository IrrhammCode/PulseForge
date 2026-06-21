import type { TrackAnalysis, WhatIfParams } from "@/types";
import type { StudioProject, ProjectVersion } from "@/types/studio";
import type {
  ViralAnalysis,
  ViralSnapshot,
  CrowdSimulation,
  TimelineEdits,
} from "@/types/viral";
import { buildMusicTimeline } from "@/lib/viral/music-timeline";
import { resolveTimelineEdits } from "@/lib/domain/version-intelligence";

export function toViralSnapshot(
  analysis: ViralAnalysis,
  fingerprint: string,
  whatIf: WhatIfParams,
  timelineEdits?: TimelineEdits
): ViralSnapshot {
  return {
    readiness: analysis.readiness,
    gaps: analysis.gaps,
    crowd: {
      aggregates: analysis.crowd.aggregates,
      scaled: analysis.crowd.scaled,
      funnel: analysis.crowd.funnel,
      retentionCurve: analysis.crowd.retentionCurve,
      populationTarget: analysis.crowd.populationTarget,
      sampleSize: analysis.crowd.sampleSize,
    },
    timeline: analysis.timeline,
    monteCarlo: analysis.monteCarlo,
    hitPotential: analysis.trackAnalysis.hitPotential,
    whatIf,
    timelineEdits,
    contentFingerprint: fingerprint,
    analyzedAt: analysis.analyzedAt,
  };
}

/** Rehydrate display crowd from persisted snapshot (no persona dots). */
export function crowdFromSnapshot(snapshot: ViralSnapshot): CrowdSimulation {
  return {
    populationTarget: snapshot.crowd.populationTarget,
    sampleSize: snapshot.crowd.sampleSize,
    seed: 0,
    personas: [],
    results: [],
    funnel: snapshot.crowd.funnel,
    retentionCurve: snapshot.crowd.retentionCurve,
    aggregates: snapshot.crowd.aggregates,
    scaled: snapshot.crowd.scaled,
  };
}

export function isViralSnapshotCurrent(
  snapshot: ViralSnapshot,
  currentFingerprint: string
): boolean {
  return snapshot.contentFingerprint === currentFingerprint;
}

/** Rebuild ViralAnalysis for UI from persisted snapshot + project context. */
export function viralAnalysisFromSnapshot(
  project: StudioProject,
  version: ProjectVersion,
  snapshot: ViralSnapshot,
  trackAnalysis?: TrackAnalysis
): ViralAnalysis {
  const analysis =
    trackAnalysis ??
    version.analysis ?? {
      track: {
        id: project.id,
        title: project.title,
        artist: project.artistName,
        duration: snapshot.timeline.durationSec,
        genre: project.genre,
      },
      lyrics: {
        verses: 0,
        chorusCount: 0,
        hookLine: "",
        hookStrength: snapshot.hitPotential.breakdown.hookStrength,
        sentiment: "neutral",
        themes: [],
        explicitScore: 0,
        wordCount: 0,
        repetitionIndex: 0,
      },
      hitPotential: snapshot.hitPotential,
      simulation: snapshot.monteCarlo,
      energy: {
        bpm: snapshot.timeline.bpm,
        energy: 0.5,
        danceability: 0.5,
        valence: 0.5,
        loudness: -8,
        waveform: [],
        productionQuality: 58,
        vocalScore: 55,
      },
      recommendations: [],
    };

  return {
    projectId: project.id,
    projectTitle: project.title,
    versionId: version.id,
    versionLabel: version.label,
    readiness: snapshot.readiness,
    crowd: crowdFromSnapshot(snapshot),
    gaps: snapshot.gaps,
    timeline: resolveTimelineEdits(version)
      ? buildMusicTimeline(
          project,
          { ...analysis, hitPotential: snapshot.hitPotential, simulation: snapshot.monteCarlo },
          snapshot.gaps,
          resolveTimelineEdits(version)
        )
      : snapshot.timeline,
    monteCarlo: snapshot.monteCarlo,
    trackAnalysis: { ...analysis, hitPotential: snapshot.hitPotential, simulation: snapshot.monteCarlo },
    analyzedAt: snapshot.analyzedAt,
  };
}