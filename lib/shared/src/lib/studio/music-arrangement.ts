import type { MxmCoachContext } from "@/types";
import type {
  MusicArrangement,
  SectionMusicDirection,
  SongCreativeBrief,
  StudioProject,
} from "@/types/studio";
import type { LyricsSections } from "@/types/studio";
import type { TimelineEdits } from "@/types/viral";
import {
  compactCompositionPlan,
  sanitizeCompositionPlan,
} from "@/lib/studio/composition-plan-sanitize";
import {
  buildSectionStyles,
  buildStyleDescriptors,
  type SectionKey,
} from "@/lib/studio/style-prompt";
import {
  buildSectionVocalPositive,
  buildVocalNegativeStyles,
  enrichLyricsWithVocalCues,
  vocalContextAdherence,
  VOCAL_NEGATIVE_AI,
  EMPTY_VOCAL_DIRECTION,
} from "@/lib/studio/vocal-direction";
import { resolveGenreLabels, resolveMoodLabels } from "@/types/studio";

export type CompositionPlanChunk = NonNullable<TimelineEdits["compositionPlan"]>["chunks"][number];

export const INSTRUMENT_OPTIONS = [
  "Acoustic guitar",
  "Electric guitar",
  "Piano",
  "Synth pads",
  "808 bass",
  "Live drums",
  "Strings",
  "Brass",
  "Vinyl texture",
  "Afro percussion",
] as const;

export const DEFAULT_NEGATIVE_GLOBAL = [
  "generic AI demo",
  "flat same energy throughout",
  "amateur mix",
  "harsh clipping",
  ...VOCAL_NEGATIVE_AI,
];

export const PARTNER_SONG_PIPELINE = [
  {
    partner: "ElevenLabs Music",
    role: "Full song via composition_plan (music_v2) — lyrics, intro/outro, per-section backing",
  },
  {
    partner: "ElevenLabs Stems",
    role: "Split Eleven-generated tracks — best for Music API output",
  },
  {
    partner: "LALAL.AI",
    role: "Multistem separation on any mix — vocals/drums/bass for NLE editing",
  },
  {
    partner: "Cyanite",
    role: "After export: energy curve → automation hints in Produce",
  },
  {
    partner: "Musixmatch",
    role: "Richsync timing for intro/chorus markers on catalog tracks",
  },
] as const;

const SECTION_LABEL: Record<SectionKey, string> = {
  intro: "Intro",
  verse1: "Verse 1",
  chorus: "Chorus",
  verse2: "Verse 2",
  bridge: "Bridge",
  outro: "Outro",
};

const SECTION_DURATION: Record<SectionKey, number> = {
  intro: 16000,
  verse1: 28000,
  chorus: 26000,
  verse2: 28000,
  bridge: 20000,
  outro: 18000,
};

const DEFAULT_SECTION_NEGATIVE: Partial<Record<SectionKey, string[]>> = {
  intro: ["full vocals", "loud drums", "abrupt start"],
  outro: ["building intensity", "new sections", "abrupt cut"],
  verse1: ["anthemic full band", "a cappella"],
  chorus: ["sparse", "minimal", "a cappella"],
};

function parseStyleList(text?: string): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatChunkText(
  section: SectionKey,
  lyrics: string,
  direction?: SectionMusicDirection,
  vocal?: MusicArrangement["vocal"]
): string {
  const label = SECTION_LABEL[section];
  const cues = direction?.inlineCues?.trim();
  const instrumental = direction?.instrumental;

  let body = lyrics.trim();
  if (!instrumental && body) {
    body = enrichLyricsWithVocalCues(section, body, vocal, false);
  }

  if (instrumental && !body) {
    body = cues ? `{${cues}}` : "{instrumental}";
  } else if (cues) {
    body = `${body}\n{${cues}}`;
  }

  return body ? `[${label}]\n${body}` : `[${label}]`;
}

