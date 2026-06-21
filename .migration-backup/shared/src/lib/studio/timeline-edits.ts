import type {
  TimelineEdits,
  TimelineLaneId,
  TimelineSectionEdit,
  TimelineSectionId,
} from "@/types/viral";

export interface SectionLayout {
  id: TimelineSectionId;
  label: string;
  startPercent: number;
  widthPercent: number;
}

export function applyTimelineEdits(
  sections: SectionLayout[],
  edits?: TimelineEdits
): SectionLayout[] {
  if (!edits?.sections.length) return sections;

  const editMap = new Map(edits.sections.map((e) => [e.sectionId, e]));
  const merged = sections.map((section) => {
    const edit = editMap.get(section.id);
    if (!edit) return section;
    return {
      ...section,
      startPercent: clampPercent(edit.startPercent),
      widthPercent: clampPercent(edit.widthPercent, 3, 70),
    };
  });

  return normalizeSections(merged);
}

export function clampPercent(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value * 10) / 10));
}

/** Keep sections contiguous and within 0–100%. */
export function normalizeSections(sections: SectionLayout[]): SectionLayout[] {
  let cursor = 0;
  const out: SectionLayout[] = [];

  for (const section of sections) {
    const start = Math.max(cursor, clampPercent(section.startPercent));
    const maxWidth = 100 - start;
    const width = clampPercent(section.widthPercent, 3, maxWidth);
    out.push({ ...section, startPercent: start, widthPercent: width });
    cursor = start + width;
  }

  const last = out[out.length - 1];
  if (last && last.startPercent + last.widthPercent > 100) {
    last.widthPercent = clampPercent(100 - last.startPercent, 3, 100);
  }

  return out;
}

export function layoutsToEdits(sections: SectionLayout[]): TimelineEdits {
  return createTimelineEdits(
    sections.map((s) => ({
      sectionId: s.id,
      startPercent: s.startPercent,
      widthPercent: s.widthPercent,
    }))
  );
}

export function createTimelineEdits(
  sections: TimelineSectionEdit[],
  extra?: Partial<TimelineEdits>
): TimelineEdits {
  return {
    sections,
    playheadPercent: extra?.playheadPercent,
    laneStates: extra?.laneStates,
    markers: extra?.markers,
    loopRegion: extra?.loopRegion,
    automation: extra?.automation,
    preferredVoiceId: extra?.preferredVoiceId,
    updatedAt: new Date().toISOString(),
  };
}

export function resizeSectionEdge(
  sections: SectionLayout[],
  sectionId: TimelineSectionId,
  edge: "start" | "end",
  percent: number
): SectionLayout[] {
  const idx = sections.findIndex((s) => s.id === sectionId);
  if (idx < 0) return sections;

  const next = sections.map((s) => ({ ...s }));
  const current = next[idx]!;
  const p = clampPercent(percent);

  if (edge === "start") {
    const prev = next[idx - 1];
    const minStart = prev ? prev.startPercent + 3 : 0;
    const maxStart = current.startPercent + current.widthPercent - 3;
    const newStart = clampPercent(p, minStart, maxStart);
    const delta = newStart - current.startPercent;
    current.startPercent = newStart;
    current.widthPercent = clampPercent(current.widthPercent - delta, 3, 70);
    if (prev) {
      prev.widthPercent = clampPercent(prev.widthPercent + delta, 3, 70);
    }
  } else {
    const nextSec = next[idx + 1];
    const minEnd = current.startPercent + 3;
    const maxEnd = nextSec
      ? nextSec.startPercent + nextSec.widthPercent
      : 100;
    const newEnd = clampPercent(p, minEnd, maxEnd);
    const delta = newEnd - (current.startPercent + current.widthPercent);
    current.widthPercent = clampPercent(current.widthPercent + delta, 3, 70);
    if (nextSec) {
      nextSec.startPercent = clampPercent(nextSec.startPercent + delta, 0, 100);
      nextSec.widthPercent = clampPercent(nextSec.widthPercent - delta, 3, 70);
    }
  }

  return normalizeSections(next);
}

