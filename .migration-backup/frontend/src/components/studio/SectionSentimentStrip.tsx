"use client";

import type { SectionLyricsInsight } from "@/types";
import { Card, CardHeader } from "@/components/ui/Card";

const SENTIMENT_STYLES: Record<SectionLyricsInsight["sentiment"], string> = {
  energetic: "border-accent/30 bg-accent-muted text-accent-light",
  positive: "border-border bg-surface-elevated text-foreground",
  melancholic: "border-border bg-surface text-muted",
  neutral: "border-border bg-surface text-muted",
};

interface SectionSentimentStripProps {
  insights?: SectionLyricsInsight[];
  poweredByMxm?: boolean;
}

export function SectionSentimentStrip({ insights, poweredByMxm }: SectionSentimentStripProps) {
  if (!insights?.length) return null;

  return (
    <Card glow="none">
      <CardHeader
        title="Section Sentiment"
        subtitle={
          poweredByMxm
            ? "Per-section tone · Musixmatch moods on chorus"
            : "Per-section tone from PulseForge analyzer"
        }
      />
      <ul className="space-y-2">
        {insights.map((row) => (
          <li
            key={row.section}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface-elevated px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium">{row.label}</p>
              {row.themes.length > 0 && (
                <p className="text-[10px] uppercase tracking-wider text-muted">
                  {row.themes.slice(0, 2).join(" · ")}
                </p>
              )}
            </div>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs capitalize ${SENTIMENT_STYLES[row.sentiment]}`}
            >
              {row.sentiment}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}