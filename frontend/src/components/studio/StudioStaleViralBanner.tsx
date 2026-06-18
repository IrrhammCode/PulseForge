"use client";

import { useCallback } from "react";
import { StaleViralAlert } from "@/components/viral/StaleViralAlert";
import { useStudioProject } from "@/lib/hooks/useStudioProject";
import { useViralRerun } from "@/lib/hooks/useViralRerun";
import { detectViralStaleness } from "@/lib/domain/workflow";
import { hasLyricsContent } from "@/lib/studio/lyrics";

interface StudioStaleViralBannerProps {
  projectId: string;
}

export function StudioStaleViralBanner({ projectId }: StudioStaleViralBannerProps) {
  const { project, refresh } = useStudioProject(projectId);

  const { rerun, running } = useViralRerun(projectId, {
    projectId,
    onSaved: refresh,
  });

  const handleRerun = useCallback(() => {
    void rerun();
  }, [rerun]);

  if (!project) return null;

  const version =
    project.versions.find((v) => v.id === project.activeVersionId) ??
    project.versions[0];
  if (!version || !hasLyricsContent(version.lyrics)) return null;

  if (!version.viral) return null;

  const staleness = detectViralStaleness(version, project);
  if (!staleness.stale) return null;

  return (
    <StaleViralAlert
      reason={staleness.reason}
      onRerun={handleRerun}
      isRunning={running}
    />
  );
}