
import { useEffect, useRef } from "react";
import type { StudioProject } from "@/types/studio";
import { detectViralStaleness } from "@/lib/domain/workflow";
import { computeContentFingerprint } from "@/lib/domain/fingerprint";
import { hasLyricsContent } from "@/lib/studio/lyrics";

const AUTO_KEY = "pulseforge_auto_reviral";

export function isAutoReviralEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTO_KEY) === "true";
}

export function setAutoReviralEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTO_KEY, enabled ? "true" : "false");
}

interface UseAutoViralRefreshOptions {
  project: StudioProject | null;
  enabled?: boolean;
  onRerun: () => Promise<unknown>;
}

/** Background re-viral once per stale fingerprint when auto mode is on. */
export function useAutoViralRefresh({
  project,
  enabled = isAutoReviralEnabled(),
  onRerun,
}: UseAutoViralRefreshOptions) {
  const lastRunRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !project) return;

    const version =
      project.versions.find((v) => v.id === project.activeVersionId) ??
      project.versions[0];
    if (!version || !hasLyricsContent(version.lyrics)) return;

    const staleness = detectViralStaleness(version, project);
    if (!staleness.stale) return;

    const fingerprint = computeContentFingerprint(
      version.lyrics,
      version.audio,
      project
    );
    const key = `${project.id}:${version.id}:${fingerprint}`;
    if (lastRunRef.current === key) return;
    lastRunRef.current = key;

    void onRerun();
  }, [enabled, project, onRerun]);
}