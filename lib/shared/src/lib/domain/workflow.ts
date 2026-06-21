import type { AnalysisStaleReason } from "@/lib/domain/types";
import type { ProjectVersion, StudioProject, WorkflowTransition } from "@/types/studio";
import { computeContentFingerprint } from "@/lib/domain/fingerprint";
import { hasLyricsContent } from "@/lib/studio/lyrics";

export function detectStaleness(
  version: ProjectVersion,
  projectMeta?: Pick<StudioProject, "title" | "artistName" | "genre" | "mood" | "bpmTarget">
): { stale: boolean; reason?: AnalysisStaleReason } {
  if (!version.analysis || !version.contentFingerprint) {
    return { stale: false };
  }

  const current = computeContentFingerprint(version.lyrics, version.audio, projectMeta);
  if (current === version.contentFingerprint) {
    return { stale: false };
  }

  return {
    stale: true,
    reason: version.analysisStaleReason ?? "metadata_changed",
  };
}

export function resolveProjectStatus(project: StudioProject): StudioProject["status"] {
  const version = project.versions.find((v) => v.id === project.activeVersionId);
  if (!version) return "draft";

  if (version.launchPlan?.targetReleaseDate || version.launchPlan?.notes) {
    return "ready";
  }
  if (version.analysis && !version.analysisStale) {
    return "analyzing";
  }
  if (version.audio || hasLyricsContent(version.lyrics)) {
    return "crafting";
  }
  return "draft";
}

export function markVersionStale(
  version: ProjectVersion,
  reason: AnalysisStaleReason
): ProjectVersion {
  return {
    ...version,
    analysisStale: true,
    analysisStaleReason: reason,
  };
}

export function clearVersionStale(version: ProjectVersion, fingerprint: string): ProjectVersion {
  return {
    ...version,
    analysisStale: false,
    analysisStaleReason: undefined,
    contentFingerprint: fingerprint,
  };
}

export function markVersionViralStale(
  version: ProjectVersion,
  reason: AnalysisStaleReason
): ProjectVersion {
  return {
    ...version,
    viralStale: true,
    viralStaleReason: reason,
  };
}

export function clearVersionViralStale(
  version: ProjectVersion,
  snapshot: import("@/types/viral").ViralSnapshot
): ProjectVersion {
  return {
    ...version,
    viral: snapshot,
    viralStale: false,
    viralStaleReason: undefined,
  };
}

export function detectViralStaleness(
  version: ProjectVersion,
  projectMeta?: Pick<StudioProject, "title" | "artistName" | "genre" | "mood" | "bpmTarget">
): { stale: boolean; reason?: AnalysisStaleReason } {
  if (!version.viral) return { stale: false };

  if (version.viralStale) {
    return { stale: true, reason: version.viralStaleReason ?? "metadata_changed" };
  }

  const current = computeContentFingerprint(version.lyrics, version.audio, projectMeta);
  if (version.viral.contentFingerprint !== current) {
    return { stale: true, reason: "metadata_changed" };
  }

  return { stale: false };
}

const ALLOWED_TRANSITIONS: Record<
  StudioProject["status"],
  StudioProject["status"][]
> = {
  draft: ["crafting", "analyzing", "ready"],
  crafting: ["draft", "analyzing", "ready"],
  analyzing: ["crafting", "ready", "draft"],
  ready: ["crafting", "analyzing", "draft"],
};

export function getAllowedTransitions(
  status: StudioProject["status"]
): StudioProject["status"][] {
  return ALLOWED_TRANSITIONS[status] ?? [];
}

function inferTransitionReason(
  prev: StudioProject,
  next: StudioProject
): string {
  const version = next.versions.find((v) => v.id === next.activeVersionId);
  if (next.status === "ready" && version?.launchPlan?.targetReleaseDate) {
    return "launch_plan_updated";
  }
  if (next.status === "analyzing" && version?.analysis && !version.analysisStale) {
    return "analysis_completed";
  }
  if (next.status === "crafting") {
    if (version?.audio || version?.lyrics) return "creative_content_added";
    return "version_created";
  }
  if (next.status === "draft") return "project_reset";
  return "status_resolved";
}

export function computeWorkflowTransition(
  prev: StudioProject,
  next: StudioProject
): WorkflowTransition | null {
  if (prev.status === next.status) return null;
  const allowed = getAllowedTransitions(prev.status);
  if (!allowed.includes(next.status)) {
    return {
      from: prev.status,
      to: next.status,
      reason: "forced_transition",
      at: new Date().toISOString(),
    };
  }
  return {
    from: prev.status,
    to: next.status,
    reason: inferTransitionReason(prev, next),
    at: new Date().toISOString(),
  };
}

export function appendWorkflowLog(
  project: StudioProject,
  transition: WorkflowTransition | null,
  maxEntries = 12
): StudioProject {
  if (!transition) return project;
  const log = [...(project.workflowLog ?? []), transition].slice(-maxEntries);
  return { ...project, workflowLog: log };
}