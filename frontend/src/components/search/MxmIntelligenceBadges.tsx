"use client";

import type { AppTrack } from "@/lib/musixmatch/client";
import { mxmIntelligenceLabel } from "@pulseforge/shared/lib/musixmatch/intelligence-score";
import { BarChart3, Clock, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface MxmIntelligenceBadgesProps {
  track: AppTrack;
  compact?: boolean;
}

export function MxmIntelligenceBadges({ track, compact }: MxmIntelligenceBadgesProps) {
  const tier = mxmIntelligenceLabel(track);

  return (
    <div className={cn("flex flex-wrap gap-1", compact ? "" : "mt-1.5")}>
      {track.hasAnalysis && (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-accent/25 bg-accent-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-accent-light">
          <BarChart3 className="h-2.5 w-2.5" />
          Analysis
        </span>
      )}
      {track.hasRichsync && (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-purple/25 bg-purple/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-purple-200">
          <Clock className="h-2.5 w-2.5" />
          Richsync
        </span>
      )}
      {tier === "full" && (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-border bg-surface px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted">
          <Sparkles className="h-2.5 w-2.5" />
          Full intel
        </span>
      )}
    </div>
  );
}