import type { MxmCoachContext } from "@/types";
import type { SongCreativeBrief, StudioProject } from "@/types/studio";
import type { TimelineEdits } from "@/types/viral";
import { resolveGenreLabels, resolveMoodLabels } from "@/types/studio";
import {
  buildArrangementPromptSuffix,
  buildCompositionPlanWithArrangement,
} from "@/lib/studio/music-arrangement";

export type SectionKey = "intro" | "verse1" | "chorus" | "verse2" | "bridge" | "outro";

const SECTION_STYLE_HINTS: Record<SectionKey, string[]> = {
  intro: [
    "atmospheric opening",
    "build anticipation",
    "sparse vocal ad-libs or humming",
  ],
  verse1: [
    "intimate close-mic vocal",
    "sparse instrumentation building",
    "personal storytelling delivery",
  ],
  chorus: [
    "full arrangement lift",
    "anthemic hook emphasis",
    "energetic vocal power",
  ],
  verse2: [
    "added rhythmic layers",
    "deeper emotional delivery",
    "subtle variation from verse one",
  ],
  bridge: [
    "dynamic contrast",
    "tension release or breakdown",
    "unexpected texture shift",
  ],
  outro: [
    "emotional resolution",
    "fade with stripped instrumentation",
    "final vocal ad-libs or hook fragment",
  ],
};

const MOOD_PRODUCTION_MAP: Record<string, string[]> = {
  energetic: ["driving beats", "bright energetic vocals", "forward momentum"],
  melancholic: ["expressive soulful vocals", "atmospheric production", "emotional weight"],
  uplifting: ["soaring melodies", "hopeful vocal tone", "open bright mix"],
  dark: ["moody bass", "brooding atmosphere", "intense vocal edge"],
  romantic: ["warm intimate vocals", "soft lush textures", "tender delivery"],
  chill: ["laid-back groove", "smooth warm vocals", "relaxed pocket"],
  aggressive: ["hard-hitting drums", "raw vocal intensity", "punchy mix"],
};

function mxmMoodDescriptors(moods: string[]): string[] {
  const lower = moods.map((m) => m.toLowerCase());
  const out: string[] = [];
  if (
    lower.some((m) =>
      ["energetic", "upbeat", "dance", "happy", "party", "excited"].some((k) => m.includes(k))
    )
  ) {
    out.push(...MOOD_PRODUCTION_MAP.energetic);
  } else if (
    lower.some((m) => ["sad", "melancholic", "emotional", "heartbreak"].some((k) => m.includes(k)))
  ) {
    out.push(...MOOD_PRODUCTION_MAP.melancholic);
  } else if (lower.some((m) => ["chill", "relaxed", "calm"].some((k) => m.includes(k)))) {
    out.push(...MOOD_PRODUCTION_MAP.chill);
  } else if (lower.some((m) => ["dark", "angry", "intense"].some((k) => m.includes(k)))) {
    out.push(...MOOD_PRODUCTION_MAP.dark);
  }
  return out;
}

function projectMoodDescriptors(moods: string[]): string[] {
  const out: string[] = [];
  for (const mood of moods) {
    const key = mood.toLowerCase();
    const mapped = MOOD_PRODUCTION_MAP[key];
    if (mapped) out.push(...mapped);
  }
  return out;
}

