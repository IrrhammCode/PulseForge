import Link from "next/link";
import { ArrowRight, Flame, Music2, Trash2 } from "lucide-react";
import { getViralLabLink } from "@/lib/navigation";
import { hasLyricsContent } from "@/lib/studio/lyrics";
import type { StudioProject } from "@/types/studio";
import { PROJECT_STATUSES } from "@/types/studio";

interface ProjectCardProps {
  project: StudioProject;
  onDelete: (id: string) => void;
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const status = PROJECT_STATUSES[project.status];
  const activeVersion =
    project.versions.find((v) => v.id === project.activeVersionId) ?? project.versions[0];
  const canViral = activeVersion ? hasLyricsContent(activeVersion.lyrics) : false;
  const updated = new Date(project.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-surface-elevated p-5 transition hover:border-accent/25">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-muted">
          <Music2 className="h-5 w-5 text-accent-light" />
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      <h3 className="truncate text-base font-semibold">{project.title}</h3>
      <p className="truncate text-sm text-muted">{project.artistName}</p>

      <div className="mt-3 flex flex-wrap gap-2 text-[10px] uppercase tracking-wider text-muted">
        <span className="rounded border border-border px-1.5 py-0.5">{project.genre}</span>
        <span className="rounded border border-border px-1.5 py-0.5">{project.mood}</span>
        <span>{project.versions.length} version{project.versions.length !== 1 ? "s" : ""}</span>
      </div>

      <p className="mt-3 text-[11px] text-muted">Updated {updated}</p>

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        <Link
          href={`/studio/${project.id}/write`}
          className="btn-primary flex-1 !py-2 text-xs"
        >
          Open
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        {canViral && (
          <Link
            href={getViralLabLink(project.id)}
            className="rounded-xl border border-accent/30 bg-accent-muted p-2 text-accent-light transition hover:border-accent/50"
            aria-label={`Viral Lab for ${project.title}`}
            title="Viral Lab"
          >
            <Flame className="h-4 w-4" />
          </Link>
        )}
        <button
          type="button"
          onClick={() => onDelete(project.id)}
          className="rounded-xl border border-border p-2 text-muted transition hover:border-danger/30 hover:text-danger"
          aria-label={`Delete ${project.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}