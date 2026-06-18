"use client";

import { useParams } from "next/navigation";
import { useStudioProject } from "@/lib/hooks/useStudioProject";
import { StudioAnalyzePanel } from "@/components/studio/StudioAnalyzePanel";
import type { TrackAnalysis } from "@/types";

export function AnalyzeTab() {
  const params = useParams();
  const projectId = params.id as string;
  const { project, ready, saveAnalysis } = useStudioProject(projectId);

  if (!ready || !project) return null;

  const handleAnalysisSaved = (analysis: TrackAnalysis) => {
    saveAnalysis(project.activeVersionId, analysis);
  };

  return <StudioAnalyzePanel project={project} onAnalysisSaved={handleAnalysisSaved} />;
}