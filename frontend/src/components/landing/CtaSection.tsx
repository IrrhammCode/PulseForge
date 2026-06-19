import { ArrowRight, Sparkles } from "lucide-react";
import { WelcomeLink } from "@/components/welcome/WelcomeLink";
import { MusixmatchLogo } from "@/components/icons/BrandLogos";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden rounded-2xl">
      {/* Animated gradient border */}
      <div className="gradient-border-animated rounded-2xl p-px">
        <div className="relative rounded-2xl bg-surface-elevated px-6 py-14 text-center md:px-10 md:py-16">
          {/* Background glow */}
          <div className="absolute inset-0 overflow-hidden rounded-2xl">
            <div className="hero-glow hero-glow-purple absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10" />
          </div>

          <div className="relative z-10 mx-auto max-w-xl">
            <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-3.5 py-1.5 text-xs font-medium text-muted backdrop-blur-sm">
              <MusixmatchLogo size={18} />
              <span>Musicathon 2026</span>
            </div>

            <h2 className="text-2xl font-bold tracking-tight md:text-3xl lg:text-4xl">
              Ready for a{" "}
              <span className="gradient-text">data-backed launch</span>?
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted md:text-base">
              Search any track in the Musixmatch catalog and get a full pre-release
              report in under 30 seconds.
            </p>

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <WelcomeLink href="/studio" className="btn-primary group">
                <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" />
                Open Studio
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </WelcomeLink>
              <WelcomeLink href="/analyze" className="btn-secondary">
                Quick Analyze
              </WelcomeLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}