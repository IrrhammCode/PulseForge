import type { SongCreativeBrief, VocalDirection } from "@/types/studio";
import type { SectionKey } from "@/lib/studio/style-prompt";
import { resolveGenreLabels, resolveMoodLabels } from "@/types/studio";

/** ElevenLabs negative_styles — push back generic AI singing. */
export const VOCAL_NEGATIVE_AI = [
  "robotic vocals",
  "TTS singing",
  "flat monotonous delivery",
  "generic AI pop vocal",
  "lifeless singing",
  "synthetic voice",
  "over-autotuned",
  "same energy every line",
  "nursery rhyme delivery",
] as const;

export const VOICE_TYPE_OPTIONS = [
  { id: "female", label: "Female", style: "female vocalist with clear human tone" },
  { id: "male", label: "Male", style: "male vocalist with natural warmth" },
  { id: "androgynous", label: "Androgynous", style: "androgynous vocalist with distinctive tone" },
  { id: "duet", label: "Duet", style: "male and female vocal duet with call and response" },
] as const;

export const VOCAL_DELIVERY_OPTIONS = [
  {
    id: "intimate",
    label: "Intimate & breathy",
    styles: ["intimate close-mic vocal", "breathy natural phrasing", "soft consonants"],
  },
  {
    id: "conversational",
    label: "Conversational",
    styles: ["conversational singing like talking to a friend", "natural speech rhythm in melody"],
  },
  {
    id: "belt",
    label: "Power belt",
    styles: ["powerful emotional belt", "anthemic chest voice on hook", "dynamic vocal lift"],
  },
  {
    id: "soulful",
    label: "Soulful",
    styles: ["soulful expressive vocals", "subtle melismatic runs", "emotional vibrato"],
  },
  {
    id: "raspy",
    label: "Raw & raspy",
    styles: ["slightly raspy human vocal", "raw emotional edge", "imperfect human texture"],
  },
  {
    id: "airy",
    label: "Airy & light",
    styles: ["light airy vocal tone", "floating head voice phrases", "delicate delivery"],
  },
] as const;

const SECTION_VOCAL_POSITIVE: Record<SectionKey, string[]> = {
  intro: [
    "soft vocal ad-libs or humming",
    "human vocal texture",
    "gentle anticipatory delivery",
  ],
  verse1: [
    "intimate storytelling vocal",
    "close-mic natural breath between lines",
    "understated conversational delivery",
  ],
  chorus: [
    "powerful anthemic vocals",
    "emotional peak on hook line",
    "layered vocal doubles on chorus",
  ],
  verse2: [
    "deeper emotional delivery than verse one",
    "slightly more confident vocal tone",
    "subtle phrasing variation",
  ],
  bridge: [
    "vulnerable raw vocal contrast",
    "dynamic shift in vocal intensity",
    "honest emotional break in delivery",
  ],
  outro: [
    "fading vocal ad-libs",
    "repeated hook fragment with breath",
    "gentle human vocal decay",
  ],
};

const SECTION_INLINE_CUES: Partial<Record<SectionKey, string>> = {
  verse1: "natural breath before emotional line",
  chorus: "slight vocal push on hook words",
  verse2: "more conviction in phrasing",
  bridge: "vulnerable vocal break then resolve",
  outro: "soft ad-lib fade",
};

const GENRE_VOCAL_HINTS: Record<string, string[]> = {
  pop: ["radio-ready pop vocal", "catchy melodic phrasing"],
  "indie pop": ["indie vocal with human imperfection", "unpolished authentic tone"],
  "hip-hop": ["rhythmic pocket on beat", "rap-sung hybrid flow where needed"],
  "r&b": ["smooth R&B vocal runs", "warm melismatic phrases"],
  electronic: ["expressive vocal over synth bed", "clear diction through production"],
  rock: ["gritty rock vocal edge", "passionate live-singer energy"],
  afrobeats: ["afro vocal groove", "rhythmic call-and-response feel"],
  latin: ["latin vocal passion", "syncopated vocal rhythm"],
};

function parseList(text?: string): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function voiceTypeStyle(vocal?: VocalDirection): string | undefined {
  if (!vocal?.voiceType) return undefined;
  return VOICE_TYPE_OPTIONS.find((o) => o.id === vocal.voiceType)?.style;
}

function deliveryStyles(vocal?: VocalDirection): string[] {
  if (!vocal?.delivery) return [];
  const preset = VOCAL_DELIVERY_OPTIONS.find((o) => o.id === vocal.delivery);
  return preset ? [...preset.styles] : [];
}

