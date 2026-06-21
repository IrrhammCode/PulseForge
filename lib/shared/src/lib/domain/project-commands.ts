/**
 * Single write path for project mutations.
 * UI and orchestrator should use these commands instead of storage.ts directly.
 */
import type { TrackAnalysis, WhatIfParams } from "@/types";
import type {
  CreateProjectInput,
  DemoAudioMeta,
  LaunchPlan,
  LyricsSections,
  StudioProject,
} from "@/types/studio";
import type { TimelineEdits, ViralSnapshot } from "@/types/viral";
import { emitDomainEvent } from "@/lib/domain/events";
import {
  mergeWhatIfIntoLaunchPlan,
  patchViralWhatIf,
  resolveCanonicalWhatIf,
} from "@/lib/domain/version-intelligence";
import type { IProjectRepository } from "@/lib/studio/repository-port";
import { getProjectRepository } from "@/lib/studio/repository";

function repo(): IProjectRepository {
  return getProjectRepository();
}

export function listProjects(): StudioProject[] {
  return repo().listProjects();
}

export function getProject(id: string): StudioProject | null {
  return repo().getProject(id);
}

function emitContentStaleEvents(project: StudioProject, versionId: string): void {
  const version = project.versions.find((v) => v.id === versionId);
  if (!version) return;
  if (version.analysisStale) {
    emitDomainEvent({
      type: "analysis_stale",
      projectId: project.id,
      versionId,
      payload: { reason: version.analysisStaleReason },
    });
  }
  if (version.viralStale) {
    emitDomainEvent({
      type: "viral_stale",
      projectId: project.id,
      versionId,
      payload: { reason: version.viralStaleReason },
    });
  }
}

export function commandCreateProject(input: CreateProjectInput): StudioProject {
  const project = repo().createProject(input);
  emitDomainEvent({
    type: "project_created",
    projectId: project.id,
    versionId: project.activeVersionId,
  });
  return project;
}

export function commandUpdateProject(
  id: string,
  patch: Parameters<IProjectRepository["updateProject"]>[1]
): StudioProject | null {
  return repo().updateProject(id, patch);
}

export function commandDeleteProject(id: string): boolean {
  return repo().deleteProject(id);
}

export function commandAddVersion(projectId: string, label?: string): StudioProject | null {
  const result = repo().addVersion(projectId, label);
  if (result) {
    emitDomainEvent({
      type: "workflow_transition",
      projectId,
      versionId: result.activeVersionId,
      payload: { action: "version_added" },
    });
  }
  return result;
}

export function commandSetActiveVersion(
  projectId: string,
  versionId: string
): StudioProject | null {
  return repo().setActiveVersion(projectId, versionId);
}

export function commandSaveLyrics(
  projectId: string,
  versionId: string,
  lyrics: LyricsSections
): StudioProject | null {
  const result = repo().updateVersionLyrics(projectId, versionId, lyrics);
  if (result) {
    emitDomainEvent({ type: "lyrics_changed", projectId, versionId });
    emitContentStaleEvents(result, versionId);
  }
  return result;
}

export function commandSaveAnalysis(
  projectId: string,
  versionId: string,
  analysis: TrackAnalysis
): StudioProject | null {
  const result = repo().updateVersionAnalysis(projectId, versionId, analysis);
  if (result) {
    emitDomainEvent({ type: "analysis_completed", projectId, versionId });
  }
  return result;
}

export function commandSaveAudio(
  projectId: string,
  versionId: string,
  audio: DemoAudioMeta | undefined
): StudioProject | null {
  const result = repo().updateVersionAudio(projectId, versionId, audio);
  if (result) {
    emitDomainEvent({ type: "audio_changed", projectId, versionId });
    emitContentStaleEvents(result, versionId);
  }
  return result;
}

export function commandUpdateStems(
  projectId: string,
  versionId: string,
  patch: Parameters<IProjectRepository["updateVersionStems"]>[2]
): StudioProject | null {
  const result = repo().updateVersionStems(projectId, versionId, patch);
  if (result) {
    emitDomainEvent({ type: "audio_changed", projectId, versionId, payload: { stems: true } });
    emitContentStaleEvents(result, versionId);
  }
  return result;
}

export function commandSaveViral(
  projectId: string,
  versionId: string,
  snapshot: ViralSnapshot
): StudioProject | null {
  const result = repo().updateVersionViral(projectId, versionId, snapshot);
  if (result) {
    emitDomainEvent({
      type: "viral_completed",
      projectId,
      versionId,
      payload: { readiness: snapshot.readiness.score },
    });
    emitDomainEvent({
      type: "what_if_changed",
      projectId,
      versionId,
      payload: { source: "viral" },
    });
  }
  return result;
}

export function commandSaveTimelineEdits(
  projectId: string,
  versionId: string,
  timelineEdits: TimelineEdits
): StudioProject | null {
  const result = repo().updateVersionTimelineEdits(projectId, versionId, timelineEdits);
  if (result) {
    emitDomainEvent({ type: "timeline_edited", projectId, versionId });
    const version = result.versions.find((v) => v.id === versionId);
    if (version?.viralStale) {
      emitDomainEvent({
        type: "viral_stale",
        projectId,
        versionId,
        payload: { reason: "timeline_edited" },
      });
    }
  }
  return result;
}

/** Bidirectional what-if sync across Launch + Viral. */
export function commandSyncWhatIf(
  projectId: string,
  versionId: string,
  whatIf: WhatIfParams,
  source: "launch" | "viral" | "orchestrator" = "orchestrator"
): StudioProject | null {
  const project = repo().getProject(projectId);
  if (!project) return null;
  const version = project.versions.find((v) => v.id === versionId);
  if (!version) return null;

  const launchPlan = mergeWhatIfIntoLaunchPlan(version.launchPlan, whatIf);
  let updated = repo().updateVersionLaunchPlan(projectId, versionId, launchPlan);
  if (!updated) return null;

  if (version.viral) {
    const viral = patchViralWhatIf(version.viral, whatIf)!;
    updated = repo().updateVersionViral(projectId, versionId, viral);
  }

  if (updated) {
    emitDomainEvent({
      type: "what_if_changed",
      projectId,
      versionId,
      payload: { source },
    });
  }
  return updated;
}

export function commandSaveLaunchPlan(
  projectId: string,
  versionId: string,
  launchPlan: LaunchPlan
): StudioProject | null {
  const project = repo().getProject(projectId);
  const version = project?.versions.find((v) => v.id === versionId);
  const prevWhatIf = version ? resolveCanonicalWhatIf(version) : null;

  const result = repo().updateVersionLaunchPlan(projectId, versionId, launchPlan);
  if (!result) return null;

  const changed =
    prevWhatIf &&
    JSON.stringify(prevWhatIf) !== JSON.stringify(launchPlan.whatIf);

  if (changed) {
    return commandSyncWhatIf(projectId, versionId, launchPlan.whatIf, "launch");
  }

  emitDomainEvent({ type: "launch_plan_updated", projectId, versionId });
  return result;
}