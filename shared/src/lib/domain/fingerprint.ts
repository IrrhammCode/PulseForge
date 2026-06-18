import type { DemoAudioMeta, LyricsSections, StudioProject } from "@/types/studio";
import { composeLyricsBody } from "@/lib/studio/lyrics";

/** Stable fingerprint for staleness detection (client + server safe). */
export function computeContentFingerprint(
  lyrics: LyricsSections,
  audio?: DemoAudioMeta,
  projectMeta?: Pick<StudioProject, "title" | "artistName" | "genre" | "mood" | "bpmTarget">
): string {
  const body = composeLyricsBody(lyrics).trim();
  const audioKey = audio
    ? [
        audio.fileName,
        audio.uploadedAt,
        audio.durationSec,
        audio.estimatedBpm ?? "",
        audio.stemsReady ? "1" : "0",
      ].join("|")
    : "";

  const metaKey = projectMeta
    ? [projectMeta.title, projectMeta.artistName, projectMeta.genre, projectMeta.mood, projectMeta.bpmTarget ?? ""].join("|")
    : "";

  const raw = `${body}::${audioKey}::${metaKey}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}