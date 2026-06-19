const PARTNER_META = [
  { match: ["Musixmatch", "Musixmatch Analysis", "Richsync", "Catalog Benchmark"], id: "Musixmatch", signal: "Lyrics, moods, richsync, catalog benchmark" },
  { match: ["Cyanite"], id: "Cyanite", signal: "BPM, energy curve, mood & genre AI tags" },
  { match: ["Songstats"], id: "Songstats", signal: "Streams, velocity, artist momentum" },
  { match: ["ElevenLabs"], id: "ElevenLabs", signal: "Full song + hook voice (Write/Produce)" },
  { match: ["LALAL", "LALAL.AI"], id: "LALAL.AI", signal: "AI stem separation (Produce)" },
] as const;

import type { AnalysisMeta, StreamingInsights } from "@/types";

interface PartnerStackSummaryProps {
  meta?: AnalysisMeta;
  streaming?: StreamingInsights;
}

export function PartnerStackSummary({ meta, streaming }: PartnerStackSummaryProps) {
  const active = new Set(meta?.partners ?? []);
  if (streaming?.available) active.add("Songstats");

  const visible = PARTNER_META.filter((p) => p.match.some((m) => active.has(m)));

  if (!visible.length) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface-elevated p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">
        Partner intelligence in this score
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {visible.map(({ id, signal }) => (
          <div
            key={id}
            className="flex min-w-[140px] flex-1 items-start gap-2 rounded-xl border border-accent/20 bg-accent-muted/10 px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold">{id}</p>
              <p className="text-[10px] leading-snug text-muted">{signal}</p>
            </div>
          </div>
        ))}
      </div>
      {meta?.songstatsStatus && (
        <p className="mt-2 text-[10px] text-muted">
          Songstats: {meta.songstatsStatus}
          {meta.poweredByMusixmatch ? " · Musixmatch coach active" : ""}
        </p>
      )}
    </div>
  );
}
