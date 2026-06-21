import { Link } from "wouter";
import { ArrowRight, BarChart3, Flame, GitCompare, Music2, PenLine, Rocket } from "lucide-react";
import { STUDIO_TABS } from "@/types/studio";
import { LandingContainer } from "@/components/landing/LandingContainer";

const TAB_ICONS = {
  write: PenLine,
  produce: Music2,
  analyze: BarChart3,
  compare: GitCompare,
  launch: Rocket,
};

const WORKFLOW = [
  {
    step: 1,
    title: "Create a project",
    body: "Go to Studio or Dashboard and create a project with title, genre, and mood.",
    href: "/studio",
  },
  {
    step: 2,
    title: "Write lyrics",
    body: "Use the section editor or raw mode. Rewrite Coach gives rule-based hook tips.",
    href: "/studio",
  },
  {
    step: 3,
    title: "Upload demo",
    body: "Drop a demo in Produce — waveform, BPM estimate, and client-side stem split.",
    href: "/studio",
  },
  {
    step: 4,
    title: "Analyze hit potential",
    body: "Run studio analyze from draft lyrics. No Musixmatch track required.",
    href: "/studio",
  },
  {
    step: 5,
    title: "Viral Lab — 1M simulation",
    body: "Crowd simulation, gap analysis, and music timeline editor. Deep link to Write/Produce/Launch to fix gaps.",
    href: "/viral",
  },
  {
    step: 6,
    title: "Plan launch",
    body: "What-If simulator, marketing playbook, checklist, and PDF/JSON release pack.",
    href: "/studio",
  },
];

export default function HelpPage() {
  return (
    <LandingContainer className="py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-light">
        Guide
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Help & workflow</h1>
      <p className="mt-3 max-w-xl text-sm text-muted md:text-base">
        PulseForge is a local-first studio OS. Projects save in your browser — no account needed.
      </p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Studio tabs</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {STUDIO_TABS.map((tab) => {
            const Icon = TAB_ICONS[tab.id];
            return (
              <div
                key={tab.id}
                className="rounded-2xl border border-border bg-surface-elevated p-4"
              >
                <Icon className="h-5 w-5 text-accent-light" />
                <p className="mt-2 font-semibold">{tab.label}</p>
                <p className="mt-1 text-sm text-muted">{tab.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Recommended workflow</h2>
        <ol className="mt-4 space-y-4">
          {WORKFLOW.map((item) => (
            <li
              key={item.step}
              className="flex gap-4 rounded-2xl border border-border bg-surface-elevated p-4"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-muted text-sm font-bold text-accent-light">
                {item.step}
              </span>
              <div>
                <p className="font-semibold">{item.title}</p>
                <p className="mt-1 text-sm text-muted">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <Link href="/studio" className="btn-primary mt-6">
          Open Studio
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="mt-10 rounded-2xl border border-accent/25 bg-gradient-to-br from-accent/5 to-transparent p-5">
        <div className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-accent-light" />
          <h2 className="font-semibold">Viral Lab</h2>
        </div>
        <p className="mt-2 text-sm text-muted">
          After analyzing, open Viral Lab for a 1 million listener simulation, retention curve,
          per-lane gap analysis, and a 6-lane timeline editor — linked directly to Studio tabs.
        </p>
        <Link href="/viral" className="btn-primary mt-4 text-sm">
          Open Viral Lab
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-surface-elevated p-5">
        <h2 className="font-semibold">Quick Analyze</h2>
        <p className="mt-2 text-sm text-muted">
          Already have a released track on Musixmatch? Use Quick Analyze for full partner
          intelligence — Cyanite audio, Songstats streaming, and PDF export.
        </p>
        <Link href="/analyze" className="btn-secondary mt-4 text-sm">
          Open Quick Analyze
        </Link>
      </section>
    </LandingContainer>
  );
}