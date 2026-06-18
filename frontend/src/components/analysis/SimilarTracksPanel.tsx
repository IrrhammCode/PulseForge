"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import type { CatalogBenchmark } from "@/types";
import { Music2, TrendingUp } from "lucide-react";

interface SimilarTracksPanelProps {
  benchmark?: CatalogBenchmark;
}

export function SimilarTracksPanel({ benchmark }: SimilarTracksPanelProps) {
  if (!benchmark?.similarTracks.length) return null;

  return (
    <Card>
      <CardHeader
        title="Catalog Intelligence"
        subtitle="Similar hits from Musixmatch analysis.search — grounds 1M simulation priors"
      />

      <div className="mb-4 flex flex-wrap gap-3 text-xs text-muted">
        {benchmark.medianHookStrength != null && (
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-elevated px-2.5 py-1">
            <TrendingUp className="h-3 w-3 text-accent" />
            Median hook: {benchmark.medianHookStrength}
          </span>
        )}
        {benchmark.medianRating != null && (
          <span className="rounded-full border border-border bg-surface-elevated px-2.5 py-1">
            Median MXM rating: {benchmark.medianRating}
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {benchmark.similarTracks.map((track) => (
          <li
            key={track.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-elevated px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{track.title}</p>
              <p className="truncate text-xs text-muted">{track.artist}</p>
              {track.moods?.length ? (
                <p className="mt-1 truncate text-[10px] uppercase tracking-wider text-muted">
                  {track.moods.join(" · ")}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs tabular-nums text-muted">
              {track.hookStrength != null && <span>Hook {track.hookStrength}</span>}
              <Music2 className="h-3.5 w-3.5" />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}