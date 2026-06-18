const ELEVENLABS_URL = "https://api.elevenlabs.io/v1";

const DEFAULT_VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";

function getApiKey(): string | undefined {
  return process.env.ELEVENLABS_API_KEY;
}

function getVoiceId(): string {
  return process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;
}

export function hasElevenLabsKey(): boolean {
  return Boolean(getApiKey());
}

export interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  labels?: {
    gender?: string;
    accent?: string;
    age?: string;
    [key: string]: string | undefined;
  };
  description?: string;
}

export interface TtsOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number;        // 0 - 1
  similarityBoost?: number;  // 0 - 1
  style?: number;            // 0 - 1
  useSpeakerBoost?: boolean;
  maxLength?: number;        // override default limit (500 for hook, higher for song)
}

export interface TtsResult {
  audio: ArrayBuffer;
  mimeType: string;
  voiceId: string;
  characterCount: number;
}

export interface MusicOptions {
  modelId?: string;          // "music_v1" | "music_v2"
  musicLengthMs?: number;    // 3000 - 300000 (5 min max)
  forceInstrumental?: boolean;
  compositionPlan?: any;     // ElevenLabs composition plan object for structured section control
}

export interface MusicResult {
  audio: ArrayBuffer;
  mimeType: string;
  songId?: string;
}

export async function listVoices(): Promise<Voice[]> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

  const res = await fetch(`${ELEVENLABS_URL}/voices`, {
    headers: { "xi-api-key": apiKey },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch voices: ${res.status}`);
  }

  const data = await res.json();
  return data.voices || [];
}

export interface ClonedVoice {
  voice_id: string;
  name: string;
}

export async function cloneVoice(
  name: string,
  audioSamples: Buffer[],
  description?: string
): Promise<ClonedVoice> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error("ELEVENLABS_API_KEY is not configured");

  const form = new FormData();
  form.append("name", name);
  if (description) form.append("description", description);

  audioSamples.forEach((buffer, index) => {
    // ElevenLabs expects files as 'files' array
    // Cast for cross-env (node Buffer in backend, browser File in api path); runtime ok
    form.append("files", new Blob([buffer as unknown as BlobPart]), `sample${index}.mp3`);
  });

  const res = await fetch(`${ELEVENLABS_URL}/voices/add`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      // Note: Do not set Content-Type, let fetch handle multipart
    },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`ElevenLabs voice clone failed: ${res.status} ${errText}`);
  }

  const data = await res.json();
  return {
    voice_id: data.voice_id,
    name: data.name || name,
  };
}

export async function synthesizeSpeech(
  text: string,
  options: TtsOptions = {}
): Promise<TtsResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Text is required for speech synthesis");
  }
  const limit = options.maxLength ?? 500;
  if (trimmed.length > limit) {
    throw new Error(
      limit === 500
        ? "Hook preview is limited to 500 characters"
        : `Text is limited to ${limit} characters`
    );
  }

  const voiceId = options.voiceId || getVoiceId();
  const modelId = options.modelId || "eleven_turbo_v2"; // default ke turbo (lebih murah & cepat)

  const body: any = {
    text: trimmed,
    model_id: modelId,
  };

  // Voice settings
  const voiceSettings: any = {};
  if (options.stability !== undefined) voiceSettings.stability = options.stability;
  if (options.similarityBoost !== undefined) voiceSettings.similarity_boost = options.similarityBoost;
  if (options.style !== undefined) voiceSettings.style = options.style;
  if (options.useSpeakerBoost !== undefined) voiceSettings.use_speaker_boost = options.useSpeakerBoost;

  if (Object.keys(voiceSettings).length > 0) {
    body.voice_settings = voiceSettings;
  }

  const url = `${ELEVENLABS_URL}/text-to-speech/${voiceId}?output_format=mp3_44100_128`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`ElevenLabs HTTP ${res.status}${errText ? `: ${errText.slice(0, 120)}` : ""}`);
  }

  const audio = await res.arrayBuffer();
  return {
    audio,
    mimeType: "audio/mpeg",
    voiceId,
    characterCount: trimmed.length,
  };
}

/**
 * Generate a full song (vocals + instrumentation) using ElevenLabs Music API.
 * Pass user lyrics inside a rich natural-language prompt for best results.
 * Supports music_v1 / music_v2. Output is a complete produced track.
 */
export async function composeMusic(
  prompt: string,
  options: MusicOptions = {}
): Promise<MusicResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new Error("Prompt (including lyrics) is required for music generation");
  }

  const modelId = options.modelId || "music_v2";

  const body: any = {
    model_id: modelId,
  };

  if (options.compositionPlan) {
    body.composition_plan = options.compositionPlan;
  } else {
    body.prompt = trimmedPrompt;
  }

  if (options.musicLengthMs) {
    body.music_length_ms = options.musicLengthMs;
  }
  if (options.forceInstrumental !== undefined) {
    body.force_instrumental = options.forceInstrumental;
  }

  const url = `${ELEVENLABS_URL}/music?output_format=mp3_44100_128`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`ElevenLabs Music API ${res.status}${errText ? `: ${errText.slice(0, 200)}` : ""}`);
  }

  const audio = await res.arrayBuffer();
  const songId = res.headers.get("song-id") || undefined;

  return {
    audio,
    mimeType: "audio/mpeg",
    songId,
  };
}

/**
 * Stem separation using ElevenLabs Music stem separation endpoint.
 * Upload full song audio to get separated stems (vocals, drums, etc.).
 * Returns base64 or can be adapted.
 */
export async function separateMusicStems(
  audioBuffer: ArrayBuffer,
  filename = "song.mp3"
): Promise<Record<string, ArrayBuffer>> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  const form = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
  form.append("file", blob, filename);

  const url = `${ELEVENLABS_URL}/music/stem-separation`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
    },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`ElevenLabs Stem Separation ${res.status}${errText ? `: ${errText.slice(0, 150)}` : ""}`);
  }

  const data = await res.json();
  const stems: Record<string, ArrayBuffer> = {};

  // Eleven returns stems in base64 or similar structure (adapt to actual response)
  // Typical: { stems: { vocals: base64, ... } } or direct files.
  // For compatibility, we expect something like LALAL response.
  if (data.stems) {
    for (const [id, b64] of Object.entries(data.stems as Record<string, string>)) {
      if (typeof b64 === "string") {
        const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
        stems[id] = bin.buffer;
      }
    }
  }

  return stems;
}