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
  },
  {
    step: "02",
    title: "Write & produce",
    description: "Draft lyrics, upload demos, and iterate versions in one workspace.",
    Logo: CyaniteLogo,
  },
  {
    step: "03",
    title: "Analyze potential",
    description: "Hit score, growth curve, hooks, energy, and streaming signals.",
    Logo: DashboardIcon,
  },
  {
    step: "04",
    title: "Launch smarter",
    description: "What-If scenarios, marketing playbook, and exportable release pack.",
    Logo: PlaybookIcon,
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
          <span className="text-accent">launch-ready</span>
        </>
      }
      description="Under 30 seconds from project setup to a complete pre-release report."
    >
      <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((item) => (
          <article
            key={item.step}
            className="flex h-full flex-col bg-surface-elevated p-5 md:p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-bold tabular-nums text-muted">{item.step}</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface">
                <item.Logo size={20} />
              </div>
            </div>
            <h3 className="text-base font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
          </article>
        ))}
      </div>
    </SectionShell>
  );
}