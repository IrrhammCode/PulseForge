import type { LyricsSections, StudioProject } from "@/types/studio";
import { EMPTY_LYRICS } from "@/types/studio";
import type { TrackAnalysis } from "@/types";
import { applyConceptToLyrics, buildAutoFixPatches } from "@/lib/studio/song-concept";
import { parseLyricsSections } from "@/lib/studio/lyrics";
import { SHORT_FORM_TREND_KEYWORDS } from "@/lib/scoring/lyrics-rhyme";

/**
 * Server-side "coach fix" brain for Optimize & Ship.
 *
 * Intelligence tier escalates local -> partner -> ai:
 *  - local:   deterministic engine (buildAutoFixPatches + applyConceptToLyrics).
 *  - partner: enrich patches with Musixmatch (mood/theme/hook), Cyanite
 *             (BPM / mood / instrument / energy) and Songstats (velocity /
 *             playlists / TikTok) signals already present on the baseline
 *             analysis.
 *  - ai:      optional per-section lyric rewrite via B.AI (minimax-m3) -> Groq
 *             -> n8n, whichever is configured. Falls back to partner/local.
 *
 * Every tier always returns a valid result so the feature degrades gracefully
 * when no partner keys are configured.
 */

export type OptimizeTier = "local" | "partner" | "ai";
export type AIBackend = "b.ai" | "groq" | "n8n" | "none";

export interface IntelligentOptimizeInput {
  project: StudioProject;
  analysis: TrackAnalysis;
  lyrics: LyricsSections;
}

export interface IntelligentOptimizePatches {
  moodTags?: string[];
  bpmTarget?: number;
  creativeBrief: Record<string, unknown>;
  musicArrangement: Record<string, unknown>;
}

export interface IntelligentOptimizeResult {
  tier: OptimizeTier;
  aiBackend: AIBackend;
  patches: IntelligentOptimizePatches;
  lyrics: LyricsSections;
  notes: string[];
  intelligence: {
    musixmatch: boolean;
    cyanite: boolean;
    songstats: boolean;
  };
}

const LYRIC_KEYS = [
  "intro",
  "verse1",
  "chorus",
  "verse2",
  "bridge",
  "outro",
] as const;

/**
 * System prompt that targets the EXACT algorithmic scoring levers:
 *  1. hookStrength  = 45 + brevity(short hook) + repeatBonus(line repetition)
 *  2. lyricVirality = hookStrength×0.45 + repetition×0.25 + rhymeDensity×0.12 + chorusCount×4
 *  3. trendAlignment += trendKeywordHits × 3 (up to +18)
 * A vague "improve hook strength" prompt leaves all three unchanged because the
 * AI rewrites words but not structure. These explicit rules target each lever.
 */
const SYSTEM_PROMPT =
  "You are a hit songwriting coach who optimizes lyrics for algorithmic hit-score metrics.\n" +
  "Follow these FOUR rules exactly — they directly raise the score:\n" +
  "1. HOOK REPETITION: Pick one punchy hook line (3–5 words). Repeat it word-for-word " +
  "   at least 4 times across the full song (in chorus, bridge, and outro). " +
  "   Repetition is the #1 score driver.\n" +
  "2. RHYME SCHEME: End every 2nd and 4th line of each section with rhyming words " +
  "   (AABB or ABAB). Rhyme density directly boosts the virality score.\n" +
  "3. TREND KEYWORDS: Naturally weave in 3–5 words from the trending keywords list " +
  "   provided in the context. These words raise the trend-alignment score.\n" +
  "4. BREVITY: Keep the hook/chorus line to 3–5 words. Shorter = higher score.\n" +
  "Preserve the song's language, story, and structure. " +
  "Return ONLY valid JSON with keys: intro, verse1, chorus, verse2, bridge, outro. " +
  "Each value is the rewritten section text (use \\n for line breaks). " +
  "Keep each section a similar length to the original. Do not add commentary.";

