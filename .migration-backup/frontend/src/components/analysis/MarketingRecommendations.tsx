"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import type { MarketingRecommendation } from "@/types";
import { Megaphone, Clock, ListMusic, Share2, FileImage } from "lucide-react";

const CATEGORY_ICONS = {
  social: Share2,
  playlist: ListMusic,
  content: FileImage,
  timing: Clock,
};

const PRIORITY_STYLES = {
  high: "border-danger/40 bg-danger/5 text-danger",
  medium: "border-warning/40 bg-warning/5 text-warning",
  low: "border-border bg-surface-elevated text-muted",
};

interface MarketingRecommendationsProps {
  recommendations: MarketingRecommendation[];
}

export function MarketingRecommendations({ recommendations }: MarketingRecommendationsProps) {
  const sorted = [...recommendations].sort((a, b) => b.impactEstimate - a.impactEstimate);

  return (
    <Card>
      <CardHeader
        title="Marketing Playbook"
        subtitle="Actionable recommendations ranked by impact"
        action={
          <Megaphone className="h-5 w-5 text-accent-light" />
        }
      />

      <div className="space-y-3">
        {sorted.map((rec, i) => {
          const Icon = CATEGORY_ICONS[rec.category];
          return (
            <div
              key={rec.id}
              className="group rounded-xl border border-border bg-surface-elevated p-4 transition hover:border-accent/25"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-accent-muted text-xs font-bold text-accent-light">
                    {i + 1}
                  </span>
                  <Icon className="h-4 w-4 text-muted" />
                  <h4 className="font-medium text-foreground">{rec.title}</h4>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${PRIORITY_STYLES[rec.priority]}`}
                >
                  {rec.priority}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted">{rec.description}</p>
              <div className="mt-2 flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
                  <div
                    className="bar-accent"
                    style={{ width: `${rec.impactEstimate * 4}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium tabular-nums text-muted">
                  +{rec.impactEstimate}% est.
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}