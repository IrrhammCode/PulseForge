import { ArrowRight } from "lucide-react";
import { WelcomeLink } from "@/components/welcome/WelcomeLink";
import { MusixmatchLogo } from "@/components/icons/BrandLogos";

export function CtaSection() {
  return (
    <section className="rounded-2xl border border-border bg-surface-elevated px-6 py-12 text-center md:px-10 md:py-14">
      <div className="mx-auto max-w-xl">
        <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted">
          <MusixmatchLogo size={18} />
          Musicathon 2026
        </div>

        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
          Ready for a{" "}
          <span className="text-accent">data-backed launch</span>?
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted md:text-base">
          Search any track in the Musixmatch catalog and get a full pre-release
          report in under 30 seconds.
        </p>

        <WelcomeLink href="/studio" className="btn-primary mt-8">
          Open Studio
          <ArrowRight className="h-4 w-4" />
        </WelcomeLink>
      </div>
    </section>
  );
}