import type { TrackAnalysis } from "@/types";
import type { StudioProject } from "@/types/studio";
import type {
  MusicTimeline,
  TimelineClip,
  TimelineLane,
  TimelineLaneId,
  TimelineSectionId,
  ViralGap,
} from "@/types/viral";
import { resolveStudioDuration } from "@/lib/scoring/audio-signals";
import { buildVersionSnapshot } from "@/lib/domain/version-snapshot";
import { applyTimelineEdits } from "@/lib/studio/timeline-edits";
import type { TimelineEdits } from "@/types/viral";

interface SectionLayout {
  id: TimelineSectionId;
  label: string;
  startPercent: number;
  widthPercent: number;
}

const LANE_DEFS: Array<{ id: TimelineLaneId; label: string }> = [
  { id: "lyrics", label: "Lyrics" },
  { id: "vocals", label: "Vocals" },
  { id: "drums", label: "Drums" },
  { id: "bass", label: "Bass" },
  { id: "other", label: "Other" },
  { id: "mix", label: "Mix" },
];

function avgEnergy(waveform: number[], startIdx: number, endIdx: number): number {
  if (endIdx <= startIdx) return 0;
  let sum = 0;
  for (let i = startIdx; i < endIdx; i++) sum += waveform[i] ?? 0;
  return sum / (endIdx - startIdx);
}

/** Derive section boundaries from waveform energy when demo audio exists. */
export function sectionsFromWaveform(
  waveform: number[],
  hasBridge: boolean
): SectionLayout[] | null {
  if (waveform.length < 40) return null;

  const len = waveform.length;
  const third = Math.floor(len / 3);
  const e1 = avgEnergy(waveform, 0, Math.floor(len * 0.15));
  const e2 = avgEnergy(waveform, third, third * 2);
  const e3 = avgEnergy(waveform, third * 2, len);
  const peakThird = e2 >= e1 && e2 >= e3 ? 2 : e3 >= e1 ? 3 : 1;

  const introEnd = Math.round(6 + (1 - e1) * 4);
  const chorus1Start = peakThird === 1 ? introEnd + 8 : introEnd + 14;
  const chorus1Width = peakThird === 2 ? 20 : 18;
  const verse2Start = chorus1Start + chorus1Width + 4;
  const chorus2Start = verse2Start + 14;

  if (hasBridge) {
    const bridgeStart = Math.min(chorus2Start + 20, 72);
    return [
      { id: "intro", label: "Intro", startPercent: 0, widthPercent: introEnd },
      { id: "verse1", label: "Verse 1", startPercent: introEnd, widthPercent: chorus1Start - introEnd },
      { id: "chorus1", label: "Chorus", startPercent: chorus1Start, widthPercent: chorus1Width },
      { id: "verse2", label: "Verse 2", startPercent: verse2Start, widthPercent: bridgeStart - verse2Start },
      { id: "chorus2", label: "Chorus", startPercent: bridgeStart - 18, widthPercent: 16 },
      { id: "bridge", label: "Bridge", startPercent: bridgeStart, widthPercent: 10 },
      { id: "outro", label: "Outro", startPercent: bridgeStart + 10, widthPercent: 100 - bridgeStart - 10 },
    ];
  }

  const outroStart = Math.min(chorus2Start + 22, 86);
  return [
    { id: "intro", label: "Intro", startPercent: 0, widthPercent: introEnd },
    { id: "verse1", label: "Verse 1", startPercent: introEnd, widthPercent: chorus1Start - introEnd },
    { id: "chorus1", label: "Chorus", startPercent: chorus1Start, widthPercent: chorus1Width },
    { id: "verse2", label: "Verse 2", startPercent: verse2Start, widthPercent: chorus2Start - verse2Start },
    { id: "chorus2", label: "Chorus", startPercent: chorus2Start, widthPercent: outroStart - chorus2Start },
    { id: "outro", label: "Outro", startPercent: outroStart, widthPercent: 100 - outroStart },
  ];
}

function defaultSections(hasBridge: boolean): SectionLayout[] {
  if (hasBridge) {
    return [
      { id: "intro", label: "Intro", startPercent: 0, widthPercent: 8 },
      { id: "verse1", label: "Verse 1", startPercent: 8, widthPercent: 14 },
      { id: "chorus1", label: "Chorus", startPercent: 22, widthPercent: 16 },
      { id: "verse2", label: "Verse 2", startPercent: 38, widthPercent: 14 },
      { id: "chorus2", label: "Chorus", startPercent: 52, widthPercent: 16 },
      { id: "bridge", label: "Bridge", startPercent: 68, widthPercent: 12 },
      { id: "outro", label: "Outro", startPercent: 80, widthPercent: 20 },
    ];
  }

  return [
    { id: "intro", label: "Intro", startPercent: 0, widthPercent: 10 },
    { id: "verse1", label: "Verse 1", startPercent: 10, widthPercent: 18 },
    { id: "chorus1", label: "Chorus", startPercent: 28, widthPercent: 20 },
    { id: "verse2", label: "Verse 2", startPercent: 48, widthPercent: 16 },
    { id: "chorus2", label: "Chorus", startPercent: 64, widthPercent: 22 },
    { id: "outro", label: "Outro", startPercent: 86, widthPercent: 14 },
  ];
}

