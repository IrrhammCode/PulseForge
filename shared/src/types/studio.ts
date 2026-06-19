export type StudioProjectStatus = "draft" | "crafting" | "analyzing" | "ready";

export interface WorkflowTransition {
  from: StudioProjectStatus;
  to: StudioProjectStatus;
  reason: string;
  at: string;
}

export type StudioTab = "write" | "produce" | "analyze" | "compare" | "launch";

export interface LyricsSections {
  intro: string;
  verse1: string;
  verse2: string;
  chorus: string;
  bridge: string;
  outro: string;
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

/** Creative brief — keeps generated songs from feeling like generic AI demos. */
export interface SongCreativeBrief {
  story?: string;
  emotionalArc?: string;
  vocalCharacter?: string;
  listenerMoment?: string;
  productionNotes?: string;
}

/** Per-section instrumental / backing direction for ElevenLabs composition_plan chunks. */
export interface SectionMusicDirection {
  /** Backing bed e.g. "muted piano + vinyl crackle" */
  backing?: string;
  /** Lead melody instrument e.g. "soft synth arp" */
  melody?: string;
  /** Inline {cue} for ElevenLabs text field e.g. "guitar riff" */
  inlineCues?: string;
  /** Comma-separated styles to avoid in this section */
  avoid?: string;
  /** Intro/outro instrumental bed without lead vocals */
  instrumental?: boolean;
}

/** Vocal performance direction for ElevenLabs composition_plan chunks. */
export interface VocalDirection {
  voiceType?: "female" | "male" | "androgynous" | "duet";
  delivery?: "intimate" | "conversational" | "belt" | "soulful" | "raspy" | "airy";
  /** Extra character e.g. "breathy alto, slight rasp on chorus" */
  customCharacter?: string;
  /** Hint from Hook Voice Preview picker e.g. "Rachel — warm female" */
  preferredVoiceHint?: string;
  /** Phonetic ad-libs (mmm), (yeah) in intro/chorus/outro */
  adLibs?: boolean;
  /** Comma-separated vocal traits to avoid */
  avoid?: string;
}

/** Backing, harmony, and stem pipeline for full-song generation. */
export interface MusicArrangement {
  instruments?: string[];
  accompaniment?: string;
  harmony?: string;
  musicalKey?: string;
  negativeGlobal?: string[];
  vocal?: VocalDirection;
  sections?: Partial<
    Record<"intro" | "verse1" | "chorus" | "verse2" | "bridge" | "outro", SectionMusicDirection>
  >;
  /** Post-generate stem separation: auto tries Eleven then LALAL */
  stemEngine?: "auto" | "eleven" | "lalal";
}

export interface StudioProject {
  id: string;
  title: string;
  artistName: string;
  /** Primary display label (first tag or joined summary). */
  genre: string;
  mood: string;
  /** Mixable genre tags — e.g. ["Indie Pop", "Electronic"]. */
  genreTags?: string[];
  moodTags?: string[];
  genreCustom?: string;
  moodCustom?: string;
  creativeBrief?: SongCreativeBrief;
  musicArrangement?: MusicArrangement;
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
  genreTags?: string[];
  moodTags?: string[];
  genreCustom?: string;
  moodCustom?: string;
  creativeBrief?: SongCreativeBrief;
  musicArrangement?: MusicArrangement;
  bpmTarget?: number;
  /** When set, used as v1 lyrics instead of auto-generated starter text. */
  initialLyrics?: LyricsSections;
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
  intro: "",
  verse1: "",
  verse2: "",
  chorus: "",
  bridge: "",
  outro: "",
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
  "Other",
] as const;

/** Resolve genre tags including custom "Other" text. */
export function resolveGenreLabels(
  project: Pick<StudioProject, "genre" | "genreTags" | "genreCustom">
): string[] {
  const tags = project.genreTags?.length ? project.genreTags : project.genre ? [project.genre] : [];
  return tags
    .flatMap((tag) => {
      if (tag === "Other" && project.genreCustom?.trim()) return [project.genreCustom.trim()];
      if (tag === "Other") return [];
      return [tag];
    })
    .filter(Boolean);
}

/** Resolve mood tags including custom "Other" text. */
export function resolveMoodLabels(
  project: Pick<StudioProject, "mood" | "moodTags" | "moodCustom">
): string[] {
  const tags = project.moodTags?.length ? project.moodTags : project.mood ? [project.mood] : [];
  return tags
    .flatMap((tag) => {
      if (tag === "Other" && project.moodCustom?.trim()) return [project.moodCustom.trim()];
      if (tag === "Other") return [];
      return [tag];
    })
    .filter(Boolean);
}

/** Human-readable joined style label for headers. */
export function formatStyleMix(labels: string[]): string {
  return labels.length ? labels.join(" × ") : "";
}

export function primaryGenreLabel(
  project: Pick<StudioProject, "genre" | "genreTags" | "genreCustom">
): string {
  const labels = resolveGenreLabels(project);
  return formatStyleMix(labels) || project.genre || "Pop";
}

export function primaryMoodLabel(
  project: Pick<StudioProject, "mood" | "moodTags" | "moodCustom">
): string {
  const labels = resolveMoodLabels(project);
  return formatStyleMix(labels) || project.mood || "Energetic";
}