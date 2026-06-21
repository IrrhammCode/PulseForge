const LANG_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  hi: "Hindi",
  ar: "Arabic",
  ru: "Russian",
  nl: "Dutch",
  sv: "Swedish",
  tr: "Turkish",
  pl: "Polish",
  id: "Indonesian",
};

/** Human-readable label for a (possibly locale-suffixed) language code. */
export function translationLanguageLabel(lang?: string | null): string {
  if (!lang) return "—";
  const key = lang.toLowerCase().slice(0, 2);
  return LANG_NAMES[key] || lang.toUpperCase();
}

/** Language name (full) for a (possibly locale-suffixed) language code. */
export function languageFullName(lang: string): string {
  const key = lang.toLowerCase().slice(0, 2);
  return LANG_NAMES[key] || lang;
}

/**
 * Translate a lyrics body line-by-line via Groq, preserving the original line
 * structure: one translated line per source line, section markers like
 * `[Chorus]` and parenthetical ad-libs are kept verbatim (not translated).
 *
 * Returns null when no AI provider is configured so the caller can surface a
 * clear, actionable error instead of a wrong/empty translation.
 */
export async function translateLyricsBody(
  body: string,
  targetLang: string,
  sourceLang = "auto"
): Promise<{ translated: string; source: string } | null> {
  const text = (body || "").replace(/\r\n/g, "\n").trim();
  if (!text) return { translated: "", source: "empty" };

  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  const targetName = languageFullName(targetLang);
  const sourceName = sourceLang === "auto" ? "the source language" : languageFullName(sourceLang);

  const system =
    "You are a professional song-lyric translator. Translate lyrics so the meaning, " +
    "emotion and poetic tone are preserved (natural, singable phrasing — not a literal " +
    "word-for-word gloss). STRICT RULES: (1) Output EXACTLY the same number of lines as " +
    "the input, in the same order — one translated line per input line. (2) Keep blank " +
    "lines blank. (3) Do NOT translate or remove section markers in square brackets like " +
    "[Intro], [Verse 1], [Chorus], [Bridge], [Outro] — copy them verbatim. (4) Keep " +
    "parenthetical ad-libs/backing vocals like (oh oh) as-is unless they carry meaning. " +
    "(5) Return ONLY the translated lyrics — no notes, no preface, no numbering.";

  const user = `Translate the following lyrics from ${sourceName} to ${targetName}.\n\n${text}`;

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
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) return null;
    return { translated: content.trim(), source: `groq:${model}` };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
