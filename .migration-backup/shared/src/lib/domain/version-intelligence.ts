import type { TrackAnalysis, WhatIfParams } from "@/types";
import type { IntelligenceTier } from "@/lib/domain/types";
import type { LaunchPlan, ProjectVersion, StudioProject } from "@/types/studio";
import type { TimelineEdits, ViralSnapshot } from "@/types/viral";
import { buildVersionSnapshot } from "@/lib/domain/version-snapshot";
import { detectStaleness, detectViralStaleness } from "@/lib/domain/workflow";
import { DEFAULT_WHAT_IF } from "@/lib/constants";
import { defaultLaunchPlan } from "@/lib/studio/launch";

/** Canonical intelligence view for one project version. */
export interface VersionIntelligence {
  projectId: string;
  versionId: string;
  intelligenceTier: IntelligenceTier;
  whatIf: WhatIfParams;
  analysis?: TrackAnalysis;
  viral?: ViralSnapshot;
  timelineEdits?: TimelineEdits;
  canonicalHitScore: number | null;
  canonicalProb1M: number | null;
  analysisStale: boolean;
  viralStale: boolean;
  analyzedAt?: string;
  viralAnalyzedAt?: string;
}

export function resolveCanonicalWhatIf(version: ProjectVersion): WhatIfParams {
  return (
    version.viral?.whatIf ??
    version.launchPlan?.whatIf ??
    DEFAULT_WHAT_IF
  );
}

export function resolveTimelineEdits(version: ProjectVersion): TimelineEdits | undefined {
  return version.timelineEdits ?? version.viral?.timelineEdits;
}

export function resolveCanonicalHitScore(version: ProjectVersion): number | null {
  if (version.viral?.hitPotential?.overall != null) {
    return version.viral.hitPotential.overall;
  }
  return version.analysis?.hitPotential.overall ?? null;
}

export function resolveCanonicalProb1M(version: ProjectVersion): number | null {
  if (version.viral?.monteCarlo?.probabilityToReach != null) {
    return version.viral.monteCarlo.probabilityToReach;
  }
  return version.analysis?.simulation.probabilityToReach ?? null;
}

export function buildVersionIntelligence(
  project: StudioProject,
  versionId?: string
): VersionIntelligence | null {
  const version = project.versions.find(
    (v) => v.id === (versionId ?? project.activeVersionId)
  );
  if (!version) return null;

  const snapshot = buildVersionSnapshot(project, version.id);
  const analysisStaleness = version.analysisStale
    ? { stale: true }
    : detectStaleness(version, project);
  const viralStaleness = detectViralStaleness(version, project);

  return {
    projectId: project.id,
    versionId: version.id,
    intelligenceTier: snapshot?.intelligenceTier ?? "local",
    whatIf: resolveCanonicalWhatIf(version),
    analysis: version.analysis,
    viral: version.viral,
    timelineEdits: resolveTimelineEdits(version),
    canonicalHitScore: resolveCanonicalHitScore(version),
    canonicalProb1M: resolveCanonicalProb1M(version),
    analysisStale: analysisStaleness.stale,
    viralStale: viralStaleness.stale,
    analyzedAt: version.analyzedAt,
    viralAnalyzedAt: version.viral?.analyzedAt,
  };
}

export function mergeWhatIfIntoLaunchPlan(
  launchPlan: LaunchPlan | undefined,
  whatIf: WhatIfParams
): LaunchPlan {
  return {
    ...(launchPlan ?? defaultLaunchPlan(whatIf)),
    whatIf: { ...whatIf },
  };
}

export function patchViralWhatIf(
  viral: ViralSnapshot | undefined,
  whatIf: WhatIfParams
): ViralSnapshot | undefined {
  if (!viral) return undefined;
  return { ...viral, whatIf: { ...whatIf } };
}

export function intelligenceNeedsRecompute(intel: VersionIntelligence): boolean {
  return intel.analysisStale || intel.viralStale;
}