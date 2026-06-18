"use client";

import { ArrowRight, Flame } from "lucide-react";
import { WelcomeLink } from "@/components/welcome/WelcomeLink";
import { Gauge } from "@/components/ui/Gauge";
import { PartnerLogoStrip } from "@/components/landing/PartnerLogoStrip";
import { MusixmatchLogo } from "@/components/icons/BrandLogos";

export function HeroSection() {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
      <div className="animate-fade-in">
        <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-border bg-surface-elevated py-1.5 pl-1.5 pr-4">
          <MusixmatchLogo size={24} />
          <span className="text-xs font-medium text-muted">
            Official entry · <span className="text-foreground">Musicathon 2026</span>
          </span>
        </div>

        <h1 className="max-w-xl text-4xl font-bold leading-[1.1] tracking-tight md:text-5xl lg:text-[3.25rem]">
          Your music studio,{" "}
          <span className="text-accent">all in one place</span>
        </h1>

        <p className="mt-5 max-w-lg text-base leading-relaxed text-muted md:text-lg">
          Write lyrics, craft your track, analyze hit potential, run{" "}
          <span className="text-foreground">Viral Lab</span> (1M listener sim + gap analysis),
          and plan your launch — without switching between five different tools.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <WelcomeLink href="/studio" className="btn-primary">
            Open Studio
            <ArrowRight className="h-4 w-4" />
          </WelcomeLink>
          <WelcomeLink href="/analyze" className="btn-secondary">
            Quick Analyze
          </WelcomeLink>
          <WelcomeLink
            href="/viral"
            className="inline-flex items-center gap-2 rounded-xl border border-accent/30 bg-accent-muted px-4 py-2.5 text-sm font-semibold text-accent-light transition hover:border-accent/50"
          >
            <Flame className="h-4 w-4" />
            Viral Lab
          </WelcomeLink>
        </div>

        <div className="mt-10 border-t border-border pt-8">
          <PartnerLogoStrip />
        </div>
      </div>

      <div className="w-full animate-slide-up lg:max-w-md lg:justify-self-end xl:max-w-lg">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-elevated">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-border" />
            </div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted">
              Live preview
            </p>
          </div>

          <div className="p-5 md:p-6">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted">
                  Sample report
                </p>
                <p className="mt-1 truncate text-base font-semibold">Midnight Drive</p>
                <p className="truncate text-sm text-muted">Nova Ray · Indie Pop</p>
              </div>
              <span className="shrink-0 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-success">
                Promising
              </span>
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="mx-auto shrink-0 sm:mx-0">
                <Gauge value={78} size={140} label="Hit Score" sublabel="82% confidence" />
              </div>
              <div className="w-full flex-1 space-y-3">
                {[
                  { label: "Beat Fit", value: 81 },
                  { label: "Lyric Virality", value: 74 },
                  { label: "Hook Strength", value: 85 },
                ].map((bar) => (
                  <div key={bar.label} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted">{bar.label}</span>
                      <span className="font-semibold tabular-nums">{bar.value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-border">
                      <div className="bar-accent" style={{ width: `${bar.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-5">
              {[
                { label: "1M Chance", value: "67%" },
                { label: "Median", value: "11w" },
                { label: "Hook", value: "85" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg bg-surface px-2 py-2.5 text-center">
                  <p className="text-base font-bold tabular-nums text-accent-light">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}