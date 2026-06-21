
import { Link } from "wouter";
import { ArrowRight, Flame, Users } from "lucide-react";
import { getViralLabLink } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface ViralLabCTAProps {
  projectId: string;
  projectTitle?: string;
  hitScore?: number | null;
  compact?: boolean;
  className?: string;
}

export function ViralLabCTA({
  projectId,
  projectTitle,
  hitScore,
  compact = false,
  className,
}: ViralLabCTAProps) {
  if (compact) {
    return (
      <Link
        href={getViralLabLink(projectId)}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-muted px-3 py-2 text-xs font-semibold text-accent-light transition hover:border-accent/50 hover:text-foreground",
          className
        )}
      >
        <Flame className="h-3.5 w-3.5" />
        Viral Lab
        <ArrowRight className="h-3 w-3" />
      </Link>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/10 to-transparent p-5",
        className
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-accent-light" />
            <h3 className="font-semibold">Viral Lab</h3>
          </div>
          <p className="mt-2 text-sm text-muted">
            Simulate 1 million listeners, gap analysis, and a music timeline editor
            {projectTitle ? ` for "${projectTitle}"` : ""}.
            {hitScore != null && (
              <span className="text-foreground"> Current hit score: {hitScore}.</span>
            )}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              2.4K persona → 1M scale
            </span>
            <span>Timeline 6-lane · deep link Studio</span>
          </div>
        </div>
        <Link
          href={getViralLabLink(projectId)}
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-light"
        >
          Open Viral Lab
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}