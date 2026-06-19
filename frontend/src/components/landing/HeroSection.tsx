"use client";

import { ArrowRight, Flame, Sparkles, Zap } from "lucide-react";
import { WelcomeLink } from "@/components/welcome/WelcomeLink";
import { Gauge } from "@/components/ui/Gauge";
import { PartnerLogoStrip } from "@/components/landing/PartnerLogoStrip";
import { MusixmatchLogo } from "@/components/icons/BrandLogos";

export function HeroSection() {
  return (
    <div className="relative">
      {/* Animated glow orbs */}
      <div className="hero-glow hero-glow-purple animate-pulse-glow absolute -left-40 -top-20" />
      <div className="hero-glow hero-glow-blue animate-pulse-glow absolute -right-32 top-20" style={{ animationDelay: "2s" }} />
      <div className="hero-glow hero-glow-cyan animate-pulse-glow absolute -bottom-20 left-1/3 opacity-10" style={{ animationDelay: "4s" }} />

      <div className="relative grid items-center gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-20">
        {/* Left: Copy */}
        <div className="animate-fade-in">
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-accent/20 bg-accent/5 py-1.5 pl-1.5 pr-4 backdrop-blur-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20">
              <MusixmatchLogo size={16} />
            </span>
            <span className="text-xs font-medium text-muted">
              Official entry · <span className="font-semibold text-accent-light">Musicathon 2026</span>
            </span>
          </div>

          <h1 className="max-w-xl text-4xl font-bold leading-[1.08] tracking-tight md:text-5xl lg:text-[3.5rem]">
            Your music studio,{" "}
            <span className="gradient-text">all in one place</span>
          </h1>

          <p className="animate-slide-up-delayed mt-6 max-w-lg text-base leading-relaxed text-muted md:text-lg">
            Write lyrics, craft your track, analyze hit potential, run{" "}
            <span className="font-medium text-foreground">Viral Lab</span> (1M listener sim + gap analysis),
            and plan your launch — without switching between five different tools.
          </p>

          <div className="animate-slide-up-delayed-2 mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <WelcomeLink href="/studio" className="btn-primary group">
              <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
              Open Studio
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </WelcomeLink>
            <WelcomeLink href="/analyze" className="btn-secondary">
              <Zap className="h-4 w-4" />
              Quick Analyze
            </WelcomeLink>
            <WelcomeLink
              href="/viral"
              className="inline-flex items-center gap-2 rounded-xl border border-orange-500/20 bg-orange-500/5 px-4 py-2.5 text-sm font-semibold text-orange-400 backdrop-blur-sm transition-all duration-200 hover:border-orange-500/40 hover:bg-orange-500/10 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)]"
            >
              <Flame className="h-4 w-4" />
              Viral Lab
            </WelcomeLink>
          </div>

          <div className="mt-12 border-t border-border/60 pt-8">
            <PartnerLogoStrip />
          </div>
        </div>

        {/* Right: Live preview card */}
        <div className="w-full animate-slide-up lg:max-w-md lg:justify-self-end xl:max-w-lg" style={{ animationDelay: "0.2s" }}>
          <div className="glass-card-hover overflow-hidden rounded-2xl shadow-2xl shadow-accent/5">
            {/* Window chrome */}
            <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-surface/50 px-5 py-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
              </div>
              <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                Live preview
              </p>
            </div>

            <div className="p-5 md:p-6">
              {/* Track info */}
              <div className="mb-5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-accent-light">
                    Sample report
                  </p>
                  <p className="mt-1 truncate text-base font-semibold">Midnight Drive</p>
                  <p className="truncate text-sm text-muted">Nova Ray · Indie Pop</p>
                </div>
                <span className="shrink-0 rounded-full border border-success/20 bg-success/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-success shadow-[0_0_12px_rgba(52,211,153,0.1)]">
                  Promising
                </span>
              </div>

              {/* Score + Bars */}
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                <div className="mx-auto shrink-0 sm:mx-0">
                  <Gauge value={78} size={140} label="Hit Score" sublabel="82% confidence" />
                </div>
                <div className="w-full flex-1 space-y-3">
                  {[
                    { label: "Beat Fit", value: 81, color: "from-purple-500 to-blue-500" },
                    { label: "Lyric Virality", value: 74, color: "from-blue-500 to-cyan-400" },
                    { label: "Hook Strength", value: 85, color: "from-violet-500 to-purple-400" },
                  ].map((bar) => (
                    <div key={bar.label} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted">{bar.label}</span>
                        <span className="font-semibold tabular-nums text-foreground">{bar.value}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-border/60">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${bar.color}`}
                          style={{ width: `${bar.value}%`, animation: "barGrow 1s ease-out both" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom stats */}
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/40 pt-5">
                {[
                  { label: "1M Chance", value: "67%", icon: "📈" },
                  { label: "Median", value: "11w", icon: "📅" },
                  { label: "Hook", value: "85", icon: "🎵" },
                ].map((stat) => (
                  <div key={stat.label} className="glass-card rounded-xl px-2 py-2.5 text-center">
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
    </div>
  );
}