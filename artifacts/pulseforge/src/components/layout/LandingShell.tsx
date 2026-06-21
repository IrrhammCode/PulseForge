
import { Link } from "wouter";
import { PulseForgeLogo } from "@/components/icons/BrandLogos";
import { WelcomeLink } from "@/components/welcome/WelcomeLink";
import { Footer } from "@/components/layout/Footer";

export function LandingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/welcome" className="group flex items-center gap-3 transition hover:opacity-90">
            <PulseForgeLogo size={32} />
            <div>
              <p className="text-base font-bold tracking-tight">
                Pulse<span className="gradient-text-warm">Forge</span>
              </p>
              <p className="hidden text-[10px] uppercase tracking-widest text-muted sm:block">
                Music Studio OS
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden rounded-full border border-accent/20 bg-accent/5 px-3 py-1 text-[10px] font-medium text-accent-light md:inline-block">
              Musicathon 2026
            </span>
            <WelcomeLink href="/studio" className="btn-primary !px-3.5 !py-2 text-xs sm:text-sm">
              Open Studio
            </WelcomeLink>
          </div>
        </div>
      </header>

      <main className="relative z-10">{children}</main>

      <Footer />
    </div>
  );
}