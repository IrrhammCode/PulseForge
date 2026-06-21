
import { Loader2, Workflow } from "lucide-react";
import { useWorkflowOrchestrator } from "@/lib/hooks/useWorkflowOrchestrator";
import type { StudioProject } from "@/types/studio";

interface OrchestratorPanelProps {
  project: StudioProject;
  onRefresh?: () => void;
  compact?: boolean;
}

export function OrchestratorPanel({
  project,
  onRefresh,
  compact,
}: OrchestratorPanelProps) {
  const { run, running, lastResult, plan } = useWorkflowOrchestrator(
    project.id,
    onRefresh
  );
  const orchestratorPlan = plan();

  if (!orchestratorPlan?.tasks.length) return null;

  const autoTasks = orchestratorPlan.tasks.filter((t) => t.autoRunnable);

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-accent/20 bg-accent-muted/30 p-3"
          : "rounded-2xl border border-border bg-surface-elevated p-4"
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Workflow className="h-4 w-4 text-accent-light" />
            Workflow orchestrator
          </p>
          <p className="mt-1 text-xs text-muted">
            Tier {orchestratorPlan.intelligenceTier} · {orchestratorPlan.tasks.length}{" "}
            suggested step{orchestratorPlan.tasks.length > 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          disabled={running || autoTasks.length === 0}
          onClick={() => void run({ autoOnly: true })}
          className="rounded-lg border border-accent/30 px-3 py-1.5 text-xs font-medium text-accent-light transition hover:bg-accent-muted disabled:opacity-50"
        >
          {running ? (
            <>
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              Running…
            </>
          ) : (
            "Run auto steps"
          )}
        </button>
      </div>

      <ul className="mt-3 space-y-1.5 text-xs">
        {orchestratorPlan.tasks.slice(0, compact ? 3 : 6).map((task) => (
          <li key={task.id} className="flex items-start gap-2 text-muted">
            <span
              className={
                task.priority === "high"
                  ? "text-warning"
                  : task.autoRunnable
                    ? "text-accent-light"
                    : "text-muted"
              }
            >
              •
            </span>
            <span>
              <span className="font-medium text-foreground">{task.label}</span>
              {" — "}
              {task.description}
            </span>
          </li>
        ))}
      </ul>

      {lastResult && lastResult.executed.length > 0 && (
        <p className="mt-2 text-[10px] text-success">
          Executed: {lastResult.executed.join(", ")}
        </p>
      )}
      {lastResult?.errors.length ? (
        <p className="mt-1 text-[10px] text-warning">
          {lastResult.errors.map((e) => e.message).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}