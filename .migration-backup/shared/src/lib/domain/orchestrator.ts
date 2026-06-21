import type { CreativeGraph } from "@/lib/domain/types";
import { detectViralStaleness } from "@/lib/domain/workflow";
import type { StudioProject } from "@/types/studio";
import { getViralLabLink } from "@/lib/routes";

export type WorkflowActionId =
  | "reanalyze"
  | "reviral"
  | "add_lyrics"
  | "upload_demo"
  | "fix_critical_gaps";

export interface WorkflowAction {
  id: WorkflowActionId;
  label: string;
  description: string;
  href: string;
  priority: "high" | "medium";
}

export function getWorkflowActions(
  project: StudioProject,
  graph: CreativeGraph | null
): WorkflowAction[] {
  const actions: WorkflowAction[] = [];
  const version = project.versions.find((v) => v.id === project.activeVersionId);
  if (!version || !graph) return actions;

  const viralStale = detectViralStaleness(version, project);

  if (!graph.hasLyrics) {
    actions.push({
      id: "add_lyrics",
      label: "Write lyrics",
      description: "Add a chorus hook before analyzing or running viral sim.",
      href: `/studio/${project.id}/write?focus=chorus`,
      priority: "high",
    });
  }

  if (graph.hasLyrics && !graph.hasDemo) {
    actions.push({
      id: "upload_demo",
      label: "Upload demo",
      description: "Add audio for BPM, waveform, and stem-aware scoring.",
      href: `/studio/${project.id}/produce?focus=upload`,
      priority: "medium",
    });
  }

  if (graph.analysisStale && graph.hasLyrics) {
    actions.push({
      id: "reanalyze",
      label: "Re-analyze version",
      description: "Content changed since last hit-potential run.",
      href: `/studio/${project.id}/analyze`,
      priority: "high",
    });
  }

  if (graph.hasLyrics && (viralStale.stale || !version.viral)) {
    actions.push({
      id: "reviral",
      label: version.viral ? "Re-run Viral Lab" : "Run Viral Lab",
      description: viralStale.stale
        ? "Creative content changed — refresh 1M simulation & gaps."
        : "Simulate 1M listeners and surface viral gaps.",
      href: getViralLabLink(project.id),
      priority: graph.analysisStale ? "medium" : "high",
    });
  }

  const criticalGaps =
    version.viral?.gaps.filter(
      (g) => g.severity === "critical" || g.severity === "high"
    ).length ?? 0;

  if (criticalGaps > 0 && !viralStale.stale) {
    actions.push({
      id: "fix_critical_gaps",
      label: `Fix ${criticalGaps} critical gap${criticalGaps > 1 ? "s" : ""}`,
      description: "Address high-impact items from the latest Viral Lab run.",
      href: getViralLabLink(project.id),
      priority: "high",
    });
  }

  const order: Record<WorkflowAction["priority"], number> = {
    high: 0,
    medium: 1,
  };

  return actions.sort((a, b) => order[a.priority] - order[b.priority]);
}