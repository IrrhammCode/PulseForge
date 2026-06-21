import { Router, type Request } from "express";
import type { StudioProject } from "@pulseforge/shared/types/studio";
import {
  detectSyncConflicts,
  mergeProjectsWithResolutions,
  type ConflictResolution,
} from "@pulseforge/shared/lib/cloud/sync-conflicts";
import { requireSyncAuth } from "../middleware/auth";
import {
  dbDeleteProject,
  dbGetProject,
  dbListProjects,
  dbReplaceAllProjects,
  dbMergeProjects,
  dbUpsertProject,
  dbSaveAudioBlob,
  dbSaveAudioBlobs,
  dbListAudioForProject,
  dbListAllAudio,
  dbGetAudioBlob,
  scopeFromAuth,
} from "../db/projects";

export const cloudRouter = Router();

type AudioEntry = {
  projectId: string;
  versionId: string;
  kind: string;
  mimeType: string;
  base64: string;
};

function decodeAudioEntries(entries: AudioEntry[]) {
  return entries.map((entry) => ({
    projectId: entry.projectId,
    versionId: entry.versionId,
    kind: entry.kind,
    mimeType: entry.mimeType,
    data: Buffer.from(entry.base64, "base64"),
  }));
}

function ownerSessionId(req: Request): string | undefined {
  return req.syncAuth?.kind === "session" ? req.syncAuth.sessionId : undefined;
}

cloudRouter.use(requireSyncAuth);

cloudRouter.get("/projects", async (req, res) => {
  const scope = scopeFromAuth(req.syncAuth!);
  const projects = await dbListProjects(scope);
  const includeAudio = req.query.audio === "1" || req.query.includeAudio === "true";

  if (!includeAudio) {
    res.json({ projects });
    return;
  }

  const rows = await dbListAllAudio(scope);
  const audio = rows.map((a) => ({
    projectId: a.projectId,
    versionId: a.versionId,
    kind: a.kind,
    mimeType: a.mimeType,
    sizeBytes: a.sizeBytes,
    base64: Buffer.from(a.data).toString("base64"),
  }));

  res.json({ projects, audio, includesAudio: audio.length > 0 });
});

/** Preview merge conflicts without writing. */
cloudRouter.post("/conflicts", async (req, res) => {
  const body = req.body as { localProjects?: StudioProject[] };
  const scope = scopeFromAuth(req.syncAuth!);
  const cloudProjects = await dbListProjects(scope);
  const localProjects = body.localProjects ?? [];

  const conflicts = detectSyncConflicts(localProjects, cloudProjects);
  res.json({ conflicts, cloudCount: cloudProjects.length, localCount: localProjects.length });
});

cloudRouter.post("/projects", async (req, res) => {
  const body = req.body as {
    mode?: "upsert" | "replace" | "merge";
    project?: StudioProject;
    projects?: StudioProject[];
    audio?: AudioEntry[];
    localProjects?: StudioProject[];
    resolutions?: Record<string, ConflictResolution>;
    conflictPolicy?: "newest" | "local" | "cloud";
  };

  const scope = scopeFromAuth(req.syncAuth!);
  const sessionId = ownerSessionId(req);

  if (body.mode === "replace" && Array.isArray(body.projects)) {
    const count = await dbReplaceAllProjects(body.projects, scope, sessionId);
    const audioCount = body.audio?.length
      ? await dbSaveAudioBlobs(decodeAudioEntries(body.audio))
      : 0;
    res.json({ ok: true, count, audioCount });
    return;
  }

  if (body.mode === "merge" && Array.isArray(body.projects)) {
    const localProjects = body.localProjects ?? [];
    const conflicts = detectSyncConflicts(localProjects, body.projects);
    const merged = mergeProjectsWithResolutions({
      local: localProjects,
      cloud: body.projects,
      resolutions: body.resolutions,
      conflictPolicy: body.conflictPolicy ?? "newest",
    });

    const count = await dbMergeProjects(merged.merged, sessionId);
    const audioCount = body.audio?.length
      ? await dbSaveAudioBlobs(decodeAudioEntries(body.audio))
      : 0;

    res.json({
      ok: true,
      count,
      audioCount,
      mode: "merge",
      conflicts: conflicts.length,
      keptLocal: merged.keptLocal,
      keptCloud: merged.keptCloud,
    });
    return;
  }

  if (body.project?.id) {
    const stored = await dbUpsertProject(body.project, sessionId);
    const projectAudio =
      body.audio?.filter((a) => a.projectId === body.project!.id) ?? [];
    const audioCount = projectAudio.length
      ? await dbSaveAudioBlobs(decodeAudioEntries(projectAudio))
      : 0;
    res.json({ ok: true, project: stored, audioCount });
    return;
  }

  res.status(400).json({ error: "Invalid payload" });
});

cloudRouter.get("/projects/:id", async (req, res) => {
  const scope = scopeFromAuth(req.syncAuth!);
  const project = await dbGetProject(req.params.id, scope);
  if (!project) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const audio = await dbListAudioForProject(req.params.id, scope);
  res.json({
    project,
    audio: audio.map((a) => ({
      projectId: a.projectId,
      versionId: a.versionId,
      kind: a.kind,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
    })),
  });
});

cloudRouter.delete("/projects/:id", async (req, res) => {
  const scope = scopeFromAuth(req.syncAuth!);
  const ok = await dbDeleteProject(req.params.id, scope);
  res.json({ ok });
});

cloudRouter.get("/projects/:id/audio/:kind", async (req, res) => {
  const scope = scopeFromAuth(req.syncAuth!);
  const versionId = String(req.query.versionId ?? "");
  if (!versionId) {
    res.status(400).json({ error: "versionId query required" });
    return;
  }
  const blob = await dbGetAudioBlob(
    req.params.id,
    versionId,
    req.params.kind,
    scope
  );
  if (!blob) {
    res.status(404).json({ error: "Audio not found" });
    return;
  }
  res.json({
    projectId: req.params.id,
    versionId,
    kind: req.params.kind,
    mimeType: blob.mimeType,
    base64: blob.data.toString("base64"),
    sizeBytes: blob.data.length,
  });
});

cloudRouter.post("/projects/:id/audio", async (req, res) => {
  const scope = scopeFromAuth(req.syncAuth!);
  const owned = await dbGetProject(req.params.id, scope);
  if (!owned) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const body = req.body as {
    versionId: string;
    kind: string;
    mimeType: string;
    base64: string;
  };
  if (!body.versionId || !body.kind || !body.base64) {
    res.status(400).json({ error: "Missing audio fields" });
    return;
  }
  await dbSaveAudioBlob({
    projectId: req.params.id,
    versionId: body.versionId,
    kind: body.kind,
    mimeType: body.mimeType ?? "application/octet-stream",
    data: Buffer.from(body.base64, "base64"),
  });
  res.json({ ok: true });
});