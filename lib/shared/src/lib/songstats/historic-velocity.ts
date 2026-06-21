import type { HitPotential, VelocityHistoryInsights, VelocityHistoryPoint } from "@/types";
import { clamp } from "@/lib/utils";
import { hasSongstatsKey, songstatsFetch } from "@/lib/songstats/client";

const DEFAULT_WINDOW_DAYS = 28;

function num(value: unknown): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  }
  return undefined;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function emptyHistory(
  status: VelocityHistoryInsights["status"]
): VelocityHistoryInsights {
  return {
    available: false,
    status,
    trajectory: "stable",
    historicVelocityScore: 0,
    dataPoints: [],
  };
}

function unwrapHistoricBody(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.body && typeof obj.body === "object") {
    return obj.body as Record<string, unknown>;
  }
  return obj;
}

export function parseHistoricStatsResponse(
  raw: unknown,
  windowDays = DEFAULT_WINDOW_DAYS
): VelocityHistoryInsights {
  const body = unwrapHistoricBody(raw);
  if (!body) return emptyHistory("not_found");

  const statsArray = Array.isArray(body.stats)
    ? body.stats
    : Array.isArray(body.history)
      ? body.history
      : Array.isArray(body.data)
        ? body.data
        : null;

  if (!statsArray?.length) return emptyHistory("not_found");

  const points: VelocityHistoryPoint[] = [];
  for (const entry of statsArray) {
    if (!entry || typeof entry !== "object") continue;
    const row = entry as Record<string, unknown>;
    const date = String(row.date ?? row.day ?? row.timestamp ?? "").slice(0, 10);
    if (!date || date.length < 8) continue;

    const daily =
      num(row.streams) ??
      num(row.streams_daily) ??
      num(row.daily_streams) ??
      num(row.stream_count);

    if (daily == null) continue;

    points.push({
      date,
      streams: daily,
      streamsTotal: num(row.streams_total ?? row.streams_total_cumulative),
    });
  }

  if (points.length < 3) return emptyHistory("not_found");

  points.sort((a, b) => a.date.localeCompare(b.date));

  const deduped: VelocityHistoryPoint[] = [];
  for (const point of points) {
    const last = deduped[deduped.length - 1];
    if (last?.date === point.date) {
      deduped[deduped.length - 1] = point;
    } else {
      deduped.push(point);
    }
  }

  return analyzeVelocityHistory(deduped, {
    primaryPlatform:
      typeof body.source === "string" ? body.source : "spotify",
    windowDays,
  });
}

