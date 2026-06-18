"use client";

import { useCallback, useState } from "react";
import type { StudioProject } from "@/types/studio";
import type { WhatIfParams } from "@/types";
import {
  executeOrchestratorPlan,
  buildOrchestratorPlan,
  type OrchestratorRunResult,
  type OrchestratorTaskId,
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


export function useWorkflowOrchestrator(projectId: string, onSaved?: () => void) {
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<OrchestratorRunResult | null>(null);

  const run = useCallback(
    async (options?: { autoOnly?: boolean; taskIds?: OrchestratorTaskId[] }) => {
      setRunning(true);
      try {
        const handlers = {
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

        const result = await executeOrchestratorPlan(projectId, {
          handlers,
          autoOnly: options?.autoOnly,
          taskIds: options?.taskIds,
        });
        setLastResult(result);
        onSaved?.();
        return result;
      } finally {
        setRunning(false);
      }
    },
    [projectId, onSaved]
  );

  const plan = useCallback(() => {
    const project = getProject(projectId);
    if (!project) return null;
    return buildOrchestratorPlan(project);
  }, [projectId]);

  return { run, running, lastResult, plan };
}