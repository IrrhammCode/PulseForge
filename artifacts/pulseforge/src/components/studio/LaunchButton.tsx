import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Rocket, Check, Circle, X, PartyPopper, ArrowRight } from "lucide-react";
import type { StudioProject } from "@/types/studio";
import { buildChecklist, readinessPercent } from "@/lib/studio/launch";
import { commandUpdateProject } from "@/lib/domain/project-commands";
import { cn } from "@/lib/utils";

interface LaunchButtonProps {
  project: StudioProject;
  onProjectChange: () => void;
}

export function LaunchButton({ project, onProjectChange }: LaunchButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeVersion = project.versions.find((v) => v.id === project.activeVersionId);
  const checklist = activeVersion ? buildChecklist(activeVersion) : [];
  const readiness = readinessPercent(checklist);
  const remaining = checklist.filter((i) => !i.done);
  const canLaunch = checklist.length > 0 && remaining.length === 0;
  const launched = project.status === "ready";

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const buttonTone = launched
    ? "border-success/40 bg-success/15 text-success hover:bg-success/20"
    : canLaunch
      ? "border-success/40 bg-success/10 text-success hover:bg-success/15"
      : readiness >= 50
        ? "border-accent/40 bg-accent-muted text-accent-light hover:border-accent/60"
        : "border-border bg-surface-elevated text-muted hover:border-accent/40 hover:text-foreground";

  const buttonLabel = launched
    ? "Launched"
    : canLaunch
      ? "Ready to launch"
      : `${readiness}% ready`;

  const handleLaunch = () => {
    commandUpdateProject(project.id, { status: "ready" });
    onProjectChange();
    setOpen(false);
  };

  const handleRevert = () => {
    commandUpdateProject(project.id, { status: "crafting" });
    onProjectChange();
    setOpen(false);
  };

  const barTone = launched || canLaunch
    ? "bg-success"
    : readiness >= 50
      ? "bg-accent"
      : "bg-muted";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition",
          buttonTone
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {launched ? <PartyPopper className="h-3.5 w-3.5" /> : <Rocket className="h-3.5 w-3.5" />}
        <span>{buttonLabel}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-border bg-surface-elevated p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">
                {launched ? "Project launched" : "Launch readiness"}
              </h3>
              <p className="mt-0.5 text-xs text-muted">
                {activeVersion ? activeVersion.label : "No active version"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1 text-muted transition hover:bg-surface hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-3">
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
              <div
                className={cn("h-full rounded-full transition-all", barTone)}
                style={{ width: `${readiness}%` }}
              />
            </div>
            <span className="text-xs font-bold tabular-nums text-foreground">{readiness}%</span>
          </div>

          {launched ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-success">
                <PartyPopper className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  This project is marked as launched. Track results in the Launch planner or revert
                  to keep working.
                </span>
              </div>
              <button
                type="button"
                onClick={handleRevert}
                className="w-full rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-foreground"
              >
                Revert to in-progress
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {canLaunch ? (
                <div className="flex items-start gap-2 rounded-xl border border-success/30 bg-success/10 p-3 text-xs text-success">
                  <Check className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Everything's checked off — you're clear to launch this project.</span>
                </div>
              ) : (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted">
                    Finish these to be launch-ready:
                  </p>
                  <ul className="space-y-1.5">
                    {remaining.slice(0, 6).map((item) => (
                      <li key={item.id} className="flex items-start gap-2 text-xs">
                        <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-border" />
                        <span className="min-w-0">
                          <span className="text-foreground">{item.label}</span>
                          {item.hint && <span className="text-muted"> · {item.hint}</span>}
                        </span>
                      </li>
                    ))}
                    {remaining.length > 6 && (
                      <li className="pl-5 text-xs text-muted">
                        +{remaining.length - 6} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <button
                type="button"
                onClick={handleLaunch}
                disabled={!canLaunch}
                className={cn(
                  "inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                  canLaunch
                    ? "bg-success text-white hover:bg-success/90"
                    : "cursor-not-allowed border border-border bg-surface text-muted/60"
                )}
              >
                <Rocket className="h-4 w-4" />
                {canLaunch ? "Launch project" : "Not ready yet"}
              </button>

              <Link
                href={`/studio/${project.id}/launch`}
                onClick={() => setOpen(false)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-foreground"
              >
                Open Launch planner
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
