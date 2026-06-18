"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Copy, Plus } from "lucide-react";
import { useParams } from "next/navigation";
import { useStudioProject } from "@/lib/hooks/useStudioProject";
import { LyricsEditor } from "@/components/studio/LyricsEditor";
import { RewriteSuggestions } from "@/components/studio/RewriteSuggestions";
import { SectionSentimentStrip } from "@/components/studio/SectionSentimentStrip";
import { HookVoicePreview } from "@/components/studio/HookVoicePreview";
import { fetchCapabilities, generateFullSong, separateStemsWithElevenMusic, separateStemsWithLalal, ApiError } from "@/lib/api-client";
import type { LyricsSections } from "@/types/studio";
import { EMPTY_LYRICS } from "@/types/studio";
import { copyVersionAudio, saveAudioBlob } from "@/lib/studio/audio-db";
import { commandAddVersion, getProject } from "@/lib/domain/project-commands";
import { StudioFocusHint } from "@/components/studio/StudioFocusHint";
import { StudioStaleViralBanner } from "@/components/studio/StudioStaleViralBanner";
import { ViralLabCTA } from "@/components/viral/ViralLabCTA";
import { composeLyricsBody, hasLyricsContent } from "@/lib/studio/lyrics";
import { analyzeSectionSentiments } from "@pulseforge/shared/lib/musixmatch/section-intelligence";
import type { MxmCoachContext } from "@/types";
import type { ProjectVersion } from "@/types/studio";
import { getRichsync } from "@/lib/musixmatch/client";
import { parseRichsyncBody } from "@/lib/musixmatch/richsync-parser";
import { commandSaveTimelineEdits } from "@/lib/domain/project-commands";

function catalogMxmCoach(
  catalogMeta?: ProjectVersion["catalogMeta"]
): MxmCoachContext | undefined {
  if (!catalogMeta?.moods?.length && !catalogMeta?.themes?.length) return undefined;
  return {
    moods: catalogMeta.moods,
    themes: catalogMeta.themes,
    audienceRating: catalogMeta.audienceRating,
  };
}

const AUTOSAVE_MS = 800;

