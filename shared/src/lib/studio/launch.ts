import type { WhatIfParams } from "@/types";
import type { LaunchPlan, ProjectVersion } from "@/types/studio";
import { hasLyricsContent } from "@/lib/studio/lyrics";

export interface ChecklistItem {
  id: string;
  label: string;
  auto: boolean;
  done: boolean;
  hint?: string;
}

export function buildChecklist(version: ProjectVersion): ChecklistItem[] {
  const manual = version.launchPlan?.manualChecks ?? {};

  const items: Omit<ChecklistItem, "done">[] = [
    {
      id: "lyrics",
      label: "Lyrics drafted",
      auto: hasLyricsContent(version.lyrics),
      hint: "Write tab",
    },
    {
      id: "demo",
      label: "Demo uploaded",
      auto: Boolean(version.audio),
      hint: "Produce tab",
    },
    {
      id: "analyze",
      label: "Hit potential analyzed",
      auto: Boolean(version.analysis),
      hint: "Analyze tab",
    },
    {
      id: "viral",
      label: "Viral Lab run (1M sim)",
      auto: Boolean(version.viral && !version.viralStale),
      hint: "Viral Lab",
    },
    {
      id: "viral-gaps",
      label: "No critical viral gaps",
      auto:
        Boolean(version.viral) &&
        !version.viral?.gaps.some(
          (g) => g.severity === "critical" || g.severity === "high"
        ),
      hint: "Fix gaps in Viral Lab",
    },
    {
      id: "stems",
      label: "Stems separated",
      auto: Boolean(version.audio?.stemsReady),
      hint: "Produce tab",
    },
    {
      id: "marketing",
      label: "Marketing scenario set",
      auto: Boolean(version.launchPlan?.whatIf),
      hint: "Adjust What-If sliders",
    },
    {
      id: "release-date",
      label: "Target release date set",
      auto: Boolean(version.launchPlan?.targetReleaseDate),
    },
    {
      id: "distributor",
      label: "Distributor / DSP delivery ready",
      auto: false,
    },
    {
      id: "artwork",
      label: "Cover artwork finalized",
      auto: false,
    },
    {
      id: "social",
      label: "Social rollout scheduled",
      auto: false,
    },
  ];

  return items.map((item) => ({
    ...item,
    done: item.auto || Boolean(manual[item.id]),
  }));
}

export function readinessPercent(items: ChecklistItem[]): number {
  if (items.length === 0) return 0;
  const done = items.filter((i) => i.done).length;
  return Math.round((done / items.length) * 100);
}

export function defaultLaunchPlan(whatIf?: Partial<WhatIfParams>): LaunchPlan {
  return {
    whatIf: {
      marketingBudget: whatIf?.marketingBudget ?? 500,
      playlistPitchCount: whatIf?.playlistPitchCount ?? 5,
      tiktokSeedPosts: whatIf?.tiktokSeedPosts ?? 3,
      releaseTiming: whatIf?.releaseTiming ?? "friday",
    },
    manualChecks: {},
  };
}

export function formatReleaseTiming(timing: WhatIfParams["releaseTiming"]): string {
  const labels = { friday: "Friday (New Music Friday)", saturday: "Saturday", monday: "Monday" };
  return labels[timing];
}