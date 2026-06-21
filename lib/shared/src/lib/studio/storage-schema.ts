import type { DemoAudioMeta, ProjectVersion, StudioProject } from "@/types/studio";
import { DEFAULT_STEMS, EMPTY_LYRICS } from "@/types/studio";
import type { TimelineEdits } from "@/types/viral";

/** Current persisted studio project schema (export bundles use the same version). */
export const SCHEMA_VERSION = 4;

export interface MigrateProjectsResult {
  projects: StudioProject[];
  migrated: boolean;
  fromVersion: number;
}

type StoredEnvelope = {
  schemaVersion?: number;
  projects?: StudioProject[];
};

function isStudioProject(value: unknown): value is StudioProject {
  if (!value || typeof value !== "object") return false;
  const project = value as StudioProject;
  return typeof project.id === "string" && Array.isArray(project.versions);
}

function detectStoredVersion(raw: unknown): number {
  if (Array.isArray(raw)) return 1;
  if (!raw || typeof raw !== "object") return 0;
  const envelope = raw as StoredEnvelope;
  if (!Array.isArray(envelope.projects)) return 0;
  return envelope.schemaVersion ?? 1;
}

function extractProjects(raw: unknown): StudioProject[] {
  if (Array.isArray(raw)) {
    return raw.filter(isStudioProject);
  }
  if (!raw || typeof raw !== "object") return [];
  const envelope = raw as StoredEnvelope;
  if (!Array.isArray(envelope.projects)) return [];
  return envelope.projects.filter(isStudioProject);
}

function normalizeAudio(audio: DemoAudioMeta): DemoAudioMeta {
  return {
    ...audio,
    stemsReady: audio.stemsReady ?? false,
    stems: audio.stems?.length ? audio.stems : DEFAULT_STEMS.map((stem) => ({ ...stem })),
  };
}

function normalizeVersion(version: ProjectVersion): ProjectVersion {
  const lyrics = { ...EMPTY_LYRICS, ...(version.lyrics ?? {}) };
  const audio = version.audio ? normalizeAudio(version.audio) : version.audio;
  return { ...version, lyrics, audio };
}

/** v1 → v2: ensure demo audio stem metadata exists when audio is present. */
function migrateV1ToV2(projects: StudioProject[]): StudioProject[] {
  return projects.map((project) => ({
    ...project,
    versions: project.versions.map((version) =>
      version.audio
        ? { ...version, audio: normalizeAudio(version.audio) }
        : normalizeVersion(version)
    ),
  }));
}

/** v2 → v3: promote timeline edits to first-class version fields. */
function migrateV2ToV3(projects: StudioProject[]): StudioProject[] {
  return projects.map((project) => ({
    ...project,
    versions: project.versions.map((version) => {
      const timelineEdits: TimelineEdits | undefined =
        version.timelineEdits ?? version.viral?.timelineEdits;
      if (!timelineEdits) return version;

      const viral =
        version.viral && !version.viral.timelineEdits
          ? { ...version.viral, timelineEdits }
          : version.viral;

      return { ...version, timelineEdits, viral };
    }),
  }));
}

/** v3 → v4: genre/mood tag arrays for mixable styles. */
function migrateV3ToV4(projects: StudioProject[]): StudioProject[] {
  return projects.map((project) => ({
    ...project,
    genreTags: project.genreTags?.length ? project.genreTags : project.genre ? [project.genre] : [],
    moodTags: project.moodTags?.length ? project.moodTags : project.mood ? [project.mood] : [],
  }));
}

/**
 * Normalize and migrate persisted projects on read.
 * Accepts legacy bare arrays or versioned envelopes.
 */
export function migrateProjectsOnRead(raw: unknown): MigrateProjectsResult {
  const fromVersion = detectStoredVersion(raw);
  if (fromVersion === 0) {
    return { projects: [], migrated: false, fromVersion: 0 };
  }

  let projects = extractProjects(raw).map((project) => ({
    ...project,
    versions: project.versions.map(normalizeVersion),
  }));

  let version = fromVersion;
  if (version < 2) {
    projects = migrateV1ToV2(projects);
    version = 2;
  }
  if (version < 3) {
    projects = migrateV2ToV3(projects);
    version = 3;
  }
  if (version < 4) {
    projects = migrateV3ToV4(projects);
    version = 4;
  }

  return {
    projects,
    migrated: fromVersion < SCHEMA_VERSION,
    fromVersion,
  };
}