export function WriteTab() {
  const params = useParams();
  const projectId = params.id as string;
  const { project, ready, refresh, saveLyrics } = useStudioProject(projectId);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<{ versionId: string; lyrics: LyricsSections } | null>(null);
  const [elevenLabsEnabled, setElevenLabsEnabled] = useState(false);
  const [songUrl, setSongUrl] = useState<string | null>(null);
  const [isGeneratingSong, setIsGeneratingSong] = useState(false);

  useEffect(() => {
    fetchCapabilities()
      .then((c) => setElevenLabsEnabled(c.features.hookVoicePreview))
      .catch(() => setElevenLabsEnabled(false));
  }, []);

  const activeVersion = project?.versions.find((v) => v.id === project.activeVersionId);

  const flushSave = useCallback(() => {
    if (!pendingSave.current) return;
    const { versionId, lyrics } = pendingSave.current;
    saveLyrics(versionId, lyrics);
    pendingSave.current = null;
  }, [saveLyrics]);

  const handleChange = useCallback(
    (lyrics: LyricsSections) => {
      if (!activeVersion) return;
      pendingSave.current = { versionId: activeVersion.id, lyrics };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(flushSave, AUTOSAVE_MS);
    },
    [activeVersion, flushSave]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      flushSave();
    };
  }, [flushSave]);

  const handleNewVersion = async () => {
    flushSave();
    if (!project) return;
    const fromId = project.activeVersionId;
    const hadAudio = project.versions.find((v) => v.id === fromId)?.audio;
    commandAddVersion(project.id);
    if (hadAudio) {
      const updated = getProject(project.id);
      if (updated) {
        await copyVersionAudio(project.id, fromId, updated.activeVersionId);
      }
    }
    refresh();
  };

  const handleApplyRewrite = (lyrics: LyricsSections) => {
    if (!activeVersion) return;
    saveLyrics(activeVersion.id, lyrics);
    refresh();
  };

  const getBlobDuration = (blob: Blob): Promise<number> => new Promise(resolve => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      resolve(audio.duration);
      URL.revokeObjectURL(url);
    };
  });

  const getSectionWordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

  const handleGenerateSong = async () => {
    if (!project || !activeVersion) return;
    const fullLyrics = composeLyricsBody(lyrics);
    if (!fullLyrics.trim()) {
      alert("Fill in the lyrics first!");
      return;
    }
    setIsGeneratingSong(true);
    setSongUrl(null);
    try {
      const mxmCoach = activeVersion?.analysis?.meta?.mxmCoach ?? catalogMxmCoach(activeVersion?.catalogMeta);

      // Build a rich prompt for ElevenLabs Music (full song with real singing + instrumentation)
      // Include user's exact structured lyrics + MXM-derived style cues.
      const moods = (mxmCoach?.moods || []).map((m: string) => m.toLowerCase());
      const themes = (mxmCoach?.themes || []).slice(0, 3);

      const styleDescriptors: string[] = [];
      if (moods.some((m: string) => m.includes('energetic') || m.includes('upbeat') || m.includes('dance') || m.includes('happy'))) {
        styleDescriptors.push('energetic upbeat production', 'driving beats', 'bright energetic vocals');
      } else if (moods.some((m: string) => m.includes('sad') || m.includes('melancholic') || m.includes('emotional'))) {
        styleDescriptors.push('emotional ballad', 'expressive soulful vocals', 'atmospheric production');
      } else if (moods.some((m: string) => m.includes('chill') || m.includes('relaxed'))) {
        styleDescriptors.push('chill laid-back groove', 'smooth warm vocals');
      }
      if (themes.length) styleDescriptors.push(themes.join(', '));

      const projectTitle = project.title || '';
      const prompt = [
        `Studio-quality full song${projectTitle ? ` titled "${projectTitle}"` : ''}. ${styleDescriptors.length ? styleDescriptors.join(', ') + '. ' : ''}Natural expressive singing, professional mix, clear vocals.`,
        fullLyrics.trim(),
        `Sing the lyrics above exactly using the provided section structure [Verse], [Chorus] etc. High-fidelity production and instrumentation.`
      ].filter(Boolean).join('\n\n');

      const musicOpts = {
        modelId: 'music_v2',
        // rough length estimate (user can extend later). 3-5min typical
        musicLengthMs: 180000,
      };

      const blob = await generateFullSong(prompt, musicOpts);
      const url = URL.createObjectURL(blob);
      setSongUrl(url);
      // Auto play
      const audio = new Audio(url);
      audio.play().catch(() => {});
      // Save the produced full song (vocals + full instrumentation)
      await saveAudioBlob(project.id, activeVersion!.id, 'mix', blob);

      // Auto separate stems after full song generate (Eleven Music preferred for Music tracks, fallback LALAL)
      try {
        const stemFile = new File([blob], 'fullsong.mp3', { type: 'audio/mpeg' });
        let stemsResult = null;
        try {
          stemsResult = await separateStemsWithElevenMusic(stemFile);
        } catch {
          stemsResult = await separateStemsWithLalal(stemFile).catch(() => null);
        }
        if (stemsResult?.stems) {
          const mime = stemsResult.mimeType || 'audio/mpeg';
          for (const [stemId, b64] of Object.entries(stemsResult.stems)) {
            if (!b64) continue;
            const binary = atob(b64 as string);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            await saveAudioBlob(project.id, activeVersion!.id, stemId as 'vocals' | 'drums' | 'bass' | 'other' | 'mix', new Blob([bytes], { type: mime }));
          }
          // Note: stems meta will be picked up on Produce load or refresh
        }
      } catch (stemErr) {
        // non-blocking
        console.warn('Auto stem separation skipped:', stemErr);
      }

      // Maximize Musixmatch: use richsync for markers or word counts for auto sections
      const duration = await getBlobDuration(blob);
      let richsync: import("@/lib/musixmatch/richsync-parser").RichsyncParseResult | null = null;
      if (activeVersion?.catalogMeta?.mxmTrackId) {
        try {
          const trackIdNum = Number(activeVersion.catalogMeta.mxmTrackId);
          if (!Number.isNaN(trackIdNum)) {
            const body = await getRichsync(trackIdNum);
            richsync = body ? parseRichsyncBody(body) : null;
          }
        } catch {}
      }
      const baseEdits = activeVersion?.timelineEdits || { sections: [], updatedAt: new Date().toISOString() };
      let updates: Partial<import("@/types/viral").TimelineEdits> = {};
      if (richsync) {
        const markers = richsync.sections.map((s) => ({
          timePercent: (s.startSec / duration) * 100,
          label: s.text?.slice(0, 30) || "section",
        }));
        updates = { markers };
      } else {
        const counts = {
          verse1: getSectionWordCount(lyrics.verse1),
          chorus: getSectionWordCount(lyrics.chorus),
          verse2: getSectionWordCount(lyrics.verse2),
          bridge: getSectionWordCount(lyrics.bridge),
        };
        const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
        const props = {
          verse1: (counts.verse1 / total) * 100,
          chorus: (counts.chorus / total) * 100,
          verse2: (counts.verse2 / total) * 100,
          bridge: (counts.bridge / total) * 100,
        };
        const sections = [
          { sectionId: "verse1" as const, startPercent: 0, widthPercent: props.verse1 },
          { sectionId: "chorus1" as const, startPercent: props.verse1, widthPercent: props.chorus },
          { sectionId: "verse2" as const, startPercent: props.verse1 + props.chorus, widthPercent: props.verse2 },
          { sectionId: "chorus2" as const, startPercent: props.verse1 + props.chorus + props.verse2, widthPercent: props.chorus },
          { sectionId: "bridge" as const, startPercent: props.verse1 + props.chorus + props.verse2 + props.chorus, widthPercent: props.bridge },
        ] as import("@/types/viral").TimelineSectionEdit[];
        updates = { sections };
      }
      // Build simple composition plan for reuse in Produce (section-level editing)
      const compPlan = {
        chunks: [
          lyrics.verse1 ? { text: `[Verse 1]\n${lyrics.verse1}`, duration_ms: 20000, positive_styles: styleDescriptors } : null,
          lyrics.chorus ? { text: `[Chorus]\n${lyrics.chorus}`, duration_ms: 20000, positive_styles: styleDescriptors } : null,
          lyrics.verse2 ? { text: `[Verse 2]\n${lyrics.verse2}`, duration_ms: 20000, positive_styles: styleDescriptors } : null,
          lyrics.bridge ? { text: `[Bridge]\n${lyrics.bridge}`, duration_ms: 15000, positive_styles: styleDescriptors } : null,
        ].filter(Boolean),
      };

      const newEdits = {
        ...baseEdits,
        ...updates,
        generationPrompt: prompt.substring(0, 800),
        compositionPlan: compPlan,
        updatedAt: new Date().toISOString(),
      };
      commandSaveTimelineEdits(project.id, activeVersion!.id, newEdits);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Failed to generate song. Check ElevenLabs and lyrics.";
      alert(msg);
    } finally {
      setIsGeneratingSong(false);
    }
  };

  const handleImportToProduce = async (url: string) => {
    if (!project || !activeVersion) return;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      await saveAudioBlob(project.id, activeVersion.id, 'mix', blob);
      alert('Imported full produced song (with vocals + music) to Produce.');
    } catch {
      alert('Failed to import to Produce.');
    }
  };



  if (!ready || !project) return null;

  const lyrics = activeVersion?.lyrics ?? EMPTY_LYRICS;
  const mxmCoach =
    activeVersion?.analysis?.meta?.mxmCoach ?? catalogMxmCoach(activeVersion?.catalogMeta);
  const sectionInsights =
    activeVersion?.analysis?.lyrics.sectionInsights ??
    (hasLyricsContent(lyrics)
      ? analyzeSectionSentiments(lyrics, {
          moods: mxmCoach?.moods ? { main_moods: mxmCoach.moods } : undefined,
          themes: mxmCoach?.themes
            ? { main_themes: mxmCoach.themes.map((theme) => ({ theme })) }
            : undefined,
        })
      : undefined);

  return (
    <div className="space-y-6">
      <StudioFocusHint />
      <StudioStaleViralBanner projectId={projectId} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Lyrics Studio</h2>
          <p className="text-sm text-muted">
            Draft {activeVersion?.label ?? "v1"} — auto-saves locally
            {activeVersion?.catalogMeta?.mxmTrackId && (
              <span className="ml-2 text-accent-light">
                · Musixmatch {activeVersion.catalogMeta.releaseYear ?? "catalog"}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleNewVersion}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted transition hover:border-accent/40 hover:text-foreground"
          >
            <Copy className="h-3.5 w-3.5" />
            New version
          </button>
          <Link
            href={`/studio/${project.id}/analyze`}
            className="btn-primary !px-3 !py-2 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Analyze
          </Link>
        </div>
      </div>

      {hasLyricsContent(lyrics) && (
        <ViralLabCTA projectId={project.id} projectTitle={project.title} compact />
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="rounded-2xl border border-border bg-surface-elevated p-4 md:p-6">
          <LyricsEditor
            key={activeVersion?.id}
            lyrics={lyrics}
            onChange={handleChange}
          />
        </div>
        <div className="space-y-4">
          <HookVoicePreview lyrics={lyrics} enabled={elevenLabsEnabled} />
          <SectionSentimentStrip
            insights={sectionInsights}
            poweredByMxm={Boolean(mxmCoach?.moods?.length)}
          />
          <RewriteSuggestions
            lyrics={lyrics}
            onApply={handleApplyRewrite}
            mxmCoach={mxmCoach}
            sectionInsights={sectionInsights}
          />
        </div>
      </div>

      {/* Generate Full Song — now uses ElevenLabs Music API for real singing + full production */}
      <div className="rounded-2xl border border-border bg-surface-elevated p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Generate Full Song</h3>
            <p className="text-sm text-muted">Uses ElevenLabs Music (not plain TTS) to create a complete produced song with real singing vocals + instrumentation from your exact lyrics. MXM moods/themes are used to steer genre, energy and vocal style. Saves as full track. Import to Produce.</p>
          </div>
          <button
            onClick={() => void handleGenerateSong()}
            disabled={isGeneratingSong || !hasLyricsContent(lyrics)}
            className="btn-primary text-sm"
          >
            {isGeneratingSong ? "Generating..." : "Generate Full Song"}
          </button>
        </div>
        {songUrl && (
          <div className="mt-3">
            <audio controls src={songUrl} className="w-full" />
            <p className="text-xs text-muted mt-1">Full song (vocals + music) generated from your lyrics using ElevenLabs Music API. Professional studio output.</p>
            <button onClick={() => void handleImportToProduce(songUrl!)} className="btn-secondary text-xs mt-1">Import Full Song to Produce</button>
          </div>
        )}
      </div>
    </div>
  );
}