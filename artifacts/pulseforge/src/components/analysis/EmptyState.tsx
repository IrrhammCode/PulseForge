import { Search, BarChart3, Target, Sparkles, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const STEPS = [
  { icon: Search, title: "Search", desc: "Find your track via Musixmatch catalog", href: "/analyze", cta: "Search now" },
  { icon: BarChart3, title: "Analyze", desc: "Lyrics structure, energy & hook scoring", href: "/analyze", cta: "Run Quick Analyze" },
  { icon: Target, title: "Simulate", desc: "Project growth toward 1M+ listeners", href: "/viral", cta: "Open Viral Lab" },
  { icon: Sparkles, title: "Launch", desc: "Get tailored marketing recommendations", href: "/viral", cta: "Try full flow" },
];

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center md:py-16">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface-elevated">
        <Sparkles className="h-8 w-8 text-accent-light" />
      </div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight md:text-3xl">
        Analyze before you <span className="text-accent">release</span>
      </h2>
      <p className="mb-8 max-w-md text-sm text-muted md:text-base">
        Get Musixmatch-powered hit potential, hook strength, energy insights, and 1M listener simulation in seconds.
      </p>

      {/* Interactive 4-step with direct triggers */}
      <div className="mb-8 w-full max-w-3xl">
        <p className="text-xs uppercase tracking-wider text-muted mb-2">The 4-step flow — click to start</p>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3 text-sm">
          {STEPS.map((step, i) => (
            <Link
              key={step.title}
              href={step.href}
              className="group block rounded-xl border border-border bg-surface-elevated p-3 text-left transition hover:border-accent/40 hover:bg-accent-muted/30 active:scale-[0.985]"
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-muted text-[10px] font-bold text-accent-light">
                  {i + 1}
                </span>
                <step.icon className="h-3.5 w-3.5 text-muted transition group-hover:text-accent-light" />
              </div>
              <p className="font-medium text-sm">{step.title}</p>
              <p className="text-[11px] text-muted">{step.desc}</p>
              <div className="mt-2 inline-flex items-center text-[11px] font-semibold text-accent-light group-hover:underline">
                {step.cta} <ArrowRight className="ml-1 h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Social proof */}
      <p className="text-xs text-muted">Over 12k tracks analyzed this month • Powered by Musixmatch Pro</p>
    </div>
  );
}