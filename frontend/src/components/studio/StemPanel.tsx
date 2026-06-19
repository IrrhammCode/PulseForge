"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Scissors, Sparkles, Volume2, VolumeX } from "lucide-react";
import type { DemoAudioMeta, StemId, StemMeta } from "@/types/studio";
import { getAudioBlob, createAudioObjectUrl, saveAudioBlob } from "@/lib/studio/audio-db";
import { separateStems } from "@/lib/studio/audio-analysis";
import { separateStemsWithLalal, separateStemsWithElevenMusic, fetchCapabilities, ApiError } from "@/lib/api-client";
import { LalalLogo } from "@/components/icons/BrandLogos";
import { Card, CardHeader } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

const STEM_COLORS: Record<StemId, string> = {
  vocals: "bg-accent",
  drums: "bg-accent/70",
  bass: "bg-accent/50",
  other: "bg-accent/35",
};

const LALAL_STEM_IDS: StemId[] = ["vocals", "drums", "bass", "other"];

interface StemPanelProps {
  projectId: string;
  versionId: string;
  audio: DemoAudioMeta;
  onStemsUpdated: (patch: Pick<DemoAudioMeta, "stems" | "stemsReady" | "stemSource">) => void;
  onStemSettingsChange: (stems: StemMeta[]) => void;
}