/** Merge project tags, MXM coach, and creative brief into production style cues. */
export function buildStyleDescriptors(
  project: Pick<
    StudioProject,
    "genre" | "mood" | "genreTags" | "moodTags" | "genreCustom" | "moodCustom" | "bpmTarget" | "creativeBrief"
  >,
  mxmCoach?: MxmCoachContext
): string[] {
  const genres = resolveGenreLabels(project);
  const moods = resolveMoodLabels(project);
  const descriptors = new Set<string>();

  if (genres.length) {
    descriptors.add(`${genres.join(" × ")} production`);
  }
  for (const hint of projectMoodDescriptors(moods)) descriptors.add(hint);

  const mxmMoods = mxmCoach?.moods ?? [];
  for (const hint of mxmMoodDescriptors(mxmMoods)) descriptors.add(hint);

  const themes = (mxmCoach?.themes ?? []).slice(0, 3);
  if (themes.length) descriptors.add(themes.join(", "));

  const brief = project.creativeBrief;
  if (brief?.vocalCharacter?.trim()) {
    descriptors.add(brief.vocalCharacter.trim().slice(0, 72));
  }
  if (brief?.productionNotes?.trim()) {
    descriptors.add(brief.productionNotes.trim().slice(0, 72));
  }
  if (project.bpmTarget) descriptors.add(`${project.bpmTarget} BPM feel`);

  return [...descriptors];
}

export function buildSectionStyles(
  section: SectionKey,
  baseDescriptors: string[],
  brief?: SongCreativeBrief
): string[] {
  const sectionHints = SECTION_STYLE_HINTS[section] ?? [];
  const out = [...baseDescriptors, ...sectionHints];
  if (brief?.emotionalArc?.trim() && (section === "chorus" || section === "bridge")) {
    out.push(brief.emotionalArc.trim().slice(0, 72));
  }
  return [...new Set(out)];
}

export function buildFullSongPrompt(
  project: Pick<
    StudioProject,
    | "title"
    | "genre"
    | "mood"
    | "genreTags"
    | "moodTags"
    | "genreCustom"
    | "moodCustom"
    | "bpmTarget"
    | "creativeBrief"
    | "musicArrangement"
  >,
  lyricsBody: string,
  mxmCoach?: MxmCoachContext
): string {
  const styleDescriptors = buildStyleDescriptors(project, mxmCoach);
  const genres = resolveGenreLabels(project);
  const moods = resolveMoodLabels(project);
  const brief = project.creativeBrief;

  const aliveDirectives: string[] = [
    "Natural expressive human singing — not robotic or generic AI demo vocals.",
    "Dynamic arrangement: verses breathe, chorus lifts, bridge contrasts.",
    "Professional mix with clear vocals and intentional production choices.",
  ];

  if (brief?.story?.trim()) {
    aliveDirectives.push(`Song story/scene: ${brief.story.trim()}`);
  }
  if (brief?.listenerMoment?.trim()) {
    aliveDirectives.push(`Hook must deliver this feeling: ${brief.listenerMoment.trim()}`);
  }
  if (brief?.emotionalArc?.trim()) {
    aliveDirectives.push(`Emotional arc: ${brief.emotionalArc.trim()}`);
  }
  const arrangementLine = buildArrangementPromptSuffix(project.musicArrangement);
  if (arrangementLine) aliveDirectives.push(arrangementLine);

  const title = project.title?.trim();
  const genreMoodLine =
    genres.length || moods.length
      ? `Style: ${[...genres, ...moods].join(" × ")}.`
      : "";

  return [
    `Studio-quality full song${title ? ` titled "${title}"` : ""}.`,
    genreMoodLine,
    styleDescriptors.length ? styleDescriptors.join(", ") + "." : "",
    aliveDirectives.join(" "),
    lyricsBody.trim(),
    "Sing the lyrics above exactly using the provided section structure [Verse], [Chorus], etc. Vary energy and intimacy per section — avoid flat same-energy throughout.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildCompositionPlan(
  lyrics: {
    intro: string;
    verse1: string;
    verse2: string;
    chorus: string;
    bridge: string;
    outro: string;
  },
  project: Pick<
    StudioProject,
    | "genre"
    | "mood"
    | "genreTags"
    | "moodTags"
    | "genreCustom"
    | "moodCustom"
    | "bpmTarget"
    | "creativeBrief"
    | "musicArrangement"
  >,
  mxmCoach?: MxmCoachContext
): NonNullable<TimelineEdits["compositionPlan"]> {
  return buildCompositionPlanWithArrangement(lyrics, project, mxmCoach);
}
