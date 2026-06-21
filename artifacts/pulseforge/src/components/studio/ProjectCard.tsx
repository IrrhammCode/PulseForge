import { Link } from "wouter";
import { ArrowRight, Flame, Music2, Rocket, Trash2 } from "lucide-react";
import { getViralLabLink } from "@/lib/navigation";
import { hasLyricsContent } from "@/lib/studio/lyrics";
import type { StudioProject } from "@/types/studio";
import { PROJECT_STATUSES } from "@/types/studio";

interface ProjectCardProps {
  project: StudioProject;
  onDelete: (id: string) => void;
  onChanged?: () => void;
}

export function ProjectCard({ project, onDelete, onChanged }: ProjectCardProps) {
  const status = PROJECT_STATUSES[project.status];
  const activeVersion =
    project.versions.find((v) => v.id === project.activeVersionId) ?? project.versions[0];
  const canViral = activeVersion ? hasLyricsContent(activeVersion.lyrics) : false;
  const hasChorus = !!(
    activeVersion &&
    (activeVersion.lyrics.chorus?.trim() || activeVersion.lyrics.raw?.trim())
  );
  const updated = new Date(project.updatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    // Stable hover target: the wrapper keeps its layout box fixed while the inner
    // card lifts via group-hover. Putting the transform on the hovered element
    // itself made the card slide out from under the cursor → un-hover → drop →
    // re-hover, an oscillation that read as cards "refreshing" repeatedly.
    <div className="group h-full">
    <article className="flex h-full flex-col border-2 border-foreground bg-surface p-5 transition duration-200 group-hover:-translate-y-0.5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-foreground">
          <Music2 className="h-5 w-5 text-foreground" />
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

      <div className="mt-4 flex flex-col gap-2 border-t-2 border-foreground pt-4">
        <div className="flex items-center gap-2">
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
              className="border-2 border-foreground p-2 text-foreground transition hover:bg-foreground hover:text-background"
              aria-label={`Viral Lab for ${project.title}`}
              title="Viral Lab"
            >
              <Flame className="h-4 w-4" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => onDelete(project.id)}
            className="border-2 border-foreground p-2 text-foreground transition hover:bg-foreground hover:text-background"
            aria-label={`Delete ${project.title}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {hasChorus ? (
          <Link
            href={`/studio/${project.id}/optimize`}
            className="btn-secondary w-full justify-center !py-2 text-xs"
            title="Optimize & Ship"
          >
            <Rocket className="h-3.5 w-3.5" />
            Optimize &amp; Ship
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="btn-secondary w-full justify-center !py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            title="Add chorus lyrics in Write first"
          >
            <Rocket className="h-3.5 w-3.5" />
            Optimize &amp; Ship
          </button>
        )}
      </div>
    </article>
    </div>
  );
}