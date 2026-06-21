"use client";

import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import type { StudioProject } from "@/types/studio";
import { buildCreativeGraph } from "@/lib/domain/creative-graph";
import { getWorkflowActions } from "@/lib/domain/orchestrator";
import { cn } from "@/lib/utils";

interface WorkflowActionsProps {
  projects: StudioProject[];
}

export function WorkflowActions({ projects }: WorkflowActionsProps) {
  const actions = projects
    .slice(0, 3)
    .flatMap((p) => {
      const graph = buildCreativeGraph(p);
      return getWorkflowActions(p, graph).map((a) => ({ ...a, projectTitle: p.title }));
    })
    .slice(0, 4);

  if (actions.length === 0) return null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center gap-2">
        <Zap className="h-4 w-4 text-accent-light" />
        <h2 className="text-lg font-semibold">Suggested next steps</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={`${action.projectTitle}-${action.id}`}
            href={action.href}
            className={cn(
              "group rounded-2xl border p-4 transition hover:border-accent/30",
              action.priority === "high"
                ? "border-accent/25 bg-accent-muted/30"
                : "border-border bg-surface-elevated"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {action.projectTitle}
                </p>
                <p className="mt-1 font-semibold group-hover:text-accent-light">
                  {action.label}
                </p>
                <p className="mt-1 text-xs text-muted">{action.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted group-hover:text-accent-light" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}