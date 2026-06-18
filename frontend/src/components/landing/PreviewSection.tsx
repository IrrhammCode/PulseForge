import { ArrowRight } from "lucide-react";
import { WelcomeLink } from "@/components/welcome/WelcomeLink";
import { SectionShell } from "@/components/landing/SectionShell";
import {
  CyaniteLogo,
  MusixmatchLogo,
  SongstatsLogo,
} from "@/components/icons/BrandLogos";

const REPORT_ITEMS = [
  "Hit Potential Score with four-dimension breakdown",
  "16-week Monte Carlo listener growth curve",
  "Hook line extraction and lyric structure map",
  "Cyanite audio energy and mood classification",
  "Songstats velocity and playlist signals",
  "What-If launch scenario simulator",
  "Prioritized marketing playbook",
  "One-click PDF export",
];

export function PreviewSection() {
  return (
    <SectionShell
      eyebrow="Your Report"
      title={
        <>
          One dashboard.{" "}
          <span className="text-accent">Complete clarity.</span>
        </>
      }
      description="A single source of truth before you ship — no scattered tools."
    >
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated">
        <div className="grid lg:grid-cols-2">
          <div className="flex flex-col justify-center border-b border-border p-6 md:p-8 lg:border-b-0 lg:border-r">
            <ul className="space-y-3">
              {REPORT_ITEMS.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  <span className="leading-relaxed text-muted">{item}</span>
                </li>
              ))}
            </ul>
            <WelcomeLink href="/studio" className="btn-primary mt-8 w-fit">
              Open the studio
              <ArrowRight className="h-4 w-4" />
            </WelcomeLink>
          </div>

          <div className="space-y-3 p-5 md:p-6">
            <div className="rounded-xl border border-border bg-background p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-lg bg-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">Midnight Drive</p>
                  <p className="truncate text-xs text-muted">Nova Ray · Indie Pop</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xl font-bold tabular-nums text-accent-light">78</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted">Hit Score</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  Growth
                </p>
                <div className="mt-3 flex h-12 items-end gap-1">
                  {[35, 48, 42, 60, 55, 72, 68, 85].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-accent/60"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  Energy
                </p>
                <div className="mt-3 space-y-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <div className="bar-accent" style={{ width: "78%" }} />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <div className="bar-accent" style={{ width: "62%" }} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <CyaniteLogo size={16} />
                  <span className="text-[10px] text-muted">Cyanite</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-accent-muted p-4">
              <p className="text-[10px] font-medium uppercase tracking-wider text-accent-light">
                Hook line
              </p>
              <p className="mt-2 text-sm italic leading-relaxed text-foreground/90">
                &ldquo;We drive through the neon, hearts on repeat tonight…&rdquo;
              </p>
              <div className="mt-2 flex items-center gap-2">
                <MusixmatchLogo size={16} />
                <span className="text-[10px] text-muted">Musixmatch</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border bg-background px-4 py-3">
              <div className="flex items-center gap-2">
                <SongstatsLogo size={18} />
                <span className="text-xs text-muted">Streaming velocity</span>
              </div>
              <span className="text-sm font-bold tabular-nums text-accent-light">+24</span>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}