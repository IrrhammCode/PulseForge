
import { useCountUp } from "@/lib/hooks/useCountUp";
import { cn } from "@/lib/utils";

const STATS = [
  { value: 7, suffix: "", label: "Partner APIs", detail: "Musixmatch · Cyanite · Songstats + 4 more", icon: "🔗" },
  { value: 16, suffix: "w", label: "Week Forecast", detail: "Monte Carlo simulation", icon: "📊" },
  { value: 1, suffix: "M", label: "Listener Goal", detail: "Probability scoring", icon: "🎯" },
  { value: 30, suffix: "s", prefix: "<", label: "Report Time", detail: "Search to full dashboard", icon: "⚡" },
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
  return (
    <div
      className={cn(
        "group relative rounded-xl p-4 text-center transition-all duration-300 md:text-left",
        "glass-card-hover",
        index > 0 && "md:border-l-0"
      )}
    >
      <div className="mb-2 text-lg">{stat.icon}</div>
      <p className="text-2xl font-bold tabular-nums text-accent-light md:text-3xl">
        {stat.prefix}
        {count}
        <span className="text-lg text-accent-light/70">{stat.suffix}</span>
      </p>
      <p className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-foreground">
        {stat.label}
      </p>
      <p className="mt-1 hidden text-[11px] leading-snug text-muted sm:block">
        {stat.detail}
      </p>
    </div>
  );
}