export function nextSplitSectionId(
  hostId: TimelineSectionId,
  sections: SectionLayout[]
): TimelineSectionId {
  const prefix = `${hostId}-split`;
  if (!sections.some((s) => s.id === prefix || String(s.id).startsWith(`${prefix}-`))) {
    return prefix as TimelineSectionId;
  }
  let n = 2;
  while (sections.some((s) => s.id === `${prefix}-${n}`)) n++;
  return `${prefix}-${n}` as TimelineSectionId;
}

export interface TimelineHistory {
  past: TimelineEdits[];
  present?: TimelineEdits;
  future: TimelineEdits[];
}

export function recordTimelineEdit(
  history: TimelineHistory,
  next: TimelineEdits,
  maxDepth = 24
): TimelineHistory {
  if (!history.present) {
    return { past: [], present: next, future: [] };
  }
  return {
    past: [...history.past.slice(-(maxDepth - 1)), history.present],
    present: next,
    future: [],
  };
}

export function undoTimelineEdit(history: TimelineHistory): TimelineHistory | null {
  if (!history.present || history.past.length === 0) return null;
  const previous = history.past[history.past.length - 1]!;
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

export function redoTimelineEdit(history: TimelineHistory): TimelineHistory | null {
  if (!history.present || history.future.length === 0) return null;
  const next = history.future[0]!;
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}

export function canUndoTimeline(history: TimelineHistory): boolean {
  return history.past.length > 0;
}

export function canRedoTimeline(history: TimelineHistory): boolean {
  return history.future.length > 0;
}

export function splitSectionAt(
  sections: SectionLayout[],
  playheadPercent: number
): SectionLayout[] | null {
  const p = clampPercent(playheadPercent);
  const hostIdx = sections.findIndex(
    (s) => p > s.startPercent + 1.5 && p < s.startPercent + s.widthPercent - 1.5
  );
  if (hostIdx < 0) return null;

  const host = sections[hostIdx]!;
  const splitId = nextSplitSectionId(host.id, sections);
  const leftWidth = clampPercent(p - host.startPercent, 3, 70);
  const rightWidth = clampPercent(host.widthPercent - leftWidth, 3, 70);

  const left: SectionLayout = {
    ...host,
    widthPercent: leftWidth,
  };
  const right: SectionLayout = {
    id: splitId,
    label: `${host.label}′`,
    startPercent: host.startPercent + leftWidth,
    widthPercent: rightWidth,
  };

  const next = [...sections];
  next.splice(hostIdx, 1, left, right);
  return normalizeSections(next);
}

export function setPlayheadEdit(
  edits: TimelineEdits | undefined,
  playheadPercent: number
): TimelineEdits {
  return {
    ...(edits ?? { sections: [], updatedAt: new Date().toISOString() }),
    sections: edits?.sections ?? [],
    playheadPercent: clampPercent(playheadPercent, 0, 100),
    laneStates: edits?.laneStates,
    updatedAt: new Date().toISOString(),
  };
}

export function toggleLaneMute(
  edits: TimelineEdits | undefined,
  laneId: TimelineLaneId,
  muted: boolean
): TimelineEdits {
  const lanes = [...(edits?.laneStates ?? [])];
  const idx = lanes.findIndex((l) => l.laneId === laneId);
  if (idx >= 0) lanes[idx] = { ...lanes[idx]!, muted, solo: muted ? false : lanes[idx]!.solo };
  else lanes.push({ laneId, muted });
  return {
    sections: edits?.sections ?? [],
    playheadPercent: edits?.playheadPercent,
    laneStates: lanes,
    updatedAt: new Date().toISOString(),
  };
}

export function toggleLaneSolo(
  edits: TimelineEdits | undefined,
  laneId: TimelineLaneId,
  solo: boolean
): TimelineEdits {
  const lanes = [...(edits?.laneStates ?? [])];
  const idx = lanes.findIndex((l) => l.laneId === laneId);
  if (idx >= 0) lanes[idx] = { ...lanes[idx]!, solo, muted: solo ? false : lanes[idx]!.muted };
  else lanes.push({ laneId, solo });
  return {
    sections: edits?.sections ?? [],
    playheadPercent: edits?.playheadPercent,
    laneStates: lanes,
    updatedAt: new Date().toISOString(),
  };
}

export function trimSectionEdit(
  edits: TimelineEdits | undefined,
  sectionId: TimelineSectionId,
  widthPercent: number,
  startPercent?: number
): TimelineEdits {
  const existing = edits?.sections ?? [];
  const next = existing.filter((e) => e.sectionId !== sectionId);
  next.push({
    sectionId,
    startPercent:
      startPercent ??
      existing.find((e) => e.sectionId === sectionId)?.startPercent ??
      0,
    widthPercent: clampPercent(widthPercent, 3, 70),
  });
  return createTimelineEdits(next, {
    playheadPercent: edits?.playheadPercent,
    laneStates: edits?.laneStates,
  });
}

/** Add or update a marker at a specific time percent (production NLE cue/marker) */
export function addOrUpdateMarker(
  edits: TimelineEdits | undefined,
  timePercent: number,
  label?: string
): TimelineEdits {
  const markers = [...(edits?.markers ?? [])];
  const existingIdx = markers.findIndex((m) => Math.abs(m.timePercent - timePercent) < 0.5);
  const newMarker = { timePercent: clampPercent(timePercent), label };
  if (existingIdx >= 0) {
    markers[existingIdx] = newMarker;
  } else {
    markers.push(newMarker);
    markers.sort((a, b) => a.timePercent - b.timePercent);
  }
  return {
    ...(edits ?? { sections: [], updatedAt: new Date().toISOString() }),
    sections: edits?.sections ?? [],
    markers,
    loopRegion: edits?.loopRegion,
    updatedAt: new Date().toISOString(),
  };
}

export function removeMarker(edits: TimelineEdits | undefined, timePercent: number): TimelineEdits {
  const markers = (edits?.markers ?? []).filter((m) => Math.abs(m.timePercent - timePercent) > 0.5);
  return {
    ...(edits ?? { sections: [], updatedAt: new Date().toISOString() }),
    sections: edits?.sections ?? [],
    markers,
    loopRegion: edits?.loopRegion,
    updatedAt: new Date().toISOString(),
  };
}

export function setLoopRegion(
  edits: TimelineEdits | undefined,
  startPercent: number,
  endPercent: number
): TimelineEdits {
  return {
    ...(edits ?? { sections: [], updatedAt: new Date().toISOString() }),
    sections: edits?.sections ?? [],
    markers: edits?.markers,
    loopRegion: {
      startPercent: clampPercent(startPercent),
      endPercent: clampPercent(endPercent),
    },
    updatedAt: new Date().toISOString(),
  };
}

/** Move a whole section by delta percent (for horizontal drag in NLE). */
export function moveSection(
  sections: SectionLayout[],
  sectionId: TimelineSectionId,
  deltaPercent: number
): SectionLayout[] {
  const idx = sections.findIndex((s) => s.id === sectionId);
  if (idx < 0) return sections;

  const next = sections.map((s) => ({ ...s }));
  const target = next[idx]!;

  let newStart = clampPercent(target.startPercent + deltaPercent);
  const width = target.widthPercent;

  // Prevent overlap with previous
  const prev = idx > 0 ? next[idx - 1] : null;
  if (prev) {
    newStart = Math.max(newStart, prev.startPercent + prev.widthPercent);
  }

  // Prevent overlap with next
  const nxt = idx < next.length - 1 ? next[idx + 1] : null;
  const maxStart = nxt ? nxt.startPercent - width : 100 - width;
  newStart = Math.min(newStart, maxStart);

  const actualDelta = newStart - target.startPercent;
  target.startPercent = newStart;

  // Shift the following section(s) by the same delta to keep contiguous
  for (let i = idx + 1; i < next.length; i++) {
    next[i]!.startPercent = clampPercent(next[i]!.startPercent + actualDelta);
  }

  return normalizeSections(next);
}