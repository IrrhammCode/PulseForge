import { SectionShell } from "@/components/landing/SectionShell";
import {
  CyaniteLogo,
  DashboardIcon,
  MusixmatchLogo,
  PlaybookIcon,
} from "@/components/icons/BrandLogos";

const STEPS = [
  {
    step: "01",
    title: "Create a project",
    description: "Start in the studio with your track title, genre, and mood.",
    Logo: MusixmatchLogo,
    accent: "text-foreground",
  },
  {
    step: "02",
    title: "Write & produce",
    description: "Draft lyrics, upload demos, and iterate versions in one workspace.",
    Logo: CyaniteLogo,
    accent: "text-foreground",
  },
  {
    step: "03",
    title: "Analyze potential",
    description: "Hit score, growth curve, hooks, energy, and streaming signals.",
    Logo: DashboardIcon,
    accent: "text-foreground",
  },
  {
    step: "04",
    title: "Launch smarter",
    description: "What-If scenarios, marketing playbook, and exportable release pack.",
    Logo: PlaybookIcon,
    accent: "text-foreground",
  },
];

export function HowItWorksSection() {
  return (
    <SectionShell
      id="how-it-works"
      eyebrow="Workflow"
      title={
        <>
          Four steps to{" "}
          <span className="gradient-text">launch-ready</span>
        </>
      }
      description="Under 30 seconds from project setup to a complete pre-release report."
    >
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-1/2 top-0 hidden h-full w-px -translate-x-1/2 bg-border lg:block" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-stagger">
          {STEPS.map((item, i) => (
            <article
              key={item.step}
              className="group glass-card-hover relative flex h-full flex-col overflow-hidden rounded-2xl p-5 md:p-6 transition-all duration-300"
            >
              {/* Step number with gradient */}
              <div className="mb-4 flex items-center justify-between">
                <span className={`font-display text-4xl tabular-nums ${item.accent}`}>
                  {item.step}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-foreground bg-surface-elevated transition-transform duration-300 group-hover:scale-110">
                  <item.Logo size={20} />
                </div>
              </div>
              <h3 className="text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>

              {/* Bottom accent line */}
              <div className="mt-auto pt-4">
                <div className="h-0.5 w-8 rounded-full bg-foreground transition-all duration-300 group-hover:w-full" />
              </div>
            </article>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}