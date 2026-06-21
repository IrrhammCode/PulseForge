import { HeroSection } from "@/components/landing/HeroSection";
import { StatsBar } from "@/components/landing/StatsBar";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { PartnersSection } from "@/components/landing/PartnersSection";
import { PreviewSection } from "@/components/landing/PreviewSection";
import { CtaSection } from "@/components/landing/CtaSection";
import { LandingContainer } from "@/components/landing/LandingContainer";

export default function WelcomePage() {
  return (
    <div className="relative z-10">
      {/* Grid pattern background */}
      <div className="pointer-events-none fixed inset-0 grid-pattern opacity-60" />

      {/* Hero */}
      <LandingContainer className="relative overflow-hidden pt-10 pb-14 md:pt-16 md:pb-20">
        <HeroSection />
      </LandingContainer>

      {/* Stats divider */}
      <div className="relative border-y-2 border-foreground bg-surface-elevated">
        <LandingContainer className="py-10 md:py-12">
          <StatsBar />
        </LandingContainer>
      </div>

      {/* Content sections */}
      <LandingContainer className="relative flex flex-col gap-24 py-20 md:gap-32 md:py-28">
        <FeaturesSection />
        <HowItWorksSection />
        <PartnersSection />
        <PreviewSection />
        <CtaSection />
      </LandingContainer>
    </div>
  );
}