function buildChunkStyles(
  section: SectionKey,
  base: string[],
  project: Pick<
    StudioProject,
    "genre" | "mood" | "genreTags" | "moodTags" | "genreCustom" | "moodCustom" | "bpmTarget" | "creativeBrief"
  >,
  arrangement?: MusicArrangement,
  isFirstChunk = false,
  isFirstVocalChunk = false
): { positive: string[]; negative: string[] } {
  const dir = arrangement?.sections?.[section];
  const instrumental = Boolean(dir?.instrumental);
  const genres = resolveGenreLabels(project);
  const moods = resolveMoodLabels(project);
  const positive = new Set(buildSectionStyles(section, base, project.creativeBrief));

  if (!instrumental) {
    for (const v of buildSectionVocalPositive(
      section,
      arrangement?.vocal,
      project.creativeBrief,
      genres,
      moods,
      isFirstVocalChunk
    )) {
      positive.add(v);
    }
  }

  for (const inst of arrangement?.instruments ?? []) positive.add(inst);
  if (arrangement?.accompaniment?.trim()) positive.add(arrangement.accompaniment.trim());
  if (arrangement?.harmony?.trim()) positive.add(arrangement.harmony.trim());
  if (arrangement?.musicalKey?.trim()) positive.add(arrangement.musicalKey.trim());
  if (dir?.backing?.trim()) positive.add(dir.backing.trim());
  if (dir?.melody?.trim()) positive.add(dir.melody.trim());

  if (isFirstChunk) {
    positive.add("polished studio production");
    positive.add("great production quality");
  }

  if (isFirstVocalChunk && !instrumental) {
    positive.add("human singer not synthetic");
    positive.add("dynamic vocal expression");
  }

  if (section === "intro") {
    positive.add("gradual build");
    if (dir?.instrumental) positive.add("instrumental opening bed");
  }
  if (section === "outro") {
    positive.add("gentle fade out");
    if (dir?.instrumental) positive.add("instrumental fade");
  }

  const negative = new Set<string>([
    ...(arrangement?.negativeGlobal ?? DEFAULT_NEGATIVE_GLOBAL),
    ...(DEFAULT_SECTION_NEGATIVE[section] ?? []),
    ...parseStyleList(dir?.avoid),
    ...buildVocalNegativeStyles(arrangement?.vocal, section, instrumental),
  ]);

  return {
    positive: [...positive].slice(0, 50),
    negative: [...negative].slice(0, 50),
  };
}

/** Full ElevenLabs music_v2 composition plan with arrangement + intro/outro control. */
export function buildCompositionPlanWithArrangement(
  lyrics: Pick<LyricsSections, SectionKey>,
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
  const arrangement = project.musicArrangement;
  const base = buildStyleDescriptors(project, mxmCoach);
  const order: SectionKey[] = ["intro", "verse1", "chorus", "verse2", "bridge", "outro"];
  const chunks: CompositionPlanChunk[] = [];
  let isFirst = true;
  let isFirstVocal = true;

  for (const section of order) {
    const text = lyrics[section];
    const dir = arrangement?.sections?.[section];
    if (!text?.trim() && !dir?.instrumental) continue;

    const instrumental = Boolean(dir?.instrumental);
    const { positive, negative } = buildChunkStyles(
      section,
      base,
      project,
      arrangement,
      isFirst,
      isFirstVocal && !instrumental
    );
    chunks.push({
      text: formatChunkText(section, text, dir, arrangement?.vocal),
      duration_ms: SECTION_DURATION[section],
      positive_styles: positive,
      negative_styles: negative,
      context_adherence: vocalContextAdherence(section),
    });
    isFirst = false;
    if (!instrumental && text.trim()) isFirstVocal = false;
  }

  // Repeat chorus after verse 2 — optional lift (can stress ElevenLabs on long plans)
  const verse2Idx = chunks.findIndex((c) => c.text.startsWith("[Verse 2]"));
  const totalBeforeRepeat = chunks.reduce((s, c) => s + (c.duration_ms ?? 0), 0);
  if (
    lyrics.chorus.trim() &&
    verse2Idx >= 0 &&
    totalBeforeRepeat < 130_000
  ) {
    const { positive, negative } = buildChunkStyles(
      "chorus",
      base,
      project,
      arrangement,
      false,
      false
    );
    positive.push("maximum energy", "repeatable hook", "full band", "biggest vocal belt of the song");
    chunks.splice(verse2Idx + 1, 0, {
      text: `[Chorus]\n${lyrics.chorus.trim()}`,
      duration_ms: SECTION_DURATION.chorus,
      positive_styles: positive,
      negative_styles: negative,
      context_adherence: "high",
    });
  }

  return sanitizeCompositionPlan({ chunks });
}

export function estimateCompositionPlanDurationMs(
  plan: NonNullable<TimelineEdits["compositionPlan"]>
): number {
  return plan.chunks.reduce((sum, c) => sum + (c.duration_ms ?? 20000), 0);
}

/** Fallback natural-language prompt when composition plan unavailable. */
export function buildArrangementPromptSuffix(arrangement?: MusicArrangement): string {
  if (!arrangement) return "";
  const parts: string[] = [];
  if (arrangement.instruments?.length) parts.push(`Instruments: ${arrangement.instruments.join(", ")}`);
  if (arrangement.accompaniment) parts.push(`Backing: ${arrangement.accompaniment}`);
  if (arrangement.harmony) parts.push(`Harmony: ${arrangement.harmony}`);
  if (arrangement.musicalKey) parts.push(`Key: ${arrangement.musicalKey}`);
  return parts.length ? parts.join(". ") + "." : "";
}

export const EMPTY_MUSIC_ARRANGEMENT: MusicArrangement = {
  instruments: [],
  negativeGlobal: [...DEFAULT_NEGATIVE_GLOBAL],
  stemEngine: "auto",
  vocal: { ...EMPTY_VOCAL_DIRECTION },
  sections: {},
};
