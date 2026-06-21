import { describe, expect, it } from "vitest";
import { computeStemBalanceScore } from "@/lib/studio/stem-balance";
import { DEFAULT_STEMS } from "@/types/studio";

describe("computeStemBalanceScore", () => {
  it("returns high score for balanced default stems", () => {
    expect(computeStemBalanceScore(DEFAULT_STEMS)).toBeGreaterThanOrEqual(65);
  });

  it("returns zero when all stems are muted", () => {
    const muted = DEFAULT_STEMS.map((s) => ({ ...s, muted: true }));
    expect(computeStemBalanceScore(muted)).toBe(0);
  });

  it("penalizes very quiet vocals", () => {
    const quietVocals = DEFAULT_STEMS.map((s) =>
      s.id === "vocals" ? { ...s, volume: 0.1 } : s
    );
    expect(computeStemBalanceScore(quietVocals)).toBeLessThan(
      computeStemBalanceScore(DEFAULT_STEMS)
    );
  });
});