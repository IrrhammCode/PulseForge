import type { CreativeGraph } from "@/lib/domain/types";
import type { StudioProject } from "@/types/studio";
import type { WhatIfParams } from "@/types";
import { buildCreativeGraph } from "@/lib/domain/creative-graph";
import { emitDomainEvent } from "@/lib/domain/events";
import {
  buildVersionIntelligence,
  resolveCanonicalWhatIf,
} from "@/lib/domain/version-intelligence";
import {
  getWorkflowActions,
  type WorkflowAction,
  type WorkflowActionId,
} from "@/lib/domain/orchestrator";
import { hasLyricsContent } from "@/lib/studio/lyrics";
import { commandSyncWhatIf, getProject } from "@/lib/domain/project-commands";

export type OrchestratorTaskId = WorkflowActionId | "sync_what_if";

export interface OrchestratorTask {
  id: OrchestratorTaskId;
  label: string;
  description: string;
  priority: "high" | "medium" | "low";
  autoRunnable: boolean;
}

export interface OrchestratorPlan {
  projectId: string;
  versionId: string;
  tasks: OrchestratorTask[];
  intelligenceTier: CreativeGraph["snapshot"]["intelligenceTier"];
}

export interface OrchestratorHandlers {
  runAnalyze: (project: StudioProject) => Promise<unknown>;
  runViral: (project: StudioProject, whatIf: WhatIfParams) => Promise<unknown>;
}

export interface OrchestratorRunResult {
  projectId: string;
  executed: OrchestratorTaskId[];
  skipped: OrchestratorTaskId[];
  errors: Array<{ task: OrchestratorTaskId; message: string }>;
}

const AUTO_RUNNABLE: OrchestratorTaskId[] = ["reanalyze", "reviral"];

export function buildOrchestratorPlan(
  project: StudioProject,
  versionId?: string
): OrchestratorPlan | null {
  const graph = buildCreativeGraph(project, versionId);
  if (!graph) return null;

  const vid = versionId ?? project.activeVersionId;
  const actions = getWorkflowActions(project, graph);

  const tasks: OrchestratorTask[] = actions.map((a) => workflowActionToTask(a));

  const version = project.versions.find((v) => v.id === vid);
  const launchWhatIf = version?.launchPlan?.whatIf;
  const viralWhatIf = version?.viral?.whatIf;
  if (
    launchWhatIf &&
    viralWhatIf &&
    JSON.stringify(launchWhatIf) !== JSON.stringify(viralWhatIf)
  ) {
    tasks.unshift({
      id: "sync_what_if",
      label: "Sync What-If scenario",
      description: "Launch and Viral Lab marketing sliders are out of sync.",
      priority: "medium",
      autoRunnable: true,
    });
  }

  return {
    projectId: project.id,
    versionId: vid,
    tasks,
    intelligenceTier: graph.snapshot.intelligenceTier,
  };
}

function workflowActionToTask(action: WorkflowAction): OrchestratorTask {
  return {
    id: action.id,
    label: action.label,
    description: action.description,
    priority: action.priority,
    autoRunnable: AUTO_RUNNABLE.includes(action.id),
  };
}

export async function executeOrchestratorPlan(
  projectId: string,
  options: {
    handlers: OrchestratorHandlers;
    taskIds?: OrchestratorTaskId[];
    autoOnly?: boolean;
    versionId?: string;
  }
): Promise<OrchestratorRunResult> {
  const project = getProject(projectId);
  const result: OrchestratorRunResult = {
    projectId,
    executed: [],
    skipped: [],
    errors: [],
  };

  if (!project) {
    result.errors.push({ task: "reanalyze", message: "Project not found" });
    return result;
  }

  const plan = buildOrchestratorPlan(project, options.versionId);
  if (!plan) return result;

  const version =
    project.versions.find((v) => v.id === plan.versionId) ?? project.versions[0];
  if (!version || !hasLyricsContent(version.lyrics)) {
    return result;
  }

  const whatIf = resolveCanonicalWhatIf(version);
  let tasks = plan.tasks;

  if (options.autoOnly) {
    tasks = tasks.filter((t) => t.autoRunnable);
  }
  if (options.taskIds?.length) {
    const allowed = new Set(options.taskIds);
    tasks = tasks.filter((t) => allowed.has(t.id));
  }

  emitDomainEvent({
    type: "orchestrator_run",
    projectId,
    versionId: plan.versionId,
    payload: { tasks: tasks.map((t) => t.id) },
  });

  for (const task of tasks) {
    try {
      if (task.id === "sync_what_if") {
        commandSyncWhatIf(projectId, plan.versionId, whatIf, "orchestrator");
        result.executed.push(task.id);
        continue;
      }

      if (task.id === "reanalyze") {
        await options.handlers.runAnalyze(project);
        result.executed.push(task.id);
        continue;
      }

      if (task.id === "reviral") {
        const fresh = getProject(projectId) ?? project;
        await options.handlers.runViral(fresh, whatIf);
        result.executed.push(task.id);
        continue;
      }

      result.skipped.push(task.id);
    } catch (err) {
      result.errors.push({
        task: task.id,
        message: err instanceof Error ? err.message : "Task failed",
      });
    }
  }

  return result;
}

export function shouldAutoOrchestrate(project: StudioProject): boolean {
  const intel = buildVersionIntelligence(project);
  if (!intel) return false;
  return intel.analysisStale || intel.viralStale;
}