export type StudioProjectStatus = "draft" | "crafting" | "analyzing" | "ready";

export interface WorkflowTransition {
  from: StudioProjectStatus;
  to: StudioProjectStatus;
  reason: string;
  at: string;
}

export type StudioTab = "write" | "produce" | "analyze" | "compare" | "launch";

export interface LyricsSections {
  verse1: string;
  verse2: string;
  chorus: string;
  bridge: string;
  raw: string;
}

export type StemId = "vocals" | "drums" | "bass" | "other";

export interface StemMeta {
  id: StemId;
  label: string;
  volume: number;
  muted: boolean;
  solo: boolean;
}

export type StemSource = "client" | "lalal";

export interface DemoAudioMeta {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSec: number;
  uploadedAt: string;
  waveform: number[];
  estimatedBpm?: number;
  stemsReady: boolean;
  stemSource?: StemSource;
  stems: StemMeta[];
}

export const DEFAULT_STEMS: StemMeta[] = [
  { id: "vocals", label: "Vocals", volume: 1, muted: false, solo: false },
  { id: "drums", label: "Drums", volume: 1, muted: false, solo: false },
  { id: "bass", label: "Bass", volume: 1, muted: false, solo: false },
  { id: "other", label: "Other", volume: 1, muted: false, solo: false },
];

export const MAX_DEMO_SIZE_BYTES = 20 * 1024 * 1024;
export const MAX_DEMO_DURATION_SEC = 600;

export interface LaunchPlan {
  whatIf: import("@/types").WhatIfParams;
  targetReleaseDate?: string;
  notes?: string;
  manualChecks?: Record<string, boolean>;
}

export type AnalysisStaleReason =
  | "lyrics_changed"
  | "audio_changed"
  | "metadata_changed"
  | "timeline_edited";

export interface ProjectVersion {
  id: string;
  label: string;
  lyrics: LyricsSections;
  audio?: DemoAudioMeta;
  analysis?: import("@/types").TrackAnalysis;
  analyzedAt?: string;
  analysisStale?: boolean;
  analysisStaleReason?: AnalysisStaleReason;
  contentFingerprint?: string;
  derivedFromVersionId?: string;
  importedFromTrackId?: string;
  catalogMeta?: {
    spotifyId?: string;
    hasRichsync?: boolean;
    hasAnalysis?: boolean;
    mxmTrackId?: string;
    commontrackId?: string;
    isrc?: string;
    releaseYear?: number;
    mxmRating?: number;
    moods?: string[];
    themes?: string[];
    audienceRating?: string;
  };
  launchPlan?: LaunchPlan;
  viral?: import("@/types/viral").ViralSnapshot;
  /** First-class NLE trim state (canonical; mirrored in viral during migration). */
  timelineEdits?: import("@/types/viral").TimelineEdits;
  viralStale?: boolean;
  viralStaleReason?: AnalysisStaleReason;
  createdAt: string;
  updatedAt: string;
}

export interface StudioProject {
  id: string;
  title: string;
  artistName: string;
  genre: string;
  mood: string;
  bpmTarget?: number;
  status: StudioProjectStatus;
  versions: ProjectVersion[];
  activeVersionId: string;
  workflowLog?: WorkflowTransition[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  title: string;
  artistName: string;
  genre: string;
  mood: string;
  bpmTarget?: number;
}

export const STUDIO_TABS: { id: StudioTab; label: string; description: string }[] = [
  { id: "write", label: "Write", description: "Lyrics & structure" },
  { id: "produce", label: "Produce", description: "Audio & stems" },
  { id: "analyze", label: "Analyze", description: "Hit potential & intel" },
  { id: "compare", label: "Compare", description: "Version A vs B" },
  { id: "launch", label: "Launch", description: "Marketing & release" },
];

export const PROJECT_STATUSES: Record<
  StudioProjectStatus,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "text-muted bg-surface border-border" },
  crafting: {
    label: "Crafting",
    className: "text-accent-light bg-accent-muted border-accent/30",
  },
  analyzing: {
    label: "Analyzing",
    className: "text-accent-light bg-accent-muted border-accent/30",
  },
  ready: {
    label: "Ready",
    className: "text-success bg-success/10 border-success/30",
  },
};

export const EMPTY_LYRICS: LyricsSections = {
  verse1: "",
  verse2: "",
  chorus: "",
  bridge: "",
  raw: "",
};

export const GENRE_OPTIONS = [
  "Pop",
  "Indie Pop",
  "Hip-Hop",
  "R&B",
  "Electronic",
  "Rock",
  "Afrobeats",
  "Latin",
  "Other",
] as const;

export const MOOD_OPTIONS = [
  "Energetic",
  "Melancholic",
  "Uplifting",
  "Dark",
  "Romantic",
  "Chill",
  "Aggressive",
] as const;