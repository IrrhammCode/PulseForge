
import { useCallback } from "react";
import type { StudioProject } from "@/types/studio";
import { useAutoViralRefresh, isAutoReviralEnabled } from "@/lib/hooks/useAutoViralRefresh";
import { useWorkflowOrchestrator } from "@/lib/hooks/useWorkflowOrchestrator";

interface AutoViralRefreshProps {
  project: StudioProject;
  onRefresh?: () => void;
}

/** Background orchestrator when auto mode is enabled and intelligence is stale. */
export function AutoViralRefresh({ project, onRefresh }: AutoViralRefreshProps) {
  const { run } = useWorkflowOrchestrator(project.id, onRefresh);

  const handleAuto = useCallback(
    () => run({ autoOnly: true }),
    [run]
  );

  useAutoViralRefresh({
    project,
    enabled: isAutoReviralEnabled(),
    onRerun: handleAuto,
  });

  return null;
}