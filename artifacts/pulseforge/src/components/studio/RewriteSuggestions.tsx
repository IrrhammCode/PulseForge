
import { ArrowRight, Lightbulb, Wand2 } from "lucide-react";
import type { MxmCoachContext } from "@/types";
import type { LyricsSections } from "@/types/studio";
import {
  applySuggestion,
  composeLyricsBody,
  generateRewriteSuggestions,
  type RewriteSuggestion,
} from "@/lib/studio/lyrics";
import { analyzeLyrics } from "@/lib/scoring/lyrics-analyzer";
import { Card, CardHeader } from "@/components/ui/Card";

const TYPE_LABELS: Record<RewriteSuggestion["type"], string> = {
  shorten: "Tighten",
  repeat: "Repeat",
  hook: "Hook",
  structure: "Structure",
  vocabulary: "Word choice",
};

interface RewriteSuggestionsProps {
  lyrics: LyricsSections;
  onApply: (lyrics: LyricsSections) => void;
  mxmCoach?: MxmCoachContext;
  sectionInsights?: import("@/types").SectionLyricsInsight[];
}

export function RewriteSuggestions({
  lyrics,
  onApply,
  mxmCoach,
  sectionInsights,
}: RewriteSuggestionsProps) {
  const body = composeLyricsBody(lyrics);
  const structure = body.trim()
    ? { ...analyzeLyrics(body), sectionInsights }
    : undefined;
  const suggestions = generateRewriteSuggestions(lyrics, structure, mxmCoach);
  const mxmPowered = Boolean(mxmCoach?.moods?.length || mxmCoach?.themes?.length);

  const handleApply = (suggestion: RewriteSuggestion) => {
    onApply(applySuggestion(lyrics, suggestion));
  };

  return (
    <Card glow="none">
      <CardHeader
        title="Rewrite Coach"
        subtitle={
          mxmPowered
            ? "Musixmatch themes + structure rules"
            : "Rule-based suggestions to sharpen hooks and structure"
        }
        action={
          <Wand2 className="h-4 w-4 text-accent-light" />
        }
      />

      {suggestions.length === 0 ? (
        <p className="text-sm text-muted">Looking good — no urgent rewrites detected.</p>
      ) : (
        <ul className="space-y-3">
          {suggestions.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-border bg-surface p-3"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-light">
                  <Lightbulb className="h-3 w-3" />
                  {TYPE_LABELS[s.type]}
                </span>
                {s.section !== "general" && (
                  <span className="text-[10px] uppercase tracking-wide text-muted">
                    {s.section}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-foreground">{s.message}</p>

              {s.before && s.after && (
                <div className="mt-3 space-y-1.5 rounded-lg bg-surface-elevated p-2.5 text-xs">
                  <p className="text-muted line-through">{s.before}</p>
                  <p className="flex items-center gap-1.5 text-accent-light">
                    <ArrowRight className="h-3 w-3 shrink-0" />
                    {s.after}
                  </p>
                </div>
              )}

              {s.after && s.section !== "general" && (
                <button
                  type="button"
                  onClick={() => handleApply(s)}
                  className="mt-3 text-xs font-medium text-accent-light transition hover:text-foreground"
                >
                  Apply suggestion
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}