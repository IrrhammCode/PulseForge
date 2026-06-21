
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import type { CrowdSimulation, ListeningOutcome } from "@/types/viral";
import { formatNumber } from "@/lib/utils";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { Users, Share2, Bookmark, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";

const OUTCOME_COLORS: Record<ListeningOutcome, string> = {
  full_listen: "bg-accent",
  skip_hook: "bg-warning",
  skip_early: "bg-orange-500/80",
  save: "bg-cyan-500",
  share: "bg-success",
  playlist_add: "bg-emerald-400",
};

const ARCHETYPE_LABELS: Record<string, string> = {
  gen_z_tiktok: "Gen-Z TikTok",
  casual_streamer: "Casual",
  playlist_curator: "Curator",
  superfan: "Superfan",
  radio_listener: "Radio",
  workout_dj: "Workout",
};

interface CrowdSimulationPanelProps {
  data: CrowdSimulation;
  animate?: boolean;
}

export function CrowdSimulationPanel({ data, animate = true }: CrowdSimulationPanelProps) {
  const reached = useCountUp(data.scaled.reached, 1200, animate);
  const fullListeners = useCountUp(data.scaled.fullListeners, 1400, animate);
  const sharers = useCountUp(data.scaled.sharers, 1600, animate);

  const retentionData = data.retentionCurve.map((p) => ({
    pct: `${p.percent}%`,
    retained: p.retained,
    label: p.label,
  }));

  return (
    <Card className="h-full">
      <CardHeader
        title="1 Million Listener Simulation"
        subtitle={`Monte Carlo crowd — ${formatNumber(data.sampleSize)} persona sample × scaled to ${formatNumber(data.populationTarget)}`}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Users, label: "Reached", value: formatNumber(reached), accent: "text-accent-light" },
          { icon: Bookmark, label: "Full listen", value: formatNumber(fullListeners), accent: "text-foreground" },
          { icon: Share2, label: "Shares", value: formatNumber(sharers), accent: "text-success" },
          {
            icon: SkipForward,
            label: "Skip @ hook",
            value: `${data.aggregates.skipHookRate}%`,
            accent: "text-warning",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-surface-elevated p-3 text-center"
          >
            <stat.icon className={`mx-auto mb-1 h-4 w-4 ${stat.accent}`} />
            <p className={`text-lg font-bold tabular-nums ${stat.accent}`}>{stat.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-5">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
          Crowd sample — each dot = 1 persona
        </p>
        <div className="flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-3">
          {data.results.map((r) => (
            <span
              key={r.personaId}
              title={`${ARCHETYPE_LABELS[r.archetype] ?? r.archetype} · ${r.platform} · ${r.outcome}`}
              className={cn("h-2 w-2 rounded-full", OUTCOME_COLORS[r.outcome])}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-muted">
          {Object.entries(OUTCOME_COLORS).map(([key, color]) => (
            <span key={key} className="inline-flex items-center gap-1">
              <span className={cn("h-2 w-2 rounded-full", color)} />
              {key.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>

      <div className="mb-5 grid gap-2">
        {data.funnel.map((step) => (
          <div key={step.label} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-muted">{step.label}</span>
            <div className="relative h-6 flex-1 overflow-hidden rounded-lg bg-surface">
              <div
                className="absolute inset-y-0 left-0 rounded-lg transition-all duration-700"
                style={{
                  width: `${step.percent}%`,
                  backgroundColor: step.color,
                  opacity: 0.75,
                }}
              />
              <span className="relative z-10 flex h-full items-center px-2 text-[10px] font-medium tabular-nums">
                {formatNumber(step.count)} ({step.percent}%)
              </span>
            </div>
          </div>
        ))}
      </div>

      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">
        Retention curve — % still listening
      </p>
      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={retentionData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#252538" vertical={false} />
            <XAxis
              dataKey="pct"
              tick={{ fill: "#8888a8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#8888a8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              contentStyle={{
                background: "#161625",
                border: "1px solid #252538",
                borderRadius: "12px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [`${value}%`, "Retained"]}
            />
            <Area
              type="monotone"
              dataKey="retained"
              stroke="#22d3ee"
              strokeWidth={2}
              fill="url(#retentionGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-center text-[10px] text-muted">
        K-factor {data.aggregates.viralCoefficient} · avg listen {data.aggregates.avgListenSec}s
      </p>
    </Card>
  );
}