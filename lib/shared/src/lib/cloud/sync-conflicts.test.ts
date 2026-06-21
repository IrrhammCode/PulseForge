import { describe, expect, it } from "vitest";
import type { StudioProject } from "@/types/studio";
import { EMPTY_LYRICS } from "@/types/studio";
import {
  detectSyncConflicts,
  mergeProjectsWithResolutions,
} from "@/lib/cloud/sync-conflicts";

function project(
  id: string,
  title: string,
  updatedAt: string
): StudioProject {
  return {
    id,
    title,
    artistName: "Artist",
    genre: "Pop",
    mood: "Energetic",
    status: "draft",
    versions: [
      {
        id: "v1",
        label: "v1",
        lyrics: { ...EMPTY_LYRICS },
        createdAt: updatedAt,
        updatedAt,
      },
    ],
    activeVersionId: "v1",
    createdAt: updatedAt,
    updatedAt,
  };
}

describe("sync-conflicts", () => {
  it("detects projects with same id but different updatedAt", () => {
    const local = [project("p1", "Local", "2026-06-16T10:00:00.000Z")];
    const cloud = [project("p1", "Cloud", "2026-06-16T12:00:00.000Z")];
    const conflicts = detectSyncConflicts(local, cloud);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0]!.projectId).toBe("p1");
  });

  it("merge newest keeps cloud when cloud is newer", () => {
    const local = [project("p1", "Local", "2026-06-16T10:00:00.000Z")];
    const cloud = [project("p1", "Cloud", "2026-06-16T12:00:00.000Z")];
    const result = mergeProjectsWithResolutions({
      local,
      cloud,
      conflictPolicy: "newest",
    });
    expect(result.merged[0]!.title).toBe("Cloud");
    expect(result.keptCloud).toBe(1);
  });

  it("explicit resolution overrides policy", () => {
    const local = [project("p1", "Local", "2026-06-16T10:00:00.000Z")];
    const cloud = [project("p1", "Cloud", "2026-06-16T12:00:00.000Z")];
    const result = mergeProjectsWithResolutions({
      local,
      cloud,
      conflictPolicy: "newest",
      resolutions: { p1: "local" },
    });
    expect(result.merged[0]!.title).toBe("Local");
    expect(result.keptLocal).toBe(1);
  });

  it("adds cloud-only projects on merge", () => {
    const local: StudioProject[] = [];
    const cloud = [project("p2", "Only Cloud", "2026-06-16T12:00:00.000Z")];
    const result = mergeProjectsWithResolutions({ local, cloud });
    expect(result.merged).toHaveLength(1);
    expect(result.merged[0]!.id).toBe("p2");
  });
});