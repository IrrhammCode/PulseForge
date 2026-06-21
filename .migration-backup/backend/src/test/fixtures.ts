import type { StudioProject } from "@pulseforge/shared/types/studio";
import { EMPTY_LYRICS } from "@pulseforge/shared/types/studio";

export function mockProject(
  id: string,
  title: string,
  updatedAt: string
): StudioProject {
  return {
    id,
    title,
    artistName: "Test Artist",
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