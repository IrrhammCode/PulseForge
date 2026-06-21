"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Flame,
  LayoutGrid,
  Music2,
  PenLine,
  Rocket,
  Search,
  TrendingUp,
} from "lucide-react";
import { useStudioProjects } from "@/lib/hooks/useStudioProjects";
import { ProjectCard } from "@/components/studio/ProjectCard";
import { NewProjectForm } from "@/components/studio/NewProjectForm";
import {
  computeDashboardStats,
  computePipelines,
  computeViralLabCandidates,
  greeting,
} from "@/lib/dashboard";
import { getViralLabLink } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { getRecentActivities, type ActivityItem } from "@/lib/activity";
import { useEffect, useState } from "react";
import { fetchCapabilities } from "@/lib/api-client";
import type { SystemCapabilities } from "@/lib/partners/capabilities";

const PIPELINE_STEPS = [
  { key: "write" as const, label: "Write", icon: PenLine },
  { key: "produce" as const, label: "Produce", icon: Music2 },
  { key: "analyze" as const, label: "Analyze", icon: BarChart3 },
  { key: "viral" as const, label: "Viral Lab", icon: Flame },
  { key: "launch" as const, label: "Launch", icon: Rocket },
];

export function DashboardPage() {
  const { projects, ready, create, remove } = useStudioProjects();
  const [caps, setCaps] = useState<SystemCapabilities | null>(null);

  useEffect(() => {
    fetchCapabilities().then(setCaps).catch(() => setCaps(null));
  }, []);

  const stats = computeDashboardStats(projects);
  const pipelines = computePipelines(projects);
  const viralCandidates = computeViralLabCandidates(projects);
  const recent = projects.slice(0, 3);

  const pipelineOverview = PIPELINE_STEPS.map((step) => {
    const done = projects.length > 0
      ? pipelines.filter((p) => Boolean(p[step.key as keyof typeof p])).length
      : 0;
    const pct = projects.length > 0 ? Math.round((done / projects.length) * 100) : 0;
    return { ...step, done, pct };
  });

  const handleDelete = (id: string) => {
    if (confirm("Delete this project?")) remove(id);
  };

  const statCards = [
    { label: "Projects", value: stats.totalProjects, icon: LayoutGrid },
    { label: "Analyzed", value: stats.analyzedProjects, icon: BarChart3 },
    { label: "With demo", value: stats.withDemo, icon: Music2 },
    {
      label: "Avg hit score",
      value: stats.avgHitScore != null ? stats.avgHitScore : "N/A",
      icon: TrendingUp,
    },
  ];

  const quickActions = [
    { href: "/analyze", label: "Analyze Demo Track", desc: "Score a sample track with Musixmatch", icon: Search },
    { href: "/studio", label: "Start from Template", desc: "Create project from example", icon: LayoutGrid },
    { href: "/viral", label: "Explore Viral Lab", desc: "Run 1M crowd simulation", icon: Flame },
    { href: "/help", label: "Studio Guide", desc: "How the pipeline works", icon: Rocket },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-10 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-light">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
            {greeting()}
          </h1>
          <p className="mt-2 max-w-lg text-sm text-muted md:text-base">
            Your studio at a glance — projects, pipeline progress, and quick actions.
          </p>
        </div>
        <NewProjectForm onCreate={create} />
      </div>

      {/* Stats Row */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-border bg-surface-elevated p-4"
          >
            <div className="flex items-center justify-between">
              <card.icon className="h-4 w-4 text-accent-light" />
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums">{card.value}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Live Partner Status (strengthened) */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-muted">
        {caps ? (
          <>
            <span className="rounded-full border border-border bg-surface-elevated px-2 py-0.5">
              Musixmatch: {caps.partners.musixmatch ? "active" : "demo"}
            </span>
            <span className="rounded-full border border-border bg-surface-elevated px-2 py-0.5">
              Cyanite: {caps.partners.cyanite ? "active" : "demo"}
            </span>
            <span className="rounded-full border border-border bg-surface-elevated px-2 py-0.5">
              Songstats: {caps.partners.songstats ? "active" : "demo"}
            </span>
            <span className="text-[10px]">{caps.tier} tier • {Object.values(caps.partners).filter(Boolean).length}/7 partners</span>
          </>
        ) : (
          <span className="rounded-full border border-border bg-surface-elevated px-2 py-0.5">Partners: loading / demo mode</span>
        )}
        <Link href="/integrations" className="text-accent-light hover:underline">Manage →</Link>
      </div>

      {/* Pipeline Overview (High Priority) */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Pipeline Overview</h2>
            <p className="text-xs text-muted">Music Studio OS — 5 stage workflow</p>
          </div>
          <Link href="/studio" className="text-xs text-muted hover:text-foreground">View all projects →</Link>
        </div>

        <div className="rounded-2xl border border-border bg-surface-elevated p-4">
          <div className="grid grid-cols-5 gap-2">
            {pipelineOverview.map((step, index) => (
              <div key={step.key} className="flex flex-col items-center text-center">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border",
                    step.pct > 0 ? "border-accent/40 bg-accent-muted text-accent-light" : "border-border bg-surface text-muted"
                  )}
                >
                  <step.icon className="h-4 w-4" />
                </div>
                <p className="mt-2 text-[10px] font-medium">{step.label}</p>
                <p className="text-[10px] text-muted">{step.pct}%</p>
                {index < pipelineOverview.length - 1 && (
                  <div className="mt-1 hidden h-px w-full bg-border md:block" />
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[10px] text-muted">
            Progress shown across all projects. Create projects to start filling the pipeline.
          </p>
        </div>
      </section>

      {/* Quick Actions (High Priority) */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group rounded-2xl border border-border bg-surface-elevated p-4 transition hover:border-accent/30"
            >
              <action.icon className="h-5 w-5 text-accent-light" />
              <p className="mt-3 font-semibold group-hover:text-accent-light">{action.label}</p>
              <p className="mt-1 text-xs text-muted">{action.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Projects */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Projects</h2>
          {projects.length > 3 && (
            <Link href="/studio" className="text-xs text-muted hover:text-foreground">
              See all {projects.length} →
            </Link>
          )}
        </div>

        {!ready && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-border/50" />
            ))}
          </div>
        )}

        {ready && recent.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-6">
            <h3 className="font-semibold">No projects yet</h3>
            <p className="mt-1 text-sm text-muted">
              Start your Music Studio OS journey. Choose an option below to begin the Write → Produce → Analyze → Viral Lab → Launch pipeline.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Link
                href="/analyze"
                className="rounded-xl border border-accent/30 bg-accent-muted p-3 text-center text-sm font-medium text-accent-light hover:bg-accent-muted/80"
              >
                Try with Demo Track
              </Link>
              <Link
                href="/studio"
                className="rounded-xl border border-border bg-surface-elevated p-3 text-center text-sm font-medium hover:border-accent/30"
              >
                Start from Template
              </Link>
              <Link
                href="/help"
                className="rounded-xl border border-border bg-surface-elevated p-3 text-center text-sm font-medium hover:border-accent/30"
              >
                Watch 2-min intro
              </Link>
            </div>

            <div className="mt-4">
              <NewProjectForm onCreate={create} />
            </div>
          </div>
        )}

        {ready && recent.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((project) => (
              <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity (populated from analyze/viral/project actions) */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">Recent Activity</h2>
        {(() => {
          const activities = getRecentActivities(5);
          if (activities.length === 0) {
            return (
              <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted">
                Run Quick Analyze or Viral Lab — your actions will appear here.
              </div>
            );
          }
          return (
            <div className="space-y-2">
              {activities.map((a: ActivityItem) => (
                <Link
                  key={a.id}
                  href={a.link || "#"}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface-elevated px-4 py-2.5 text-sm hover:border-accent/30"
                >
                  <div>
                    <span className="font-medium">{a.title}</span>
                    {a.subtitle && <span className="ml-2 text-muted">{a.subtitle}</span>}
                  </div>
                  <div className="text-right text-xs text-muted">
                    {a.score != null && <span className="mr-2 text-accent-light">{a.score}</span>}
                    {new Date(a.at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </Link>
              ))}
            </div>
          );
        })()}
      </section>

      {/* Keep existing viral and launch ready banners if data exists */}
      {ready && viralCandidates.length > 0 && (
        <section className="mt-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Viral Lab Candidates</h2>
              <p className="text-xs text-muted">
                {stats.viralLabReady} project{stats.viralLabReady !== 1 ? "s" : ""} ready for 1M sim
              </p>
            </div>
            <Link
              href="/viral"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent-light hover:text-foreground"
            >
              Open Viral Lab <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {viralCandidates.slice(0, 3).map((c) => (
              <Link
                key={c.projectId}
                href={getViralLabLink(c.projectId)}
                className="group rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent p-4 transition hover:border-accent/40"
              >
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-accent-light" />
                  <p className="truncate font-semibold group-hover:text-accent-light">
                    {c.title}
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted">
                  {c.viralScore != null ? `Viral ${c.viralScore}` : c.hitScore != null ? `Hit ${c.hitScore}` : "Not analyzed yet"}
                  {c.prob1M != null && ` · ${c.prob1M}% chance 1M`}
                  {c.viralStale && " · stale"}
                  {c.hasDemo ? " · demo ready" : " · no demo"}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {stats.readyProjects > 0 && (
        <div className="mt-8 rounded-2xl border border-success/30 bg-success/5 p-5">
          <p className="text-sm font-medium text-success">
            {stats.readyProjects} project{stats.readyProjects > 1 ? "s" : ""} launch-ready
          </p>
          <p className="mt-1 text-xs text-muted">
            Open Launch tab in your project to export the release pack.
          </p>
          <Link
            href="/studio"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-accent-light hover:text-foreground"
          >
            Open studio <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}