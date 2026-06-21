import type { StudioProject } from "@/types/studio";
import { deleteProjectAudio, clearAllAudio, saveAudioBlob } from "@/lib/studio/audio-db";
import {
  base64ToBlob,
  collectProjectAudioEntries,
  type AudioExportEntry,
} from "@/lib/studio/export-audio";
import {
  listProjects,
  getProject,
  createProject,
  deleteProject,
} from "@/lib/studio/storage";
import type { CreateProjectInput } from "@/types/studio";

export {
  getProjectRepository,
  setProjectRepository,
} from "@pulseforge/shared/lib/studio/repository";

export const STORAGE_SCHEMA_VERSION = 3;

export interface ProjectsExportBundle {
  schemaVersion: number;
  exportedAt: string;
  projects: StudioProject[];
  includesAudio?: boolean;
  audio?: AudioExportEntry[];
}

export function exportProjectsBundle(): ProjectsExportBundle {
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    projects: listProjects(),
  };
}

export async function exportProjectsBundleWithAudio(): Promise<ProjectsExportBundle> {
  const projects = listProjects();
  const audio = await collectProjectAudioEntries(projects);
  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    projects,
    includesAudio: audio.length > 0,
    audio,
  };
}

export function validateImportBundle(data: unknown): data is ProjectsExportBundle {
  if (!data || typeof data !== "object") return false;
  const bundle = data as ProjectsExportBundle;
  return (
    Array.isArray(bundle.projects) &&
    bundle.projects.every(
      (p) =>
        typeof p.id === "string" &&
        typeof p.title === "string" &&
        Array.isArray(p.versions)
    )
  );
}

export function importProjectsBundle(
  bundle: ProjectsExportBundle,
  mode: "merge" | "replace" = "merge"
): { imported: number; skipped: number } {
  const existing = mode === "replace" ? [] : listProjects();
  const existingIds = new Set(existing.map((p) => p.id));

  let imported = 0;
  let skipped = 0;
  const merged = mode === "replace" ? [] : [...existing];

  for (const project of bundle.projects) {
    if (existingIds.has(project.id)) {
      skipped++;
      const idx = merged.findIndex((p) => p.id === project.id);
      if (idx >= 0) merged[idx] = project;
      else {
        merged.push(project);
        imported++;
      }
    } else {
      merged.push(project);
      imported++;
    }
  }

  if (typeof window !== "undefined") {
    localStorage.setItem("pulseforge_studio_projects", JSON.stringify(merged));
  }

  return { imported, skipped };
}

export async function importProjectsBundleWithAudio(
  bundle: ProjectsExportBundle,
  mode: "merge" | "replace" = "merge"
): Promise<{ imported: number; skipped: number; audioRestored: number }> {
  const result = importProjectsBundle(bundle, mode);
  let audioRestored = 0;

  if (bundle.audio?.length) {
    for (const entry of bundle.audio) {
      const blob = base64ToBlob(entry.base64, entry.mimeType);
      await saveAudioBlob(
        entry.projectId,
        entry.versionId,
        entry.kind,
        blob
      );
      audioRestored++;
    }
  }

  return { ...result, audioRestored };
}

export async function deleteProjectCascade(projectId: string): Promise<boolean> {
  const project = getProject(projectId);
  if (!project) return false;

  await deleteProjectAudio(projectId);
  return deleteProject(projectId);
}

export async function clearAllProjectsAndAudio(): Promise<void> {
  if (typeof window !== "undefined") {
    localStorage.removeItem("pulseforge_studio_projects");
  }
  await clearAllAudio();
}

export function createProjectFromInput(input: CreateProjectInput): StudioProject {
  return createProject(input);
}