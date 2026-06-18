import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTimelineEdits } from "@/lib/studio/timeline-edits";
import {
  loadTimelineHistory,
  resolveTimelineHistory,
  saveTimelineHistory,
  timelineHistoryKey,
} from "@/lib/studio/timeline-history-persist";

const memory = new Map<string, string>();

vi.stubGlobal("window", {
  localStorage: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
  },
});

describe("timeline-history-persist", () => {
  beforeEach(() => {
    memory.clear();
  });

  it("saves and loads undo stack for project version", () => {
    const history = {
      past: [createTimelineEdits([], { playheadPercent: 10 })],
      present: createTimelineEdits([], { playheadPercent: 25 }),
      future: [],
    };
    saveTimelineHistory("p1", "v1", history);
    expect(loadTimelineHistory("p1", "v1")).toEqual(history);
    expect(memory.has(timelineHistoryKey("p1", "v1"))).toBe(true);
  });

  it("resolveTimelineHistory seeds from current edits when empty", () => {
    const edits = createTimelineEdits([], { playheadPercent: 42 });
    const resolved = resolveTimelineHistory("p1", "v1", edits);
    expect(resolved.present).toEqual(edits);
    expect(resolved.past).toHaveLength(0);
  });
});