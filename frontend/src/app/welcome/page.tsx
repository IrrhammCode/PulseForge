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
      <LandingContainer className="pt-8 pb-12 md:pt-12 md:pb-16">
        <HeroSection />
      </LandingContainer>

      <div className="border-y border-border bg-surface">
        <LandingContainer className="py-8 md:py-10">
          <StatsBar />
        </LandingContainer>
      </div>

      <LandingContainer className="flex flex-col gap-20 py-16 md:gap-28 md:py-24">
        <FeaturesSection />
        <HowItWorksSection />
        <PartnersSection />
        <PreviewSection />
        <CtaSection />
      </LandingContainer>
    </div>
  );
}