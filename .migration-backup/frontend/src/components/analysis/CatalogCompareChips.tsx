"use client";

import { GitCompareArrows, Loader2 } from "lucide-react";
import type { CatalogBenchmark, SimilarTrackRef, TrackAnalysis } from "@/types";
import { cn } from "@/lib/utils";

interface CatalogCompareChipsProps {
  benchmark?: CatalogBenchmark;
  anchor?: TrackAnalysis | null;
  comparingId?: string | null;
  isLoading?: boolean;
  onCompare: (similar: SimilarTrackRef) => void;
}

export function CatalogCompareChips({
  benchmark,
  anchor,
  comparingId,
  isLoading,
  onCompare,
}: CatalogCompareChipsProps) {
  if (!benchmark?.similarTracks.length) return null;

  return (
    <div className="rounded-xl border border-border bg-surface-elevated p-4">
      <div className="mb-3 flex items-center gap-2">
        <GitCompareArrows className="h-4 w-4 text-accent-light" />
        <div>
          <p className="text-sm font-medium">Compare to similar hits</p>
          <p className="text-xs text-muted">
            One-click re-analyze against Musixmatch catalog peers
            {anchor?.track.title ? ` · anchor: ${anchor.track.title}` : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {benchmark.similarTracks.map((similar) => {
          const hookDelta =
            anchor?.lyrics.hookStrength != null && similar.hookStrength != null
              ? similar.hookStrength - anchor.lyrics.hookStrength
              : null;

          return (
            <button
              key={similar.id}
              type="button"
              disabled={isLoading}
              onClick={() => onCompare(similar)}
              className={cn(
                "inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs transition",
                comparingId === similar.id
                  ? "border-accent/40 bg-accent-muted text-accent-light"
                  : "border-border bg-surface text-muted hover:border-accent/30 hover:text-foreground",
                isLoading && "opacity-60"
              )}
            >
              {isLoading && comparingId === similar.id ? (
                <Loader2 className="h-3 w-3 shrink-0 animate-spin" />
              ) : null}
              <span className="truncate font-medium">{similar.title}</span>
              <span className="truncate text-muted/80">{similar.artist}</span>
              {hookDelta != null && (
                <span
                  className={cn(
                    "shrink-0 tabular-nums",
                    hookDelta >= 0 ? "text-success" : "text-danger"
                  )}
                >
                  {hookDelta >= 0 ? "+" : ""}
                  {hookDelta} hook
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}