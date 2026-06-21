import type { TrackAnalysis } from "@/types";
import { Target, TrendingUp, Zap, Clock } from "lucide-react";

interface StatsStripProps {
  analysis: TrackAnalysis;
  scoreDelta?: number;
}

export function StatsStrip({ analysis, scoreDelta = 0 }: StatsStripProps) {
  const { hitPotential, simulation, lyrics } = analysis;

  const stats = [
    {
      icon: Target,
      label: "Hit Score",
      value: String(hitPotential.overall),
      delta: scoreDelta !== 0 ? scoreDelta : undefined,
    },
    {
      icon: TrendingUp,
      label: "1M Chance",
      value: `${simulation.probabilityToReach}%`,
    },
    {
      icon: Zap,
      label: "Hook",
      value: String(lyrics.hookStrength),
    },
    {
      icon: Clock,
      label: "Median",
      value: `${simulation.medianWeeks}w`,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group rounded-xl border border-border bg-surface-elevated p-3 transition hover:border-accent/25"
        >
          <div className="flex items-center justify-between">
            <stat.icon className="h-3.5 w-3.5 text-accent-light" />
            {stat.delta !== undefined && (
              <span
                className={`text-[10px] font-bold tabular-nums ${
                  stat.delta > 0 ? "text-success" : "text-danger"
                }`}
              >
                {stat.delta > 0 ? "+" : ""}
                {stat.delta}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xl font-bold tabular-nums text-foreground">
            {stat.value}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-muted">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}