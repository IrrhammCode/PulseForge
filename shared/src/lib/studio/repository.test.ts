import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IProjectRepository } from "@/lib/studio/repository-port";
import { getProjectRepository, setProjectRepository } from "@/lib/studio/repository";

const { memory } = vi.hoisted(() => {
  const memory = new Map<string, string>();
  return { memory };
});

const localStorageMock = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
  removeItem: (key: string) => {
    memory.delete(key);
  },
  clear: () => {
    memory.clear();
  },
};

vi.stubGlobal("localStorage", localStorageMock);
vi.stubGlobal("window", { localStorage: localStorageMock });

describe("project repository", () => {
  beforeEach(() => {
    memory.clear();
    setProjectRepository(null);
  });

  it("returns a local repository singleton by default", () => {
    const a = getProjectRepository();
    const b = getProjectRepository();
    expect(a).toBe(b);
  });

  it("persists projects through the default repository", () => {
    const repo = getProjectRepository();
    const project = repo.createProject({
      title: "Midnight Drive",
      artistName: "Pulse",
      genre: "Pop",
      mood: "Energetic",
    });

    expect(repo.listProjects()).toHaveLength(1);
    expect(repo.getProject(project.id)?.title).toBe("Midnight Drive");
  });

  it("allows tests to swap the repository implementation", () => {
    const stub: IProjectRepository = {
      listProjects: () => [],
      getProject: () => null,
      createProject: () => {
        throw new Error("stub");
      },
      updateProject: () => null,
      deleteProject: () => false,
      addVersion: () => null,
      setActiveVersion: () => null,
      updateVersionLyrics: () => null,
      updateVersionAnalysis: () => null,
      updateVersionAudio: () => null,
      updateVersionStems: () => null,
      updateVersionViral: () => null,
      updateVersionTimelineEdits: () => null,
      updateVersionLaunchPlan: () => null,
    };

    setProjectRepository(stub);
    expect(getProjectRepository()).toBe(stub);
    expect(getProjectRepository().listProjects()).toEqual([]);
  });
});