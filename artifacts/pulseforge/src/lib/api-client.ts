import type { TrackAnalysis, WhatIfParams } from "@/types";
import type { AppTrack } from "@/lib/musixmatch/client";
import type { LyricsSections, StudioProject } from "@/types/studio";
import type { ViralAnalysis } from "@/types/viral";
import type { SystemCapabilities } from "@/lib/partners/capabilities";

export async function fetchCatalogTrack(trackId: string): Promise<AppTrack> {
  const res = await fetch(`/api/catalog/track/${encodeURIComponent(trackId)}`);
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? "Catalog track lookup failed", res.status);
  }
  return data.track as AppTrack;
}

export async function fetchRichsync(trackId: number): Promise<{
  richsync: import("@pulseforge/shared/lib/musixmatch/richsync-parser").RichsyncParseResult;
  source: string;
} | null> {
  const res = await fetch(`/api/catalog/richsync/${trackId}`);
  if (res.status === 404 || res.status === 503) return null;
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? "Richsync fetch failed", res.status);
  }
  return data;
}

export async function fetchLyrics(trackId: number): Promise<any> {
  const res = await fetch(`/api/catalog/lyrics/${trackId}`);
  if (res.status === 404 || res.status === 503) return null;
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.error ?? "Lyrics fetch failed", res.status);
  return data;
}

export async function fetchLyricsAnalysis(trackId: number): Promise<any> {
  const res = await fetch(`/api/catalog/analysis/${trackId}`);
  if (res.status === 503) return null;
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.error ?? "Analysis fetch failed", res.status);
  return data;
}

export async function fetchLyricsTranslation(trackId: number, lang = "en"): Promise<any> {
  const res = await fetch(`/api/catalog/translation?track_id=${trackId}&lang=${encodeURIComponent(lang)}`);
  if (res.status === 404 || res.status === 503) return null;
  const data = await res.json();
  if (!res.ok) throw new ApiError(data.error ?? "Translation fetch failed", res.status);
  return data;
}

export async function searchTracks(query: string): Promise<AppTrack[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(data.error ?? "Search failed", res.status, data.hint);
  }

  if (data.warning) {
    console.warn("Search warning:", data.warning);
  }

  return data.results;
}

export async function analyzeTrack(
  track: AppTrack,
  options?: {
    whatIf?: Partial<WhatIfParams>;
    cachedAnalysis?: TrackAnalysis;
  }
): Promise<TrackAnalysis> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      track,
      whatIf: options?.whatIf,
      cachedAnalysis: options?.cachedAnalysis,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? "Analysis failed", res.status, data.hint);
  }

  if (data.warning) {
    console.warn("Analyze warning:", data.warning);
  }

  return data.analysis;
}

export async function analyzeStudioVersion(
  project: StudioProject,
  options?: {
    versionId?: string;
    lyricsBody?: string;
    whatIf?: Partial<WhatIfParams>;
    cachedAnalysis?: TrackAnalysis;
  }
): Promise<TrackAnalysis> {
  const res = await fetch("/api/studio/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project,
      versionId: options?.versionId,
      lyricsBody: options?.lyricsBody,
      whatIf: options?.whatIf,
      cachedAnalysis: options?.cachedAnalysis,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? "Studio analysis failed", res.status);
  }

  return data.analysis;
}

export interface CoachFixResult {
  tier: "local" | "partner" | "ai";
  aiBackend: "b.ai" | "groq" | "n8n" | "none";
  patches: {
    moodTags?: string[];
    bpmTarget?: number;
    creativeBrief: Record<string, unknown>;
    musicArrangement: Record<string, unknown>;
  };
  lyrics: LyricsSections;
  notes: string[];
  intelligence: { musixmatch: boolean; cyanite: boolean; songstats: boolean };
}

/**
 * Server-side "coach fix" step of Optimize & Ship. Runs runIntelligentOptimize
 * (local -> partner -> ai) and returns enriched patches plus a candidate lyric
 * rewrite. Callers should fall back to the local engine if this rejects.
 */
export async function coachFixLyrics(
  project: StudioProject,
  analysis: TrackAnalysis,
  options?: { versionId?: string; lyrics?: LyricsSections }
): Promise<CoachFixResult> {
  const res = await fetch("/api/studio/lyrics/coach-fix", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project,
      analysis,
      versionId: options?.versionId,
      lyrics: options?.lyrics,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? "Coach fix failed", res.status);
  }
  return data as CoachFixResult;
}

export interface VoicePreviewOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
  maxLength?: number;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: Record<string, string>;
}

export async function listElevenLabsVoices(): Promise<ElevenLabsVoice[]> {
  const res = await fetch("/api/studio/voices");
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError((data as { error?: string }).error ?? "Failed to load voices", res.status);
  }
  const data = await res.json();
  return data.voices || [];
}

export async function cloneElevenLabsVoice(
  name: string,
  sampleFile: File,
  description?: string
): Promise<{ voice_id: string; name: string }> {
  const form = new FormData();
  form.append("name", name);
  if (description) form.append("description", description);
  form.append("sample", sampleFile);

  const res = await fetch("/api/studio/voices/clone", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError((data as { error?: string }).error ?? "Voice cloning failed", res.status);
  }

  return res.json();
}

