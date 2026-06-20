"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  BarChart3,
  Database,
  Languages,
  Video,
  Search,
  X,
  Loader2,
  Download,
  Play,
} from "lucide-react";
import {
  fetchLyrics,
  fetchLyricsAnalysis,
  fetchLyricsTranslation,
  fetchRichsync,
  fetchMxmVideoSync,
  fetchWhisperLyricAlign,
  searchTracks,
  fetchCatalogSimilar,
  translateProjectLyrics,
  ApiError,
} from "@/lib/api-client";
import { composeLyricsBody, hasLyricsContent } from "@/lib/studio/lyrics";
import type { LyricsSections, StudioProject } from "@/types/studio";
import { cn } from "@/lib/utils";
import { resolveProjectAnalysis } from "@pulseforge/shared/lib/musixmatch/project-lyrics-intelligence";
import {
  buildLyricVideoTimedLines,
  richsyncMatchesProjectLyrics,
  type TimedLyricLine,
} from "@pulseforge/shared/lib/musixmatch/lyric-video-timing";
import {
  alignTimedLinesToVocalOnsets,
  resolveDisplayLineAt,
  type VocalActivityProfile,
} from "@pulseforge/shared/lib/musixmatch/vocal-gap-sync";
import { resolveMxmStrictDisplay } from "@pulseforge/shared/lib/musixmatch/mxm-video-sync";
import { buildTimedLinesFromVocalPhrases } from "@pulseforge/shared/lib/musixmatch/audio-vocal-sync";
import { collectProjectLinesWithSections } from "@pulseforge/shared/lib/musixmatch/sync-quality";
import { analyzeMixVocalActivity } from "@/lib/studio/vocal-activity";
import { translationLanguageLabel } from "@pulseforge/shared/lib/musixmatch/translate-lyrics";

interface MxmProToolsProps {
  project: StudioProject;
  versionId: string;
  lyrics: LyricsSections;
  audioUrl?: string | null;
  mixBlob?: Blob | null; // preferred for export
  mxmTrackId?: string | number | null;
  richsync?: any; // optional pre-fetched richsync from parent (Produce etc)
  mxmAnalysis?: any; // optional pre-fetched analysis
  onApplyEnrichment?: (data: { moods: string[]; themes: string[]; meaning?: string; reference?: any }) => void;
}

type ToolKey = "lyrics" | "analysis" | "catalog" | "translation" | "video";

function normalizeForMatch(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 40);
}

