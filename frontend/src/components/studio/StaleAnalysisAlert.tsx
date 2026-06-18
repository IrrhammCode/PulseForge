"use client";

import { AlertTriangle } from "lucide-react";
import type { AnalysisStaleReason } from "@/types/studio";

const REASON_LABELS: Record<AnalysisStaleReason, string> = {
  lyrics_changed: "Lyrics changed since last analyze",
  audio_changed: "Demo audio changed since last analyze",
  metadata_changed: "Project metadata changed since last analyze",
  timeline_edited: "Timeline edited since last analyze",
};

interface StaleAnalysisAlertProps {
  reason?: AnalysisStaleReason;
  onReanalyze?: () => void;
  isAnalyzing?: boolean;
}

export function StaleAnalysisAlert({
  reason = "metadata_changed",
  onReanalyze,
  isAnalyzing,
}: StaleAnalysisAlertProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{REASON_LABELS[reason]}. Re-run analyze for an updated score.</p>
      </div>
      {onReanalyze && (
        <button
          type="button"
          onClick={onReanalyze}
          disabled={isAnalyzing}
          className="rounded-lg border border-warning/40 px-3 py-1.5 text-xs font-medium transition hover:bg-warning/10 disabled:opacity-50"
        >
          {isAnalyzing ? "Analyzing…" : "Re-analyze now"}
        </button>
      )}
    </div>
  );
}