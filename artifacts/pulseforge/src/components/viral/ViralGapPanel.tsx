
import { Link } from "wouter";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import type { ViralGap } from "@/types/viral";
import { studioDeepLink } from "@/lib/viral/music-timeline";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<ViralGap["severity"], string> = {
  critical: "border-border bg-surface-elevated text-foreground",
  high: "border-border bg-surface-elevated text-foreground",
  medium: "border-border bg-surface-elevated text-foreground",
  low: "border-border bg-surface-elevated text-foreground",
};

const SEVERITY_LABEL_STYLES: Record<ViralGap["severity"], string> = {
  critical: "text-warning",
  high: "text-orange-400",
  medium: "text-accent-light",
  low: "text-muted",
};

const CATEGORY_LABELS: Record<ViralGap["category"], string> = {
  lyrics: "Lyrics",
  hook: "Hook",
  production: "Production",
  audio: "Audio",
  distribution: "Distribution",
  structure: "Structure",
};

interface ViralGapPanelProps {
  gaps: ViralGap[];
  projectId: string;
}

export function ViralGapPanel({ gaps, projectId }: ViralGapPanelProps) {
  return (
    <Card>
      <CardHeader
        title="What's Missing for Viral?"
        subtitle="Gap analysis from crowd sim + hit scoring — click to fix in Studio"
      />

      {gaps.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
          <p className="text-sm text-success">
            No critical gaps detected. Keep polishing in Studio & push your launch plan.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {gaps.map((gap) => (
            <div
              key={gap.id}
              className={cn(
                "rounded-xl border p-4 transition",
                SEVERITY_STYLES[gap.severity]
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {gap.severity === "critical" && (
                      <AlertTriangle
                        className={cn("h-4 w-4 shrink-0", SEVERITY_LABEL_STYLES[gap.severity])}
                      />
                    )}
                    <span
                      className={cn(
                        "text-[10px] font-semibold uppercase tracking-wider",
                        SEVERITY_LABEL_STYLES[gap.severity]
                      )}
                    >
                      {CATEGORY_LABELS[gap.category]} · {gap.severity}
                    </span>
                    <span className="rounded-md bg-background/40 px-1.5 py-0.5 text-[10px] tabular-nums">
                      +{gap.impactPoints} pts potential
                    </span>
                  </div>
                  <h4 className="mt-1.5 text-sm font-semibold text-foreground">
                    {gap.title}
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">
                    {gap.description}
                  </p>
                  {(gap.currentValue || gap.targetValue) && (
                    <p className="mt-2 text-[10px] tabular-nums opacity-75">
                      {gap.metric}: {gap.currentValue} → target {gap.targetValue}
                    </p>
                  )}
                </div>
                <Link
                  href={studioDeepLink(projectId, gap.studioTab, gap.focus)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs font-medium text-foreground transition hover:border-accent/40"
                >
                  Fix in {gap.studioTab}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}