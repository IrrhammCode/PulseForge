
import { useCallback, useEffect, useState } from "react";
import type { StudioProject } from "@/types/studio";
import type { TrackAnalysis } from "@/types";
import type { DemoAudioMeta, LaunchPlan, LyricsSections } from "@/types/studio";
import { copyVersionAudio } from "@/lib/studio/audio-db";
import {
  commandAddVersion,
  commandSaveAnalysis,
  commandSaveAudio,
  commandSaveLaunchPlan,
  commandSaveLyrics,
  commandSaveViral,
  commandUpdateProject,
  commandUpdateStems,
  getProject,
} from "@/lib/domain/project-commands";
import type { ViralSnapshot } from "@/types/viral";

export function useStudioProject(projectId: string) {
  const [project, setProject] = useState<StudioProject | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    const p = getProject(projectId);
    setProject(p);
    setReady(true);
    return p;
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "pulseforge_studio_projects") refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const update = useCallback(
    (patch: Parameters<typeof commandUpdateProject>[1]) => {
      const updated = commandUpdateProject(projectId, patch);
      if (updated) setProject(updated);
      return updated;
    },
    [projectId]
  );

  const saveLyrics = useCallback(
    (versionId: string, lyrics: LyricsSections) => {
      const updated = commandSaveLyrics(projectId, versionId, lyrics);
      if (updated) setProject(updated);
      return updated;
    },
    [projectId]
  );

  const saveAnalysis = useCallback(
    (versionId: string, analysis: TrackAnalysis) => {
      const updated = commandSaveAnalysis(projectId, versionId, analysis);
      if (updated) setProject(updated);
      return updated;
    },
    [projectId]
  );

  const saveAudio = useCallback(
    (versionId: string, audio: DemoAudioMeta | undefined) => {
      const updated = commandSaveAudio(projectId, versionId, audio);
      if (updated) setProject(updated);
      return updated;
    },
    [projectId]
  );

  const updateStems = useCallback(
    (versionId: string, patch: Parameters<typeof commandUpdateStems>[2]) => {
      const updated = commandUpdateStems(projectId, versionId, patch);
      if (updated) setProject(updated);
      return updated;
    },
    [projectId]
  );

  const saveLaunchPlan = useCallback(
    (versionId: string, launchPlan: LaunchPlan) => {
      const updated = commandSaveLaunchPlan(projectId, versionId, launchPlan);
      if (updated) setProject(updated);
      return updated;
    },
    [projectId]
  );

  const saveViral = useCallback(
    (versionId: string, snapshot: ViralSnapshot) => {
      const updated = commandSaveViral(projectId, versionId, snapshot);
      if (updated) setProject(updated);
      return updated;
    },
    [projectId]
  );

  const createVersion = useCallback(
    async (label?: string) => {
      const current = getProject(projectId);
      const fromVersionId = current?.activeVersionId;
      const hadAudio = current?.versions.find((v) => v.id === fromVersionId)?.audio;

      const updated = commandAddVersion(projectId, label);
      if (updated) {
        setProject(updated);
        if (fromVersionId && hadAudio) {
          const newVersionId = updated.activeVersionId;
          await copyVersionAudio(projectId, fromVersionId, newVersionId);
        }
      }
      return updated;
    },
    [projectId]
  );

  return {
    project,
    ready,
    refresh,
    update,
    saveLyrics,
    saveAnalysis,
    saveAudio,
    updateStems,
    saveLaunchPlan,
    saveViral,
    createVersion,
  };
}