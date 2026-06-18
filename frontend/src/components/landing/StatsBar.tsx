import { cn } from "@/lib/utils";

const STATS = [
  { value: "3", label: "Partner APIs", detail: "Musixmatch · Cyanite · Songstats" },
  { value: "16", label: "Week Forecast", detail: "Monte Carlo simulation" },
  { value: "1M", label: "Listener Goal", detail: "Probability scoring" },
  { value: "<30s", label: "Report Time", detail: "Search to full dashboard" },
];

export function StatsBar() {
  return (
    <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6">
      {STATS.map((stat, i) => (
        <div
          key={stat.label}
          className={cn(
            "text-center md:text-left",
            i > 0 && "md:border-l md:border-border md:pl-6"
          )}
        >
          <p className="text-2xl font-bold tabular-nums text-accent-light md:text-[1.75rem]">
            {stat.value}
          </p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-foreground">
            {stat.label}
          </p>
          <p className="mt-1 hidden text-[11px] leading-snug text-muted sm:block">
            {stat.detail}
          </p>
        </div>
      ))}
    </div>
  );
}