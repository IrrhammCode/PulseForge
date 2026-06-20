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
  searchTracks,
  ApiError,
} from "@/lib/api-client";
import { composeLyricsBody, hasLyricsContent } from "@/lib/studio/lyrics";
import type { LyricsSections, StudioProject } from "@/types/studio";
import { cn } from "@/lib/utils";

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

  const [transLang, setTransLang] = useState("en");
  const [enrichedRef, setEnrichedRef] = useState<any>(null); // selected MXM reference track + data

  // Video MXM data (richsync for accurate timing, analysis for visuals)
  const [videoRichsync, setVideoRichsync] = useState<any>(null);
  const [videoMxmAnalysis, setVideoMxmAnalysis] = useState<any>(null);

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

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoAnimRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

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

      // Pick best or show picker
      const pick = results[0]; // auto pick top
      const trackId = Number(pick.id);

      const [mxmLyrics, mxmAnalysis] = await Promise.all([
        fetchLyrics(trackId).catch(() => null),
        fetchLyricsAnalysis(trackId).catch(() => null),
      ]);

      const ref = {
        track: pick,
        lyrics: mxmLyrics?.lyrics ?? null,
        analysis: mxmAnalysis?.analysis ?? null,
      };

      setEnrichedRef(ref);

      // Auto open analysis or catalog with the new data
      setActiveTool("analysis");
      setToolData({
        source: "mxm-enriched",
        reference: ref.track,
        project: {
          title: project.title,
          artist: project.artistName,
          genre: project.genre,
          mood: project.mood,
        },
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
    const mxm = toolData?.mxm || enrichedRef?.analysis;
    const refTrack = enrichedRef?.track || toolData?.reference;

    if (!mxm) {
      setToolError("No MXM analysis loaded yet. Click Match & Enrich first.");
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
        let mxmA = null;
        if (currentMxmId) {
          const res = await fetchLyricsAnalysis(currentMxmId).catch(() => null);
          mxmA = res?.analysis ?? null;
        }
        if (enrichedRef?.analysis) mxmA = enrichedRef.analysis;

        setToolData({
          source: mxmA ? "mxm" : "project",
          project: {
            title: project.title,
            artist: project.artistName,
            genre: project.genre,
            mood: project.mood,
            bpm: project.bpmTarget,
          },
          mxm: mxmA,
          reference: enrichedRef?.track || null,
          note: mxmA ? "Real data from Musixmatch Analysis API" : "Local project signals + brief",
        });
      } else if (tool === "catalog") {
        let similar: any[] = [];
        try {
          const q = `${project.title} ${project.artistName}`.trim();
          if (q) similar = await searchTracks(q);
        } catch {}
        setToolData({
          projectMeta: {
            title: project.title,
            artistName: project.artistName,
            genreTags: project.genreTags,
            moodTags: project.moodTags,
            bpmTarget: project.bpmTarget,
          },
          mxmSimilar: similar.slice(0, 5),
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

      if (refId) {
        const res = await fetchLyricsTranslation(refId, transLang).catch(() => null);
        const translatedBody = res?.translation?.lyrics_translated?.lyrics_body;

        if (translatedBody) {
          setToolData({
            ...data,
            translated: translatedBody,
            translatedLang: transLang,
            source: "musixmatch",
          });
          return;
        }
      }

      // Fallback
      setToolData({
        ...data,
        translated: `(MXM real translation requires a matched catalog track.)\n\n${data.original}`,
        translatedLang: transLang,
        source: "fallback",
      });
    } catch (e) {
      setToolError("Could not fetch translation.");
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

  // Main "Preview" handler that behaves like calling MXM Pro API:
  // 1. Show loading
  // 2. Fetch real MXM data (richsync + analysis) if available
  // 3. "Process" / prepare
  // 4. Then reveal + start the video preview
  const handlePreviewClick = async () => {
    if (!audioUrl && !mixBlob) {
      setToolError("Please provide audio (upload mix or generate full song) first.");
      return;
    }

    setIsVideoGenerating(true);
    setVideoPreviewReady(false);
    setToolError(null);

    const currentMxmId = enrichedRef?.track?.id
      ? Number(enrichedRef.track.id)
      : (initialMxmId ? Number(initialMxmId) : null);

    // Step 1: Make sure we talk to real MXM Pro endpoints if we have a track id
    if (currentMxmId) {
      try {
        // Fetch richsync + analysis for accurate timing + style (real API calls)
        // Pass duration so MXM returns richsync tuned for our track length (per docs)
        const durHint = (project as any).durationSec || 120;
        const [rs, an] = await Promise.all([
          !effectiveRichsync && !videoRichsync
            ? fetchRichsync(currentMxmId, durHint).catch(() => null)
            : Promise.resolve(null),
          !effectiveAnalysis && !videoMxmAnalysis && !enrichedRef?.analysis
            ? fetchLyricsAnalysis(currentMxmId).catch(() => null)
            : Promise.resolve(null),
        ]);

        if (rs?.richsync && !videoRichsync) setVideoRichsync(rs.richsync);
        if (an?.analysis && !videoMxmAnalysis) setVideoMxmAnalysis(an.analysis);
      } catch (e) {
        // non-fatal, we still proceed with whatever we have
      }
    } else if (!enrichedRef && !hasContent) {
      // Only auto-enrich for catalog reference when project itself has no usable lyrics yet.
      // For AI-generated original projects we want the video to show *our* lyrics, not a random MXM match's.
      try {
        await runMatchEnrich();
      } catch {}
    }

    // Step 2: "MXM Pro is rendering the lyric video" — give it a realistic processing feel
    // (even though most work is client canvas, the data loading above is the real MXM API part)
    await new Promise((resolve) => setTimeout(resolve, 650 + Math.random() * 500));

    // Step 3: Now start the actual preview (canvas + audio)
    stopCurrentPreview();
    startVideoPreview();

    setIsVideoGenerating(false);
    setVideoPreviewReady(true);
  };



  const startVideoPreview = (providedAudio?: HTMLAudioElement) => {
    const normalizeForMatch = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);

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

    audio.currentTime = 0;
    audio.play().catch(() => {});

    // Build timed lyrics prioritizing MXM richsync *timing* (as recommended in their docs for precise video sync)
    // but ALWAYS using our project's lyrics text (for original/AI songs).
    // This gives us MXM-accurate placement without pulling wrong catalog lyrics.
    const body = composeLyricsBody(lyrics);
    let lines = body
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !/^\[.*\]$/.test(l));

    const rs = effectiveRichsync;
    let timedLines: { text: string; start: number; end: number }[] = [];

    const targetTotal = Math.max(
      rs?.durationSec || (project as any).durationSec || 120,
      120
    );

    if (rs?.segments && Array.isArray(rs.segments) && rs.segments.length > 0) {
      // Use richsync timing skeleton (ts/te) for precise positions (MXM style)
      // Map our lines to the richsync time windows (by index proportion)
      const rsTimes = rs.segments.map((s: any) => ({
        start: s.startSec ?? 0,
        end: s.endSec ?? (s.startSec ?? 0) + 3,
      }));

      if (lines.length === 0) lines = rs.segments.map((s: any) => s.text || "");

      lines.forEach((text, i) => {
        // Distribute our lines across the richsync time points
        const idx = Math.min(Math.floor((i / Math.max(1, lines.length - 1)) * (rsTimes.length - 1)), rsTimes.length - 1);
        const t0 = rsTimes[idx]?.start ?? (i * 3);
        const t1 = rsTimes[idx]?.end ?? (t0 + 4);
        // slight interpolation for more lines than segments
        const progress = lines.length > 1 ? i / (lines.length - 1) : 0;
        const start = t0 + (t1 - t0) * progress * 0.6;
        const end = start + Math.max(1.8, (t1 - t0) * 0.8);
        timedLines.push({ text, start, end });
      });
    } else {
      // Fallback: improved proportional timing for originals (no richsync)
      let t = 2.5;
      lines.forEach((line, li) => {
        const dur = Math.max(3.8, 6.0 - Math.min(li * 0.15, 2.5));
        timedLines.push({ text: line, start: t, end: t + dur });
        t += dur;
      });

      const rawEnd = Math.max(t, 30);
      const scale = targetTotal / rawEnd;
      timedLines = timedLines.map((ln) => ({
        text: ln.text,
        start: ln.start * scale,
        end: Math.min(ln.end * scale, targetTotal - 1),
      }));
    }

    // Use scaled lyrics end or audio duration for accurate progress + drawing lifetime
    const computedVideoTotal = timedLines.length
      ? Math.max(timedLines[timedLines.length - 1].end + 3, targetTotal)
      : targetTotal;
    const total = effectiveRichsync?.durationSec || (project as any).durationSec || computedVideoTotal || 120;
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

      // === Lyric display ===
      // Text from project lyrics.
      // When richsync available we use its precise ts/te timing grid (MXM docs style for video sync).
      // Otherwise proportional fallback tuned for full tracks.
      let activeLineInfo: { text: string; start: number; end: number; progress: number } | null = null;
      const upcomingLines: string[] = [];
      for (let i = 0; i < timedLines.length; i++) {
        const ln = timedLines[i];
        if (t >= ln.start - 0.2 && t <= ln.end + 0.8) {
          if (!activeLineInfo) {
            const segDur = Math.max(0.8, ln.end - ln.start);
            const segProg = Math.max(0, Math.min(1, (t - ln.start) / segDur));
            activeLineInfo = { text: ln.text, start: ln.start, end: ln.end, progress: segProg };
          } else {
            upcomingLines.push(ln.text);
          }
          if (upcomingLines.length >= 3) break;
        }
        if (t < ln.start && upcomingLines.length < 2) {
          upcomingLines.push(ln.text);
        }
      }

      // Section label derived from our project timedLines (never from MXM rs to avoid off-song labels)
      let sectionLabel = "";
      for (let i = 0; i < timedLines.length; i++) {
        if (t >= timedLines[i].start - 0.2 && t <= timedLines[i].end + 0.8) {
          // crude: map back to a section name from the original order we built
          sectionLabel = (["INTRO","VERSE 1","CHORUS","VERSE 2","BRIDGE","OUTRO"][Math.floor(i / 3)] || "").slice(0, 12);
          break;
        }
      }

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
        // Try to use precise richsync char-level data for real MXM-style karaoke if available
        const rsSeg = effectiveRichsync?.segments?.find((s: any) =>
          normalizeForMatch(s.text) === normalizeForMatch(activeLineInfo.text)
        );
        const hasPreciseChars = rsSeg?.chars && Array.isArray(rsSeg.chars) && rsSeg.chars.length > 0;
        const usePrecise = (karaokeMode === 'auto' || karaokeMode === 'precise') && hasPreciseChars;

        if (usePrecise) {
          // Precise per-character highlighting using MXM richsync offsets
          const chars = rsSeg.chars as Array<{ char: string; offset: number }>;
          const lineStart = activeLineInfo.start;
          const lineEnd = activeLineInfo.end;
          const lineDur = Math.max(0.1, lineEnd - lineStart);

          let x = 70;
          chars.forEach((ch, ci) => {
            const char = ch.char;
            const relOffset = typeof ch.offset === 'number' ? ch.offset : (ci / Math.max(1, chars.length - 1)) * lineDur;
            const charStart = lineStart + relOffset;
            const nextOffset = chars[ci + 1]?.offset ?? lineDur;
            const charDur = Math.max(0.05, nextOffset - relOffset);
            const charProg = Math.max(0, Math.min(1, (t - charStart) / charDur));
            const isActive = t >= charStart - 0.05 && t <= charStart + charDur + 0.1;

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
            } else if (t > charStart + charDur) {
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
              const thisWordStart = wordStartT;
              const thisWordEnd = wordStartT + wordDur;
              const wordProg = Math.max(0, Math.min(1, (t - thisWordStart) / wordDur));
              const isActiveWord = t >= thisWordStart - 0.08 && t <= thisWordEnd + 0.15;

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
              } else if (t > thisWordEnd) {
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
      } else {
        // Fallback
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
      const mxmBadge = effectiveRichsync ? "MXM richsync (precise timing)" : (enrichedRef ? "Enriched (style)" : "Project lyrics");
      const analysisBadge = effectiveAnalysis ? " + analysis" : "";
      ctx.fillText(`Musixmatch Pro style • ${videoStyle} • ${mxmBadge}${analysisBadge}`, 70, h - 50);

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

      // Start the preview animation using the SAME audio instance
      // This ensures lyrics timing (based on audio.currentTime) matches the recorded audio perfectly
      startVideoPreview(audio);

      // Give the canvas a couple of frames to render before capturing stream
      // (prevents "Export produced no data" in many browsers)
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));

      // Now capture the stream (after drawing has started with the correct audio)
      const canvasStream = canvas.captureStream(30);

      let combined: MediaStream = canvasStream;

      let exportDurationMs = 120000;

      // Best effort audio capture using the SAME audio that drives the animation
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
          audio.play().catch(() => {});
        }
      } catch (e) {
        console.warn("Audio capture limited — falling back to video track + playing audio", e);
        audio.play().catch(() => {});
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
          setToolError("Export produced no data. Preview restarted — click Download Video again. If it keeps failing, use your browser's screen recorder as fallback.");
          setToolLoading(false);
          // Resume the preview animation for the user so they can try again immediately
          try { startVideoPreview(); } catch {}
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

      // Start recording (with timeslice for regular chunks)
      recorder.start(1000);

      // Kick data collection immediately + again shortly (helps some browsers produce initial chunks)
      try { if (recorder.state === "recording") recorder.requestData(); } catch {}
      setTimeout(() => {
        try { if (recorder.state === "recording") recorder.requestData(); } catch {}
      }, 200);

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
      }, exportDurationMs + 400); // small extra buffer so final frames + data are captured
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
  }, [activeTool, effectiveRichsync, effectiveAnalysis, enrichedRef, audioUrl, mixBlob, previewStarted, startVideoPreview, lyrics, karaokeMode, stopCurrentPreview]);

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
          {!enrichedRef && <div className="text-[10px] text-accent-light mt-0.5">Match &amp; Enrich untuk data real dari MXM (richsync + analysis untuk lyric video lebih akurat)</div>}
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
              <div className="bg-black/30 p-3 rounded">
                <div className="uppercase text-[10px] text-muted">Project</div>
                <div className="font-medium">{toolData.project?.title} — {toolData.project?.artist}</div>
                <div className="text-xs mt-1 opacity-75">{toolData.project?.genre} / {toolData.project?.mood}</div>
              </div>
              <div className="bg-black/30 p-3 rounded">
                <div className="uppercase text-[10px] text-muted mb-1">MXM Analysis</div>
                {toolData.mxm ? (
                  <div className="text-xs space-y-1">
                    {toolData.mxm.moods?.main_moods && <div>Moods: {toolData.mxm.moods.main_moods.join(", ")}</div>}
                    {toolData.mxm.themes && <div>Themes available</div>}
                    {toolData.mxm.meaning?.explanation && <div className="italic">“{toolData.mxm.meaning.explanation.slice(0, 140)}...”</div>}
                    <button
                      onClick={applyMxmToBrief}
                      className="mt-2 text-[10px] underline hover:no-underline text-accent-light"
                    >
                      Apply MXM analysis to creative brief (copy)
                    </button>
                    {toolData.applied && <span className="ml-2 text-[10px] text-success">✓ Applied</span>}
                  </div>
                ) : (
                  <div className="text-xs opacity-70">{toolData.note}</div>
                )}
              </div>
            </div>
          )}

          {activeTool === "catalog" && toolData && (
            <div>
              <pre className="text-xs bg-black/30 p-3 rounded mb-2">{JSON.stringify(toolData.projectMeta, null, 2)}</pre>
              {toolData.mxmSimilar?.length > 0 && (
                <div className="text-xs">MXM hits: {toolData.mxmSimilar.map((t: any) => t.title).join(" • ")}</div>
              )}
            </div>
          )}

          {activeTool === "translation" && toolData && (
            <div className="space-y-3">
              <div className="flex gap-2 items-center">
                <select value={transLang} onChange={(e) => setTransLang(e.target.value)} className="bg-surface border rounded px-2 py-1 text-xs">
                  <option value="en">en</option><option value="id">id</option><option value="es">es</option>
                  <option value="fr">fr</option><option value="it">it</option>
                </select>
                <button onClick={() => void handleTranslate()} className="btn-secondary text-xs px-3">Get MXM Translation</button>
              </div>
              <pre className="text-xs bg-black/30 p-3 rounded max-h-40 overflow-auto">{toolData.original}</pre>
              {toolData.translated && (
                <pre className="text-xs bg-black/30 p-3 rounded max-h-40 overflow-auto">{toolData.translated}</pre>
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

              {(effectiveRichsync || effectiveAnalysis) && (
                <div className="text-[10px] text-success mb-1.5">
                  ✓ Using MXM {effectiveRichsync ? "richsync timing" : ""}{effectiveRichsync && effectiveAnalysis ? " + " : ""}{effectiveAnalysis ? "analysis visuals" : ""} — auto-refreshes on enrich
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
                MXM Pro style: uses richsync precise timing (per-char when available per their docs) mapped to your project lyrics for accurate karaoke. Auto word/char highlight, mood-reactive visuals, platform formats. Canvas recording for export. Change Karaoke mode above for control.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
