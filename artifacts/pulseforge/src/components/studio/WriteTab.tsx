
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { Copy, Plus } from "lucide-react";
import { useParams } from "@/lib/navigation-compat";
import { useStudioProject } from "@/lib/hooks/useStudioProject";
import { LyricsEditor } from "@/components/studio/LyricsEditor";
import { RewriteSuggestions } from "@/components/studio/RewriteSuggestions";
import { SectionSentimentStrip } from "@/components/studio/SectionSentimentStrip";
import { HookVoicePreview } from "@/components/studio/HookVoicePreview";
import { fetchCapabilities } from "@/lib/api-client";
import type { LyricsSections } from "@/types/studio";
import { EMPTY_LYRICS } from "@/types/studio";
import { copyVersionAudio } from "@/lib/studio/audio-db";
import { commandAddVersion, getProject } from "@/lib/domain/project-commands";
import { StudioFocusHint } from "@/components/studio/StudioFocusHint";
import { StudioStaleViralBanner } from "@/components/studio/StudioStaleViralBanner";
import { ViralLabCTA } from "@/components/viral/ViralLabCTA";
import { hasLyricsContent } from "@/lib/studio/lyrics";
import { analyzeSectionSentiments } from "@pulseforge/shared/lib/musixmatch/section-intelligence";
import type { MxmCoachContext } from "@/types";
import type { MusicArrangement, ProjectVersion, SongCreativeBrief } from "@/types/studio";
import { primaryGenreLabel, primaryMoodLabel } from "@/types/studio";
import { SongConceptPanel } from "@/components/studio/SongConceptPanel";
import { MusicArrangementPanel } from "@/components/studio/MusicArrangementPanel";
import { applyConceptToLyrics } from "@pulseforge/shared/lib/studio/song-concept";
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
import { useRouter } from "@/lib/navigation-compat";
import {
  buildExampleApplyPatch,
  cloneExampleLyrics,
  getStudioExamplePreset,
} from "@pulseforge/shared/lib/studio/example-presets";
import { EMPTY_MUSIC_ARRANGEMENT } from "@pulseforge/shared/lib/studio/music-arrangement";
import { FillExampleButton } from "@/components/studio/FillExampleButton";
import { GenerateFullSongPanel } from "@/components/studio/GenerateFullSongPanel";

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
  const router = useRouter();
  const projectId = params.id as string;
  const { project, ready, refresh, saveLyrics, update, saveAudio, updateStems } =
    useStudioProject(projectId);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSave = useRef<{ versionId: string; lyrics: LyricsSections } | null>(null);
  const [elevenLabsEnabled, setElevenLabsEnabled] = useState(false);
  const [lyricsEpoch, setLyricsEpoch] = useState(0);

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

  const handleBriefChange = (creativeBrief: SongCreativeBrief) => {
    update({ creativeBrief });
  };

  const handleArrangementChange = (musicArrangement: MusicArrangement) => {
    update({ musicArrangement });
  };

  const handleFillExample = (presetId: string) => {
    const preset = getStudioExamplePreset(presetId);
    if (!preset || !activeVersion) return;
    const currentLyrics = activeVersion.lyrics ?? EMPTY_LYRICS;
    if (
      hasLyricsContent(currentLyrics) &&
      !confirm("Replace current lyrics and project settings with the example?")
    ) {
      return;
    }
    if (saveTimer.current) clearTimeout(saveTimer.current);
    pendingSave.current = null;
    const nextLyrics = cloneExampleLyrics(preset);
    update(buildExampleApplyPatch(preset));
    saveLyrics(activeVersion.id, nextLyrics);
    setLyricsEpoch((n) => n + 1);
  };

  const handleStyleChange = (patch: {
    genreTags: string[];
    moodTags: string[];
    genreCustom?: string;
    moodCustom?: string;
  }) => {
    const seed = { ...project!, ...patch };
    update({
      ...patch,
      genre: primaryGenreLabel(seed),
      mood: primaryMoodLabel(seed),
    });
  };

  if (!ready || !project || !activeVersion) return null;

  const lyrics = activeVersion.lyrics ?? EMPTY_LYRICS;
  const mxmCoach =
    activeVersion.analysis?.meta?.mxmCoach ?? catalogMxmCoach(activeVersion.catalogMeta);
  const sectionInsights =
    activeVersion.analysis?.lyrics.sectionInsights ??
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
            Draft {activeVersion.label} — auto-saves locally
            <span className="ml-2 text-accent-light">
              · {primaryGenreLabel(project)} × {primaryMoodLabel(project)}
            </span>
            {activeVersion.catalogMeta?.mxmTrackId && (
              <span className="ml-2 text-accent-light">
                · Musixmatch {activeVersion.catalogMeta.releaseYear ?? "catalog"}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FillExampleButton onFill={handleFillExample} compact />
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
          {mxmCoach && (
            <button
              type="button"
              onClick={async () => {
                // Full Auto Fix + Generate + Open Produce
                const moods = mxmCoach.moods || [];
                const themes = mxmCoach.themes || [];
                const briefPatch = {
                  story: `Inspired by MXM: intense ${moods[0] || 'feeling'} and ${themes[0] || 'longing'}.`,
                  emotionalArc: themes.length ? themes.join(' → ') + ' → release' : undefined,
                  listenerMoment: `Raw ${moods[0] || 'emotion'} in the hook`,
                  vocalCharacter: /heartbreak|angst/i.test(moods.join(' ')) ? 'Breathy intimate to powerful' : undefined,
                };
                const patches = { creativeBrief: { ...(activeVersion.creativeBrief || project.creativeBrief || {}), ...briefPatch }, moodTags: moods.length ? moods.slice(0,3) : project.moodTags, musicArrangement: { ...(project.musicArrangement || {}), stemEngine: 'musixmatch' as const } };
                update(patches);
                const updatedL = applyConceptToLyrics({ ...project, ...patches } as any, lyrics);
                saveLyrics(activeVersion.id, updatedL);

                // Langsung generate
                try {
                  const fullLyrics = composeLyricsBody(updatedL);
                  const compPlan = buildCompositionPlan(updatedL, { ...project, ...patches }, mxmCoach);
                  const prompt = buildFullSongPrompt({ ...project, ...patches }, fullLyrics, mxmCoach);
                  const blob = await generateFullSong(prompt, { modelId: 'music_v2', compositionPlan: compPlan });
                  const fileName = `${project.title || 'song'}-${activeVersion.label}.mp3`;
                  const { meta, mixBlob } = await processGeneratedSong(blob, fileName);
                  await saveAudioBlob(project.id, activeVersion.id, 'mix', mixBlob);
                  await saveAudio(activeVersion.id, meta);
                  // Auto stems
                  const stemFile = new File([mixBlob], fileName, { type: meta.mimeType });
                  const sRes = await separateStemsWithMusixmatch(stemFile).catch(() => null);
                  if (sRes?.stems) {
                    const mime = sRes.mimeType || meta.mimeType;
                    for (const [id, b64] of Object.entries(sRes.stems)) {
                      const bytes = new Uint8Array(atob(b64 as string).split('').map(c => c.charCodeAt(0)));
                      await saveAudioBlob(project.id, activeVersion.id, id as any, new Blob([bytes], { type: mime }));
                    }
                    await updateStems(activeVersion.id, { stemsReady: true, stemSource: 'musixmatch' });
                  }
                  router.push(`/studio/${projectId}/produce`);
                } catch (e) {
                  console.error(e);
                  alert('Auto Fix + Generate done (stems may need manual). Opened Produce.');
                  router.push(`/studio/${projectId}/produce`);
                }
              }}
              className="btn-secondary !px-3 !py-2 text-xs"
              title="Auto-apply MXM moods/themes to brief + refresh lyrics (maximizes generate prompts)"
            >
              Auto Fix (MXM)
            </button>
          )}
        </div>
      </div>

      {hasLyricsContent(lyrics) && (
        <ViralLabCTA projectId={project.id} projectTitle={project.title} compact />
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="rounded-2xl border border-border bg-surface-elevated p-4 md:p-6">
          <LyricsEditor
            key={`${activeVersion.id}-${lyricsEpoch}`}
            lyrics={lyrics}
            onChange={handleChange}
          />
          <MusicArrangementPanel
            arrangement={project.musicArrangement}
            onChange={handleArrangementChange}
          />
        </div>
        <div className="space-y-4">
          <SongConceptPanel
            project={project}
            lyrics={lyrics}
            onBriefChange={handleBriefChange}
            onStyleChange={handleStyleChange}
            onApplyLyrics={handleApplyRewrite}
            onFillExample={handleFillExample}
          />
          <HookVoicePreview
            lyrics={lyrics}
            enabled={elevenLabsEnabled}
            onVoiceHintChange={(hint) =>
              handleArrangementChange({
                ...EMPTY_MUSIC_ARRANGEMENT,
                ...project.musicArrangement,
                vocal: {
                  ...EMPTY_MUSIC_ARRANGEMENT.vocal,
                  ...project.musicArrangement?.vocal,
                  preferredVoiceHint: hint,
                },
              })
            }
          />
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

      <GenerateFullSongPanel
        project={project}
        activeVersion={activeVersion}
        lyrics={lyrics}
        mxmCoach={mxmCoach}
        saveAudio={saveAudio}
        updateStems={updateStems}
        onSaved={() => refresh()}
        onFillExample={handleFillExample}
      />
    </div>
  );
}
