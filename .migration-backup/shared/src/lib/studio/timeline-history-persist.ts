import type { TimelineEdits } from "@/types/viral";
import type { TimelineHistory } from "@/lib/studio/timeline-edits";

const STORAGE_PREFIX = "pulseforge_timeline_history:";

export function timelineHistoryKey(projectId: string, versionId: string): string {
  return `${STORAGE_PREFIX}${projectId}:${versionId}`;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function loadTimelineHistory(
  projectId: string,
  versionId: string
): TimelineHistory | null {
  const raw = storage()?.getItem(timelineHistoryKey(projectId, versionId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as TimelineHistory;
    if (!Array.isArray(parsed.past) || !Array.isArray(parsed.future)) return null;
    return {
      past: parsed.past,
      present: parsed.present,
      future: parsed.future,
    };
  } catch {
    return null;
  }
}

export function saveTimelineHistory(
  projectId: string,
  versionId: string,
  history: TimelineHistory
): void {
  storage()?.setItem(
    timelineHistoryKey(projectId, versionId),
    JSON.stringify(history)
  );
}

export function clearTimelineHistory(projectId: string, versionId: string): void {
  storage()?.removeItem(timelineHistoryKey(projectId, versionId));
}

/** Load persisted undo stack or seed from current timeline edits. */
export function resolveTimelineHistory(
  projectId: string,
  versionId: string,
  currentEdits?: TimelineEdits
): TimelineHistory {
  const loaded = loadTimelineHistory(projectId, versionId);
  if (loaded && (loaded.present || loaded.past.length > 0 || loaded.future.length > 0)) {
    return loaded;
  }
  return {
    past: [],
    present: currentEdits,
    future: [],
  };
}