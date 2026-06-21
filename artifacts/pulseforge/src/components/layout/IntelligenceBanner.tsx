
import { useEffect, useState } from "react";
import { Info, Sparkles, Zap } from "lucide-react";
import { fetchCapabilities } from "@/lib/api-client";
import type { SystemCapabilities } from "@/lib/partners/capabilities";
import { cn } from "@/lib/utils";

const TIER_LABELS = {
  local: "Local intelligence",
  partner: "Partner-assisted",
  full: "Full partner stack",
} as const;

export function IntelligenceBanner({ className }: { className?: string }) {
  const [caps, setCaps] = useState<SystemCapabilities | null>(null);

  useEffect(() => {
    fetchCapabilities()
      .then(setCaps)
      .catch(() => setCaps(null));
  }, []);

  if (!caps) return null;

  const Icon = caps.demoMode ? Sparkles : caps.tier === "full" ? Zap : Info;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-xs",
        caps.demoMode
          ? "border-accent/30 bg-accent-muted/50 text-accent-light"
          : "border-border bg-surface-elevated text-muted",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>
        <span className="font-semibold text-foreground">{TIER_LABELS[caps.tier]}</span>
        {caps.demoMode
          ? " — demo tracks & studio scoring work without API keys"
          : " — partner APIs active where configured"}
      </span>
      {caps.features.studioAudioSignals && (
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px]">
          Demo BPM → Analyze
        </span>
      )}
    </div>
  );
}