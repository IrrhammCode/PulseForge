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
