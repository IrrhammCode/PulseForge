import type { EnergyProfile, LyricsStructure } from "@/types";
import type { AppTrack } from "@/lib/musixmatch/client";

/** Derives energy profile from track metadata + lyrics sentiment (audio API placeholder) */
export function deriveEnergyProfile(
  track: AppTrack,
  lyrics: LyricsStructure
): EnergyProfile {
  const seed = track.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
  const genre = (track.genre ?? "").toLowerCase();

  const genreBpm: Record<string, number> = {
    pop: 118,
    "dance pop": 124,
    "hip-hop/rap": 95,
    "hip hop": 95,
    "r&b": 88,
    rock: 128,
    electronic: 126,
    "indie pop": 108,
    alternative: 115,
    "synth pop": 122,
  };

  let bpm = genreBpm[genre] ?? 110;
  if (lyrics.sentiment === "energetic") bpm += 8;
  if (lyrics.sentiment === "melancholic") bpm -= 12;

  let energy =
    lyrics.sentiment === "energetic" ? 0.82 :
    lyrics.sentiment === "positive" ? 0.68 :
    lyrics.sentiment === "melancholic" ? 0.48 : 0.58;

  if (genre.includes("dance") || genre.includes("electronic")) energy += 0.08;
  if (bpm > 120) energy += 0.06;

  const danceability = clamp01(energy * 0.85 + (bpm > 115 ? 0.1 : 0));
  const valence =
    lyrics.sentiment === "energetic" ? 0.78 :
    lyrics.sentiment === "positive" ? 0.72 :
    lyrics.sentiment === "melancholic" ? 0.38 : 0.55;

  const waveform = generateWaveform(seed, energy, bpm);

  return {
    bpm: Math.round(bpm),
    energy: clamp01(energy),
    danceability: clamp01(danceability),
    valence: clamp01(valence),
    loudness: -4.5 - (1 - energy) * 4,
    waveform,
  };
}

function clamp01(n: number) {
  return Math.min(1, Math.max(0, Math.round(n * 100) / 100));
}

function generateWaveform(seed: number, energy: number, bpm: number, length = 80): number[] {
  const freq = bpm / 60;
  return Array.from({ length }, (_, i) => {
    const t = i / length;
    const base =
      Math.abs(Math.sin(t * Math.PI * freq * 2 + seed * 0.01)) * 0.55 +
      Math.abs(Math.sin(t * Math.PI * 8 + seed)) * 0.25;
    const noise = ((seed * (i + 1)) % 17) / 100;
    return clamp01(base * energy + noise * 0.12);
  });
}