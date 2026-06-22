
import { Card, CardHeader } from "@/components/ui/Card";
import type { AnalysisMeta, LyricsStructure, TrendFeedSnapshot } from "@/types";
import { Quote, Repeat, FileText, Sparkles } from "lucide-react";

const SENTIMENT_COLORS: Record<LyricsStructure["sentiment"], string> = {
  energetic: "text-accent-light bg-accent-muted border-accent/30",
  positive: "text-foreground bg-surface-elevated border-border",
  melancholic: "text-muted bg-surface border-border",
  neutral: "text-muted bg-surface border-border",
};

interface LyricsAnalysisProps {
  data: LyricsStructure;
  meta?: AnalysisMeta;
  trendFeed?: TrendFeedSnapshot;
}

export function LyricsAnalysis({ data, meta, trendFeed }: LyricsAnalysisProps) {
  return (
    <Card>
      <CardHeader
        title="Lyrics & Structure"
        subtitle={
          meta?.hasAnalysis
            ? "Musixmatch Analysis API + structure engine"
            : "Musixmatch lyrics + PulseForge structure engine"
        }
      />

      <div className="mb-4 rounded-xl border border-border bg-accent-muted p-4">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent-light">
          <Quote className="h-3.5 w-3.5" />
          Hook Line
        </div>
        <p className="text-base font-medium italic text-foreground md:text-lg">
          &ldquo;{data.hookLine}&rdquo;
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-muted">Hook Strength</span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
            <div
              className="bar-accent"
              style={{ width: `${data.hookStrength}%` }}
            />
          </div>
          <span className="text-sm font-bold tabular-nums">{data.hookStrength}</span>
        </div>
        {data.hookWindowSec != null && (
          <p className="mt-2 text-xs text-muted">
            Hook window:{" "}
            <span className="font-medium text-foreground">{data.hookWindowSec.toFixed(1)}s</span>
            {data.richsyncPowered ? " · Musixmatch richsync" : ""}
          </p>
        )}
      </div>

      {meta?.mxmCoach &&
      (meta.mxmCoach.moods?.length ||
        meta.mxmCoach.themes?.length ||
        meta.mxmCoach.audienceRating) ? (
        <div className="mb-4 rounded-xl border border-accent/30 bg-accent-muted/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-accent-light">
            <Sparkles className="h-3.5 w-3.5" />
            Musixmatch Analysis API
          </div>
          {meta.mxmCoach.moods?.length ? (
            <div className="mb-3">
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted">Moods</p>
              <div className="flex flex-wrap gap-2">
                {meta.mxmCoach.moods.map((mood) => (
                  <span
                    key={mood}
                    className="rounded-full border border-accent/40 bg-surface-elevated px-2.5 py-1 text-xs font-medium capitalize text-accent-light"
                  >
                    {mood}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {meta.mxmCoach.themes?.length ? (
            <div className="mb-3">
              <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted">Themes</p>
              <div className="flex flex-wrap gap-2">
                {meta.mxmCoach.themes.map((theme) => (
                  <span
                    key={theme}
                    className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-xs capitalize text-foreground"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {meta.mxmCoach.audienceRating ? (
            <p className="text-xs text-muted">
              Audience rating:{" "}
              <span className="font-medium capitalize text-foreground">
                {meta.mxmCoach.audienceRating}
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Verses", value: data.verses },
          { label: "Choruses", value: data.chorusCount },
          { label: "Word Count", value: data.wordCount },
          { label: "Repetition", value: `${data.repetitionIndex}%` },
          ...(data.rhymeDensity != null
            ? [{ label: "Rhyme Density", value: `${data.rhymeDensity}%` }]
            : []),
          ...(data.chorusWordCount != null
            ? [{ label: "Chorus Words", value: data.chorusWordCount }]
            : []),
          ...(data.chorusSimplicity != null
            ? [{ label: "Chorus Simplicity", value: `${data.chorusSimplicity}%` }]
            : []),
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-border bg-surface-elevated p-3 text-center">
            <p className="text-lg font-bold tabular-nums">{stat.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${SENTIMENT_COLORS[data.sentiment]}`}
        >
          {data.sentiment}
        </span>
        {data.themes.map((theme) => (
          <span
            key={theme}
            className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-xs text-muted"
          >
            {theme}
          </span>
        ))}
        {data.trendKeywordHits?.map((kw) => (
          <span
            key={kw}
            className="rounded-full border border-accent/30 bg-accent-muted px-2.5 py-1 text-xs text-accent-light"
          >
            {kw}
          </span>
        ))}
      </div>

      {data.sectionInsights && data.sectionInsights.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Section sentiment</p>
          <div className="flex flex-wrap gap-2">
            {data.sectionInsights.map((row) => (
              <span
                key={row.section}
                className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-xs capitalize text-muted"
              >
                {row.label}: {row.sentiment}
              </span>
            ))}
          </div>
        </div>
      )}

      {data.sections && data.sections.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Timed sections</p>
          {data.sections.slice(0, 5).map((section, i) => (
            <div
              key={`${section.startSec}-${i}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-xs"
            >
              <span className="truncate italic text-foreground">&ldquo;{section.text}&rdquo;</span>
              <span className="shrink-0 tabular-nums text-muted">
                {section.startSec.toFixed(0)}s · ×{section.repeatCount}
              </span>
            </div>
          ))}
        </div>
      )}

      {trendFeed && (
        <p className="mt-4 text-xs text-muted">
          Trend feed:{" "}
          <span className="font-medium text-foreground">{trendFeed.source}</span>
          {" · "}
          {trendFeed.keywords.slice(0, 4).join(", ")}
          {trendFeed.keywords.length > 4 ? "…" : ""}
        </p>
      )}

      <div className="mt-4 flex items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {data.richsyncPowered ? "Richsync structure" : "Structure analyzed"}
        </span>
        <span className="flex items-center gap-1">
          <Repeat className="h-3 w-3" />
          Chorus repeatability: {data.repetitionIndex > 60 ? "High" : "Moderate"}
        </span>
      </div>
    </Card>
  );
}