/** Build Musixmatch + Cyanite + Songstats enriched patches and launch notes. */
function buildEnrichedPatches(project: StudioProject, analysis: TrackAnalysis): {
  patches: IntelligentOptimizePatches;
  notes: string[];
  intelligence: IntelligentOptimizeResult["intelligence"];
} {
  const base = buildAutoFixPatches(analysis.meta?.mxmCoach, project, analysis);
  const patches: IntelligentOptimizePatches = {
    moodTags: base.moodTags,
    creativeBrief: { ...(base.creativeBrief ?? {}) },
    musicArrangement: { ...(base.musicArrangement ?? {}) },
  };
  const notes: string[] = [];

  const coach = analysis.meta?.mxmCoach;
  const musixmatch = Boolean(
    analysis.meta?.poweredByMusixmatch ||
      coach?.moods?.length ||
      coach?.themes?.length
  );

  // --- Cyanite: BPM / mood / instrument / energy ---
  const energy = analysis.energy;
  const cyanite =
    energy?.source === "cyanite" || energy?.source === "cyanite-processing";
  if (energy) {
    if (energy.bpm && energy.bpm > 0) {
      patches.bpmTarget = Math.round(energy.bpm);
    }
    if (energy.instrumentTags?.length) {
      patches.musicArrangement.instruments = energy.instrumentTags.slice(0, 6);
    }
    if (energy.moodTags?.length) {
      const merged = Array.from(
        new Set([...(patches.moodTags ?? []), ...energy.moodTags])
      ).slice(0, 5);
      patches.moodTags = merged;
    }
    if (energy.caption) {
      patches.creativeBrief.productionNotes = energy.caption;
    }
    if (cyanite) {
      const level = energy.energyLevel ? ` (${energy.energyLevel})` : "";
      notes.push(
        `Cyanite: ${Math.round(energy.bpm)} BPM, energy ${energy.energy}/100${level}.`
      );
    }
  }

  // --- Songstats: velocity / playlists / TikTok / Shazam ---
  const streaming = analysis.streaming;
  const songstats = Boolean(streaming?.available);
  if (streaming?.available) {
    if (streaming.velocityScore) {
      notes.push(
        `Songstats velocity ${streaming.velocityScore}/100 — scale launch budget to momentum.`
      );
    }
    if (streaming.editorialPlaylists) {
      notes.push(
        `${streaming.editorialPlaylists} editorial playlists live — raise playlist pitch count.`
      );
    }
    if (streaming.tiktokCreates) {
      notes.push(
        `${streaming.tiktokCreates} TikTok creates — seed more TikTok posts at launch.`
      );
    }
    if (streaming.shazams) {
      notes.push(`${streaming.shazams} Shazams — discovery demand is real.`);
    }
  }

  // --- Velocity history → Friday release suggestion ---
  const velocityHistory = analysis.velocityHistory as
    | { available?: boolean }
    | undefined;
  if (velocityHistory?.available) {
    notes.push("Historic velocity favors a Friday release window.");
  }

  // --- Artist momentum tier ---
  const momentum = analysis.artistMomentum as { tier?: string } | undefined;
  if (momentum?.tier) {
    notes.push(`Artist momentum tier: ${momentum.tier}.`);
  }

  // --- Musixmatch hook reference + top recommendations ---
  if (coach?.hookQuote) {
    notes.push(`Musixmatch hook reference: "${coach.hookQuote}".`);
  }
  for (const rec of (analysis.recommendations ?? []).slice(0, 2)) {
    notes.push(`${rec.title}: ${rec.description}`);
  }

  return { patches, notes, intelligence: { musixmatch, cyanite, songstats } };
}

function parseLyricsJson(content: unknown): Partial<LyricsSections> | null {
  if (typeof content !== "string") return null;
  try {
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const json = JSON.parse(content.slice(start, end + 1)) as Record<
      string,
      unknown
    >;
    const out: Partial<LyricsSections> = {};
    let found = false;
    for (const key of LYRIC_KEYS) {
      const value = json[key];
      if (typeof value === "string" && value.trim()) {
        out[key] = value;
        found = true;
      }
    }
    return found ? out : null;
  } catch {
    return null;
  }
}