function avg(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function classifyTrajectory(
  recentAvg: number,
  priorAvg: number
): VelocityHistoryInsights["trajectory"] {
  if (priorAvg <= 0 && recentAvg > 0) return "accelerating";
  if (priorAvg <= 0) return "stable";
  const ratio = recentAvg / priorAvg;
  if (ratio >= 1.08) return "accelerating";
  if (ratio <= 0.92) return "decelerating";
  return "stable";
}

export function classifyWeek1Pattern(
  growthPct: number
): NonNullable<VelocityHistoryInsights["week1Pattern"]> {
  if (growthPct >= 40) return "breakout";
  if (growthPct >= 12) return "steady";
  if (growthPct >= 2) return "slow-burn";
  return "flat";
}

export function computeHistoricVelocityScore(
  points: VelocityHistoryPoint[],
  trajectory: VelocityHistoryInsights["trajectory"],
  week1GrowthPct: number
): number {
  const recent = points.slice(-7).map((p) => p.streams);
  const avgDaily = avg(recent);

  let score = 18;
  score += Math.min(28, Math.log10(avgDaily + 1) * 5.5);

  if (trajectory === "accelerating") score += 20;
  else if (trajectory === "stable") score += 8;
  else score -= 6;

  if (week1GrowthPct >= 40) score += 14;
  else if (week1GrowthPct >= 15) score += 8;
  else if (week1GrowthPct >= 5) score += 4;

  return clamp(Math.round(score), 0, 100);
}

export function analyzeVelocityHistory(
  points: VelocityHistoryPoint[],
  meta?: { primaryPlatform?: string; windowDays?: number }
): VelocityHistoryInsights {
  if (points.length < 3) return emptyHistory("not_found");

  const recentSlice = points.slice(-7);
  const priorSlice = points.length >= 14 ? points.slice(-14, -7) : points.slice(0, Math.min(7, points.length - 1));

  const recentAvg = avg(recentSlice.map((p) => p.streams));
  const priorAvg = avg(priorSlice.map((p) => p.streams));
  const trajectory = classifyTrajectory(recentAvg, priorAvg);

  const recentWeek = sum(recentSlice.map((p) => p.streams));
  const priorWeek = sum(priorSlice.map((p) => p.streams));
  const recentWeeklyDeltaPct =
    priorWeek > 0 ? Math.round(((recentWeek - priorWeek) / priorWeek) * 100) : undefined;

  const week1Early = points.slice(0, Math.min(3, points.length)).map((p) => p.streams);
  const week1Late = points.slice(Math.min(4, points.length - 1), Math.min(7, points.length)).map((p) => p.streams);
  const earlyAvg = avg(week1Early);
  const lateAvg = avg(week1Late);
  const week1GrowthPct =
    earlyAvg > 0 ? Math.round(((lateAvg - earlyAvg) / earlyAvg) * 100) : 0;
  const week1Pattern = classifyWeek1Pattern(week1GrowthPct);

  const historicVelocityScore = computeHistoricVelocityScore(
    points,
    trajectory,
    week1GrowthPct
  );

  return {
    available: true,
    status: "ok",
    trajectory,
    historicVelocityScore,
    week1GrowthPct,
    week1Pattern,
    recentWeeklyDeltaPct,
    avgDailyStreams: Math.round(recentAvg),
    dataPoints: points.slice(-14),
    primaryPlatform: meta?.primaryPlatform ?? "spotify",
    windowDays: meta?.windowDays ?? DEFAULT_WINDOW_DAYS,
  };
}

export async function getTrackHistoricVelocity(opts: {
  isrc?: string;
  spotifyTrackId?: string;
  songstatsTrackId?: string;
  windowDays?: number;
}): Promise<VelocityHistoryInsights> {
  if (!hasSongstatsKey()) return emptyHistory("unavailable");

  const windowDays = opts.windowDays ?? DEFAULT_WINDOW_DAYS;
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - windowDays);

  const params: Record<string, string> = {
    source: "spotify",
    start_date: formatDate(start),
    end_date: formatDate(end),
  };

  if (opts.songstatsTrackId) params.songstats_track_id = opts.songstatsTrackId;
  else if (opts.spotifyTrackId) params.spotify_track_id = opts.spotifyTrackId;
  else if (opts.isrc) params.isrc = opts.isrc;
  else return emptyHistory("not_found");

  try {
    const raw = await songstatsFetch("tracks/historic_stats", params);
    if (!raw) return emptyHistory("not_found");
    return parseHistoricStatsResponse(raw, windowDays);
  } catch {
    return emptyHistory("error");
  }
}

/** Small supplemental boost — snapshot velocityScore carries the main weight. */
export function historicVelocitySimulationBoost(
  history?: VelocityHistoryInsights
): number {
  if (!history?.available) return 0;
  if (history.trajectory === "accelerating") return 0.05;
  if (history.trajectory === "stable" && history.historicVelocityScore >= 55) return 0.025;
  if (history.trajectory === "decelerating") return -0.02;
  return 0.01;
}

export function adjustHitPotentialWithHistoricVelocity(
  hitPotential: HitPotential,
  history: VelocityHistoryInsights
): HitPotential {
  if (!history.available) return hitPotential;

  let trendAlignment = hitPotential.breakdown.trendAlignment;
  if (history.trajectory === "accelerating") {
    trendAlignment = clamp(
      trendAlignment + Math.round(history.historicVelocityScore * 0.04),
      0,
      95
    );
  } else if (history.trajectory === "decelerating") {
    trendAlignment = clamp(trendAlignment - 4, 0, 95);
  }

  const overall = clamp(
    Math.round(
      hitPotential.breakdown.beatFit * 0.25 +
        hitPotential.breakdown.lyricVirality * 0.3 +
        trendAlignment * 0.2 +
        hitPotential.breakdown.hookStrength * 0.25
    ),
    hitPotential.overall - 4,
    96
  );

  return {
    ...hitPotential,
    overall: Math.max(hitPotential.overall, overall),
    breakdown: { ...hitPotential.breakdown, trendAlignment },
    confidence: clamp(
      hitPotential.confidence + (history.trajectory === "accelerating" ? 2 : 0),
      60,
      96
    ),
  };
}