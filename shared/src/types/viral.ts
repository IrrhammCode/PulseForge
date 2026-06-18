import type { StudioTab } from "@/types/studio";
import type { HitPotential, ListenerSimulation, TrackAnalysis, WhatIfParams } from "@/types";

export type ListenerArchetype =
  | "gen_z_tiktok"
  | "playlist_curator"
  | "casual_streamer"
  | "superfan"
  | "radio_listener"
  | "workout_dj";

export type ListeningOutcome =
  | "full_listen"
  | "skip_hook"
  | "skip_early"
  | "save"
  | "share"
  | "playlist_add";

export interface ListenerPersona {
  id: number;
  archetype: ListenerArchetype;
  platform: string;
  attentionSpanSec: number;
  genreAffinity: number;
}

export interface PersonaListeningResult {
  personaId: number;
  archetype: ListenerArchetype;
  platform: string;
  outcome: ListeningOutcome;
  listenedSec: number;
  dropAtPercent: number;
}

export interface CrowdFunnelStep {
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface RetentionPoint {
  percent: number;
  retained: number;
  label?: string;
}

export interface CrowdSimulation {
  populationTarget: number;
  sampleSize: number;
  seed: number;
  personas: ListenerPersona[];
  results: PersonaListeningResult[];
  funnel: CrowdFunnelStep[];
  retentionCurve: RetentionPoint[];
  aggregates: {
    fullListenRate: number;
    skipHookRate: number;
    saveRate: number;
    shareRate: number;
    playlistAddRate: number;
    avgListenSec: number;
    viralCoefficient: number;
  };
  scaled: {
    reached: number;
    fullListeners: number;
    savers: number;
    sharers: number;
    playlistAdds: number;
  };
}

export type GapCategory =
  | "lyrics"
  | "hook"
  | "production"
  | "audio"
  | "distribution"
  | "structure";

export type GapSeverity = "critical" | "high" | "medium" | "low";

export interface ViralGap {
  id: string;
  category: GapCategory;
  severity: GapSeverity;
  title: string;
  description: string;
  impactPoints: number;
  studioTab: StudioTab;
  focus?: string;
  metric?: string;
  currentValue?: string;
  targetValue?: string;
}

export type TimelineLaneId =
  | "lyrics"
  | "vocals"
  | "drums"
  | "bass"
  | "other"
  | "mix";

export type KnownTimelineSectionId =
  | "intro"
  | "verse1"
  | "chorus1"
  | "verse2"
  | "chorus2"
  | "bridge"
  | "outro";

/** Base sections plus dynamic NLE splits (e.g. chorus1-split-2). */
export type TimelineSectionId =
  | KnownTimelineSectionId
  | `${KnownTimelineSectionId}-split`
  | `${KnownTimelineSectionId}-split-${number}`;

export interface TimelineClip {
  id: string;
  laneId: TimelineLaneId;
  sectionId: TimelineSectionId;
  label: string;
  startPercent: number;
  widthPercent: number;
  hasGap: boolean;
  gapReason?: string;
  studioTab: StudioTab;
  focus?: string;
}

export interface TimelineLane {
  id: TimelineLaneId;
  label: string;
  clips: TimelineClip[];
}

export interface MusicTimeline {
  durationSec: number;
  bpm: number;
  lanes: TimelineLane[];
  playheadPercent: number;
  gapCount: number;
}

/** User overrides for section boundaries, playhead, and lane mute/solo (NLE edits). */
export interface TimelineSectionEdit {
  sectionId: TimelineSectionId;
  startPercent: number;
  widthPercent: number;
  /** Fade lengths as percent of the clip width (0-50 recommended) - from waveform-playlist style fades */
  fadeInPercent?: number;
  fadeOutPercent?: number;
  /** Per-clip gain (1 = 0dB, 0-2 range) - wajib production NLE feature */
  gain?: number;
  /** Slip offset (content shift inside clip bounds for slip editing) */
  slipOffset?: number;
}

export interface TimelineLaneState {
  laneId: TimelineLaneId;
  muted?: boolean;
  solo?: boolean;
}

export interface TimelineEdits {
  sections: TimelineSectionEdit[];
  playheadPercent?: number;
  laneStates?: TimelineLaneState[];
  /** Markers / cues (time in percent 0-100) - wajib production NLE feature */
  markers?: Array<{ timePercent: number; label?: string }>;
  /** Loop region for playback */
  loopRegion?: { startPercent: number; endPercent: number };
  /** Per-lane automation points for volume/gain (time percent -> value 0-2) */
  automation?: Record<string, Array<{ percent: number; value: number }>>;
  /** Preferred ElevenLabs voice ID for AI vocal synth (persisted per version for Produce NLE) */
  preferredVoiceId?: string;
  /** Per-clip custom audio attachments (e.g. AI-generated vocals attached to specific sections) */
  clipAudios?: Record<string, { attachedAt: string; source?: 'ai' | 'upload' }>;
  updatedAt: string;
}

export interface ViralReadiness {
  score: number;
  verdict: "viral-ready" | "near-viral" | "needs-work" | "early-stage";
  headline: string;
  subline: string;
}

export interface ViralAnalysis {
  projectId: string;
  projectTitle: string;
  versionId: string;
  versionLabel: string;
  readiness: ViralReadiness;
  crowd: CrowdSimulation;
  gaps: ViralGap[];
  timeline: MusicTimeline;
  monteCarlo: ListenerSimulation;
  trackAnalysis: TrackAnalysis;
  analyzedAt: string;
}

/** Persisted on ProjectVersion — omits heavy persona samples & full track analysis */
export interface ViralSnapshot {
  readiness: ViralReadiness;
  gaps: ViralGap[];
  crowd: Pick<
    CrowdSimulation,
    | "aggregates"
    | "scaled"
    | "funnel"
    | "retentionCurve"
    | "populationTarget"
    | "sampleSize"
  >;
  timeline: MusicTimeline;
  monteCarlo: ListenerSimulation;
  hitPotential: HitPotential;
  whatIf: WhatIfParams;
  timelineEdits?: TimelineEdits;
  contentFingerprint: string;
  analyzedAt: string;
}