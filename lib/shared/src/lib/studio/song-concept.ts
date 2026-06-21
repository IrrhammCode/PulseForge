import type { LyricsSections, SongCreativeBrief, StudioProject } from "@/types/studio";
import type { MxmCoachContext } from "@/types";
import { resolveGenreLabels, resolveMoodLabels } from "@/types/studio";

export const CONCEPT_FIELD_HINTS: {
  key: keyof SongCreativeBrief;
  label: string;
  placeholder: string;
  tip: string;
}[] = [
  {
    key: "story",
    label: "Song story",
    placeholder: "e.g. 2am taxi ride home after a fight — city lights blur, phone still unlocked",
    tip: "One vivid scene beats ten vague themes. Real songs anchor in a moment.",
  },
  {
    key: "emotionalArc",
    label: "Emotional arc",
    placeholder: "e.g. denial in verse → surrender in chorus → quiet hope in bridge",
    tip: "Listeners feel movement. Verses set tension, chorus releases it.",
  },
  {
    key: "vocalCharacter",
    label: "Vocal character",
    placeholder: "e.g. breathy and close in verses, raw belt on the hook",
    tip: "Tell the AI how the voice should behave — not just what genre it is.",
  },
  {
    key: "listenerMoment",
    label: "Hook feeling",
    placeholder: "e.g. goosebumps when the chorus hits — 'I finally said it out loud'",
    tip: "What should the listener feel in the first 15 seconds of the chorus?",
  },
  {
    key: "productionNotes",
    label: "Production vibe",
    placeholder: "e.g. dusty vinyl drums, analog synth swells, no EDM supersaw clichés",
    tip: "Specific textures keep output from sounding like generic AI pop.",
  },
];

export const LIVING_SONG_PRINCIPLES = [
  "Anchor lyrics in a specific scene, not abstract feelings only.",
  "Verse = detail & tension. Chorus = release & the line people repeat.",
  "Change something every section: perspective, image, or energy.",
  "The hook should land in the first 15 seconds when possible.",
  "Mix genre tags boldly — e.g. Afrobeats × Dark × R&B tells a richer story than one label.",
];

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

function moodTone(moods: string[]): "warm" | "dark" | "bright" | "intimate" {
  const joined = moods.join(" ").toLowerCase();
  if (["dark", "aggressive", "melancholic"].some((m) => joined.includes(m))) return "dark";
  if (["romantic", "chill"].some((m) => joined.includes(m))) return "intimate";
  if (["energetic", "uplifting"].some((m) => joined.includes(m))) return "bright";
  return "warm";
}

/** Generate section-aware starter lyrics from genre/mood mix + optional brief. */
export function generateLyricsStarter(
  project: Pick<
    StudioProject,
    "title" | "genreTags" | "moodTags" | "genre" | "mood" | "genreCustom" | "moodCustom" | "creativeBrief"
  >
): LyricsSections {
  const genres = resolveGenreLabels(project);
  const moods = resolveMoodLabels(project);
  const tone = moodTone(moods);
  const title = project.title?.trim() || "Untitled";
  const story =
    project.creativeBrief?.story?.trim() ||
    `a late-night moment tied to "${title}"`;

  const genreFlavor = genres[0]?.toLowerCase() ?? "pop";
  const moodWord = moods[0]?.toLowerCase() ?? "emotional";

  const verse1ByTone: Record<typeof tone, string> = {
    bright: `Neon on the windshield, heartbeat in sync\n${story} — don't wanna overthink\nEvery word I held back starts to spill\nChasing the rush, climbing the hill`,
    dark: `Shadows on the wall where your name used to be\n${story} — nobody talks like we\nCold air, loud thoughts, can't turn it down\nLost in the static of this empty town`,
    intimate: `Soft light on the sheets, your voice in my ear\n${story} — wish you were still here\nSmall room, big feeling, time moves slow\nThings I never said but you already know`,
    warm: `Morning coffee steam, sunlight on the floor\n${story} — opening one more door\nSteps feel lighter than yesterday's weight\nSomething shifting — can't call it fate`,
  };

  const chorusByTone: Record<typeof tone, string> = {
    bright: `We're alive in the ${moodWord} tonight\n${title} — burning too bright to hide\nSay it loud, let the whole world know\nThis is the feeling we came here for`,
    dark: `Break me open in the ${moodWord} dark\n${title} — leaving its mark\nNo turning back from what we became\nSay my name like a slow-burning flame`,
    intimate: `Hold me close through the ${moodWord} rain\n${title} — joy and the pain\nWhisper the truth we were scared to say\nStay — don't let this moment fade away`,
    warm: `Rise with me in this ${moodWord} glow\n${title} — letting it show\nHearts on the table, nothing to prove\nThis is the love we were born to move`,
  };

  const verse2ByTone: Record<typeof tone, string> = {
    bright: `Past me said play it safe, stay in line\nNow the ${genreFlavor} pulse says it's our time\nScreenshots fade but the echo remains\nRunning toward thunder, dancing in rain`,
    dark: `Mirror shows a stranger wearing my face\n${genreFlavor} bass like a locked-up place\nTried to forget but the melody knows\nEvery secret the chorus still holds`,
    intimate: `Your jacket on the chair, perfume in the air\n${genreFlavor} chords hanging everywhere\nAlmost called you — thumb on the screen\nCaught between what was and what could've been`,
    warm: `Road trip maps and half-finished plans\n${genreFlavor} rhythm in both our hands\nLaughing at ghosts we left behind\nNew chapter written, undefined`,
  };

  const bridgeByTone: Record<typeof tone, string> = {
    bright: `Drop the beat — breathe — then we soar again\nNo script, just truth, let the walls cave in`,
    dark: `Silence cuts deeper than any verse\nIf this is the end, make it hurt`,
    intimate: `One last look before the dawn breaks through\nI mean every word — especially to you`,
    warm: `Slow it down, feel the ground beneath\nEvery ending plants a new seed`,
  };

  const introByTone: Record<typeof tone, string> = {
    bright: `(Yeah) feel that ${genreFlavor} pulse rise\nOne breath before the story flies`,
    dark: `(Mmm) static hum beneath the skin\nSomething wicked pulling me in`,
    intimate: `(Oh) soft keys in the quiet room\nHeart already knows what's coming soon`,
    warm: `(Hey) sunrise on the edge of sound\nFeet about to leave the ground`,
  };

  const outroByTone: Record<typeof tone, string> = {
    bright: `${title} — echo in the night\nFade on the hook, hold the light`,
    dark: `Name in the dark, then silence falls\n${title} — ghost on the walls`,
    intimate: `Stay in the hum till the tape runs out\nOne last whisper, no doubt`,
    warm: `Let it ring, let it slow, let it go\n${title} — soft afterglow`,
  };

  const hash = title.length + genres.join("").length;
  return {
    intro: introByTone[tone],
    verse1: verse1ByTone[tone],
    chorus: chorusByTone[tone],
    verse2: verse2ByTone[tone],
    bridge: pick(
      [
        bridgeByTone[tone],
        `${bridgeByTone[tone]}\n${moods[1] ? `Feel that ${moods[1].toLowerCase()} shift` : "Feel the shift"}`,
      ],
      hash
    ),
    outro: outroByTone[tone],
    raw: "",
  };
}

