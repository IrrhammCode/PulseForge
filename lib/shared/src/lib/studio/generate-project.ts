import type { LyricsSections, SongCreativeBrief, MusicArrangement } from "@/types/studio";
import { EMPTY_LYRICS } from "@/types/studio";

export interface GeneratedProjectConcept {
  title: string;
  artistName: string;
  genreTags: string[];
  moodTags: string[];
  bpmTarget?: number;
  creativeBrief: SongCreativeBrief;
  musicArrangement: MusicArrangement;
  lyrics: LyricsSections;
  _provider: string;
}

const SYSTEM_PROMPT = `You are a world-class songwriter, A&R, and music producer.
Given a short creative brief (a vibe / "nuansa"), invent a complete original song concept.
Return ONLY a single JSON object (no markdown, no commentary) with exactly this shape:
{
  "title": string,
  "artistName": string,
  "genreTags": string[2-3],
  "moodTags": string[2-3],
  "bpmTarget": number,
  "creativeBrief": {
    "story": string,
    "emotionalArc": string,
    "vocalCharacter": string,
    "listenerMoment": string,
    "productionNotes": string
  },
  "musicArrangement": {
    "instruments": string[],
    "accompaniment": string,
    "harmony": string,
    "musicalKey": string,
    "vocal": { "voiceType": "female"|"male"|"androgynous"|"duet", "delivery": string }
  },
  "lyrics": {
    "intro": string,
    "verse1": string,
    "chorus": string,
    "verse2": string,
    "bridge": string,
    "outro": string
  }
}
Write REAL, complete, singable lyrics for every section (multiple lines each, separated by \\n).
Match the requested language of the brief. Be specific and emotionally vivid. Output JSON only.`;

function extractJson(content: string): Record<string, unknown> | null {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === "string");
  if (typeof v === "string" && v.trim()) return v.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

function normalizeLyrics(v: unknown): LyricsSections {
  const obj = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const lyrics: LyricsSections = {
    intro: asString(obj.intro),
    verse1: asString(obj.verse1),
    verse2: asString(obj.verse2),
    chorus: asString(obj.chorus),
    bridge: asString(obj.bridge),
    outro: asString(obj.outro),
    raw: "",
  };
  const hasAny =
    lyrics.intro || lyrics.verse1 || lyrics.verse2 || lyrics.chorus || lyrics.bridge || lyrics.outro;
  return hasAny ? lyrics : { ...EMPTY_LYRICS };
}

async function callGroq(prompt: string): Promise<{ content: string; provider: string } | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.9,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return null;
    return { content, provider: `groq:${model}` };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Generate a complete original song concept from a free-text creative brief.
 * Uses Groq (OpenAI-compatible). Throws if no AI provider is configured or the
 * provider returns nothing usable, so the caller can surface a clear error.
 */
export async function generateProjectConcept(prompt: string): Promise<GeneratedProjectConcept> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error("A creative brief is required to generate a project.");
  }

  const result = await callGroq(`Creative brief / nuansa: ${trimmed}`);
  if (!result) {
    throw new Error(
      "AI project generation isn't available. Add a GROQ_API_KEY to enable it, then try again."
    );
  }

  const parsed = extractJson(result.content);
  if (!parsed) {
    throw new Error("The AI returned an unexpected response. Please try again.");
  }

  const brief = (parsed.creativeBrief && typeof parsed.creativeBrief === "object"
    ? parsed.creativeBrief
    : {}) as Record<string, unknown>;
  const arrangement = (parsed.musicArrangement && typeof parsed.musicArrangement === "object"
    ? parsed.musicArrangement
    : {}) as Record<string, unknown>;
  const vocal = (arrangement.vocal && typeof arrangement.vocal === "object"
    ? arrangement.vocal
    : {}) as Record<string, unknown>;

  const voiceTypeRaw = asString(vocal.voiceType);
  const voiceType = (["female", "male", "androgynous", "duet"] as const).find(
    (t) => t === voiceTypeRaw
  );

  const bpmRaw = parsed.bpmTarget;
  const bpmTarget =
    typeof bpmRaw === "number" && Number.isFinite(bpmRaw)
      ? Math.round(bpmRaw)
      : typeof bpmRaw === "string" && bpmRaw.trim() && Number.isFinite(Number(bpmRaw))
        ? Math.round(Number(bpmRaw))
        : undefined;

  return {
    title: asString(parsed.title) || "Untitled",
    artistName: asString(parsed.artistName) || "AI Generated",
    genreTags: asStringArray(parsed.genreTags),
    moodTags: asStringArray(parsed.moodTags),
    bpmTarget,
    creativeBrief: {
      story: asString(brief.story),
      emotionalArc: asString(brief.emotionalArc),
      vocalCharacter: asString(brief.vocalCharacter),
      listenerMoment: asString(brief.listenerMoment),
      productionNotes: asString(brief.productionNotes),
    },
    musicArrangement: {
      instruments: asStringArray(arrangement.instruments),
      accompaniment: asString(arrangement.accompaniment) || undefined,
      harmony: asString(arrangement.harmony) || undefined,
      musicalKey: asString(arrangement.musicalKey) || undefined,
      vocal: {
        voiceType,
        customCharacter: asString(vocal.delivery) || asString(vocal.customCharacter) || undefined,
      },
    },
    lyrics: normalizeLyrics(parsed.lyrics),
    _provider: result.provider,
  };
}
