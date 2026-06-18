import Link from "next/link";
import {
  CyaniteLogo,
  MusixmatchLogo,
  PulseForgeLogo,
  SongstatsLogo,
} from "@/components/icons/BrandLogos";

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr_1fr] md:items-start">
          <div>
            <div className="flex items-center gap-2.5">
              <PulseForgeLogo size={28} />
              <p className="text-sm font-semibold">
                Pulse<span className="text-accent">Forge</span>
              </p>
            </div>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
              Music studio OS for indie artists — create, analyze, and launch. Built for
              Musixmatch Musicathon 2026.
            </p>
          </div>

          <nav className="flex flex-col gap-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              MAIN
            </p>
            <Link href="/welcome" className="text-sm text-muted transition hover:text-foreground">Home</Link>
            <Link href="/dashboard" className="text-sm text-muted transition hover:text-foreground">Dashboard</Link>
            <Link href="/studio" className="text-sm text-muted transition hover:text-foreground">Projects</Link>
            <Link href="/analyze" className="text-sm text-muted transition hover:text-foreground">Quick Analyze</Link>
            <Link href="/viral" className="text-sm text-muted transition hover:text-foreground">Viral Lab</Link>
            <Link href="/integrations" className="text-sm text-muted transition hover:text-foreground">Integrations</Link>
          </nav>

          <nav className="flex flex-col gap-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              SYSTEM
            </p>
            <Link href="/settings" className="text-sm text-muted transition hover:text-foreground">Settings</Link>
            <Link href="/help" className="text-sm text-muted transition hover:text-foreground">Help</Link>
            <Link href="/partners" className="text-sm text-muted transition hover:text-foreground">Partners</Link>
          </nav>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">
              Powered by
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { Logo: MusixmatchLogo, name: "Musixmatch" },
                { Logo: CyaniteLogo, name: "Cyanite" },
                { Logo: SongstatsLogo, name: "Songstats" },
              ].map(({ Logo, name }) => (
                <div
                  key={name}
                  className="flex items-center gap-2 rounded-lg border border-border bg-surface-elevated px-2.5 py-1.5"
                >
                  <Logo size={18} />
                  <span className="text-xs font-medium text-foreground">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-8 border-t border-border pt-6 text-center text-[11px] text-muted md:text-left">
          © 2026 PulseForge. Built for the Musixmatch Musicathon.
        </p>
      </div>
    </footer>
  );
}