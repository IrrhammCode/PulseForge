import type {
  AnalysisStaleReason,
  DemoAudioMeta,
  LyricsSections,
  StudioProject,
  ProjectVersion,
  StemMeta,
} from "@/types/studio";
import type { TrackAnalysis } from "@/types";

export type { AnalysisStaleReason };

export type TrackSource = "catalog" | "studio_draft" | "imported_catalog";

export type IntelligenceTier = "local" | "partner" | "full";

export interface AudioSignals {
  durationSec?: number;
  estimatedBpm?: number;
  waveform?: number[];
  stemsReady?: boolean;
  stemBalance?: number;
  fileName?: string;
  stems?: StemMeta[]; // full stems for vocal/production scoring (when available from studio version)
}

export interface VersionSnapshot {
  projectId: string;
  versionId: string;
  versionLabel: string;
  source: TrackSource;
  title: string;
  artistName: string;
  genre: string;
  mood: string;
  bpmTarget?: number;
  lyrics: LyricsSections;
  lyricsBody: string;
  audio?: AudioSignals;
  derivedFromVersionId?: string;
  contentFingerprint: string;
  intelligenceTier: IntelligenceTier;
}

export interface CreativeGraph {
  snapshot: VersionSnapshot;
  hasLyrics: boolean;
  hasDemo: boolean;
  hasAnalysis: boolean;
  analysisStale: boolean;
  staleReason?: AnalysisStaleReason;
  analysis?: TrackAnalysis;
  analyzedAt?: string;
  hasViral?: boolean;
  viralStale?: boolean;
  viralStaleReason?: AnalysisStaleReason;
  viral?: import("@/types/viral").ViralSnapshot;
  viralAnalyzedAt?: string;
  canonicalHitScore?: number | null;
  canonicalProb1M?: number | null;
  canonicalWhatIf?: import("@/types").WhatIfParams;
}

export type { WorkflowTransition } from "@/types/studio";

export function versionFromProject(
  project: StudioProject,
  versionId?: string
): ProjectVersion | undefined {
  const id = versionId ?? project.activeVersionId;
  return project.versions.find((v) => v.id === id);
}

export function audioToSignals(audio?: DemoAudioMeta): AudioSignals | undefined {
  if (!audio) return undefined;
  return {
    durationSec: audio.durationSec,
    estimatedBpm: audio.estimatedBpm,
    waveform: audio.waveform,
    stemsReady: audio.stemsReady,
    stemBalance: (audio as any).stemBalance, // may be attached on version snapshot
    fileName: audio.fileName,
    stems: audio.stems,
  };
}