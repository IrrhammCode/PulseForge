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
  onApplyEnrichment,
}: MxmProToolsProps) {
  const [activeTool, setActiveTool] = useState<ToolKey | null>(null);
  const [toolLoading, setToolLoading] = useState(false);
  const [toolData, setToolData] = useState<any>(null);
  const [toolError, setToolError] = useState<string | null>(null);

  const [transLang, setTransLang] = useState("en");
  const [enrichedRef, setEnrichedRef] = useState<any>(null); // selected MXM reference track + data

  // Video options for better export
  const [videoStyle, setVideoStyle] = useState<'energetic' | 'minimal' | 'dark'>('energetic');
  const [videoRes, setVideoRes] = useState<720 | 1080>(720);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoAnimRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const fullLyrics = composeLyricsBody(lyrics);
  const hasContent = hasLyricsContent(lyrics);

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

    if (videoAnimRef.current) {
      cancelAnimationFrame(videoAnimRef.current);
      videoAnimRef.current = null;
    }
    if (audioElRef.current) {
      try {
        audioElRef.current.pause();
        audioElRef.current.currentTime = 0;
      } catch {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }
  }, []);

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
        setToolData({
          ready: !!(audioUrl || mixBlob),
          duration: 120,
        });
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
    if (style === 'minimal') return { accent: '#e4e4e7', grad1: 'rgba(255,255,255,0.06)', grad2: 'rgba(200,200,210,0.04)', text: '#fafafa', sub: '#a1a1aa' };
    if (style === 'dark') return { accent: '#f87171', grad1: 'rgba(120,30,30,0.15)', grad2: 'rgba(40,10,10,0.1)', text: '#fee2e2', sub: '#9f1239' };
    // energetic (default)
    return { accent: '#c4b5fd', grad1: 'rgba(167,139,250,0.12)', grad2: 'rgba(103,232,249,0.08)', text: '#f1f1f5', sub: '#a1a1aa' };
  };

  const startVideoPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas || (!audioUrl && !mixBlob)) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = getCanvasSize();
    canvas.width = w;
    canvas.height = h;

    const audio = new Audio();
    audio.src = audioUrl || "";
    if (mixBlob && !audioUrl) {
      audio.src = URL.createObjectURL(mixBlob);
    }
    audioElRef.current = audio;

    audio.currentTime = 0;
    audio.play().catch(() => {});

    const sections = Object.entries(lyrics)
      .filter(([k]) => !["raw"].includes(k))
      .map(([k, v]) => ({ key: k, text: String(v || "").split("\n").filter(Boolean) }));

    const total = 120;
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

      // Current section
      const idx = Math.min(Math.floor(prog * Math.max(sections.length, 1)), sections.length - 1);
      const sec = sections[idx] || { key: "", text: [""] };

      ctx.font = `600 ${videoRes === 1080 ? 28 : 22}px system-ui, sans-serif`;
      ctx.fillStyle = colors.accent;
      ctx.fillText(sec.key.toUpperCase(), 70, videoRes === 1080 ? 260 : 240);

      ctx.font = `500 ${videoRes === 1080 ? 44 : 36}px system-ui, sans-serif`;
      ctx.fillStyle = colors.text;
      sec.text.slice(0, 6).forEach((line, i) => {
        const y = (videoRes === 1080 ? 340 : 300) + i * (videoRes === 1080 ? 58 : 50);
        const pulse = 0.75 + Math.sin(t * 2.5 + i) * 0.25;
        ctx.fillStyle = `rgba(244,244,245,${pulse})`;
        ctx.fillText(line, 70, y);
      });

      ctx.font = "400 16px system-ui, sans-serif";
      ctx.fillStyle = "#3f3f46";
      ctx.fillText(`Musixmatch Pro style • ${videoStyle} • ${enrichedRef ? "Enriched" : "Project"}`, 70, h - 50);

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
      const { w, h } = getCanvasSize();
      canvas.width = w;
      canvas.height = h;

      const canvasStream = canvas.captureStream(30);

      // Try to capture audio track from the playing element or create one
      let combined: MediaStream = canvasStream;

      const audio = new Audio();
      const audioSrc = audioUrl || (mixBlob ? URL.createObjectURL(mixBlob) : "");
      audio.src = audioSrc;
      audio.muted = false;
      audio.volume = 1;

      // Best effort audio capture (Chrome 60+ / recent Firefox / Edge)
      try {
        await new Promise<void>((resolve, reject) => {
          audio.onloadedmetadata = () => resolve();
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

      const recorder = new MediaRecorder(combined, {
        mimeType: "video/webm;codecs=vp9",
      });
      mediaRecorderRef.current = recorder;

      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => ev.data.size && chunks.push(ev.data);

      recorder.onstop = () => {
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

      // Start recording then play
      recorder.start();

      // Drive the canvas animation while recording
      startVideoPreview();

      // Play the audio element (if we couldn't capture its stream directly it still helps sync visually)
      if (audioElRef.current) {
        audioElRef.current.currentTime = 0;
        audioElRef.current.play().catch(() => {});
      } else {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      }

      // Auto stop roughly at song length
      const dur = (project as any).bpmTarget ? 120000 : 125000;
      setTimeout(() => {
        try {
          recorder.stop();
        } catch {}
        if (audioElRef.current) audioElRef.current.pause();
        if (videoAnimRef.current) cancelAnimationFrame(videoAnimRef.current);
      }, dur);
    } catch (e) {
      setToolError("Export failed. Try the simple webm (visual) or download original MP3 + video separately.");
      setToolLoading(false);
    }
  };

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
          {!enrichedRef && <div className="text-[10px] text-accent-light mt-0.5">Match &amp; Enrich untuk data real dari MXM</div>}
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
            { key: "lyrics", label: "Lyrics", icon: BookOpen },
            { key: "analysis", label: "Analysis", icon: BarChart3 },
            { key: "catalog", label: "Catalog", icon: Database },
            { key: "translation", label: "Translation", icon: Languages },
            { key: "video", label: "Create Lyric Video", icon: Video, highlight: true },
          ] as const
        ).map(({ key, label, icon: Icon, highlight }) => (
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
        ))}
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

          {toolLoading && <div className="flex items-center gap-2 text-xs"><Loader2 className="animate-spin h-3.5 w-3.5" /> Talking to Musixmatch…</div>}
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
              </div>

              <div className="flex gap-2 mb-3">
                <button onClick={startVideoPreview} className="btn-primary flex items-center gap-2 text-sm">
                  <Play className="h-4 w-4" /> Preview
                </button>
                <button onClick={() => void exportVideoWithAudio()} disabled={toolLoading} className="btn-secondary flex items-center gap-2 text-sm">
                  <Download className="h-4 w-4" /> {toolLoading ? "Rendering..." : "Export WebM (with audio if supported)"}
                </button>
              </div>

              <canvas ref={canvasRef} className="w-full rounded border border-border bg-black" style={{ maxHeight: 380 }} />

              <p className="text-[10px] mt-2 text-muted">
                Tries to embed the mix audio track using captureStream. If your browser limits it, you will get clean visuals + the original MP3 is ready separately. Style &amp; res affect preview/export.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