function gapForSection(
  sectionId: TimelineSectionId,
  gaps: ViralGap[]
): ViralGap | undefined {
  const focusMap: Partial<Record<TimelineSectionId, string[]>> = {
    intro: ["intro", "hook", "upload"],
    chorus1: ["chorus", "hook", "structure"],
    chorus2: ["chorus", "hook"],
    verse1: ["verse1", "lyrics"],
    verse2: ["verse2"],
    bridge: ["structure", "bridge"],
    outro: ["outro", "bpm"],
  };

  const focuses = focusMap[sectionId] ?? [];
  return gaps.find(
    (g) => g.focus && focuses.includes(g.focus)
  );
}

function studioTabForLane(laneId: TimelineLaneId): TimelineClip["studioTab"] {
  if (laneId === "lyrics") return "write";
  if (laneId === "mix") return "produce";
  return "produce";
}

function focusForLane(
  laneId: TimelineLaneId,
  sectionId: TimelineSectionId
): string | undefined {
  if (laneId === "lyrics") {
    if (sectionId.startsWith("chorus")) return "chorus";
    if (sectionId === "verse1") return "verse1";
    if (sectionId === "verse2") return "verse2";
    if (sectionId === "bridge") return "bridge";
    return "structure";
  }
  if (laneId === "vocals") return sectionId.startsWith("chorus") ? "chorus" : "vocals";
  if (laneId === "drums" || laneId === "bass") return "stems";
  if (laneId === "mix") return "bpm";
  return undefined;
}

function buildLaneClips(
  laneId: TimelineLaneId,
  sections: SectionLayout[],
  gaps: ViralGap[]
): TimelineClip[] {
  return sections.map((section) => {
    const gap = gapForSection(section.id, gaps);
    const hasGap =
      Boolean(gap) &&
      (laneId === "lyrics" ||
        laneId === "vocals" ||
        (laneId === "drums" && gap?.focus === "intro") ||
        (laneId === "mix" && gap?.category === "audio"));

    return {
      id: `${laneId}-${section.id}`,
      laneId,
      sectionId: section.id,
      label: section.label,
      startPercent: section.startPercent,
      widthPercent: section.widthPercent,
      hasGap,
      gapReason: hasGap ? gap?.title : undefined,
      studioTab: studioTabForLane(laneId),
      focus: focusForLane(laneId, section.id),
    };
  });
}

export function buildMusicTimeline(
  project: StudioProject,
  analysis: TrackAnalysis,
  gaps: ViralGap[],
  timelineEdits?: TimelineEdits
): MusicTimeline {
  const snapshot = buildVersionSnapshot(project);
  const audio = snapshot?.audio;
  const version =
    project.versions.find((v) => v.id === project.activeVersionId) ??
    project.versions[0];

  const durationSec = resolveStudioDuration(
    audio,
    project.bpmTarget,
    analysis.track.duration
  );
  const hasBridge = Boolean(version?.lyrics.bridge.trim());
  const baseSections =
    sectionsFromWaveform(audio?.waveform ?? [], hasBridge) ??
    defaultSections(hasBridge);
  const sections = applyTimelineEdits(baseSections, timelineEdits);

  const lanes: TimelineLane[] = LANE_DEFS.map((lane) => ({
    id: lane.id,
    label: lane.label,
    clips: buildLaneClips(lane.id, sections, gaps),
  }));

  const gapCount = lanes.reduce(
    (sum, lane) => sum + lane.clips.filter((c) => c.hasGap).length,
    0
  );

  const hookRetention = analysis.simulation.curve[2]?.plays ?? 0;
  const simulatedPlayhead = Math.min(
    95,
    Math.max(8, Math.round((hookRetention / 1_000_000) * 100) || 35)
  );
  const playheadPercent = timelineEdits?.playheadPercent ?? simulatedPlayhead;

  return {
    durationSec,
    bpm: analysis.energy.bpm,
    lanes,
    playheadPercent,
    gapCount,
  };
}

export function studioDeepLink(
  projectId: string,
  tab: TimelineClip["studioTab"],
  focus?: string
): string {
  const base = `/studio/${projectId}/${tab}`;
  if (!focus) return base;
  return `${base}?focus=${encodeURIComponent(focus)}`;
}