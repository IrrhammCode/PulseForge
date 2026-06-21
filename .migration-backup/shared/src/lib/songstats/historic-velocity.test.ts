import { describe, expect, it } from "vitest";
import {
  adjustHitPotentialWithHistoricVelocity,
  analyzeVelocityHistory,
  classifyTrajectory,
  classifyWeek1Pattern,
  historicVelocitySimulationBoost,
  parseHistoricStatsResponse,
} from "@/lib/songstats/historic-velocity";
import type { HitPotential } from "@/types";

const examplePayload = {
  songstats_track_id: "trk456",
  source: "spotify",
  stats: [
    { date: "2026-04-01", streams: 12000, streams_total: 100000 },
    { date: "2026-04-02", streams: 12500, streams_total: 112500 },
    { date: "2026-04-03", streams: 13000, streams_total: 125500 },
    { date: "2026-04-04", streams: 13200, streams_total: 138700 },
    { date: "2026-04-05", streams: 13500, streams_total: 152200 },
    { date: "2026-04-06", streams: 13800, streams_total: 166000 },
    { date: "2026-04-07", streams: 14200, streams_total: 180200 },
    { date: "2026-04-08", streams: 18000, streams_total: 198200 },
    { date: "2026-04-09", streams: 19500, streams_total: 217700 },
    { date: "2026-04-10", streams: 21000, streams_total: 238700 },
    { date: "2026-04-11", streams: 22500, streams_total: 261200 },
    { date: "2026-04-12", streams: 24000, streams_total: 285200 },
    { date: "2026-04-13", streams: 25500, streams_total: 310700 },
    { date: "2026-04-14", streams: 27000, streams_total: 337700 },
  ],
};

const baseHit: HitPotential = {
  overall: 68,
  confidence: 75,
  verdict: "promising",
  breakdown: {
    beatFit: 70,
    lyricVirality: 65,
    trendAlignment: 55,
    hookStrength: 72,
  },
};

describe("historic velocity parser", () => {
  it("parses Songstats historic_stats example shape", () => {
    const parsed = parseHistoricStatsResponse(examplePayload);
    expect(parsed.available).toBe(true);
    expect(parsed.dataPoints.length).toBeGreaterThanOrEqual(7);
    expect(parsed.avgDailyStreams).toBeGreaterThan(0);
    expect(parsed.primaryPlatform).toBe("spotify");
  });

  it("detects accelerating trajectory when recent week outpaces prior", () => {
    const parsed = parseHistoricStatsResponse(examplePayload);
    expect(parsed.trajectory).toBe("accelerating");
    expect(parsed.recentWeeklyDeltaPct).toBeGreaterThan(0);
  });

  it("classifies week-1 pattern and historic score from time series", () => {
    const points = analyzeVelocityHistory(
      examplePayload.stats.map((s) => ({
        date: s.date,
        streams: s.streams,
        streamsTotal: s.streams_total,
      }))
    );
    expect(points.week1Pattern).toBe("slow-burn");
    expect(points.historicVelocityScore).toBeGreaterThan(50);
  });

  it("flags breakout when early-week growth exceeds 40%", () => {
    const breakout = analyzeVelocityHistory([
      { date: "2026-05-01", streams: 5000 },
      { date: "2026-05-02", streams: 5200 },
      { date: "2026-05-03", streams: 5400 },
      { date: "2026-05-04", streams: 9000 },
      { date: "2026-05-05", streams: 11000 },
      { date: "2026-05-06", streams: 13000 },
      { date: "2026-05-07", streams: 15000 },
    ]);
    expect(breakout.week1Pattern).toBe("breakout");
  });
});

describe("historic velocity scoring helpers", () => {
  it("classifies trajectory ratios", () => {
    expect(classifyTrajectory(120, 100)).toBe("accelerating");
    expect(classifyTrajectory(90, 100)).toBe("decelerating");
    expect(classifyTrajectory(102, 100)).toBe("stable");
  });

  it("classifies week-1 patterns", () => {
    expect(classifyWeek1Pattern(45)).toBe("breakout");
    expect(classifyWeek1Pattern(20)).toBe("steady");
    expect(classifyWeek1Pattern(5)).toBe("slow-burn");
    expect(classifyWeek1Pattern(0)).toBe("flat");
  });

  it("boosts trend alignment for accelerating history", () => {
    const history = parseHistoricStatsResponse(examplePayload);
    const adjusted = adjustHitPotentialWithHistoricVelocity(baseHit, history);
    expect(adjusted.breakdown.trendAlignment).toBeGreaterThan(baseHit.breakdown.trendAlignment);
  });

  it("gives accelerating trajectory the highest simulation boost", () => {
    const accelerating = historicVelocitySimulationBoost({
      available: true,
      status: "ok",
      trajectory: "accelerating",
      historicVelocityScore: 72,
      dataPoints: [],
    });
    const decelerating = historicVelocitySimulationBoost({
      available: true,
      status: "ok",
      trajectory: "decelerating",
      historicVelocityScore: 40,
      dataPoints: [],
    });
    expect(accelerating).toBeGreaterThan(decelerating);
  });
});