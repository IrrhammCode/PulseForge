import { describe, expect, it } from "vitest";
import { hookLatencyAdjustment, parseRichsyncBody } from "@/lib/musixmatch/richsync-parser";

const SAMPLE = JSON.stringify([
  { ts: 0.5, te: 3.2, x: "Feel the midnight pulse" },
  { ts: 12.0, te: 15.5, x: "Feel the midnight pulse" },
  { ts: 28.0, te: 31.0, x: "Feel the midnight pulse" },
  { ts: 40.0, te: 44.0, x: "We never slow down now" },
]);

describe("parseRichsyncBody", () => {
  it("extracts hook timing and chorus repeats", () => {
    const parsed = parseRichsyncBody(SAMPLE);
    expect(parsed).not.toBeNull();
    expect(parsed!.hookLine).toBe("Feel the midnight pulse");
    expect(parsed!.hookWindowSec).toBe(0.5);
    expect(parsed!.chorusRepeats).toBe(3);
    expect(parsed!.sections.length).toBeGreaterThan(0);
  });

  it("returns null for invalid JSON", () => {
    expect(parseRichsyncBody("not-json")).toBeNull();
  });
});

describe("hookLatencyAdjustment", () => {
  it("rewards early hooks and penalizes late ones", () => {
    expect(hookLatencyAdjustment(10)).toBe(8);
    expect(hookLatencyAdjustment(50)).toBe(-10);
  });
});