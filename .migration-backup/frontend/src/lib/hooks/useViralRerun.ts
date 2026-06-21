"use client";

import { useCallback, useState } from "react";
import type { WhatIfParams } from "@/types";
import type { ViralAnalysis } from "@/types/viral";
import { runViralLabAnalysis, ApiError } from "@/lib/api-client";
import { computeContentFingerprint } from "@/lib/domain/fingerprint";
import { toViralSnapshot } from "@/lib/viral/persist";
import { commandSaveViral, commandSyncWhatIf, getProject } from "@/lib/domain/project-commands";
import { DEFAULT_WHAT_IF } from "@/lib/constants";
import { resolveTimelineEdits } from "@/lib/domain/version-intelligence";

interface UseViralRerunOptions {
  projectId: string;
  onSaved?: () => void;
}

export function useViralRerun(projectId: string, options: UseViralRerunOptions = { projectId }) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rerun = useCallback(
    async (whatIf?: WhatIfParams) => {
      const project = getProject(projectId);
      if (!project) {
        setError("Project not found");
        return null;
      }

      const version =
        project.versions.find((v) => v.id === project.activeVersionId) ??
        project.versions[0];
      if (!version) return null;

      const params =
        whatIf ??
        version.viral?.whatIf ??
        version.launchPlan?.whatIf ??
        DEFAULT_WHAT_IF;

      setRunning(true);
      setError(null);

      try {
        const viral = await runViralLabAnalysis(project, { whatIf: params });
        const fingerprint = computeContentFingerprint(
          version.lyrics,
          version.audio,
          project
        );
        const snapshot = toViralSnapshot(
          viral,
          fingerprint,
          params,
          resolveTimelineEdits(version)
        );
        commandSaveViral(projectId, version.id, snapshot);
        commandSyncWhatIf(projectId, version.id, params, "viral");

        options.onSaved?.();
        return viral as ViralAnalysis;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Viral simulation failed");
        return null;
      } finally {
        setRunning(false);
      }
    },
    [projectId, options]
  );

  return { rerun, running, error };
}