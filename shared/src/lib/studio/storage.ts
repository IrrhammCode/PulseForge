import type { TrackAnalysis } from "@/types";
import type {
  CreateProjectInput,
  DemoAudioMeta,
  LaunchPlan,
  LyricsSections,
  ProjectVersion,
  StudioProject,
} from "@/types/studio";
import { EMPTY_LYRICS as EMPTY } from "@/types/studio";
import { computeContentFingerprint } from "@/lib/domain/fingerprint";
import type { ViralSnapshot } from "@/types/viral";
import {
  appendWorkflowLog,
  clearVersionStale,
  clearVersionViralStale,
  computeWorkflowTransition,
  markVersionStale,
  markVersionViralStale,
  resolveProjectStatus,
} from "@/lib/domain/workflow";
import { defaultLaunchPlan } from "@/lib/studio/launch";
import { migrateProjectsOnRead } from "@/lib/studio/storage-schema";
import type { TimelineEdits } from "@/types/viral";

const STORAGE_KEY = "pulseforge_studio_projects";

function now() {
  return new Date().toISOString();
}

function generateId() {
  return crypto.randomUUID();
}

function createDefaultVersion(label = "v1"): ProjectVersion {
  const ts = now();
  // Default starter lyrics with energetic indie pop vibe (reflective transitions like "before spring ends" feel, but generic for any energetic drive-themed track)
  const starterLyrics: LyricsSections = {
    verse1: "Windows down, the lights blur on by\nChasing the night under open sky\nEvery turn takes me away from the past\nThe wheels keep turning, the feeling lasts",
    verse2: "Thoughts speeding faster than the signs\nChange is coming but the road still aligns\nHad to escape before the moment ends\nNow the dark feels like we're just friends",
    chorus: "Drive on, hearts on fire\nEnergetic rush, taking us higher\nDon't let it fade, keep the engine alive\nIn this indie night, we thrive and survive\nDrive on, we're alive tonight",
    bridge: "Wind in our hair, the beat in our chest\nLeaving it all in the rearview at best\nEnergetic pulse that we can't slow down\nThis is the moment before it drowns",
    raw: ""
  };
  return {
    id: generateId(),
    label,
    lyrics: starterLyrics,
    createdAt: ts,
    updatedAt: ts,
  };
}

function readAll(): StudioProject[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    const { projects, migrated } = migrateProjectsOnRead(parsed);
    if (migrated) writeAll(projects);
    return projects;
  } catch {
    return [];
  }
}

