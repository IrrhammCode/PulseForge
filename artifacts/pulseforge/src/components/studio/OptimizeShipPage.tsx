import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useParams, useRouter } from "@/lib/navigation-compat";
import { useStudioProject } from "@/lib/hooks/useStudioProject";
import { OptimizeShipPanel } from "@/components/studio/OptimizeShipPanel";

/**
 * Full-page Optimize & Ship view at /studio/:id/optimize. Replaces the old
 * floating modal — the pipeline runs inline on the page instead of an overlay.
 */
export function OptimizeShipPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { project, ready, refresh } = useStudioProject(projectId);

  if (!ready) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 sm:px-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-border" />
        <div className="mt-6 h-72 animate-pulse rounded-2xl bg-border/60" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-semibold">Project not found</h1>
        <p className="mt-2 text-sm text-muted">It may have been deleted from this browser.</p>
        <Link href="/studio" className="btn-primary mt-6">
          Back to studio
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:px-6 md:py-8">
      <Link
        href="/studio"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to studio
      </Link>
      <OptimizeShipPanel
        project={project}
        onClose={() => router.push("/studio")}
        onChanged={refresh}
      />
    </div>
  );
}
