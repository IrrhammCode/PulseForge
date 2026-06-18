"use client";

import { useParams } from "next/navigation";
import { useStudioProject } from "@/lib/hooks/useStudioProject";
import { VersionCompare } from "@/components/studio/VersionCompare";

export function CompareTab() {
  const params = useParams();
  const projectId = params.id as string;
  const { project, ready } = useStudioProject(projectId);

  if (!ready || !project) return null;

  return <VersionCompare project={project} />;
}