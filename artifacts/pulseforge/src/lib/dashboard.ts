import type { StudioProject } from "@/types/studio";
import { hasLyricsContent } from "@/lib/studio/lyrics";

export interface DashboardStats {
  totalProjects: number;
  readyProjects: number;
  analyzedProjects: number;
  withDemo: number;
  avgHitScore: number | null;
  viralLabReady: number;
}

export interface ViralLabCandidate {
  projectId: string;
  title: string;
  hitScore: number | null;
  viralScore: number | null;
  hasDemo: boolean;
  prob1M: number | null;
  viralStale: boolean;
}

export interface ProjectPipeline {
  projectId: string;
  title: string;
  label: string;
  write: boolean;
  produce: boolean;
  analyze: boolean;
  viral: boolean;
  launch: boolean;
  hitScore: number | null;
  status: StudioProject["status"];
}

export function computeDashboardStats(projects: StudioProject[]): DashboardStats {
  const scores = projects
    .map((p) => {
      const v = p.versions.find((ver) => ver.id === p.activeVersionId);
      return v?.analysis?.hitPotential.overall;
    })
    .filter((s): s is number => s != null);

  const viralLabReady = projects.filter((p) => {
    const v = p.versions.find((ver) => ver.id === p.activeVersionId) ?? p.versions[0];
    return v && hasLyricsContent(v.lyrics);
  }).length;

  return {
    totalProjects: projects.length,
    readyProjects: projects.filter((p) => p.status === "ready").length,
    analyzedProjects: projects.filter((p) =>
      p.versions.some((v) => v.analysis)
    ).length,
    withDemo: projects.filter((p) =>
      p.versions.some((v) => v.audio)
    ).length,
    avgHitScore:
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null,
    viralLabReady,
  };
}

export function computeViralLabCandidates(projects: StudioProject[]): ViralLabCandidate[] {
  return projects
    .map((p) => {
      const v = p.versions.find((ver) => ver.id === p.activeVersionId) ?? p.versions[0];
      if (!v || !hasLyricsContent(v.lyrics)) return null;
      return {
        projectId: p.id,
        title: p.title,
        hitScore: v.analysis?.hitPotential.overall ?? null,
        viralScore: v.viral?.readiness.score ?? null,
        hasDemo: Boolean(v.audio),
        prob1M: v.viral?.monteCarlo.probabilityToReach ?? v.analysis?.simulation.probabilityToReach ?? null,
        viralStale: Boolean(v.viralStale),
      };
    })
    .filter((c): c is ViralLabCandidate => c != null)
    .sort((a, b) => (b.hitScore ?? 0) - (a.hitScore ?? 0))
    .slice(0, 5);
}

export function computePipelines(projects: StudioProject[]): ProjectPipeline[] {
  return projects.slice(0, 6).map((p) => {
    const v = p.versions.find((ver) => ver.id === p.activeVersionId) ?? p.versions[0];
    return {
      projectId: p.id,
      title: p.title,
      label: v?.label ?? "v1",
      write: v ? hasLyricsContent(v.lyrics) : false,
      produce: Boolean(v?.audio),
      analyze: Boolean(v?.analysis),
      viral: Boolean(v?.viral),
      launch: Boolean(v?.launchPlan?.targetReleaseDate || v?.launchPlan?.notes),
      hitScore: v?.analysis?.hitPotential.overall ?? null,
      status: p.status,
    };
  });
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}