export async function synthesizeHookVoice(
  text: string,
  options: VoicePreviewOptions = {}
): Promise<Blob> {
  const res = await fetch("/api/studio/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, ...options }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError((data as { error?: string }).error ?? "Voice preview failed", res.status);
  }
  return res.blob();
}

/** Legacy TTS path (spoken voice preview only). Use generateFullSong for real music. */
export async function synthesizeSongVocal(
  text: string,
  options: VoicePreviewOptions = {}
): Promise<Blob> {
  const res = await fetch("/api/studio/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, maxLength: 5000, ...options }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError((data as { error?: string }).error ?? "Song vocal generation failed", res.status);
  }
  return res.blob();
}

export interface FullSongOptions {
  modelId?: string; // "music_v2" recommended
  musicLengthMs?: number;
  forceInstrumental?: boolean;
  compositionPlan?: Record<string, unknown>;
}

/**
 * Generate a complete studio song (singing vocals + full instrumentation) using ElevenLabs Music API.
 * Pass a rich prompt that includes the full lyrics + style/genre/mood descriptors.
 */
export async function generateFullSong(
  prompt: string,
  options: FullSongOptions = {}
): Promise<Blob> {
  const res = await fetch("/api/studio/music", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, ...options }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError((data as { error?: string }).error ?? "Full song generation failed", res.status);
  }
  return res.blob();
}

export async function separateStemsWithLalal(file: File): Promise<{
  source: string;
  stems: Record<string, string>;
  mimeType: string;
}> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/studio/stems/lalal", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? "LALAL.AI stems failed", res.status);
  }
  return data;
}

export async function separateStemsWithElevenMusic(file: File): Promise<{
  source: string;
  stems: Record<string, string>;
  mimeType: string;
}> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/studio/music/stems", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? "ElevenLabs Music stems failed", res.status);
  }
  return data;
}

export async function separateStemsWithMusixmatch(file: File): Promise<{
  source: string;
  stems: Record<string, string>;
  mimeType: string;
}> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/studio/stems/musixmatch", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? "Musixmatch stems failed", res.status);
  }
  return data;
}

export interface JamBaseEvent {
  id: string;
  artistName: string;
  venueName: string;
  city: string;
  region?: string;
  country: string;
  date: string;
  url?: string;
  genre?: string;
}

export async function fetchConcertIntel(
  artist: string,
  genre?: string
): Promise<{
  available: boolean;
  source: string;
  events: JamBaseEvent[];
  artistQuery: string;
}> {
  const params = new URLSearchParams({ artist });
  if (genre) params.set("genre", genre);
  const res = await fetch(`/api/jambase/concerts?${params}`);
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? "Concert search failed", res.status);
  }
  return data;
}

export async function triggerN8nWorkflow(payload: Record<string, unknown>): Promise<{
  ok: boolean;
  status: number;
}> {
  const res = await fetch("/api/workflows/n8n", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? "n8n trigger failed", res.status, data.hint);
  }
  return data;
}

export async function runViralLabAnalysis(
  project: StudioProject,
  options?: {
    versionId?: string;
    whatIf?: Partial<WhatIfParams>;
    allProjects?: StudioProject[];
  }
): Promise<ViralAnalysis> {
  const res = await fetch("/api/viral/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project,
      versionId: options?.versionId,
      whatIf: options?.whatIf,
      allProjects: options?.allProjects,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new ApiError(data.error ?? "Viral analysis failed", res.status);
  }

  return data.viral;
}

export async function fetchCapabilities(): Promise<SystemCapabilities> {
  const res = await fetch("/api/capabilities");
  if (!res.ok) {
    throw new ApiError("Failed to load capabilities", res.status);
  }
  return res.json();
}

export async function generateProjectFromPrompt(prompt: string): Promise<any> {
  const res = await fetch("/api/studio/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(
      data.error ?? "AI project generation isn't configured. Add an AI provider key to enable it.",
      res.status
    );
  }
  return res.json();
}

export async function fetchCatalogSimilar(params: {
  analysis?: unknown;
  genre?: string;
  title?: string;
}): Promise<{ similar: AppTrack[] } | null> {
  try {
    const res = await fetch("/api/catalog/similar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchWhisperLyricAlign(
  audioBlob: Blob,
  lyrics: unknown,
  syncOffsetSec?: number
): Promise<{ lines: any[]; source: string } | null> {
  try {
    const form = new FormData();
    form.append("audio", audioBlob);
    form.append("lyrics", JSON.stringify(lyrics));
    if (syncOffsetSec != null) form.append("syncOffsetSec", String(syncOffsetSec));
    const res = await fetch("/api/studio/whisper-align", { method: "POST", body: form });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchMxmVideoSync(params?: unknown): Promise<{ lines: any[]; source: string } | null> {
  try {
    const res = await fetch("/api/catalog/video-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params ?? {}),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function translateProjectLyrics(params: {
  text: string;
  targetLang: string;
  sourceLang?: string;
}): Promise<{ translated: string; source: string }> {
  const res = await fetch("/api/studio/translate-lyrics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(
      data.error ?? "Could not fetch translation. Set GROQ_API_KEY for AI translation.",
      res.status
    );
  }
  return res.json();
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public hint?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}