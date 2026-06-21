import { describe, expect, it } from "vitest";
import {
  applyTimelineEdits,
  clampPercent,
  createTimelineEdits,
  layoutsToEdits,
  normalizeSections,
  resizeSectionEdge,
  setPlayheadEdit,
  splitSectionAt,
  nextSplitSectionId,
  recordTimelineEdit,
  undoTimelineEdit,
  redoTimelineEdit,
  toggleLaneMute,
  toggleLaneSolo,
  type SectionLayout,
} from "@/lib/studio/timeline-edits";

const baseSections: SectionLayout[] = [
  { id: "intro", label: "Intro", startPercent: 0, widthPercent: 10 },
  { id: "verse1", label: "Verse 1", startPercent: 10, widthPercent: 18 },
  { id: "chorus1", label: "Chorus", startPercent: 28, widthPercent: 20 },
  { id: "verse2", label: "Verse 2", startPercent: 48, widthPercent: 16 },
  { id: "chorus2", label: "Chorus", startPercent: 64, widthPercent: 22 },
  { id: "outro", label: "Outro", startPercent: 86, widthPercent: 14 },
];

describe("timeline-edits", () => {
  it("clampPercent rounds to one decimal", () => {
    expect(clampPercent(33.333)).toBe(33.3);
    expect(clampPercent(150, 0, 100)).toBe(100);
  });

  it("normalizeSections keeps sections contiguous", () => {
    const messy: SectionLayout[] = [
      { id: "intro", label: "Intro", startPercent: 0, widthPercent: 12 },
      { id: "verse1", label: "Verse 1", startPercent: 15, widthPercent: 20 },
      { id: "chorus1", label: "Chorus", startPercent: 40, widthPercent: 60 },
    ];
    const out = normalizeSections(messy);
    expect(out[0]!.startPercent).toBe(0);
    for (let i = 1; i < out.length; i++) {
      expect(out[i]!.startPercent).toBeGreaterThanOrEqual(
        out[i - 1]!.startPercent + out[i - 1]!.widthPercent - 0.1
      );
    }
    const last = out[out.length - 1]!;
    expect(last.startPercent + last.widthPercent).toBeLessThanOrEqual(100);
  });

  it("applyTimelineEdits merges stored section overrides", () => {
    const edits = createTimelineEdits([
      { sectionId: "intro", startPercent: 0, widthPercent: 6 },
      { sectionId: "outro", startPercent: 90, widthPercent: 10 },
    ]);
    const out = applyTimelineEdits(baseSections, edits);
    expect(out.find((s) => s.id === "intro")!.widthPercent).toBe(6);
  });

  it("resizeSectionEdge ripples adjacent section on end drag", () => {
    const resized = resizeSectionEdge(baseSections, "chorus1", "end", 50);
    const chorus = resized.find((s) => s.id === "chorus1")!;
    const verse2 = resized.find((s) => s.id === "verse2")!;
    expect(chorus.startPercent + chorus.widthPercent).toBeCloseTo(
      verse2.startPercent,
      0
    );
  });

  it("splitSectionAt divides a section at playhead", () => {
    const split = splitSectionAt(baseSections, 38);
    expect(split).not.toBeNull();
    expect(split!.length).toBe(baseSections.length + 1);
    expect(split!.some((s) => String(s.id).includes("split"))).toBe(true);
  });

  it("splitSectionAt returns null when playhead is on edge", () => {
    expect(splitSectionAt(baseSections, 28)).toBeNull();
    expect(splitSectionAt(baseSections, 48)).toBeNull();
  });

  it("setPlayheadEdit preserves sections and lane state", () => {
    const base = createTimelineEdits([], {
      playheadPercent: 20,
      laneStates: [{ laneId: "vocals", muted: true }],
    });
    const next = setPlayheadEdit(base, 55);
    expect(next.playheadPercent).toBe(55);
    expect(next.laneStates?.[0]?.muted).toBe(true);
  });

  it("toggleLaneMute and toggleLaneSolo update laneStates", () => {
    const muted = toggleLaneMute(undefined, "drums", true);
    expect(muted.laneStates?.[0]).toMatchObject({ laneId: "drums", muted: true });

    const solo = toggleLaneSolo(muted, "vocals", true);
    expect(solo.laneStates?.find((l) => l.laneId === "vocals")?.solo).toBe(true);
  });

  it("layoutsToEdits round-trips section layouts", () => {
    const edits = layoutsToEdits(baseSections);
    expect(edits.sections).toHaveLength(baseSections.length);
    expect(edits.sections[0]!.sectionId).toBe("intro");
    expect(edits.updatedAt).toBeTruthy();
  });

  it("nextSplitSectionId increments when splits already exist", () => {
    const withSplit: SectionLayout[] = [
      ...baseSections,
      { id: "chorus1-split", label: "Chorus′", startPercent: 40, widthPercent: 8 },
    ];
    expect(nextSplitSectionId("chorus1", withSplit)).toBe("chorus1-split-2");
  });

  it("timeline undo/redo restores prior edits", () => {
    const a = createTimelineEdits([], { playheadPercent: 10 });
    const b = createTimelineEdits([], { playheadPercent: 40 });
    let history = recordTimelineEdit({ past: [], future: [] }, a);
    history = recordTimelineEdit(history, b);
    const undone = undoTimelineEdit(history);
    expect(undone?.present?.playheadPercent).toBe(10);
    const redone = redoTimelineEdit(undone!);
    expect(redone?.present?.playheadPercent).toBe(40);
  });
});