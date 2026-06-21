import { PartnersSection } from "@/components/landing/PartnersSection";
import { PartnerLogoStrip } from "@/components/landing/PartnerLogoStrip";
import { LandingContainer } from "@/components/landing/LandingContainer";

export default function PartnersPage() {
  return (
    <LandingContainer className="py-10 md:py-14">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-light">
          Integrations
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Partners</h1>
        <p className="mt-3 max-w-xl text-sm text-muted md:text-base">
          PulseForge wires Musixmatch, Cyanite, Songstats, ElevenLabs, LALAL.AI, JamBase, and n8n
          into one pre-release studio workflow.
        </p>
        <div className="mt-6">
          <PartnerLogoStrip />
        </div>
      </div>
      <PartnersSection />
    </LandingContainer>
  );
}