function buildRewritePrompt(
  project: StudioProject,
  analysis: TrackAnalysis,
  lyrics: LyricsSections
): string {
  const coach = analysis.meta?.mxmCoach;
  const energy = analysis.energy;
  const hp = analysis.hitPotential;
  const breakdown = hp?.breakdown;

  // --- Trend keywords: static list + live feed from analysis ---
  const liveFeedKeywords =
    ((analysis.trendFeed as { keywords?: string[] } | undefined)?.keywords ?? []);
  const allTrendKeywords = [
    ...new Set([...SHORT_FORM_TREND_KEYWORDS, ...liveFeedKeywords]),
  ].slice(0, 28);

  // --- Score breakdown: tell AI which metrics to target ---
  const hookStrength = breakdown?.hookStrength ?? 0;
  const lyricVirality = breakdown?.lyricVirality ?? 0;
  const trendAlignment = breakdown?.trendAlignment ?? 0;
  const overall = hp?.overall ?? 0;

  const targets: string[] = [];
  if (hookStrength < 88)
    targets.push(
      `hookStrength=${hookStrength} (lift by repeating hook line 4+ times and shortening it to 3–5 words)`
    );
  if (lyricVirality < 80)
    targets.push(
      `lyricVirality=${lyricVirality} (lift by adding rhymes at end of every 2nd/4th line and repeating chorus)`
    );
  if (trendAlignment < 75)
    targets.push(
      `trendAlignment=${trendAlignment} (lift by adding 3–5 words from the TRENDING KEYWORDS list below)`
    );

  const currentHookLine =
    (analysis.lyrics as { hookLine?: string } | undefined)?.hookLine ?? "";

  const ctx = [
    `Title: ${project.title}`,
    `Artist: ${project.artistName}`,
    `Genre: ${project.genre}`,
    `Mood: ${project.mood}`,
    coach?.moods?.length ? `Musixmatch moods: ${coach.moods.join(", ")}` : "",
    coach?.themes?.length ? `Themes: ${coach.themes.join(", ")}` : "",
    energy?.bpm ? `BPM: ${Math.round(energy.bpm)}` : "",
    energy?.moodTags?.length ? `Cyanite mood: ${energy.moodTags.join(", ")}` : "",
    currentHookLine ? `Current hook line (repeat this 4+ times): "${currentHookLine}"` : "",
    `Current scores — overall: ${overall}, hookStrength: ${hookStrength}, lyricVirality: ${lyricVirality}, trendAlignment: ${trendAlignment}`,
    targets.length
      ? `SCORE TARGETS (improve these):\n  - ${targets.join("\n  - ")}`
      : "Scores are strong — push all metrics higher.",
    `TRENDING KEYWORDS (use 3–5 naturally): ${allTrendKeywords.join(", ")}`,
    project.creativeBrief?.story ? `Story: ${project.creativeBrief.story}` : "",
    project.creativeBrief?.emotionalArc
      ? `Emotional arc: ${project.creativeBrief.emotionalArc}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const current = JSON.stringify({
    intro: lyrics.intro,
    verse1: lyrics.verse1,
    chorus: lyrics.chorus,
    verse2: lyrics.verse2,
    bridge: lyrics.bridge,
    outro: lyrics.outro,
  });

  return (
    `Context:\n${ctx}\n\n` +
    `Current lyrics (JSON):\n${current}\n\n` +
    `Rewrite following ALL four rules from the system prompt. ` +
    `Priority: (1) repeat the hook line 4+ times, (2) add end-line rhymes, ` +
    `(3) include 3–5 trending keywords, (4) shorten the hook to 3–5 words. ` +
    `Return JSON only.`
  );
}

async function callOpenAICompatible(
  baseUrl: string,
  key: string,
  model: string,
  prompt: string
): Promise<Partial<LyricsSections> | null> {
  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
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
    return parseLyricsJson(data?.choices?.[0]?.message?.content);
  } catch {
    return null;
  }
}

/** B.AI (minimax-m3) — OpenAI-compatible, configured via BAI_* env. */
async function baiRewrite(prompt: string): Promise<Partial<LyricsSections> | null> {
  const key = process.env.BAI_API_KEY;
  const baseUrl = process.env.BAI_BASE_URL;
  if (!key || !baseUrl) return null;
  return callOpenAICompatible(
    baseUrl,
    key,
    process.env.BAI_MODEL || "minimax-m3",
    prompt
  );
}

/** Groq fallback — OpenAI-compatible chat completions. */
async function groqRewrite(prompt: string): Promise<Partial<LyricsSections> | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  return callOpenAICompatible(
    "https://api.groq.com/openai/v1",
    key,
    process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    prompt
  );
}

/** n8n webhook fallback — expects rewritten lyrics back in the response. */
async function n8nRewrite(
  prompt: string,
  project: StudioProject
): Promise<Partial<LyricsSections> | null> {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "lyrics_coach_fix",
        projectId: project.id,
        projectTitle: project.title,
        prompt,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    if (!data) return null;
    const content =
      (data.lyrics as unknown) ??
      (data.output as unknown) ??
      (data as { choices?: Array<{ message?: { content?: unknown } }> })
        ?.choices?.[0]?.message?.content;
    if (content && typeof content === "object") {
      return parseLyricsJson(JSON.stringify(content));
    }
    return parseLyricsJson(
      typeof content === "string" ? content : JSON.stringify(data)
    );
  } catch {
    return null;
  }
}

function mergeLyrics(
  existing: LyricsSections,
  ai: Partial<LyricsSections>
): LyricsSections {
  const pick = (next: string | undefined, fallback: string) =>
    next && next.trim() ? next : fallback;
  // If the AI returned any structured section, the rewrite lives in the
  // structured keys — clear `raw` so composeLyricsBody surfaces the rewrite
  // instead of returning stale freeform text (which would mask the rewrite and
  // re-introduce the +0/+0 bug for mixed raw+structured payloads).
  const aiHasStructured = LYRIC_KEYS.some((k) => (ai[k] ?? "").trim());
  return {
    intro: pick(ai.intro, existing.intro),
    verse1: pick(ai.verse1, existing.verse1),
    chorus: pick(ai.chorus, existing.chorus),
    verse2: pick(ai.verse2, existing.verse2),
    bridge: pick(ai.bridge, existing.bridge),
    outro: pick(ai.outro, existing.outro),
    raw: aiHasStructured ? "" : existing.raw,
  };
}

/**
 * Normalize the user's lyrics into structured working sections for optimize.
 *
 * Why: the lyric editor's "raw" (freeform paste) mode stores everything in
 * `raw` and leaves the structured keys empty, while `composeLyricsBody`
 * prioritizes `raw`. The AI rewrite only writes structured keys and
 * `mergeLyrics` preserves `raw`, so for raw-mode lyrics the rewrite was both
 * (a) never shown the real song (the prompt is built from empty sections) and
 * (b) never surfaced (composeLyricsBody keeps returning the unchanged `raw`).
 * That made Optimize & Ship report a phantom +0/+0 for every raw-mode track.
 *
 * Converting raw → structured (with `raw` cleared) lets the AI rewrite the
 * actual lyrics and lets the rewritten sections drive composeLyricsBody so the
 * before/after delta is real. Structured-mode lyrics (raw already empty) pass
 * through unchanged.
 */
function normalizeForOptimize(lyrics: LyricsSections): LyricsSections {
  const hasStructured = LYRIC_KEYS.some((k) => (lyrics[k] ?? "").trim());
  if (hasStructured) return lyrics;

  const raw = lyrics.raw?.trim();
  if (!raw) return lyrics;

  // Headers present → split into real sections; otherwise treat the whole
  // blob as one verse so the AI still sees (and rewrites) the real text.
  const parsed = parseLyricsSections(raw);
  const parsedHasStructured = LYRIC_KEYS.some((k) => (parsed[k] ?? "").trim());
  if (parsedHasStructured) return parsed;
  return { ...EMPTY_LYRICS, verse1: raw };
}

export async function runIntelligentOptimize(
  input: IntelligentOptimizeInput
): Promise<IntelligentOptimizeResult> {
  const { project, analysis, lyrics } = input;
  const working = normalizeForOptimize(lyrics);

  // 1. Local + partner-enriched patches (always succeeds).
  const { patches, notes, intelligence } = buildEnrichedPatches(project, analysis);

  // Local candidate: fill empty sections from the (patched) creative brief.
  const patchedProject = { ...project, ...patches } as StudioProject;
  let candidateLyrics = applyConceptToLyrics(patchedProject, working);

  let tier: OptimizeTier =
    intelligence.musixmatch || intelligence.cyanite || intelligence.songstats
      ? "partner"
      : "local";
  let aiBackend: AIBackend = "none";

  // 2. Optional AI rewrite: B.AI (minimax-m3) -> Groq -> n8n.
  const prompt = buildRewritePrompt(project, analysis, candidateLyrics);
  const attempts: Array<[AIBackend, () => Promise<Partial<LyricsSections> | null>]> = [
    ["b.ai", () => baiRewrite(prompt)],
    ["groq", () => groqRewrite(prompt)],
    ["n8n", () => n8nRewrite(prompt, project)],
  ];
  for (const [backend, run] of attempts) {
    const aiLyrics = await run();
    if (aiLyrics) {
      candidateLyrics = mergeLyrics(working, aiLyrics);
      tier = "ai";
      aiBackend = backend;
      break;
    }
  }

  return { tier, aiBackend, patches, lyrics: candidateLyrics, notes, intelligence };
}
