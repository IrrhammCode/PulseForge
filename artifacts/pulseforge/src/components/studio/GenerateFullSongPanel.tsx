
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import {
  AlertCircle,
  Check,
  Download,
  Loader2,
  Music,
  RefreshCw,
  Save,
} from "lucide-react";
import {
  fetchCapabilities,
  fetchRichsync,
  generateFullSong,
  separateStemsWithElevenMusic,
  separateStemsWithLalal,
  separateStemsWithMusixmatch,
  ApiError,
} from "@/lib/api-client";
import {
  formatDuration,
  formatFileSize,
  processGeneratedSong,
} from "@/lib/studio/audio-analysis";
import { createAudioObjectUrl, getAudioBlob, saveAudioBlob } from "@/lib/studio/audio-db";
import { buildLyricsTimelineFromWordCounts, composeLyricsBody, hasLyricsContent } from "@/lib/studio/lyrics";
import { commandSaveTimelineEdits } from "@/lib/domain/project-commands";
import {
  buildArrangementPromptSuffix,
  estimateCompositionPlanDurationMs,
} from "@pulseforge/shared/lib/studio/music-arrangement";
import { buildCompositionPlan, buildFullSongPrompt } from "@pulseforge/shared/lib/studio/style-prompt";
import type { MxmCoachContext } from "@/types";
import type { LyricsSections, StudioProject } from "@/types/studio";
import type { ProjectVersion } from "@/types/studio";
import type { TimelineEdits } from "@/types/viral";
import { cn } from "@/lib/utils";
import { FillExampleButton } from "@/components/studio/FillExampleButton";
import { MusixmatchProTools } from "@/components/studio/MusixmatchProTools";

type GeneratePhase = "idle" | "planning" | "generating" | "ready" | "error";
type SavePhase = "idle" | "processing" | "stems" | "timeline" | "done" | "error";

interface GenerateFullSongPanelProps {
  project: StudioProject;
  activeVersion: ProjectVersion;
  lyrics: LyricsSections;
  mxmCoach?: MxmCoachContext;
  onSaved: (versionId: string) => void;
  onFillExample?: (presetId: string) => void;
  saveAudio: (versionId: string, meta: import("@/types/studio").DemoAudioMeta) => void;
  updateStems: (
    versionId: string,
    patch: Pick<import("@/types/studio").DemoAudioMeta, "stems" | "stemsReady" | "stemSource">
  ) => void;
}

function safeFileName(title: string, versionLabel: string): string {
  const base = `${title}-${versionLabel}`
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
  return `${base || "song"}.mp3`;
}

