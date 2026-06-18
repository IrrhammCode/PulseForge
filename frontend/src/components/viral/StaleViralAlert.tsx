"use client";

import { AlertTriangle } from "lucide-react";
import type { AnalysisStaleReason } from "@/types/studio";

const REASON_LABELS: Record<AnalysisStaleReason, string> = {
  lyrics_changed: "Lyrics changed since last Viral Lab run",
  audio_changed: "Demo audio changed since last Viral Lab run",
  metadata_changed: "Project content changed since last Viral Lab run",
  timeline_edited: "Timeline edited — re-run simulation for updated sections",
};

interface StaleViralAlertProps {
  reason?: AnalysisStaleReason;
  onRerun?: () => void;
  isRunning?: boolean;
}

export function StaleViralAlert({
  reason = "metadata_changed",
  onRerun,
  isRunning,
}: StaleViralAlertProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{REASON_LABELS[reason]}. Re-run simulation for updated gaps & crowd metrics.</p>
      </div>
      {onRerun && (
        <button
          type="button"
          onClick={onRerun}
          disabled={isRunning}
          className="rounded-lg border border-warning/40 px-3 py-1.5 text-xs font-medium transition hover:bg-warning/10 disabled:opacity-50"
        >
          {isRunning ? "Running…" : "Re-run now"}
        </button>
      )}
    </div>
  );
}