import type { StemMeta } from "@/types/studio";
import { clamp } from "@/lib/utils";

/** 0–100 score: penalizes muted stems and extreme volume imbalance. */
export function computeStemBalanceScore(stems: StemMeta[]): number {
  if (!stems.length) return 50;

  const active = stems.filter((s) => !s.muted);
  if (active.length === 0) return 0;
  if (active.length < 2) return 35;

  const volumes = active.map((s) => s.volume);
  const avg = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const variance =
    volumes.reduce((sum, v) => sum + (v - avg) ** 2, 0) / volumes.length;

  let score = 72;
  score -= variance * 40;
  score -= (stems.length - active.length) * 12;

  const vocals = stems.find((s) => s.id === "vocals");
  if (vocals && !vocals.muted && vocals.volume < 0.35) score -= 15;
  if (vocals && !vocals.muted && vocals.volume > 1.4) score -= 8;

  return clamp(Math.round(score), 0, 100);
}

export function stemBalanceLabel(score: number): string {
  if (score >= 75) return "balanced";
  if (score >= 50) return "acceptable";
  if (score >= 30) return "imbalanced";
  return "critical";
}