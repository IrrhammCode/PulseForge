
import { useState } from "react";
import { usePathname } from "@/lib/navigation-compat";
import { Menu } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { LandingShell } from "@/components/layout/LandingShell";
import { DomainEventBridge } from "@/components/layout/DomainEventBridge";
import { IntelligenceBanner } from "@/components/layout/IntelligenceBanner";
import { TabLockBanner } from "@/components/layout/TabLockBanner";
import { PulseForgeLogo } from "@/components/icons/BrandLogos";
import { Link } from "wouter";

const LANDING_PATHS = ["/welcome"];

function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-h-screen flex-col lg:pl-[240px]">
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur-xl lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-muted hover:bg-surface-elevated hover:text-foreground"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/welcome" className="flex items-center gap-2">
            <PulseForgeLogo size={28} />
            <span className="text-sm font-bold">
              Pulse<span className="text-accent">Forge</span>
            </span>
          </Link>
        </div>

        <main className="relative z-10 flex-1">
          <div className="mx-auto max-w-6xl space-y-2 px-4 pt-4 sm:px-6 lg:px-8">
            <TabLockBanner />
            <IntelligenceBanner className="hidden lg:flex" />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (LANDING_PATHS.includes(pathname)) {
    return <LandingShell>{children}</LandingShell>;
  }

  return (
    <>
      <DomainEventBridge />
      <AppLayout>{children}</AppLayout>
    </>
  );
}