"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import type { WhatIfParams } from "@/types";
import { Loader2, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatIfSimulatorProps {
  params: WhatIfParams;
  onChange: (params: WhatIfParams) => void;
  scoreDelta: number;
  isRecalculating?: boolean;
}

export function WhatIfSimulator({
  params,
  onChange,
  scoreDelta,
  isRecalculating = false,
}: WhatIfSimulatorProps) {
  const update = <K extends keyof WhatIfParams>(key: K, value: WhatIfParams[K]) => {
    onChange({ ...params, [key]: value });
  };

  return (
    <Card className={cn(isRecalculating && "opacity-90")}>
      <CardHeader
        title="What-If Simulator"
        subtitle="Adjust launch parameters and see impact"
        action={
          <div className="flex items-center gap-2">
            {isRecalculating && (
              <span className="flex items-center gap-1 rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-medium text-accent-light">
                <Loader2 className="h-3 w-3 animate-spin" />
                Updating
              </span>
            )}
            {scoreDelta !== 0 && !isRecalculating && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-bold tabular-nums",
                  scoreDelta > 0 ? "text-success bg-success/10" : "text-danger bg-danger/10"
                )}
              >
                {scoreDelta > 0 ? "+" : ""}
                {scoreDelta} score
              </span>
            )}
          </div>
        }
      />

      <div className="space-y-5">
        <SliderField
          label="Marketing Budget"
          value={params.marketingBudget}
          min={0}
          max={5000}
          step={100}
          format={(v) => `$${v}`}
          onChange={(v) => update("marketingBudget", v)}
        />
        <SliderField
          label="Playlist Pitches"
          value={params.playlistPitchCount}
          min={0}
          max={20}
          step={1}
          format={(v) => `${v} curators`}
          onChange={(v) => update("playlistPitchCount", v)}
        />
        <SliderField
          label="TikTok Seed Posts"
          value={params.tiktokSeedPosts}
          min={0}
          max={15}
          step={1}
          format={(v) => `${v} posts`}
          onChange={(v) => update("tiktokSeedPosts", v)}
        />

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
            Release Timing
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(["friday", "saturday", "monday"] as const).map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => update("releaseTiming", day)}
                className={cn(
                  "rounded-lg border py-2 text-sm font-medium capitalize transition",
                  params.releaseTiming === day
                    ? "border-accent/40 bg-accent-muted text-accent-light"
                    : "border-border bg-surface-elevated text-muted hover:border-accent/25"
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-[10px] text-muted">
        <SlidersHorizontal className="h-3 w-3" />
        Changes update Hit Potential & simulation in real-time
      </p>
    </Card>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-xs font-medium uppercase tracking-wider text-muted">{label}</label>
        <span className="text-sm font-semibold tabular-nums text-foreground">{format(value)}</span>
      </div>
      <div className="relative">
        <div
          className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-accent/60"
          style={{ width: `${pct}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="range-slider relative z-10"
        />
      </div>
    </div>
  );
}