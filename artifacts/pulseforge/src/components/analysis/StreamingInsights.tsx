
import { Card, CardHeader } from "@/components/ui/Card";
import type {
  ArtistMomentumInsights,
  StreamingInsights as StreamingData,
  VelocityHistoryInsights,
} from "@/types";
import { formatNumber } from "@/lib/utils";
import { BarChart3, Music2, Radio, TrendingUp, Zap } from "lucide-react";

const PLATFORM_COLORS: Record<string, string> = {
  spotify: "text-foreground",
  apple_music: "text-muted",
  tiktok: "text-foreground",
  shazam: "text-muted",
  youtube: "text-muted",
};

interface StreamingInsightsProps {
  data: StreamingData;
  artistMomentum?: ArtistMomentumInsights;
  velocityHistory?: VelocityHistoryInsights;
}

function VelocitySparkline({ points }: { points: VelocityHistoryInsights["dataPoints"] }) {
  if (points.length < 2) return null;
  const max = Math.max(...points.map((p) => p.streams), 1);
  const width = 160;
  const height = 36;
  const step = width / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = height - (p.streams / max) * (height - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-40 text-accent-light" aria-hidden>
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function StreamingInsights({ data, artistMomentum, velocityHistory }: StreamingInsightsProps) {
  const isPreRelease = data.status === "pre_release" || !data.available;

  return (
    <Card>
      <CardHeader
        title="Streaming Intelligence"
        subtitle="Real-time performance data via Songstats"
        action={
          <span className="rounded-full border border-accent/30 bg-accent-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-light">
            Songstats
          </span>
        }
      />

      {velocityHistory?.available && (
        <div className="mb-4 rounded-xl border border-border bg-surface-elevated p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Historic velocity
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <span className="text-2xl font-bold tabular-nums text-accent-light">
                  {velocityHistory.historicVelocityScore}
                </span>
                <span className="rounded-full border border-accent/30 bg-accent-muted px-2.5 py-1 text-xs capitalize text-accent-light">
                  {velocityHistory.trajectory}
                </span>
                {velocityHistory.week1Pattern && (
                  <span className="text-xs text-muted">
                    Week 1: {velocityHistory.week1Pattern}
                    {velocityHistory.week1GrowthPct != null
                      ? ` (${velocityHistory.week1GrowthPct > 0 ? "+" : ""}${velocityHistory.week1GrowthPct}%)`
                      : ""}
                  </span>
                )}
              </div>
              {velocityHistory.recentWeeklyDeltaPct != null && (
                <p className="mt-2 text-xs text-muted">
                  {velocityHistory.recentWeeklyDeltaPct > 0 ? "+" : ""}
                  {velocityHistory.recentWeeklyDeltaPct}% week-over-week · ~
                  {velocityHistory.avgDailyStreams?.toLocaleString() ?? "—"} daily streams
                </p>
              )}
            </div>
            <VelocitySparkline points={velocityHistory.dataPoints} />
          </div>
        </div>
      )}

      {artistMomentum?.available && (
        <div className="mb-4 rounded-xl border border-border bg-surface-elevated p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Artist momentum</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-2xl font-bold tabular-nums text-accent-light">
              {artistMomentum.momentumScore}
            </span>
            <span className="rounded-full border border-accent/30 bg-accent-muted px-2.5 py-1 text-xs capitalize text-accent-light">
              {artistMomentum.tier}
            </span>
            {artistMomentum.monthlyListeners != null && (
              <span className="text-xs text-muted">
                {formatNumber(artistMomentum.monthlyListeners)} monthly listeners
              </span>
            )}
          </div>
        </div>
      )}

      {isPreRelease ? (
        <div className="rounded-xl border border-border bg-surface-elevated p-5 text-center">
          <Radio className="mx-auto mb-3 h-8 w-8 text-muted" />
          <p className="font-medium text-foreground">Pre-release track detected</p>
          <p className="mt-2 text-sm text-muted">
            No streaming data in Songstats yet — expected for unreleased music. PulseForge
            will benchmark against genre averages and simulate growth from your hit score.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { icon: TrendingUp, label: "Velocity", value: `${data.velocityScore}`, accent: "text-accent-light" },
              { icon: BarChart3, label: "Streams", value: formatNumber(data.totalStreams), accent: "text-foreground" },
              { icon: Music2, label: "Playlists", value: String(data.totalPlaylists), accent: "text-foreground" },
              { icon: Zap, label: "TikTok", value: formatNumber(data.tiktokCreates), accent: "text-foreground" },
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

          {data.platforms.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                Platform breakdown
              </p>
              {data.platforms.slice(0, 5).map((p) => {
                const color = PLATFORM_COLORS[p.platform.toLowerCase()] ?? "text-muted";
                const metric = p.streams ?? p.shazams ?? p.tiktokCreates ?? p.playlists ?? 0;
                const metricLabel = p.streams != null ? "streams" : p.shazams != null ? "shazams" : "metric";

                return (
                  <div
                    key={p.platform}
                    className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated px-3 py-2"
                  >
                    <span className={`text-sm font-medium capitalize ${color}`}>
                      {p.platform.replace(/_/g, " ")}
                    </span>
                    <span className="text-sm tabular-nums text-muted">
                      {formatNumber(metric)} {metricLabel}
                      {p.chartPosition != null && (
                        <span className="ml-2 text-accent-light">#{p.chartPosition}</span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {data.editorialPlaylists > 0 && (
            <p className="mt-4 text-xs text-muted">
              {data.editorialPlaylists} editorial playlist placements detected — strong signal
              for trend alignment scoring.
            </p>
          )}
        </>
      )}
    </Card>
  );
}