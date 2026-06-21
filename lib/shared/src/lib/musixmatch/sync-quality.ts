import type { LyricsSections } from "../../types/studio";
import type { ProjectLine } from "./audio-vocal-sync";

const SECTION_ORDER: Array<keyof Omit<LyricsSections, "raw">> = [
  "intro",
  "verse1",
  "chorus",
  "verse2",
  "bridge",
  "outro",
];

/** Flatten structured lyrics into per-line entries tagged with their section. */
export function collectProjectLinesWithSections(
  lyrics: LyricsSections,
): ProjectLine[] {
  const out: ProjectLine[] = [];

  for (const section of SECTION_ORDER) {
    const block = (lyrics[section] || "").trim();
    if (!block) continue;
    for (const raw of block.split(/\r?\n/)) {
      const text = raw.trim();
      if (text) out.push({ text, section });
    }
  }

  if (!out.length && lyrics.raw) {
    for (const raw of lyrics.raw.split(/\r?\n/)) {
      const text = raw.trim();
      if (text) out.push({ text });
    }
  }

  return out;
}
