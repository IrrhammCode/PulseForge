"use client";

import { Sparkles } from "lucide-react";
import { STUDIO_EXAMPLE_PRESETS } from "@pulseforge/shared/lib/studio/example-presets";
import { cn } from "@/lib/utils";

interface FillExampleButtonProps {
  onFill: (presetId: string) => void;
  className?: string;
  compact?: boolean;
}

export function FillExampleButton({ onFill, className, compact }: FillExampleButtonProps) {
  if (STUDIO_EXAMPLE_PRESETS.length === 1) {
    const preset = STUDIO_EXAMPLE_PRESETS[0]!;
    return (
      <button
        type="button"
        onClick={() => onFill(preset.id)}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-xl border border-accent/40 bg-accent-muted/50 font-semibold text-accent-light transition hover:bg-accent-muted",
          compact ? "px-3 py-2 text-xs" : "w-full px-3 py-2.5 text-sm",
          className
        )}
      >
        <Sparkles className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
        Fill example
      </button>
    );
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {STUDIO_EXAMPLE_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => onFill(preset.id)}
          title={preset.description}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-xl border border-accent/40 bg-accent-muted/50 font-semibold text-accent-light transition hover:bg-accent-muted",
            compact ? "px-3 py-2 text-xs" : "px-3 py-2.5 text-sm"
          )}
        >
          <Sparkles className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
          {preset.label}
        </button>
      ))}
    </div>
  );
}