export function GenerateFullSongPanel({
  project,
  activeVersion,
  lyrics,
  mxmCoach,
  onSaved,
  onFillExample,
  saveAudio,
  updateStems,
}: GenerateFullSongPanelProps) {
  const [elevenMusicEnabled, setElevenMusicEnabled] = useState(false);
  const [generatePhase, setGeneratePhase] = useState<GeneratePhase>("idle");
  const [savePhase, setSavePhase] = useState<SavePhase>("idle");
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [songUrl, setSongUrl] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [stemsSaved, setStemsSaved] = useState(false);
  const [planSummary, setPlanSummary] = useState<{ chunks: number; durationSec: number } | null>(
    null
  );
  const [previewMeta, setPreviewMeta] = useState<{
    durationSec: number;
    sizeBytes: number;
  } | null>(null);
  const pendingEdits = useRef<TimelineEdits | null>(null);
  const versionIdRef = useRef(activeVersion.id);

  useEffect(() => {
    fetchCapabilities()
      .then((c) => setElevenMusicEnabled(c.features.elevenMusic))
      .catch(() => setElevenMusicEnabled(false));
  }, []);

  const revokeSongUrl = useCallback(() => {
    setSongUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  const setBlobPreview = useCallback(
    async (blob: Blob, saved: boolean) => {
      revokeSongUrl();
      setGeneratedBlob(blob);
      setSongUrl(createAudioObjectUrl(blob));
      setIsSaved(saved);
      setStemsSaved(saved && Boolean(activeVersion.audio?.stemsReady));
      setPreviewMeta({ durationSec: 0, sizeBytes: blob.size });
      try {
        const { meta } = await processGeneratedSong(
          blob,
          safeFileName(project.title, activeVersion.label)
        );
        setPreviewMeta({ durationSec: meta.durationSec, sizeBytes: meta.sizeBytes });
      } catch {
        setPreviewMeta({ durationSec: 0, sizeBytes: blob.size });
      }
    },
    [activeVersion.audio?.stemsReady, activeVersion.label, project.title, revokeSongUrl]
  );

  // Reset preview when switching versions
  useEffect(() => {
    if (versionIdRef.current === activeVersion.id) return;
    versionIdRef.current = activeVersion.id;
    revokeSongUrl();
    setGeneratedBlob(null);
    setIsSaved(false);
    setStemsSaved(false);
    setPreviewMeta(null);
    setPlanSummary(null);
    setGeneratePhase("idle");
    setSavePhase("idle");
    setGenerateError(null);
    setSaveError(null);
    pendingEdits.current = null;
  }, [activeVersion.id, revokeSongUrl]);

  // Load saved mix for current version
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!activeVersion.audio) return;
      const blob = await getAudioBlob(project.id, activeVersion.id, "mix");
      if (cancelled || !blob) return;
      await setBlobPreview(blob, true);
      setGeneratePhase("ready");
    })();
    return () => {
      cancelled = true;
    };
  }, [activeVersion.id, activeVersion.audio, project.id, setBlobPreview]);

  useEffect(() => () => revokeSongUrl(), [revokeSongUrl]);

  const buildGenerationContext = useCallback(() => {
    const fullLyrics = composeLyricsBody(lyrics);
    const compPlan = buildCompositionPlan(lyrics, project, mxmCoach);
    const arrangementSuffix = buildArrangementPromptSuffix(project.musicArrangement);
    const fallbackPrompt = buildFullSongPrompt(project, fullLyrics, mxmCoach);
    const generationMeta = [fallbackPrompt.slice(0, 400), arrangementSuffix]
      .filter(Boolean)
      .join(" ");
    const durationMs = estimateCompositionPlanDurationMs(compPlan);
    return { compPlan, generationMeta, durationMs, fullLyrics };
  }, [lyrics, project, mxmCoach]);







  // Very lightweight in-app lyric video generator (inspired by MXM Pro Video Gen)
  // Uses canvas + current audio + project lyrics timed simply by sections




  const handleGenerate = async () => {
    const { compPlan, generationMeta, durationMs, fullLyrics } = buildGenerationContext();
    if (!fullLyrics.trim()) return;

    setGenerateError(null);
    setSaveError(null);
    setIsSaved(false);
    setStemsSaved(false);
    setGeneratePhase("planning");
    setPlanSummary({
      chunks: compPlan.chunks.length,
      durationSec: Math.round(Math.max(durationMs, 120_000) / 1000),
    });

    try {
      setGeneratePhase("generating");
      const blob = await generateFullSong(fullLyrics, {
        modelId: "music_v2",
        compositionPlan: compPlan,
        musicLengthMs: Math.min(Math.max(durationMs, 120_000), 240_000),
      });

      await setBlobPreview(blob, false);
      setGeneratePhase("ready");

      const baseEdits = activeVersion.timelineEdits ?? {
        sections: [],
        updatedAt: new Date().toISOString(),
      };
      pendingEdits.current = {
        ...baseEdits,
        generationPrompt: generationMeta.substring(0, 800),
        compositionPlan: compPlan,
        updatedAt: new Date().toISOString(),
      };
    } catch (err) {
      setGeneratePhase("error");
      setGenerateError(
        err instanceof ApiError
          ? err.message
          : "Failed to generate song. Check ElevenLabs key and lyrics."
      );
    }
  };

  const finalizeTimelineEdits = async (blob: Blob, compPlan: NonNullable<TimelineEdits["compositionPlan"]>) => {
    const { meta } = await processGeneratedSong(
      blob,
      safeFileName(project.title, activeVersion.label)
    );
    const duration = meta.durationSec;
    let richsync: import("@/lib/musixmatch/richsync-parser").RichsyncParseResult | null = null;

    if (activeVersion.catalogMeta?.mxmTrackId) {
      try {
        const trackIdNum = Number(activeVersion.catalogMeta.mxmTrackId);
        if (!Number.isNaN(trackIdNum)) {
          const result = await fetchRichsync(trackIdNum);
          richsync = result?.richsync ?? null;
        }
      } catch {
        /* optional */
      }
    }

    const baseEdits = pendingEdits.current ??
      activeVersion.timelineEdits ?? { sections: [], updatedAt: new Date().toISOString() };

    let sectionUpdates: Partial<TimelineEdits> = {};
    if (richsync) {
      sectionUpdates = {
        markers: richsync.sections.map((s) => ({
          timePercent: (s.startSec / duration) * 100,
          label: s.text?.slice(0, 30) || "section",
        })),
      };
    } else {
      sectionUpdates = { sections: buildLyricsTimelineFromWordCounts(lyrics) };
    }

    const newEdits: TimelineEdits = {
      ...baseEdits,
      ...sectionUpdates,
      compositionPlan: compPlan,
      updatedAt: new Date().toISOString(),
    };
    commandSaveTimelineEdits(project.id, activeVersion.id, newEdits);
    pendingEdits.current = newEdits;
  };

  const handleSaveSong = async () => {
    if (!generatedBlob) return;

    setSaveError(null);
    setSavePhase("processing");

    try {
      const fileName = safeFileName(project.title, activeVersion.label);
      const { meta, mixBlob } = await processGeneratedSong(generatedBlob, fileName);
      const { compPlan } = buildGenerationContext();

      await saveAudioBlob(project.id, activeVersion.id, "mix", mixBlob);
      saveAudio(activeVersion.id, meta);
      setSavePhase("timeline");
      await finalizeTimelineEdits(mixBlob, compPlan);

      setSavePhase("stems");
      const engine = project.musicArrangement?.stemEngine ?? "auto";
      let stemSource: "client" | "lalal" | "musixmatch" | undefined;
      let stemsReady = false;

      try {
        const stemFile = new File([mixBlob], fileName, { type: meta.mimeType });
        const tryEleven = () => separateStemsWithElevenMusic(stemFile);
        const tryLalal = () => separateStemsWithLalal(stemFile);
        const tryMusixmatch = () => separateStemsWithMusixmatch(stemFile);

        let stemsResult: { stems?: Record<string, string>; mimeType?: string; source?: string } | null =
          null;

        if (engine === "eleven") {
          stemsResult = await tryEleven().catch(() => null);
          if (stemsResult) stemSource = "client";
        } else if (engine === "lalal") {
          stemsResult = await tryLalal().catch(() => null);
          if (stemsResult) stemSource = "lalal";
        } else if (engine === "musixmatch") {
          stemsResult = await tryMusixmatch().catch(() => null);
          if (stemsResult) stemSource = "musixmatch";
        } else {
          // auto: prefer Musixmatch if key present, then Eleven, then LALAL
          try {
            stemsResult = await tryMusixmatch();
            stemSource = "musixmatch";
          } catch {
            try {
              stemsResult = await tryEleven();
              stemSource = "client";
            } catch {
              stemsResult = await tryLalal().catch(() => null);
              if (stemsResult) stemSource = "lalal";
            }
          }
        }

        if (stemsResult?.stems) {
          const mime = stemsResult.mimeType || meta.mimeType;
          for (const [stemId, b64] of Object.entries(stemsResult.stems)) {
            if (!b64) continue;
            const binary = atob(b64 as string);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            await saveAudioBlob(
              project.id,
              activeVersion.id,
              stemId as "vocals" | "drums" | "bass" | "other",
              new Blob([bytes], { type: mime })
            );
          }
          stemsReady = true;
          updateStems(activeVersion.id, {
            stems: meta.stems,
            stemsReady: true,
            stemSource,
          });
          setStemsSaved(true);
        }
      } catch (stemErr) {
        console.warn("Stem separation skipped:", stemErr);
      }

      setIsSaved(true);
      setSavePhase("done");
      onSaved(activeVersion.id);
    } catch (err) {
      setSavePhase("error");
      setSaveError(err instanceof Error ? err.message : "Failed to save song to studio.");
    }
  };

  const handleDownload = () => {
    if (!generatedBlob || !songUrl) return;
    const a = document.createElement("a");
    a.href = songUrl;
    a.download = safeFileName(project.title, activeVersion.label);
    a.click();
  };

  const isGenerating = generatePhase === "planning" || generatePhase === "generating";
  const isSaving = savePhase === "processing" || savePhase === "stems" || savePhase === "timeline";
  const hasPreview = Boolean(songUrl && generatedBlob);
  const lyricsReady = hasLyricsContent(lyrics);

  const saveLabel =
    savePhase === "processing"
      ? "Processing audio…"
      : savePhase === "timeline"
        ? "Saving timeline…"
        : savePhase === "stems"
          ? "Separating stems…"
          : isSaved
            ? "Saved to Studio"
            : "Save to Studio";

  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Music className="h-4 w-4 text-accent-light" />
            <h3 className="font-semibold">Generate Full Song</h3>
          </div>
          <p className="mt-1 text-sm text-muted">
            ElevenLabs <code className="text-xs">composition_plan</code> — lyrics, genre/mood, creative
            brief, arrangement, dan vocal character (delivery per section + anti-AI negatives).
            After generate: Match &amp; Enrich from MXM + full Lyrics/Analysis/Catalog/Translation/Video tools (also available in Produce).
          </p>
          {!elevenMusicEnabled && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-warning">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Set <code>ELEVENLABS_API_KEY</code> in backend to enable generation.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onFillExample && !lyricsReady && (
            <FillExampleButton onFill={onFillExample} compact />
          )}
          <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={isGenerating || isSaving || !lyricsReady || !elevenMusicEnabled}
          className="btn-primary text-sm"
        >
          {isGenerating ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {generatePhase === "planning" ? "Building plan…" : "Generating…"}
            </span>
          ) : hasPreview ? (
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Regenerate
            </span>
          ) : (
            "Generate Full Song"
          )}
        </button>
        </div>
      </div>

      {planSummary && (
        <p className="mt-3 text-xs text-muted">
          Plan: {planSummary.chunks} sections · ~{formatDuration(planSummary.durationSec)} estimated
        </p>
      )}

      {generateError && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {generateError}
        </div>
      )}

      {hasPreview && (
        <div className="mt-4 space-y-3 rounded-xl border border-border/60 bg-surface/40 p-4">
          <audio controls src={songUrl!} className="w-full" />

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            {previewMeta && previewMeta.durationSec > 0 && (
              <span>Duration: {formatDuration(previewMeta.durationSec)}</span>
            )}
            {previewMeta && <span>Size: {formatFileSize(previewMeta.sizeBytes)}</span>}
            <span
              className={cn(
                "inline-flex items-center gap-1 font-medium",
                isSaved ? "text-success" : "text-accent-light"
              )}
            >
              {isSaved ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Saved — ready in Produce
                  {stemsSaved && " · stems ready"} {activeVersion.audio?.stemSource === "musixmatch" && "(musixmatch)"}
                </>
              ) : (
                "Unsaved preview — listen first, then save"
              )}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSaveSong()}
              disabled={isSaving || isGenerating || isSaved}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition",
                isSaved
                  ? "border border-success/30 bg-success/10 text-success"
                  : "btn-primary"
              )}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isSaved ? (
                <Check className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saveLabel}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={!generatedBlob}
              className="btn-secondary inline-flex items-center gap-1.5 text-sm"
            >
              <Download className="h-4 w-4" />
              Download MP3
            </button>

            {isSaved && (
              <Link
                href={`/studio/${project.id}/produce`}
                className="btn-secondary inline-flex items-center gap-1.5 text-sm"
              >
                Open Produce
              </Link>
            )}
          </div>

          {/* Reusable Musixmatch Pro Tools — includes Match & Enrich, all 5 tools, and improved video export with audio */}
          <MusixmatchProTools
            project={project}
            versionId={activeVersion.id}
            lyrics={lyrics}
            audioUrl={songUrl}
            mixBlob={generatedBlob}
            mxmTrackId={activeVersion.catalogMeta?.mxmTrackId}
            onApplyEnrichment={(data) => {
              // Small nice feature: show user the applied data
              console.log('[MXM Enrich applied]', data);
              // Could later update creativeBrief via hook, for now give clear feedback
              alert(`MXM data applied!\nMoods: ${data.moods?.join(', ') || '—'}\n\nYou can paste the meaning into your Creative Brief.`);
            }}
          />

          {saveError && (
            <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {saveError}
            </div>
          )}

          {!isSaved && (
            <p className="text-[11px] text-muted">
              Save writes the mix to this version, builds the NLE timeline, and runs stem separation
              ({project.musicArrangement?.stemEngine ?? "auto"} — Musixmatch recommended if key available).
            </p>
          )}
        </div>
      )}

    </div>
  );
}
