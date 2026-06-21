import { ArrowRight, Check } from "lucide-react";
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
          <span className="gradient-text">Complete clarity.</span>
        </>
      }
      description="A single source of truth before you ship — no scattered tools."
    >
      <div className="glass-card-hover overflow-hidden rounded-2xl">
        <div className="grid lg:grid-cols-2">
          {/* Left: Checklist */}
          <div className="flex flex-col justify-center border-b border-border/40 p-6 md:p-8 lg:border-b-0 lg:border-r lg:border-border/40">
            <ul className="space-y-3">
              {REPORT_ITEMS.map((item, i) => (
                <li key={item} className="flex items-start gap-3 text-sm animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-light">
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="leading-relaxed text-muted">{item}</span>
                </li>
              ))}
            </ul>
            <WelcomeLink href="/studio" className="btn-primary mt-8 w-fit group">
              Open the studio
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </WelcomeLink>
          </div>

          {/* Right: Mini dashboard preview */}
          <div className="space-y-3 p-5 md:p-6">
            {/* Track card */}
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-black font-bold text-sm">
                  MD
                </div>
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

            {/* Growth + Energy cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card rounded-xl p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  Growth
                </p>
                <div className="mt-3 flex h-12 items-end gap-1">
                  {[35, 48, 42, 60, 55, 72, 68, 85].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-accent/70 transition-all duration-300 hover:bg-accent"
                      style={{ height: `${h}%`, animation: "barGrow 0.8s ease-out both", animationDelay: `${i * 80}ms` }}
                    />
                  ))}
                </div>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
                  Energy
                </p>
                <div className="mt-3 space-y-2">
                  <div className="h-1.5 overflow-hidden rounded-full bg-border/40">
                    <div className="h-full rounded-full bg-accent" style={{ width: "78%", animation: "barGrow 1s ease-out both" }} />
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border/40">
                    <div className="h-full rounded-full bg-accent" style={{ width: "62%", animation: "barGrow 1s ease-out 0.2s both" }} />
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1.5">
                  <CyaniteLogo size={16} />
                  <span className="text-[10px] text-muted">Cyanite</span>
                </div>
              </div>
            </div>

            {/* Hook line */}
            <div className="glass-card overflow-hidden rounded-xl border-accent/10 bg-accent/5 p-4">
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

            {/* Streaming velocity */}
            <div className="glass-card flex items-center justify-between rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <SongstatsLogo size={18} />
                <span className="text-xs text-muted">Streaming velocity</span>
              </div>
              <span className="rounded-full bg-success/10 px-2 py-0.5 text-sm font-bold tabular-nums text-success">
                +24
              </span>
            </div>
          </div>
        </div>
      </div>
    </SectionShell>
  );
}