export function MusixmatchProTools({
  project,
  versionId,
  lyrics,
  audioUrl,
  mixBlob,
  mxmTrackId: initialMxmId,
  richsync: preloadedRichsync,
  mxmAnalysis: preloadedAnalysis,
  onApplyEnrichment,
}: MxmProToolsProps) {
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [toolData, setToolData] = useState<any>(null);
  const [toolError, setToolError] = useState<string | null>(null);

  const [transLang, setTransLang] = useState("id");
  const [enrichedRef, setEnrichedRef] = useState<any>(null); // selected MXM reference track + data

  // Video MXM data (richsync for accurate timing, analysis for visuals)
  const [videoRichsync, setVideoRichsync] = useState<any>(null);
  const [videoMxmAnalysis, setVideoMxmAnalysis] = useState<any>(null);
  const [mxmSyncSource, setMxmSyncSource] = useState<string | null>(null);

  // Track if we have started a preview for auto-refresh
  const [previewStarted, setPreviewStarted] = useState(false);

  // Generated scene prompts from MXM (for Runway, Kling, Luma, CapCut AI, etc.)
  const [scenePrompts, setScenePrompts] = useState<string[] | null>(null);

  // API-style preview flow: click Preview → loading from MXM → reveal the video
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [videoPreviewReady, setVideoPreviewReady] = useState(false);

  // Video options for better export
  const [videoStyle, setVideoStyle] = useState<'energetic' | 'minimal' | 'dark'>('energetic');
  const [videoRes, setVideoRes] = useState<720 | 1080>(720);
  const [karaokeMode, setKaraokeMode] = useState<'auto' | 'precise' | 'word'>('auto'); // auto prefers richsync chars per MXM docs
  /** Positive = delay lyrics vs audio (fixes highlight racing ahead). */
  const [syncOffsetSec, setSyncOffsetSec] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoAnimRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const vocalActivityRef = useRef<VocalActivityProfile | null>(null);
  const syncCacheRef = useRef<{
    lines: TimedLyricLine[];
    source: string;
    useStrict: boolean;
    richsync?: any;
  } | null>(null);

  // Shared stop to prevent multiple audio instances playing at once
  const stopCurrentPreview = useCallback(() => {
    if (videoAnimRef.current) {
      cancelAnimationFrame(videoAnimRef.current);
      videoAnimRef.current = null;
    }
    if (audioElRef.current) {
      try {
        audioElRef.current.pause();
        audioElRef.current.currentTime = 0;
      } catch {}
      audioElRef.current = null;
    }
  }, []);

  const fullLyrics = composeLyricsBody(lyrics);
  const hasContent = hasLyricsContent(lyrics);

  // Effective data for video (prefer preloaded > fetched in video > enriched)
  const effectiveRichsync = preloadedRichsync || videoRichsync || null;
  const effectiveAnalysis = preloadedAnalysis || videoMxmAnalysis || enrichedRef?.analysis || null;

  // Small enhancement: auto-suggest quick enrich the first time the tools are visible with a saved mix
  const [suggested, setSuggested] = useState(false);
  useEffect(() => {
    if (hasContent && !enrichedRef && !suggested && (audioUrl || mixBlob)) {
      // don't auto-fire heavy API, just keep the button visible (already is)
      setSuggested(true);
    }
  }, [hasContent, audioUrl, mixBlob, enrichedRef]);



  const closeTool = useCallback(() => {
    setActiveTool(null);
    setToolData(null);
    setToolError(null);
    setToolLoading(false);
    setPreviewStarted(false);
    setScenePrompts(null);
    setIsVideoGenerating(false);
    setVideoPreviewReady(false);

    stopCurrentPreview();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  }, [stopCurrentPreview]);

  // === Match & Enrich from MXM (auto search by title/artist) ===
  const runMatchEnrich = async () => {
    setToolLoading(true);
    setToolError(null);
    try {
      const q = `${project.title || ""} ${project.artistName || ""}`.trim();
      if (!q) throw new Error("Missing title/artist");

      const results = await searchTracks(q);
      if (!results || results.length === 0) {
        setToolError("No matching tracks found on Musixmatch. Try different spelling.");
        return;
      }

      // Pick best match — prefer tracks with MXM richsync/subtitle sync
      const pick =
        results.find((r: { hasRichsync?: boolean }) => r.hasRichsync) ?? results[0];
      const trackId = Number(pick.id);
      const commontrackId = pick.commontrackId ? Number(pick.commontrackId) : undefined;

      const [mxmLyrics, mxmAnalysis] = await Promise.all([
        fetchLyrics(trackId).catch(() => null),
        fetchLyricsAnalysis(trackId, commontrackId).catch(() => null),
      ]);

      const ref = {
        track: pick,
        lyrics: mxmLyrics?.lyrics ?? null,
        analysis: mxmAnalysis?.analysis ?? null,
      };

      setEnrichedRef(ref);

      const resolved = resolveProjectAnalysis(lyrics, ref.analysis);

      // Auto open analysis with merged local + MXM data
      setActiveTool("analysis");
      setToolData({
        source: resolved.source,
        reference: ref.track,
        project: {
          title: project.title,
          artist: project.artistName,
          genre: project.genre,
          mood: project.mood,
          bpm: project.bpmTarget,
        },
        local: resolved,
        mxm: ref.analysis,
        mxmLyrics: ref.lyrics,
      });

      // Optional callback for parent (e.g. to persist)
      if (onApplyEnrichment) {
        onApplyEnrichment({
          moods: ref.analysis?.moods?.main_moods || [],
          themes: (ref.analysis?.themes?.main_themes || []).map((t: any) => t.theme || t),
          meaning: ref.analysis?.meaning?.explanation,
          reference: ref.track,
        });
      }
    } catch (e: any) {
      setToolError(e?.message || "Match & Enrich failed (check Musixmatch key)");
    } finally {
      setToolLoading(false);
    }
  };

  // Apply MXM analysis data to creative brief / tags (helpful small feature)
  const applyMxmToBrief = () => {
    const mxm = toolData?.local?.analysis || toolData?.mxm || enrichedRef?.analysis;
    const refTrack = enrichedRef?.track || toolData?.reference;

    if (!mxm) {
      setToolError("No analysis loaded yet. Open Analysis or click Match & Enrich.");
      return;
    }

    const moods = mxm.moods?.main_moods || mxm.main_moods || [];
    const themesRaw = mxm.themes?.main_themes || mxm.main_themes || [];
    const themes = themesRaw.map((t: any) => (typeof t === 'string' ? t : t.theme || t)).filter(Boolean);
    const meaning = mxm.meaning?.explanation || mxm.explanation || '';

    const briefText = [
      `Reference: ${refTrack?.title || project.title} by ${refTrack?.artist || project.artistName}`,
      moods.length ? `Moods: ${moods.join(', ')}` : '',
      themes.length ? `Themes: ${themes.join(' • ')}` : '',
      meaning ? `Meaning: ${meaning}` : '',
    ].filter(Boolean).join('\n');

    navigator.clipboard?.writeText(briefText).catch(() => {});
    alert('MXM analysis copied to clipboard!\n\nPaste it into your Creative Brief (story / emotional arc / listener moment).');

    // Also call parent callback if provided
    if (onApplyEnrichment) {
      onApplyEnrichment({ moods, themes, meaning, reference: refTrack });
    }

    // Mark as applied in current view
    setToolData((d: any) => d ? { ...d, applied: true } : d);
  };

  const openTool = async (tool: ToolKey) => {
    if (!hasContent && tool !== "catalog") {
      setToolError("Add more lyrics first.");
      return;
    }
    setActiveTool(tool);
    setToolError(null);
    setToolData(null);
    setToolLoading(true);

    const currentMxmId = enrichedRef?.track?.id ? Number(enrichedRef.track.id) : (initialMxmId ? Number(initialMxmId) : null);
    const currentCommontrackId = enrichedRef?.track?.commontrackId
      ? Number(enrichedRef.track.commontrackId)
      : undefined;

    try {
      if (tool === "lyrics") {
        const base = { source: "project", full: fullLyrics, sections: lyrics };
        if (currentMxmId) {
          const mxm = await fetchLyrics(currentMxmId).catch(() => null);
          if (mxm) (base as any).mxm = mxm;
        }
        if (enrichedRef?.lyrics) (base as any).mxm = { lyrics: enrichedRef.lyrics };
        setToolData(base);
      } else if (tool === "analysis") {
        let mxmRemote = enrichedRef?.analysis ?? null;
        if (currentMxmId && !mxmRemote) {
          const res = await fetchLyricsAnalysis(currentMxmId, currentCommontrackId).catch(() => null);
          mxmRemote = res?.analysis ?? null;
        }
        const resolved = resolveProjectAnalysis(lyrics, mxmRemote);
        setToolData({
          source: resolved.source,
          project: {
            title: project.title,
            artist: project.artistName,
            genre: project.genre,
            mood: project.mood,
            bpm: project.bpmTarget,
          },
          local: resolved,
          mxm: mxmRemote,
          reference: enrichedRef?.track || null,
          note:
            resolved.source === "local"
              ? "Local lyrics intelligence (original project). Match & Enrich for live MXM catalog analysis."
              : "Merged project + Musixmatch Analysis API",
        });
      } else if (tool === "catalog") {
        const resolved = resolveProjectAnalysis(lyrics, enrichedRef?.analysis ?? null);
        let similar: any[] = [];
        let titleMatches: any[] = [];
        try {
          const q = `${project.title} ${project.artistName}`.trim();
          if (q) titleMatches = await searchTracks(q);
        } catch {}
        try {
          const catalogRes = await fetchCatalogSimilar({
            analysis: resolved.analysis,
            genre: project.genre,
            title: project.title,
          });
          similar = catalogRes?.similar ?? [];
        } catch {}
        setToolData({
          projectMeta: {
            title: project.title,
            artistName: project.artistName,
            genre: project.genre,
            genreTags: project.genreTags,
            moodTags: project.moodTags,
            bpmTarget: project.bpmTarget,
          },
          analysisSource: resolved.source,
          similar,
          titleMatches: titleMatches.slice(0, 5),
          enriched: enrichedRef,
        });
      } else if (tool === "translation") {
        setToolData({
          original: fullLyrics,
          translated: null,
          reference: enrichedRef?.track || null,
        });
      } else if (tool === "video") {
        // Reset preview state every time we open the video tool
        setIsVideoGenerating(false);
        setVideoPreviewReady(false);

        // Try to load richsync + analysis for smarter video (accurate timing + MXM-driven style)
        const mxmIdForVideo = currentMxmId || (preloadedRichsync ? null : null);
        const baseVideoData = {
          ready: !!(audioUrl || mixBlob),
          duration: 130,
          hasRichsync: !!(preloadedRichsync || videoRichsync),
          hasAnalysis: !!(preloadedAnalysis || videoMxmAnalysis || enrichedRef?.analysis),
        };

        if (mxmIdForVideo && !preloadedRichsync && !videoRichsync) {
          // fire and forget fetch for video tool — request richsync length to match our track
          const dur = (project as any).durationSec || 120;
          fetchRichsync(Number(mxmIdForVideo), dur).then((res) => {
            if (res?.richsync) {
              setVideoRichsync(res.richsync);
            }
          }).catch(() => {});
        }
        if (currentMxmId && !preloadedAnalysis && !videoMxmAnalysis && !enrichedRef?.analysis) {
          fetchLyricsAnalysis(Number(currentMxmId)).then((res) => {
            if (res?.analysis) setVideoMxmAnalysis(res.analysis);
          }).catch(() => {});
        }

        setToolData(baseVideoData);
      }
    } catch (e) {
      setToolError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setToolLoading(false);
    }
  };

  const handleTranslate = async () => {
    const data = toolData;
    if (!data?.original) return;

    setToolLoading(true);
    setToolError(null);

    try {
      const refId = enrichedRef?.track?.id ? Number(enrichedRef.track.id) : (initialMxmId ? Number(initialMxmId) : null);
      const commontrackId = enrichedRef?.track?.commontrackId
        ? Number(enrichedRef.track.commontrackId)
        : undefined;

      if (refId && transLang !== "en") {
        const res = await fetchLyricsTranslation(refId, transLang, commontrackId).catch(() => null);
        const translatedBody =
          res?.translatedBody ??
          res?.translation?.lyrics_translated?.lyrics_body;

        if (translatedBody && normalizeForMatch(translatedBody) !== normalizeForMatch(data.original)) {
          setToolData({
            ...data,
            translated: translatedBody,
            translatedLang: transLang,
            source: "musixmatch",
          });
          return;
        }
      }

      // Groq fallback for original projects (or when MXM has no translation)
      const groqRes = await translateProjectLyrics({
        text: data.original,
        targetLang: transLang,
        sourceLang: "en",
      });

      setToolData({
        ...data,
        translated: groqRes.translated,
        translatedLang: transLang,
        source: groqRes.source,
      });
    } catch (e: any) {
      setToolError(e?.message || "Could not fetch translation. Set GROQ_API_KEY for AI translation.");
    } finally {
      setToolLoading(false);
    }
  };

  // === Improved Lyric Video with audio embed attempt + options ===
  const getCanvasSize = () => (videoRes === 1080 ? { w: 1920, h: 1080 } : { w: 1280, h: 720 });

  const getStyleColors = (style: string) => {
    // If we have MXM analysis, bias the palette toward moods/themes
    const moods: string[] = (effectiveAnalysis?.moods?.main_moods || effectiveAnalysis?.main_moods || []).map((m: any) => String(m).toLowerCase());
    const themes: string[] = ((effectiveAnalysis?.themes?.main_themes || effectiveAnalysis?.main_themes || []) as any[]).map((t: any) => String(t?.theme || t).toLowerCase());

    const hasDark = moods.some(m => ['dark','melancholy','sad','moody','intimate','night'].some(k => m.includes(k)));
    const hasEnergetic = moods.some(m => ['energetic','upbeat','happy','dance','party','powerful'].some(k => m.includes(k)));
    const hasCalm = moods.some(m => ['calm','chill','ambient','dreamy','peaceful'].some(k => m.includes(k)));

    if (style === 'minimal') return { accent: '#e4e4e7', grad1: 'rgba(255,255,255,0.06)', grad2: 'rgba(200,200,210,0.04)', text: '#fafafa', sub: '#a1a1aa' };
    if (style === 'dark' || hasDark) return { accent: '#f87171', grad1: 'rgba(120,30,30,0.15)', grad2: 'rgba(40,10,10,0.1)', text: '#fee2e2', sub: '#9f1239' };
    if (hasCalm) return { accent: '#67e8f9', grad1: 'rgba(103,232,249,0.08)', grad2: 'rgba(167,139,250,0.06)', text: '#e0f2fe', sub: '#64748b' };
    if (hasEnergetic) return { accent: '#f472b6', grad1: 'rgba(251,113,133,0.14)', grad2: 'rgba(167,139,250,0.10)', text: '#fdf4ff', sub: '#c084fc' };
    // energetic (default)
    return { accent: '#c4b5fd', grad1: 'rgba(167,139,250,0.12)', grad2: 'rgba(103,232,249,0.08)', text: '#f1f1f5', sub: '#a1a1aa' };
  };

  const generateScenePromptsFromMXM = () => {
    const moods: string[] = (effectiveAnalysis?.moods?.main_moods || effectiveAnalysis?.main_moods || []).slice(0, 4);
    const themesRaw = effectiveAnalysis?.themes?.main_themes || effectiveAnalysis?.main_themes || [];
    const themes: string[] = themesRaw.map((t: any) => (typeof t === 'string' ? t : t?.theme || t)).slice(0, 3);
    const meaning: string = (effectiveAnalysis?.meaning?.explanation || effectiveAnalysis?.explanation || "").slice(0, 180);

    const base = [
      project.title || "Song",
      project.artistName || "",
      moods.length ? moods.join(", ") : "",
      themes.length ? themes.join(" • ") : "",
    ].filter(Boolean).join(" | ");

    const prompts: string[] = [];

    // Full concept prompt (good for Runway / full video)
    const concept = [
      "Cinematic lyric video, high quality generative AI visuals.",
      moods.length ? `Mood: ${moods.join(", ")}.` : "",
      themes.length ? `Themes: ${themes.join(", ")}.` : "",
      meaning ? `Core meaning: ${meaning}.` : "",
      "Dynamic camera, subtle motion matching the energy of the track, synchronized lyrics overlays, professional color grade.",
      "Film grain, tasteful typography animation.",
      (project.bpmTarget ? `Around ${project.bpmTarget} BPM rhythm.` : ""),
    ].filter(Boolean).join(" ");

    prompts.push(concept.trim());

    // Short social clip style
    const short = `Vertical short-form lyric video. ${moods[0] || "energetic"} vibe. ${themes[0] || "emotional"} atmosphere. Fast cuts on hook, smooth slow-mo on verses. Clean modern text animation synced to richsync timing. Trending on TikTok / IG Reels.`;
    prompts.push(short);

    // More artistic / Runway specific
    const artistic = `Abstract generative art video interpreting lyrics. Use ${moods.join(" and ") || "dreamy colors"}. Visual metaphors for: ${themes.join(", ") || "the story"}. ${meaning ? meaning + "." : ""} Smooth transitions, particle effects, high detail, emotional lighting.`;
    prompts.push(artistic);

    setScenePrompts(prompts);
  };

  const getAudioBlobForSync = useCallback(async (): Promise<Blob | null> => {
    if (mixBlob) return mixBlob;
    if (audioUrl) {
      try {
        const res = await fetch(audioUrl);
        return await res.blob();
      } catch {
        return null;
      }
    }
    return null;
  }, [mixBlob, audioUrl]);

  const resolveVideoSyncPipeline = useCallback(
    async (durationSec: number, audioBlob: Blob | null) => {
      const currentMxmId = enrichedRef?.track?.id
        ? Number(enrichedRef.track.id)
        : initialMxmId
          ? Number(initialMxmId)
          : null;
      const currentCommontrackId = enrichedRef?.track?.commontrackId
        ? Number(enrichedRef.track.commontrackId)
        : undefined;

      // 1) MXM Pro — only when catalog lyrics actually match project
      if (currentMxmId || (project.title && project.artistName)) {
        try {
          const mxmSync = await fetchMxmVideoSync({
            durationSec,
            trackId: currentMxmId ?? undefined,
            commontrackId: currentCommontrackId,
            title: project.title,
            artist: project.artistName,
            lyrics,
            maxDeviationSec: 5,
          });
          if (mxmSync?.lines?.length) {
            return {
              lines: mxmSync.lines,
              source: mxmSync.source,
              useStrict: true,
              richsync: mxmSync.richsync,
            };
          }
        } catch {
          /* try next */
        }
      }

      // 2) Groq Whisper forced-align — listens to actual vocals in the mix
      if (audioBlob) {
        try {
          const whisper = await fetchWhisperLyricAlign(audioBlob, lyrics, syncOffsetSec);
          if (whisper?.lines?.length) {
            return {
              lines: whisper.lines,
              source: whisper.source,
              useStrict: true,
            };
          }
        } catch {
          /* try next */
        }
      }

      // 3) Vocal phrase detection from mix waveform (no API)
      try {
        const analysisSource = audioBlob ?? mixBlob ?? audioUrl;
        if (analysisSource) {
          const profile = await analyzeMixVocalActivity(analysisSource);
          vocalActivityRef.current = profile;
          const projectLines = collectProjectLinesWithSections(lyrics);
          const vocalLines = buildTimedLinesFromVocalPhrases(
            projectLines,
            profile,
            durationSec,
            syncOffsetSec
          );
          if (vocalLines.length >= Math.ceil(projectLines.length * 0.45)) {
            return {
              lines: vocalLines,
              source: "audio.vocal-phrases",
              useStrict: true,
            };
          }
        }
      } catch {
        vocalActivityRef.current = null;
      }

      // 4) Section timing (last resort)
      const richsyncForTiming =
        effectiveRichsync && richsyncMatchesProjectLyrics(effectiveRichsync, lyrics)
          ? effectiveRichsync
          : null;
      const fallback = buildLyricVideoTimedLines(lyrics, durationSec, {
        bpm: project.bpmTarget,
        richsync: richsyncForTiming,
        syncOffsetSec: syncOffsetSec + (karaokeMode === "word" ? 0.15 : 0),
      });

      return {
        lines: fallback,
        source: "section.timing",
        useStrict: false,
      };
    },
    [
      enrichedRef,
      initialMxmId,
      project.title,
      project.artistName,
      project.bpmTarget,
      lyrics,
      syncOffsetSec,
      karaokeMode,
      effectiveRichsync,
      mixBlob,
      audioUrl,
    ]
  );

  // Main "Preview" handler
  const handlePreviewClick = async () => {
    if (!audioUrl && !mixBlob) {
      setToolError("Please provide audio (upload mix or generate full song) first.");
      return;
    }

    setIsVideoGenerating(true);
    setVideoPreviewReady(false);
    setToolError(null);
    setMxmSyncSource(null);
    syncCacheRef.current = null;

    try {
      const audioBlob = await getAudioBlobForSync();
      const durHint = await (async () => {
        const src = audioUrl || (audioBlob ? URL.createObjectURL(audioBlob) : null);
        if (!src) return (project as { durationSec?: number }).durationSec || 120;
        const probe = new Audio(src);
        await new Promise<void>((resolve) => {
          if (probe.duration && isFinite(probe.duration) && probe.duration > 5) {
            resolve();
            return;
          }
          probe.addEventListener("loadedmetadata", () => resolve(), { once: true });
          probe.load();
          setTimeout(resolve, 900);
        });
        const d = probe.duration;
        if (audioBlob && !audioUrl) URL.revokeObjectURL(probe.src);
        return isFinite(d) && d > 5 ? d : (project as { durationSec?: number }).durationSec || 120;
      })();

      const sync = await resolveVideoSyncPipeline(durHint, audioBlob);
      syncCacheRef.current = sync;
      setMxmSyncSource(sync.source);
      if (sync.richsync) setVideoRichsync(sync.richsync);

      const currentMxmId = enrichedRef?.track?.id
        ? Number(enrichedRef.track.id)
        : initialMxmId
          ? Number(initialMxmId)
          : null;
      const currentCommontrackId = enrichedRef?.track?.commontrackId
        ? Number(enrichedRef.track.commontrackId)
        : undefined;

      if (currentMxmId && !effectiveAnalysis && !videoMxmAnalysis && !enrichedRef?.analysis) {
        const an = await fetchLyricsAnalysis(currentMxmId, currentCommontrackId).catch(() => null);
        if (an?.analysis && !videoMxmAnalysis) setVideoMxmAnalysis(an.analysis);
      }
    } catch {
      /* preview still runs with fallback */
    }

    stopCurrentPreview();
    await startVideoPreview();

    setIsVideoGenerating(false);
    setVideoPreviewReady(true);
  };



  const startVideoPreview = async (providedAudio?: HTMLAudioElement) => {
    // Always stop previous instance first (prevents double/triple playback)
    stopCurrentPreview();

    setPreviewStarted(true);
    setVideoPreviewReady(true);
    const canvas = canvasRef.current;
    if (!canvas || (!audioUrl && !mixBlob)) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = getCanvasSize();
    canvas.width = w;
    canvas.height = h;

    let audio: HTMLAudioElement;
    if (providedAudio) {
      audio = providedAudio;
    } else {
      audio = new Audio();
      audio.src = audioUrl || "";
      if (mixBlob && !audioUrl) {
        audio.src = URL.createObjectURL(mixBlob);
      }
    }
    audioElRef.current = audio;

    // Load metadata BEFORE play so timing grid matches real duration
    if (!providedAudio) {
      await new Promise<void>((resolve) => {
        if (audio.duration && isFinite(audio.duration) && audio.duration > 10) {
          resolve();
          return;
        }
        const handler = () => {
          audio.removeEventListener("loadedmetadata", handler);
          resolve();
        };
        audio.addEventListener("loadedmetadata", handler, { once: true });
        audio.load();
        setTimeout(resolve, 900);
      });
    }

    let targetTotal = 120;
    if (audio.duration && isFinite(audio.duration) && audio.duration > 10) {
      targetTotal = audio.duration;
    } else {
      targetTotal = Math.max(effectiveRichsync?.durationSec || (project as { durationSec?: number }).durationSec || 120, 120);
    }

    let useMxmStrict = false;
    let timedLines: TimedLyricLine[] = [];
    let activeSyncSource = mxmSyncSource;

    if (syncCacheRef.current?.lines?.length) {
      timedLines = syncCacheRef.current.lines;
      useMxmStrict = syncCacheRef.current.useStrict;
      activeSyncSource = syncCacheRef.current.source;
    } else {
      try {
        const audioBlob = await getAudioBlobForSync();
        const sync = await resolveVideoSyncPipeline(targetTotal, audioBlob);
        syncCacheRef.current = sync;
        timedLines = sync.lines;
        useMxmStrict = sync.useStrict;
        activeSyncSource = sync.source;
        if (sync.source !== mxmSyncSource) setMxmSyncSource(sync.source);
        if (sync.richsync) setVideoRichsync(sync.richsync);
      } catch {
        /* fallback below */
      }
    }

    if (timedLines.length === 0) {
      const richsyncForTiming =
        effectiveRichsync && richsyncMatchesProjectLyrics(effectiveRichsync, lyrics)
          ? effectiveRichsync
          : null;

      timedLines = buildLyricVideoTimedLines(lyrics, targetTotal, {
        bpm: project.bpmTarget,
        richsync: richsyncForTiming,
        syncOffsetSec: syncOffsetSec + (karaokeMode === "word" ? 0.15 : 0),
      });
    }

    if (timedLines.length === 0) {
      const body = composeLyricsBody(lyrics);
      const lines = body
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !/^\[.*\]$/.test(l));
      timedLines = lines.map((text, i) => ({
        text,
        start: 2.5 + syncOffsetSec + i * 3.2,
        end: 2.5 + syncOffsetSec + (i + 1) * 3.2,
      }));
    }

    // Client vocal detection only when MXM sync unavailable
    let vocalProfile: VocalActivityProfile | null = null;
    if (!useMxmStrict) {
      try {
        const analysisSource = mixBlob ?? audioUrl;
        if (analysisSource) {
          vocalProfile = await analyzeMixVocalActivity(analysisSource);
          vocalActivityRef.current = vocalProfile;
          timedLines = alignTimedLinesToVocalOnsets(timedLines, vocalProfile);
        }
      } catch {
        vocalActivityRef.current = null;
      }
    } else {
      vocalActivityRef.current = null;
    }

    // Start audio + canvas on the same beat (avoids lyrics ahead of buffered audio)
    audio.currentTime = 0;
    await new Promise<void>((resolve) => {
      const done = () => resolve();
      audio.addEventListener("playing", done, { once: true });
      void audio.play().catch(done);
      setTimeout(done, 280);
    });

    // Use actual audio duration when available for accurate progress bar
    let total = effectiveRichsync?.durationSec || (project as any).durationSec || 120;
    if (audio && audio.duration && isFinite(audio.duration) && audio.duration > 5) {
      total = audio.duration;
    } else if (timedLines.length) {
      total = Math.max(total, timedLines[timedLines.length - 1].end + 2);
    }
    const colors = getStyleColors(videoStyle);

    const draw = () => {
      if (!ctx) return;
      const t = audio.currentTime;
      const prog = Math.min(t / total, 1);

      ctx.fillStyle = "#050507";
      ctx.fillRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 80, 0, h * 0.85);
      grad.addColorStop(0, colors.grad1);
      grad.addColorStop(1, colors.grad2);
      ctx.fillStyle = grad;
      ctx.fillRect(60, 70, w - 120, h * 0.78);

      // Title + artist (scale with res)
      const titleSize = videoRes === 1080 ? 64 : 46;
      ctx.fillStyle = colors.text;
      ctx.font = `700 ${titleSize}px system-ui, -apple-system, sans-serif`;
      ctx.fillText(project.title || "Midnight Drive", 70, 120);

      ctx.font = `500 ${videoRes === 1080 ? 32 : 26}px system-ui, sans-serif`;
      ctx.fillStyle = colors.sub;
      ctx.fillText(project.artistName || "Nova Ray", 70, 160);

      // Progress
      ctx.fillStyle = "#27272a";
      ctx.fillRect(70, videoRes === 1080 ? 185 : 175, w - 140, 8);
      ctx.fillStyle = colors.accent;
      ctx.fillRect(70, videoRes === 1080 ? 185 : 175, (w - 140) * prog, 8);

      // Timecode (makes it feel more pro)
      ctx.font = "400 14px system-ui, sans-serif";
      ctx.fillStyle = "#52525b";
      const curMin = Math.floor(t / 60);
      const curSec = Math.floor(t % 60);
      const totMin = Math.floor(total / 60);
      const totSec = Math.floor(total % 60);
      ctx.fillText(`${curMin}:${curSec.toString().padStart(2, '0')} / ${totMin}:${totSec.toString().padStart(2, '0')}`, w - 160, videoRes === 1080 ? 178 : 168);

      // Enhanced dynamic background (MXM Pro inspired: mood reactive + beat-ish pulse)
      const isEnergetic = videoStyle === 'energetic' || (effectiveAnalysis && (effectiveAnalysis.moods?.main_moods || []).some((m: string) => /energetic|upbeat|dance|powerful/i.test(m)));
      const isCalm = (effectiveAnalysis && (effectiveAnalysis.moods?.main_moods || []).some((m: string) => /calm|chill|ambient|dreamy/i.test(m)));

      // Background bars / energy waves
      ctx.fillStyle = isEnergetic ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.025)";
      const waveSpeed = isEnergetic ? 22 : 14;
      for (let i = 0; i < (isEnergetic ? 9 : 5); i++) {
        const bx = 80 + ((t * (waveSpeed + i * 1.5) + i * 95) % (w - 160));
        const bh = (isEnergetic ? 4 : 2.5) + Math.sin(t * 2.8 + i) * 1.8;
        ctx.fillRect(bx, 205 + i * (isEnergetic ? 11 : 14), 22 + Math.cos(t * 1.5 + i) * 7, bh);
      }

      // Subtle beat pulse (center glow that reacts to progress / time)
      const pulse = Math.sin(t * (isEnergetic ? 3.2 : 1.8)) * 0.5 + 0.5;
      const pulseSize = (isEnergetic ? 180 : 120) * (0.6 + pulse * 0.4);
      const pulseGrad = ctx.createRadialGradient(w/2, h * 0.55, 30, w/2, h * 0.55, pulseSize);
      pulseGrad.addColorStop(0, isEnergetic ? "rgba(167,139,250,0.12)" : "rgba(103,232,249,0.08)");
      pulseGrad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = pulseGrad;
      ctx.fillRect(0, 0, w, h);

      // === Lyric display (MXM strict segment timing or vocal-aware fallback) ===
      const syncT = t - syncOffsetSec;
      const display = useMxmStrict
        ? resolveMxmStrictDisplay(syncT, timedLines)
        : resolveDisplayLineAt(t, timedLines, vocalProfile);
      const ht = display.highlightTime;
      const activeTimedLine = display.line;
      let activeLineInfo: { text: string; start: number; end: number; progress: number } | null = null;
      const upcomingLines: string[] = [];
      const inInstrumentalGap = useMxmStrict
        ? (display as ReturnType<typeof resolveMxmStrictDisplay>).inGap
        : display.paused && !display.line;

      if (activeTimedLine) {
        const segDur = Math.max(0.8, activeTimedLine.end - activeTimedLine.start);
        const segProg = Math.max(0, Math.min(1, (ht - activeTimedLine.start) / segDur));
        activeLineInfo = {
          text: activeTimedLine.text,
          start: activeTimedLine.start,
          end: activeTimedLine.end,
          progress: segProg,
        };

        const idx = display.lineIndex;
        for (let i = idx + 1; i < timedLines.length && upcomingLines.length < 2; i++) {
          const next = timedLines[i]!;
          if (inInstrumentalGap && syncT < next.start) break;
          if (!inInstrumentalGap && display.paused && t < next.start) break;
          upcomingLines.push(next.text);
        }
      }

      const sectionLabel = activeTimedLine?.section ?? "";

      ctx.font = `600 ${videoRes === 1080 ? 26 : 20}px system-ui, sans-serif`;
      ctx.fillStyle = colors.accent;
      if (sectionLabel) {
        ctx.fillText(sectionLabel.toUpperCase(), 70, videoRes === 1080 ? 255 : 235);
      }

      // Current line with per-word-ish karaoke highlight (split words + distribute time)
      const yCurrent = videoRes === 1080 ? 310 : 275;
      ctx.font = `600 ${videoRes === 1080 ? 42 : 34}px system-ui, sans-serif`;

      // Soft highlight bar behind current lyric (more MXM pro polish)
      if (activeLineInfo) {
        ctx.fillStyle = "rgba(255,255,255,0.06)";
        ctx.fillRect(50, yCurrent - 32, w - 100, 48);
      }

      if (activeLineInfo) {
        const rsSeg = activeTimedLine?.richsyncSegment;
        const hasPreciseChars = rsSeg?.chars && Array.isArray(rsSeg.chars) && rsSeg.chars.length > 0;
        const usePrecise =
          (karaokeMode === "auto" || karaokeMode === "precise") &&
          hasPreciseChars &&
          !inInstrumentalGap &&
          !display.paused;

        if (usePrecise && rsSeg?.chars) {
          const chars = rsSeg.chars;
          const lineStart = rsSeg.startSec;

          let x = 70;
          chars.forEach((ch, ci) => {
            const char = ch.char;
            const relOffset = typeof ch.offset === "number" ? ch.offset : (ci / Math.max(1, chars.length - 1)) * (rsSeg.endSec - rsSeg.startSec);
            const charStart = lineStart + relOffset;
            const nextOffset =
              chars[ci + 1]?.offset ??
              rsSeg.endSec - rsSeg.startSec;
            const charDur = Math.max(0.05, nextOffset - relOffset);
            const charProg = Math.max(0, Math.min(1, (ht - charStart) / charDur));
            const isActive = ht >= charStart - 0.04 && ht <= charStart + charDur + 0.08;

            const w = ctx.measureText(char).width;

            if (isActive) {
              ctx.fillStyle = colors.accent;
              ctx.save();
              ctx.shadowColor = colors.accent;
              ctx.shadowBlur = videoRes === 1080 ? 10 : 6;
              ctx.fillText(char, x, yCurrent);
              ctx.restore();

              // progress underline
              const uy = yCurrent + (videoRes === 1080 ? 10 : 8);
              ctx.fillStyle = "rgba(255,255,255,0.3)";
              ctx.fillRect(x, uy, w, 2);
              ctx.fillStyle = colors.accent;
              ctx.fillRect(x, uy, w * Math.max(0, charProg), 2);
            } else if (ht > charStart + charDur) {
              ctx.fillStyle = "rgba(250,250,250,0.95)";
              ctx.fillText(char, x, yCurrent);
            } else {
              ctx.fillStyle = "rgba(244,244,245,0.65)";
              ctx.fillText(char, x, yCurrent);
            }
            x += w;
          });
        } else {
          // Fallback: per-word approximate (improved)
          const words = activeLineInfo.text.split(/(\s+)/).filter(Boolean);
          let x = 70;
          const wordWidthCache: number[] = [];
          words.forEach((w) => wordWidthCache.push(ctx.measureText(w).width));

          const segDur = Math.max(0.9, activeLineInfo.end - activeLineInfo.start);
          const wordCount = Math.max(1, words.filter(w => w.trim().length > 0).length);
          const wordDur = segDur / wordCount;

          let wordStartT = activeLineInfo.start;

          words.forEach((word, wi) => {
            const isSpace = /^\s+$/.test(word);
            const w = wordWidthCache[wi];
            const trimmed = word.trim();

            if (!isSpace && trimmed) {
              const wordLag = 0.18;
              const thisWordStart = wordStartT + wordLag;
              const thisWordEnd = wordStartT + wordDur + wordLag;
              const wordProg = Math.max(0, Math.min(1, (ht - thisWordStart) / wordDur));
              const isActiveWord = !display.paused && ht >= thisWordStart - 0.04 && ht <= thisWordEnd + 0.08;

              if (isActiveWord) {
                ctx.fillStyle = colors.accent;
                ctx.save();
                ctx.shadowColor = colors.accent;
                ctx.shadowBlur = videoRes === 1080 ? 9 : 5;
                ctx.fillText(word, x, yCurrent);
                ctx.restore();

                const uy = yCurrent + (videoRes === 1080 ? 10 : 8);
                ctx.fillStyle = "rgba(255,255,255,0.35)";
                ctx.fillRect(x, uy, w, 3);
                ctx.fillStyle = colors.accent;
                ctx.fillRect(x, uy, w * Math.max(0.1, wordProg), 3);
              } else if (ht > thisWordEnd) {
                ctx.fillStyle = "rgba(250,250,250,0.95)";
                ctx.fillText(word, x, yCurrent);
              } else {
                ctx.fillStyle = "rgba(244,244,245,0.65)";
                ctx.fillText(word, x, yCurrent);
              }
              wordStartT += wordDur;
            } else {
              x += w;
              return;
            }
            x += w;
          });
        }
      } else if (!inInstrumentalGap) {
        // Fallback when no active line and not in MXM gap
        ctx.fillStyle = colors.text;
        const fallback = timedLines.length > 0 ? timedLines[0].text : "";
        ctx.fillText(fallback, 70, yCurrent);
      }

      // Show 1-2 upcoming lines (dimmed)
      ctx.font = `500 ${videoRes === 1080 ? 30 : 24}px system-ui, sans-serif`;
      upcomingLines.slice(0, 2).forEach((line, i) => {
        const y = yCurrent + (videoRes === 1080 ? 58 : 48) * (i + 1);
        ctx.fillStyle = "rgba(161,161,170,0.55)";
        ctx.fillText(line, 70, y);
      });

      ctx.font = "400 16px system-ui, sans-serif";
      ctx.fillStyle = "#3f3f46";
      const analysisBadge = effectiveAnalysis ? " + analysis" : "";
      const mxmBadge = activeSyncSource
        ? `MXM ${activeSyncSource.replace(/^mxm\./, "").replace(/\+project$/, " + project")}`
        : useMxmStrict
          ? "MXM sync"
          : "Section timing (fallback)";
      const vocalBadge = vocalProfile && !useMxmStrict ? " · vocal-aware pause" : "";
      ctx.fillText(`Musixmatch Pro style • ${videoStyle} • ${mxmBadge}${vocalBadge}${analysisBadge}`, 70, h - 50);

      if (inInstrumentalGap) {
        ctx.font = `500 ${videoRes === 1080 ? 28 : 22}px system-ui, sans-serif`;
        ctx.fillStyle = "rgba(161,161,170,0.55)";
        ctx.fillText("— instrumental —", 70, yCurrent);
      } else if (display.paused && activeLineInfo) {
        ctx.font = "400 12px system-ui, sans-serif";
        ctx.fillStyle = "rgba(161,161,170,0.65)";
        ctx.fillText("— instrumental —", 70, h - 28);
      }

      // Subtle vignette for more cinematic / premium look
      const vig = ctx.createRadialGradient(w/2, h/2, Math.min(w, h) * 0.35, w/2, h/2, Math.max(w, h) * 0.72);
      vig.addColorStop(0, "rgba(0,0,0,0)");
      vig.addColorStop(1, "rgba(0,0,0,0.65)");
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      videoAnimRef.current = requestAnimationFrame(draw);
    };

    audio.onended = () => {
      if (videoAnimRef.current) cancelAnimationFrame(videoAnimRef.current);
    };

    draw();
  };

  const exportVideoWithAudio = async () => {
    const canvas = canvasRef.current;
    if (!canvas || (!audioUrl && !mixBlob)) {
      alert("No audio available for export");
      return;
    }

    setToolLoading(true);

    try {
      // Clean up any current preview audio/animation before recording a clean export
      stopCurrentPreview();

      const { w, h } = getCanvasSize();
      canvas.width = w;
      canvas.height = h;

      // Create ONE audio instance that will drive BOTH the animation and the recorded audio track
      const audio = new Audio();
      const audioSrc = audioUrl || (mixBlob ? URL.createObjectURL(mixBlob) : "");
      audio.src = audioSrc;
      audio.muted = false;
      audio.volume = 1;

      // Wait for metadata FIRST (before playing or capturing) to get accurate duration and ensure audio is ready
      let exportDurationMs = 120000;
      try {
        await new Promise<void>((resolve, reject) => {
          audio.onloadedmetadata = () => {
            if (audio.duration && isFinite(audio.duration)) {
              exportDurationMs = Math.min(Math.max(audio.duration * 1000, 30000), 180000);
            }
            resolve();
          };
          audio.onerror = () => reject(new Error("audio load fail"));
          audio.load();
        });
      } catch (e) {
        console.warn("Could not load audio metadata for export duration", e);
      }

      // Now start the preview (this will play the audio and start RAF drawing)
      startVideoPreview(audio);

      // Give the canvas several frames AFTER stream setup to ensure rendering has begun
      // Critical for MediaRecorder to capture initial data
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      // Capture the stream AFTER drawing has started
      const canvasStream = canvas.captureStream(30);

      // Wait for several frames AFTER captureStream to ensure the canvas has rendered content
      // This is critical — MediaRecorder often gets empty data if no frames were painted after capture
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      await new Promise((r) => requestAnimationFrame(r));

      // Force a tiny draw operation after capture to ensure the stream has content
      try {
        const kickCtx = canvas.getContext('2d', { willReadFrequently: true });
        if (kickCtx) {
          kickCtx.fillStyle = 'rgba(255,255,255,0.01)';
          kickCtx.fillRect(60, 60, 2, 2);
        }
      } catch {}
      await new Promise((r) => requestAnimationFrame(r));

      let combined: MediaStream = canvasStream;

      // Best effort audio capture using the SAME audio that drives the animation
      // (duration already captured above)
      try {
        const audioCapture =
          typeof (audio as any).captureStream === "function"
            ? (audio as any).captureStream()
            : null;

        if (audioCapture && audioCapture.getAudioTracks().length > 0) {
          combined = new MediaStream([
            ...canvasStream.getTracks(),
            ...audioCapture.getAudioTracks(),
          ]);
        } else {
          // Fallback: at least play the audio in sync so user can screen record if needed
          // (already playing from startVideoPreview)
        }
      } catch (e) {
        console.warn("Audio capture limited — falling back to video track + playing audio", e);
      }

      let recorder;
      try {
        recorder = new MediaRecorder(combined, {
          mimeType: "video/webm;codecs=vp9",
        });
      } catch (e) {
        // Fallback for browsers that don't support vp9 codec
        recorder = new MediaRecorder(combined, {
          mimeType: "video/webm",
        });
      }
      mediaRecorderRef.current = recorder;

      const chunks: Blob[] = [];
      // Use timeslice so dataavailable fires regularly (more reliable)
      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      recorder.onstop = () => {
        if (chunks.length === 0) {
          setToolError("Export produced no data. Click Preview again, then Download Video. If it keeps failing, use your browser's screen recorder as fallback.");
          setToolLoading(false);
          // Do not auto-restart preview here to avoid extra audio playback
          return;
        }
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${(project.title || "song").replace(/\s+/g, "-")}-lyric-video.webm`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
        setToolLoading(false);
      };

      // Small delay to let the canvas stream stabilize after capture + draws
      await new Promise(r => setTimeout(r, 120));

      // Start recording (with timeslice for regular chunks)
      recorder.start(1000);

      // Kick data collection immediately + again shortly (helps some browsers produce initial chunks)
      try { if (recorder.state === "recording") recorder.requestData(); } catch {}
      setTimeout(() => {
        try { if (recorder.state === "recording") recorder.requestData(); } catch {}
      }, 250);

      // Audio is already playing from startVideoPreview (using the same instance)
      // No need to restart here to avoid desync

      // Auto stop using actual (or estimated) duration from the unified audio
      setTimeout(() => {
        try {
          if (recorder.state === "recording") {
            recorder.requestData(); // flush last data
            recorder.stop();
          }
        } catch {}
        if (audioElRef.current) {
          try { audioElRef.current.pause(); } catch {}
        }
        if (videoAnimRef.current) cancelAnimationFrame(videoAnimRef.current);
      }, exportDurationMs + 600); // extra buffer for final frames to be captured by recorder
    } catch (e) {
      setToolError("Export failed. Try the simple webm (visual) or download original MP3 + video separately.");
      setToolLoading(false);
    }
  };

  // Simple additional download: current frame as PNG (useful for thumbnails / social)
  const downloadCurrentFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      alert("No preview available yet. Click Preview first.");
      return;
    }
    try {
      const link = document.createElement("a");
      link.download = `${(project.title || "song").replace(/\s+/g, "-")}-lyric-video-frame.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert("Could not download frame.");
    }
  };

  // Auto-restart / refresh the lyric video preview when richer MXM data or the project lyrics change
  // while the video panel is open. Ensures video always reflects the *current* project lyrics.
  useEffect(() => {
    if (activeTool !== "video") return;
    syncCacheRef.current = null;
    const hasBetterData = !!(effectiveRichsync || effectiveAnalysis || enrichedRef);
    // Only auto-restart when preview is already running AND better data arrives (avoids double start on initial Preview click)
    const shouldRefresh = previewStarted && (audioUrl || mixBlob) && hasBetterData;
    if (shouldRefresh) {
      const timer = setTimeout(() => {
        try {
          stopCurrentPreview();
          startVideoPreview();
        } catch (e) { /* ignore */ }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [activeTool, effectiveRichsync, effectiveAnalysis, enrichedRef, audioUrl, mixBlob, previewStarted, startVideoPreview, lyrics, karaokeMode, syncOffsetSec, stopCurrentPreview]);

  // Render
  if (!hasContent) {
    return null;
  }

  return (
    <div className="mt-4 rounded-2xl border border-border/70 bg-surface-elevated p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <div>
          <div className="text-xs uppercase tracking-[1px] text-muted">Musixmatch Pro</div>
          <div className="font-semibold text-sm">Lyrics • Analysis • Catalog • Translation • Video</div>
          {!enrichedRef && <div className="text-[10px] text-accent-light mt-0.5">Match &amp; Enrich for live MXM data (richsync + analysis for accurate lyric video timing)</div>}
        </div>

        <button
          onClick={() => void runMatchEnrich()}
          disabled={toolLoading}
          className="inline-flex items-center gap-2 rounded-xl border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent-light hover:bg-accent/20 disabled:opacity-50"
          title="Auto search MXM using this project's title + artist"
        >
          <Search className="h-3.5 w-3.5" />
          Match &amp; Enrich from MXM
          {toolLoading && <Loader2 className="h-3 w-3 animate-spin" />}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { key: "lyrics" as const, label: "Lyrics", icon: BookOpen },
            { key: "analysis" as const, label: "Analysis", icon: BarChart3 },
            { key: "catalog" as const, label: "Catalog", icon: Database },
            { key: "translation" as const, label: "Translation", icon: Languages },
            { key: "video" as const, label: "Create Lyric Video", icon: Video, highlight: true },
          ] as const
        ).map((item: any) => {
          const { key, label, icon: Icon, highlight } = item;
          return (
            <button
              key={key}
              onClick={() => void openTool(key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium border transition",
                highlight
                  ? "border-accent/50 bg-accent/10 text-accent-light hover:bg-accent/20"
                  : "border-border bg-surface hover:border-accent/40"
              )}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          );
        })}
      </div>

      {enrichedRef && (
        <div className="mt-2 text-[10px] text-success">
          Enriched with: {enrichedRef.track.title} — {enrichedRef.track.artist}
        </div>
      )}

      {/* Tool Panel */}
      {activeTool && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-4 text-sm">
          <div className="flex justify-between items-start mb-3">
            <div className="font-semibold flex items-center gap-2 text-base">
              {activeTool === "lyrics" && <><BookOpen className="h-4 w-4" /> Lyrics</>}
              {activeTool === "analysis" && <><BarChart3 className="h-4 w-4" /> Analysis</>}
              {activeTool === "catalog" && <><Database className="h-4 w-4" /> Catalog</>}
              {activeTool === "translation" && <><Languages className="h-4 w-4" /> Translation</>}
              {activeTool === "video" && <><Video className="h-4 w-4" /> Lyric Video Generator</>}
            </div>
            <button onClick={closeTool}><X className="h-4 w-4" /></button>
          </div>

          {toolLoading && activeTool !== "video" && <div className="flex items-center gap-2 text-xs"><Loader2 className="animate-spin h-3.5 w-3.5" /> Talking to Musixmatch…</div>}
          {toolError && <div className="text-xs text-warning mb-2">{toolError}</div>}

          {/* Content for each tool (same structure as before, now reusable) */}
          {activeTool === "lyrics" && toolData && (
            <div>
              <pre className="whitespace-pre-wrap bg-black/40 p-3 rounded max-h-80 overflow-auto text-xs">{toolData.full}</pre>
              {toolData.mxm && <div className="mt-2 text-[10px] text-muted">+ MXM lyrics loaded</div>}
            </div>
          )}

          {activeTool === "analysis" && toolData && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="bg-black/30 p-3 rounded space-y-2">
                <div className="uppercase text-[10px] text-muted">Project</div>
                <div className="font-medium">{toolData.project?.title} — {toolData.project?.artist}</div>
                <div className="text-xs opacity-75">{toolData.project?.genre} / {toolData.project?.mood} · {toolData.project?.bpm ?? "—"} BPM</div>
                {toolData.local?.structure && (
                  <div className="text-xs space-y-1 pt-1 border-t border-border/40">
                    <div>Hook strength: <strong>{toolData.local.structure.hookStrength}</strong></div>
                    <div>Sentiment: {toolData.local.structure.sentiment}</div>
                    <div>Hook: “{toolData.local.structure.hookLine}”</div>
                    <div>Themes: {toolData.local.structure.themes?.join(", ") || "—"}</div>
                  </div>
                )}
              </div>
              <div className="bg-black/30 p-3 rounded space-y-2">
                <div className="uppercase text-[10px] text-muted mb-1">
                  Analysis ({toolData.source === "local" ? "local" : toolData.source === "merged" ? "project + MXM" : "MXM"})
                </div>
                {toolData.local?.analysis ? (
                  <div className="text-xs space-y-1">
                    {toolData.local.analysis.moods?.main_moods?.length ? (
                      <div><span className="text-muted">Moods:</span> {toolData.local.analysis.moods.main_moods.join(", ")}</div>
                    ) : null}
                    {toolData.local.analysis.themes?.main_themes?.length ? (
                      <div><span className="text-muted">Themes:</span> {toolData.local.analysis.themes.main_themes.map((t: any) => t.theme || t).join(" • ")}</div>
                    ) : null}
                    {toolData.local.analysis.meaning?.explanation && (
                      <div className="italic opacity-90">“{toolData.local.analysis.meaning.explanation.slice(0, 220)}{toolData.local.analysis.meaning.explanation.length > 220 ? "…" : ""}”</div>
                    )}
                    {toolData.local.sectionInsights?.length ? (
                      <div className="pt-1 border-t border-border/40">
                        <div className="text-[10px] uppercase text-muted mb-1">Per section</div>
                        {toolData.local.sectionInsights.map((s: any) => (
                          <div key={s.section} className="text-[11px]">{s.label}: {s.sentiment} · {s.wordCount} words</div>
                        ))}
                      </div>
                    ) : null}
                    <button
                      onClick={applyMxmToBrief}
                      className="mt-2 text-[10px] underline hover:no-underline text-accent-light"
                    >
                      Copy analysis to creative brief
                    </button>
                    {toolData.applied && <span className="ml-2 text-[10px] text-success">✓ Copied</span>}
                  </div>
                ) : (
                  <div className="text-xs opacity-70">{toolData.note}</div>
                )}
                {toolData.reference && (
                  <div className="text-[10px] text-muted pt-1">MXM ref: {toolData.reference.title} — {toolData.reference.artist}</div>
                )}
              </div>
            </div>
          )}

          {activeTool === "catalog" && toolData && (
            <div className="space-y-3">
              <div className="text-xs bg-black/30 p-3 rounded">
                <div className="font-medium">{toolData.projectMeta?.title} · {toolData.projectMeta?.artistName}</div>
                <div className="text-muted mt-1">{toolData.projectMeta?.genre} · {toolData.projectMeta?.bpmTarget ?? "—"} BPM · analysis: {toolData.analysisSource}</div>
              </div>
              {toolData.similar?.length > 0 ? (
                <div>
                  <div className="text-[10px] uppercase text-muted mb-2">Similar catalog tracks (MXM analysis.search)</div>
                  <div className="grid gap-2">
                    {toolData.similar.map((hit: any) => (
                      <div key={hit.track.id} className="text-xs rounded border border-border/60 bg-black/20 px-3 py-2">
                        <div className="font-medium">{hit.track.title} — {hit.track.artist}</div>
                        <div className="text-muted mt-0.5">
                          {hit.track.genre || "—"} · rating {hit.track.rating ?? "—"}
                          {hit.ref?.moods?.length ? ` · ${hit.ref.moods.join(", ")}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted">No similar tracks yet — add moods/themes via Analysis or Match &amp; Enrich.</div>
              )}
              {toolData.titleMatches?.length > 0 && (
                <div>
                  <div className="text-[10px] uppercase text-muted mb-2">Title search matches</div>
                  <div className="text-xs">{toolData.titleMatches.map((t: any) => `${t.title} — ${t.artist}`).join(" • ")}</div>
                </div>
              )}
            </div>
          )}

          {activeTool === "translation" && toolData && (
            <div className="space-y-3">
              <div className="flex gap-2 items-center flex-wrap">
                <select value={transLang} onChange={(e) => setTransLang(e.target.value)} className="bg-surface border rounded px-2 py-1 text-xs">
                  <option value="id">Indonesian (id)</option>
                  <option value="es">Spanish (es)</option>
                  <option value="fr">French (fr)</option>
                  <option value="it">Italian (it)</option>
                  <option value="de">German (de)</option>
                  <option value="pt">Portuguese (pt)</option>
                  <option value="ja">Japanese (ja)</option>
                  <option value="en">English (en)</option>
                </select>
                <button onClick={() => void handleTranslate()} className="btn-secondary text-xs px-3" disabled={toolLoading}>
                  Translate to {translationLanguageLabel(transLang)}
                </button>
                {toolData.source && toolData.translated && (
                  <span className="text-[10px] text-muted">via {toolData.source}</span>
                )}
              </div>
              <div>
                <div className="text-[10px] uppercase text-muted mb-1">Original</div>
                <pre className="text-xs bg-black/30 p-3 rounded max-h-40 overflow-auto">{toolData.original}</pre>
              </div>
              {toolData.translated && (
                <div>
                  <div className="text-[10px] uppercase text-muted mb-1">{translationLanguageLabel(toolData.translatedLang || transLang)}</div>
                  <pre className="text-xs bg-black/30 p-3 rounded max-h-40 overflow-auto">{toolData.translated}</pre>
                </div>
              )}
            </div>
          )}

          {activeTool === "video" && (
            <div>
              {/* Video options */}
              <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
                <div className="flex items-center gap-1">
                  <span className="text-muted">Style:</span>
                  {(['energetic', 'minimal', 'dark'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => setVideoStyle(s)}
                      className={cn("px-2 py-0.5 rounded border text-[10px]", videoStyle === s ? "bg-accent text-black border-accent" : "border-border hover:border-accent/60")}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted">Res:</span>
                  {[720, 1080].map(r => (
                    <button
                      key={r}
                      onClick={() => setVideoRes(r as 720 | 1080)}
                      className={cn("px-2 py-0.5 rounded border text-[10px]", videoRes === r ? "bg-accent text-black border-accent" : "border-border hover:border-accent/60")}
                    >
                      {r}p
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted">Karaoke:</span>
                  {(['auto', 'precise', 'word'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setKaraokeMode(m)}
                      className={cn("px-2 py-0.5 rounded border text-[10px]", karaokeMode === m ? "bg-accent text-black border-accent" : "border-border hover:border-accent/60")}
                      title={m === 'auto' ? 'Auto: use MXM richsync char timing when available (recommended)' : m === 'precise' ? 'Force per-character (MXM style)' : 'Force per-word'}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 min-w-[200px]">
                  <span className="text-muted shrink-0">Sync:</span>
                  <input
                    type="range"
                    min={-0.3}
                    max={1.5}
                    step={0.05}
                    value={syncOffsetSec}
                    onChange={(e) => setSyncOffsetSec(parseFloat(e.target.value))}
                    className="flex-1 accent-accent h-1"
                    title="Delay lyrics vs audio. Increase if highlight is ahead of vocals."
                  />
                  <span className="text-[10px] tabular-nums text-muted w-10">{syncOffsetSec.toFixed(2)}s</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <button 
                  onClick={() => void handlePreviewClick()} 
                  disabled={isVideoGenerating || (!audioUrl && !mixBlob)} 
                  className="btn-primary flex items-center gap-2 text-sm disabled:opacity-60"
                >
                  {isVideoGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> 
                      Talking to Musixmatch Pro…
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" /> Preview (MXM Pro)
                    </>
                  )}
                </button>
                {/* Keep a quick download in top only before the main preview is generated; main download shows below canvas */}
                {!videoPreviewReady && (
                  <button onClick={() => void exportVideoWithAudio()} disabled={toolLoading || isVideoGenerating} className="btn-secondary flex items-center gap-2 text-sm">
                    <Download className="h-4 w-4" /> Download Video
                  </button>
                )}

                {/* MXM Auto Style from analysis */}
                {effectiveAnalysis && (
                  <button
                    onClick={() => {
                      const moods = (effectiveAnalysis.moods?.main_moods || effectiveAnalysis.main_moods || []).join(" ").toLowerCase();
                      if (moods.includes("dark") || moods.includes("melanchol")) setVideoStyle("dark");
                      else if (moods.includes("calm") || moods.includes("chill")) setVideoStyle("minimal");
                      else setVideoStyle("energetic");
                    }}
                    className="text-xs px-2.5 py-1 rounded border border-border hover:border-accent/60"
                    title="Pick style automatically from MXM moods"
                  >
                    MXM Auto Style
                  </button>
                )}

                {/* Generate scene prompts */}
                <button
                  onClick={generateScenePromptsFromMXM}
                  disabled={!effectiveAnalysis && !enrichedRef}
                  className="text-xs px-2.5 py-1 rounded border border-accent/40 bg-accent/5 hover:bg-accent/10 disabled:opacity-50"
                  title="Create copy-paste prompts for Runway, Luma, Kling, etc using MXM analysis"
                >
                  Generate Scene Prompts (MXM)
                </button>
              </div>

              {(mxmSyncSource || effectiveRichsync || effectiveAnalysis) && (
                <div className="text-[10px] text-success mb-1.5">
                  ✓ Sync: {mxmSyncSource === "whisper.forced-align"
                    ? "Groq Whisper (listens to your mix)"
                    : mxmSyncSource === "audio.vocal-phrases"
                      ? "Audio vocal detection (from mix waveform)"
                      : mxmSyncSource
                        ? `MXM ${mxmSyncSource.replace(/^mxm\./, "")} — gaps = instrumental`
                        : effectiveRichsync
                          ? "MXM richsync"
                          : "section timing"}
                </div>
              )}

              {/* Scene prompts output */}
              {scenePrompts && scenePrompts.length > 0 && (
                <div className="mt-2 mb-3 p-3 rounded bg-black/40 text-xs space-y-2 border border-border/60">
                  <div className="font-medium text-muted">MXM Scene Prompts (copy for Runway / AI video tools)</div>
                  {scenePrompts.map((p, i) => (
                    <div key={i} className="group">
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-[10px] text-muted">Variant {i + 1}</span>
                        <button
                          onClick={() => { navigator.clipboard?.writeText(p).catch(()=>{}); }}
                          className="text-[10px] opacity-60 group-hover:opacity-100 underline"
                        >
                          Copy
                        </button>
                      </div>
                      <div className="text-[11px] leading-snug bg-black/30 p-2 rounded whitespace-pre-wrap">{p}</div>
                    </div>
                  ))}
                  <div className="text-[10px] text-muted">These are derived directly from MXM moods, themes &amp; meaning. Great starting point for external generative tools.</div>
                </div>
              )}

              {/* Loading state (feels like MXM Pro API processing) or the actual video.
                 Canvas is always mounted for the ref to be ready when we start drawing after the "API" step. */}
              <div className="relative">
                <canvas 
                  ref={canvasRef} 
                  className="w-full rounded border border-border bg-black" 
                  style={{ 
                    maxHeight: 380, 
                    display: videoPreviewReady && !isVideoGenerating ? 'block' : 'none' 
                  }} 
                />

                {isVideoGenerating && (
                  <div className="absolute inset-0 rounded border border-border bg-black/85 flex items-center justify-center" style={{ minHeight: 220 }}>
                    <div className="flex flex-col items-center gap-3 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-accent" />
                      <div className="font-medium">Talking to Musixmatch Pro…</div>
                      <div className="text-xs text-muted max-w-xs">
                        Fetching richsync timing + lyrics analysis from MXM Pro API.<br />
                        Preparing lyric video visuals based on moods &amp; meaning.
                      </div>
                    </div>
                  </div>
                )}

                {!isVideoGenerating && !videoPreviewReady && (
                  <div 
                    onClick={() => void handlePreviewClick()} 
                    className="cursor-pointer rounded border border-dashed border-border/70 bg-black/60 hover:bg-black/40 flex flex-col items-center justify-center text-center p-10"
                    style={{ minHeight: 220 }}
                  >
                    <Video className="h-8 w-8 mb-2 text-muted" />
                    <div className="font-medium">Click Preview (MXM Pro) to generate</div>
                    <div className="text-xs text-muted mt-1">Fetches real MXM data then renders the synced lyric video</div>
                  </div>
                )}
              </div>

              {/* Prominent download options - only show after successful MXM preview generation */}
              {videoPreviewReady && !isVideoGenerating && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button 
                    onClick={() => void exportVideoWithAudio()} 
                    disabled={toolLoading}
                    className="btn-primary flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-70"
                  >
                    {toolLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Rendering &amp; exporting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" /> Download Video (WebM + audio)
                      </>
                    )}
                  </button>
                  <button 
                    onClick={downloadCurrentFrame} 
                    disabled={toolLoading}
                    className="btn-secondary flex items-center gap-2 text-sm px-3 py-2"
                  >
                    <Download className="h-4 w-4" /> Download Frame (PNG)
                  </button>
                  <button 
                    onClick={() => { 
                      if (videoAnimRef.current) cancelAnimationFrame(videoAnimRef.current);
                      startVideoPreview(); 
                    }} 
                    disabled={toolLoading}
                    className="btn-secondary flex items-center gap-2 text-sm px-3 py-2"
                  >
                    <Play className="h-4 w-4" /> Replay Preview
                  </button>
                  <span className="text-[10px] text-muted ml-1">Full length recording of the current preview</span>
                </div>
              )}

              <p className="text-[10px] mt-2 text-muted">
                Sync pipeline: MXM catalog (if match) → Groq Whisper (original songs) → vocal waveform → section timing.
                For AI-generated originals, Whisper alignment is usually best — requires GROQ_API_KEY on backend.
                Karaoke mode above controls word/char highlight. Canvas recording for export.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
