"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Pause, Play, Settings, Upload } from "lucide-react";
import type { LyricsSections } from "@/types/studio";
import { getHookPreviewText } from "@/lib/studio/lyrics";
import { synthesizeHookVoice, listElevenLabsVoices, cloneElevenLabsVoice, ApiError, type ElevenLabsVoice, type VoicePreviewOptions } from "@/lib/api-client";
import { ElevenLabsLogo } from "@/components/icons/BrandLogos";
import { Card, CardHeader } from "@/components/ui/Card";

interface HookVoicePreviewProps {
  lyrics: LyricsSections;
  enabled?: boolean;
  /** Syncs TTS voice picker hint into Music composition_plan vocal styles */
  onVoiceHintChange?: (hint: string) => void;
}

function voiceToHint(voice: ElevenLabsVoice): string {
  const parts = [voice.name];
  if (voice.labels?.gender) parts.push(voice.labels.gender);
  if (voice.labels?.accent) parts.push(voice.labels.accent);
  if (voice.labels?.age) parts.push(voice.labels.age);
  return parts.join(" — ");
}

export function HookVoicePreview({ lyrics, enabled = true, onVoiceHintChange }: HookVoicePreviewProps) {
  const hookText = getHookPreviewText(lyrics);
  const [text, setText] = useState(hookText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Enhanced ElevenLabs features
  const [voices, setVoices] = useState<ElevenLabsVoice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);

  const [settings, setSettings] = useState<VoicePreviewOptions>({
    modelId: "eleven_turbo_v2",
    stability: 0.75,
    similarityBoost: 0.85,
    style: 0.3,
    useSpeakerBoost: true,
  });

  // Voice cloning state (Opsi A - maximize ElevenLabs)
  const [cloneName, setCloneName] = useState("My Voice");
  const [cloneFile, setCloneFile] = useState<File | null>(null);
  const [cloning, setCloning] = useState(false);
  const [cloneSuccess, setCloneSuccess] = useState<string | null>(null);

  useEffect(() => {
    setText(hookText);
  }, [hookText]);

  // Load voices when component mounts
  useEffect(() => {
    if (!enabled) return;

    listElevenLabsVoices()
      .then((list) => {
        setVoices(list);
        if (list.length > 0 && !selectedVoiceId) {
          // Restore last used (persisted) or pick good default
          let picked = "";
          try {
            const last = localStorage.getItem("pulseforge_last_voice_id");
            if (last && list.some((v) => v.voice_id === last)) picked = last;
          } catch {}
          if (!picked) {
            const preferred = list.find((v) => v.name.toLowerCase().includes("rachel")) || list[0];
            picked = preferred.voice_id;
          }
          setSelectedVoiceId(picked);
        }
      })
      .catch(() => {
        // Voices list failed (maybe rate limit), still allow default TTS
      });
  }, [enabled, selectedVoiceId]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      audioRef.current?.pause();
    };
  }, [audioUrl]);

  // Persist selected voice + sync hint for full-song generation
  useEffect(() => {
    if (!selectedVoiceId) return;
    try {
      localStorage.setItem("pulseforge_last_voice_id", selectedVoiceId);
    } catch {}
    const voice = voices.find((v) => v.voice_id === selectedVoiceId);
    if (voice && onVoiceHintChange) {
      onVoiceHintChange(voiceToHint(voice));
    }
  }, [selectedVoiceId, voices, onVoiceHintChange]);

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const opts: VoicePreviewOptions = {
        ...settings,
      };
      if (selectedVoiceId) opts.voiceId = selectedVoiceId;

      const blob = await synthesizeHookVoice(text.trim(), opts);
      if (audioUrl) URL.revokeObjectURL(audioUrl);

      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      void audio.play();
      setPlaying(true);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Voice preview failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async () => {
    if (!cloneFile || !cloneName.trim()) return;
    setCloning(true);
    setError(null);
    setCloneSuccess(null);

    try {
      const res = await cloneElevenLabsVoice(cloneName.trim(), cloneFile);
      const newId = res.voice_id;
      setCloneSuccess(`Cloned "${res.name}" successfully. Voice ready to use.`);
      setSelectedVoiceId(newId);

      // Refresh list so new cloned voice shows in dropdown (includes user voices)
      try {
        const refreshed = await listElevenLabsVoices();
        setVoices(refreshed);
      } catch {
        // keep current list; selection is already set
      }
      setCloneFile(null);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Voice cloning failed (check sample length/quality)";
      setError(msg);
    } finally {
      setCloning(false);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current && audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setPlaying(false);
    }
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play();
      setPlaying(true);
    }
  };

  if (!enabled) {
    return (
      <Card glow="none">
        <CardHeader
          title="Hook Voice Preview"
          subtitle="Add ELEVENLABS_API_KEY to preview your hook with AI speech"
          action={<ElevenLabsLogo size={20} />}
        />
        <p className="text-sm text-muted">
          ElevenLabs turns your chorus line into lifelike narration for pitch decks and social teasers.
        </p>
      </Card>
    );
  }

  return (
    <Card glow="none">
      <CardHeader
        title="Hook Voice Preview"
        subtitle="ElevenLabs AI speech — hear your hook before release"
        action={<ElevenLabsLogo size={20} />}
      />

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full resize-y rounded-xl border border-border bg-surface px-3 py-2 text-sm leading-relaxed outline-none focus:border-accent/40"
        placeholder="Your hook line…"
      />

      {/* Voice Selection + Settings */}
      {voices.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={selectedVoiceId}
            onChange={(e) => setSelectedVoiceId(e.target.value)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
          >
            {voices.slice(0, 30).map((voice) => (
              <option key={voice.voice_id} value={voice.voice_id}>
                {voice.name} {voice.labels?.gender ? `(${voice.labels.gender})` : ""}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-elevated"
          >
            <Settings className="h-3.5 w-3.5" />
            Settings
          </button>
        </div>
      )}

      {/* Voice Cloning UI (Opsi A - full ElevenLabs usage for custom voices) */}
      <div className="mt-3 rounded-xl border border-border/70 bg-surface-elevated/40 p-3">
        <div className="text-[11px] font-medium text-muted mb-1.5 flex items-center gap-1.5">
          <Upload className="h-3 w-3" /> Clone your own voice (ElevenLabs)
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={cloneName}
            onChange={(e) => setCloneName(e.target.value)}
            placeholder="Voice name"
            className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs w-36"
          />
          <label className="cursor-pointer rounded-lg border border-border px-2.5 py-1 text-xs hover:bg-surface">
            {cloneFile ? cloneFile.name.slice(0, 18) : "Choose audio sample"}
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => setCloneFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <button
            type="button"
            onClick={() => void handleClone()}
            disabled={cloning || !cloneFile || !cloneName.trim()}
            className="btn-secondary !px-3 !py-1 text-xs disabled:opacity-50"
          >
            {cloning ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> Cloning…
              </>
            ) : (
              "Clone & Use"
            )}
          </button>
        </div>
        <p className="mt-1 text-[10px] text-muted">Upload clear 30s–3min vocal sample. Cloned voice becomes selectable for previews & production.</p>
        {cloneSuccess && <p className="mt-1 text-[11px] text-success">{cloneSuccess}</p>}
      </div>

      {/* Advanced Settings Panel */}
      {showSettings && (
        <div className="mt-2 rounded-xl border border-border bg-surface-elevated p-3 text-sm space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted">Model</label>
              <select
                value={settings.modelId}
                onChange={(e) => setSettings({ ...settings, modelId: e.target.value })}
                className="mt-1 w-full rounded border border-border bg-surface px-2 py-1 text-sm"
              >
                <option value="eleven_turbo_v2">Turbo v2 (Fast & Cheap)</option>
                <option value="eleven_multilingual_v2">Multilingual v2 (High Quality)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted">Stability ({settings.stability})</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.stability}
                onChange={(e) => setSettings({ ...settings, stability: parseFloat(e.target.value) })}
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted">Similarity ({settings.similarityBoost})</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.similarityBoost}
                onChange={(e) => setSettings({ ...settings, similarityBoost: parseFloat(e.target.value) })}
                className="mt-1 w-full"
              />
            </div>
            <div>
              <label className="text-xs text-muted">Style ({settings.style})</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.style}
                onChange={(e) => setSettings({ ...settings, style: parseFloat(e.target.value) })}
                className="mt-1 w-full"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={settings.useSpeakerBoost}
              onChange={(e) => setSettings({ ...settings, useSpeakerBoost: e.target.checked })}
            />
            Use Speaker Boost
          </label>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={loading || !text.trim()}
          className="btn-primary !px-3 !py-2 text-xs"
        >
          {loading ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Mic className="h-3.5 w-3.5" />
              Preview voice
            </>
          )}
        </button>
        {audioUrl && (
          <button type="button" onClick={togglePlay} className="btn-secondary !px-3 !py-2 text-xs">
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "Pause" : "Replay"}
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-warning">{error}</p>}
    </Card>
  );
}