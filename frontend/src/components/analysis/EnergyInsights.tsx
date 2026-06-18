"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import type { EnergyProfile } from "@/types";
import { Activity, Gauge as GaugeIcon } from "lucide-react";

interface EnergyInsightsProps {
  data: EnergyProfile;
}

const SOURCE_LABELS: Record<NonNullable<EnergyProfile["source"]>, string> = {
  cyanite: "Cyanite AI",
  "cyanite-processing": "Cyanite (processing)",
  estimated: "Estimated",
};

function MetricBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-medium tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-border">
        <div
          className="bar-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function EnergyInsights({ data }: EnergyInsightsProps) {
  const source = data.source ?? "estimated";
  const isProcessing = source === "cyanite-processing";

  return (
    <Card>
      <CardHeader
        title="Energy & Beat Profile"
        subtitle={
          source === "cyanite"
            ? "AI audio analysis via Cyanite"
            : isProcessing
              ? "Cyanite analysis queued — showing estimates"
              : "Metadata-based estimate"
        }
        action={
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${
              source === "cyanite"
                ? "border-accent/30 bg-accent-muted text-accent-light"
                : "border-border bg-surface-elevated text-muted"
            }`}
          >
            {SOURCE_LABELS[source]}
          </span>
        }
      />

      <div className="mb-5 flex h-20 items-end gap-[2px] rounded-xl border border-border bg-surface-elevated p-3">
        {data.waveform.map((amp, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-accent/70 transition-all"
            style={{ height: `${Math.max(8, amp * 100)}%` }}
          />
        ))}
      </div>

      <div className="mb-4 flex items-center justify-center gap-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 text-muted">
            <Activity className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">BPM</span>
          </div>
          <p className="text-3xl font-bold tabular-nums text-accent-light">{data.bpm}</p>
          {data.key && (
            <p className="text-[10px] text-muted">Key: {data.key}</p>
          )}
          {data.beatDropSec != null && (
            <p className="text-[10px] text-muted">
              Drop: {data.beatDropSec}s
              {data.beatDropScore != null ? ` · ${data.beatDropScore}/100` : ""}
            </p>
          )}
        </div>
        <div className="h-12 w-px bg-border" />
        <div className="text-center">
          <div className="flex items-center justify-center gap-1.5 text-muted">
            <GaugeIcon className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wider">Energy</span>
          </div>
          <p className="text-3xl font-bold tabular-nums capitalize text-foreground">
            {data.energyLevel ?? `${Math.round(data.energy * 100)}%`}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <MetricBar label="Energy" value={data.energy} />
        <MetricBar label="Danceability" value={data.danceability} />
        <MetricBar label="Valence (Mood)" value={data.valence} />
        {data.productionQuality != null && (
          <MetricBar label="Production Quality" value={data.productionQuality / 100} />
        )}
        {data.vocalScore != null && (
          <MetricBar label="Vocal Presence" value={data.vocalScore / 100} />
        )}
      </div>

      {data.moodTags && data.moodTags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {data.moodTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] capitalize text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {data.caption && (
        <p className="mt-3 text-xs italic leading-relaxed text-muted">
          &ldquo;{data.caption}&rdquo;
        </p>
      )}
    </Card>
  );
}