/** Fill empty lyric sections from creative brief without overwriting user work. */
export function applyConceptToLyrics(
  project: Pick<
    StudioProject,
    "title" | "genreTags" | "moodTags" | "genre" | "mood" | "genreCustom" | "moodCustom" | "creativeBrief"
  >,
  existing: LyricsSections
): LyricsSections {
  const starter = generateLyricsStarter(project);
  const fill = (current: string, fallback: string) => (current.trim() ? current : fallback);
  return {
    intro: fill(existing.intro, starter.intro),
    verse1: fill(existing.verse1, starter.verse1),
    chorus: fill(existing.chorus, starter.chorus),
    verse2: fill(existing.verse2, starter.verse2),
    bridge: fill(existing.bridge, starter.bridge),
    outro: fill(existing.outro, starter.outro),
    raw: existing.raw,
  };
}

/**
 * One-click Auto Fix helper: builds rich updates from MXM coach + optional full analysis.
 * Maximizes integration: brief, lyrics, tags, arrangement hints.
 */
export function buildAutoFixPatches(
  mxmCoach: MxmCoachContext | undefined,
  currentProject: any,
  analysis?: any
) {
  const moods: string[] = mxmCoach?.moods || (analysis?.meta?.mxmCoach?.moods || []);
  const themes: string[] = mxmCoach?.themes || (analysis?.meta?.mxmCoach?.themes || []);

  const moodPatch = moods.length > 0 ? moods.slice(0, 3) : currentProject.moodTags;

  const meaning = analysis?.meaning?.explanation || analysis?.lyrics?.analysis || 
    `Captured ${moods[0] || 'raw'} emotions with themes of ${themes[0] || 'longing'}.`;

  const briefPatch = {
    story: meaning.slice(0, 320),
    emotionalArc: themes.length ? ` ${themes.slice(0,2).join(' → ')} → ${moods[0] || 'release'}` : undefined,
    listenerMoment: `The ${moods[0] || 'feeling'} lands hard.`,
    vocalCharacter: /heartbreak|angst|vulner/i.test(moods.join(' ')) ? 'Intimate breathy to powerful' : undefined,
  };

  return {
    moodTags: moodPatch,
    creativeBrief: { ...(currentProject.creativeBrief || {}), ...briefPatch },
    musicArrangement: {
      ...(currentProject.musicArrangement || {}),
      stemEngine: 'musixmatch' as const,
    },
  };
}

export function hasCreativeBrief(brief?: SongCreativeBrief): boolean {
  if (!brief) return false;
  return CONCEPT_FIELD_HINTS.some(({ key }) => Boolean(brief[key]?.trim()));
}