function genreVocalHints(genres: string[]): string[] {
  const out: string[] = [];
  for (const g of genres) {
    const key = g.toLowerCase();
    for (const [genre, hints] of Object.entries(GENRE_VOCAL_HINTS)) {
      if (key.includes(genre)) out.push(...hints);
    }
  }
  return out;
}

/** Global vocal identity for first chunk — ElevenLabs says first chunk sets vocal tone. */
export function buildGlobalVocalIdentity(
  vocal: VocalDirection | undefined,
  brief: SongCreativeBrief | undefined,
  genres: string[],
  moods: string[]
): string[] {
  const out = new Set<string>([
    "human expressive singing",
    "natural vocal phrasing with breath",
    "professional recorded vocal performance",
  ]);

  const voiceStyle = voiceTypeStyle(vocal);
  if (voiceStyle) out.add(voiceStyle);
  if (vocal?.preferredVoiceHint?.trim()) out.add(vocal.preferredVoiceHint.trim());
  if (vocal?.customCharacter?.trim()) out.add(vocal.customCharacter.trim());
  if (brief?.vocalCharacter?.trim()) out.add(brief.vocalCharacter.trim());

  for (const s of deliveryStyles(vocal)) out.add(s);
  for (const s of genreVocalHints(genres)) out.add(s);

  const moodJoined = moods.join(" ").toLowerCase();
  if (moodJoined.includes("melancholic") || moodJoined.includes("romantic")) {
    out.add("tender emotional vocal delivery");
  }
  if (moodJoined.includes("energetic") || moodJoined.includes("uplifting")) {
    out.add("bright energetic vocal tone");
  }
  if (moodJoined.includes("aggressive") || moodJoined.includes("dark")) {
    out.add("intense edgy vocal delivery");
  }

  return [...out];
}

export function buildSectionVocalPositive(
  section: SectionKey,
  vocal: VocalDirection | undefined,
  brief: SongCreativeBrief | undefined,
  genres: string[],
  moods: string[],
  isFirstVocalChunk: boolean
): string[] {
  const out = new Set<string>(SECTION_VOCAL_POSITIVE[section] ?? []);

  if (isFirstVocalChunk) {
    for (const s of buildGlobalVocalIdentity(vocal, brief, genres, moods)) out.add(s);
    out.add("great production quality");
    out.add("polished studio vocal mix");
  } else if (section === "chorus") {
    out.add("maximum vocal energy on hook");
    const belt = VOCAL_DELIVERY_OPTIONS.find((o) => o.id === "belt");
    if (belt) belt.styles.forEach((s) => out.add(s));
  }

  if (brief?.emotionalArc?.trim() && (section === "chorus" || section === "bridge")) {
    out.add(brief.emotionalArc.trim().slice(0, 72));
  }
  if (brief?.listenerMoment?.trim() && section === "chorus") {
    out.add("emotional hook lift");
  }

  return [...out];
}

export function buildVocalNegativeStyles(
  vocal: VocalDirection | undefined,
  section: SectionKey,
  instrumental: boolean
): string[] {
  if (instrumental) {
    return ["lead vocals", "full vocal line", "singing"];
  }

  const out = new Set<string>(VOCAL_NEGATIVE_AI);
  for (const item of parseList(vocal?.avoid)) out.add(item);

  if (section === "verse1" || section === "verse2") {
    out.add("shouting");
    out.add("anthemic belt throughout");
  }
  if (section === "intro") {
    out.add("full loud lead vocal");
  }

  return [...out];
}

/** Inline {cue} + optional phonetic ad-libs per ElevenLabs text field rules. */
export function enrichLyricsWithVocalCues(
  section: SectionKey,
  lyrics: string,
  vocal: VocalDirection | undefined,
  instrumental: boolean
): string {
  if (instrumental || !lyrics.trim()) return lyrics;

  const lines = lyrics.trim().split("\n");
  const cues: string[] = [];

  const sectionCue = SECTION_INLINE_CUES[section];
  if (sectionCue) cues.push(sectionCue);

  if (vocal?.adLibs !== false) {
    if (section === "intro" && lines.length > 0) {
      lines.unshift("(mmm)");
    }
    if (section === "chorus" && lines.length > 1) {
      lines.push("(yeah)");
    }
    if (section === "outro" && lines.length > 0) {
      lines.push("(oh)");
    }
  }

  let body = lines.join("\n");
  if (cues.length) {
    body = `${body}\n{${cues.join(", ")}}`;
  }

  return body;
}

export function vocalContextAdherence(
  section: SectionKey
): "low" | "medium" | "high" {
  if (section === "bridge") return "medium";
  if (section === "chorus") return "high";
  return "high";
}

export const EMPTY_VOCAL_DIRECTION: VocalDirection = {
  voiceType: "female",
  delivery: "intimate",
  adLibs: true,
};
