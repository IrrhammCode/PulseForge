import { describe, expect, it } from "vitest";
import {
  buildGlobalVocalIdentity,
  buildVocalNegativeStyles,
  enrichLyricsWithVocalCues,
} from "@/lib/studio/vocal-direction";

describe("vocal-direction", () => {
  it("includes anti-AI negatives for sung sections", () => {
    const negatives = buildVocalNegativeStyles(undefined, "chorus", false);
    expect(negatives).toContain("robotic vocals");
    expect(negatives).toContain("TTS singing");
  });

  it("builds global vocal identity from brief and profile", () => {
    const styles = buildGlobalVocalIdentity(
      { voiceType: "female", delivery: "intimate" },
      { vocalCharacter: "breathy close-mic" },
      ["Indie Pop"],
      ["Melancholic"]
    );
    expect(styles.some((s) => s.includes("female vocalist"))).toBe(true);
    expect(styles).toContain("breathy close-mic");
  });

  it("adds phonetic ad-libs and inline cues", () => {
    const text = enrichLyricsWithVocalCues(
      "chorus",
      "Line one\nHook line",
      { adLibs: true },
      false
    );
    expect(text).toContain("(yeah)");
    expect(text).toContain("{");
  });
});
