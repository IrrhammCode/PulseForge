import type { DemoAudioMeta, StemId } from "@/types/studio";
import { DEFAULT_STEMS, MAX_DEMO_DURATION_SEC, MAX_DEMO_SIZE_BYTES } from "@/types/studio";
import { saveAudioBlob } from "./audio-db";

const WAVEFORM_BARS = 120;

const STEM_FILTERS: Record<
  StemId,
  { type: BiquadFilterType; frequency: number; q?: number; gain?: number }
> = {
  vocals: { type: "bandpass", frequency: 1200, q: 0.7 },
  drums: { type: "highpass", frequency: 2200, q: 0.6 },
  bass: { type: "lowpass", frequency: 220, q: 0.8 },
  other: { type: "bandpass", frequency: 600, q: 0.5 },
};

export class AudioProcessingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AudioProcessingError";
  }
}

export function validateDemoFile(file: File): void {
  if (!file.type.startsWith("audio/")) {
    throw new AudioProcessingError("Please upload an audio file (MP3, WAV, M4A, OGG).");
  }
  if (file.size > MAX_DEMO_SIZE_BYTES) {
    throw new AudioProcessingError("Demo must be under 20 MB.");
  }
}

export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const ctx = new AudioContext();
  try {
    const arrayBuffer = await file.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await ctx.close();
  }
}

export function extractWaveformPeaks(buffer: AudioBuffer, bars = WAVEFORM_BARS): number[] {
  const channel = buffer.getChannelData(0);
  const blockSize = Math.max(1, Math.floor(channel.length / bars));
  const peaks: number[] = [];

  for (let i = 0; i < bars; i++) {
    let max = 0;
    const start = i * blockSize;
    const end = Math.min(start + blockSize, channel.length);
    for (let j = start; j < end; j++) {
      max = Math.max(max, Math.abs(channel[j] ?? 0));
    }
    peaks.push(max);
  }

  const peak = Math.max(...peaks, 0.001);
  return peaks.map((p) => p / peak);
}

export function estimateBpm(buffer: AudioBuffer): number | undefined {
  const channel = buffer.getChannelData(0);
  const sampleRate = buffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.02);
  const hop = Math.floor(windowSize / 2);
  const energies: number[] = [];

  for (let i = 0; i < channel.length - windowSize; i += hop) {
    let sum = 0;
    for (let j = 0; j < windowSize; j++) {
      const v = channel[i + j] ?? 0;
      sum += v * v;
    }
    energies.push(sum);
  }

  if (energies.length < 20) return undefined;

  const threshold = energies.reduce((a, b) => a + b, 0) / energies.length * 1.4;
  const peaks: number[] = [];
  for (let i = 2; i < energies.length - 2; i++) {
    const e = energies[i] ?? 0;
    if (
      e > threshold &&
      e > (energies[i - 1] ?? 0) &&
      e > (energies[i + 1] ?? 0)
    ) {
      peaks.push(i);
    }
  }

  if (peaks.length < 4) return undefined;

  const intervals: number[] = [];
  for (let i = 1; i < peaks.length; i++) {
    intervals.push((peaks[i] ?? 0) - (peaks[i - 1] ?? 0));
  }

  const intervalSec = (hop / sampleRate);
  const bpms = intervals.map((iv) => 60 / (iv * intervalSec));
  const valid = bpms.filter((b) => b >= 70 && b <= 180);
  if (valid.length === 0) return undefined;

  valid.sort((a, b) => a - b);
  const mid = valid[Math.floor(valid.length / 2)] ?? 0;
  return Math.round(mid);
}

function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const interleaved = new Float32Array(buffer.length * numChannels);
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      interleaved[i * numChannels + ch] = buffer.getChannelData(ch)[i] ?? 0;
    }
  }

  const samples = new Int16Array(interleaved.length);
  for (let i = 0; i < interleaved.length; i++) {
    const s = Math.max(-1, Math.min(1, interleaved[i] ?? 0));
    samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const dataSize = samples.length * bytesPerSample;
  const bufferSize = 44 + dataSize;
  const array = new ArrayBuffer(bufferSize);
  const view = new DataView(array);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, bufferSize - 8, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset, samples[i] ?? 0, true);
    offset += 2;
  }

  return new Blob([array], { type: "audio/wav" });
}

async function renderStem(buffer: AudioBuffer, stemId: StemId): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(
    buffer.numberOfChannels,
    buffer.length,
    buffer.sampleRate
  );
  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  const cfg = STEM_FILTERS[stemId];
  filter.type = cfg.type;
  filter.frequency.value = cfg.frequency;
  if (cfg.q != null) filter.Q.value = cfg.q;
  if (cfg.gain != null) filter.gain.value = cfg.gain;

  source.connect(filter);
  filter.connect(ctx.destination);
  source.start(0);
  return ctx.startRendering();
}

export interface ProcessedDemo {
  meta: DemoAudioMeta;
  mixBlob: Blob;
}

export async function processDemoUpload(file: File): Promise<ProcessedDemo> {
  validateDemoFile(file);
  const buffer = await decodeAudioFile(file);

  if (buffer.duration > MAX_DEMO_DURATION_SEC) {
    throw new AudioProcessingError("Demo must be under 10 minutes.");
  }

  const waveform = extractWaveformPeaks(buffer);
  const estimatedBpm = estimateBpm(buffer);

  const meta: DemoAudioMeta = {
    fileName: file.name,
    mimeType: file.type || "audio/mpeg",
    sizeBytes: file.size,
    durationSec: buffer.duration,
    uploadedAt: new Date().toISOString(),
    waveform,
    estimatedBpm,
    stemsReady: false,
    stems: DEFAULT_STEMS.map((s) => ({ ...s })),
  };

  const wavBlob = audioBufferToWav(buffer);
  return { meta, mixBlob: wavBlob };
}

export async function separateStems(
  projectId: string,
  versionId: string,
  mixBlob: Blob,
  onProgress?: (step: number, total: number) => void
): Promise<DemoAudioMeta["stems"]> {
  const arrayBuffer = await mixBlob.arrayBuffer();
  const ctx = new AudioContext();
  let buffer: AudioBuffer;
  try {
    buffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await ctx.close();
  }

  const stemIds: StemId[] = ["vocals", "drums", "bass", "other"];
  for (let i = 0; i < stemIds.length; i++) {
    const stemId = stemIds[i]!;
    onProgress?.(i + 1, stemIds.length);
    const stemBuffer = await renderStem(buffer, stemId);
    const stemBlob = audioBufferToWav(stemBuffer);
    await saveAudioBlob(projectId, versionId, stemId, stemBlob);
  }

  return DEFAULT_STEMS.map((s) => ({ ...s }));
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}