import type { StudioProject } from "@pulseforge/shared/types/studio";
import type { SyncAuthContext } from "../middleware/auth";
import { prisma } from "./client";

export type ProjectScope =
  | { kind: "all" }
  | { kind: "session"; sessionId: string };

export function scopeFromAuth(auth: SyncAuthContext): ProjectScope {
  if (auth.kind === "session" && auth.sessionId) {
    return { kind: "session", sessionId: auth.sessionId };
  }
  return { kind: "all" };
}

function projectWhere(scope: ProjectScope) {
  if (scope.kind === "session") {
    return { ownerSessionId: scope.sessionId };
  }
  return {};
}

export async function dbListProjects(scope: ProjectScope): Promise<StudioProject[]> {
  const rows = await prisma.project.findMany({
    where: projectWhere(scope),
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((r) => JSON.parse(r.payload) as StudioProject);
}

export async function dbGetProject(
  id: string,
  scope: ProjectScope
): Promise<StudioProject | null> {
  const row = await prisma.project.findFirst({
    where: { id, ...projectWhere(scope) },
  });
  if (!row) return null;
  return JSON.parse(row.payload) as StudioProject;
}

export async function dbUpsertProject(
  project: StudioProject,
  ownerSessionId?: string
): Promise<StudioProject> {
  const updatedAt = new Date(project.updatedAt);
  const createdAt = new Date(project.createdAt);
  const payload = JSON.stringify(project);

  const existing = await prisma.project.findUnique({ where: { id: project.id } });

  await prisma.project.upsert({
    where: { id: project.id },
    create: {
      id: project.id,
      title: project.title,
      artistName: project.artistName,
      genre: project.genre,
      mood: project.mood,
      status: project.status,
      activeVersionId: project.activeVersionId,
      payload,
      createdAt,
      updatedAt,
      ownerSessionId: ownerSessionId ?? null,
    },
    update: {
      title: project.title,
      artistName: project.artistName,
      genre: project.genre,
      mood: project.mood,
      status: project.status,
      activeVersionId: project.activeVersionId,
      payload,
      updatedAt,
      syncedAt: new Date(),
      ...(ownerSessionId && !existing?.ownerSessionId
        ? { ownerSessionId }
        : {}),
    },
  });

  return project;
}

export async function dbMergeProjects(
  projects: StudioProject[],
  ownerSessionId?: string
): Promise<number> {
  for (const project of projects) {
    await dbUpsertProject(project, ownerSessionId);
  }
  return projects.length;
}

export async function dbSaveAudioBlobs(
  entries: Array<{
    projectId: string;
    versionId: string;
    kind: string;
    mimeType: string;
    data: Buffer;
  }>
): Promise<number> {
  for (const entry of entries) {
    await dbSaveAudioBlob(entry);
  }
  return entries.length;
}

export async function dbReplaceAllProjects(
  projects: StudioProject[],
  scope: ProjectScope,
  ownerSessionId?: string
): Promise<number> {
  if (scope.kind === "session") {
    const owned = projectWhere(scope);
    await prisma.$transaction([
      prisma.audioBlob.deleteMany({
        where: { project: owned },
      }),
      prisma.project.deleteMany({ where: owned }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.audioBlob.deleteMany(),
      prisma.project.deleteMany(),
    ]);
  }

  for (const project of projects) {
    await dbUpsertProject(project, ownerSessionId);
  }

  return projects.length;
}

export async function dbDeleteProject(id: string, scope: ProjectScope): Promise<boolean> {
  try {
    const result = await prisma.project.deleteMany({
      where: { id, ...projectWhere(scope) },
    });
    return result.count > 0;
  } catch {
    return false;
  }
}

export async function dbSaveAudioBlob(input: {
  projectId: string;
  versionId: string;
  kind: string;
  mimeType: string;
  data: Buffer;
}): Promise<void> {
  await prisma.audioBlob.upsert({
    where: {
      projectId_versionId_kind: {
        projectId: input.projectId,
        versionId: input.versionId,
        kind: input.kind,
      },
    },
    create: {
      projectId: input.projectId,
      versionId: input.versionId,
      kind: input.kind,
      mimeType: input.mimeType,
      sizeBytes: input.data.length,
      data: new Uint8Array(input.data),
    },
    update: {
      mimeType: input.mimeType,
      sizeBytes: input.data.length,
      data: new Uint8Array(input.data),
    },
  });
}

export async function dbGetAudioBlob(
  projectId: string,
  versionId: string,
  kind: string,
  scope: ProjectScope
): Promise<{ mimeType: string; data: Buffer } | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...projectWhere(scope) },
  });
  if (!project) return null;

  const row = await prisma.audioBlob.findUnique({
    where: { projectId_versionId_kind: { projectId, versionId, kind } },
  });
  if (!row) return null;
  return { mimeType: row.mimeType, data: Buffer.from(row.data) };
}

export async function dbListAudioForProject(projectId: string, scope: ProjectScope) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, ...projectWhere(scope) },
  });
  if (!project) return [];
  return prisma.audioBlob.findMany({ where: { projectId } });
}

export async function dbListAllAudio(scope: ProjectScope) {
  if (scope.kind === "session") {
    return prisma.audioBlob.findMany({
      where: { project: projectWhere(scope) },
      select: {
        projectId: true,
        versionId: true,
        kind: true,
        mimeType: true,
        sizeBytes: true,
        data: true,
      },
    });
  }

  return prisma.audioBlob.findMany({
    select: {
      projectId: true,
      versionId: true,
      kind: true,
      mimeType: true,
      sizeBytes: true,
      data: true,
    },
  });
}