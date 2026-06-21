import type { ReleaseHistoryInsights, ReleaseTrajectory } from "@/types";
import type { StudioProject } from "@/types/studio";
import { clamp } from "@/lib/utils";
import {
  resolveCanonicalHitScore,
  resolveCanonicalProb1M,
} from "@/lib/domain/version-intelligence";

export type { ReleaseHistoryInsights, ReleaseTrajectory };

function normalizeArtist(name: string): string {
  return name.trim().toLowerCase();
}

function collectRecords(
  projects: StudioProject[],
  artistKey: string,
  exclude?: { projectId: string; versionId: string }
): ReleaseHistoryInsights["records"] {
  const records: ReleaseHistoryInsights["records"] = [];

  for (const project of projects) {
    if (normalizeArtist(project.artistName) !== artistKey) continue;

    for (const version of project.versions) {
      if (
        exclude &&
        project.id === exclude.projectId &&
        version.id === exclude.versionId
      ) {
        continue;
      }

      const hitScore = resolveCanonicalHitScore(version);
      const prob1M = resolveCanonicalProb1M(version);
      if (hitScore == null && prob1M == null) continue;

      records.push({
        projectId: project.id,
        projectTitle: project.title,
        versionLabel: version.label,
        hitScore,
        prob1M,
        analyzedAt: version.viral?.analyzedAt ?? version.analyzedAt,
      });
    }
  }

  return records.sort((a, b) => {
    const ta = a.analyzedAt ? Date.parse(a.analyzedAt) : 0;
    const tb = b.analyzedAt ? Date.parse(b.analyzedAt) : 0;
    return tb - ta;
  });
}

function computeTrajectory(scores: number[]): ReleaseTrajectory {
  if (scores.length < 2) return scores.length === 1 ? "stable" : "first-release";
  const recent = scores.slice(0, Math.min(2, scores.length));
  const older = scores.slice(2, Math.min(5, scores.length));
  if (!older.length) return "stable";

  const recentAvg = recent.reduce((s, v) => s + v, 0) / recent.length;
  const olderAvg = older.reduce((s, v) => s + v, 0) / older.length;
  const delta = recentAvg - olderAvg;

  if (delta >= 6) return "improving";
  if (delta <= -6) return "declining";
  return "stable";
}

function historyBoostFromTrajectory(
  trajectory: ReleaseTrajectory,
  avgHit?: number
): number {
  let boost = 0;
  if (trajectory === "improving") boost += 0.06;
  else if (trajectory === "declining") boost -= 0.04;
  else if (trajectory === "first-release") boost += 0.01;

  if (avgHit != null && avgHit >= 70) boost += 0.03;
  if (avgHit != null && avgHit < 50) boost -= 0.02;

  return clamp(boost, -0.05, 0.1);
}

export function buildReleaseHistory(
  project: StudioProject,
  allProjects: StudioProject[] = [],
  versionId?: string
): ReleaseHistoryInsights {
  const artistKey = normalizeArtist(project.artistName);
  const version =
    project.versions.find((v) => v.id === (versionId ?? project.activeVersionId)) ??
    project.versions[0];

  const pool = allProjects.length ? allProjects : [project];
  const records = collectRecords(pool, artistKey, {
    projectId: project.id,
    versionId: version?.id ?? project.activeVersionId,
  });

  if (!records.length) {
    return {
      available: false,
      priorReleases: 0,
      trajectory: "first-release",
      records: [],
      historyBoost: 0.01,
    };
  }

  const hitScores = records.map((r) => r.hitScore).filter((s): s is number => s != null);
  const probs = records.map((r) => r.prob1M).filter((p): p is number => p != null);

  const avgHitScore =
    hitScores.length > 0
      ? Math.round(hitScores.reduce((s, v) => s + v, 0) / hitScores.length)
      : undefined;
  const avgProb1M =
    probs.length > 0
      ? Math.round(probs.reduce((s, v) => s + v, 0) / probs.length)
      : undefined;
  const bestHitScore = hitScores.length ? Math.max(...hitScores) : undefined;
  const trajectory = computeTrajectory(hitScores);

  return {
    available: true,
    priorReleases: records.length,
    avgHitScore,
    avgProb1M,
    bestHitScore,
    trajectory,
    records: records.slice(0, 6),
    historyBoost: historyBoostFromTrajectory(trajectory, avgHitScore),
  };
}