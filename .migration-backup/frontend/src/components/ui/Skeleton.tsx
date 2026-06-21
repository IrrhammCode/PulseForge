import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("shimmer rounded-lg", className)} />
  );
}

interface AnalysisProgressProps {
  step: number;
  hasAnalysis?: boolean;
  hasRichsync?: boolean;
}

export function AnalysisProgress({ step, hasAnalysis, hasRichsync }: AnalysisProgressProps) {
  const steps = [
    hasRichsync
      ? "Fetching lyrics + richsync structure"
      : "Fetching lyrics from Musixmatch",
    hasAnalysis ? "Loading Musixmatch analysis API" : "Parsing lyrics structure",
    "Running partner audio & streaming signals",
    "Catalog intelligence + hit simulation",
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-surface/60 p-8 backdrop-blur-sm animate-fade-in">
      <div className="mx-auto max-w-md space-y-5 text-center">
        <div className="relative mx-auto h-14 w-14">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-purple/20 border-t-purple-light" />
          <div className="absolute inset-2 animate-pulse rounded-full bg-accent/15" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {steps[Math.min(step, steps.length - 1)]}…
          </p>
          <p className="mt-1 text-xs text-muted">Building your pre-release intelligence report</p>
        </div>
        <div className="flex justify-center gap-1.5">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-500",
                i <= step ? "w-10 bg-accent" : "w-6 bg-border"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}