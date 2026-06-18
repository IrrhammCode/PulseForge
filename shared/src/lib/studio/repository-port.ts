import type { TrackAnalysis } from "@/types";
import type {
  CreateProjectInput,
  DemoAudioMeta,
  LaunchPlan,
  LyricsSections,
  StudioProject,
} from "@/types/studio";
import type { TimelineEdits, ViralSnapshot } from "@/types/viral";

export type UpdateProjectPatch = Partial<
  Pick<
    StudioProject,
    "title" | "artistName" | "genre" | "mood" | "bpmTarget" | "status" | "activeVersionId" | "versions"
  >
>;

export type UpdateVersionStemsPatch = Pick<DemoAudioMeta, "stems" | "stemsReady" | "stemSource">;

export interface IProjectRepository {
  listProjects(): StudioProject[];
  getProject(id: string): StudioProject | null;
  createProject(input: CreateProjectInput): StudioProject;
  updateProject(id: string, patch: UpdateProjectPatch): StudioProject | null;
  deleteProject(id: string): boolean;
  addVersion(projectId: string, label?: string): StudioProject | null;
  setActiveVersion(projectId: string, versionId: string): StudioProject | null;
  updateVersionLyrics(
    projectId: string,
    versionId: string,
    lyrics: LyricsSections
  ): StudioProject | null;
  updateVersionAnalysis(
    projectId: string,
    versionId: string,
    analysis: TrackAnalysis
  ): StudioProject | null;
  updateVersionAudio(
    projectId: string,
    versionId: string,
    audio: DemoAudioMeta | undefined
  ): StudioProject | null;
  updateVersionStems(
    projectId: string,
    versionId: string,
    patch: UpdateVersionStemsPatch
  ): StudioProject | null;
  updateVersionViral(
    projectId: string,
    versionId: string,
    snapshot: ViralSnapshot
  ): StudioProject | null;
  updateVersionTimelineEdits(
    projectId: string,
    versionId: string,
    timelineEdits: TimelineEdits
  ): StudioProject | null;
  updateVersionLaunchPlan(
    projectId: string,
    versionId: string,
    launchPlan: LaunchPlan
  ): StudioProject | null;
}