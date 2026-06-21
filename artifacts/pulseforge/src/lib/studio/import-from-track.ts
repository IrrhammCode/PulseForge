import type { AppTrack } from "@/lib/musixmatch/client";
import type { TrackAnalysis } from "@/types";
import type { StudioProject } from "@/types/studio";
import {
  buildCatalogMeta,
  buildCreateProjectInput,
  buildImportLyrics,
} from "@pulseforge/shared/lib/studio/catalog-import";
import { createProject, updateVersionLyrics, updateVersionAnalysis } from "@/lib/studio/storage";

export interface ImportFromTrackOptions {
  analysis?: TrackAnalysis;
  mood?: string;
  lyricsBody?: string;
}

function withCatalogVersion(
  project: StudioProject,
  versionId: string,
  track: AppTrack,
  analysis?: TrackAnalysis
): StudioProject {
  const catalogMeta = buildCatalogMeta(track, analysis);
  return {
    ...project,
    versions: project.versions.map((v) =>
      v.id === versionId
        ? {
            ...v,
            importedFromTrackId: track.id,
            catalogMeta,
          }
        : v
    ),
  };
}

export function createProjectFromCatalogTrack(
  track: AppTrack,
  options?: ImportFromTrackOptions
): StudioProject {
  const createInput = buildCreateProjectInput(track, options?.analysis);
  if (options?.mood) createInput.mood = options.mood;

  let project = createProject(createInput);
  const version = project.versions[0];
  if (!version) return project;

  const lyrics =
    options?.analysis?.importLyrics ??
    buildImportLyrics(options?.analysis, options?.lyricsBody);

  if (lyrics.chorus.trim() || lyrics.verse1.trim() || lyrics.raw.trim()) {
    project = updateVersionLyrics(project.id, version.id, lyrics) ?? project;
  }

  if (options?.analysis) {
    const updated = updateVersionAnalysis(project.id, version.id, options.analysis);
    if (updated) {
      return withCatalogVersion(updated, version.id, track, options.analysis);
    }
  }

  return withCatalogVersion(project, version.id, track, options?.analysis);
}