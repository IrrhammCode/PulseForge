import type { VocalActivityProfile } from "@pulseforge/shared/lib/musixmatch/vocal-gap-sync";

export type { VocalActivityProfile };

interface DecodeResult {
  data: Float32Array;
  sampleRate: number;
  duration: number;
}

async function blobOrUrlToArrayBuffer(source: Blob | string): Promise<ArrayBuffer> {
  if (typeof source === "string") {
    const res = await fetch(source);
    return await res.arrayBuffer();
  }
  return await source.arrayBuffer();
}

async function decodeToMono(source: Blob | string): Promise<DecodeResult | null> {
  if (typeof window === "undefined") return null;
  const AudioCtx: typeof AudioContext | undefined =
    (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;

  let ctx: AudioContext | null = null;
  try {
    const arrayBuffer = await blobOrUrlToArrayBuffer(source);
    ctx = new AudioCtx();
    const audioBuffer: AudioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

    const channels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const mono = new Float32Array(length);
    for (let ch = 0; ch < channels; ch++) {
      const chData = audioBuffer.getChannelData(ch);
      for (let i = 0; i < length; i++) mono[i]! += chData[i]! / channels;
    }
    return { data: mono, sampleRate: audioBuffer.sampleRate, duration: audioBuffer.duration };
  } catch {
    return null;
  } finally {
    try {
      await ctx?.close();
    } catch {
      /* ignore */
    }
  }
}

/**
 * Analyze a mix to detect audio-active (vocal/phrase) regions using a Web Audio
 * RMS energy envelope. The browser cannot cleanly isolate vocals from a full
 * mix, but the energy envelope reliably distinguishes sung/played phrases from
 * quiet instrumental gaps and intros, which is what the lyric-video sync needs
 * to stop the highlight racing ahead of the singing.
 *
 * Returns an empty profile (callers fall back to other strategies) when Web
 * Audio is unavailable or decoding fails.
 */
export async function analyzeMixVocalActivity(
  source: Blob | string,
): Promise<VocalActivityProfile> {
  const decoded = await decodeToMono(source);
  if (!decoded || decoded.data.length === 0) {
    return { durationSec: 0, segments: [] };
  }

  const { data, sampleRate, duration } = decoded;

  // ~46ms frames give a smooth-enough envelope without losing phrase boundaries.
  const frameDur = 0.046;
  const frameSize = Math.max(256, Math.round(sampleRate * frameDur));
  const frameCount = Math.floor(data.length / frameSize);
  if (frameCount < 4) return { durationSec: duration, segments: [] };

  const rms = new Float32Array(frameCount);
  for (let f = 0; f < frameCount; f++) {
    let sum = 0;
    const start = f * frameSize;
    for (let i = 0; i < frameSize; i++) {
      const s = data[start + i]!;
      sum += s * s;
    }
    rms[f] = Math.sqrt(sum / frameSize);
  }

  // Smooth the envelope (moving average) to avoid chopping inside a phrase.
  const smooth = new Float32Array(frameCount);
  const win = 3;
  for (let f = 0; f < frameCount; f++) {
    let acc = 0;
    let n = 0;
    for (let k = -win; k <= win; k++) {
      const idx = f + k;
      if (idx >= 0 && idx < frameCount) {
        acc += rms[idx]!;
        n++;
      }
    }
    smooth[f] = acc / n;
  }

  // Dynamic threshold from the envelope's own range (robust to overall loudness).
  let lo = Infinity;
  let hi = -Infinity;
  for (let f = 0; f < frameCount; f++) {
    const v = smooth[f]!;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!isFinite(lo) || !isFinite(hi) || hi <= lo) {
    return { durationSec: duration, segments: [] };
  }
  const threshold = lo + (hi - lo) * 0.22;

  // Build active segments, merging short gaps and dropping tiny blips.
  const minSegmentSec = 0.4;
  const mergeGapSec = 0.35;
  const segments: Array<{ start: number; end: number }> = [];
  let active = false;
  let segStart = 0;

  const frameToSec = (f: number) => (f * frameSize) / sampleRate;

  for (let f = 0; f < frameCount; f++) {
    const isActive = smooth[f]! >= threshold;
    if (isActive && !active) {
      active = true;
      segStart = frameToSec(f);
    } else if (!isActive && active) {
      active = false;
      const segEnd = frameToSec(f);
      segments.push({ start: segStart, end: segEnd });
    }
  }
  if (active) segments.push({ start: segStart, end: duration });

  // Merge segments separated by a short gap.
  const merged: Array<{ start: number; end: number }> = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && seg.start - last.end <= mergeGapSec) {
      last.end = seg.end;
    } else {
      merged.push({ ...seg });
    }
  }

  // Drop segments shorter than the minimum (noise/instrument transients).
  const cleaned = merged.filter((s) => s.end - s.start >= minSegmentSec);

  return { durationSec: duration, segments: cleaned };
}
