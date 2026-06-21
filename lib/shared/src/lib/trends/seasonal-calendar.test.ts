import { describe, expect, it } from "vitest";
import { evaluateSeasonalContext } from "@/lib/trends/seasonal-calendar";

describe("seasonal calendar", () => {
  it("detects summer festival window in July", () => {
    const ctx = evaluateSeasonalContext({
      genre: "Dance Pop",
      now: new Date("2026-07-10T12:00:00.000Z"),
    });
    expect(ctx.activeMoments.some((m) => m.toLowerCase().includes("summer"))).toBe(true);
    expect(ctx.seasonalKeywords).toContain("summer");
    expect(ctx.alignmentScore).toBeGreaterThan(50);
  });

  it("boosts alignment when release date fits valentine genre", () => {
    const ctx = evaluateSeasonalContext({
      genre: "Pop",
      releaseDate: "2026-02-10",
      lyricsThemes: ["love"],
    });
    expect(ctx.releaseWindow).not.toBe("weak");
    expect(ctx.timingBoost).toBeGreaterThan(0);
  });
});