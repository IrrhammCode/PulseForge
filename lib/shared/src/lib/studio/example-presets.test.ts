import { describe, expect, it } from "vitest";
import {
  buildExampleApplyPatch,
  buildExampleCreateInput,
  LATE_SPRING_BALLAD_EXAMPLE,
  NORTHBOUND_LONGING_EXAMPLE,
  SOFT_ROCK_HOLLOW_EXAMPLE,
  BRIGHT_NOSTALGIA_EXAMPLE,
  DREAM_POP_INTIMACY_EXAMPLE,
  ALT_RNB_COOL_EXAMPLE,
  ART_ROCK_OBSERVER_EXAMPLE,
  STUDIO_EXAMPLE_PRESETS,
} from "@/lib/studio/example-presets";

describe("example-presets", () => {
  it("late spring example has full lyrics and arrangement", () => {
    const { lyrics, project } = LATE_SPRING_BALLAD_EXAMPLE;
    expect(lyrics.chorus.trim().length).toBeGreaterThan(20);
    expect(project.musicArrangement?.vocal?.voiceType).toBe("female");
    expect(project.creativeBrief?.story?.length).toBeGreaterThan(40);
  });

  it("buildExampleApplyPatch resolves genre and mood labels", () => {
    const patch = buildExampleApplyPatch(LATE_SPRING_BALLAD_EXAMPLE);
    expect(patch.genre).toContain("Indie Pop");
    expect(patch.mood).toContain("Melancholic");
    expect(patch.bpmTarget).toBe(82);
  });

  it("buildExampleCreateInput embeds preset lyrics for v1", () => {
    const input = buildExampleCreateInput(LATE_SPRING_BALLAD_EXAMPLE);
    expect(input.initialLyrics?.chorus).toContain("Hold this spring");
    expect((input as { lyrics?: unknown }).lyrics).toBeUndefined();
  });

  it("presets have distinct lyrics", () => {
    const spring = LATE_SPRING_BALLAD_EXAMPLE.lyrics;
    const indie = NORTHBOUND_LONGING_EXAMPLE.lyrics;
    const hollow = SOFT_ROCK_HOLLOW_EXAMPLE.lyrics;
    const bright = BRIGHT_NOSTALGIA_EXAMPLE.lyrics;
    const dream = DREAM_POP_INTIMACY_EXAMPLE.lyrics;
    const rnb = ALT_RNB_COOL_EXAMPLE.lyrics;
    const observer = ART_ROCK_OBSERVER_EXAMPLE.lyrics;
    expect(spring.intro).not.toBe(indie.intro);
    expect(spring.chorus).not.toBe(indie.chorus);
    expect(hollow.chorus).not.toBe(spring.chorus);
    expect(hollow.chorus).not.toBe(indie.chorus);
    expect(bright.chorus).not.toBe(spring.chorus);
    expect(bright.chorus).not.toBe(hollow.chorus);
    expect(dream.chorus).not.toBe(bright.chorus);
    expect(rnb.chorus).not.toBe(dream.chorus);
    expect(observer.chorus).not.toBe(rnb.chorus);
    expect(spring.verse1).toContain("spring");
    expect(indie.chorus).toContain("fall apart");
    expect(hollow.chorus).toContain("rust");
    expect(bright.chorus).toContain("not like before");
    expect(dream.chorus).toContain("stay today");
    expect(rnb.chorus).toContain("don't need");
    expect(observer.chorus).toContain("pattern");
  });

  it("northbound example is 505-style indie rock return preset", () => {
    const patch = buildExampleApplyPatch(NORTHBOUND_LONGING_EXAMPLE);
    expect(patch.title).toBe("Corridor at Closing");
    expect(patch.genre).toContain("Rock");
    expect(patch.genreCustom).toContain("alternative");
    expect(patch.moodCustom).toBe("obsessive longing");
    expect(patch.musicArrangement?.vocal?.voiceType).toBe("male");
    expect(patch.musicArrangement?.vocal?.delivery).toBe("conversational");
    expect(patch.musicArrangement?.instruments).not.toContain("Piano");
    expect(patch.bpmTarget).toBe(104);
    const input = buildExampleCreateInput(NORTHBOUND_LONGING_EXAMPLE);
    expect(input.initialLyrics?.chorus).toContain("fall apart");
    expect(LATE_SPRING_BALLAD_EXAMPLE.lyrics.chorus).not.toContain("fall apart");
  });

  it("soft rock hollow example is 70s folk-rock preset", () => {
    const patch = buildExampleApplyPatch(SOFT_ROCK_HOLLOW_EXAMPLE);
    expect(patch.title).toBe("Rust and Roadmaps");
    expect(patch.genreCustom).toContain("soft rock");
    expect(patch.moodCustom).toBe("wistful loneliness");
    expect(patch.musicArrangement?.vocal?.delivery).toBe("soulful");
    expect(patch.musicArrangement?.instruments).toContain("Acoustic guitar");
    expect(patch.bpmTarget).toBe(86);
    const input = buildExampleCreateInput(SOFT_ROCK_HOLLOW_EXAMPLE);
    expect(input.initialLyrics?.chorus).toContain("rust");
  });

  it("exports seven fill examples", () => {
    expect(STUDIO_EXAMPLE_PRESETS).toHaveLength(7);
    expect(STUDIO_EXAMPLE_PRESETS.map((preset) => preset.id)).toEqual([
      "late-spring-ballad",
      "northbound-longing",
      "soft-rock-hollow",
      "bright-nostalgia",
      "dream-pop-intimacy",
      "alt-rnb-cool",
      "art-rock-observer",
    ]);
  });

  it("bright nostalgia example is indie synthpop preset", () => {
    const patch = buildExampleApplyPatch(BRIGHT_NOSTALGIA_EXAMPLE);
    expect(patch.title).toBe("Polaroid Summer");
    expect(patch.genre).toContain("Indie Pop");
    expect(patch.genreCustom).toContain("synthpop");
    expect(patch.moodCustom).toBe("bittersweet nostalgia");
    expect(patch.musicArrangement?.instruments).toContain("Synth");
    expect(patch.bpmTarget).toBe(174);
    const input = buildExampleCreateInput(BRIGHT_NOSTALGIA_EXAMPLE);
    expect(input.initialLyrics?.chorus).toContain("crooked smile");
  });

  it("dream pop intimacy example is slow reverb romance preset", () => {
    const patch = buildExampleApplyPatch(DREAM_POP_INTIMACY_EXAMPLE);
    expect(patch.title).toBe("Slow Cinema");
    expect(patch.genreCustom).toContain("dream pop");
    expect(patch.moodCustom).toBe("ethereal intimacy");
    expect(patch.musicArrangement?.vocal?.delivery).toBe("intimate");
    expect(patch.bpmTarget).toBe(68);
    const input = buildExampleCreateInput(DREAM_POP_INTIMACY_EXAMPLE);
    expect(input.initialLyrics?.chorus).toContain("stay today");
    expect(input.bpmTarget).toBeLessThan(BRIGHT_NOSTALGIA_EXAMPLE.project.bpmTarget!);
  });

  it("alt rnb cool example is neo-soul groove preset", () => {
    const patch = buildExampleApplyPatch(ALT_RNB_COOL_EXAMPLE);
    expect(patch.title).toBe("On My Terms");
    expect(patch.genre).toContain("R&B");
    expect(patch.genreCustom).toContain("neo-soul");
    expect(patch.moodCustom).toBe("cool detachment");
    expect(patch.musicArrangement?.vocal?.voiceType).toBe("female");
    expect(patch.musicArrangement?.instruments).toContain("Bass");
    expect(patch.bpmTarget).toBe(94);
    const input = buildExampleCreateInput(ALT_RNB_COOL_EXAMPLE);
    expect(input.initialLyrics?.chorus).toContain("don't need");
  });

  it("art rock observer example is 80s surveillance soft-rock preset", () => {
    const patch = buildExampleApplyPatch(ART_ROCK_OBSERVER_EXAMPLE);
    expect(patch.title).toBe("Ceiling Knows");
    expect(patch.genreCustom).toContain("art rock");
    expect(patch.moodCustom).toBe("detached surveillance");
    expect(patch.musicArrangement?.vocal?.voiceType).toBe("male");
    expect(patch.musicArrangement?.musicalKey).toBe("D major");
    expect(patch.bpmTarget).toBe(112);
    const input = buildExampleCreateInput(ART_ROCK_OBSERVER_EXAMPLE);
    expect(input.initialLyrics?.chorus).toContain("pattern");
    expect(input.initialLyrics?.intro).toContain("ceiling");
  });
});
