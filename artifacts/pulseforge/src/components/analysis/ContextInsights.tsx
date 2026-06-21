
import { Card, CardHeader } from "@/components/ui/Card";
import type { ReleaseHistoryInsights, SeasonalContext } from "@/types";
import { Calendar, History } from "lucide-react";

interface ContextInsightsProps {
  seasonal?: SeasonalContext;
  releaseHistory?: ReleaseHistoryInsights;
}

export function ContextInsights({ seasonal, releaseHistory }: ContextInsightsProps) {
  if (!seasonal && !releaseHistory?.available) return null;

  return (
    <Card>
      <CardHeader
        title="Cultural & Release Context"
        subtitle="Seasonal timing and your prior release performance"
      />

      {seasonal && (
        <div className="mb-4 rounded-xl border border-border bg-surface-elevated p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
            <Calendar className="h-3.5 w-3.5" />
            Seasonal alignment
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-2xl font-bold tabular-nums text-accent-light">
              {seasonal.alignmentScore}
            </span>
            <span className="rounded-full border border-border px-2.5 py-1 text-xs capitalize text-muted">
              {seasonal.releaseWindow} window
            </span>
          </div>
          {seasonal.activeMoments.length > 0 && (
            <p className="mt-2 text-sm text-muted">
              Active: {seasonal.activeMoments.join(" · ")}
            </p>
          )}
          {seasonal.nextOptimalWindow && seasonal.releaseWindow !== "optimal" && (
            <p className="mt-1 text-xs text-muted">
              Next fit: {seasonal.nextOptimalWindow}
            </p>
          )}
        </div>
      )}

      {releaseHistory?.available && (
        <div className="rounded-xl border border-border bg-surface-elevated p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
            <History className="h-3.5 w-3.5" />
            Release history
          </div>
          <p className="text-sm text-foreground">
            {releaseHistory.priorReleases} prior release
            {releaseHistory.priorReleases === 1 ? "" : "s"} · trajectory{" "}
            <span className="font-medium capitalize text-accent-light">
              {releaseHistory.trajectory}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted">
            Avg hit {releaseHistory.avgHitScore ?? "—"} · best{" "}
            {releaseHistory.bestHitScore ?? "—"} · avg 1M prob{" "}
            {releaseHistory.avgProb1M ?? "—"}%
          </p>
        </div>
      )}

      {releaseHistory && !releaseHistory.available && (
        <p className="text-sm text-muted">First release for this artist in Studio — no prior history yet.</p>
      )}
    </Card>
  );
}