function writeAll(projects: StudioProject[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

function finalizeProject(prev: StudioProject | null, next: StudioProject): StudioProject {
  const withStatus: StudioProject = {
    ...next,
    status: resolveProjectStatus(next),
  };
  const transition = prev ? computeWorkflowTransition(prev, withStatus) : null;
  return appendWorkflowLog(withStatus, transition);
}

export function listProjects(): StudioProject[] {
  return readAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function getProject(id: string): StudioProject | null {
  return readAll().find((p) => p.id === id) ?? null;
}

export function createProject(input: CreateProjectInput): StudioProject {
  const ts = now();
  const version = createDefaultVersion();
  const project: StudioProject = {
    id: generateId(),
    title: input.title.trim(),
    artistName: input.artistName.trim(),
    genre: input.genre,
    mood: input.mood,
    bpmTarget: input.bpmTarget,
    status: "draft",
    versions: [version],
    activeVersionId: version.id,
    createdAt: ts,
    updatedAt: ts,
  };

  const projects = readAll();
  projects.unshift(project);
  writeAll(projects);
  return project;
}

export function updateProject(
  id: string,
  patch: Partial<Pick<StudioProject, "title" | "artistName" | "genre" | "mood" | "bpmTarget" | "status" | "activeVersionId" | "versions">>
): StudioProject | null {
  const projects = readAll();
  const index = projects.findIndex((p) => p.id === id);
  if (index === -1) return null;

  const prev = projects[index];
  const metaChanged =
    (patch.title != null && patch.title !== prev.title) ||
    (patch.artistName != null && patch.artistName !== prev.artistName) ||
    (patch.genre != null && patch.genre !== prev.genre) ||
    (patch.mood != null && patch.mood !== prev.mood) ||
    (patch.bpmTarget != null && patch.bpmTarget !== prev.bpmTarget);

  let versions = patch.versions ?? prev.versions;
  if (metaChanged && !patch.versions) {
    versions = versions.map((v) => {
      let next = v;
      if (v.analysis) next = markVersionStale(next, "metadata_changed");
      if (v.viral) next = markVersionViralStale(next, "metadata_changed");
      return next;
    });
  }

  const merged: StudioProject = {
    ...prev,
    ...patch,
    versions,
    updatedAt: now(),
  };
  projects[index] = finalizeProject(prev, merged);
  writeAll(projects);
  return projects[index];
}

export function deleteProject(id: string): boolean {
  const projects = readAll();
  const next = projects.filter((p) => p.id !== id);
  if (next.length === projects.length) return false;
  writeAll(next);
  return true;
}

export function addVersion(projectId: string, label?: string): StudioProject | null {
  const project = getProject(projectId);
  if (!project) return null;

  const versionNumber = project.versions.length + 1;
  const version = createDefaultVersion(label ?? `v${versionNumber}`);
  version.derivedFromVersionId = project.activeVersionId;

  const active = project.versions.find((v) => v.id === project.activeVersionId);
  if (active) {
    version.lyrics = { ...active.lyrics };
    if (active.audio) {
      version.audio = {
        ...active.audio,
        stems: active.audio.stems.map((s) => ({ ...s })),
      };
    }
    if (active.launchPlan) {
      version.launchPlan = {
        ...active.launchPlan,
        whatIf: { ...active.launchPlan.whatIf },
        manualChecks: { ...active.launchPlan.manualChecks },
      };
    }
  }

  return updateProject(projectId, {
    versions: [...project.versions, version],
    activeVersionId: version.id,
    status: "crafting",
  });
}

export function setActiveVersion(projectId: string, versionId: string): StudioProject | null {
  const project = getProject(projectId);
  if (!project) return null;
  if (!project.versions.some((v) => v.id === versionId)) return null;
  return updateProject(projectId, { activeVersionId: versionId });
}

function patchVersion(
  project: StudioProject,
  versionId: string,
  patch: Partial<Pick<ProjectVersion, "lyrics" | "audio" | "analysis" | "analyzedAt" | "launchPlan" | "label">>
): StudioProject {
  const ts = now();
  const versions = project.versions.map((v) =>
    v.id === versionId ? { ...v, ...patch, updatedAt: ts } : v
  );
  return { ...project, versions, updatedAt: ts };
}

export function updateVersionLyrics(
  projectId: string,
  versionId: string,
  lyrics: LyricsSections
): StudioProject | null {
  const project = getProject(projectId);
  if (!project) return null;
  if (!project.versions.some((v) => v.id === versionId)) return null;

  let patched = patchVersion(project, versionId, { lyrics });
  const version = patched.versions.find((v) => v.id === versionId);
  if (version?.analysis || version?.viral) {
    patched = {
      ...patched,
      versions: patched.versions.map((v) => {
        if (v.id !== versionId) return v;
        let next = v;
        if (v.analysis) next = markVersionStale(next, "lyrics_changed");
        if (v.viral) next = markVersionViralStale(next, "lyrics_changed");
        return next;
      }),
    };
  }
  const projects = readAll();
  const index = projects.findIndex((p) => p.id === projectId);
  projects[index] = finalizeProject(project, patched);
  writeAll(projects);
  return projects[index];
}

export function updateVersionAnalysis(
  projectId: string,
  versionId: string,
  analysis: TrackAnalysis
): StudioProject | null {
  const project = getProject(projectId);
  if (!project) return null;
  if (!project.versions.some((v) => v.id === versionId)) return null;

  const fingerprint = computeContentFingerprint(
    project.versions.find((v) => v.id === versionId)?.lyrics ?? EMPTY,
    project.versions.find((v) => v.id === versionId)?.audio,
    project
  );

  const versions = project.versions.map((v) => {
    if (v.id !== versionId) return v;
    return clearVersionStale(
      { ...v, analysis, analyzedAt: now() },
      fingerprint
    );
  });

  const updated = { ...project, versions, updatedAt: now() };
  const projects = readAll();
  const index = projects.findIndex((p) => p.id === projectId);
  projects[index] = finalizeProject(project, updated);
  writeAll(projects);
  return projects[index];
}

export function updateVersionAudio(
  projectId: string,
  versionId: string,
  audio: DemoAudioMeta | undefined
): StudioProject | null {
  const project = getProject(projectId);
  if (!project) return null;
  if (!project.versions.some((v) => v.id === versionId)) return null;

  let patched = patchVersion(project, versionId, { audio });
  const version = patched.versions.find((v) => v.id === versionId);
  if (version?.analysis || version?.viral) {
    patched = {
      ...patched,
      versions: patched.versions.map((v) => {
        if (v.id !== versionId) return v;
        let next = v;
        if (v.analysis) next = markVersionStale(next, "audio_changed");
        if (v.viral) next = markVersionViralStale(next, "audio_changed");
        return next;
      }),
    };
  }
  const projects = readAll();
  const index = projects.findIndex((p) => p.id === projectId);
  projects[index] = finalizeProject(project, patched);
  writeAll(projects);
  return projects[index];
}

export function updateVersionStems(
  projectId: string,
  versionId: string,
  patch: Pick<DemoAudioMeta, "stems" | "stemsReady" | "stemSource">
): StudioProject | null {
  const project = getProject(projectId);
  if (!project) return null;
  const version = project.versions.find((v) => v.id === versionId);
  if (!version?.audio) return null;

  return updateVersionAudio(projectId, versionId, {
    ...version.audio,
    ...patch,
  });
}

export function updateVersionViral(
  projectId: string,
  versionId: string,
  snapshot: ViralSnapshot
): StudioProject | null {
  const project = getProject(projectId);
  if (!project) return null;
  if (!project.versions.some((v) => v.id === versionId)) return null;

  const versions = project.versions.map((v) => {
    if (v.id !== versionId) return v;
    const syncedLaunch = {
      ...(v.launchPlan ?? defaultLaunchPlan(snapshot.whatIf)),
      whatIf: snapshot.whatIf,
    };
    const timelineEdits = v.timelineEdits ?? snapshot.timelineEdits;
    const viralSnapshot = { ...snapshot, timelineEdits };
    return clearVersionViralStale(
      {
        ...v,
        launchPlan: syncedLaunch,
        timelineEdits,
        viral: viralSnapshot,
      },
      viralSnapshot
    );
  });

  const updated = { ...project, versions, updatedAt: now() };
  const projects = readAll();
  const index = projects.findIndex((p) => p.id === projectId);
  projects[index] = finalizeProject(project, updated);
  writeAll(projects);
  return projects[index];
}

export function updateVersionTimelineEdits(
  projectId: string,
  versionId: string,
  timelineEdits: TimelineEdits
): StudioProject | null {
  const project = getProject(projectId);
  if (!project) return null;
  if (!project.versions.some((v) => v.id === versionId)) return null;

  const versions = project.versions.map((v) => {
    if (v.id !== versionId) return v;
    let next: ProjectVersion = { ...v, timelineEdits };
    if (v.viral) {
      next = markVersionViralStale(
        { ...next, viral: { ...v.viral, timelineEdits } },
        "timeline_edited"
      );
    }
    return next;
  });

  const updated = { ...project, versions, updatedAt: now() };
  const projects = readAll();
  const index = projects.findIndex((p) => p.id === projectId);
  projects[index] = finalizeProject(project, updated);
  writeAll(projects);
  return projects[index];
}

export function updateVersionLaunchPlan(
  projectId: string,
  versionId: string,
  launchPlan: LaunchPlan
): StudioProject | null {
  const project = getProject(projectId);
  if (!project) return null;
  if (!project.versions.some((v) => v.id === versionId)) return null;

  const updated = patchVersion(project, versionId, { launchPlan });
  const projects = readAll();
  const index = projects.findIndex((p) => p.id === projectId);
  projects[index] = finalizeProject(project, { ...updated, status: "ready" });
  writeAll(projects);
  return projects[index];
}