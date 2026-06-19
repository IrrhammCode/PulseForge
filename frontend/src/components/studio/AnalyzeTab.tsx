"use client";

import { useParams, useRouter } from "next/navigation";
import { useStudioProject } from "@/lib/hooks/useStudioProject";
import { StudioAnalyzePanel } from "@/components/studio/StudioAnalyzePanel";
import type { TrackAnalysis } from "@/types";
import { composeLyricsBody } from "@/lib/studio/lyrics";
import { buildCompositionPlan, buildFullSongPrompt } from "@pulseforge/shared/lib/studio/style-prompt";
import { generateFullSong } from "@/lib/api-client";
import { processGeneratedSong } from "@/lib/studio/audio-analysis";
import { saveAudioBlob } from "@/lib/studio/audio-db";
import {
  separateStemsWithMusixmatch,
  separateStemsWithElevenMusic,
  separateStemsWithLalal,
} from "@/lib/api-client";

export function AnalyzeTab() {
  const params = useParams();
  const projectId = params.id as string;
  const { project, ready, saveAnalysis, update, saveLyrics, saveAudio, updateStems } = useStudioProject(projectId);

  if (!ready || !project) return null;

  const handleAnalysisSaved = (analysis: TrackAnalysis) => {
    saveAnalysis(project.activeVersionId, analysis);
  };

  const router = useRouter();

  const doFullSave = async (blob: Blob, openProduce = false) => {
    const versionId = project.activeVersionId;
    const label = project.versions.find(v => v.id === versionId)?.label || 'v1';
    const fileName = `${(project.title || 'song')}-${label}`.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-') + '.mp3';
    try {
      const { meta, mixBlob } = await processGeneratedSong(blob, fileName);
      await saveAudioBlob(project.id, versionId, 'mix', mixBlob);
      await saveAudio(versionId, meta);

      // Auto stems directly after generate (musixmatch preferred after Auto Fix)
      const engine = project.musicArrangement?.stemEngine ?? 'auto';
      let stemSource: any = undefined;
      let stemsResult: any = null;
      const stemFile = new File([mixBlob], fileName, { type: meta.mimeType });
      if (engine === 'musixmatch' || engine === 'auto') {
        stemsResult = await separateStemsWithMusixmatch(stemFile).catch(() => null);
        if (stemsResult) stemSource = 'musixmatch';
      }
      if (!stemsResult && (engine === 'eleven' || engine === 'auto')) {
        stemsResult = await separateStemsWithElevenMusic(stemFile).catch(() => null);
        if (stemsResult) stemSource = 'client';
      }
      if (!stemsResult && (engine === 'lalal' || engine === 'auto')) {
        stemsResult = await separateStemsWithLalal(stemFile).catch(() => null);
        if (stemsResult) stemSource = 'lalal';
      }
      if (stemsResult?.stems) {
        const mime = stemsResult.mimeType || meta.mimeType;
        for (const [stemId, b64] of Object.entries(stemsResult.stems)) {
          if (!b64) continue;
          const bytes = new Uint8Array(atob(b64 as string).split('').map(c => c.charCodeAt(0)));
          await saveAudioBlob(project.id, versionId, stemId as any, new Blob([bytes], { type: mime }));
        }
        await updateStems(versionId, { stemsReady: true, stemSource, stems: meta.stems });
      }

      if (openProduce) {
        router.push(`/studio/${projectId}/produce`);
      }
    } catch (e) {
      console.error(e);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
    }
  };

  const handleAutoGenerateAndSave = (blob: Blob) => doFullSave(blob, false);
  const handleAutoGenerateAndSaveAndOpenProduce = (blob: Blob) => doFullSave(blob, true);

  return (
    <StudioAnalyzePanel 
      project={project} 
      onAnalysisSaved={handleAnalysisSaved}
      onUpdateProject={update}
      onSaveLyrics={saveLyrics}
      onSaveAudio={saveAudio}
      onUpdateStems={updateStems}
      saveFullSong={handleAutoGenerateAndSave}
      saveFullSongAndOpenProduce={handleAutoGenerateAndSaveAndOpenProduce}
    />
  );
}