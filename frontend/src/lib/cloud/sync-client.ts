import type { StudioProject } from "@/types/studio";
import { listProjects } from "@/lib/domain/project-commands";
import {
  importProjectsBundle,
  importProjectsBundleWithAudio,
  type ProjectsExportBundle,
} from "@/lib/studio/repository";
import { collectProjectAudioEntries } from "@/lib/studio/export-audio";
import {
  detectSyncConflicts,
  mergeProjectsWithResolutions,
  type ConflictPolicy,
  type ConflictResolution,
  type SyncConflict,
} from "@pulseforge/shared/lib/cloud/sync-conflicts";

const TOKEN_STORAGE_KEY = "pulseforge_sync_token";
const SESSION_LABEL_KEY = "pulseforge_sync_session_label";
const AUTO_CLOUD_PUSH_KEY = "pulseforge_auto_cloud_push";

export type CloudSyncMode = "merge" | "replace";

export interface SyncSessionInfo {
  kind: "bootstrap" | "session";
  label?: string;
  sessionId?: string;
}

export function getClientSyncToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setClientSyncToken(token: string, label?: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, token.trim());
  if (label) localStorage.setItem(SESSION_LABEL_KEY, label);
}

export function getClientSessionLabel(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SESSION_LABEL_KEY);
}

export function isAutoCloudPushEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTO_CLOUD_PUSH_KEY) === "true";
}

export function setAutoCloudPushEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTO_CLOUD_PUSH_KEY, enabled ? "true" : "false");
}

function authHeaders(): HeadersInit {
  const token = getClientSyncToken();
  if (!token) throw new Error("Sync token not configured");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export async function createCloudSyncSession(input?: {
  label?: string;
  email?: string;
}): Promise<{ token: string; sessionId: string; label?: string }> {
  const res = await fetch("/api/cloud/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input ?? {}),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Could not create session");
  }
  const data = (await res.json()) as {
    token: string;
    session: { id: string; label?: string | null };
  };
  const label = data.session.label ?? input?.label ?? "Cloud session";
  setClientSyncToken(data.token, label);
  return { token: data.token, sessionId: data.session.id, label };
}

export async function fetchSyncSessionInfo(): Promise<SyncSessionInfo | null> {
  const token = getClientSyncToken();
  if (!token) return null;
  const res = await fetch("/api/cloud/auth/me", { headers: authHeaders() });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    kind: "bootstrap" | "session";
    label?: string;
    session?: { id: string; label?: string | null };
  };
  if (data.kind === "bootstrap") {
    return { kind: "bootstrap", label: data.label ?? "Bootstrap admin" };
  }
  return {
    kind: "session",
    sessionId: data.session?.id,
    label: data.session?.label ?? getClientSessionLabel() ?? undefined,
  };
}

async function fetchCloudBundle(): Promise<{
  bundle: ProjectsExportBundle;
  cloudProjects: StudioProject[];
}> {
  const res = await fetch("/api/cloud/projects?audio=1", { headers: authHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Cloud fetch failed");
  }
  const data = (await res.json()) as {
    projects: StudioProject[];
    audio?: ProjectsExportBundle["audio"];
    includesAudio?: boolean;
  };

  const bundle: ProjectsExportBundle = {
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    projects: data.projects ?? [],
    includesAudio: data.includesAudio,
    audio: data.audio,
  };

  return { bundle, cloudProjects: data.projects ?? [] };
}

export async function previewPullConflicts(): Promise<{
  conflicts: SyncConflict[];
  cloudCount: number;
  localCount: number;
}> {
  const localProjects = listProjects();
  const res = await fetch("/api/cloud/conflicts", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ localProjects }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Conflict preview failed");
  }
  return (await res.json()) as {
    conflicts: SyncConflict[];
    cloudCount: number;
    localCount: number;
  };
}

export async function pushProjectToCloud(project: StudioProject): Promise<{
  audioCount: number;
}> {
  const audio = await collectProjectAudioEntries([project]);
  const res = await fetch("/api/cloud/projects", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ mode: "upsert", project, audio }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Cloud push failed");
  }
  const data = (await res.json()) as { audioCount?: number };
  return { audioCount: data.audioCount ?? audio.length };
}

export async function pushAllProjectsToCloud(
  mode: CloudSyncMode = "replace"
): Promise<{
  count: number;
  audioCount: number;
}> {
  const projects = listProjects();
  const audio = await collectProjectAudioEntries(projects);
  const res = await fetch("/api/cloud/projects", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ mode, projects, audio, localProjects: projects }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Cloud bulk push failed");
  }
  const data = (await res.json()) as { count?: number; audioCount?: number };
  return {
    count: data.count ?? projects.length,
    audioCount: data.audioCount ?? audio.length,
  };
}

export async function pullProjectsFromCloud(
  mode: CloudSyncMode = "merge",
  options?: {
    resolutions?: Record<string, ConflictResolution>;
    conflictPolicy?: ConflictPolicy;
  }
): Promise<{
  count: number;
  audioCount: number;
  skipped: number;
  conflicts: SyncConflict[];
  keptLocal: number;
  keptCloud: number;
}> {
  const localProjects = listProjects();
  const { bundle, cloudProjects } = await fetchCloudBundle();

  if (mode === "replace") {
    const result = bundle.audio?.length
      ? await importProjectsBundleWithAudio(bundle, "replace")
      : { ...importProjectsBundle(bundle, "replace"), audioRestored: 0 };
    return {
      count: result.imported,
      skipped: result.skipped,
      audioCount: result.audioRestored ?? 0,
      conflicts: [],
      keptLocal: 0,
      keptCloud: result.imported,
    };
  }

  const conflicts = detectSyncConflicts(localProjects, cloudProjects);
  const merged = mergeProjectsWithResolutions({
    local: localProjects,
    cloud: cloudProjects,
    resolutions: options?.resolutions,
    conflictPolicy: options?.conflictPolicy ?? "newest",
  });

  const mergedBundle: ProjectsExportBundle = {
    ...bundle,
    projects: merged.merged,
  };

  const result = mergedBundle.audio?.length
    ? await importProjectsBundleWithAudio(mergedBundle, "replace")
    : { ...importProjectsBundle(mergedBundle, "replace"), audioRestored: 0 };

  return {
    count: result.imported,
    skipped: result.skipped,
    audioCount: result.audioRestored ?? 0,
    conflicts,
    keptLocal: merged.keptLocal,
    keptCloud: merged.keptCloud,
  };
}

export async function pushAudioToCloud(
  projectId: string,
  versionId: string,
  kind: string,
  mimeType: string,
  base64: string
): Promise<void> {
  const res = await fetch(`/api/cloud/projects/${projectId}/audio`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ versionId, kind, mimeType, base64 }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? "Audio push failed");
  }
}