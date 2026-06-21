"use client";

import { Gauge } from "@/components/ui/Gauge";
import { Card, CardHeader } from "@/components/ui/Card";
import type { HitPotential } from "@/types";
import { cn } from "@/lib/utils";
import { TrendingUp, Music, Zap, Target } from "lucide-react";

const BREAKDOWN_CONFIG = [
  { key: "beatFit" as const, label: "Beat Fit", icon: Music },
  { key: "lyricVirality" as const, label: "Lyric Virality", icon: Zap },
  { key: "trendAlignment" as const, label: "Trend Alignment", icon: TrendingUp },
  { key: "hookStrength" as const, label: "Hook Strength", icon: Target },
];

const VERDICT_STYLES = {
  strong: { label: "Strong Hit Potential", className: "text-success bg-success/10 border-success/30" },
  promising: { label: "Promising", className: "text-accent-light bg-accent-muted border-accent/30" },
  "needs-work": { label: "Needs Work", className: "text-warning bg-warning/10 border-warning/30" },
};

interface HitPotentialPanelProps {
  data: HitPotential;
}

export function HitPotentialPanel({ data }: HitPotentialPanelProps) {
  const verdict = VERDICT_STYLES[data.verdict];

  return (
    <Card className="h-full">
      <CardHeader
        title="Hit Potential Score"
        subtitle="Composite score from beat, lyrics, trends & hook"
      />

      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-col items-center">
          <Gauge value={data.overall} label="Score" sublabel={`${data.confidence}% confidence`} />
          <span
            className={cn(
              "mt-4 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide",
              verdict.className
            )}
          >
            {verdict.label}
          </span>
        </div>

        <div className="w-full flex-1 space-y-3">
          {BREAKDOWN_CONFIG.map(({ key, label, icon: Icon }) => {
            const value = data.breakdown[key];
            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </span>
                  <span className="font-semibold tabular-nums">{value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-border">
                  <div
                    className="bar-accent transition-all duration-700"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}