export function StemPanel({
  projectId,
  versionId,
  audio,
  onStemsUpdated,
  onStemSettingsChange,
}: StemPanelProps) {
  const [separating, setSeparating] = useState(false);
  const [stemStep, setStemStep] = useState(0);
  const [previewId, setPreviewId] = useState<StemId | null>(null);
  const [lalalAvailable, setLalalAvailable] = useState(false);
  const [elevenStemsAvailable, setElevenStemsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    fetchCapabilities()
      .then((c) => {
        setLalalAvailable(c.features.lalalStems);
        setElevenStemsAvailable(c.features.elevenStems);
      })
      .catch(() => {
        setLalalAvailable(false);
        setElevenStemsAvailable(false);
      });
  }, []);

  useEffect(() => {
    return () => {
      previewRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  const handleClientSeparate = async () => {
    setSeparating(true);
    setStemStep(0);
    setError(null);
    try {
      const mixBlob = await getAudioBlob(projectId, versionId, "mix");
      if (!mixBlob) return;

      const stems = await separateStems(projectId, versionId, mixBlob, (step) => {
        setStemStep(step);
      });

      onStemsUpdated({ stemsReady: true, stems, stemSource: "client" }); // or "musixmatch"
    } finally {
      setSeparating(false);
    }
  };

  const handleLalalSeparate = async () => {
    setSeparating(true);
    setError(null);
    try {
      const mixBlob = await getAudioBlob(projectId, versionId, "mix");
      if (!mixBlob) return;

      const file = new File([mixBlob], audio.fileName || "demo.mp3", {
        type: audio.mimeType || "audio/mpeg",
      });

      // Try LALAL first (always), or user can use Eleven Music stems separately via API if preferred for Music-generated tracks
      const result = await separateStemsWithLalal(file);
      const mime = result.mimeType || "audio/mpeg";

      for (const stemId of LALAL_STEM_IDS) {
        const b64 = result.stems[stemId];
        if (!b64) continue;
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        await saveAudioBlob(projectId, versionId, stemId, new Blob([bytes], { type: mime }));
      }

      onStemsUpdated({
        stemsReady: true,
        stems: audio.stems,
        stemSource: "lalal", // could be "musixmatch"
      });
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "LALAL.AI separation failed";
      setError(msg);
    } finally {
      setSeparating(false);
    }
  };

  const toggleMute = (id: StemId) => {
    const next = audio.stems.map((s) =>
      s.id === id ? { ...s, muted: !s.muted, solo: false } : s
    );
    onStemSettingsChange(next);
  };

  const toggleSolo = (id: StemId) => {
    const target = audio.stems.find((s) => s.id === id);
    const nextSolo = !target?.solo;
    const next = audio.stems.map((s) => ({
      ...s,
      solo: s.id === id ? nextSolo : false,
      muted: nextSolo ? s.id !== id : s.muted,
    }));
    onStemSettingsChange(next);
  };

  const setVolume = (id: StemId, volume: number) => {
    const next = audio.stems.map((s) => (s.id === id ? { ...s, volume } : s));
    onStemSettingsChange(next);
  };

  const previewStem = useCallback(
    async (id: StemId) => {
      if (previewId === id) {
        previewRef.current?.pause();
        setPreviewId(null);
        return;
      }

      previewRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);

      const blob = await getAudioBlob(projectId, versionId, id);
      if (!blob) return;

      const url = createAudioObjectUrl(blob);
      urlRef.current = url;
      const audioEl = new Audio(url);
      previewRef.current = audioEl;
      setPreviewId(id);
      audioEl.onended = () => setPreviewId(null);
      void audioEl.play();
    },
    [previewId, projectId, versionId]
  );

  const scaledWaveform = (id: StemId, i: number) => {
    const base = audio.waveform[i] ?? 0;
    const scale = id === "bass" ? 0.7 : id === "vocals" ? 0.9 : id === "drums" ? 0.55 : 0.65;
    return base * scale;
  };

  const sourceLabel =
    audio.stemSource === "lalal"
      ? "LALAL.AI multistem"
      : "Client-side preview";

  return (
    <Card glow="none">
      <CardHeader
        title="Stem Separation"
        subtitle={
          audio.stemsReady
            ? `${sourceLabel} — preview each stem`
            : "Split demo into vocals, drums, bass & other"
        }
        action={
          audio.stemSource === "lalal" ? (
            <LalalLogo size={20} />
          ) : (
            <Scissors className="h-4 w-4 text-accent-light" />
          )
        }
      />

      {!audio.stemsReady ? (
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {lalalAvailable
              ? "Use LALAL.AI for production-grade stems, or run a quick browser preview."
              : "Runs locally with frequency-band isolation. Add LALAL_API_KEY for AI stem separation."}
          </p>
          <div className="flex flex-wrap gap-2">
            {lalalAvailable && (
              <button
                type="button"
                onClick={() => void handleLalalSeparate()}
                disabled={separating}
                className="btn-primary"
              >
                {separating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    LALAL.AI processing…
                  </>
                ) : (
                  <>
                    <LalalLogo size={16} />
                    AI stems (LALAL.AI)
                  </>
                )}
              </button>
            )}
            {elevenStemsAvailable && (
              <button
                type="button"
                onClick={async () => {
                  const mixBlob = await getAudioBlob(projectId, versionId, "mix");
                  if (!mixBlob) return;
                  setSeparating(true);
                  setError(null);
                  try {
                    const result = await separateStemsWithElevenMusic(new File([mixBlob], "fullsong.mp3"));
                    const mime = result.mimeType || "audio/mpeg";
                    for (const stemId of LALAL_STEM_IDS) {
                      const b64 = result.stems[stemId];
                      if (!b64) continue;
                      const binary = atob(b64);
                      const bytes = new Uint8Array(binary.length);
                      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                      await saveAudioBlob(projectId, versionId, stemId, new Blob([bytes], { type: mime }));
                    }
                    onStemsUpdated({ stemsReady: true, stems: audio.stems, stemSource: "lalal" }); // "musixmatch" when using MXM stems
                  } catch (err) {
                    const msg = err instanceof ApiError ? err.message : "Eleven Music stems failed";
                    setError(msg);
                  } finally {
                    setSeparating(false);
                  }
                }}
                disabled={separating}
                className="btn-secondary text-xs"
              >
                Eleven Music stems
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleClientSeparate()}
              disabled={separating}
              className={lalalAvailable ? "btn-secondary" : "btn-primary"}
            >
              {separating && !lalalAvailable ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Separating {stemStep}/4…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Quick preview (local)
                </>
              )}
            </button>
          </div>
          {error && <p className="text-xs text-warning">{error}</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {audio.stems.map((stem) => (
            <div
              key={stem.id}
              className={cn(
                "rounded-xl border p-3 transition",
                stem.solo ? "border-accent/40 bg-accent-muted/40" : "border-border bg-surface"
              )}
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">{stem.label}</span>
                  <button
                    type="button"
                    onClick={() => toggleSolo(stem.id)}
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      stem.solo
                        ? "bg-accent text-white"
                        : "border border-border text-muted hover:text-foreground"
                    )}
                  >
                    Solo
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleMute(stem.id)}
                    className="text-muted hover:text-foreground"
                    aria-label={stem.muted ? "Unmute" : "Mute"}
                  >
                    {stem.muted ? (
                      <VolumeX className="h-3.5 w-3.5" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => void previewStem(stem.id)}
                  className={cn(
                    "text-xs font-medium",
                    previewId === stem.id ? "text-accent-light" : "text-muted hover:text-foreground"
                  )}
                >
                  {previewId === stem.id ? "Stop" : "Preview"}
                </button>
              </div>

              <div className="mb-2 flex h-10 items-end gap-px rounded-lg bg-surface-elevated p-1.5">
                {audio.waveform.slice(0, 60).map((_, i) => (
                  <div
                    key={i}
                    className={cn("flex-1 rounded-sm", STEM_COLORS[stem.id])}
                    style={{ height: `${Math.max(8, scaledWaveform(stem.id, i) * 100)}%` }}
                  />
                ))}
              </div>

              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(stem.volume * 100)}
                onChange={(e) => setVolume(stem.id, Number(e.target.value) / 100)}
                className="range-slider w-full"
                aria-label={`${stem.label} volume`}
              />
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}