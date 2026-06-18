import { describe, expect, it } from "vitest";
import {
  bpmSweetSpotModifier,
  beatDropSweetSpotModifier,
  computeEnergyBuildupScore,
  detectBeatDrop,
  lateHookPullPenalty,
  resolveEarlySkipSec,
  resolveHookArrivalSec,
} from "@/lib/viral/audio-signals";

describe("viral audio-signals", () => {
  it("prefers richsync hook window over duration heuristic", () => {
    expect(resolveHookArrivalSec(22, 180)).toBe(22);
    expect(resolveHookArrivalSec(undefined, 180)).toBe(14);
  });

  it("scores BPM sweet spot 120–140 highest", () => {
    expect(bpmSweetSpotModifier(128)).toBeGreaterThan(bpmSweetSpotModifier(90));
    expect(bpmSweetSpotModifier(130)).toBe(0.08);
  });

  it("penalizes late hooks after 15s", () => {
    expect(lateHookPullPenalty(12)).toBe(0);
    expect(lateHookPullPenalty(35)).toBeGreaterThan(lateHookPullPenalty(20));
  });

  it("detects rising waveform into hook window", () => {
    const rising = Array.from({ length: 40 }, (_, i) => 0.2 + i * 0.015);
    const flat = Array.from({ length: 40 }, () => 0.4);
    const risingScore = computeEnergyBuildupScore(
      { waveform: rising, energyDynamics: "increasing" },
      15,
      180
    );
    const flatScore = computeEnergyBuildupScore(
      { waveform: flat, energyDynamics: "static" },
      15,
      180
    );
    expect(risingScore).toBeGreaterThan(flatScore);
  });

  it("caps early skip window for TikTok", () => {
    expect(resolveEarlySkipSec(180)).toBeLessThanOrEqual(15);
    expect(resolveEarlySkipSec(60)).toBeGreaterThanOrEqual(6);
  });

  it("detects beat drop spike in sweet-spot window", () => {
    const waveform = Array.from({ length: 80 }, (_, i) => {
      if (i < 20) return 0.25;
      if (i === 24) return 0.95;
      return 0.35;
    });
    const drop = detectBeatDrop(waveform, 180);
    expect(drop.beatDropSec).not.toBeNull();
    expect(drop.inSweetSpot || (drop.beatDropSec! >= 10 && drop.beatDropSec! <= 45)).toBe(true);
    expect(beatDropSweetSpotModifier(drop.beatDropSec ?? undefined, drop.beatDropScore)).toBeGreaterThan(
      beatDropSweetSpotModifier(42, 50)
    );
  });
});