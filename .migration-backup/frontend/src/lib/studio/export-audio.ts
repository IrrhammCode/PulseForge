import type { AudioBlobKind } from "@/lib/studio/audio-db";
import { getAudioBlob } from "@/lib/studio/audio-db";
import type { StudioProject } from "@/types/studio";

export interface AudioExportEntry {
  projectId: string;
  versionId: string;
  kind: AudioBlobKind;
  mimeType: string;
  base64: string;
  sizeBytes: number;
}

const BLOB_KINDS: AudioBlobKind[] = ["mix", "vocals", "drums", "bass", "other"];

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1] ?? "";
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function collectProjectAudioEntries(
  projects: StudioProject[]
): Promise<AudioExportEntry[]> {
  const entries: AudioExportEntry[] = [];

  for (const project of projects) {
    for (const version of project.versions) {
      if (!version.audio) continue;

      for (const kind of BLOB_KINDS) {
        const blob = await getAudioBlob(project.id, version.id, kind);
        if (!blob) continue;
        entries.push({
          projectId: project.id,
          versionId: version.id,
          kind,
          mimeType: blob.type || version.audio.mimeType,
          base64: await blobToBase64(blob),
          sizeBytes: blob.size,
        });
      }
    }
  }

  return entries;
}

export function base64ToBlob(base64: string, mimeType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}