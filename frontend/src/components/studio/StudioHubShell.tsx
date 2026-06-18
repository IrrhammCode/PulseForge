"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useStudioProject } from "@/lib/hooks/useStudioProject";
import { StudioHubHeader } from "@/components/studio/StudioHubHeader";
import { AutoViralRefresh } from "@/components/studio/AutoViralRefresh";
import { OrchestratorPanel } from "@/components/studio/OrchestratorPanel";

export function StudioHubShell({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectId = params.id as string;
  const { project, ready, refresh } = useStudioProject(projectId);

  if (!ready) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-border" />
        <div className="mt-6 h-64 animate-pulse rounded-2xl bg-border/60" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <p className="mt-2 text-sm text-muted">It may have been deleted from this browser.</p>
        <Link href="/studio" className="btn-primary mt-6">
          Back to studio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
      <StudioHubHeader project={project} onProjectChange={refresh} />
      <div className="mb-6">
        <OrchestratorPanel project={project} onRefresh={refresh} compact />
      </div>
      <AutoViralRefresh project={project} onRefresh={refresh} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}