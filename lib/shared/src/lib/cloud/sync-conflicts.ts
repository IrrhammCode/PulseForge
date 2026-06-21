import type { StudioProject } from "@/types/studio";

export type ConflictResolution = "local" | "cloud";

export type ConflictPolicy = "newest" | "local" | "cloud";

export interface SyncConflict {
  projectId: string;
  title: string;
  localUpdatedAt: string;
  cloudUpdatedAt: string;
}

function updatedMs(iso: string): number {
  const ms = new Date(iso).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

export function detectSyncConflicts(
  localProjects: StudioProject[],
  cloudProjects: StudioProject[]
): SyncConflict[] {
  const cloudById = new Map(cloudProjects.map((p) => [p.id, p]));
  const conflicts: SyncConflict[] = [];

  for (const local of localProjects) {
    const cloud = cloudById.get(local.id);
    if (!cloud) continue;
    if (local.updatedAt === cloud.updatedAt) continue;

    conflicts.push({
      projectId: local.id,
      title: local.title,
      localUpdatedAt: local.updatedAt,
      cloudUpdatedAt: cloud.updatedAt,
    });
  }

  return conflicts;
}

function pickByPolicy(
  local: StudioProject,
  cloud: StudioProject,
  policy: ConflictPolicy
): StudioProject {
  if (policy === "local") return local;
  if (policy === "cloud") return cloud;
  return updatedMs(local.updatedAt) >= updatedMs(cloud.updatedAt) ? local : cloud;
}

export function mergeProjectsWithResolutions(input: {
  local: StudioProject[];
  cloud: StudioProject[];
  resolutions?: Record<string, ConflictResolution>;
  conflictPolicy?: ConflictPolicy;
}): {
  merged: StudioProject[];
  keptLocal: number;
  keptCloud: number;
} {
  const policy = input.conflictPolicy ?? "newest";
  const resolutions = input.resolutions ?? {};
  const merged = new Map<string, StudioProject>();
  let keptLocal = 0;
  let keptCloud = 0;

  for (const project of input.local) {
    merged.set(project.id, project);
  }

  for (const cloud of input.cloud) {
    const local = merged.get(cloud.id);
    if (!local) {
      merged.set(cloud.id, cloud);
      keptCloud++;
      continue;
    }

    if (local.updatedAt === cloud.updatedAt) {
      continue;
    }

    const explicit = resolutions[cloud.id];
    let winner: StudioProject;
    if (explicit === "local") winner = local;
    else if (explicit === "cloud") winner = cloud;
    else winner = pickByPolicy(local, cloud, policy);

    merged.set(cloud.id, winner);
    if (winner === local) keptLocal++;
    else keptCloud++;
  }

  return {
    merged: Array.from(merged.values()).sort(
      (a, b) => updatedMs(b.updatedAt) - updatedMs(a.updatedAt)
    ),
    keptLocal,
    keptCloud,
  };
}