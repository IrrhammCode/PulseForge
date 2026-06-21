import type { HitPotential, ReleaseHistoryInsights, SeasonalContext } from "@/types";
import { clamp } from "@/lib/utils";

export function adjustHitPotentialWithContext(
  hitPotential: HitPotential,
  seasonal?: SeasonalContext,
  releaseHistory?: ReleaseHistoryInsights
): HitPotential {
  let trendAlignment = hitPotential.breakdown.trendAlignment;

  if (seasonal) {
    trendAlignment = clamp(
      trendAlignment + Math.round(seasonal.alignmentScore * 0.06),
      0,
      95
    );
    if (seasonal.releaseWindow === "optimal") trendAlignment = clamp(trendAlignment + 4, 0, 95);
    else if (seasonal.releaseWindow === "weak") trendAlignment = clamp(trendAlignment - 3, 0, 95);
  }

  if (releaseHistory?.available) {
    if (releaseHistory.trajectory === "improving") {
      trendAlignment = clamp(trendAlignment + 5, 0, 95);
    } else if (releaseHistory.trajectory === "declining") {
      trendAlignment = clamp(trendAlignment - 4, 0, 95);
    }
    if (releaseHistory.bestHitScore != null && releaseHistory.bestHitScore >= 75) {
      trendAlignment = clamp(trendAlignment + 3, 0, 95);
    }
  }

  const overall = clamp(
    Math.max(
      hitPotential.overall,
      Math.round(
        hitPotential.breakdown.beatFit * 0.25 +
          hitPotential.breakdown.lyricVirality * 0.3 +
          trendAlignment * 0.2 +
          hitPotential.breakdown.hookStrength * 0.25
      )
    ),
    hitPotential.overall - 5,
    96
  );

  const verdict: HitPotential["verdict"] =
    overall >= 78 ? "strong" : overall >= 62 ? "promising" : "needs-work";

  return {
    ...hitPotential,
    overall,
    verdict,
    breakdown: { ...hitPotential.breakdown, trendAlignment },
  };
}

export function contextualSimulationBoost(
  seasonal?: SeasonalContext,
  releaseHistory?: ReleaseHistoryInsights
): number {
  let boost = 0;
  if (seasonal) boost += seasonal.timingBoost;
  if (releaseHistory) boost += releaseHistory.historyBoost;
  return clamp(boost, -0.04, 0.12);
}