import type { StudioProject } from "@/types/studio";
import type { WhatIfParams } from "@/types";
import {
  executeOrchestratorPlan,
  buildOrchestratorPlan,
} from "@/lib/domain/workflow-orchestrator";
import {
  commandSaveAnalysis,
  commandSaveViral,
  commandSyncWhatIf,
  getProject,
} from "@/lib/domain/project-commands";
import { analyzeStudioVersion, runViralLabAnalysis } from "@/lib/api-client";
import { composeLyricsBody } from "@/lib/studio/lyrics";
import { computeContentFingerprint } from "@/lib/domain/fingerprint";
import { toViralSnapshot } from "@/lib/viral/persist";

export function createOrchestratorHandlers() {
  return {
    runAnalyze: async (project: StudioProject) => {
      const version =
        project.versions.find((v) => v.id === project.activeVersionId) ??
        project.versions[0];
      if (!version) return;
      const analysis = await analyzeStudioVersion(project, {
        versionId: version.id,
        lyricsBody: composeLyricsBody(version.lyrics),
      });
      commandSaveAnalysis(project.id, version.id, analysis);
    },
    runViral: async (project: StudioProject, whatIf: WhatIfParams) => {
      const version =
        project.versions.find((v) => v.id === project.activeVersionId) ??
        project.versions[0];
      if (!version) return;
      const viral = await runViralLabAnalysis(project, { whatIf });
      const fingerprint = computeContentFingerprint(
        version.lyrics,
        version.audio,
        project
      );
      const snapshot = toViralSnapshot(
        viral,
        fingerprint,
        whatIf,
        version.timelineEdits ?? version.viral?.timelineEdits
      );
      commandSaveViral(project.id, version.id, snapshot);
      commandSyncWhatIf(project.id, version.id, whatIf, "orchestrator");
    },
  };
}

/** Run auto-runnable orchestrator tasks for a project when a plan exists. */
export async function runAutoOrchestrator(projectId: string): Promise<void> {
  const project = getProject(projectId);
  if (!project) return;

  const plan = buildOrchestratorPlan(project);
  if (!plan?.tasks.some((task) => task.autoRunnable)) return;

  await executeOrchestratorPlan(projectId, {
    handlers: createOrchestratorHandlers(),
    autoOnly: true,
  });
}