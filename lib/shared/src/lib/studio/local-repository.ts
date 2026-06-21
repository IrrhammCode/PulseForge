import type { IProjectRepository } from "@/lib/studio/repository-port";
import * as storage from "@/lib/studio/storage";

export class LocalProjectRepository implements IProjectRepository {
  listProjects = storage.listProjects;
  getProject = storage.getProject;
  createProject = storage.createProject;
  updateProject = storage.updateProject;
  deleteProject = storage.deleteProject;
  addVersion = storage.addVersion;
  setActiveVersion = storage.setActiveVersion;
  updateVersionLyrics = storage.updateVersionLyrics;
  updateVersionAnalysis = storage.updateVersionAnalysis;
  updateVersionAudio = storage.updateVersionAudio;
  updateVersionStems = storage.updateVersionStems;
  updateVersionViral = storage.updateVersionViral;
  updateVersionTimelineEdits = storage.updateVersionTimelineEdits;
  updateVersionLaunchPlan = storage.updateVersionLaunchPlan;
}