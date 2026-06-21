
import { Link } from "wouter";
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
import { ExampleSongsShowcase } from "@/components/dashboard/ExampleSongsShowcase";
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
import { SectionHead } from "@/components/ui/editorial";

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

  const activities = getRecentActivities(5);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:py-12 lg:px-8 2xl:max-w-7xl 3xl:max-w-[96rem] 4xl:max-w-[120rem]">
      {/* Editorial header */}
      <div className="flex items-center justify-between gap-4 border-b-2 border-foreground pb-3">
        <span className="landing-eyebrow flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-foreground" />
          Dashboard
        </span>
        <span className="landing-eyebrow">
          {caps ? `${caps.tier} tier · ${Object.values(caps.partners).filter(Boolean).length}/7 partners` : "Music Studio OS"}
        </span>
      </div>

      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-display text-5xl uppercase leading-[0.9] tracking-tight md:text-6xl lg:text-7xl 2xl:text-8xl">
            {greeting()}
          </h1>
          <p className="mt-4 max-w-lg text-sm text-muted md:text-base">
            Your studio at a glance — projects, pipeline progress, and quick actions.
          </p>
        </div>
        <NewProjectForm onCreate={create} />
      </div>

      {/* Stats band — big editorial numbers */}
      <div className="mt-10 grid grid-cols-2 border-y-2 border-foreground md:grid-cols-4">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            className={cn(
              "px-2 py-5 md:px-6",
              i > 0 && "border-l-2 border-foreground",
              i === 2 && "border-t-2 border-foreground md:border-t-0",
              i === 3 && "border-t-2 border-foreground md:border-t-0"
            )}
          >
            <div className="mb-3 flex items-center gap-2">
              <card.icon className="h-4 w-4 text-foreground" />
              <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                {card.label}
              </p>
            </div>
            <p className="font-display text-4xl tabular-nums leading-none text-foreground md:text-5xl 2xl:text-6xl">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Partner status chips */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[10px] text-muted">
        {caps ? (
          <>
            {(["musixmatch", "cyanite", "songstats"] as const).map((p) => (
              <span
                key={p}
                className="rounded-full border border-foreground/40 px-2.5 py-0.5 font-medium uppercase tracking-wide"
              >
                {p}: {caps.partners[p] ? "active" : "demo"}
              </span>
            ))}
          </>
        ) : (
          <span className="rounded-full border border-foreground/40 px-2.5 py-0.5 uppercase tracking-wide">
            Partners: loading / demo mode
          </span>
        )}
        <Link href="/integrations" className="font-semibold underline-offset-4 hover:underline">
          Manage →
        </Link>
      </div>

      {/* Pipeline Overview — bold rail */}
      <section className="mt-12">
        <SectionHead
          eyebrow="Workflow"
          title="Pipeline Overview"
          action={
            <Link href="/studio" className="landing-eyebrow whitespace-nowrap hover:underline">
              View all →
            </Link>
          }
        />
        <div className="grid grid-cols-5 border-2 border-foreground">
          {pipelineOverview.map((step, index) => (
            <div
              key={step.key}
              className={cn(
                "flex flex-col items-center gap-2 px-1 py-4 text-center md:gap-3 md:px-2 md:py-6",
                index > 0 && "border-l-2 border-foreground"
              )}
            >
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 border-foreground md:h-12 md:w-12",
                  step.pct > 0 ? "bg-foreground text-background" : "bg-transparent text-foreground"
                )}
              >
                <step.icon className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wider md:text-[11px]">{step.label}</p>
                <p className="font-display mt-1 text-xl leading-none tabular-nums md:text-2xl">
                  {step.pct}
                  <span className="text-xs md:text-sm">%</span>
                </p>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted">
          Progress shown across all projects. Create projects to start filling the pipeline.
        </p>
      </section>

      {/* Main grid — content + side rail */}
      <div className="mt-12 grid gap-10 lg:grid-cols-[1.8fr_1fr] lg:gap-12">
        {/* Left: Recent projects + downstream */}
        <div>
          <SectionHead
            eyebrow="Library"
            title="Recent Projects"
            action={
              projects.length > 3 ? (
                <Link href="/studio" className="landing-eyebrow whitespace-nowrap hover:underline">
                  See all {projects.length} →
                </Link>
              ) : undefined
            }
          />

          {!ready && (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-2xl bg-border/50" />
              ))}
            </div>
          )}

          {ready && recent.length === 0 && (
            <div className="border-2 border-dashed border-foreground p-6">
              <h3 className="font-display text-2xl uppercase tracking-tight">No projects yet</h3>
              <p className="mt-2 text-sm text-muted">
                Start your Music Studio OS journey. Choose an option below to begin the Write → Produce →
                Analyze → Viral Lab → Launch pipeline.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                {[
                  { href: "/analyze", label: "Try with Demo Track" },
                  { href: "/studio", label: "Start from Template" },
                  { href: "/help", label: "Watch 2-min intro" },
                ].map((o) => (
                  <Link
                    key={o.href}
                    href={o.href}
                    className="border-2 border-foreground p-3 text-center text-sm font-semibold transition hover:bg-foreground hover:text-background"
                  >
                    {o.label}
                  </Link>
                ))}
              </div>
              <div className="mt-5">
                <NewProjectForm onCreate={create} />
              </div>
            </div>
          )}

          {ready && recent.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {recent.map((project) => (
                <ProjectCard key={project.id} project={project} onDelete={handleDelete} />
              ))}
            </div>
          )}

          <ExampleSongsShowcase />

          {/* Viral Lab candidates */}
          {ready && viralCandidates.length > 0 && (
            <section className="mt-12">
              <SectionHead
                eyebrow={`${stats.viralLabReady} ready for 1M sim`}
                title="Viral Lab Candidates"
                action={
                  <Link href="/viral" className="landing-eyebrow whitespace-nowrap hover:underline">
                    Open Viral Lab →
                  </Link>
                }
              />
              <div className="grid gap-4 sm:grid-cols-2">
                {viralCandidates.slice(0, 4).map((c) => (
                  <Link
                    key={c.projectId}
                    href={getViralLabLink(c.projectId)}
                    className="group border-2 border-foreground p-4 transition hover:bg-foreground hover:text-background"
                  >
                    <div className="flex items-center gap-2">
                      <Flame className="h-4 w-4" />
                      <p className="truncate font-semibold">{c.title}</p>
                    </div>
                    <p className="mt-2 text-xs text-muted group-hover:text-background/70">
                      {c.viralScore != null
                        ? `Viral ${c.viralScore}`
                        : c.hitScore != null
                          ? `Hit ${c.hitScore}`
                          : "Not analyzed yet"}
                      {c.prob1M != null && ` · ${c.prob1M}% chance 1M`}
                      {c.viralStale && " · stale"}
                      {c.hasDemo ? " · demo ready" : " · no demo"}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Launch-ready banner */}
          {stats.readyProjects > 0 && (
            <div className="mt-10 flex flex-col gap-3 border-2 border-foreground bg-foreground p-6 text-background sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-2xl uppercase tracking-tight">
                  {stats.readyProjects} project{stats.readyProjects > 1 ? "s" : ""} launch-ready
                </p>
                <p className="mt-1 text-xs text-background/70">
                  Open the Launch tab in your project to export the release pack.
                </p>
              </div>
              <Link
                href="/studio"
                className="inline-flex shrink-0 items-center gap-1 border-2 border-background px-4 py-2 text-xs font-semibold uppercase tracking-wide transition hover:bg-background hover:text-foreground"
              >
                Open studio <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </div>

        {/* Right rail: Quick actions + activity */}
        <aside className="space-y-12">
          <section>
            <SectionHead eyebrow="Shortcuts" title="Quick Actions" />
            <div className="border-2 border-foreground">
              {quickActions.map((action, i) => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={cn(
                    "group flex items-start gap-3 p-4 transition hover:bg-foreground hover:text-background",
                    i > 0 && "border-t-2 border-foreground"
                  )}
                >
                  <action.icon className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold">{action.label}</p>
                    <p className="mt-0.5 text-xs text-muted group-hover:text-background/70">
                      {action.desc}
                    </p>
                  </div>
                  <ArrowRight className="ml-auto mt-0.5 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </section>

          <section>
            <SectionHead eyebrow="Feed" title="Recent Activity" />
            {activities.length === 0 ? (
              <div className="border-2 border-dashed border-foreground p-5 text-sm text-muted">
                Run Quick Analyze or Viral Lab — your actions will appear here.
              </div>
            ) : (
              <div className="border-2 border-foreground">
                {activities.map((a: ActivityItem, i) => (
                  <Link
                    key={a.id}
                    href={a.link || "#"}
                    className={cn(
                      "flex items-center justify-between gap-3 px-4 py-3 text-sm transition hover:bg-foreground hover:text-background",
                      i > 0 && "border-t-2 border-foreground"
                    )}
                  >
                    <div className="min-w-0">
                      <span className="font-medium">{a.title}</span>
                      {a.subtitle && (
                        <span className="ml-2 text-muted group-hover:text-background/70">{a.subtitle}</span>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted">
                      {a.score != null && <span className="mr-2 font-semibold text-foreground">{a.score}</span>}
                      {new Date(a.at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
