
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
import type { CatalogBenchmark, ListenerSimulation as SimulationData } from "@/types";
import { formatNumber } from "@/lib/utils";
import { Target, Clock, TrendingUp } from "lucide-react";

interface ListenerSimulationProps {
  data: SimulationData;
  catalogBenchmark?: CatalogBenchmark;
}

export function ListenerSimulation({ data, catalogBenchmark }: ListenerSimulationProps) {
  const chartData = data.curve.map((p) => ({
    week: `W${p.week}`,
    plays: p.plays,
    lower: p.lower,
    upper: p.upper,
  }));

  return (
    <Card className="h-full">
      <CardHeader
        title="1M Listener Simulation"
        subtitle={
          catalogBenchmark?.medianHookStrength != null
            ? `Monte Carlo · catalog median hook ${catalogBenchmark.medianHookStrength} (Musixmatch)`
            : "Monte Carlo projection — 16-week horizon"
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          {
            icon: Target,
            label: "Reach 1M",
            value: `${data.probabilityToReach}%`,
            accent: "text-accent-light",
          },
          {
            icon: Clock,
            label: "Median Weeks",
            value: `${data.medianWeeks}w`,
            accent: "text-accent-light",
          },
          {
            icon: TrendingUp,
            label: "Projected Peak",
            value: formatNumber(data.projectedPeak),
            accent: "text-accent-light",
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

      <div className="h-56 w-full md:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="playsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#252538" vertical={false} />
            <XAxis
              dataKey="week"
              tick={{ fill: "#8888a8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#8888a8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => formatNumber(v)}
            />
            <Tooltip
              contentStyle={{
                background: "#161625",
                border: "1px solid #252538",
                borderRadius: "12px",
                fontSize: "12px",
              }}
              formatter={(value: number) => [formatNumber(value), "Plays"]}
            />
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="url(#bandGradient)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="plays"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#playsGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-3 text-center text-[10px] text-muted">
        Shaded band = confidence interval · Target: {formatNumber(data.targetPlays)} plays
      </p>
    </Card>
  );
}