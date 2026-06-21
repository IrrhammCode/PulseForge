"use client";

import Link from "next/link";
import { ArrowRight, Flame, TrendingUp } from "lucide-react";
import type { ViralAnalysis } from "@/types/viral";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";

const VERDICT_STYLES: Record<
  ViralAnalysis["readiness"]["verdict"],
  { badge: string; ring: string }
> = {
  "viral-ready": {
    badge: "bg-success/15 text-success border-success/30",
    ring: "from-success/20 to-accent/10",
  },
  "near-viral": {
    badge: "bg-accent-muted text-accent-light border-accent/30",
    ring: "from-accent/25 to-cyan-500/10",
  },
  "needs-work": {
    badge: "bg-warning/15 text-warning border-warning/30",
    ring: "from-warning/20 to-accent/5",
  },
  "early-stage": {
    badge: "bg-surface text-muted border-border",
    ring: "from-border/40 to-transparent",
  },
};

interface ViralSummaryHeroProps {
  data: ViralAnalysis;
}

export function ViralSummaryHero({ data }: ViralSummaryHeroProps) {
  const styles = VERDICT_STYLES[data.readiness.verdict];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-surface-elevated p-6 md:p-8",
        "bg-gradient-to-br",
        styles.ring
      )}
    >
      <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
                styles.badge
              )}
            >
              <Flame className="h-3 w-3" />
              {data.readiness.verdict.replace("-", " ")}
            </span>
            <span className="text-xs text-muted">
              {data.projectTitle} · {data.versionLabel}
            </span>
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">
            {data.readiness.headline}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted md:text-base">
            {data.readiness.subline}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-4">
          <div className="rounded-xl border border-border bg-background/60 px-5 py-4 text-center backdrop-blur">
            <p className="text-3xl font-bold tabular-nums text-accent-light">
              {data.readiness.score}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted">Viral readiness</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 px-5 py-4 text-center backdrop-blur">
            <p className="text-3xl font-bold tabular-nums text-foreground">
              {data.monteCarlo.probabilityToReach}%
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted">Chance 1M</p>
          </div>
          <div className="rounded-xl border border-border bg-background/60 px-5 py-4 text-center backdrop-blur">
            <p className="flex items-center justify-center gap-1 text-3xl font-bold tabular-nums">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              {formatNumber(data.crowd.scaled.sharers)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted">Projected shares</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 mt-6 flex flex-wrap gap-3">
        <Link
          href={`/studio/${data.projectId}/write?focus=chorus&from=viral`}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-light"
        >
          Edit in Studio
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href={`/studio/${data.projectId}/analyze`}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-medium transition hover:border-accent/40"
        >
          Full analyze
        </Link>
      </div>
    </div>
  );
}