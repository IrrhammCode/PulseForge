
import { Link2, BarChart3, Target, Zap } from "lucide-react";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { cn } from "@/lib/utils";

const STATS = [
  { value: 7, suffix: "", label: "Partner APIs", detail: "Musixmatch · Cyanite · Songstats + 4 more", icon: Link2 },
  { value: 16, suffix: "w", label: "Week Forecast", detail: "Monte Carlo simulation", icon: BarChart3 },
  { value: 1, suffix: "M", label: "Listener Goal", detail: "Probability scoring", icon: Target },
  { value: 30, suffix: "s", prefix: "<", label: "Report Time", detail: "Search to full dashboard", icon: Zap },
];

export function StatsBar() {
  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-4 md:gap-4 animate-stagger">
      {STATS.map((stat, i) => (
        <StatItem key={stat.label} stat={stat} index={i} />
      ))}
    </div>
  );
}

function StatItem({ stat, index }: { stat: typeof STATS[number]; index: number }) {
  const count = useCountUp(stat.value, 1200, true);
  const Icon = stat.icon;
  return (
    <div
      className={cn(
        "group relative px-2 py-2 text-left md:px-6",
        index > 0 && "md:border-l-2 md:border-foreground"
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-foreground" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
          {stat.label}
        </p>
      </div>
      <p className="font-display text-4xl tabular-nums leading-none text-foreground md:text-5xl 2xl:text-6xl 3xl:text-7xl">
        {stat.prefix}
        {count}
        <span className="text-2xl text-foreground/70">{stat.suffix}</span>
      </p>
      <p className="mt-2 hidden text-[11px] leading-snug text-muted sm:block">
        {stat.detail}
      </p>
    </div>
  );
}
