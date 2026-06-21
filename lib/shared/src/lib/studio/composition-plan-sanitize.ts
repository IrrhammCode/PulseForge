import type { TimelineEdits } from "@/types/viral";

export type CompositionPlan = NonNullable<TimelineEdits["compositionPlan"]>;

const MAX_STYLE_LEN = 80;
const MAX_STYLES_PER_CHUNK = 18;
const MAX_CHUNK_TEXT_LEN = 1200;
const MIN_CHUNK_MS = 3000;
const MAX_CHUNK_MS = 120_000;
/** Cap per-plan — keeps ElevenLabs happy while allowing full 3-min songs. */
export const MAX_PLAN_DURATION_MS = 180_000;

function clampDuration(ms: number): number {
  return Math.min(MAX_CHUNK_MS, Math.max(MIN_CHUNK_MS, Math.round(ms)));
}

function trimStyle(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= MAX_STYLE_LEN) return t;
  return t.slice(0, MAX_STYLE_LEN - 1).trimEnd() + "…";
}

function trimStyles(styles?: string[]): string[] {
  if (!styles?.length) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of styles) {
    const s = trimStyle(raw);
    if (!s || seen.has(s.toLowerCase())) continue;
    seen.add(s.toLowerCase());
    out.push(s);
    if (out.length >= MAX_STYLES_PER_CHUNK) break;
  }
  return out;
}

function trimChunkText(text: string): string {
  const t = text.trim();
  if (t.length <= MAX_CHUNK_TEXT_LEN) return t;
  return t.slice(0, MAX_CHUNK_TEXT_LEN);
}

/** Normalize plan before POST — short styles, valid durations, deduped chunks. */
export function sanitizeCompositionPlan(plan: CompositionPlan): CompositionPlan {
  const chunks = plan.chunks
    .filter((c) => c.text?.trim())
    .map((c) => ({
      ...c,
      text: trimChunkText(c.text),
      duration_ms: clampDuration(c.duration_ms ?? 20_000),
      positive_styles: trimStyles(c.positive_styles),
      negative_styles: trimStyles(c.negative_styles),
      context_adherence: c.context_adherence ?? "high",
    }));

  return { chunks };
}

/** Drop duplicate adjacent chorus + scale down if total duration exceeds cap. */
export function compactCompositionPlan(plan: CompositionPlan): CompositionPlan {
  let chunks = [...sanitizeCompositionPlan(plan).chunks];

  // Remove back-to-back identical chorus sections (common pop lift — often triggers 500)
  chunks = chunks.filter((chunk, i, arr) => {
    if (i === 0) return true;
    const prev = arr[i - 1];
    if (!prev?.text.startsWith("[Chorus]") || !chunk.text.startsWith("[Chorus]")) return true;
    return prev.text.trim() !== chunk.text.trim();
  });

  let total = chunks.reduce((s, c) => s + (c.duration_ms ?? 0), 0);
  if (total > MAX_PLAN_DURATION_MS && total > 0) {
    const scale = MAX_PLAN_DURATION_MS / total;
    chunks = chunks.map((c) => ({
      ...c,
      duration_ms: clampDuration((c.duration_ms ?? 20_000) * scale),
    }));
  }

  // Lighter style lists on later chunks
  chunks = chunks.map((c, i) =>
    i === 0
      ? c
      : {
          ...c,
          positive_styles: c.positive_styles?.slice(0, 10),
          negative_styles: c.negative_styles?.slice(0, 8),
        }
  );

  return { chunks };
}

export function estimatePlanDurationMs(plan: CompositionPlan): number {
  return plan.chunks.reduce((s, c) => s + (c.duration_ms ?? 0), 0);
}

export function isElevenLabsServerError(message: string): boolean {
  return /\b500\b|internal_server_error|internal server error/i.test(message);
}

/** Minimal prompt when composition_plan crashes — lyrics only, no plan. */
export function promptFromCompositionPlan(plan: CompositionPlan): string {
  const sections = plan.chunks.map((c) => c.text.trim()).filter(Boolean);
  return [
    "Studio-quality full song with natural expressive vocals.",
    "Sing the lyrics below with clear section structure.",
    sections.join("\n\n"),
  ].join("\n\n");
}
